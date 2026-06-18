import { buildOperationalMomentumSnapshot } from "@/shared/lib/dashboard-operational-momentum";
import { formatTimeInTimeZone } from "@/shared/lib/datetime";
import type { DashboardData } from "@/shared/types/dashboard";
import { formatCurrency } from "@/shared/types/customer";
import { formatExpenseDate } from "@/shared/types/expense";
import {
  formatOperationalActivityDetailsForAccess,
  formatOperationalActivityLabelForAccess,
} from "@/shared/types/operational-activity";
import { getOperationalHealthTrendStyles } from "@/shared/types/operational-health-report";

export type NorthStarPulseMetric = {
  id: string;
  label: string;
  value: string;
  delta: string;
};

export type NorthStarActivityRow = {
  id: string;
  title: string;
  time: string;
};

export type NorthStarMomentumLine = {
  id: string;
  text: string;
};

export type NorthStarSystemDockContent = {
  score: number;
  label: string;
  statusText: string;
  notificationText: string;
};

export type NorthStarSupportingBandsContent = {
  pulseMetrics: NorthStarPulseMetric[];
  activities: NorthStarActivityRow[];
  momentumLines: NorthStarMomentumLine[];
  systemDock: NorthStarSystemDockContent;
};

const ACTIVITY_LIMIT = 5;
const MOMENTUM_LIMIT = 3;

function pluralize(
  count: number,
  singular: string,
  plural = `${singular}s`,
): string {
  return count === 1 ? singular : plural;
}

function buildPulseMetrics(data: DashboardData): NorthStarPulseMetric[] {
  const { access, money, operations, operationalHealth } = data;

  if (access.canViewBilling) {
    const approvedCount = money.approvedEstimates.length;
    const approvedTotal = money.approvedEstimates.reduce(
      (sum, estimate) => sum + estimate.total,
      0,
    );

    return [
      {
        id: "payments-today",
        label: "Payments today",
        value: formatCurrency(money.paymentsTodayTotal),
        delta:
          money.paymentsTodayCount > 0
            ? `${money.paymentsTodayCount} ${pluralize(money.paymentsTodayCount, "payment")} recorded`
            : "No payments yet today",
      },
      {
        id: "unpaid",
        label: "Unpaid",
        value: formatCurrency(money.unpaidTotal),
        delta:
          money.unpaidCount > 0
            ? `${money.unpaidCount} open ${pluralize(money.unpaidCount, "invoice")}`
            : "All caught up",
      },
      {
        id: "overdue",
        label: "Overdue",
        value: formatCurrency(money.overdueTotal),
        delta:
          money.overdueCount > 0
            ? `${money.overdueCount} past due`
            : "Nothing overdue",
      },
      {
        id: "approved-estimates",
        label: "Approved estimates",
        value: String(approvedCount),
        delta:
          approvedCount > 0
            ? `${formatCurrency(approvedTotal)} ready to convert`
            : "None ready to convert",
      },
    ];
  }

  return [
    {
      id: "jobs-today",
      label: "Jobs today",
      value: String(operations.totalJobsToday),
      delta:
        operations.totalJobsToday > 0
          ? `${operations.unassignedToday} unassigned`
          : "Nothing scheduled",
    },
    {
      id: "completed-today",
      label: "Completed",
      value: String(operations.completedToday),
      delta:
        operations.totalJobsToday > 0
          ? `${operations.inProgress} in progress`
          : "No jobs on the board",
    },
    {
      id: "in-motion",
      label: "In motion",
      value: String(operations.dispatched + operations.inProgress),
      delta: `${operations.scheduledToday} scheduled`,
    },
    {
      id: "ops-health",
      label: "Operational health",
      value: String(operationalHealth.operationalHealthScore),
      delta: operationalHealth.operationalHealthLabel,
    },
  ];
}

function buildActivityRows(data: DashboardData): NorthStarActivityRow[] {
  const { recentActivity, access, money } = data;
  const rows: NorthStarActivityRow[] = [];

  for (const activity of recentActivity.slice(0, ACTIVITY_LIMIT)) {
    const label = formatOperationalActivityLabelForAccess(
      activity,
      access.canViewBilling,
    );
    const details = formatOperationalActivityDetailsForAccess(
      activity,
      access.canViewBilling,
    );
    rows.push({
      id: activity.id,
      title: details ? `${label} · ${details}` : label,
      time: formatTimeInTimeZone(activity.createdAt),
    });
  }

  if (rows.length === 0 && access.canViewBilling) {
    for (const payment of money.recentPayments.slice(0, ACTIVITY_LIMIT)) {
      rows.push({
        id: payment.id,
        title: `Payment · ${payment.invoiceNumber} · ${formatCurrency(payment.amount)}`,
        time: formatExpenseDate(payment.paymentDate),
      });
    }
  }

  return rows;
}

function buildMomentumLines(data: DashboardData): NorthStarMomentumLine[] {
  const lines: NorthStarMomentumLine[] = [];
  const momentum = buildOperationalMomentumSnapshot(data);
  const seen = new Set<string>();

  const pushLine = (id: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed || seen.has(trimmed) || lines.length >= MOMENTUM_LIMIT) {
      return;
    }
    seen.add(trimmed);
    lines.push({ id, text: trimmed });
  };

  pushLine("headline", momentum.headline);

  for (const highlight of data.operationalInsights.highlights) {
    pushLine(highlight.id, highlight.message);
  }

  if (lines.length < MOMENTUM_LIMIT) {
    for (const factor of data.operationalHealth.contributingFactors) {
      pushLine(factor.id, factor.detail);
    }
  }

  if (lines.length < MOMENTUM_LIMIT) {
    pushLine("recommended-action", momentum.recommendedAction);
  }

  if (lines.length === 0) {
    return [{ id: "empty", text: "No signal yet — momentum will appear as work moves." }];
  }

  return lines;
}

function buildSystemDock(data: DashboardData): NorthStarSystemDockContent {
  const { operationalHealth, notifications } = data;
  const trend = getOperationalHealthTrendStyles(
    operationalHealth.operationalHealthTrend,
  );

  return {
    score: operationalHealth.operationalHealthScore,
    label: operationalHealth.operationalHealthLabel,
    statusText: `${operationalHealth.operationalHealthLabel} · ${trend.label}`,
    notificationText:
      notifications.unreadCount > 0
        ? `${notifications.unreadCount} unread notification${notifications.unreadCount === 1 ? "" : "s"}`
        : "All caught up",
  };
}

/**
 * Maps existing production dashboard data into North Star supporting band content.
 * Reuses operational momentum and activity formatters — no new queries or scoring.
 */
export function buildNorthStarSupportingBandsContent(
  data: DashboardData,
): NorthStarSupportingBandsContent {
  return {
    pulseMetrics: buildPulseMetrics(data),
    activities: buildActivityRows(data),
    momentumLines: buildMomentumLines(data),
    systemDock: buildSystemDock(data),
  };
}
