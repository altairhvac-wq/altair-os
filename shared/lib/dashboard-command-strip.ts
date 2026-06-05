import {
  buildDashboardAttentionCards,
  countDashboardAttentionIssues,
} from "@/shared/lib/dashboard-attention-cards";
import { buildCashFlowCommandSnapshot } from "@/shared/lib/dashboard-cash-flow-command";
import { buildDispatchPressureSnapshot } from "@/shared/lib/dashboard-dispatch-pressure";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";

export type CommandStripPanelId =
  | "attention"
  | "cash-flow"
  | "dispatch"
  | "today"
  | "billing"
  | "health"
  | "next-steps";

export type CommandStripGroupId = "attention" | "today" | "billing" | "health";

export type CommandStripSeverity = "healthy" | "info" | "warning" | "critical";

export type CommandStripCard = {
  id: string;
  group: CommandStripGroupId;
  panelId: CommandStripPanelId;
  label: string;
  value: string | number;
  detail?: string;
  severity: CommandStripSeverity;
};

export type CommandStripGroup = {
  id: CommandStripGroupId;
  label: string;
  cards: CommandStripCard[];
};

/** Visual-only threshold for unpaid billing pressure on the command strip. */
const UNPAID_CRITICAL_TOTAL = 5_000;

function mapSnapshotSeverity(
  severity: "healthy" | "warning" | "critical",
): CommandStripSeverity {
  if (severity === "healthy") {
    return "info";
  }
  return severity;
}

function resolveAttentionSeverity(
  data: DashboardData,
  issueCount: number,
): CommandStripSeverity {
  if (issueCount === 0) {
    return "info";
  }

  const hasCritical = buildDashboardAttentionCards(data).some(
    (card) => card.severity === "critical",
  );
  return hasCritical ? "critical" : "warning";
}

function resolveHealthSeverity(score: number): CommandStripSeverity {
  if (score >= 75) {
    return "info";
  }
  if (score >= 50) {
    return "warning";
  }
  return "critical";
}

function resolveUnpaidSeverity(
  unpaidCount: number,
  unpaidTotal: number,
): CommandStripSeverity {
  if (unpaidCount === 0) {
    return "info";
  }
  if (unpaidTotal >= UNPAID_CRITICAL_TOTAL) {
    return "critical";
  }
  return "warning";
}

/**
 * Builds compact command-strip cards from dashboard data already loaded by
 * getDashboardData — no extra queries.
 */
