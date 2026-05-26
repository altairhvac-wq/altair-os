import type { AnalyticsDateRange } from "@/shared/types/analytics";
import type { Job } from "@/shared/types/job";
import type { JobProfitabilitySnapshot } from "@/shared/types/job-profitability";
import { roundCurrency, type InvoiceStatus } from "@/shared/types/invoice";
import { roundJobMaterialAmount } from "@/shared/types/job-material";

export type ProfitabilityReportDateRange = AnalyticsDateRange | "all";

export type ProfitabilityReportDateBounds = {
  startDate: string;
  endDate: string;
};

export type ProfitabilityReportSummary = {
  collectedRevenue: number;
  invoicedRevenue: number;
  outstandingRevenue: number;
  projectedRevenue: number;
  materialCost: number;
  expenseCost: number;
  directCostTotal: number;
  grossProfit: number;
  grossMarginPercent: number | null;
  laborHours: number;
  jobCount: number;
  jobsWithWarnings: number;
};

export type ProfitabilityReportMeta = {
  dateRange: ProfitabilityReportDateRange;
  dateBounds: ProfitabilityReportDateBounds | null;
  /** How jobs were scoped when a date range is active. */
  jobFilterBasis: "scheduledDate" | "none";
  completenessWarnings: string[];
};

export type ProfitabilityReport = {
  summary: ProfitabilityReportSummary;
  meta: ProfitabilityReportMeta;
};

function toDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function roundMarginPercent(value: number): number {
  return Math.round(value * 100) / 100;
}

export function parseProfitabilityReportDateRange(
  value: string | undefined,
): ProfitabilityReportDateRange {
  if (value === "all") {
    return "all";
  }

  const ranges: ProfitabilityReportDateRange[] = [
    "7d",
    "30d",
    "90d",
    "ytd",
    "12m",
  ];

  if (value && ranges.includes(value as AnalyticsDateRange)) {
    return value as AnalyticsDateRange;
  }

  return "30d";
}

export function resolveProfitabilityReportDateBounds(
  range: AnalyticsDateRange,
  referenceDate: Date = new Date(),
): ProfitabilityReportDateBounds {
  const endDate = toDateOnly(referenceDate);
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);

  switch (range) {
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      break;
    case "90d":
      start.setDate(start.getDate() - 89);
      break;
    case "12m":
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      break;
    case "ytd":
      start.setMonth(0, 1);
      break;
    default:
      start.setDate(start.getDate() - 29);
      break;
  }

  return {
    startDate: toDateOnly(start),
    endDate,
  };
}

export function jobMatchesProfitabilityScheduledDateRange(
  job: Job,
  bounds: ProfitabilityReportDateBounds,
): boolean {
  const scheduledDate = job.scheduledDate;
  return (
    scheduledDate >= bounds.startDate && scheduledDate <= bounds.endDate
  );
}

export function jobProfitabilityHasWarnings(
  snapshot: JobProfitabilitySnapshot,
): boolean {
  const { completeness } = snapshot;

  return (
    completeness.noActiveInvoices ||
    completeness.materialsMissingUnitCostCount > 0 ||
    completeness.excludedPendingExpenseCount > 0 ||
    completeness.excludedRejectedExpenseCount > 0 ||
    completeness.expensesMissingAmountCount > 0 ||
    completeness.excludedMaterialsExpenseCount > 0 ||
    completeness.openLaborEntryCount > 0
  );
}

/**
 * Roll up job-level profitability snapshots without recomputing domain rules.
 * Gross margin uses total collected revenue as the denominator (same basis as jobs).
 */
