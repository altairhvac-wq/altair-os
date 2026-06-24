import { ESTIMATE_RECOVERY_THRESHOLD_DAYS } from "@/shared/lib/estimate-recovery";
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
  | "accepted_estimates_scheduling"
  | "new_lead_contact"
  | "lead_estimate_ready"
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
  accepted_estimates_scheduling: 72,
  new_lead_contact: 58,
  stale_sent_estimates: 55,
  lead_estimate_ready: 52,
} as const;

export type OperationalSignalsInput = Pick<
  DashboardData,
  | "access"
  | "money"
  | "operations"
  | "completedWorkAwaitingInvoicing"
  | "acceptedEstimatesNeedingScheduling"
  | "newLeadsNeedingContact"
  | "leadsReadyForEstimate"
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
    dashboardData.access.canViewBilling &&
    dashboardData.acceptedEstimatesNeedingScheduling.count > 0
  ) {
    signals.push({
      id: "accepted_estimates_scheduling",
      category: "dispatch",
      severity:
        dashboardData.acceptedEstimatesNeedingScheduling.count >= 3
          ? "warning"
          : "info",
      count: dashboardData.acceptedEstimatesNeedingScheduling.count,
      priorityScore:
        OPERATIONAL_SIGNAL_PRIORITY_SCORES.accepted_estimates_scheduling,
    });
  }

  if (
    dashboardData.access.canManageCustomers &&
    dashboardData.newLeadsNeedingContact.count > 0
  ) {
    signals.push({
      id: "new_lead_contact",
      category: "lead",
      severity:
        dashboardData.newLeadsNeedingContact.count >= 3 ? "critical" : "warning",
      count: dashboardData.newLeadsNeedingContact.count,
      priorityScore: OPERATIONAL_SIGNAL_PRIORITY_SCORES.new_lead_contact,
    });
  }

  if (
    dashboardData.access.canManageCustomers &&
    dashboardData.leadsReadyForEstimate.count > 0
  ) {
    signals.push({
      id: "lead_estimate_ready",
      category: "lead",
      severity:
        dashboardData.leadsReadyForEstimate.count >= 5 ? "warning" : "info",
      count: dashboardData.leadsReadyForEstimate.count,
      priorityScore: OPERATIONAL_SIGNAL_PRIORITY_SCORES.lead_estimate_ready,
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
  return `${count} sent ${pluralize(count, "estimate")} awaiting follow-up — ${ESTIMATE_RECOVERY_THRESHOLD_DAYS}+ days since sent`;
}

export function formatNewLeadContactSignalDescription(count: number): string {
  if (count === 1) {
    return "New lead waiting for first contact";
  }

  return `${count} new ${pluralize(count, "lead")} waiting for first contact`;
}

export function formatLeadEstimateReadySignalDescription(count: number): string {
  if (count === 1) {
    return "Qualified lead ready for an estimate";
  }

  return `${count} qualified ${pluralize(count, "lead")} need estimates prepared`;
}
