import {
  jobCompletedInBounds,
  resolveEstimateApprovedReportDate,
  resolveEstimateSentReportDate,
  resolveJobCompletedReportDate,
} from "@/shared/lib/reports/report-metrics";
import { isActiveInvoice, roundCurrency, type Invoice } from "@/shared/types/invoice";
import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import type { Job } from "@/shared/types/job";
import {
  buildReportChartBuckets,
  isDateWithinReportBounds,
  resolveReportChartBucketSize,
  resolveReportChartBucketStart,
  toReportDateOnly,
  type ProfitabilityReportDateBounds,
  type ReportChartBucketSize,
  type ReportChartSeriesBundle,
} from "@/shared/types/reports";
import type {
  AccountantSummaryData,
  ReportKpiMetric,
  ReportsPageData,
} from "@/shared/types/reports-page";

/** Point values from an existing report chart series (Reports date-range buckets). */
export function sparklineFromChartSeries(
  chartSeries: ReportChartSeriesBundle,
  chartId: keyof Pick<
    ReportChartSeriesBundle,
    "revenue" | "expenses" | "jobs" | "labor"
  >,
  seriesKey: string,
): number[] {
  const series = chartSeries[chartId].series.find(
    (entry) => entry.key === seriesKey,
  );
  return series?.points.map((point) => point.value) ?? [];
}

export function buildCollectedRevenueSparkline(
  payments: InvoicePayment[],
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  const buckets = buildReportChartBuckets(bounds, bucketSize);
  const totals = new Map(buckets.map((bucket) => [bucket.bucketStart, 0]));

  for (const payment of payments) {
    if (
      !payment.paymentDate ||
      toReportDateOnly(payment.paymentDate) < bounds.startDate ||
      toReportDateOnly(payment.paymentDate) > bounds.endDate
    ) {
      continue;
    }

    const bucketStart = resolveReportChartBucketStart(
      toReportDateOnly(payment.paymentDate),
      bucketSize,
    );
    if (totals.has(bucketStart)) {
      totals.set(
        bucketStart,
        roundCurrency((totals.get(bucketStart) ?? 0) + payment.amount),
      );
    }
  }

  return buckets.map((bucket) => totals.get(bucket.bucketStart) ?? 0);
}

export function buildJobsCompletedSparkline(
  jobs: Job[],
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  const buckets = buildReportChartBuckets(bounds, bucketSize);
  const counts = new Map(buckets.map((bucket) => [bucket.bucketStart, 0]));

  for (const job of jobs) {
    if (!jobCompletedInBounds(job, bounds)) {
      continue;
    }

    const completedDate = resolveJobCompletedReportDate(job);
    if (!completedDate) {
      continue;
    }

    const bucketStart = resolveReportChartBucketStart(
      toReportDateOnly(completedDate),
      bucketSize,
    );
    if (counts.has(bucketStart)) {
      counts.set(bucketStart, (counts.get(bucketStart) ?? 0) + 1);
    }
  }

  return buckets.map((bucket) => counts.get(bucket.bucketStart) ?? 0);
}

/**
 * Average payment per bucket.
 *
 * ============================== WHY CENTS ==============================
 * The sum here used to accumulate dollars as IEEE doubles. That is fine for a
 * single implementation and not fine for two: the aggregate path sums each
 * DAY's total (already summed exactly in Postgres) while this one sums each
 * PAYMENT, and adding the same money in a different order lands on a different
 * double. On a 90-day range over 7,600 payments the two means differed by one
 * cent -- $2,098.06 against $2,098.07 -- which verify-reports-live caught.
 *
 * Payment amounts are two-decimal, so their cent values are exact integers, and
 * a day's total is the exact sum of its payments' cents. Accumulating integers
 * makes the two paths agree by construction rather than by luck, and removes a
 * class of intermittent verifier failure that would otherwise appear whenever
 * the fixture changed.
 */
export function buildAvgTicketSparkline(
  payments: InvoicePayment[],
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  const buckets = buildReportChartBuckets(bounds, bucketSize);
  const totals = new Map(
    buckets.map((bucket) => [bucket.bucketStart, { sum: 0, count: 0 }]),
  );

  for (const payment of payments) {
    if (
      !payment.paymentDate ||
      toReportDateOnly(payment.paymentDate) < bounds.startDate ||
      toReportDateOnly(payment.paymentDate) > bounds.endDate
    ) {
      continue;
    }

    const bucketStart = resolveReportChartBucketStart(
      toReportDateOnly(payment.paymentDate),
      bucketSize,
    );
    const existing = totals.get(bucketStart);
    if (!existing) {
      continue;
    }

    existing.sum += Math.round(payment.amount * 100);
    existing.count += 1;
  }

  return buckets.map((bucket) => {
    const entry = totals.get(bucket.bucketStart);
    if (!entry || entry.count === 0) {
      return 0;
    }
    return roundCurrency(entry.sum / 100 / entry.count);
  });
}

