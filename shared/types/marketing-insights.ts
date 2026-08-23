/**
 * Organic Reel insights — the metric catalogue and the pure shaping rules.
 *
 * ==================== ORGANIC ONLY, DELIBERATELY ====================
 * Everything here is about a post that a person published from Marketing →
 * Today. Paid ad-campaign numbers already have a home on the Agent Platform
 * side and are keyed by campaign, not by post; mixing the two would produce a
 * table where "reach" sometimes means an audience the company paid for and
 * sometimes one it earned. `METRIC_SOURCE` keeps them apart at the row level.
 *
 * No network, no database, no Supabase import — so the rules that decide what
 * a number MEANS can be driven by tests without either.
 */

/**
 * The `source` written on every row this collector produces. Paid figures must
 * never be written under it, and a reader that wants organic-only can filter on
 * exactly this one value.
 */
export const METRIC_SOURCE = "meta_organic_reel";

export type InsightsProvider = "facebook" | "instagram";

/**
 * FACEBOOK PAGE REELS — `GET /{video-id}/video_insights`.
 *
 * The delivery's `providerPostId` IS the video id: `publishFacebookPageReel`
 * returns `{ providerPostId: videoId, providerMediaId: videoId }`
 * (lib/integrations/facebook/reels.ts:294), so one id addresses both.
 *
 * Every Reels metric supports only `period=lifetime`, which is why this
 * collector stores a cumulative reading stamped with the day it was taken
 * rather than a per-day delta.
 *
 * Requires `pages_read_engagement` — already requested at connect time
 * (lib/integrations/facebook/oauth-url.ts:24) and, until now, never used.
 */
export const FACEBOOK_REEL_METRICS = [
  "blue_reels_play_count",
  "fb_reels_total_plays",
  "fb_reels_replay_count",
  "post_impressions_unique",
  "post_video_avg_time_watched",
  "post_video_view_time",
  "post_video_social_actions",
] as const;

/**
 * INSTAGRAM REELS — `GET /{ig-media-id}/insights`.
 *
 * `providerPostId` is the PUBLISHED media id (from `media_publish`);
 * `providerMediaId` is the upload container and is useless here. So both
 * providers are addressed by `providerPostId`.
 *
 * `views` replaced `impressions`, `plays` and `video_views` on 10 April 2025 —
 * asking for any of those three now fails the whole request, so they are not in
 * this list and must not be added back.
 */
export const INSTAGRAM_REEL_METRICS = [
  "views",
  "reach",
  "likes",
  "comments",
  "shares",
  "saved",
  "total_interactions",
] as const;

export function metricsFor(provider: InsightsProvider): readonly string[] {
  return provider === "facebook" ? FACEBOOK_REEL_METRICS : INSTAGRAM_REEL_METRICS;
}

export type CollectedMetric = {
  readonly metric: string;
  readonly value: number;
};

/**
 * Graph returns `{ data: [{ name, period, values: [{ value }] }] }` for both
 * edges. `value` is usually a number; some metrics return an object keyed by
 * breakdown (reaction type, action type). Those are summed rather than dropped,
 * because the total is the honest reading of "how many" — and rather than
 * guessed at, because anything that is neither a number nor an object of
 * numbers is SKIPPED, never coerced to zero.
 *
 * A zero that came from a shape this code did not understand is indistinguishable
 * from a real zero, and it would be recorded with the same confidence.
 */
export function normalizeInsightsPayload(payload: unknown): CollectedMetric[] {
  const data = (payload as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];

  const out: CollectedMetric[] = [];
  for (const entry of data) {
    const name = (entry as { name?: unknown })?.name;
    if (typeof name !== "string" || name === "") continue;

    const values = (entry as { values?: unknown }).values;
    const raw = Array.isArray(values) && values.length > 0
      ? (values[values.length - 1] as { value?: unknown })?.value
      : (entry as { value?: unknown }).value;

    const value = toFiniteTotal(raw);
    if (value === null) continue;
    out.push({ metric: name, value });
  }
  return out;
}

function toFiniteTotal(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    let total = 0;
    let sawNumber = false;
    for (const v of Object.values(raw as Record<string, unknown>)) {
      if (typeof v !== "number" || !Number.isFinite(v)) return null;
      total += v;
      sawNumber = true;
    }
    return sawNumber ? total : null;
  }
  return null;
}

export type InsightsFailureKind =
  /** The post exists but Meta has nothing yet, or will never have this metric. Skip, do not alarm. */
  | "not_ready"
  /** The token is bad or lacks the scope. Every delivery on this account will fail the same way. */
  | "auth"
  /** Throttled. Nothing is wrong; come back later. */
  | "rate_limited"
  /** Something this code does not understand. Surfaced, never swallowed. */
  | "unknown";

/**
 * Classifies a Graph failure so a fresh post does not look like a broken
 * collector.
 *
 * ==================== WHY not_ready IS NOT AN ERROR ====================
 * A Reel published four minutes ago has no insights. Meta answers that with the
 * same generic code 100 it uses for an unsupported metric. Treating either as
 * fatal would make the first run after every publish look like a failure, and a
 * collector that cries wolf on its happy path is a collector nobody reads.
 *
 * The cost of being wrong in this direction is one skipped reading, recovered on
 * the next run. The cost in the other direction is a red cron every morning.
 */
export function classifyInsightsFailure(error: {
  code?: number | undefined;
  subcode?: number | undefined;
  message?: string | undefined;
}): InsightsFailureKind {
  const { code, message } = error;
  if (code === 190 || code === 102 || code === 10 || code === 200) return "auth";
  if (code === 4 || code === 17 || code === 32 || code === 613 || code === 80001) {
    return "rate_limited";
  }
  if (code === 100) return "not_ready";
  if (typeof message === "string" && /does not exist|cannot be loaded|not available/i.test(message)) {
    return "not_ready";
  }
  return "unknown";
}

/**
 * One row of `public.marketing_metrics` (migration 133).
 *
 * `dimensions` carries the whole provenance chain, which is what makes a number
 * traceable without a join at read time — and the join itself still exists in
 * the schema to prove it independently.
 */
export type MetricRow = {
  readonly companyId: string;
  readonly source: string;
  readonly metric: string;
  readonly dimensions: Record<string, string>;
  readonly value: number;
  readonly observedOn: string;
};

export type MetricSubject = {
  readonly companyId: string;
  readonly deliveryId: string;
  readonly provider: InsightsProvider;
  readonly providerPostId: string;
  readonly marketingPostId: string;
  /** The Agent Platform render job that produced the video. The point of all this. */
  readonly sourceJobId: string;
};

export function buildMetricRows(
  subject: MetricSubject,
  metrics: readonly CollectedMetric[],
  observedOn: string,
): MetricRow[] {
  return metrics.map((m) => ({
    companyId: subject.companyId,
    source: METRIC_SOURCE,
    metric: m.metric,
    // Order does not matter — Postgres normalises jsonb key order, so the
    // unique index treats these as the same dimensions however they are built.
    dimensions: {
      deliveryId: subject.deliveryId,
      provider: subject.provider,
      providerPostId: subject.providerPostId,
      marketingPostId: subject.marketingPostId,
      sourceJobId: subject.sourceJobId,
    },
    value: m.value,
    observedOn,
  }));
}

/** UTC day stamp. The unique index makes one reading per metric per day. */
export function observedOnFor(at: Date): string {
  return at.toISOString().slice(0, 10);
}
