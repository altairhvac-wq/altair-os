import { listExpenses } from "@/lib/database/queries/expenses";
import { listInvoicePayments } from "@/lib/database/queries/invoice-payments";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listJobs } from "@/lib/database/queries/jobs";
import { listTimeEntries } from "@/lib/database/queries/time-entries";
import type { Expense } from "@/shared/types/expense";
import { roundCurrency, type Invoice, type InvoiceStatus } from "@/shared/types/invoice";
import type { Job } from "@/shared/types/job";
import { roundJobMaterialAmount } from "@/shared/types/job-material";
import {
  buildReportChartBuckets,
  buildReportSectionMeta,
  isDateWithinReportBounds,
  jobScheduledInReportRange,
  resolveReportChartBucketSize,
  resolveReportChartBucketStart,
  resolveReportChartDateBounds,
  resolveReportDateBounds,
  type ProfitabilityReportDateBounds,
  type ProfitabilityReportDateRange,
  type ReportChartPoint,
  type ReportChartSeries,
  type ReportChartSeriesBundle,
  type ReportOperationalChart,
} from "@/shared/types/reports";
import { resolveClosedJobLaborMinutes } from "@/shared/types/time-entry";

const EXCLUDED_INVOICE_STATUSES: ReadonlySet<InvoiceStatus> = new Set([
  "void",
  "cancelled",
]);

type ReportChartSeriesOptions = {
  dateRange?: ProfitabilityReportDateRange;
};

function isActiveInvoice(invoice: Invoice): boolean {
  return !EXCLUDED_INVOICE_STATUSES.has(invoice.status);
}

function expenseAmount(expense: Expense): number {
  return expense.amount ?? 0;
}

function resolveExpenseReportDate(expense: Expense): string {
  return expense.purchaseDate ?? expense.createdAt;
}

function jobCompletedInReportRange(
  job: Job,
  dateBounds: ProfitabilityReportDateBounds,
): boolean {
  if (job.status !== "completed") {
    return false;
  }

  if (job.completedAt) {
    return isDateWithinReportBounds(job.completedAt, dateBounds);
  }

  return jobScheduledInReportRange(job, dateBounds);
}

function resolveJobCompletionChartDate(job: Job): string | null {
  if (job.status !== "completed") {
    return null;
  }

  return job.completedAt ?? job.scheduledDate ?? null;
}

function createSeriesAccumulator(
  key: string,
  label: string,
  buckets: { bucketStart: string; label: string }[],
): { key: string; label: string; values: Map<string, number> } {
  const values = new Map<string, number>();
  for (const bucket of buckets) {
    values.set(bucket.bucketStart, 0);
  }

  return { key, label, values };
}

function addToBucket(
  accumulator: { values: Map<string, number> },
  dateValue: string | undefined,
  amount: number,
  bucketSize: ReturnType<typeof resolveReportChartBucketSize>,
  dateBounds: ProfitabilityReportDateBounds,
): void {
  if (!dateValue || !isDateWithinReportBounds(dateValue, dateBounds)) {
    return;
  }

  const bucketStart = resolveReportChartBucketStart(dateValue, bucketSize);
  const current = accumulator.values.get(bucketStart);
  if (current == null) {
    return;
  }

  accumulator.values.set(bucketStart, current + amount);
}

function toChartPoints(
  buckets: { bucketStart: string; label: string }[],
  values: Map<string, number>,
  roundValue?: (value: number) => number,
): ReportChartPoint[] {
  return buckets.map((bucket) => {
    const rawValue = values.get(bucket.bucketStart) ?? 0;
    return {
      bucketStart: bucket.bucketStart,
      label: bucket.label,
      value: roundValue ? roundValue(rawValue) : rawValue,
    };
  });
}

function buildChartSeries(
  accumulator: ReturnType<typeof createSeriesAccumulator>,
  buckets: { bucketStart: string; label: string }[],
  roundValue?: (value: number) => number,
): ReportChartSeries {
  return {
    key: accumulator.key,
    label: accumulator.label,
    points: toChartPoints(buckets, accumulator.values, roundValue),
  };
}

