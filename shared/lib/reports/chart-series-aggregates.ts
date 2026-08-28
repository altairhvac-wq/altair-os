/**
 * The reports charts and sparklines, built from per-day totals.
 *
 * ============================== THE SHAPE OF THIS FIX ==============================
 * buildReportChartSeriesBundle needs five arrays of domain objects. It uses
 * exactly two things from each: a date and an amount. So rather than move the
 * bucketing into SQL -- which would put the week-start convention, the month
 * convention and the axis label format in a second language -- the database
 * returns one row per DAY and this file replays those days through the SAME
 * accumulator the array path uses.
 *
 * A day is the finest bucket any series uses, so nothing is lost, and the input
 * is bounded by the length of the axis rather than the size of the tenant: at
 * most 366 rows where the old path read 7,857 payments and 12,000 jobs, and
 * silently kept 1,000 of each.
 *
 * ============================== WHY THE SYNTHETIC ROWS ARE SAFE ==============================
 * The functions below hand buildReportChartSeriesBundle one synthetic row per
 * day carrying the day's total. That is only sound because every series it
 * builds is a SUM or a COUNT over rows selected by a date -- addToBucket adds an
 * amount to the bucket a date falls in and does nothing else. There is no
 * per-row branch left to reproduce: the status filters, the completion-date
 * fallback and the closed-labour rule were all applied in SQL, and the three
 * limitation flags that depended on seeing individual rows are returned as
 * booleans rather than re-derived.
 *
 * If a future series needs anything per-row beyond a date and a number, it
 * cannot come through here.
 */

import { buildReportChartSeriesBundle } from "@/shared/lib/reports/chart-series";
import type { Expense } from "@/shared/types/expense";
import type { Invoice } from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import type { TimeEntry } from "@/shared/types/time-entry";
import {
  buildNetIncomeSparklineFromChartSeries,
  sparklineFromChartSeries,
} from "@/shared/lib/reports/sparkline-series";
import type { ReportsPageData } from "@/shared/types/reports-page";
import {
  buildReportChartBuckets,
  resolveReportChartBucketSize,
  resolveReportChartBucketStart,
  type ProfitabilityReportDateBounds,
  type ProfitabilityReportDateRange,
  type ReportChartBucketSize,
  type ReportChartSeriesBundle,
} from "@/shared/types/reports";
import { roundCurrency } from "@/shared/types/invoice";

export type ReportDailySeries = {
  authorized: boolean;
  payments: { d: string; amount: number; count: number }[];
  invoiced: { d: string; amount: number }[];
  openAr: { d: string; amount: number }[];
  overdueAr: { d: string; amount: number }[];
  expenses: { d: string; submitted: number; approved: number }[];
  jobs: { d: string; scheduled: number; completed: number }[];
  labor: { d: string; minutes: number }[];
  estimates: { d: string; sent: number; approved: number }[];
  flags: {
    expenseCreatedDateFallback: boolean;
    jobScheduledCompletionFallback: boolean;
    openLaborExcluded: boolean;
  };
};

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * One synthetic row per day, in the shape the chart builder reads.
 *
 * Statuses are chosen so each row passes the filter its series applies and
 * nothing else: an invoice is 'sent' (active, so it counts toward invoiced) and
 * a job is 'completed'. The day's total is carried in the single field that
 * series reads.
 */
