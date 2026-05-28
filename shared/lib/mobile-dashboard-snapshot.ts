import {
  buildDashboardAttentionCards,
  countDashboardAttentionIssues,
} from "@/shared/lib/dashboard-attention-cards";
import { buildDashboardNextBestActions } from "@/shared/lib/dashboard-next-best-actions";
import {
  DISPATCH_PAGE_TODAY_HREF,
  DISPATCH_PAGE_UNASSIGNED_HREF,
} from "@/shared/lib/dispatch-page-focus";
import {
  INVOICE_PAGE_OVERDUE_HREF,
  INVOICE_PAGE_CASH_FLOW_HREF,
} from "@/shared/lib/invoice-page-focus";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";

export type MobileDashboardSnapshotTone =
  | "neutral"
  | "success"
  | "warning"
  | "critical";

export type MobileDashboardSnapshotItem = {
  id: string;
  label: string;
  value: string | number;
  detail?: string;
  href?: string;
  tone: MobileDashboardSnapshotTone;
};

function resolveAttentionTone(
  data: DashboardData,
  issueCount: number,
): MobileDashboardSnapshotTone {
  if (issueCount === 0) {
    return "success";
  }

  const hasCritical = buildDashboardAttentionCards(data).some(
    (card) => card.severity === "critical",
  );
  return hasCritical ? "critical" : "warning";
}

/**
 * Builds compact snapshot tiles from dashboard data already loaded by getDashboardData.
 */
export function buildMobileDashboardSnapshot(
  data: DashboardData,
): MobileDashboardSnapshotItem[] {
  const { access, operations, money, analytics, operationalHealth } = data;
  const items: MobileDashboardSnapshotItem[] = [];

  items.push({
    id: "jobs-today",
    label: "Jobs today",
    value: operations.totalJobsToday,
    detail:
      operations.totalJobsToday === 0
        ? "Nothing scheduled"
        : `${operations.dispatched + operations.inProgress} in motion`,
    href: DISPATCH_PAGE_TODAY_HREF,
    tone: "neutral",
  });

  items.push({
    id: "unassigned",
    label: "Unassigned",
    value: operations.unassignedToday,
    detail:
      operations.unassignedToday === 0
        ? "Board covered"
        : "Need technician",
    href:
      operations.unassignedToday > 0
        ? DISPATCH_PAGE_UNASSIGNED_HREF
        : DISPATCH_PAGE_TODAY_HREF,
    tone:
      operations.unassignedToday > 0
        ? operations.unassignedToday >= 3
          ? "critical"
          : "warning"
        : "success",
  });

  if (access.canViewBilling) {
    items.push({
      id: "collected-today",
      label: "Collected",
      value: formatCurrency(money.paymentsTodayTotal),
      detail: `${money.paymentsTodayCount} payment${money.paymentsTodayCount === 1 ? "" : "s"}`,
      href: INVOICE_PAGE_CASH_FLOW_HREF,
      tone: money.paymentsTodayTotal > 0 ? "success" : "neutral",
    });
  }

  if (access.canViewBilling) {
    items.push({
      id: "overdue",
      label: "Overdue",
      value: money.overdueCount,
      detail:
        money.overdueCount === 0
          ? "Receivables current"
          : formatCurrency(money.overdueTotal),
      href: money.overdueCount > 0 ? INVOICE_PAGE_OVERDUE_HREF : INVOICE_PAGE_CASH_FLOW_HREF,
      tone:
        money.overdueCount === 0
          ? "success"
          : money.overdueCount >= 3
            ? "critical"
            : "warning",
    });
  }

  if (access.canViewOperationalReports) {
    const attentionCards = buildDashboardAttentionCards(data);
    const attentionCount = countDashboardAttentionIssues(attentionCards);

    items.push({
      id: "needs-attention",
      label: "Attention",
      value: attentionCount,
      detail:
        attentionCount === 0
          ? "All clear"
          : `${attentionCount} area${attentionCount === 1 ? "" : "s"} flagged`,
      href: "/reports",
      tone: resolveAttentionTone(data, attentionCount),
    });

    const pendingActions = buildDashboardNextBestActions(data).length;
    if (pendingActions > 0) {
      items.push({
        id: "next-actions",
        label: "Next up",
        value: pendingActions,
        detail: `${pendingActions} recommended action${pendingActions === 1 ? "" : "s"}`,
        tone: pendingActions >= 3 ? "warning" : "neutral",
      });
    } else {
      items.push({
        id: "health-score",
        label: "Health",
        value: operationalHealth.operationalHealthScore,
        detail: operationalHealth.operationalHealthLabel,
        href: "/reports",
        tone:
          operationalHealth.operationalHealthScore >= 75
            ? "success"
            : operationalHealth.operationalHealthScore >= 50
              ? "warning"
              : "critical",
      });
    }
  }

  return items.slice(0, 6);
}
