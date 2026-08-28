/**
 * What a shadow comparison actually reports, and why the values stay behind.
 *
 * ============================== THE BUG THIS FILE EXISTS TO FIX ==============================
 * Shadow mode's first implementation had one failure mode that made its output
 * worse than useless. `getCompanyDashboardAggregates` returns ZEROS when the RPC
 * fails — a deliberate choice, so a transient database error degrades one panel
 * instead of taking down the dashboard. In shadow mode those zeros were then
 * compared against the legacy numbers, producing drift on every non-zero field,
 * annotated:
 *
 *     "Expected on a tenant above 1000 invoices, where the legacy path reduces
 *      a truncated array — the aggregate value is the correct one."
 *
 * So a missing migration, a revoked EXECUTE, or a five-second network blip would
 * be reported as CONFIRMATION that the new path is right and the old one is
 * wrong. That is the exact opposite of the truth, arriving in the exact words
 * that would stop someone investigating.
 *
 * A failed comparison is now its own outcome and can never be read as drift.
 *
 * ============================== THE SECOND BUG: MONEY IN THE MONITOR ==============================
 * The drift payload carried `legacy`, `aggregate` and `difference` for every
 * field — including unpaidTotal, overdueTotal and expenseSubmittedTotal. Those
 * are a company's accounts-receivable figures, and `redactMeta` does not strip
 * them because it redacts by key NAME and none of those names look sensitive.
 * Tagged with `company_id`, that turns the monitoring account into a partial
 * ledger.
 *
 * Nothing below emits a value. What it emits is the SHAPE of the disagreement,
 * which is what a diagnosis actually needs.
 *
 * ============================== THE THIRD PROBLEM: DRIFT WAS UNCLASSIFIED ==============================
 * "Legacy and aggregate disagree" is not a finding. The question is whether the
 * disagreement is the known truncation or a defect, and those have different
 * signatures:
 *
 *   TRUNCATION  the legacy path reduced a SUBSET of the rows, so for every
 *               count and every non-negative sum, legacy <= aggregate. It also
 *               requires a tenant large enough to truncate — above PostgREST's
 *               1,000-row ceiling on at least one of the three tables.
 *
 *   DEFECT      anything else. legacy > aggregate cannot be truncation: a
 *               subset cannot total more than the whole. And drift on a tenant
 *               that CANNOT truncate is not truncation by definition.
 *
 * The second half matters more than it looks. Production today holds 13
 * companies whose largest tenant has 26 invoices — so truncation is impossible
 * there, and any drift at all is a defect. Shadow mode in that environment is an
 * exact-equality test, and reporting its results with the old "expected above
 * 1000 invoices" note would have excused the one thing it was watching for.
 */

import type {
  DashboardAggregateDrift,
  DashboardAggregateFields,
} from "@/lib/database/services/dashboard-aggregate-fields";

/** PostgREST's unfiltered response ceiling. The whole reason truncation exists. */
export const POSTGREST_ROW_CEILING = 1000;

/** How many rows the aggregate says the tenant actually has, per table. */
export type TenantScale = {
  invoices: number;
  estimates: number;
  expenses: number;
};

export type ShadowVerdict =
  /** The two paths agree. */
  | "agree"
  /** Disagree, and the disagreement has the truncation signature. */
  | "truncation"
  /** Disagree in a way truncation cannot explain. */
  | "defect"
  /** No comparison happened — the aggregate side did not produce numbers. */
  | "unavailable";

export type ShadowReport = {
  verdict: ShadowVerdict;
  /** Field names only. Never values. */
  driftedFields: string[];
  /**
   * Per field, the DIRECTION of the disagreement and nothing else.
   * "under" means the legacy value was smaller, which is what truncation does.
   */
  directions: Record<string, "under" | "over">;
  /** True when at least one table is large enough for the ceiling to bite. */
  truncationPossible: boolean;
  /** Which tables are above the ceiling. Names only; counts are bucketed. */
  tablesAboveCeiling: string[];
  /**
   * A coarse bucket for how far apart the two paths are, as a share of the
   * larger value. Buckets rather than a ratio so no figure can be reconstructed.
   */
  magnitude: "none" | "under-1pct" | "1-10pct" | "10-50pct" | "over-50pct";
};

/**
 * Buckets the worst relative disagreement.
 *
 * Relative, not absolute, so the bucket says the same thing for a company with
 * a thousand dollars outstanding and one with a million — and so no absolute
 * figure is implied by the bucket boundaries.
 */
