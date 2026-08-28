import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * The dashboard's operations-summary aggregates, computed in SQL (migration 166).
 *
 * ============================== WHY THIS EXISTS ==============================
 * getDailyOperationsSummary composed eight dashboard sections from eleven report
 * builders, each reducing whole-book arrays. Measured on the scale-seeded
 * scratch tenant, getDashboardData took 15,799 ms — of which the fan-out was
 * 15,453 ms and the reduction that happens AFTER it was 346 ms.
 *
 * The obvious reading of that is "the database is slow". It is not. The same six
 * whole-book reads issued directly, concurrently, against the same database
 * complete in 3,183 ms. The remaining twelve seconds are Node: parsing six
 * thousand joined rows into domain objects and grouping them through eleven
 * builders.
 *
 * So the fix is not a faster query. It is not materialising the objects.
 *
 * ============================== WHAT MOVED, AND WHAT DID NOT ==============================
 * Five sections are a plain count or sum with no business rule beyond a status
 * test, and those are here. Three are not, and they stay in TypeScript:
 * completedAwaitingInvoicing's job list, completedWorkReview, and the
 * profitability warnings all depend on computeJobProfitability — 473 lines
 * covering revenue recognition, material COGS, expense classification and
 * labour. A second definition of a job's profitability, expressed in SQL, would
 * drift from the first without anything noticing.
 *
 * What the SQL does for those is narrower and safe: it returns the CANDIDATE
 * counts, using necessary conditions lifted from the shipped predicates rather
 * than reimplementations of them. See migration 166.
 *
 * ============================== THE ONE COUNT THAT LOOKED LIKE A RULE ==============================
 * completedAwaitingInvoicing's COUNT looks like it needs the profitability
 * snapshot, because isCompletedAwaitingInvoicing reads
 * `snapshot.completeness.noActiveInvoices`. Expanded, that field is
 * `activeInvoices.length === 0` — the job has no invoice whose status is
 * outside (void, cancelled). That is an anti-join, not a profitability rule,
 * and it is exact in SQL. Only the job LIST needs the snapshot, because the
 * list carries collectedRevenue and approvedEstimateAmount per row.
 */

export type OperationsSummaryAggregates = {
  revenue: {
    collectedRevenue: number;
    outstandingRevenue: number;
  };
  jobs: {
    openCount: number;
  };
  expenses: {
    submittedCount: number;
    submittedTotal: number;
  };
  labor: {
    activeLaborEntries: number;
    technicianCount: number;
  };
  candidates: {
    completedJobCount: number;
    stalledCandidateCount: number;
    jobsWithMaterialsCount: number;
  };
  /** False when the RPC failed and every figure above is a zero fallback. */
  ok: boolean;
};

export const EMPTY_OPERATIONS_SUMMARY_AGGREGATES: OperationsSummaryAggregates = {
  revenue: { collectedRevenue: 0, outstandingRevenue: 0 },
  jobs: { openCount: 0 },
  expenses: { submittedCount: 0, submittedTotal: 0 },
  labor: { activeLaborEntries: 0, technicianCount: 0 },
  candidates: {
    completedJobCount: 0,
    stalledCandidateCount: 0,
    jobsWithMaterialsCount: 0,
  },
  ok: false,
};

/**
 * PostgREST serializes numeric inconsistently — sometimes a JSON number,
 * sometimes a string. Coerced once here rather than at each use, because a
 * string that reaches a comparison sorts lexicographically and "9" > "10".
 */
function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function section(raw: unknown): Record<string, unknown> {
  return (raw ?? {}) as Record<string, unknown>;
}

export async function getCompanyOperationsSummaryAggregates(
  companyId: string,
): Promise<OperationsSummaryAggregates> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_company_operations_summary", {
    p_company_id: companyId,
  });

  if (error) {
    // Zeros rather than a throw: the dashboard is a read-only overview and one
    // failed panel is better than a failed page. `ok` is what lets the caller
    // tell a genuinely empty company from a failure — the distinction shadow
    // mode was missing, and the same trap applies here.
    console.error("[getCompanyOperationsSummaryAggregates] rpc failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return EMPTY_OPERATIONS_SUMMARY_AGGREGATES;
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const revenue = section(payload.revenue);
  const jobs = section(payload.jobs);
  const expenses = section(payload.expenses);
  const labor = section(payload.labor);
  const candidates = section(payload.candidates);

  return {
    revenue: {
      collectedRevenue: toNumber(revenue.collectedRevenue),
      outstandingRevenue: toNumber(revenue.outstandingRevenue),
    },
    jobs: { openCount: toNumber(jobs.openCount) },
    expenses: {
      submittedCount: toNumber(expenses.submittedCount),
      submittedTotal: toNumber(expenses.submittedTotal),
    },
    labor: {
      activeLaborEntries: toNumber(labor.activeLaborEntries),
      technicianCount: toNumber(labor.technicianCount),
    },
    candidates: {
      completedJobCount: toNumber(candidates.completedJobCount),
      stalledCandidateCount: toNumber(candidates.stalledCandidateCount),
      jobsWithMaterialsCount: toNumber(candidates.jobsWithMaterialsCount),
    },
    ok: true,
  };
}
