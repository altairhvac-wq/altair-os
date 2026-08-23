import "server-only";

/**
 * Writes into `public.marketing_metrics` (migration 133).
 *
 * That table was created with the right shape and has had no writer since. Its
 * own migration comment says what it is for: "Collected numbers (pure-code
 * collectors). Idempotent upserts via the unique index."
 *
 * ==================== IDEMPOTENCE IS THE INDEX ====================
 *   unique (company_id, source, metric, dimensions, observed_on)
 *
 * So the collector may run hourly, twice, or be replayed after a failure, and a
 * day still holds exactly one reading per metric per delivery. `onConflict`
 * updates `value` and `collected_at` — the later reading of a lifetime counter
 * is the truer one, and overwriting is what keeps a re-run from being a no-op
 * that hides a correction.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { MetricRow } from "@/shared/types/marketing-insights";

type MetricsServiceClient = ReturnType<typeof createServiceRoleClient>;

function metricsTable(client: MetricsServiceClient) {
  // marketing_metrics is a migration-133 table not yet in the generated
  // Database types — same untyped route lib/marketing/store.ts uses for its
  // siblings, rather than inventing a second convention.
  return (client as unknown as SupabaseClient).from("marketing_metrics");
}

export type UpsertMetricsResult = {
  readonly written: number;
  readonly error?: string;
};

export async function upsertMarketingMetrics(
  rows: readonly MetricRow[],
): Promise<UpsertMetricsResult> {
  if (rows.length === 0) return { written: 0 };

  const client = createServiceRoleClient();
  const payload = rows.map((row) => ({
    company_id: row.companyId,
    source: row.source,
    metric: row.metric,
    dimensions: row.dimensions,
    value: row.value,
    observed_on: row.observedOn,
    collected_at: new Date().toISOString(),
  }));

  const result = await metricsTable(client).upsert(payload, {
    onConflict: "company_id,source,metric,dimensions,observed_on",
  });

  if (result.error) {
    console.error("[upsertMarketingMetrics] write failed:", result.error);
    return { written: 0, error: result.error.message };
  }
  return { written: rows.length };
}

/**
 * Every organic reading for one render job, newest first.
 *
 * This is the trace the whole collector exists to make possible: given a render
 * jobId from the Agent Platform, return the numbers the Reel it produced earned.
 * The `dimensions->>sourceJobId` filter is the fast path; the FK chain
 * (delivery → post → media asset → source_job_id) proves the same thing
 * independently and is what `scripts/prove-reel-insights-trace.mjs` walks.
 */
export async function listMetricsForRenderJob(
  companyId: string,
  sourceJobId: string,
): Promise<
  {
    metric: string;
    value: number;
    observedOn: string;
    collectedAt: string;
    dimensions: Record<string, string>;
  }[]
> {
  const client = createServiceRoleClient();
  const result = await metricsTable(client)
    .select("metric, value, observed_on, collected_at, dimensions")
    .eq("company_id", companyId)
    .eq("dimensions->>sourceJobId", sourceJobId)
    .order("observed_on", { ascending: false });

  if (result.error || !result.data) {
    console.error("[listMetricsForRenderJob] lookup failed:", result.error);
    return [];
  }

  return (result.data as Record<string, unknown>[]).map((row) => ({
    metric: String(row.metric),
    value: Number(row.value),
    observedOn: String(row.observed_on),
    collectedAt: String(row.collected_at),
    dimensions: (row.dimensions ?? {}) as Record<string, string>,
  }));
}
