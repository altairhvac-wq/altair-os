import { NextResponse } from "next/server";
import {
  getAgentIngestCompanyId,
  getAgentPlatformCompanyId,
  getMissingAgentBridgeEnvVars,
  isAgentBridgeConfigured,
  isAuthorizedAgentRequest,
} from "@/lib/agent-bridge/env";
import { getMediaAssetByJob } from "@/lib/database/queries/marketing-media-assets";
import {
  createAgentDraftMarketingPost,
  type AgentDraftPostOutcome,
} from "@/lib/database/queries/marketing-posts";
import { isSafeSourceJobId } from "@/shared/types/marketing-media";
import type { MarketingChannel } from "@/shared/types/marketing-post";

/**
 * Draft approval records for the Agent Platform's daily reel.
 *
 * ======================= WHAT THIS ROUTE IS FOR =======================
 * The daily pilot could render a reel, settle it, and transport its bytes, and
 * Today would still say "Today's video finished, but no post was created" —
 * because `selectTodayCandidates` needs a `marketing_posts` row that is `draft`
 * AND carries a video, and nothing on the automated path could write one. Only
 * two functions create posts and both are Server Actions behind a human click.
 * This is the missing writer, and nothing more than that.
 *
 * ========================= WHAT IT CANNOT DO =========================
 * It writes the string 'draft' as a literal. There is no status parameter, no
 * scheduling field, no provider call, and no import of anything that can reach
 * Meta. Publishing remains `publishMarketingReelTo{Facebook,Instagram}Action`,
 * behind the founder's own click in Today. A bridge that could publish would
 * make the approval gate advisory, so this one is built unable to.
 *
 * =================== THE PAYLOAD NAMES A JOB, NOT AN ASSET ===================
 * The platform holds an object key and a render job id; it has never held this
 * database's asset uuid and is not given one here. It sends `sourceJobId` and
 * this route resolves the asset itself. One identity, owned by the side that
 * issued it — the same reason the media route derives object keys instead of
 * accepting them.
 *
 * ============================ IDEMPOTENT ============================
 * Migration 147's partial unique index is the arbiter. A repeated integration
 * cycle re-sends the same payload and gets ALREADY_EXISTS with the original
 * post id. Nothing is updated: by then the founder may have rewritten the copy,
 * and an unattended pilot must not be able to undo that.
 */

export const runtime = "nodejs";

const ROUTE_NAME = "agent-draft-posts";
const MAX_BODY_BYTES = 32_000;

/** Only the two channels the daily reel targets. Not the full channel enum. */
const ALLOWED_CHANNELS = ["facebook", "instagram"] as const;
type AllowedChannel = (typeof ALLOWED_CHANNELS)[number];

const MAX_TITLE_CHARS = 200;
const MAX_TEXT_CHARS = 5_000;
const MAX_CTA_CHARS = 500;

/**
 * Mirrors agent-platform's own RENDER_QUALITY_STATES
 * (src/video/quality-classification.ts) and migration 195's CHECK
 * constraint. Kept as a literal list rather than imported: this route has no
 * dependency on that repository, the same reason ALLOWED_CHANNELS above is a
 * literal too.
 */
const QUALITY_STATES = ["STUB", "REVIEWABLE_CREATIVE", "PRODUCTION_READY"] as const;

/** Mirrors video-plan.ts's own directorRationale.max(2000) and migration 195's length check. */
const MAX_DIRECTOR_RATIONALE_CHARS = 2_000;

type IncomingPost = {
  channel?: unknown;
  text?: unknown;
  callToAction?: unknown;
  hashtags?: unknown;
};

type Body = {
  companyId?: unknown;
  sourceJobId?: unknown;
  candidateArtifactId?: unknown;
  forDate?: unknown;
  titleBase?: unknown;
  posts?: unknown;
  costUsd?: unknown;
  qualityState?: unknown;
  directorRationale?: unknown;
};

function reject(status: number, error: string) {
  return NextResponse.json({ ok: false, route: ROUTE_NAME, error }, { status });
}

function isAllowedChannel(value: unknown): value is AllowedChannel {
  return (
    typeof value === "string" &&
    (ALLOWED_CHANNELS as readonly string[]).includes(value)
  );
}

/**
 * The uuid inside a platform artifact id, or null.
 *
 * `source_id` is a uuid column with no foreign key, and what it points AT is
 * scoped by `source_type` — for this source it is the candidate artifact. The
 * platform spells that `art_<uuid>`, so the prefix is stripped. A value that is
 * not a uuid after stripping is dropped rather than coerced: a wrong id in a
 * column nobody validates is worse than an absent one.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function candidateUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const bare = value.trim().replace(/^art_/, "");
  return UUID.test(bare) ? bare : null;
}

function channelLabel(channel: AllowedChannel): string {
  return channel === "facebook" ? "Facebook Reel" : "Instagram Reel";
}

/**
 * Migration 195 enrichment, read leniently. Each is optional and a caller
 * that got one wrong (out of range, wrong type, unrecognized state) simply
 * does not get it attached — that is the same "attach only what is actually
 * known" rule the agent-platform side already follows, and it means a
 * malformed enrichment value can never fail the one thing this route exists
 * to do: get the draft in front of a human. `undefined` here, not `null` —
 * an explicit null would overwrite nothing (there is no update path) but
 * would still be worth distinguishing from "not sent" in the insert layer.
 */