export function aggregateJobProfitabilitySnapshots(
  snapshots: JobProfitabilitySnapshot[],
): ProfitabilityReportSummary {
  let collectedRevenue = 0;
  let invoicedRevenue = 0;
  let outstandingRevenue = 0;
  let projectedRevenue = 0;
  let materialCost = 0;
  let expenseCost = 0;
  let directCostTotal = 0;
  let totalLaborMinutes = 0;
  let jobsWithWarnings = 0;

  for (const snapshot of snapshots) {
    collectedRevenue += snapshot.revenue.collected;
    invoicedRevenue += snapshot.revenue.invoiced;
    outstandingRevenue += snapshot.revenue.outstanding;
    projectedRevenue += snapshot.projectedRevenue?.total ?? 0;
    materialCost += snapshot.costs.materialCogs;
    expenseCost += snapshot.costs.expenseCogs;
    directCostTotal += snapshot.costs.directCostTotal;
    totalLaborMinutes += snapshot.labor.totalMinutes;

    if (jobProfitabilityHasWarnings(snapshot)) {
      jobsWithWarnings += 1;
    }
  }

  const grossProfit = roundCurrency(collectedRevenue - directCostTotal);
  const grossMarginPercent =
    collectedRevenue > 0
      ? roundMarginPercent((grossProfit / collectedRevenue) * 100)
      : null;

  return {
    collectedRevenue: roundCurrency(collectedRevenue),
    invoicedRevenue: roundCurrency(invoicedRevenue),
    outstandingRevenue: roundCurrency(outstandingRevenue),
    projectedRevenue: roundCurrency(projectedRevenue),
    materialCost: roundCurrency(materialCost),
    expenseCost: roundCurrency(expenseCost),
    directCostTotal: roundCurrency(directCostTotal),
    grossProfit,
    grossMarginPercent,
    laborHours: roundJobMaterialAmount(totalLaborMinutes / 60),
    jobCount: snapshots.length,
    jobsWithWarnings,
  };
}

export type ReportSectionMeta = {
  dateRange: ProfitabilityReportDateRange;
  dateBounds: ProfitabilityReportDateBounds | null;
  limitations: string[];
};

export type RevenueReportSummary = {
  collectedRevenue: number;
  invoicedRevenue: number;
  outstandingRevenue: number;
  paymentCount: number;
};

export type RevenueReport = {
  summary: RevenueReportSummary;
  meta: ReportSectionMeta;
};

export type ExpenseStatusReportBucket = {
  count: number;
  totalAmount: number;
};

export type ExpenseReportSummary = {
  submitted: ExpenseStatusReportBucket;
  approvedReimbursed: ExpenseStatusReportBucket;
  pending: ExpenseStatusReportBucket;
  rejected: ExpenseStatusReportBucket;
};

export type ExpenseReport = {
  summary: ExpenseReportSummary;
  meta: ReportSectionMeta;
};

export type JobActivityReportSummary = {
  jobsScheduled: number;
  jobsCompleted: number;
  openJobs: number;
  completionRatePercent: number | null;
};

export type JobActivityReport = {
  summary: JobActivityReportSummary;
  meta: ReportSectionMeta;
};

export type TechnicianLaborReportSummary = {
  totalLaborHours: number;
  activeLaborEntries: number;
  technicianCount: number;
  closedLaborEntryCount: number;
};

export type TechnicianLaborReport = {
  summary: TechnicianLaborReportSummary;
  meta: ReportSectionMeta;
};

export type StalledJobEntry = {
  jobId: string;
  jobNumber: string;
  customerName: string;
  status: Job["status"];
  assignedTechnician?: string;
  lastActivityAt: string;
  daysSinceActivity: number;
};

export type StalledJobsReportSummary = {
  stalledCount: number;
  stalledJobs: StalledJobEntry[];
  inactivityThresholdDays: number;
};

export type StalledJobsReport = {
  summary: StalledJobsReportSummary;
  meta: ReportSectionMeta;
};

export type CompletedWorkAwaitingInvoicingEntry = {
  jobId: string;
  jobNumber: string;
  customerName: string;
  completedAt: string | null;
  assignedTechnician?: string;
  approvedEstimateAmount: number | null;
  collectedRevenue: number;
  daysSinceCompletion: number;
};

