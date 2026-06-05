import type { CompanyAccessScope } from "@/lib/database/access-control";
import { buildDashboardAttentionCards } from "@/shared/lib/dashboard-attention-cards";
import type { CommandStripPanelId } from "@/shared/lib/dashboard-command-strip";
import type { OperationalResolutionQueueType } from "@/shared/lib/operational-resolution-queue";
import {
  DISPATCH_PAGE_UNASSIGNED_HREF,
} from "@/shared/lib/dispatch-page-focus";
import {
  INVOICE_PAGE_DRAFT_HREF,
  INVOICE_PAGE_OVERDUE_HREF,
} from "@/shared/lib/invoice-page-focus";
import type {
  DashboardData,
  DashboardLeadFollowUpPreview,
  DashboardOverdueInvoicePreview,
  DashboardTechnicianStatus,
  DashboardUnsentEstimatePreview,
  DashboardUnsentInvoicePreview,
} from "@/shared/types/dashboard";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";
import type {
  CompletedWorkAwaitingInvoicingEntry,
  CompletedWorkReviewEntry,
  StalledJobEntry,
} from "@/shared/types/reports";

export type MobileActionSeverity = "critical" | "warning" | "info";

export type MobileActionCategory =
  | "critical-operations"
  | "money-actions"
  | "today-operations"
  | "quiet-summary";

export type MobileActionCard = {
  id: string;
  label: string;
  count: number;
  severity: MobileActionSeverity;
  description: string;
  category: MobileActionCategory;
  /** Opens the operational resolution queue when set. */
  queueType?: OperationalResolutionQueueType;
  href?: string;
  panelId?: CommandStripPanelId;
  /** Whether direct fix actions are available in the sheet. */
  canFix: boolean;
};

export type MobileActionSheetData = {
  unassignedJobs: DispatchJob[];
  readyToInvoiceJobs: CompletedWorkAwaitingInvoicingEntry[];
  completedWorkReviewJobs: CompletedWorkReviewEntry[];
  overdueInvoices: DashboardOverdueInvoicePreview[];
  unsentInvoices: DashboardUnsentInvoicePreview[];
  unsentEstimates: DashboardUnsentEstimatePreview[];
  leadFollowUps: DashboardLeadFollowUpPreview[];
  stalledJobs: StalledJobEntry[];
  stalledJobInactivityThresholdDays: number;
  technicians: { id: string; name: string }[];
  assignableTechnicians: Technician[];
  technicianStatuses: DashboardTechnicianStatus[];
  todayJobs: DispatchJob[];
  access: CompanyAccessScope;
};

const SEVERITY_RANK: Record<MobileActionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const CATEGORY_RANK: Record<MobileActionCategory, number> = {
  "critical-operations": 0,
  "money-actions": 1,
  "today-operations": 2,
  "quiet-summary": 3,
};

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

function buildDescription(id: string, count: number): string {
  switch (id) {
    case "unassigned-jobs":
      return `${count} ${pluralize(count, "job")} on today's board need a technician`;
    case "overdue-invoices":
      return `${count} ${pluralize(count, "invoice")} past due — follow up to collect`;
    case "ready-to-invoice":
      return `${count} completed ${pluralize(count, "job")} waiting for an invoice`;
    case "invoices-not-sent":
      return `${count} draft ${pluralize(count, "invoice")} ready to send to customers`;
    case "estimates-not-sent":
      return `${count} draft ${pluralize(count, "estimate")} ready to send to customers`;
    case "needs-review":
      return `${count} ${pluralize(count, "item")} need office review before billing`;
    case "stalled-jobs":
      return `${count} ${pluralize(count, "job")} with no recent activity`;
    case "expense-approvals":
      return `${count} ${pluralize(count, "receipt", "receipts")} waiting for approval`;
    case "lead-follow-up":
      return `${count} ${pluralize(count, "lead")} need follow-up today`;
    case "unread-notifications":
      return `${count} unread ${pluralize(count, "alert")} to review`;
    default:
      return `${count} ${pluralize(count, "item")} need attention`;
  }
}

const PRIMARY_IDS = new Set([
  "unassigned-jobs",
  "overdue-invoices",
  "needs-review",
  "ready-to-invoice",
  "invoices-not-sent",
  "estimates-not-sent",
  "stalled-jobs",
  "expense-approvals",
  "lead-follow-up",
]);

