import "server-only";

import { createClient } from "@/lib/supabase/server";

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
  attachedReceiptCount: number;
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
    attachedReceiptCount: 0,
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
    attachedReceiptCount: toNumber(source.attachedReceiptCount),
    totalActiveCount: toNumber(source.totalActiveCount),
  };
}

/**
 * Fetches the aggregates for one company.
 *
 * Returns zeros on failure rather than throwing. The dashboard is a read-only
 * overview: a transient database error should degrade one panel, not take the
 * whole page down. The failure is logged, and — unlike the situation before
 * Phase 2 — that log now reaches the error monitor through the operations
 * framework when the caller runs inside `runOperation`.
 */
export async function getCompanyDashboardAggregates(
  companyId: string,
  reference: Date = new Date(),
): Promise<DashboardAggregates> {
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
    return EMPTY_DASHBOARD_AGGREGATES;
  }

  const payload = (data ?? {}) as Record<string, unknown>;

  return {
    invoices: readInvoices(payload.invoices),
    estimates: readEstimates(payload.estimates),
    expenses: readExpenses(payload.expenses),
  };
}
