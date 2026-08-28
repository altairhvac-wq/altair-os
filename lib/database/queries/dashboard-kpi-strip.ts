import "server-only";

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

export function resolveSparklineBucketSize(
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
 * ============================== THE LOADER IS GONE ==============================
 * getDashboardKpiStripData lived here. It loaded listJobs, listInvoicePayments
 * and listEstimates -- three whole books -- and reduced them into the Mission
 * Control v2 KPI strip.
 *
 * Nothing called it. Nothing called buildMissionControlV2KpiStrip either, and
 * no route renders the strip: it was a closed island of three unbounded reads
 * that would have been wrong the moment anything wired it up, because each of
 * those reads is capped at 1,000 rows by PostgREST and says nothing about the
 * rest.
 *
 * The metric BUILDERS below stay, because they are the definition of what the
 * strip's numbers mean and re-deriving them later would be worse than keeping
 * them. Whoever wires the strip up needs a bounded source for them -- an
 * aggregate in the shape of migrations 158 and 169 -- not another fan-out of
 * whole-book reads.
 */