const ATTENTION_CARD_MAP: Record<string, string> = {
  "office-queue": "needs-review",
  invoicing: "overdue-invoices",
  "stalled-jobs": "stalled-jobs",
};

function toSeverity(value: string): MobileActionSeverity {
  if (value === "critical") return "critical";
  if (value === "warning") return "warning";
  return "info";
}

/**
 * Builds priority-ordered mobile action cards from dashboard data already
 * loaded by getDashboardData.
 */
export function buildMobileActionCards(data: DashboardData): MobileActionCard[] {
  const {
    access,
    operations,
    money,
    officeReviewQueue,
    completedWorkAwaitingInvoicing,
    completedWorkReview,
    expenses,
    stalledJobs,
    notifications,
    leadFollowUp,
  } = data;
  const cards: MobileActionCard[] = [];

  if (access.canManageCustomers && leadFollowUp.count > 0) {
    cards.push({
      id: "lead-follow-up",
      label: "Leads",
      count: leadFollowUp.count,
      severity: leadFollowUp.count >= 5 ? "critical" : "warning",
      description: buildDescription("lead-follow-up", leadFollowUp.count),
      category: "critical-operations",
      queueType: "lead_follow_up",
      href: "/leads",
      panelId: "attention",
      canFix: access.canManageCustomers,
    });
  }

  if (operations.unassignedToday > 0) {
    cards.push({
      id: "unassigned-jobs",
      label: "Assign",
      count: operations.unassignedToday,
      severity: operations.unassignedToday >= 3 ? "critical" : "warning",
      description: buildDescription("unassigned-jobs", operations.unassignedToday),
      category: "critical-operations",
      queueType: "unassigned_job",
      href: DISPATCH_PAGE_UNASSIGNED_HREF,
      panelId: access.canViewTechnicianRoster ? "dispatch" : undefined,
      canFix: access.canViewTechnicianRoster,
    });
  }

  if (access.canViewOperationalReports) {
    const officeReviewCount =
      officeReviewQueue.summary.criticalCount +
      officeReviewQueue.summary.needsAttentionCount;
    const needsReview = Math.max(
      officeReviewCount,
      completedWorkReview.count,
    );

    if (needsReview > 0) {
      cards.push({
        id: "needs-review",
        label: "Review",
        count: needsReview,
        severity:
          officeReviewQueue.summary.criticalCount > 0 ? "critical" : "warning",
        description: buildDescription("needs-review", needsReview),
        category: "critical-operations",
        queueType: "needs_review",
        href:
          officeReviewQueue.summary.criticalCount > 0
            ? "/reports?queue=critical"
            : "/reports?queue=attention",
        panelId: "attention",
        canFix: false,
      });
    }
  }

  if (access.canViewOperationalReports && stalledJobs.stalledCount > 0) {
    cards.push({
      id: "stalled-jobs",
      label: "Stalled",
      count: stalledJobs.stalledCount,
      severity: stalledJobs.stalledCount >= 5 ? "critical" : "warning",
      description: buildDescription("stalled-jobs", stalledJobs.stalledCount),
      category: "critical-operations",
      queueType: "stalled_job",
      href: "/reports?queue=stalled",
      panelId: "attention",
      canFix: false,
    });
  }

  if (access.canViewBilling && money.overdueCount > 0) {
    cards.push({
      id: "overdue-invoices",
      label: "Overdue",
      count: money.overdueCount,
      severity: "critical",
      description: buildDescription("overdue-invoices", money.overdueCount),
      category: "money-actions",
      queueType: "overdue_invoice",
      href: INVOICE_PAGE_OVERDUE_HREF,
      panelId: "cash-flow",
      canFix: access.canViewBilling,
    });
  }

  if (
    access.canViewOperationalReports &&
    completedWorkAwaitingInvoicing.count > 0
  ) {
    cards.push({
      id: "ready-to-invoice",
      label: "Invoice",
      count: completedWorkAwaitingInvoicing.count,
      severity:
        completedWorkAwaitingInvoicing.count >= 5 ? "critical" : "warning",
      description: buildDescription(
        "ready-to-invoice",
        completedWorkAwaitingInvoicing.count,
      ),
      category: "money-actions",
      queueType: "ready_to_invoice",
      href: "/reports?queue=invoicing",
      panelId: access.canViewBilling ? "cash-flow" : undefined,
      canFix: access.canViewBilling,
    });
  }

  if (access.canViewBilling && money.unsentInvoiceCount > 0) {
    cards.push({
      id: "invoices-not-sent",
      label: "Send invoices",
      count: money.unsentInvoiceCount,
      severity: money.unsentInvoiceCount >= 5 ? "critical" : "warning",
      description: buildDescription(
        "invoices-not-sent",
        money.unsentInvoiceCount,
      ),
      category: "money-actions",
      queueType: "unsent_invoice",
      href: INVOICE_PAGE_DRAFT_HREF,
      panelId: "cash-flow",
      canFix: access.canViewBilling,
    });
  }

  if (access.canViewBilling && money.unsentEstimateCount > 0) {
    cards.push({
      id: "estimates-not-sent",
      label: "Estimates",
      count: money.unsentEstimateCount,
      severity: money.unsentEstimateCount >= 5 ? "critical" : "warning",
      description: buildDescription(
        "estimates-not-sent",
        money.unsentEstimateCount,
      ),
      category: "money-actions",
      queueType: "unsent_estimate",
      href: "/estimates",
      panelId: "cash-flow",
      canFix: access.canViewBilling,
    });
  }

  if (access.canViewCompanyExpenses && expenses.submittedCount > 0) {
    cards.push({
      id: "expense-approvals",
      label: "Expenses",
      count: expenses.submittedCount,
      severity: "warning",
      description: buildDescription("expense-approvals", expenses.submittedCount),
      category: "quiet-summary",
      href: "/expenses?status=submitted",
      panelId: "billing",
      canFix: false,
    });
  }

  if (access.canViewOperationalReports) {
    const coveredIds = new Set(cards.map((card) => card.id));

    for (const card of buildDashboardAttentionCards(data)) {
      if (card.severity === "healthy") {
        continue;
      }

      const mappedPrimary = ATTENTION_CARD_MAP[card.id];
      if (mappedPrimary && coveredIds.has(mappedPrimary)) {
        continue;
      }

      if (PRIMARY_IDS.has(card.id) || coveredIds.has(card.id)) {
        continue;
      }

      const count = card.count ?? 0;

      cards.push({
        id: card.id,
        label: card.label,
        count: count > 0 ? count : 1,
        severity: toSeverity(card.severity),
        description: buildDescription(card.id, count > 0 ? count : 1),
        category: "quiet-summary",
        href: card.href,
        panelId: "attention",
        canFix: false,
      });
      coveredIds.add(card.id);
    }
  }

  if (notifications.unreadCount > 0) {
    cards.push({
      id: "unread-notifications",
      label: "Alerts",
      count: notifications.unreadCount,
      severity: "info",
      description: buildDescription(
        "unread-notifications",
        notifications.unreadCount,
      ),
      category: "quiet-summary",
      panelId: "attention",
      canFix: false,
    });
  }

  return cards.sort((left, right) => {
    const categoryDiff =
      CATEGORY_RANK[left.category] - CATEGORY_RANK[right.category];
    if (categoryDiff !== 0) {
      return categoryDiff;
    }

    const severityDiff =
      SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
    if (severityDiff !== 0) {
      return severityDiff;
    }

    return right.count - left.count;
  });
}

export function buildMobileActionSheetData(
  data: DashboardData,
): MobileActionSheetData {
  return {
    unassignedJobs: data.operations.unassignedJobs,
    readyToInvoiceJobs: data.completedWorkAwaitingInvoicing.jobs,
    completedWorkReviewJobs: data.completedWorkReview.jobs,
    overdueInvoices: data.money.overdueInvoices,
    unsentInvoices: data.money.unsentInvoices,
    unsentEstimates: data.money.unsentEstimates,
    leadFollowUps: data.leadFollowUp.leads,
    stalledJobs: data.stalledJobs.stalledJobs,
    stalledJobInactivityThresholdDays: data.stalledJobs.inactivityThresholdDays,
    technicians: data.technicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
    })),
    assignableTechnicians: data.assignableTechnicians,
    technicianStatuses: data.technicians,
    todayJobs: data.operations.todayJobs,
    access: data.access,
  };
}

export function getMobileActionCardByQueueType(
  cards: MobileActionCard[],
  queueType: OperationalResolutionQueueType,
): MobileActionCard | undefined {
  return cards.find((card) => card.queueType === queueType);
}