export type CompletedWorkAwaitingInvoicingReportSummary = {
  count: number;
  jobs: CompletedWorkAwaitingInvoicingEntry[];
};

export type CompletedWorkAwaitingInvoicingReport = {
  summary: CompletedWorkAwaitingInvoicingReportSummary;
  meta: ReportSectionMeta;
};

export type CompletedWorkReviewReason =
  | "no_active_invoice"
  | "open_labor_entries"
  | "pending_expenses"
  | "profitability_data_incomplete";

export type CompletedWorkReviewSeverity = "warning" | "critical";

export type CompletedWorkInvoiceStatusSnapshot = {
  activeInvoiceCount: number;
  statuses: InvoiceStatus[];
  latestStatus: InvoiceStatus | null;
};

export type CompletedWorkReviewEntry = {
  jobId: string;
  jobNumber: string;
  customerName: string;
  completedAt: string | null;
  assignedTechnician?: string;
  daysSinceCompletion: number;
  reviewReasons: CompletedWorkReviewReason[];
  severity: CompletedWorkReviewSeverity;
  invoiceStatus: CompletedWorkInvoiceStatusSnapshot;
  profitabilityWarningCount: number;
};

export type CompletedWorkReviewReportSummary = {
  count: number;
  jobs: CompletedWorkReviewEntry[];
};

export type CompletedWorkReviewReport = {
  summary: CompletedWorkReviewReportSummary;
  meta: ReportSectionMeta;
};

export function countJobProfitabilityWarningFlags(
  snapshot: JobProfitabilitySnapshot,
): number {
  const { completeness } = snapshot;
  let count = 0;

  if (completeness.noActiveInvoices) {
    count += 1;
  }
  if (completeness.materialsMissingUnitCostCount > 0) {
    count += 1;
  }
  if (completeness.excludedPendingExpenseCount > 0) {
    count += 1;
  }
  if (completeness.excludedRejectedExpenseCount > 0) {
    count += 1;
  }
  if (completeness.excludedMaterialsExpenseCount > 0) {
    count += 1;
  }
  if (completeness.expensesMissingAmountCount > 0) {
    count += 1;
  }
  if (completeness.openLaborEntryCount > 0) {
    count += 1;
  }

  return count;
}

export function resolveCompletedWorkReviewReasons(
  snapshot: JobProfitabilitySnapshot,
): CompletedWorkReviewReason[] {
  const reasons: CompletedWorkReviewReason[] = [];
  const { completeness } = snapshot;

  if (completeness.noActiveInvoices) {
    reasons.push("no_active_invoice");
  }
  if (completeness.openLaborEntryCount > 0) {
    reasons.push("open_labor_entries");
  }
  if (completeness.excludedPendingExpenseCount > 0) {
    reasons.push("pending_expenses");
  }

  const hasOtherProfitabilityWarnings =
    completeness.materialsMissingUnitCostCount > 0 ||
    completeness.excludedRejectedExpenseCount > 0 ||
    completeness.excludedMaterialsExpenseCount > 0 ||
    completeness.expensesMissingAmountCount > 0;

  if (hasOtherProfitabilityWarnings) {
    reasons.push("profitability_data_incomplete");
  }

  return reasons;
}

export function resolveCompletedWorkReviewSeverity(
  reasons: CompletedWorkReviewReason[],
): CompletedWorkReviewSeverity {
  const hasNoInvoice = reasons.includes("no_active_invoice");
  const hasOpenLabor = reasons.includes("open_labor_entries");
  const hasPendingExpenses = reasons.includes("pending_expenses");

  if (hasNoInvoice && hasOpenLabor && hasPendingExpenses) {
    return "critical";
  }

  if (hasNoInvoice) {
    return "warning";
  }

  return "warning";
}

export function jobRequiresCompletedWorkReview(
  job: Job,
  snapshot: JobProfitabilitySnapshot,
): boolean {
  return (
    job.status === "completed" &&
    resolveCompletedWorkReviewReasons(snapshot).length > 0
  );
}

