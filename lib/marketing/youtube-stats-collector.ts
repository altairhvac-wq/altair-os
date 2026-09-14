import "server-only";

/**
 * ============ YOUTUBE ORGANIC STATS COLLECTOR ============
 *
 * The YouTube twin of `reel-insights-collector.ts`, and the missing half of
 * the learning loop: four Shorts have been uploaded with verified metadata,
 * and until this file nothing in either repository ever read a number back.
 *
 *   posted youtube delivery
 *     -> videos.list part=statistics,status (the ALREADY-GRANTED read scope)
 *       -> marketing_metrics rows under source `youtube_organic_video`
 *
 * ==================== WHAT THIS IS NOT ====================
 * It does not publish, claim, settle, or change a video's state, and it does
 * not touch the YouTube ANALYTICS API — retention, impressions and
 * click-through live behind a scope this connection was never granted, so
 * they are represented as absent, never as zero. Views, likes and comments
 * are what `videos.list` honestly reports, and they are the whole catalogue.
 *
 * ==================== PRIVATE VIDEOS ARE COLLECTABLE ====================
 * The reads ride the owner's OAuth token — the same one the upload readback
 * already proved can see private videos — so today's private-until-approved
 * Shorts produce rows (of mostly zeros) from day one. That is deliberate:
 * it proves ingestion end-to-end before anything is public, which is the
 * only kind of proof that needs no public post.
 */
import {
  getMarketingConnectedAccountByIdAdmin,
} from "@/lib/database/queries/marketing-connected-accounts-admin";
import { listPostedDeliveries } from "@/lib/database/queries/marketing-channel-deliveries";
import { upsertMarketingMetrics } from "@/lib/database/queries/marketing-metrics";
import { getRenderJobForMarketingPost } from "@/lib/database/queries/marketing-media-assets";
import { getUsableAccessToken } from "@/lib/integrations/credential-lifecycle";
import { fetchYouTubeVideoStatistics } from "@/lib/integrations/youtube/upload";
import {
  buildYouTubeMetricRows,
  observedOnFor,
  type CollectedMetric,
} from "@/shared/types/marketing-insights";

export type YouTubeCollectionOutcome =
  | "collected"
  /** YouTube reports no such video — deleted, or the id predates this system. */
  | "video_missing"
  | "no_token"
  | "failed";

export type YouTubeDeliveryCollectionResult = {
  readonly deliveryId: string;
  readonly outcome: YouTubeCollectionOutcome;
  /** The render-job attribution, or "" for pre-attribution history. */
  readonly sourceJobId: string;
  readonly metricsWritten: number;
  readonly providerPostId: string;
  /** From the same readback, so a summary can say which rows are private. */
  readonly privacyStatus?: string;
  readonly detail?: string;
};

export type YouTubeCollectionSummary = {
  readonly companyId: string;
  readonly observedOn: string;
  readonly considered: number;
  readonly collected: number;
  readonly skipped: number;
  readonly failed: number;
  readonly metricsWritten: number;
  readonly results: readonly YouTubeDeliveryCollectionResult[];
};

/**
 * One pass over a company's posted YouTube deliveries.
 *
 * `now` is injected so a caller — and a proof run — can pin the day stamp
 * the metrics table's unique index keys on.
 */