export async function getCompanyReportChartSeries(
  companyId: string,
  options: ReportChartSeriesOptions = {},
): Promise<ReportChartSeriesBundle> {
  const dateRange = options.dateRange ?? "30d";
  const bucketSize = resolveReportChartBucketSize(dateRange);
  const chartBounds = resolveReportChartDateBounds(dateRange);
  const reportDateBounds = resolveReportDateBounds(dateRange);
  const buckets = buildReportChartBuckets(chartBounds, bucketSize);
  const bucketKeys = new Set(buckets.map((bucket) => bucket.bucketStart));

  const metaLimitations: string[] = [];
  if (dateRange === "all") {
    metaLimitations.push(
      "All time charts use the last 12 months for the time axis.",
    );
  }

  const [
    invoices,
    payments,
    expenses,
    jobs,
    laborEntries,
  ] = await Promise.all([
    listInvoices(companyId),
    listInvoicePayments(companyId),
    listExpenses(companyId),
    listJobs(companyId),
    listTimeEntries(companyId, { entryType: "job_labor" }),
  ]);

  const activeInvoices = invoices.filter(isActiveInvoice);

  const collectedSeries = createSeriesAccumulator(
    "collected",
    "Collected revenue",
    buckets,
  );
  const invoicedSeries = createSeriesAccumulator(
    "invoiced",
    "Invoiced revenue",
    buckets,
  );

  for (const payment of payments) {
    addToBucket(
      collectedSeries,
      payment.paymentDate,
      payment.amount,
      bucketSize,
      chartBounds,
    );
  }

  for (const invoice of activeInvoices) {
    addToBucket(
      invoicedSeries,
      invoice.issueDate,
      invoice.total,
      bucketSize,
      chartBounds,
    );
  }

  const revenueLimitations: string[] = [];
  if (reportDateBounds) {
    revenueLimitations.push(
      "Collected revenue uses payment dates; invoiced revenue uses invoice issue dates.",
    );
  }

  const revenueChart: ReportOperationalChart = {
    id: "revenue-over-time",
    title: "Revenue over time",
    subtitle: "Collected payments vs invoiced totals",
    valueFormat: "currency",
    series: [
      buildChartSeries(collectedSeries, buckets, roundCurrency),
      buildChartSeries(invoicedSeries, buckets, roundCurrency),
    ],
    limitations: revenueLimitations,
  };

  const submittedExpenses = createSeriesAccumulator(
    "submitted",
    "Submitted expenses",
    buckets,
  );
  const approvedExpenses = createSeriesAccumulator(
    "approved-reimbursed",
    "Approved / reimbursed",
    buckets,
  );

  let usedCreatedDateFallback = false;

  for (const expense of expenses) {
    const reportDate = resolveExpenseReportDate(expense);
    if (!expense.purchaseDate) {
      usedCreatedDateFallback = true;
    }

    if (expense.status === "submitted") {
      addToBucket(
        submittedExpenses,
        reportDate,
        expenseAmount(expense),
        bucketSize,
        chartBounds,
      );
    }

    if (expense.status === "approved" || expense.status === "reimbursed") {
      addToBucket(
        approvedExpenses,
        reportDate,
        expenseAmount(expense),
        bucketSize,
        chartBounds,
      );
    }
  }

  const expenseLimitations: string[] = [];
  if (usedCreatedDateFallback) {
    expenseLimitations.push(
      "Expenses without a purchase date use created date for chart bucketing.",
    );
  }

  const expensesChart: ReportOperationalChart = {
    id: "expenses-over-time",
    title: "Expenses over time",
    subtitle: "Submitted vs approved or reimbursed totals",
    valueFormat: "currency",
    series: [
      buildChartSeries(submittedExpenses, buckets, roundCurrency),
      buildChartSeries(approvedExpenses, buckets, roundCurrency),
    ],
    limitations: expenseLimitations,
  };

  const scheduledJobs = createSeriesAccumulator(
    "scheduled",
    "Jobs scheduled",
    buckets,
  );
  const completedJobs = createSeriesAccumulator(
    "completed",
    "Jobs completed",
    buckets,
  );

  let usedScheduledDateCompletionFallback = false;

  for (const job of jobs) {
    if (jobScheduledInReportRange(job, chartBounds)) {
      addToBucket(
        scheduledJobs,
        job.scheduledDate,
        1,
        bucketSize,
        chartBounds,
      );
    }

    if (jobCompletedInReportRange(job, chartBounds)) {
      const completionDate = resolveJobCompletionChartDate(job);
      if (completionDate && !job.completedAt) {
        usedScheduledDateCompletionFallback = true;
      }

      addToBucket(
        completedJobs,
        completionDate ?? undefined,
        1,
        bucketSize,
        chartBounds,
      );
    }
  }

  const jobsLimitations: string[] = [];
  if (usedScheduledDateCompletionFallback) {
    jobsLimitations.push(
      "Some completed jobs are bucketed by scheduled date when completion timestamp is missing.",
    );
  }

  const jobsChart: ReportOperationalChart = {
    id: "jobs-over-time",
    title: "Jobs scheduled vs completed",
    subtitle: "Scheduling volume compared to completions",
    valueFormat: "count",
    series: [
      buildChartSeries(scheduledJobs, buckets),
      buildChartSeries(completedJobs, buckets),
    ],
    limitations: jobsLimitations,
  };

  const laborHours = createSeriesAccumulator(
    "labor-hours",
    "Closed labor hours",
    buckets,
  );

  let excludedOpenLabor = false;

  for (const entry of laborEntries) {
    if (!isDateWithinReportBounds(entry.startedAt, chartBounds)) {
      continue;
    }

    const minutes = resolveClosedJobLaborMinutes(entry);
    if (minutes == null) {
      excludedOpenLabor = true;
      continue;
    }

    const bucketStart = resolveReportChartBucketStart(entry.startedAt, bucketSize);
    if (!bucketKeys.has(bucketStart)) {
      continue;
    }

    const current = laborHours.values.get(bucketStart) ?? 0;
    laborHours.values.set(
      bucketStart,
      current + minutes / 60,
    );
  }

  const laborLimitations: string[] = [];
  if (excludedOpenLabor) {
    laborLimitations.push(
      "Open job-labor entries are excluded until closed.",
    );
  }
  laborLimitations.push("Labor hours are bucketed by entry start time.");

  const laborChart: ReportOperationalChart = {
    id: "labor-over-time",
    title: "Labor hours over time",
    subtitle: "Closed job-labor hours from time entries",
    valueFormat: "hours",
    series: [
      buildChartSeries(laborHours, buckets, (value) =>
        roundJobMaterialAmount(value),
      ),
    ],
    limitations: laborLimitations,
  };

  return {
    revenue: revenueChart,
    expenses: expensesChart,
    jobs: jobsChart,
    labor: laborChart,
    meta: buildReportSectionMeta({
      dateRange,
      dateBounds: reportDateBounds,
      limitations: metaLimitations,
    }),
  };
}