export function buildCloseRateSparkline(
  estimates: Estimate[],
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  const buckets = buildReportChartBuckets(bounds, bucketSize);
  const totals = new Map(
    buckets.map((bucket) => [bucket.bucketStart, { sent: 0, approved: 0 }]),
  );

  for (const estimate of estimates) {
    const sentDate = resolveEstimateSentReportDate(estimate);
    if (
      sentDate &&
      toReportDateOnly(sentDate) >= bounds.startDate &&
      toReportDateOnly(sentDate) <= bounds.endDate
    ) {
      const bucketStart = resolveReportChartBucketStart(
        toReportDateOnly(sentDate),
        bucketSize,
      );
      const existing = totals.get(bucketStart);
      if (existing) {
        existing.sent += 1;
      }
    }

    const approvedDate = resolveEstimateApprovedReportDate(estimate);
    if (
      approvedDate &&
      toReportDateOnly(approvedDate) >= bounds.startDate &&
      toReportDateOnly(approvedDate) <= bounds.endDate
    ) {
      const bucketStart = resolveReportChartBucketStart(
        toReportDateOnly(approvedDate),
        bucketSize,
      );
      const existing = totals.get(bucketStart);
      if (existing) {
        existing.approved += 1;
      }
    }
  }

  return buckets.map((bucket) => {
    const entry = totals.get(bucket.bucketStart);
    if (!entry || entry.sent === 0) {
      return 0;
    }
    return Math.round((entry.approved / entry.sent) * 1000) / 10;
  });
}

/** Open AR attributed to invoice issue-date buckets (current balances). */
export function buildOutstandingSparkline(
  invoices: Invoice[],
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  const buckets = buildReportChartBuckets(bounds, bucketSize);
  const totals = new Map(buckets.map((bucket) => [bucket.bucketStart, 0]));

  for (const invoice of invoices) {
    if (!isActiveInvoice(invoice) || invoice.balanceDue <= 0) {
      continue;
    }
    if (!isDateWithinReportBounds(invoice.issueDate, bounds)) {
      continue;
    }

    const bucketStart = resolveReportChartBucketStart(
      toReportDateOnly(invoice.issueDate),
      bucketSize,
    );
    if (totals.has(bucketStart)) {
      totals.set(
        bucketStart,
        roundCurrency((totals.get(bucketStart) ?? 0) + invoice.balanceDue),
      );
    }
  }

  return buckets.map((bucket) => totals.get(bucket.bucketStart) ?? 0);
}

/** Overdue AR attributed to due-date buckets (current overdue balances). */
export function buildOverdueSparkline(
  invoices: Invoice[],
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  const buckets = buildReportChartBuckets(bounds, bucketSize);
  const totals = new Map(buckets.map((bucket) => [bucket.bucketStart, 0]));

  for (const invoice of invoices) {
    if (
      !isActiveInvoice(invoice) ||
      invoice.status !== "overdue" ||
      invoice.balanceDue <= 0
    ) {
      continue;
    }

    const dateValue = invoice.dueDate || invoice.issueDate;
    if (!isDateWithinReportBounds(dateValue, bounds)) {
      continue;
    }

    const bucketStart = resolveReportChartBucketStart(
      toReportDateOnly(dateValue),
      bucketSize,
    );
    if (totals.has(bucketStart)) {
      totals.set(
        bucketStart,
        roundCurrency((totals.get(bucketStart) ?? 0) + invoice.balanceDue),
      );
    }
  }

  return buckets.map((bucket) => totals.get(bucket.bucketStart) ?? 0);
}

/**
 * Net income est. per bucket = collected − approved/reimbursed expenses.
 * Uses existing Reports chart series buckets when available.
 */
export function buildNetIncomeSparklineFromChartSeries(
  chartSeries: ReportChartSeriesBundle,
): number[] {
  const collected = sparklineFromChartSeries(chartSeries, "revenue", "collected");
  const expenses = sparklineFromChartSeries(
    chartSeries,
    "expenses",
    "approved-reimbursed",
  );

  if (collected.length === 0) {
    return [];
  }

  return collected.map((amount, index) =>
    roundCurrency(amount - (expenses[index] ?? 0)),
  );
}

