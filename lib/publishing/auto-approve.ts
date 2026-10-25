/**
 * The optional auto-approval policy (safety spine, item 7). DEFAULT OFF.
 *
 * ==================== WHAT IT MAY AND MAY NOT DO ====================
 * When `MARKETING_AUTO_APPROVE_SOURCES` names one or more post sources, the
 * publisher cron promotes DRAFT posts of those sources into scheduled publish
 * jobs for the next release slot — provided the post carries a stored video
 * and a MEASURED render QA of PASS, or, for a website article on a channel
 * `MARKETING_AUTO_APPROVE_CHANNELS` names, a brief, a body long enough for
 * the site gate, and no jurisdiction-specific advice. The job is recorded with
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

import type { MarketingChannel, MarketingPostSource } from "../../shared/types/marketing-post";
import { BODY_MIN_LENGTH_FOR_PUBLISH } from "../../shared/types/site-page";
import type { PublishModeEnv } from "./gate";

export const MARKETING_AUTO_APPROVE_SOURCES_ENV = "MARKETING_AUTO_APPROVE_SOURCES";

/**
 * Which channels the policy may approve for. Unset means the video channels
 * only — exactly the behaviour before website articles could qualify, so
 * adding `website` is a deliberate, separate decision from naming a source
 * (the agent platform's videos and articles share one source).
 */
export const MARKETING_AUTO_APPROVE_CHANNELS_ENV = "MARKETING_AUTO_APPROVE_CHANNELS";

export const AUTO_APPROVABLE_CHANNELS: readonly MarketingChannel[] = [
  "youtube",
  "facebook",
  "instagram",
  "website",
];

/** The default when the channel variable is unset: video channels only. */
export const DEFAULT_AUTO_APPROVE_CHANNELS: readonly MarketingChannel[] = [
  "youtube",
  "facebook",
  "instagram",
];

/**
 * The sentence the SEO drafter adds to state- or jurisdiction-specific
 * advice (legal, tax, licensing). The operating brief holds that content for
 * a human, so an article carrying it is never auto-approved.
 */
export const JURISDICTION_HOLD_PHRASE = "verify this with a licensed professional";

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

export type AutoApproveChannelsResult = {
  /** Enabled channels, deduplicated. Unset = the video channels. */
  readonly channels: readonly MarketingChannel[];
  readonly rejected: readonly string[];
};

/** Comma-separated, trimmed, exact-case. Unknown names are rejected. */
export function parseAutoApproveChannels(
  env: PublishModeEnv = process.env,
): AutoApproveChannelsResult {
  const raw = env[MARKETING_AUTO_APPROVE_CHANNELS_ENV];
  if (raw === undefined || raw.trim() === "") {
    return { channels: DEFAULT_AUTO_APPROVE_CHANNELS, rejected: [] };
  }
  const channels: MarketingChannel[] = [];
  const rejected: string[] = [];
  for (const token of raw.split(",")) {
    const name = token.trim();
    if (!name) continue;
    if ((AUTO_APPROVABLE_CHANNELS as readonly string[]).includes(name)) {
      const channel = name as MarketingChannel;
      if (!channels.includes(channel)) channels.push(channel);
    } else {
      rejected.push(name);
    }
  }
  return { channels, rejected };
}

export function isAutoApproveEnabled(env: PublishModeEnv = process.env): boolean {
  return parseAutoApproveSources(env).sources.length > 0;
}

export type AutoApproveCandidate = {
  readonly status: string;
  readonly sourceType: MarketingPostSource;
  /** Absent on callers that predate website articles: treated as a video post. */
  readonly channelTarget?: MarketingChannel;
  /** A website post's article body. */
  readonly postText?: string | null;
  /** A website post's brief; an article without one cannot be built. */
  readonly contentPackageId?: string | null;
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
  enabledChannels: readonly MarketingChannel[] = DEFAULT_AUTO_APPROVE_CHANNELS,
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
  const channel = post.channelTarget;
  if (channel !== undefined && !enabledChannels.includes(channel)) {
    return {
      eligible: false,
      reason: `channel ${channel} is not in ${MARKETING_AUTO_APPROVE_CHANNELS_ENV}`,
    };
  }
  if (channel === "website") {
    return decideWebsiteArticle(post);
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
 * A website article has no render to measure, so its checks are the page's
 * own: a brief to build from, a body long enough for the site gate, no
 * script, and no jurisdiction-specific advice (held for a human).
 */
function decideWebsiteArticle(post: AutoApproveCandidate): AutoApproveVerdict {
  if (!post.contentPackageId?.trim()) {
    return { eligible: false, reason: "website post has no article brief" };
  }
  const body = post.postText?.trim() ?? "";
  if (body.length < BODY_MIN_LENGTH_FOR_PUBLISH) {
    return {
      eligible: false,
      reason: `article body is under ${String(BODY_MIN_LENGTH_FOR_PUBLISH)} characters`,
    };
  }
  const lower = body.toLowerCase();
  if (lower.includes("<script")) {
    return { eligible: false, reason: "article body contains a script tag" };
  }
  if (lower.includes(JURISDICTION_HOLD_PHRASE)) {
    return {
      eligible: false,
      reason: "article gives jurisdiction-specific advice, held for a human",
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
