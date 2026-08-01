import "server-only";

import { listEstimates } from "@/lib/database/queries/estimates";
import { listInvoicePayments } from "@/lib/database/queries/invoice-payments";
import { listJobs } from "@/lib/database/queries/jobs";
import { getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import {
  averageTicketInBounds,
  estimateCloseRateInBounds,
  formatCurrencyChange,
  formatPercentChange,
  formatRateChange,
  jobCompletedInBounds,
} from "@/shared/lib/reports/report-metrics";
import {
  buildAvgTicketSparkline,
  buildCloseRateSparkline,
  buildJobsCompletedSparkline,
} from "@/shared/lib/reports/sparkline-series";
import { formatPercent } from "@/shared/types/analytics";
import { formatCurrency } from "@/shared/types/customer";
import {
  type ProfitabilityReportDateBounds,
  type ReportChartBucketSize,
} from "@/shared/types/reports";
import type { Estimate } from "@/shared/types/estimate";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import type { Job } from "@/shared/types/job";

export type DashboardKpiStripMetricId =
  | "jobs-completed"
  | "avg-ticket"
  | "close-rate";

export type DashboardKpiStripMetric = {
  id: DashboardKpiStripMetricId;
  label: string;
  value: string;
  comparison: string;
  comparisonPositive: boolean;
  /** Bucket values for the current-month sparkline (daily, or weekly if window is long). */
  sparkline: number[];
};

export type DashboardKpiStripData = {
  currentBounds: ProfitabilityReportDateBounds;
  previousBounds: ProfitabilityReportDateBounds;
  bucketSize: ReportChartBucketSize;
  metrics: DashboardKpiStripMetric[];
};

const LONG_WINDOW_DAY_THRESHOLD = 45;

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

/** Current calendar month through today (company timezone date-only). */
export function resolveCurrentCalendarMonthBounds(
  timeZone: string,
  reference: Date = new Date(),
): ProfitabilityReportDateBounds {
  const today = getDateOnlyInTimeZone(reference, timeZone);
  const [yearStr, monthStr] = today.split("-");
  return {
    startDate: `${yearStr}-${String(monthStr).padStart(2, "0")}-01`,
    endDate: today,
  };
}

/** Full prior calendar month immediately before the current month start. */
export function resolvePriorCalendarMonthBounds(
  currentBounds: ProfitabilityReportDateBounds,
): ProfitabilityReportDateBounds {
  const currentStart = parseDateOnly(currentBounds.startDate);
  const priorEnd = addDays(currentStart, -1);
  const priorStart = new Date(priorEnd.getFullYear(), priorEnd.getMonth(), 1);

  return {
    startDate: toDateOnly(priorStart),
    endDate: toDateOnly(priorEnd),
  };
}

function resolveSparklineBucketSize(
  bounds: ProfitabilityReportDateBounds,
): ReportChartBucketSize {
  const start = parseDateOnly(bounds.startDate).getTime();
  const end = parseDateOnly(bounds.endDate).getTime();
  const dayCount =
    Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;

  return dayCount > LONG_WINDOW_DAY_THRESHOLD ? "week" : "day";
}

function isUpOrFlat(current: number, previous: number): boolean {
  return current >= previous;
}

export function buildDashboardKpiStripFromDatasets(
  jobs: Job[],
  payments: InvoicePayment[],
  estimates: Estimate[],
  currentBounds: ProfitabilityReportDateBounds,
  previousBounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): DashboardKpiStripMetric[] {
  const currentJobs = jobs.filter((job) =>
    jobCompletedInBounds(job, currentBounds),
  ).length;
  const previousJobs = jobs.filter((job) =>
    jobCompletedInBounds(job, previousBounds),
  ).length;

  const currentTicket = averageTicketInBounds(payments, currentBounds);
  const previousTicket = averageTicketInBounds(payments, previousBounds);

  const currentCloseRate = estimateCloseRateInBounds(estimates, currentBounds);
  const previousCloseRate = estimateCloseRateInBounds(
    estimates,
    previousBounds,
  );

  return [
    {
      id: "jobs-completed",
      label: "Jobs completed",
      value: String(currentJobs),
      comparison: formatPercentChange(currentJobs, previousJobs),
      comparisonPositive: isUpOrFlat(currentJobs, previousJobs),
      sparkline: buildJobsCompletedSparkline(jobs, currentBounds, bucketSize),
    },
    {
      id: "avg-ticket",
      label: "Avg. ticket",
      value: currentTicket != null ? formatCurrency(currentTicket) : "$0",
      comparison:
        currentTicket != null && previousTicket != null
          ? formatCurrencyChange(currentTicket, previousTicket)
          : "No payments in this period",
      comparisonPositive:
        currentTicket != null && previousTicket != null
          ? isUpOrFlat(currentTicket, previousTicket)
          : false,
      sparkline: buildAvgTicketSparkline(payments, currentBounds, bucketSize),
    },
    {
      id: "close-rate",
      label: "Estimate close rate",
      value:
        currentCloseRate != null ? formatPercent(currentCloseRate, 0) : "—",
      comparison: formatRateChange(currentCloseRate, previousCloseRate),
      comparisonPositive:
        currentCloseRate != null && previousCloseRate != null
          ? isUpOrFlat(currentCloseRate, previousCloseRate)
          : false,
      sparkline: buildCloseRateSparkline(
        estimates,
        currentBounds,
        bucketSize,
      ),
    },
  ];
}

/**
 * Loads jobs, payments, and estimates once and computes Mission Control KPI-strip
 * metrics for the current and prior calendar months, including sparkline buckets.
 */
export async function getDashboardKpiStripData(
  companyId: string,
  timeZone: string,
  reference: Date = new Date(),
): Promise<DashboardKpiStripData> {
  const currentBounds = resolveCurrentCalendarMonthBounds(timeZone, reference);
  const previousBounds = resolvePriorCalendarMonthBounds(currentBounds);
  const bucketSize = resolveSparklineBucketSize(currentBounds);

  const [jobs, payments, estimates] = await Promise.all([
    listJobs(companyId),
    listInvoicePayments(companyId),
    listEstimates(companyId),
  ]);

  return {
    currentBounds,
    previousBounds,
    bucketSize,
    metrics: buildDashboardKpiStripFromDatasets(
      jobs,
      payments,
      estimates,
      currentBounds,
      previousBounds,
      bucketSize,
    ),
  };
}