function bucketMagnitude(drift: DashboardAggregateDrift[]): ShadowReport["magnitude"] {
  if (drift.length === 0) return "none";

  let worst = 0;
  for (const entry of drift) {
    const scale = Math.max(Math.abs(entry.legacy), Math.abs(entry.aggregate));
    if (scale === 0) continue;
    worst = Math.max(worst, Math.abs(entry.difference) / scale);
  }

  if (worst === 0) return "none";
  if (worst < 0.01) return "under-1pct";
  if (worst < 0.1) return "1-10pct";
  if (worst < 0.5) return "10-50pct";
  return "over-50pct";
}

/**
 * Turns a comparison into something a person can act on without seeing a number.
 *
 * `scale` comes from the aggregate's own totalActiveCount fields, which are
 * counts of rows rather than money, and are the only way to know whether this
 * tenant could truncate at all.
 */
export function buildShadowReport(input: {
  drift: DashboardAggregateDrift[];
  scale: TenantScale;
}): ShadowReport {
  const { drift, scale } = input;

  const tablesAboveCeiling = (
    Object.entries(scale) as [keyof TenantScale, number][]
  )
    .filter(([, count]) => count > POSTGREST_ROW_CEILING)
    .map(([table]) => table);

  const truncationPossible = tablesAboveCeiling.length > 0;

  if (drift.length === 0) {
    return {
      verdict: "agree",
      driftedFields: [],
      directions: {},
      truncationPossible,
      tablesAboveCeiling,
      magnitude: "none",
    };
  }

  const directions: Record<string, "under" | "over"> = {};
  let everyFieldUnderstated = true;

  for (const entry of drift) {
    // difference = aggregate - legacy. Positive means legacy was the smaller
    // number, which is what reducing a truncated subset produces.
    const direction = entry.difference > 0 ? "under" : "over";
    directions[entry.field] = direction;
    if (direction === "over") everyFieldUnderstated = false;
  }

  const verdict: ShadowVerdict =
    everyFieldUnderstated && truncationPossible ? "truncation" : "defect";

  return {
    verdict,
    driftedFields: drift.map((entry) => entry.field),
    directions,
    truncationPossible,
    tablesAboveCeiling,
    magnitude: bucketMagnitude(drift),
  };
}

/**
 * The sentence attached to each verdict.
 *
 * Written so that whoever reads it in an incident does not have to reconstruct
 * this reasoning. The truncation note in particular used to be attached
 * unconditionally, which is how a defect could have been waved through.
 */
export function describeShadowVerdict(report: ShadowReport): string {
  switch (report.verdict) {
    case "agree":
      return "Legacy and SQL aggregate dashboard numbers agree.";
    case "truncation":
      return (
        "Legacy and SQL aggregate dashboard numbers disagree, and the " +
        "disagreement has the truncation signature: every drifted field is " +
        "UNDERSTATED by the legacy path, on a tenant large enough for " +
        `PostgREST's ${POSTGREST_ROW_CEILING}-row ceiling to bite ` +
        `(${report.tablesAboveCeiling.join(", ")}). The aggregate value is the ` +
        "correct one."
      );
    case "defect":
      return report.truncationPossible
        ? "Legacy and SQL aggregate dashboard numbers disagree in a way " +
            "truncation cannot explain: at least one field is OVERSTATED by " +
            "the legacy path, and a subset cannot total more than the whole. " +
            "Treat as a defect in the aggregate SQL."
        : "Legacy and SQL aggregate dashboard numbers disagree on a tenant " +
            `below PostgREST's ${POSTGREST_ROW_CEILING}-row ceiling on every ` +
            "table, so the legacy path reduced the COMPLETE set and truncation " +
            "cannot be the explanation. Treat as a defect in the aggregate SQL.";
    case "unavailable":
      return (
        "No comparison was made: the aggregate RPC did not return numbers. " +
        "This is NOT drift and must not be read as one — the aggregate path " +
        "returns zeros on failure, so comparing them would report every field " +
        "as understated and appear to confirm the new path."
      );
  }
}

/**
 * The report emitted when the RPC never produced numbers.
 *
 * Deliberately takes no scale argument. The aggregate is what reports a
 * tenant's row counts, so a failed call has no scale to speak of — and
 * inventing one here would let `truncationPossible` claim something the data
 * never said.
 */
export function buildUnavailableReport(): ShadowReport {
  return {
    verdict: "unavailable",
    driftedFields: [],
    directions: {},
    truncationPossible: false,
    tablesAboveCeiling: [],
    magnitude: "none",
  };
}

/** Field names, for a log line that carries no values. */
export function shadowFieldNames(
  fields: DashboardAggregateFields,
): (keyof DashboardAggregateFields)[] {
  return Object.keys(fields) as (keyof DashboardAggregateFields)[];
}
