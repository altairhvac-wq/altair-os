import type { ReportDailySeries } from "@/shared/lib/reports/chart-series-aggregates";
import type {
  DashboardPerformance,
  DashboardPerformanceMonth,
} from "@/shared/types/dashboard-overview";
import { roundCurrency } from "@/shared/types/invoice";

export const DASHBOARD_PERFORMANCE_MONTHS = 6;

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** YYYY-MM for a YYYY-MM-DD date-only string. */
function monthKeyOf(dateOnly: string): string {
  return dateOnly.slice(0, 7);
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  const index = Number(yearStr) * 12 + (Number(monthStr) - 1) + delta;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function labelOf(yearMonth: string): string {
  return MONTH_LABELS[Number(yearMonth.split("-")[1]) - 1] ?? yearMonth;
}

/**
 * The date bounds to request from the per-day series: the six calendar months
 * ending with the current one, plus the six before them for the comparison.
 */
export function resolvePerformanceWindow(todayDateOnly: string): {
  currentStartMonth: string;
  priorStartMonth: string;
  startDate: string;
  endDate: string;
} {
  const currentMonth = monthKeyOf(todayDateOnly);
  const currentStartMonth = shiftMonth(
    currentMonth,
    -(DASHBOARD_PERFORMANCE_MONTHS - 1),
  );
  const priorStartMonth = shiftMonth(
    currentStartMonth,
    -DASHBOARD_PERFORMANCE_MONTHS,
  );
  return {
    currentStartMonth,
    priorStartMonth,
    startDate: `${priorStartMonth}-01`,
    endDate: todayDateOnly,
  };
}

/**
 * Replays the per-day series into calendar months. Every month in the window
 * is present, so an axis gap means zero rather than "no row came back".
 */
export function buildDashboardPerformance(
  series: Pick<ReportDailySeries, "payments" | "jobs" | "estimates">,
  todayDateOnly: string,
): DashboardPerformance {
  const window = resolvePerformanceWindow(todayDateOnly);
  const currentMonth = monthKeyOf(todayDateOnly);

  const byMonth = new Map<string, DashboardPerformanceMonth>();
  const ensure = (key: string) => {
    let month = byMonth.get(key);
    if (!month) {
      month = {
        key,
        label: labelOf(key),
        collected: 0,
        jobsCompleted: 0,
        estimatesSent: 0,
        estimatesApproved: 0,
      };
      byMonth.set(key, month);
    }
    return month;
  };

  for (const row of series.payments ?? []) {
    const month = ensure(monthKeyOf(String(row.d)));
    month.collected = roundCurrency(month.collected + num(row.amount));
  }
  for (const row of series.jobs ?? []) {
    ensure(monthKeyOf(String(row.d))).jobsCompleted += num(row.completed);
  }
  for (const row of series.estimates ?? []) {
    const month = ensure(monthKeyOf(String(row.d)));
    month.estimatesSent += num(row.sent);
    month.estimatesApproved += num(row.approved);
  }

  const months: DashboardPerformanceMonth[] = [];
  for (let offset = 0; offset < DASHBOARD_PERFORMANCE_MONTHS; offset += 1) {
    months.push(ensure(shiftMonth(window.currentStartMonth, offset)));
  }

  let collectedPriorWindow = 0;
  let jobsCompletedPriorWindow = 0;
  let priorWindowHasRows = false;
  for (let offset = 0; offset < DASHBOARD_PERFORMANCE_MONTHS; offset += 1) {
    const key = shiftMonth(window.priorStartMonth, offset);
    const month = byMonth.get(key);
    if (!month) continue;
    priorWindowHasRows = true;
    collectedPriorWindow = roundCurrency(collectedPriorWindow + month.collected);
    jobsCompletedPriorWindow += month.jobsCompleted;
  }

  const collectedTotal = roundCurrency(
    months.reduce((sum, month) => sum + month.collected, 0),
  );
  const jobsCompletedTotal = months.reduce(
    (sum, month) => sum + month.jobsCompleted,
    0,
  );
  const estimatesSentTotal = months.reduce(
    (sum, month) => sum + month.estimatesSent,
    0,
  );
  const estimatesApprovedTotal = months.reduce(
    (sum, month) => sum + month.estimatesApproved,
    0,
  );

  return {
    months,
    collectedTotal,
    jobsCompletedTotal,
    estimatesSentTotal,
    estimatesApprovedTotal,
    estimateCloseRate:
      estimatesSentTotal > 0
        ? Math.round((estimatesApprovedTotal / estimatesSentTotal) * 100)
        : null,
    collectedPriorMonth:
      byMonth.get(shiftMonth(currentMonth, -1))?.collected ?? 0,
    collectedPriorWindow: priorWindowHasRows ? collectedPriorWindow : null,
    jobsCompletedPriorWindow: priorWindowHasRows
      ? jobsCompletedPriorWindow
      : null,
  };
}
