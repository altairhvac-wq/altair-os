import "server-only";

import { captureMonitoredEvent } from "@/lib/operations/monitoring";
import {
  getCompanyDashboardAggregatesResult,
  isDashboardAggregatesEnabled,
  isDashboardAggregatesShadowCompareEnabled,
} from "@/lib/database/queries/dashboard-aggregates";
import {
  compareDashboardAggregates,
  toDashboardAggregateFields,
  type DashboardAggregateDrift,
  type DashboardAggregateFields,
} from "@/lib/database/services/dashboard-aggregate-fields";
import {
  buildShadowReport,
  buildUnavailableReport,
  describeShadowVerdict,
  type ShadowReport,
} from "@/lib/database/services/dashboard-shadow-report";

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
 *   off     — legacy only.
 *   shadow  — compute both, classify any disagreement, RETURN THE LEGACY VALUES.
 *             This is the verification mode: it can be switched on without
 *             changing a single number a customer sees.
 *   on      — aggregates are authoritative.
 *
 * Shadow deliberately returns legacy rather than aggregate values. A shadow mode
 * that quietly served the new numbers would be a rollout wearing a test's name.
 *
 * ============================== WHAT SHADOW REPORTS, AND WHAT IT WILL NOT ==============================
 * Three things were wrong with the first version of this reporting, and all
 * three would have been read as reassurance:
 *
 *   1. A FAILED RPC returns zeros by design. Those zeros were compared against
 *      the legacy numbers and reported as drift, annotated "the aggregate value
 *      is the correct one" — so a missing migration or a revoked EXECUTE looked
 *      like proof the new path was working. Failure is now its own outcome and
 *      can never be reported as drift.
 *
 *   2. The payload carried legacy and aggregate VALUES, which for three of the
 *      ten fields are a company's receivables. `redactMeta` redacts by key name
 *      and none of those names look sensitive, so it shipped. Nothing here
 *      emits a value now — only field names, directions and a bucket.
 *
 *   3. "They disagree" is not a finding. dashboard-shadow-report.ts classifies
 *      the disagreement against the truncation signature — legacy understated,
 *      on a tenant actually large enough to truncate — so a defect cannot be
 *      waved through as expected drift.
 */

/**
 * Every shadow outcome, on one greppable line, with no values on it.
 *
 * ============================== WHY THE LOG AND NOT JUST THE MONITOR ==============================
 * Two reasons, and the second is the one that mattered.
 *
 * Silence is ambiguous. With the monitor as the only channel, "no drift
 * reported" and "shadow was never active" look identical, and a verification
 * run cannot conclude anything from either. One dashboard render now produces
 * one line that says which.
 *
 * And the monitor is not always there. `captureMonitoredEvent` is a no-op
 * without SENTRY_DSN — which is every local run, every CI run, and the scratch
 * project the equality gate is proven on. A verification that can only be
 * observed where the vendor is configured cannot be rehearsed before it is
 * relied on.
 *
 * The line carries a verdict, two booleans, field NAMES and a bucket. Three of
 * the ten fields are a company's receivables and none of them appear.
 */
function logShadowVerdict(report: ShadowReport, errorCode?: string): void {
  const parts = [
    `verdict=${report.verdict}`,
    `truncationPossible=${report.truncationPossible}`,
  ];

  if (report.driftedFields.length > 0) {
    parts.push(`driftedFields=${report.driftedFields.join(",")}`);
    parts.push(`magnitude=${report.magnitude}`);
  }
  if (report.tablesAboveCeiling.length > 0) {
    parts.push(`tablesAboveCeiling=${report.tablesAboveCeiling.join(",")}`);
  }
  if (errorCode) {
    parts.push(`errorCode=${errorCode}`);
  }

  const line = `[dashboard.aggregate_shadow] ${parts.join(" ")}`;

  // A defect and a failed RPC are not informational. They are the two outcomes
  // that stop a rollout.
  if (report.verdict === "defect" || report.verdict === "unavailable") {
    console.error(line);
  } else {
    console.info(line);
  }
}

export type DashboardAggregateSelection = {
  fields: DashboardAggregateFields;
  /** Which path produced `fields`. */
  source: "legacy" | "aggregates";
  /** Populated in shadow mode when the two paths disagree. */
  drift: DashboardAggregateDrift[];
  /** Present in shadow mode. The classified outcome, safe to log. */
  report?: ShadowReport;
};

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
}): Promise<DashboardAggregateSelection> {
  const enabled = isDashboardAggregatesEnabled();
  const shadow = isDashboardAggregatesShadowCompareEnabled();

  if (!enabled && !shadow) {
    return { fields: input.legacy, source: "legacy", drift: [] };
  }

  const result = await getCompanyDashboardAggregatesResult(
    input.companyId,
    input.reference ?? new Date(),
  );

  if (!shadow) {
    // In "on" mode a failed RPC yields zeros, which is the documented
    // degrade-one-panel behaviour and is already reported as an error event by
    // the query layer.
    return {
      fields: toDashboardAggregateFields(result.aggregates),
      source: "aggregates",
      drift: [],
    };
  }

  // ---------------------------------------------------------------------
  // Shadow. Observes, classifies, and changes nothing the customer sees.
  // ---------------------------------------------------------------------
  if (!result.ok) {
    const report = buildUnavailableReport();
    logShadowVerdict(report, result.errorCode);
    captureMonitoredEvent({
      event: "dashboard.aggregate_shadow_unavailable",
      level: "error",
      companyId: input.companyId,
      meta: {
        verdict: report.verdict,
        errorCode: result.errorCode ?? null,
        note: describeShadowVerdict(report),
      },
    });
    return { fields: input.legacy, source: "legacy", drift: [], report };
  }

  const aggregateFields = toDashboardAggregateFields(result.aggregates);
  const drift = compareDashboardAggregates(input.legacy, aggregateFields);
  const report = buildShadowReport({
    drift,
    scale: {
      invoices: result.aggregates.invoices.totalActiveCount,
      estimates: result.aggregates.estimates.totalActiveCount,
      expenses: result.aggregates.expenses.totalActiveCount,
    },
  });

  logShadowVerdict(report);

  if (report.verdict === "agree") {
    return { fields: input.legacy, source: "legacy", drift, report };
  }

  captureMonitoredEvent({
    event:
      report.verdict === "truncation"
        ? "dashboard.aggregate_drift_truncation"
        : "dashboard.aggregate_drift_defect",
    // A defect is not a warning. Truncation on a large tenant is expected and
    // is exactly what the rollout is meant to fix.
    level: report.verdict === "defect" ? "error" : "warning",
    companyId: input.companyId,
    meta: {
      verdict: report.verdict,
      // Names, directions and a bucket. No legacy value, no aggregate value,
      // no difference — three of these fields are money.
      driftedFields: report.driftedFields,
      directions: report.directions,
      magnitude: report.magnitude,
      truncationPossible: report.truncationPossible,
      tablesAboveCeiling: report.tablesAboveCeiling,
      note: describeShadowVerdict(report),
    },
  });

  // Shadow observes. It does not change what the customer sees.
  return { fields: input.legacy, source: "legacy", drift, report };
}
