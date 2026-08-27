import { selectInChunks } from "@/lib/database/queries/chunked-in";
import "server-only";

/**
 * Assembles organic Reel performance into the evidence the strategist reads.
 *
 * The join is the one the schema has always had and nothing walked:
 *
 *   marketing_metrics.dimensions->>sourceJobId
 *     -> marketing_media_assets.source_job_id
 *     -> marketing_posts.video_media_asset_id   (title, and the caption as published)
 *     -> marketing_channel_deliveries           (provider, when it went live)
 *
 * `dimensions` is the fast path in; the FK chain is what makes the attribution
 * true, and `scripts/prove-reel-insights-trace.mjs` checks the two agree.
 *
 * READ ONLY. No collection happens here — this reads what the collector wrote.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  REEL_EVIDENCE_SOURCE,
  foldMetricsForProvider,
  hookFromPostText,
  storyFromTitle,
  summarizeByProvider,
  type ReelEvidence,
  type ReelEvidenceRow,
} from "@/shared/types/marketing-reel-evidence";

type MetricRow = {
  metric: string;
  value: number | string;
  observed_on: string;
  dimensions: Record<string, string> | null;
};

/**
 * @param sinceDays window for the READING, not for publication — a Reel posted
 *   three weeks ago that collected numbers yesterday is current evidence.
 */
export async function getReelPerformanceEvidence(
  companyId: string,
  sinceDays = 30,
): Promise<ReelEvidence> {
  const client = createServiceRoleClient();
  const anyClient = client as unknown as SupabaseClient;
  const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString().slice(0, 10);

  const metrics = await anyClient
    .from("marketing_metrics")
    .select("metric, value, observed_on, dimensions")
    .eq("company_id", companyId)
    .eq("source", REEL_EVIDENCE_SOURCE)
    .gte("observed_on", since)
    .limit(5_000);

  if (metrics.error || !metrics.data) {
    console.error("[getReelPerformanceEvidence] metrics lookup failed:", metrics.error);
    return { sinceDays, reels: [], byProvider: {} };
  }

  // Group by delivery: one delivery is one Reel on one provider.
  const byDelivery = new Map<string, MetricRow[]>();
  for (const row of metrics.data as MetricRow[]) {
    const deliveryId = row.dimensions?.deliveryId;
    if (!deliveryId) continue;
    const bucket = byDelivery.get(deliveryId);
    if (bucket) bucket.push(row);
    else byDelivery.set(deliveryId, [row]);
  }
  if (byDelivery.size === 0) return { sinceDays, reels: [], byProvider: {} };

  const deliveryIds = [...byDelivery.keys()];
  // Chunked — see lib/database/queries/chunked-in.ts. Keyed into a Map below.
  const deliveries = await selectInChunks<{
    id: string;
    marketing_post_id: string;
    provider: string;
    settled_at: string | null;
  }>(deliveryIds, (chunk) =>
    anyClient
      .from("marketing_channel_deliveries")
      .select("id, marketing_post_id, provider, settled_at")
      .eq("company_id", companyId)
      .in("id", chunk),
  );

  if (deliveries.error || !deliveries.data) {
    console.error("[getReelPerformanceEvidence] delivery lookup failed:", deliveries.error);
    return { sinceDays, reels: [], byProvider: {} };
  }
  const deliveryById = new Map(
    (deliveries.data as { id: string; marketing_post_id: string; provider: string; settled_at: string | null }[])
      .map((d) => [d.id, d]),
  );

  const postIds = [...new Set([...deliveryById.values()].map((d) => d.marketing_post_id))];
  // Chunked — see lib/database/queries/chunked-in.ts. Keyed into a Map below.
  const posts = await selectInChunks<{
    id: string;
    title: string | null;
    post_text: string | null;
  }>(postIds, (chunk) =>
    anyClient
      .from("marketing_posts")
      .select("id, title, post_text")
      .eq("company_id", companyId)
      .in("id", chunk),
  );

  if (posts.error || !posts.data) {
    console.error("[getReelPerformanceEvidence] post lookup failed:", posts.error);
    return { sinceDays, reels: [], byProvider: {} };
  }
  const postById = new Map(
    (posts.data as { id: string; title: string; post_text: string }[]).map((p) => [p.id, p]),
  );

  const reels: ReelEvidenceRow[] = [];
  for (const [deliveryId, rows] of byDelivery) {
    const delivery = deliveryById.get(deliveryId);
    if (!delivery) continue;
    const post = postById.get(delivery.marketing_post_id);
    const sourceJobId = rows[0]?.dimensions?.sourceJobId;
    if (!sourceJobId) continue;

    const folded = foldMetricsForProvider(
      delivery.provider,
      rows.map((r) => ({
        metric: r.metric,
        value: Number(r.value),
        observedOn: r.observed_on,
      })),
    );

    reels.push({
      sourceJobId,
      story: storyFromTitle(post?.title),
      hook: hookFromPostText(post?.post_text),
      provider: delivery.provider,
      publishedAt: delivery.settled_at,
      daysObserved: folded.daysObserved,
      latestObservedOn: folded.latestObservedOn,
      metrics: folded.metrics,
    });
  }

  // Strongest first WITHIN the list, so the model reads the biggest numbers
  // first. This is presentation order, never a ranking claim — the sufficiency
  // rules decide whether any comparison may be drawn at all.
  reels.sort((a, b) => (b.metrics.views ?? 0) - (a.metrics.views ?? 0));

  return { sinceDays, reels, byProvider: summarizeByProvider(reels) };
}
