import { INVOICE_PAGE_UNPAID_HREF } from "@/shared/lib/invoice-page-focus";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";

export type DashboardWorkflowStageId =
  | "lead"
  | "quote"
  | "schedule"
  | "execute"
  | "review"
  | "bill"
  | "collect";

export type DashboardWorkflowStageState =
  | "clear"
  | "active"
  | "attention"
  | "critical";

export type DashboardWorkflowStage = {
  id: DashboardWorkflowStageId;
  label: string;
  value: number;
  meta: string;
  href: string;
  state: DashboardWorkflowStageState;
};

function pressureState(
  count: number,
  criticalAt = 5,
): DashboardWorkflowStageState {
  if (count >= criticalAt) {
    return "critical";
  }
  return count > 0 ? "attention" : "clear";
}

/**
 * Projects existing dashboard snapshots onto the verified lead-to-cash workflow.
 * This is a navigation and context layer only; it does not introduce new scoring.
 */
export function buildDashboardWorkflowRail(
  data: DashboardData,
): DashboardWorkflowStage[] {
  const stages: DashboardWorkflowStage[] = [];

  if (data.access.canManageCustomers) {
    const leadPressure = data.leadPipelineSummary.followUpsDue;
    stages.push({
      id: "lead",
      label: "Lead",
      value: leadPressure,
      meta:
        leadPressure > 0
          ? `${leadPressure} follow-up${leadPressure === 1 ? "" : "s"} due`
          : `${data.leadPipelineSummary.totalLeads} in pipeline`,
      href: "/leads",
      state: pressureState(leadPressure, 3),
    });
  }

  if (data.access.canViewBilling) {
    const quotePressure =
      data.leadsReadyForEstimate.count +
      data.money.unsentEstimateCount +
      data.money.staleSentEstimateCount;
    stages.push({
      id: "quote",
      label: "Quote",
      value: quotePressure,
      meta: quotePressure > 0 ? "need movement" : "queue clear",
      href: "/estimates",
      state: pressureState(quotePressure),
    });

    const schedulingPressure = data.acceptedEstimatesNeedingScheduling.count;
    stages.push({
      id: "schedule",
      label: "Schedule",
      value: schedulingPressure,
      meta: schedulingPressure > 0 ? "approved to schedule" : "queue clear",
      href: "/estimates?status=approved",
      state: pressureState(schedulingPressure, 3),
    });
  }

  const executionPressure = data.operations.totalJobsToday;
  stages.push({
    id: "execute",
    label: "Execute",
    value: executionPressure,
    meta:
      data.operations.unassignedToday > 0
        ? `${data.operations.unassignedToday} unassigned`
        : `${data.operations.inProgress} in progress`,
    href: "/dispatch?focus=today",
    state:
      data.operations.unassignedToday > 0
        ? pressureState(data.operations.unassignedToday, 3)
        : executionPressure > 0
          ? "active"
          : "clear",
  });

  if (data.access.canViewOperationalReports) {
    const officeReviewCount =
      data.officeReviewQueue.summary.criticalCount +
      data.officeReviewQueue.summary.needsAttentionCount;
    const reviewPressure = Math.max(
      officeReviewCount,
      data.completedWorkReview.count,
    );
    stages.push({
      id: "review",
      label: "Review",
      value: reviewPressure,
      meta: reviewPressure > 0 ? "need office review" : "queue clear",
      href:
        data.officeReviewQueue.summary.criticalCount > 0
          ? "/reports?queue=critical"
          : "/reports?queue=attention",
      state:
        data.officeReviewQueue.summary.criticalCount > 0
          ? "critical"
          : pressureState(reviewPressure),
    });
  }

  if (data.access.canViewBilling) {
    const billingPressure =
      data.completedWorkAwaitingInvoicing.count + data.money.unsentInvoiceCount;
    stages.push({
      id: "bill",
      label: "Bill",
      value: billingPressure,
      meta: billingPressure > 0 ? "ready or draft" : "queue clear",
      href:
        data.completedWorkAwaitingInvoicing.count > 0
          ? "/reports?queue=invoicing"
          : "/invoices?status=draft",
      state: pressureState(billingPressure),
    });

    stages.push({
      id: "collect",
      label: "Collect",
      value: data.money.unpaidCount,
      meta:
        data.money.unpaidCount > 0
          ? `${formatCurrency(data.money.unpaidTotal)} open`
          : "caught up",
      href: INVOICE_PAGE_UNPAID_HREF,
      state:
        data.money.overdueCount > 0
          ? "critical"
          : pressureState(data.money.unpaidCount),
    });
  }

  return stages;
}