function readCostUsd(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function readQualityState(value: unknown): string | undefined {
  return typeof value === "string" &&
    (QUALITY_STATES as readonly string[]).includes(value)
    ? value
    : undefined;
}

function readDirectorRationale(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= MAX_DIRECTOR_RATIONALE_CHARS
    ? trimmed
    : undefined;
}

export async function POST(request: Request) {
  if (!isAgentBridgeConfigured()) {
    return reject(
      503,
      `Agent bridge is not configured (missing: ${getMissingAgentBridgeEnvVars().join(", ")})`,
    );
  }

  if (!isAuthorizedAgentRequest(request)) {
    return reject(401, "Unauthorized");
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return reject(413, "Request body too large");
  }

  let body: Body;
  try {
    body = JSON.parse(raw) as Body;
  } catch {
    return reject(400, "Body is not valid JSON");
  }

  // Bound from configuration. The payload's slug is checked, never trusted to
  // select a target — a payload can never choose which company it writes to.
  const expectedSlug = getAgentPlatformCompanyId();
  const companyId = getAgentIngestCompanyId();
  if (!companyId || !expectedSlug) {
    return reject(503, "Agent bridge company mapping is not configured");
  }
  if (
    typeof body.companyId !== "string" ||
    body.companyId.trim() !== expectedSlug
  ) {
    return reject(403, "Payload company does not match the configured mapping");
  }

  const sourceJobId =
    typeof body.sourceJobId === "string" ? body.sourceJobId.trim() : "";
  if (!sourceJobId || !isSafeSourceJobId(sourceJobId)) {
    return reject(400, "sourceJobId is missing or not in an acceptable format");
  }

  const titleBase =
    typeof body.titleBase === "string" ? body.titleBase.trim() : "";
  if (!titleBase || titleBase.length > MAX_TITLE_CHARS) {
    return reject(400, "titleBase is missing or too long");
  }

  if (!Array.isArray(body.posts) || body.posts.length === 0) {
    return reject(400, "posts must be a non-empty array");
  }
  if (body.posts.length > ALLOWED_CHANNELS.length) {
    return reject(400, "posts contains more entries than there are channels");
  }

  const seen = new Set<string>();
  const requested: {
    channel: AllowedChannel;
    text: string;
    callToAction: string | null;
    hashtags: string[];
  }[] = [];

  for (const entry of body.posts as IncomingPost[]) {
    if (!isAllowedChannel(entry?.channel)) {
      return reject(
        400,
        `Each post needs channel one of: ${ALLOWED_CHANNELS.join(", ")}`,
      );
    }
    if (seen.has(entry.channel)) {
      // One post per channel. Two would race for migration 143's delivery
      // guard, and only one of them could ever be published.
      return reject(400, `Duplicate post for channel '${entry.channel}'`);
    }
    seen.add(entry.channel);

    const text = typeof entry.text === "string" ? entry.text.trim() : "";
    if (!text || text.length > MAX_TEXT_CHARS) {
      return reject(400, `Post for '${entry.channel}' has missing or oversized text`);
    }

    const cta =
      typeof entry.callToAction === "string" ? entry.callToAction.trim() : "";
    if (cta.length > MAX_CTA_CHARS) {
      return reject(400, `Post for '${entry.channel}' has an oversized callToAction`);
    }

    const hashtags = Array.isArray(entry.hashtags)
      ? entry.hashtags.filter(
          (tag): tag is string => typeof tag === "string" && tag.trim().length > 0,
        )
      : [];

    requested.push({
      channel: entry.channel,
      text,
      callToAction: cta || null,
      hashtags,
    });
  }

  // The asset must already exist and be STORED. Not an optimisation: a draft
  // pointing at a reservation that never completed would show on Today with a
  // Preview that cannot play, and the composite foreign key would refuse the
  // write anyway. 409 so the next cycle simply retries.
  const asset = await getMediaAssetByJob(companyId, sourceJobId);
  if (!asset) {
    return reject(409, "MEDIA_NOT_FOUND: no media asset for that sourceJobId");
  }
  if (asset.uploadState !== "stored") {
    return reject(
      409,
      `MEDIA_NOT_STORED: media asset for that sourceJobId is '${asset.uploadState}'`,
    );
  }

  const sourceId = candidateUuid(body.candidateArtifactId);
  const costUsd = readCostUsd(body.costUsd);
  const qualityState = readQualityState(body.qualityState);
  const directorRationale = readDirectorRationale(body.directorRationale);

  const results: {
    channel: AllowedChannel;
    postId: string | null;
    outcome: AgentDraftPostOutcome | null;
    error?: string;
  }[] = [];

  for (const post of requested) {
    const created = await createAgentDraftMarketingPost({
      companyId,
      title: `${titleBase} — ${channelLabel(post.channel)}`,
      channelTarget: post.channel as MarketingChannel,
      postText: post.text,
      callToAction: post.callToAction,
      suggestedHashtags: post.hashtags,
      sourceId,
      videoMediaAssetId: asset.id,
      ...(costUsd !== undefined ? { costUsd } : {}),
      ...(qualityState !== undefined ? { qualityState } : {}),
      ...(directorRationale !== undefined ? { directorRationale } : {}),
    });

    results.push({
      channel: post.channel,
      postId: created.post?.id ?? null,
      outcome: created.outcome,
      ...(created.error ? { error: created.error } : {}),
    });
  }

  const failed = results.filter((entry) => entry.outcome === null);
  const payload = {
    ok: failed.length === 0,
    route: ROUTE_NAME,
    companyId,
    sourceJobId,
    videoMediaAssetId: asset.id,
    posts: results,
  };

  // A partial failure is never dressed up as success. Whatever did land stays:
  // it is idempotent, so the retry converges instead of duplicating.
  return NextResponse.json(payload, { status: failed.length === 0 ? 200 : 500 });
}