export function buildChartDatasetsFromDailySeries(
  series: ReportDailySeries,
): Parameters<typeof buildReportChartSeriesBundle>[0] {
  const invoicedByDay = new Map(
    series.invoiced.map((row) => [row.d, num(row.amount)]),
  );

  // The invoiced series sums invoice.total; there is no other invoice-derived
  // chart, so one row per day carrying the day's total is enough.
  const invoices = [...invoicedByDay.entries()].map(
    ([day, total]) =>
      ({
        id: `daily-${day}`,
        status: "sent",
        issueDate: day,
        dueDate: day,
        total,
        amountPaid: 0,
        balanceDue: total,
      }) as unknown as Invoice,
  );

  const payments = series.payments.map((row) => ({
    paymentDate: row.d,
    amount: num(row.amount),
  }));

  // Two expense series with different status filters, so a day needs one row
  // per series rather than one row total.
  const expenses: Expense[] = [];
  for (const row of series.expenses) {
    if (num(row.submitted) !== 0) {
      expenses.push({
        id: `daily-submitted-${row.d}`,
        status: "submitted",
        purchaseDate: row.d,
        createdAt: row.d,
        amount: num(row.submitted),
      } as unknown as Expense);
    }
    if (num(row.approved) !== 0) {
      expenses.push({
        id: `daily-approved-${row.d}`,
        status: "approved",
        purchaseDate: row.d,
        createdAt: row.d,
        amount: num(row.approved),
      } as unknown as Expense);
    }
  }

  // Jobs are COUNTED, not summed, so a day with n scheduled jobs needs n rows.
  // The counts are bounded by the tenant's daily volume, which is the one place
  // this representation is not a pure win -- and still orders of magnitude
  // below reading every job.
  //
  // ============================== WHY THE COMPLETED ROWS CARRY NO SCHEDULED DATE ==============================
  // The chart builder walks the job list ONCE and tests each job against both
  // series independently: a job goes into `scheduled` if its scheduledDate is in
  // range, and into `completed` if it is completed and in range. A real
  // completed job usually satisfies both and is counted once in each.
  //
  // The SQL `scheduled` count has no status filter, so it ALREADY includes
  // every completed job whose scheduled date is in range. Giving the synthetic
  // completed rows a scheduled date too would count those jobs a second time --
  // which is exactly what the first version did, and what the differential
  // caught: 13 against a true 8 in the first bucket of a 7-day range.
  //
  // An empty scheduledDate is falsy, so isDateWithinReportBounds returns false
  // and the row contributes only to the completed series. The completed series
  // does not read it either: resolveJobCompletionChartDate prefers completedAt,
  // which is set.
  const jobs: Job[] = [];
  for (const row of series.jobs) {
    for (let i = 0; i < num(row.scheduled); i += 1) {
      jobs.push({
        id: `daily-scheduled-${row.d}-${i}`,
        status: "scheduled",
        scheduledDate: row.d,
      } as unknown as Job);
    }
    for (let i = 0; i < num(row.completed); i += 1) {
      jobs.push({
        id: `daily-completed-${row.d}-${i}`,
        status: "completed",
        scheduledDate: "",
        completedAt: row.d,
      } as unknown as Job);
    }
  }

  const laborEntries = series.labor.map(
    (row) =>
      ({
        id: `daily-labor-${row.d}`,
        entryType: "job_labor",
        startedAt: row.d,
        endedAt: row.d,
        durationMinutes: num(row.minutes),
      }) as unknown as TimeEntry,
  );

  return { invoices, payments, expenses, jobs, laborEntries };
}

/**
 * The chart bundle, with the limitation lines restored from the flags.
 *
 * The synthetic rows cannot trigger those lines themselves: every one of them
 * has a purchase date, a completion timestamp and a duration, because the
 * fallbacks were resolved in SQL. So the sentences are re-attached here, in the
 * same order and with the same wording as the array path.
 */
export function buildReportChartSeriesFromDailySeries(
  series: ReportDailySeries,
  options: { dateRange?: ProfitabilityReportDateRange } = {},
): ReportChartSeriesBundle {
  const bundle = buildReportChartSeriesBundle(
    buildChartDatasetsFromDailySeries(series),
    options,
  );

  const expenseLimitations = series.flags.expenseCreatedDateFallback
    ? ["Expenses without a purchase date use created date for chart bucketing."]
    : [];

  const jobsLimitations = series.flags.jobScheduledCompletionFallback
    ? [
        "Some completed jobs are bucketed by scheduled date when completion timestamp is missing.",
      ]
    : [];

  const laborLimitations = [
    ...(series.flags.openLaborExcluded
      ? ["Open job-labor entries are excluded until closed."]
      : []),
    "Labor hours are bucketed by entry start time.",
  ];

  return {
    ...bundle,
    expenses: { ...bundle.expenses, limitations: expenseLimitations },
    jobs: { ...bundle.jobs, limitations: jobsLimitations },
    labor: { ...bundle.labor, limitations: laborLimitations },
  };
}

// ---------------------------------------------------------------------------
// Sparklines
//
// The KPI and Period Ledger sparklines re-bucket the same rows a second time
// with slightly different rules -- average ticket needs a per-bucket COUNT,
// close rate needs sent and approved separately, outstanding and overdue attach
// current balances to issue and due dates. Each one below buckets the
// corresponding daily series with resolveReportChartBucketStart, which is the
// same function the array versions in sparkline-series.ts call.
// ---------------------------------------------------------------------------