const COMPLETED_WORK_REVIEW_REASON_LABELS: Record<
  CompletedWorkReviewReason,
  string
> = {
  no_active_invoice: "No active invoice",
  open_labor_entries: "Open labor entries",
  pending_expenses: "Pending expenses",
  profitability_data_incomplete: "Profitability data gaps",
};

export function formatCompletedWorkReviewReason(
  reason: CompletedWorkReviewReason,
): string {
  return COMPLETED_WORK_REVIEW_REASON_LABELS[reason];
}

export function formatCompletedWorkReviewReasons(
  reasons: CompletedWorkReviewReason[],
): string {
  return reasons.map(formatCompletedWorkReviewReason).join(" · ");
}

export function formatCompletedWorkInvoiceStatus(
  snapshot: CompletedWorkInvoiceStatusSnapshot,
): string {
  if (snapshot.activeInvoiceCount === 0) {
    return "No active invoices";
  }

  const statusLabel =
    snapshot.latestStatus != null
      ? snapshot.latestStatus.replaceAll("_", " ")
      : "unknown";

  if (snapshot.activeInvoiceCount === 1) {
    return statusLabel;
  }

  return `${snapshot.activeInvoiceCount} invoices · latest ${statusLabel}`;
}

export type OperationalReportsBundle = {
  revenue: RevenueReport;
  expenses: ExpenseReport;
  jobs: JobActivityReport;
  labor: TechnicianLaborReport;
  stalledJobs: StalledJobsReport;
  completedWorkAwaitingInvoicing: CompletedWorkAwaitingInvoicingReport;
  completedWorkReview: CompletedWorkReviewReport;
};

export type ReportChartBucketSize = "day" | "week" | "month";

export type ReportChartValueFormat = "currency" | "count" | "hours";

export type ReportChartPoint = {
  bucketStart: string;
  label: string;
  value: number;
};

export type ReportChartSeries = {
  key: string;
  label: string;
  points: ReportChartPoint[];
};

export type ReportOperationalChart = {
  id: string;
  title: string;
  subtitle: string;
  valueFormat: ReportChartValueFormat;
  series: ReportChartSeries[];
  limitations: string[];
};

export type ReportChartSeriesBundle = {
  revenue: ReportOperationalChart;
  expenses: ReportOperationalChart;
  jobs: ReportOperationalChart;
  labor: ReportOperationalChart;
  meta: ReportSectionMeta;
};

export function toReportDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

export function resolveReportDateBounds(
  dateRange: ProfitabilityReportDateRange,
  referenceDate: Date = new Date(),
): ProfitabilityReportDateBounds | null {
  if (dateRange === "all") {
    return null;
  }

  return resolveProfitabilityReportDateBounds(dateRange, referenceDate);
}

export function isDateWithinReportBounds(
  value: string | undefined,
  bounds: ProfitabilityReportDateBounds,
): boolean {
  if (!value) {
    return false;
  }

  const dateOnly = toReportDateOnly(value);
  return dateOnly >= bounds.startDate && dateOnly <= bounds.endDate;
}

export function jobScheduledInReportRange(
  job: Job,
  bounds: ProfitabilityReportDateBounds,
): boolean {
  return isDateWithinReportBounds(job.scheduledDate, bounds);
}

export function buildReportSectionMeta(input: {
  dateRange: ProfitabilityReportDateRange;
  dateBounds: ProfitabilityReportDateBounds | null;
  limitations?: string[];
}): ReportSectionMeta {
  return {
    dateRange: input.dateRange,
    dateBounds: input.dateBounds,
    limitations: input.limitations ?? [],
  };
}