export async function collectYouTubeStatsForCompany(input: {
  companyId: string;
  now?: Date;
  /** Bound one run; videos.list costs quota per call. */
  maxDeliveries?: number;
}): Promise<YouTubeCollectionSummary> {
  const now = input.now ?? new Date();
  const observedOn = observedOnFor(now);
  const max = input.maxDeliveries ?? 50;

  const deliveries = (await listPostedDeliveries(input.companyId))
    .filter((d) => d.provider === "youtube")
    .slice(0, max);

  const results: YouTubeDeliveryCollectionResult[] = [];

  // One credential resolution per connected account, not per video. The
  // lifecycle wrapper (not the raw decrypt) because YouTube access tokens
  // last about an hour: a collector that never refreshed would work only in
  // the hour after a publish and read as broken the rest of the day.
  const tokenCache = new Map<string, string | null>();

  for (const delivery of deliveries) {
    const providerPostId = delivery.providerPostId?.trim() ?? "";
    const base = { deliveryId: delivery.id, providerPostId };

    if (!providerPostId) {
      results.push({
        ...base, outcome: "failed", sourceJobId: "", metricsWritten: 0,
        detail: "posted delivery with no provider post id",
      });
      continue;
    }

    // Attribution is recorded when it exists and the row is written either
    // way: YouTube Shorts are attributed downstream by video id as well, so
    // dropping unattributed history here would throw away real numbers to
    // protect a join the reader is not required to make.
    const job = await getRenderJobForMarketingPost(
      input.companyId,
      delivery.marketingPostId,
    );
    const sourceJobId = job?.sourceJobId ?? "";

    const accountId = delivery.connectedAccountId;
    if (!tokenCache.has(accountId)) {
      const account = await getMarketingConnectedAccountByIdAdmin(accountId);
      if (!account) {
        tokenCache.set(accountId, null);
      } else {
        const credential = await getUsableAccessToken({
          account: {
            connectedAccountId: account.id,
            companyId: account.companyId,
            provider: "youtube",
            integrationKind: account.integrationKind,
            tokenExpiresAt: account.tokenExpiresAt ?? null,
          },
          nowIso: now.toISOString(),
        });
        tokenCache.set(accountId, credential.ok ? credential.accessToken : null);
      }
    }
    const accessToken = tokenCache.get(accountId) ?? null;
    if (!accessToken) {
      results.push({
        ...base, outcome: "no_token", sourceJobId, metricsWritten: 0,
        detail: "no usable access token for the connected account",
      });
      continue;
    }

    let stats: Awaited<ReturnType<typeof fetchYouTubeVideoStatistics>>;
    try {
      stats = await fetchYouTubeVideoStatistics({
        accessToken,
        videoId: providerPostId,
      });
    } catch (error) {
      results.push({
        ...base, outcome: "failed", sourceJobId, metricsWritten: 0,
        detail: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    if (!stats) {
      results.push({
        ...base, outcome: "video_missing", sourceJobId, metricsWritten: 0,
        detail: "YouTube reports no such video",
      });
      continue;
    }

    // Null means "YouTube did not report this counter" (comments disabled,
    // for instance) and produces NO row — a zero would be indistinguishable
    // from a real zero, recorded with the same confidence.
    const metrics: CollectedMetric[] = [];
    if (stats.viewCount !== null) metrics.push({ metric: "views", value: stats.viewCount });
    if (stats.likeCount !== null) metrics.push({ metric: "likes", value: stats.likeCount });
    if (stats.commentCount !== null) {
      metrics.push({ metric: "comments", value: stats.commentCount });
    }

    const rows = buildYouTubeMetricRows(
      {
        companyId: input.companyId,
        deliveryId: delivery.id,
        providerPostId,
        marketingPostId: delivery.marketingPostId,
        sourceJobId,
      },
      metrics,
      observedOn,
    );

    const write = await upsertMarketingMetrics(rows);
    results.push({
      ...base,
      outcome: write.error ? "failed" : "collected",
      sourceJobId,
      metricsWritten: write.written,
      ...(stats.privacyStatus ? { privacyStatus: stats.privacyStatus } : {}),
      ...(write.error ? { detail: write.error } : {}),
    });
  }

  return {
    companyId: input.companyId,
    observedOn,
    considered: deliveries.length,
    collected: results.filter((r) => r.outcome === "collected").length,
    skipped: results.filter(
      (r) => r.outcome === "no_token" || r.outcome === "video_missing",
    ).length,
    failed: results.filter((r) => r.outcome === "failed").length,
    metricsWritten: results.reduce((total, r) => total + r.metricsWritten, 0),
    results,
  };
}
