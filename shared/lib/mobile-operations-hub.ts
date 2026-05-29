import { buildDashboardAttentionCards } from "@/shared/lib/dashboard-attention-cards";
import type { CommandStripPanelId } from "@/shared/lib/dashboard-command-strip";
import {
  DISPATCH_PAGE_UNASSIGNED_HREF,
} from "@/shared/lib/dispatch-page-focus";
import {
  INVOICE_PAGE_OVERDUE_HREF,
} from "@/shared/lib/invoice-page-focus";
import type { DashboardData } from "@/shared/types/dashboard";

export type MobileAttentionSeverity = "critical" | "warning" | "info";

export type MobileAttentionQueueItem = {
  id: string;
  label: string;
  count: number;
  severity: MobileAttentionSeverity;
  href?: string;
  panelId?: CommandStripPanelId;
};

export type MobileHeroIssue = {
  id: string;
  text: string;
};

const SEVERITY_RANK: Record<MobileAttentionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const PRIMARY_QUEUE_IDS = new Set([
  "unassigned-jobs",
  "overdue-invoices",
  "needs-review",
  "ready-to-invoice",
  "stalled-jobs",
  "expense-approvals",
]);

const ATTENTION_CARD_QUEUE_MAP: Record<string, string> = {
  "office-queue": "needs-review",
  invoicing: "overdue-invoices",
  "stalled-jobs": "stalled-jobs",
};

function toAttentionSeverity(
  severity: string,
): MobileAttentionSeverity {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  return "info";
}

/**
 * Builds compact attention-queue rows from dashboard data already loaded by getDashboardData.
 */
export function buildMobileAttentionQueue(
  data: DashboardData,
): MobileAttentionQueueItem[] {
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
  const items: MobileAttentionQueueItem[] = [];

  if (operations.unassignedToday > 0) {
    items.push({
      id: "unassigned-jobs",
      label: "Unassigned jobs",
      count: operations.unassignedToday,
      severity: operations.unassignedToday >= 3 ? "critical" : "warning",
      href: DISPATCH_PAGE_UNASSIGNED_HREF,
      panelId: access.canViewTechnicianRoster ? "dispatch" : undefined,
    });
  }

  if (access.canViewBilling && money.overdueCount > 0) {
    items.push({
      id: "overdue-invoices",
      label: "Overdue invoices",
      count: money.overdueCount,
      severity: "critical",
      href: INVOICE_PAGE_OVERDUE_HREF,
      panelId: "cash-flow",
    });
  }

  if (access.canViewOperationalReports) {
    const needsReview =
      officeReviewQueue.summary.criticalCount +
      officeReviewQueue.summary.needsAttentionCount;

    if (needsReview > 0) {
      items.push({
        id: "needs-review",
        label: "Needs review",
        count: needsReview,
        severity:
          officeReviewQueue.summary.criticalCount > 0 ? "critical" : "warning",
        href:
          officeReviewQueue.summary.criticalCount > 0
            ? "/reports?queue=critical"
            : "/reports?queue=attention",
        panelId: "attention",
      });
    }
  }

  if (
    access.canViewOperationalReports &&
    completedWorkAwaitingInvoicing.count > 0
  ) {
    items.push({
      id: "ready-to-invoice",
      label: "Ready to invoice",
      count: completedWorkAwaitingInvoicing.count,
      severity:
        completedWorkAwaitingInvoicing.count >= 5 ? "critical" : "warning",
      href: "/reports?queue=invoicing",
      panelId: access.canViewBilling ? "cash-flow" : undefined,
    });
  }

  if (access.canViewOperationalReports && stalledJobs.stalledCount > 0) {
    items.push({
      id: "stalled-jobs",
      label: "Stalled jobs",
      count: stalledJobs.stalledCount,
      severity: stalledJobs.stalledCount >= 5 ? "critical" : "warning",
      href: "/reports?queue=stalled",
      panelId: "attention",
    });
  }

  if (access.canViewCompanyExpenses && expenses.submittedCount > 0) {
    items.push({
      id: "expense-approvals",
      label: "Expense approvals",
      count: expenses.submittedCount,
      severity: "warning",
      href: "/expenses?status=submitted",
      panelId: "billing",
    });
  }

  if (access.canViewOperationalReports) {
    const coveredIds = new Set(items.map((item) => item.id));

    for (const card of buildDashboardAttentionCards(data)) {
      if (card.severity === "healthy") {
        continue;
      }

      const mappedPrimary = ATTENTION_CARD_QUEUE_MAP[card.id];
      if (mappedPrimary && coveredIds.has(mappedPrimary)) {
        continue;
      }

      if (PRIMARY_QUEUE_IDS.has(card.id) || coveredIds.has(card.id)) {
        continue;
      }

      const count = card.count ?? 0;

      items.push({
        id: card.id,
        label: card.label,
        count: count > 0 ? count : 1,
        severity: toAttentionSeverity(card.severity),
        href: card.href,
        panelId: "attention",
      });
      coveredIds.add(card.id);
    }
  }

  if (notifications.unreadCount > 0) {
    items.push({
      id: "unread-notifications",
      label: "Unread notifications",
      count: notifications.unreadCount,
      severity: "info",
      panelId: "attention",
    });
  }

  return items.sort(
    (left, right) =>
      SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity],
  );
}

export function buildMobileHeroIssues(
  queue: MobileAttentionQueueItem[],
): MobileHeroIssue[] {
  return queue.slice(0, 2).map((item) => ({
    id: item.id,
    text: `${item.count} ${item.label.toLowerCase()}`,
  }));
}
