import "server-only";

import { captureMonitoredEvent } from "@/lib/operations/monitoring";
import {
  getCompanyDashboardAggregates,
  isDashboardAggregatesEnabled,
  isDashboardAggregatesShadowCompareEnabled,
} from "@/lib/database/queries/dashboard-aggregates";
import {
  compareDashboardAggregates,
  toDashboardAggregateFields,
  type DashboardAggregateDrift,
  type DashboardAggregateFields,
} from "@/lib/database/services/dashboard-aggregate-fields";

export {
  compareDashboardAggregates,
  type DashboardAggregateDrift,
  type DashboardAggregateFields,
};

/**
 * Selects between the legacy in-memory dashboard numbers and the SQL aggregates.
 *
 * ============================== WHY THIS EXISTS ==============================
 * Migration 151 added the aggregate RPC, 158 fixed its columns, 159 fixed its
 * privileges — and nothing called it. ALTAIR_DASHBOARD_AGGREGATES could be set
 * to "on" and the dashboard would carry on reducing a truncated array, because
 * the flag gated a module that had no consumer. A feature flag that changes
 * nothing is worse than no flag: it reads as a rollout that already happened.
 *
 * ============================== WHAT IS BEING SWAPPED ==============================
 * Only the ten fields that are a count or a sum over the whole tenant. Every
 * list on the dashboard stays exactly as it was — those are already bounded by
 * their own limits and are not what was wrong.
 *
 * The distinction matters. The legacy path derived these ten numbers from
 * arrays that PostgREST silently capped at 1000 rows, so on a tenant with
 * 10,000 invoices the headline accounts-receivable figure was understated by
 * roughly 90%. The lists beside it were always meant to show only the top few.
 *
 * ============================== THE THREE MODES ==============================
 *   off     — legacy only. The default, and what production runs today.
 *   shadow  — compute both, report every disagreement, RETURN THE LEGACY VALUES.
 *             This is the verification mode: it can be switched on without
 *             changing a single number a customer sees.
 *   on      — aggregates are authoritative.
 *
 * Shadow deliberately returns legacy rather than aggregate values. A shadow mode
 * that quietly served the new numbers would be a rollout wearing a test's name.
 */

/**
 * Resolves the ten aggregate fields for one company.
 *
 * `legacy` is always computed by the caller — it comes from data the dashboard
 * already loaded for its lists, so asking for it costs nothing extra.
 */
export async function selectDashboardAggregates(input: {
  companyId: string;
  legacy: DashboardAggregateFields;
  reference?: Date;
}): Promise<{
  fields: DashboardAggregateFields;
  /** Which path produced `fields`. */
  source: "legacy" | "aggregates";
  /** Populated in shadow mode when the two paths disagree. */
  drift: DashboardAggregateDrift[];
}> {
  const enabled = isDashboardAggregatesEnabled();
  const shadow = isDashboardAggregatesShadowCompareEnabled();

  if (!enabled && !shadow) {
    return { fields: input.legacy, source: "legacy", drift: [] };
  }

  const aggregates = await getCompanyDashboardAggregates(
    input.companyId,
    input.reference ?? new Date(),
  );
  const aggregateFields = toDashboardAggregateFields(aggregates);

  if (shadow) {
    const drift = compareDashboardAggregates(input.legacy, aggregateFields);

    if (drift.length > 0) {
      captureMonitoredEvent({
        event: "dashboard.aggregate_drift",
        level: "warning",
        companyId: input.companyId,
        meta: {
          driftedFields: drift.map((entry) => entry.field),
          detail: drift,
          note:
            "Legacy and SQL aggregate dashboard numbers disagree. Expected on a " +
            "tenant above 1000 invoices, where the legacy path reduces a " +
            "truncated array — the aggregate value is the correct one.",
        },
      });
    }

    // Shadow observes. It does not change what the customer sees.
    return { fields: input.legacy, source: "legacy", drift };
  }

  return { fields: aggregateFields, source: "aggregates", drift: [] };
}
