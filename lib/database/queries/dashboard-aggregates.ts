import "server-only";

import { createClient } from "@/lib/supabase/server";
import { captureMonitoredEvent } from "@/lib/operations/monitoring";

/**
 * Exact dashboard aggregates, computed in SQL.
 *
 * ==================== WHAT THIS REPLACES ====================
 * getDashboardData loaded every invoice, estimate and expense a company had
 * ever created on each render, then reduced them to a handful of counts and
 * money totals. The largest dashboard limit is 10; the reads were unbounded.
 *
 * `get_company_dashboard_aggregates` (migration 151) returns the finished
 * numbers in one round trip. Every value is a `count(*)` or `sum(...) FILTER`
 * over the whole matching set, never a truncated list — a count that disagrees
 * with what a user can page through is worse than a slow dashboard.
 *
 * ==================== ROLLOUT ====================
 * This path is OFF by default and is selected by
 * `isDashboardAggregatesEnabled()`. The gate for switching it on is a measured
 * before/after equality run against a seeded tenant, which needs a scratch
 * database. Until that has happened the legacy path stays authoritative. See
 * docs/development/load-testing.md.
 *
 * ==================== PERMISSIONS ====================
 * The RPC enforces authentication, active membership, and the same per-section
 * permissions as `getCompanyAccessScope`. A caller without billing access
 * receives zeros rather than an error, matching the TypeScript, which passes
 * empty arrays for those reads. Nothing here re-derives permissions client-side.
 */

const DASHBOARD_AGGREGATES_ENV = "ALTAIR_DASHBOARD_AGGREGATES";

/**
 * Whether the SQL aggregate path is active.
 *
 * Deliberately opt-in. Turning this on changes how the most financially
 * sensitive screen in the product computes its numbers, so it should follow a
 * run that proves old and new agree on real data — not a deploy.
 */
export function isDashboardAggregatesEnabled(): boolean {
  return process.env[DASHBOARD_AGGREGATES_ENV]?.trim().toLowerCase() === "on";
}

/**
 * Whether to compute BOTH paths and report any disagreement.
 *
 * Intended for one verification run against a seeded scratch tenant. It doubles
 * the work, so it must never be left on in production; the aggregates path
 * itself is what production would use.
 */
export function isDashboardAggregatesShadowCompareEnabled(): boolean {
  return process.env[DASHBOARD_AGGREGATES_ENV]?.trim().toLowerCase() === "shadow";
}

export type DashboardInvoiceAggregates = {
  unpaidTotal: number;
  paidTotal: number;
  overdueTotal: number;
  unpaidCount: number;
  overdueCount: number;
  draftCount: number;
  followUpCount: number;
  totalActiveCount: number;
};

export type DashboardEstimateAggregates = {
  draftCount: number;
  staleSentCount: number;
  approvedCount: number;
  totalActiveCount: number;
};

export type DashboardExpenseAggregates = {
  submittedCount: number;
  /**
   * Money, and the field the dashboard actually renders.
   *
   * This type previously declared `attachedReceiptCount`, which the SQL has
   * never returned — so it read as 0 forever — while dropping submittedTotal,
   * which the SQL does return and which
   * shared/components/dashboard/DashboardCompactSummaries.tsx displays as a
   * currency amount. The reader and the function disagreed about the shape of
   * the one section carrying a number a person acts on.
   */
  submittedTotal: number;
  missingReceiptCount: number;
  totalActiveCount: number;
};

export type DashboardAggregates = {
  invoices: DashboardInvoiceAggregates;
  estimates: DashboardEstimateAggregates;
  expenses: DashboardExpenseAggregates;
};

export const EMPTY_DASHBOARD_AGGREGATES: DashboardAggregates = {
  invoices: {
    unpaidTotal: 0,
    paidTotal: 0,
    overdueTotal: 0,
    unpaidCount: 0,
    overdueCount: 0,
    draftCount: 0,
    followUpCount: 0,
    totalActiveCount: 0,
  },
  estimates: {
    draftCount: 0,
    staleSentCount: 0,
    approvedCount: 0,
    totalActiveCount: 0,
  },
  expenses: {
    submittedCount: 0,
    submittedTotal: 0,
    missingReceiptCount: 0,
    totalActiveCount: 0,
  },
};

/**
 * PostgREST serializes numeric/bigint inconsistently — a JSON number here, a
 * string there. Coerce defensively rather than letting a string silently
 * propagate into a money total and render as "0" or concatenate.
 */
