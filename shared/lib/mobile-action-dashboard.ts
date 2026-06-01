import type { CompanyAccessScope } from "@/lib/database/access-control";
import { buildDashboardAttentionCards } from "@/shared/lib/dashboard-attention-cards";
import type { CommandStripPanelId } from "@/shared/lib/dashboard-command-strip";
import {
  DISPATCH_PAGE_UNASSIGNED_HREF,
} from "@/shared/lib/dispatch-page-focus";
import {
  INVOICE_PAGE_OVERDUE_HREF,
} from "@/shared/lib/invoice-page-focus";
import type {
  DashboardData,
  DashboardOverdueInvoicePreview,
} from "@/shared/types/dashboard";
import type { DispatchJob } from "@/shared/types/dispatch";
import type { CompletedWorkAwaitingInvoicingEntry } from "@/shared/types/reports";

export type MobileActionSeverity = "critical" | "warning" | "info";

export type MobileActionCategory =
  | "critical-operations"
  | "money-actions"
  | "today-operations"
  | "quiet-summary";

/** Action types with dedicated mobile sheet content. */
export type MobileActionSheetType =
  | "unassigned-jobs"
  | "ready-to-invoice"
  | "overdue-invoices";

export type MobileActionCard = {
  id: string;
  label: string;
  count: number;
  severity: MobileActionSeverity;
  description: string;
  category: MobileActionCategory;
  /** Opens a mobile action sheet when set. */
  sheetType?: MobileActionSheetType;
  href?: string;
  panelId?: CommandStripPanelId;
  /** Whether direct fix actions are available in the sheet. */
  canFix: boolean;
};

export type MobileActionSheetData = {
  unassignedJobs: DispatchJob[];
  readyToInvoiceJobs: CompletedWorkAwaitingInvoicingEntry[];
  overdueInvoices: DashboardOverdueInvoicePreview[];
  technicians: { id: string; name: string }[];
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
    case "needs-review":
      return `${count} ${pluralize(count, "item")} need office review before billing`;
    case "stalled-jobs":
      return `${count} ${pluralize(count, "job")} with no recent activity`;
    case "expense-approvals":
      return `${count} ${pluralize(count, "receipt", "receipts")} waiting for approval`;
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
  "stalled-jobs",
  "expense-approvals",
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
    expenses,
    stalledJobs,
    notifications,
  } = data;
  const cards: MobileActionCard[] = [];

  if (operations.unassignedToday > 0) {
    cards.push({
      id: "unassigned-jobs",
      label: "Unassigned jobs",
      count: operations.unassignedToday,
      severity: operations.unassignedToday >= 3 ? "critical" : "warning",
      description: buildDescription("unassigned-jobs", operations.unassignedToday),
      category: "critical-operations",
      sheetType: "unassigned-jobs",
      href: DISPATCH_PAGE_UNASSIGNED_HREF,
      panelId: access.canViewTechnicianRoster ? "dispatch" : undefined,
      canFix: access.canViewTechnicianRoster,
    });
  }

  if (access.canViewOperationalReports) {
    const needsReview =
      officeReviewQueue.summary.criticalCount +
      officeReviewQueue.summary.needsAttentionCount;

    if (needsReview > 0) {
      cards.push({
        id: "needs-review",
        label: "Needs review",
        count: needsReview,
        severity:
          officeReviewQueue.summary.criticalCount > 0 ? "critical" : "warning",
        description: buildDescription("needs-review", needsReview),
        category: "critical-operations",
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
      label: "Stalled jobs",
      count: stalledJobs.stalledCount,
      severity: stalledJobs.stalledCount >= 5 ? "critical" : "warning",
      description: buildDescription("stalled-jobs", stalledJobs.stalledCount),
      category: "critical-operations",
      href: "/reports?queue=stalled",
      panelId: "attention",
      canFix: false,
    });
  }

  if (access.canViewBilling && money.overdueCount > 0) {
    cards.push({
      id: "overdue-invoices",
      label: "Overdue invoices",
      count: money.overdueCount,
      severity: "critical",
      description: buildDescription("overdue-invoices", money.overdueCount),
      category: "money-actions",
      sheetType: "overdue-invoices",
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
      label: "Ready to invoice",
      count: completedWorkAwaitingInvoicing.count,
      severity:
        completedWorkAwaitingInvoicing.count >= 5 ? "critical" : "warning",
      description: buildDescription(
        "ready-to-invoice",
        completedWorkAwaitingInvoicing.count,
      ),
      category: "money-actions",
      sheetType: "ready-to-invoice",
      href: "/reports?queue=invoicing",
      panelId: access.canViewBilling ? "cash-flow" : undefined,
      canFix: access.canViewBilling,
    });
  }

  if (access.canViewCompanyExpenses && expenses.submittedCount > 0) {
    cards.push({
      id: "expense-approvals",
      label: "Expense approvals",
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
      label: "Unread notifications",
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
    overdueInvoices: data.money.overdueInvoices,
    technicians: data.technicians.map((tech) => ({
      id: tech.id,
      name: tech.name,
    })),
    access: data.access,
  };
}

export function getMobileActionCardBySheetType(
  cards: MobileActionCard[],
  sheetType: MobileActionSheetType,
): MobileActionCard | undefined {
  return cards.find((card) => card.sheetType === sheetType);
}