function parseReportDateOnly(value: string): Date {
  const [year, month, day] = toReportDateOnly(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addReportDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfReportWeek(value: Date): Date {
  const next = new Date(value);
  const weekday = next.getDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  next.setDate(next.getDate() + offset);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfReportMonth(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function resolveReportChartBucketSize(
  dateRange: ProfitabilityReportDateRange,
): ReportChartBucketSize {
  switch (dateRange) {
    case "7d":
    case "30d":
      return "day";
    case "90d":
      return "week";
    case "ytd":
    case "12m":
    case "all":
      return "month";
    default:
      return "day";
  }
}

export function resolveReportChartDateBounds(
  dateRange: ProfitabilityReportDateRange,
  referenceDate: Date = new Date(),
): ProfitabilityReportDateBounds {
  if (dateRange === "all") {
    return resolveProfitabilityReportDateBounds("12m", referenceDate);
  }

  const bounds = resolveReportDateBounds(dateRange, referenceDate);
  return bounds ?? resolveProfitabilityReportDateBounds("30d", referenceDate);
}

export function resolveReportChartBucketStart(
  value: string,
  bucketSize: ReportChartBucketSize,
): string {
  const date = parseReportDateOnly(value);

  switch (bucketSize) {
    case "day":
      return toDateOnly(date);
    case "week":
      return toDateOnly(startOfReportWeek(date));
    case "month":
      return toDateOnly(startOfReportMonth(date));
    default:
      return toDateOnly(date);
  }
}

function formatReportChartBucketLabel(
  bucketStart: string,
  bucketSize: ReportChartBucketSize,
): string {
  const date = parseReportDateOnly(bucketStart);

  if (bucketSize === "month") {
    return date.toLocaleDateString("en-US", { month: "short" });
  }

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function buildReportChartBuckets(
  bounds: ProfitabilityReportDateBounds,
  bucketSize: ReportChartBucketSize,
): { bucketStart: string; label: string }[] {
  const buckets: { bucketStart: string; label: string }[] = [];
  const end = parseReportDateOnly(bounds.endDate);
  let cursor = parseReportDateOnly(bounds.startDate);

  switch (bucketSize) {
    case "day":
      cursor = parseReportDateOnly(bounds.startDate);
      break;
    case "week":
      cursor = startOfReportWeek(parseReportDateOnly(bounds.startDate));
      break;
    case "month":
      cursor = startOfReportMonth(parseReportDateOnly(bounds.startDate));
      break;
  }

  while (cursor <= end) {
    const bucketStart = toDateOnly(cursor);
    buckets.push({
      bucketStart,
      label: formatReportChartBucketLabel(bucketStart, bucketSize),
    });

    switch (bucketSize) {
      case "day":
        cursor = addReportDays(cursor, 1);
        break;
      case "week":
        cursor = addReportDays(cursor, 7);
        break;
      case "month":
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        break;
    }
  }

  return buckets;
}

export function createEmptyReportChartPoints(
  buckets: { bucketStart: string; label: string }[],
): ReportChartPoint[] {
  return buckets.map((bucket) => ({
    bucketStart: bucket.bucketStart,
    label: bucket.label,
    value: 0,
  }));
}

export function buildProfitabilityReportMeta(input: {
  dateRange: ProfitabilityReportDateRange;
  dateBounds: ProfitabilityReportDateBounds | null;
  summary: ProfitabilityReportSummary;
}): ProfitabilityReportMeta {
  const warnings: string[] = [];

  if (input.dateBounds) {
    warnings.push(
      `Job scope uses scheduled service dates (${input.dateBounds.startDate} – ${input.dateBounds.endDate}). Revenue and costs are full job totals, not prorated to the period.`,
    );
  }

  if (input.summary.jobCount === 0) {
    warnings.push("No jobs match the current filter.");
  }

  if (input.summary.jobsWithWarnings > 0) {
    const count = input.summary.jobsWithWarnings;
    warnings.push(
      `${count} job${count === 1 ? "" : "s"} have data completeness warnings affecting direct costs or labor hours.`,
    );
  }

  return {
    dateRange: input.dateRange,
    dateBounds: input.dateBounds,
    jobFilterBasis: input.dateBounds ? "scheduledDate" : "none",
    completenessWarnings: warnings,
  };
}
