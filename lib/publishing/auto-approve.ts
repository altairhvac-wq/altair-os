/**
 * The optional auto-approval policy (safety spine, item 7). DEFAULT OFF.
 *
 * ==================== WHAT IT MAY AND MAY NOT DO ====================
 * When `MARKETING_AUTO_APPROVE_SOURCES` names one or more post sources, the
 * publisher cron promotes DRAFT posts of those sources into scheduled publish
 * jobs for the next release slot — provided the post carries a stored video
 * and a MEASURED render QA of PASS. The job is recorded with
 * `approved_by_policy = 'policy:auto-approve'` and NO `approved_by`, so the
 * ledger never shows a person approving something no person looked at.
 *
 * It does not arm publishing (that is `MARKETING_PUBLISH_MODE`), it does not
 * pick between destinations (one eligible account or nothing), and it does
 * not touch a post a human has already moved out of `draft`.
 *
 * ==================== WHY THIS FILE IS PURE ====================
 * No `server-only`, no database, no clock of its own: the environment and the
 * time are injected, so the policy's every branch can be exercised by a
 * verifier without a Supabase project. The cron owns the side effects.
 */

import type { MarketingPostSource } from "../../shared/types/marketing-post";
import type { PublishModeEnv } from "./gate";

export const MARKETING_AUTO_APPROVE_SOURCES_ENV = "MARKETING_AUTO_APPROVE_SOURCES";

/** The literal written to `marketing_publish_jobs.approved_by_policy`. */
export const AUTO_APPROVE_POLICY = "policy:auto-approve" as const;

/**
 * When the publisher cron runs (vercel.json). The Hobby plan allows one run
 * per day, so "the next slot" is the next daily run.
 */
export const MARKETING_PUBLISH_CRON_HOUR_UTC = 18;

/**
 * Every value `marketing_posts.source_type` may hold. Spelled here because
 * `MARKETING_POST_SOURCE_OPTIONS` is the user-pickable list and deliberately
 * omits `agent_daily_reel` — the source this policy exists for.
 */
export const AUTO_APPROVABLE_SOURCES: readonly MarketingPostSource[] = [
  "manual",
  "completed_job",
  "seasonal",
  "service_area",
  "project_gallery",
  "founder_milestone",
  "product_update",
  "agent_daily_reel",
  "other",
];

export type AutoApproveSourcesResult = {
  /** Enabled sources, deduplicated, in the order given. Empty = policy off. */
  readonly sources: readonly MarketingPostSource[];
  /** Tokens that named no known source. Reported, never silently dropped. */
  readonly rejected: readonly string[];
};

/** Comma-separated, trimmed, exact-case. Unknown names are rejected. */
export function parseAutoApproveSources(
  env: PublishModeEnv = process.env,
): AutoApproveSourcesResult {
  const raw = env[MARKETING_AUTO_APPROVE_SOURCES_ENV] ?? "";
  const sources: MarketingPostSource[] = [];
  const rejected: string[] = [];
  for (const token of raw.split(",")) {
    const name = token.trim();
    if (!name) continue;
    if ((AUTO_APPROVABLE_SOURCES as readonly string[]).includes(name)) {
      const source = name as MarketingPostSource;
      if (!sources.includes(source)) sources.push(source);
    } else {
      rejected.push(name);
    }
  }
  return { sources, rejected };
}

export function isAutoApproveEnabled(env: PublishModeEnv = process.env): boolean {
  return parseAutoApproveSources(env).sources.length > 0;
}

export type AutoApproveCandidate = {
  readonly status: string;
  readonly sourceType: MarketingPostSource;
  readonly videoMediaAssetId?: string | null;
  readonly renderQa?: { readonly state: string } | null;
};

export type AutoApproveVerdict =
  | { readonly eligible: true }
  | { readonly eligible: false; readonly reason: string };

/**
 * May the policy approve this post? Every "no" is a sentence an operator
 * can act on; every "yes" required all four facts.
 */
export function decideAutoApprove(
  post: AutoApproveCandidate,
  enabledSources: readonly MarketingPostSource[],
): AutoApproveVerdict {
  if (enabledSources.length === 0) {
    return { eligible: false, reason: "auto-approval is off" };
  }
  if (!enabledSources.includes(post.sourceType)) {
    return {
      eligible: false,
      reason: `source ${post.sourceType} is not in ${MARKETING_AUTO_APPROVE_SOURCES_ENV}`,
    };
  }
  if (post.status !== "draft") {
    return { eligible: false, reason: `status is ${post.status}, not draft` };
  }
  if (!post.videoMediaAssetId?.trim()) {
    return { eligible: false, reason: "no stored video" };
  }
  if (post.renderQa?.state !== "PASS") {
    return {
      eligible: false,
      reason: post.renderQa
        ? `render QA is ${post.renderQa.state}, not PASS`
        : "render QA was never measured",
    };
  }
  return { eligible: true };
}

/**
 * The next release slot: the next daily cron run strictly after `nowIso`.
 * A job promoted during today's run therefore publishes TOMORROW, which
 * leaves one full day for a human to cancel it from the queue.
 */
export function nextPublishSlot(
  nowIso: string,
  hourUtc: number = MARKETING_PUBLISH_CRON_HOUR_UTC,
): string {
  const now = Date.parse(nowIso);
  if (Number.isNaN(now)) {
    throw new RangeError(
      "nextPublishSlot received an unparseable clock reading, so no slot could be computed.",
    );
  }
  const slot = new Date(now);
  slot.setUTCHours(hourUtc, 0, 0, 0);
  if (slot.getTime() <= now) {
    slot.setUTCDate(slot.getUTCDate() + 1);
  }
  return slot.toISOString();
}