function bucketed<T>(
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
  rows: { d: string }[],
  seed: () => T,
  add: (acc: T, row: never) => void,
): { buckets: { bucketStart: string }[]; totals: Map<string, T> } {
  const buckets = buildReportChartBuckets(bounds, bucketSize);
  const totals = new Map(buckets.map((bucket) => [bucket.bucketStart, seed()]));

  for (const row of rows) {
    if (row.d < bounds.startDate || row.d > bounds.endDate) {
      continue;
    }
    const bucketStart = resolveReportChartBucketStart(row.d, bucketSize);
    const existing = totals.get(bucketStart);
    if (existing === undefined) {
      continue;
    }
    add(existing, row as never);
  }

  return { buckets, totals };
}

export function buildAvgTicketSparklineFromDailySeries(
  series: ReportDailySeries,
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  const { buckets, totals } = bucketed(
    bounds,
    bucketSize,
    series.payments,
    () => ({ sum: 0, count: 0 }),
    (acc: { sum: number; count: number }, row: { amount: number; count: number }) => {
      // Integer cents, for the reason on buildAvgTicketSparkline: this sums a
      // day's total where the array path sums each payment, and the two orders
      // land on different doubles.
      acc.sum += Math.round(num(row.amount) * 100);
      acc.count += num(row.count);
    },
  );

  return buckets.map((bucket) => {
    const entry = totals.get(bucket.bucketStart);
    if (!entry || entry.count === 0) {
      return 0;
    }
    return roundCurrency(entry.sum / 100 / entry.count);
  });
}

export function buildCloseRateSparklineFromDailySeries(
  series: ReportDailySeries,
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  const { buckets, totals } = bucketed(
    bounds,
    bucketSize,
    series.estimates,
    () => ({ sent: 0, approved: 0 }),
    (
      acc: { sent: number; approved: number },
      row: { sent: number; approved: number },
    ) => {
      acc.sent += num(row.sent);
      acc.approved += num(row.approved);
    },
  );

  return buckets.map((bucket) => {
    const entry = totals.get(bucket.bucketStart);
    if (!entry || entry.sent === 0) {
      return 0;
    }
    return Math.round((entry.approved / entry.sent) * 1000) / 10;
  });
}

function amountSparkline(
  rows: { d: string; amount: number }[],
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  const { buckets, totals } = bucketed(
    bounds,
    bucketSize,
    rows,
    () => ({ amount: 0 }),
    (acc: { amount: number }, row: { amount: number }) => {
      acc.amount = roundCurrency(acc.amount + num(row.amount));
    },
  );

  return buckets.map((bucket) => totals.get(bucket.bucketStart)?.amount ?? 0);
}

export function buildOutstandingSparklineFromDailySeries(
  series: ReportDailySeries,
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  return amountSparkline(series.openAr, bounds, bucketSize);
}

export function buildOverdueSparklineFromDailySeries(
  series: ReportDailySeries,
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  return amountSparkline(series.overdueAr, bounds, bucketSize);
}

/**
 * attachReportPageSparklines for the aggregate path.
 *
 * Structurally identical to the array version: the revenue and net-income
 * ledger lines come from the chart series that was already built, and the other
 * four are bucketed from the daily series. Every fallback the array version
 * applies -- collected falling back when the chart series is empty, net income
 * falling back to collected -- is applied here in the same order.
 */
export function attachReportPageSparklinesFromAggregates(
  data: ReportsPageData,
  input: { series: ReportDailySeries; chartSeries: ReportChartSeriesBundle },
): ReportsPageData {
  const bucketSize = resolveReportChartBucketSize(data.dateRange);
  const bounds = data.dateBounds;

  const collectedFromCharts = sparklineFromChartSeries(
    input.chartSeries,
    "revenue",
    "collected",
  );
  const collected =
    collectedFromCharts.length > 0
      ? collectedFromCharts
      : amountSparkline(input.series.payments, bounds, bucketSize);

  const outstanding = buildOutstandingSparklineFromDailySeries(
    input.series,
    bounds,
    bucketSize,
  );

  const netIncome = buildNetIncomeSparklineFromChartSeries(input.chartSeries);

  return {
    ...data,
    kpis: data.kpis.map((metric) => ({
      ...metric,
      sparkline: {
        revenue: collected,
        "average-ticket": buildAvgTicketSparklineFromDailySeries(
          input.series,
          bounds,
          bucketSize,
        ),
        "close-rate": buildCloseRateSparklineFromDailySeries(
          input.series,
          bounds,
          bucketSize,
        ),
        outstanding,
      }[metric.id],
    })),
    accountantSummary: {
      ...data.accountantSummary,
      sparklines: {
        collected,
        outstanding,
        overdue: buildOverdueSparklineFromDailySeries(
          input.series,
          bounds,
          bucketSize,
        ),
        "net-income":
          netIncome.length > 0 ? netIncome : collected.map((amount) => amount),
      },
    },
  };
}