export function buildDashboardCommandStripGroups(
  data: DashboardData,
): CommandStripGroup[] {
  const { access, operations, money, operationalHealth } = data;
  const groups: CommandStripGroup[] = [];

  if (access.canViewOperationalReports) {
    const attentionCards = buildDashboardAttentionCards(data);
    const issueCount = countDashboardAttentionIssues(attentionCards);
    const attentionCardsList: CommandStripCard[] = [
      {
        id: "attention-summary",
        group: "attention",
        panelId: "attention",
        label: "Needs attention",
        value: issueCount,
        detail:
          issueCount === 0
            ? "0 areas flagged"
            : `${issueCount} area${issueCount === 1 ? "" : "s"} flagged`,
        severity: resolveAttentionSeverity(data, issueCount),
      },
    ];

    if (access.canViewBilling) {
      const cashFlow = buildCashFlowCommandSnapshot(data);
      attentionCardsList.push({
        id: "cash-flow",
        group: "attention",
        panelId: "cash-flow",
        label: "Cash flow",
        value: cashFlow.statusLabel,
        detail: cashFlow.headline,
        severity: mapSnapshotSeverity(cashFlow.severity),
      });
    }

    if (access.canViewTechnicianRoster) {
      const dispatch = buildDispatchPressureSnapshot(data);
      attentionCardsList.push({
        id: "dispatch-pressure",
        group: "attention",
        panelId: "dispatch",
        label: "Dispatch",
        value: dispatch.statusLabel,
        detail: dispatch.headline,
        severity: mapSnapshotSeverity(dispatch.severity),
      });
    }

    attentionCardsList.push({
      id: "health-score",
      group: "attention",
      panelId: "health",
      label: "Health score",
      value: operationalHealth.operationalHealthScore,
      detail: operationalHealth.operationalHealthLabel,
      severity: resolveHealthSeverity(operationalHealth.operationalHealthScore),
    });

    groups.push({
      id: "attention",
      label: "Attention and health",
      cards: attentionCardsList,
    });
  }

  const inMotion = operations.dispatched + operations.inProgress;
  const todayCards: CommandStripCard[] = [
    {
      id: "jobs-today",
      group: "today",
      panelId: "today",
      label: "Jobs today",
      value: operations.totalJobsToday,
      detail:
        operations.totalJobsToday === 0
          ? "Nothing scheduled"
          : `${inMotion} in motion`,
      severity: "info",
    },
    {
      id: "unassigned",
      group: "today",
      panelId: "today",
      label: "Unassigned",
      value: operations.unassignedToday,
      detail:
        operations.unassignedToday === 0
          ? "Board covered"
          : "Need technician",
      severity:
        operations.unassignedToday === 0
          ? "info"
          : operations.unassignedToday >= 3
            ? "critical"
            : "warning",
    },
    {
      id: "in-progress",
      group: "today",
      panelId: "today",
      label: "In progress",
      value: operations.inProgress,
      detail: `${operations.dispatched} en route`,
      severity: operations.inProgress > 0 ? "warning" : "info",
    },
    {
      id: "completed-today",
      group: "today",
      panelId: "today",
      label: "Completed",
      value: operations.completedToday,
      detail: `${operations.scheduledToday} still scheduled`,
      severity: "info",
    },
  ];

  groups.push({
    id: "today",
    label: "Today's work",
    cards: todayCards,
  });

  if (access.canViewBilling) {
    const cashFlow = buildCashFlowCommandSnapshot(data);
    groups.push({
      id: "billing",
      label: "Revenue and billing",
      cards: [
        {
          id: "overdue",
          group: "billing",
          panelId: "billing",
          label: "Overdue",
          value: money.overdueCount,
          detail:
            money.overdueCount === 0
              ? "Receivables current"
              : formatCurrency(money.overdueTotal),
          severity:
            money.overdueCount === 0
              ? "info"
              : money.overdueCount >= 3
                ? "critical"
                : "warning",
        },
        {
          id: "unpaid",
          group: "billing",
          panelId: "billing",
          label: "Unpaid",
          value: formatCurrency(money.unpaidTotal),
          detail: `${money.unpaidCount} open invoice${money.unpaidCount === 1 ? "" : "s"}`,
          severity: resolveUnpaidSeverity(money.unpaidCount, money.unpaidTotal),
        },
        {
          id: "collected-today",
          group: "billing",
          panelId: "billing",
          label: "Collected",
          value: formatCurrency(money.paymentsTodayTotal),
          detail: `${money.paymentsTodayCount} payment${money.paymentsTodayCount === 1 ? "" : "s"} today`,
          severity: "info",
        },
        {
          id: "ready-to-invoice",
          group: "billing",
          panelId: "cash-flow",
          label: "Ready to invoice",
          value: cashFlow.metrics.awaitingInvoicing,
          detail:
            cashFlow.metrics.awaitingInvoicing === 0
              ? "No unbilled completions"
              : "Completed jobs waiting",
          severity:
            cashFlow.metrics.awaitingInvoicing >= 5
              ? "critical"
              : cashFlow.metrics.awaitingInvoicing > 0
                ? "warning"
                : "info",
        },
      ],
    });
  } else if (access.canViewCompanyExpenses) {
    groups.push({
      id: "billing",
      label: "Expenses",
      cards: [
        {
          id: "pending-expenses",
          group: "billing",
          panelId: "billing",
          label: "Pending approval",
          value: data.expenses.submittedCount,
          detail: formatCurrency(data.expenses.submittedTotal),
          severity: data.expenses.submittedCount > 0 ? "warning" : "info",
        },
      ],
    });
  }

  return groups.filter((group) => group.cards.length > 0);
}

export const COMMAND_STRIP_PANEL_LABELS: Record<CommandStripPanelId, string> = {
  attention: "Priority attention",
  "cash-flow": "Cash flow command",
  dispatch: "Dispatch pressure",
  today: "Today's work",
  billing: "Revenue and billing",
  health: "Operational health",
  "next-steps": "Next steps and activity",
};