export function buildNetIncomeSparkline(
  payments: InvoicePayment[],
  expenses: Expense[],
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): number[] {
  const collected = buildCollectedRevenueSparkline(payments, bounds, bucketSize);
  const buckets = buildReportChartBuckets(bounds, bucketSize);
  const expenseTotals = new Map(
    buckets.map((bucket) => [bucket.bucketStart, 0]),
  );

  for (const expense of expenses) {
    if (expense.status !== "approved" && expense.status !== "reimbursed") {
      continue;
    }

    const reportDate = expense.purchaseDate ?? expense.createdAt;
    if (!isDateWithinReportBounds(reportDate, bounds)) {
      continue;
    }

    const bucketStart = resolveReportChartBucketStart(
      toReportDateOnly(reportDate),
      bucketSize,
    );
    if (expenseTotals.has(bucketStart)) {
      expenseTotals.set(
        bucketStart,
        roundCurrency(
          (expenseTotals.get(bucketStart) ?? 0) + (expense.amount ?? 0),
        ),
      );
    }
  }

  return collected.map((amount, index) => {
    const bucketStart = buckets[index]?.bucketStart;
    const expenseAmount = bucketStart
      ? (expenseTotals.get(bucketStart) ?? 0)
      : 0;
    return roundCurrency(amount - expenseAmount);
  });
}

export type ReportSparklineDatasets = {
  payments: InvoicePayment[];
  estimates: Estimate[];
  invoices: Invoice[];
  chartSeries: ReportChartSeriesBundle;
};

function withKpiSparklines(
  kpis: ReportKpiMetric[],
  datasets: ReportSparklineDatasets,
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): ReportKpiMetric[] {
  const collectedFromCharts = sparklineFromChartSeries(
    datasets.chartSeries,
    "revenue",
    "collected",
  );
  const revenueSparkline =
    collectedFromCharts.length > 0
      ? collectedFromCharts
      : buildCollectedRevenueSparkline(datasets.payments, bounds, bucketSize);

  const sparklines: Record<ReportKpiMetric["id"], number[]> = {
    revenue: revenueSparkline,
    "average-ticket": buildAvgTicketSparkline(
      datasets.payments,
      bounds,
      bucketSize,
    ),
    "close-rate": buildCloseRateSparkline(
      datasets.estimates,
      bounds,
      bucketSize,
    ),
    outstanding: buildOutstandingSparkline(
      datasets.invoices,
      bounds,
      bucketSize,
    ),
  };

  return kpis.map((metric) => ({
    ...metric,
    sparkline: sparklines[metric.id],
  }));
}

function withLedgerSparklines(
  summary: AccountantSummaryData,
  datasets: ReportSparklineDatasets,
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): AccountantSummaryData {
  const collectedFromCharts = sparklineFromChartSeries(
    datasets.chartSeries,
    "revenue",
    "collected",
  );
  const collected =
    collectedFromCharts.length > 0
      ? collectedFromCharts
      : buildCollectedRevenueSparkline(datasets.payments, bounds, bucketSize);

  const netIncome = buildNetIncomeSparklineFromChartSeries(datasets.chartSeries);
  const netIncomeSparkline =
    netIncome.length > 0
      ? netIncome
      : collected.map((amount) => amount);

  return {
    ...summary,
    sparklines: {
      collected,
      outstanding: buildOutstandingSparkline(
        datasets.invoices,
        bounds,
        bucketSize,
      ),
      overdue: buildOverdueSparkline(datasets.invoices, bounds, bucketSize),
      "net-income": netIncomeSparkline,
    },
  };
}

/**
 * Attaches Tier 1 sparklines using Reports date-range chart buckets where
 * possible, and the same daily/weekly bucket builders as the dashboard KPI strip.
 */
export function attachReportPageSparklines(
  data: ReportsPageData,
  datasets: ReportSparklineDatasets,
): ReportsPageData {
  const bucketSize = resolveReportChartBucketSize(data.dateRange);

  return {
    ...data,
    kpis: withKpiSparklines(
      data.kpis,
      datasets,
      data.dateBounds,
      bucketSize,
    ),
    accountantSummary: withLedgerSparklines(
      data.accountantSummary,
      datasets,
      data.dateBounds,
      bucketSize,
    ),
  };
}
