/**
 * The dashboard's whole-tenant numbers, and how two computations of them are
 * compared.
 *
 * Pure by design — no Supabase client, no server-only import. That is what lets
 * scripts/verify-dashboard-equality-live.mjs use the SAME comparison the
 * application uses in shadow mode. A verification run that compares differently
 * from the code under test is not verifying that code.
 */
import type { DashboardAggregates } from "@/lib/database/queries/dashboard-aggregates";

/** The dashboard numbers that are a whole-tenant count or sum. */
export type DashboardAggregateFields = {
  unpaidCount: number;
  unpaidTotal: number;
  overdueCount: number;
  overdueTotal: number;
  unpaidInvoiceFollowUpCount: number;
  unsentInvoiceCount: number;
  unsentEstimateCount: number;
  staleSentEstimateCount: number;
  expenseSubmittedCount: number;
  expenseSubmittedTotal: number;
};

export type DashboardAggregateSelection = {
  fields: DashboardAggregateFields;
  /** Which path produced `fields`. Surfaced so callers can log it. */
  source: "legacy" | "aggregates";
  /** Populated in shadow mode when the two paths disagree. */
  drift: DashboardAggregateDrift[];
};

export type DashboardAggregateDrift = {
  field: keyof DashboardAggregateFields;
  legacy: number;
  aggregate: number;
  difference: number;
};

export function toDashboardAggregateFields(
  aggregates: DashboardAggregates,
): DashboardAggregateFields {
  return {
    unpaidCount: aggregates.invoices.unpaidCount,
    unpaidTotal: aggregates.invoices.unpaidTotal,
    overdueCount: aggregates.invoices.overdueCount,
    overdueTotal: aggregates.invoices.overdueTotal,
    unpaidInvoiceFollowUpCount: aggregates.invoices.followUpCount,
    unsentInvoiceCount: aggregates.invoices.draftCount,
    unsentEstimateCount: aggregates.estimates.draftCount,
    staleSentEstimateCount: aggregates.estimates.staleSentCount,
    expenseSubmittedCount: aggregates.expenses.submittedCount,
    expenseSubmittedTotal: aggregates.expenses.submittedTotal,
  };
}

/**
 * Money is compared to the cent, not exactly.
 *
 * The legacy path sums JavaScript numbers; Postgres sums numerics and rounds to
 * two decimals. Those can differ in the last bits of a float without either
 * being wrong. A tolerance of half a cent catches every difference a person
 * could see while not reporting float noise as drift — which would train
 * whoever reads the report to ignore it.
 */
const MONEY_TOLERANCE = 0.005;

const MONEY_FIELDS = new Set<keyof DashboardAggregateFields>([
  "unpaidTotal",
  "overdueTotal",
  "expenseSubmittedTotal",
]);

export function compareDashboardAggregates(
  legacy: DashboardAggregateFields,
  aggregate: DashboardAggregateFields,
): DashboardAggregateDrift[] {
  const drift: DashboardAggregateDrift[] = [];

  for (const key of Object.keys(legacy) as (keyof DashboardAggregateFields)[]) {
    const legacyValue = legacy[key];
    const aggregateValue = aggregate[key];
    const difference = aggregateValue - legacyValue;
    const tolerance = MONEY_FIELDS.has(key) ? MONEY_TOLERANCE : 0;

    if (Math.abs(difference) > tolerance) {
      drift.push({ field: key, legacy: legacyValue, aggregate: aggregateValue, difference });
    }
  }

  return drift;
}