function toNumber(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function readInvoices(raw: unknown): DashboardInvoiceAggregates {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    unpaidTotal: toNumber(source.unpaidTotal),
    paidTotal: toNumber(source.paidTotal),
    overdueTotal: toNumber(source.overdueTotal),
    unpaidCount: toNumber(source.unpaidCount),
    overdueCount: toNumber(source.overdueCount),
    draftCount: toNumber(source.draftCount),
    followUpCount: toNumber(source.followUpCount),
    totalActiveCount: toNumber(source.totalActiveCount),
  };
}

function readEstimates(raw: unknown): DashboardEstimateAggregates {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    draftCount: toNumber(source.draftCount),
    staleSentCount: toNumber(source.staleSentCount),
    approvedCount: toNumber(source.approvedCount),
    totalActiveCount: toNumber(source.totalActiveCount),
  };
}

function readExpenses(raw: unknown): DashboardExpenseAggregates {
  const source = (raw ?? {}) as Record<string, unknown>;
  return {
    submittedCount: toNumber(source.submittedCount),
    submittedTotal: toNumber(source.submittedTotal),
    missingReceiptCount: toNumber(source.missingReceiptCount),
    totalActiveCount: toNumber(source.totalActiveCount),
  };
}

/**
 * The outcome of one aggregate fetch, with success distinguishable from zeros.
 *
 * ============================== WHY THIS TYPE EXISTS ==============================
 * This function returns ZEROS on failure, deliberately: the dashboard is a
 * read-only overview and a transient database error should degrade one panel
 * rather than take the page down. That is the right behaviour for RENDERING and
 * the wrong shape for COMPARING, because a caller cannot tell an all-zero
 * tenant from a failed call.
 *
 * Shadow mode compared them anyway. A failed RPC produced drift on every
 * non-zero field, reported as evidence that the legacy path was understating —
 * so a missing migration or a revoked grant would have read as confirmation
 * that the new path was working. `ok` is what stops that.
 */
export type DashboardAggregatesResult = {
  aggregates: DashboardAggregates;
  /** False when the RPC failed and `aggregates` is the zeros fallback. */
  ok: boolean;
  /** Postgres/PostgREST code, for classification. Never a message with data in it. */
  errorCode?: string;
};

/**
 * Fetches the aggregates for one company.
 *
 * Returns zeros on failure rather than throwing — see DashboardAggregatesResult
 * for why the caller is told which it got.
 */
export async function getCompanyDashboardAggregatesResult(
  companyId: string,
  reference: Date = new Date(),
): Promise<DashboardAggregatesResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "get_company_dashboard_aggregates",
    {
      p_company_id: companyId,
      p_reference: reference.toISOString(),
    },
  );

  if (error) {
    console.error("[getCompanyDashboardAggregates] rpc failed:", {
      companyId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    // Reaches the monitor as well as the runtime log. A console line on Vercel
    // is short-lived and cannot be searched by tag; a permission failure on this
    // RPC is precisely the thing a rollout needs to see, and it used to be
    // visible only to whoever happened to be tailing logs at the time.
    captureMonitoredEvent({
      event: "dashboard.aggregate_rpc_failed",
      level: "error",
      companyId,
      meta: {
        // Codes and flags only. The message can echo SQL and identifiers.
        code: error.code ?? null,
        // 42501 is permission denied; PGRST202 is a missing function. Both mean
        // a migration or a grant did not land, not a transient fault.
        likelyDeploymentFault:
          error.code === "42501" || error.code === "PGRST202",
      },
    });

    return {
      aggregates: EMPTY_DASHBOARD_AGGREGATES,
      ok: false,
      errorCode: error.code ?? undefined,
    };
  }

  const payload = (data ?? {}) as Record<string, unknown>;

  return {
    aggregates: {
      invoices: readInvoices(payload.invoices),
      estimates: readEstimates(payload.estimates),
      expenses: readExpenses(payload.expenses),
    },
    ok: true,
  };
}

/**
 * Back-compatible shape for callers that only render.
 *
 * Kept so the rendering path is unchanged: it wants zeros on failure and does
 * not care which it got. Only the comparison path needs `ok`.
 */
export async function getCompanyDashboardAggregates(
  companyId: string,
  reference: Date = new Date(),
): Promise<DashboardAggregates> {
  const result = await getCompanyDashboardAggregatesResult(companyId, reference);
  return result.aggregates;
}
