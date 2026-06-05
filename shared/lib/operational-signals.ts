import type { DashboardData } from "@/shared/types/dashboard";

export type OperationalSignalSeverity = "critical" | "warning" | "info";

export type OperationalSignalCategory =
  | "billing"
  | "dispatch"
  | "lead"
  | "operations";

export type OperationalSignalId =
  | "overdue_invoices"
  | "ready_to_invoice"
  | "unassigned_jobs"
  | "lead_follow_up"
  | "stale_sent_estimates";

export type OperationalSignal = {
  id: OperationalSignalId;
  category: OperationalSignalCategory;
  severity: OperationalSignalSeverity;
  count: number;
  priorityScore: number;
};

/** Canonical priority weights shared across Operations Intelligence surfaces. */
export const OPERATIONAL_SIGNAL_PRIORITY_SCORES = {
  overdue_invoices: 100,
  ready_to_invoice: 90,
  unassigned_jobs: 85,
  lead_follow_up: 50,
  stale_sent_estimates: 55,
} as const;

export type OperationalSignalsInput = Pick<
  DashboardData,
  | "access"
  | "money"
  | "operations"
  | "completedWorkAwaitingInvoicing"
  | "leadFollowUp"
>;

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

export function findOperationalSignal(
  signals: OperationalSignal[],
  id: OperationalSignalId,
): OperationalSignal | undefined {
  return signals.find((signal) => signal.id === id);
}

/**
 * Canonical operational signals derived from dashboard snapshot data.
 * Counts only — access gating and presentation live in consuming surfaces.
 */
export function buildOperationalSignals(
  dashboardData: OperationalSignalsInput,
): OperationalSignal[] {
  const signals: OperationalSignal[] = [];

  if (dashboardData.money.overdueCount > 0) {
    signals.push({
      id: "overdue_invoices",
      category: "billing",
      severity:
        dashboardData.money.overdueCount >= 5 ? "critical" : "warning",
      count: dashboardData.money.overdueCount,
      priorityScore: OPERATIONAL_SIGNAL_PRIORITY_SCORES.overdue_invoices,
    });
  }

  if (dashboardData.completedWorkAwaitingInvoicing.count > 0) {
    signals.push({
      id: "ready_to_invoice",
      category: "billing",
      severity:
        dashboardData.completedWorkAwaitingInvoicing.count >= 5
          ? "critical"
          : "warning",
      count: dashboardData.completedWorkAwaitingInvoicing.count,
      priorityScore: OPERATIONAL_SIGNAL_PRIORITY_SCORES.ready_to_invoice,
    });
  }

  if (dashboardData.operations.unassignedToday > 0) {
    signals.push({
      id: "unassigned_jobs",
      category: "dispatch",
      severity:
        dashboardData.operations.unassignedToday >= 3 ? "critical" : "warning",
      count: dashboardData.operations.unassignedToday,
      priorityScore: OPERATIONAL_SIGNAL_PRIORITY_SCORES.unassigned_jobs,
    });
  }

  if (
    dashboardData.access.canManageCustomers &&
    dashboardData.leadFollowUp.count > 0
  ) {
    signals.push({
      id: "lead_follow_up",
      category: "lead",
      severity:
        dashboardData.leadFollowUp.count >= 5 ? "critical" : "warning",
      count: dashboardData.leadFollowUp.count,
      priorityScore: OPERATIONAL_SIGNAL_PRIORITY_SCORES.lead_follow_up,
    });
  }

  if (
    dashboardData.access.canViewBilling &&
    dashboardData.money.staleSentEstimateCount > 0
  ) {
    signals.push({
      id: "stale_sent_estimates",
      category: "billing",
      severity:
        dashboardData.money.staleSentEstimateCount >= 5
          ? "critical"
          : "warning",
      count: dashboardData.money.staleSentEstimateCount,
      priorityScore: OPERATIONAL_SIGNAL_PRIORITY_SCORES.stale_sent_estimates,
    });
  }

  return signals;
}

export function formatStaleSentEstimatesSignalDescription(count: number): string {
  return `${count} sent ${pluralize(count, "estimate")} awaiting customer approval`;
}

export function formatLeadFollowUpSignalDescription(count: number): string {
  return `${count} ${pluralize(count, "lead")} need follow-up today`;
}
