import "server-only";

/**
 * ============ ORGANIC REEL INSIGHTS COLLECTOR ============
 *
 * The one missing link in the marketing loop. Everything else already existed:
 * the deliveries carry `provider_post_id`, `marketing_metrics` has had the right
 * shape since migration 133, and the join from a post back to its render job is
 * FK-enforced. Nothing read any of it.
 *
 *   posted delivery
 *     -> Graph insights for that post
 *       -> marketing_metrics rows stamped with the render jobId
 *
 * ==================== WHAT THIS IS NOT ====================
 * It does not publish, claim, settle or change a post's state. It does not
 * touch paid ad campaigns — those live on the Agent Platform, keyed by campaign,
 * and are written under a different `source`. And it builds no dashboard: the
 * numbers land in a table, and what reads them is a later decision.
 *
 * ==================== FRESH POSTS ARE NORMAL ====================
 * A Reel published minutes ago has no insights, and Meta reports that with the
 * same generic error it uses for an unsupported metric. Those are counted as
 * `notReady` and are NOT failures. A run where every post is too new is a
 * successful run that collected nothing.
 */
import {
  listPostedDeliveries,
} from "@/lib/database/queries/marketing-channel-deliveries";
import { getRenderJobForMarketingPost } from "@/lib/database/queries/marketing-media-assets";
import { getMarketingConnectedAccountAccessToken } from "@/lib/database/queries/marketing-connected-account-secrets";
import { upsertMarketingMetrics } from "@/lib/database/queries/marketing-metrics";
import { fetchReelInsights } from "@/lib/integrations/facebook/reel-insights";
import {
  buildMetricRows,
  observedOnFor,
  type InsightsProvider,
} from "@/shared/types/marketing-insights";

export type CollectionOutcome =
  | "collected"
  | "not_ready"
  | "no_render_job"
  | "no_token"
  | "unsupported_provider"
  | "failed";

export type DeliveryCollectionResult = {
  readonly deliveryId: string;
  readonly provider: string;
  readonly outcome: CollectionOutcome;
  readonly sourceJobId: string | null;
  readonly metricsWritten: number;
  readonly detail?: string;
  /** The Meta post/media id asked about. Not a secret; it is in every permalink. */
  readonly providerPostId?: string;
  /** The exact call made, token stripped. */
  readonly endpoint?: string;
  /** Meta's own numbers, so a diagnosis is never inferred from prose. */
  readonly metaCode?: number;
  readonly metaSubcode?: number;
  /** The metric Meta rejected, when it named one — one bad name fails the lot. */
  readonly offendingMetric?: string;
};

export type CollectionSummary = {
  readonly companyId: string;
  readonly observedOn: string;
  readonly considered: number;
  readonly collected: number;
  readonly notReady: number;
  readonly skipped: number;
  readonly failed: number;
  readonly metricsWritten: number;
  readonly results: readonly DeliveryCollectionResult[];
};

const SUPPORTED: readonly string[] = ["facebook", "instagram"];

/**
 * One pass over a company's published Reels.
 *
 * `now` is injected so a caller — and the verify suite — can pin the day stamp
 * that the unique index keys on.
 */
export async function collectReelInsightsForCompany(input: {
  companyId: string;
  now?: Date;
  /** Bound one run. A company with hundreds of posts should not make hundreds of Graph calls at 12:45. */
  maxDeliveries?: number;
}): Promise<CollectionSummary> {
  const now = input.now ?? new Date();
  const observedOn = observedOnFor(now);
  const max = input.maxDeliveries ?? 50;

  const deliveries = (await listPostedDeliveries(input.companyId)).slice(0, max);
  const results: DeliveryCollectionResult[] = [];

  // Tokens are looked up once per connected account, not once per delivery: a
  // company posting to one Page would otherwise decrypt the same secret on
  // every row.
  const tokenCache = new Map<string, string | null>();

  for (const delivery of deliveries) {
    const base = { deliveryId: delivery.id, provider: delivery.provider };

    if (!SUPPORTED.includes(delivery.provider)) {
      results.push({ ...base, outcome: "unsupported_provider", sourceJobId: null, metricsWritten: 0 });
      continue;
    }
    const providerPostId = delivery.providerPostId?.trim();
    if (!providerPostId) {
      results.push({
        ...base, outcome: "failed", sourceJobId: null, metricsWritten: 0,
        detail: "posted delivery with no provider post id",
      });
      continue;
    }

    // The join, walked before the network call. A post with no render behind it
    // is not worth a Graph request: its numbers would have nothing to attribute
    // to, which is the entire purpose of collecting them.
    const job = await getRenderJobForMarketingPost(input.companyId, delivery.marketingPostId);
    if (!job) {
      results.push({ ...base, outcome: "no_render_job", sourceJobId: null, metricsWritten: 0 });
      continue;
    }

    const accountId = delivery.connectedAccountId;
    if (!tokenCache.has(accountId)) {
      const loaded = await getMarketingConnectedAccountAccessToken(accountId);
      tokenCache.set(accountId, loaded.accessToken ?? null);
    }
    const accessToken = tokenCache.get(accountId) ?? null;
    if (!accessToken) {
      results.push({
        ...base, outcome: "no_token", sourceJobId: job.sourceJobId, metricsWritten: 0,
        detail: "no usable access token for the connected account",
      });
      continue;
    }

    const insights = await fetchReelInsights({
      provider: delivery.provider as InsightsProvider,
      providerPostId,
      accessToken,
    });

    if (!insights.ok) {
      results.push({
        ...base,
        outcome: insights.kind === "not_ready" ? "not_ready" : "failed",
        sourceJobId: job.sourceJobId,
        metricsWritten: 0,
        detail: `${insights.kind}: ${insights.detail}`,
        providerPostId,
        endpoint: insights.endpoint,
        ...(insights.code === undefined ? {} : { metaCode: insights.code }),
        ...(insights.subcode === undefined ? {} : { metaSubcode: insights.subcode }),
        ...(insights.offendingMetric ? { offendingMetric: insights.offendingMetric } : {}),
      });
      continue;
    }

    const rows = buildMetricRows(
      {
        companyId: input.companyId,
        deliveryId: delivery.id,
        provider: delivery.provider as InsightsProvider,
        providerPostId,
        marketingPostId: delivery.marketingPostId,
        sourceJobId: job.sourceJobId,
      },
      insights.metrics,
      observedOn,
    );
    const write = await upsertMarketingMetrics(rows);
    results.push({
      ...base,
      outcome: write.error ? "failed" : "collected",
      sourceJobId: job.sourceJobId,
      metricsWritten: write.written,
      providerPostId,
      endpoint: insights.endpoint,
      ...(write.error ? { detail: write.error } : {}),
    });
  }

  return {
    companyId: input.companyId,
    observedOn,
    considered: deliveries.length,
    collected: results.filter((r) => r.outcome === "collected").length,
    notReady: results.filter((r) => r.outcome === "not_ready").length,
    skipped: results.filter((r) =>
      r.outcome === "no_render_job" || r.outcome === "no_token" || r.outcome === "unsupported_provider",
    ).length,
    failed: results.filter((r) => r.outcome === "failed").length,
    metricsWritten: results.reduce((total, r) => total + r.metricsWritten, 0),
    results,
  };
}
