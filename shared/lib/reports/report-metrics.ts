import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import {
  isActiveInvoice,
  roundCurrency,
  type Invoice,
} from "@/shared/types/invoice";
import type { InvoicePayment } from "@/shared/types/invoice-payment";
import { formatPaymentMethod } from "@/shared/types/invoice-payment";
import type { Job } from "@/shared/types/job";
import { roundJobMaterialAmount } from "@/shared/types/job-material";
import type { TimeEntry } from "@/shared/types/time-entry";
import { resolveClosedJobLaborMinutes } from "@/shared/types/time-entry";
import { buildLeadPipelineMetrics } from "@/shared/lib/leads/lead-metrics";
import type { Lead } from "@/shared/types/lead";
import type {
  AccountantSummaryData,
  ReportCashHealth,
  ReportFunnelStage,
  ReportKpiMetric,
  ReportKpiTrend,
  ReportOperationsSnapshot,
  ReportSnapshotRow,
  ReportTechnicianProfitability,
  ReportTrendPoint,
  ReportsPageData,
  ReportsPageDateRange,
} from "@/shared/types/reports-page";
import { formatCurrency } from "@/shared/types/customer";
import { formatPercent } from "@/shared/types/analytics";
import {
  isDateWithinReportBounds,
  resolveProfitabilityReportDateBounds,
  resolveReportDateBounds,
  type ProfitabilityReportDateBounds,
  type ReportChartSeriesBundle,
} from "@/shared/types/reports";

const EXCLUDED_ESTIMATE_STATUSES = new Set(["cancelled", "draft"]);

type ReportRawDatasets = {
  invoices: Invoice[];
  payments: InvoicePayment[];
  estimates: Estimate[];
  jobs: Job[];
  expenses: Expense[];
  leads: Lead[];
  chartSeries: ReportChartSeriesBundle;
  laborEntries: TimeEntry[];
  laborCostRates: Map<string, number>;
};

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

export function resolvePreviousReportDateBounds(
  bounds: ProfitabilityReportDateBounds,
): ProfitabilityReportDateBounds {
  const start = parseDateOnly(bounds.startDate);
  const end = parseDateOnly(bounds.endDate);
  const dayCount =
    Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(dayCount - 1));

  return {
    startDate: toDateOnly(previousStart),
    endDate: toDateOnly(previousEnd),
  };
}

function paymentsInBounds(
  payments: InvoicePayment[],
  bounds: ProfitabilityReportDateBounds,
): InvoicePayment[] {
  return payments.filter((payment) =>
    isDateWithinReportBounds(payment.paymentDate, bounds),
  );
}

function collectedRevenueInBounds(
  payments: InvoicePayment[],
  bounds: ProfitabilityReportDateBounds,
): number {
  return roundCurrency(
    paymentsInBounds(payments, bounds).reduce(
      (sum, payment) => sum + payment.amount,
      0,
    ),
  );
}

function averageTicketInBounds(
  payments: InvoicePayment[],
  bounds: ProfitabilityReportDateBounds,
): number | null {
  const scoped = paymentsInBounds(payments, bounds);
  if (scoped.length === 0) {
    return null;
  }

  return roundCurrency(
    scoped.reduce((sum, payment) => sum + payment.amount, 0) / scoped.length,
  );
}

function estimateSentInBounds(estimate: Estimate, bounds: ProfitabilityReportDateBounds): boolean {
  if (EXCLUDED_ESTIMATE_STATUSES.has(estimate.status)) {
    return false;
  }

  if (estimate.sentAt && isDateWithinReportBounds(estimate.sentAt, bounds)) {
    return true;
  }

  return (
    ["sent", "approved", "declined", "converted"].includes(estimate.status) &&
    isDateWithinReportBounds(estimate.createdAt, bounds)
  );
}

function estimateApprovedInBounds(
  estimate: Estimate,
  bounds: ProfitabilityReportDateBounds,
): boolean {
  if (!["approved", "converted"].includes(estimate.status)) {
    return false;
  }

  if (estimate.approvedAt && isDateWithinReportBounds(estimate.approvedAt, bounds)) {
    return true;
  }

  return estimateSentInBounds(estimate, bounds);
}

function estimateCloseRateInBounds(
  estimates: Estimate[],
  bounds: ProfitabilityReportDateBounds,
): number | null {
  const sent = estimates.filter((estimate) =>
    estimateSentInBounds(estimate, bounds),
  ).length;
  const approved = estimates.filter((estimate) =>
    estimateApprovedInBounds(estimate, bounds),
  ).length;

  if (sent === 0) {
    return null;
  }

  return Math.round((approved / sent) * 1000) / 10;
}

function resolveTrend(current: number, previous: number): ReportKpiTrend {
  if (current > previous) {
    return "up";
  }
  if (current < previous) {
    return "down";
  }
  return "flat";
}

function formatPercentChange(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? "Up from prior period" : "Flat vs previous period";
  }

  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(Math.abs(change));
  const direction = change > 0 ? "Up" : change < 0 ? "Down" : "Flat";

  if (direction === "Flat") {
    return "Flat vs previous period";
  }

  return `${direction} ${rounded}% vs previous period`;
}

function formatCurrencyChange(current: number, previous: number): string {
  const delta = roundCurrency(current - previous);
  if (delta === 0) {
    return "Flat vs previous period";
  }

  const direction = delta > 0 ? "Up" : "Down";
  return `${direction} ${formatCurrency(Math.abs(delta))} vs previous period`;
}

function formatRateChange(current: number | null, previous: number | null): string {
  if (current == null || previous == null) {
    return "No prior period data";
  }

  const delta = Math.round((current - previous) * 10) / 10;
  if (delta === 0) {
    return "Flat vs previous period";
  }

  const direction = delta > 0 ? "Up" : "Down";
  return `${direction} ${Math.abs(delta)}% vs previous period`;
}

function buildKpis(
  datasets: ReportRawDatasets,
  dateBounds: ProfitabilityReportDateBounds,
  previousBounds: ProfitabilityReportDateBounds,
): ReportKpiMetric[] {
  const { payments, estimates, invoices } = datasets;

  const currentRevenue = collectedRevenueInBounds(payments, dateBounds);
  const previousRevenue = collectedRevenueInBounds(payments, previousBounds);

  const currentTicket = averageTicketInBounds(payments, dateBounds);
  const previousTicket = averageTicketInBounds(payments, previousBounds);

  const currentCloseRate = estimateCloseRateInBounds(estimates, dateBounds);
  const previousCloseRate = estimateCloseRateInBounds(estimates, previousBounds);

  const activeInvoices = invoices.filter(isActiveInvoice);
  const outstandingTotal = roundCurrency(
    activeInvoices
      .filter((invoice) => invoice.balanceDue > 0)
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0),
  );
  const unpaidCount = activeInvoices.filter(
    (invoice) => invoice.balanceDue > 0,
  ).length;

  return [
    {
      id: "revenue",
      label: "Revenue",
      value: formatCurrency(currentRevenue),
      comparison: formatPercentChange(currentRevenue, previousRevenue),
      trend: resolveTrend(currentRevenue, previousRevenue),
    },
    {
      id: "average-ticket",
      label: "Average Ticket",
      value: currentTicket != null ? formatCurrency(currentTicket) : "$0",
      comparison:
        currentTicket != null && previousTicket != null
          ? formatCurrencyChange(currentTicket, previousTicket)
          : "No payments in this period",
      trend:
        currentTicket != null && previousTicket != null
          ? resolveTrend(currentTicket, previousTicket)
          : undefined,
    },
    {
      id: "close-rate",
      label: "Estimate Close Rate",
      value:
        currentCloseRate != null ? formatPercent(currentCloseRate, 0) : "—",
      comparison: formatRateChange(currentCloseRate, previousCloseRate),
      trend:
        currentCloseRate != null && previousCloseRate != null
          ? resolveTrend(currentCloseRate, previousCloseRate)
          : undefined,
    },
    {
      id: "outstanding",
      label: "Outstanding Invoices",
      value: formatCurrency(outstandingTotal),
      comparison: `${unpaidCount} unpaid invoice${unpaidCount === 1 ? "" : "s"}`,
    },
  ];
}

function buildRevenueTrend(chartSeries: ReportChartSeriesBundle): ReportTrendPoint[] {
  const collectedSeries = chartSeries.revenue.series.find(
    (series) => series.key === "collected",
  );

  if (!collectedSeries) {
    return [];
  }

  return collectedSeries.points.map((point) => ({
    label: point.label,
    value: point.value,
  }));
}

function buildCashHealth(
  invoices: Invoice[],
  payments: InvoicePayment[],
  dateBounds: ProfitabilityReportDateBounds,
): ReportCashHealth {
  const activeInvoices = invoices.filter(isActiveInvoice);

  const paid = roundCurrency(
    activeInvoices
      .filter((invoice) => invoice.amountPaid > 0)
      .reduce((sum, invoice) => sum + invoice.amountPaid, 0),
  );

  const outstanding = roundCurrency(
    activeInvoices
      .filter((invoice) => invoice.balanceDue > 0 && invoice.status !== "overdue")
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0),
  );

  const overdue = roundCurrency(
    activeInvoices
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0),
  );

  const scopedInvoices = activeInvoices.filter((invoice) =>
    isDateWithinReportBounds(invoice.issueDate, dateBounds),
  );
  const invoiceTotal = roundCurrency(
    scopedInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
  );
  const collected = collectedRevenueInBounds(payments, dateBounds);

  let collectionRate: number | null = null;
  let collectionRateLabel: string;

  if (invoiceTotal <= 0) {
    collectionRateLabel = "No invoices";
  } else {
    collectionRate = Math.round((collected / invoiceTotal) * 1000) / 10;
    collectionRateLabel = `${collectionRate}%`;
  }

  return {
    paid,
    outstanding,
    overdue,
    collectionRate,
    collectionRateLabel,
  };
}

function jobCompletedInBounds(job: Job, bounds: ProfitabilityReportDateBounds): boolean {
  if (job.status !== "completed") {
    return false;
  }

  if (job.completedAt) {
    return isDateWithinReportBounds(job.completedAt, bounds);
  }

  return isDateWithinReportBounds(job.scheduledDate, bounds);
}

function invoicePaidInBounds(invoice: Invoice, bounds: ProfitabilityReportDateBounds): boolean {
  if (!isActiveInvoice(invoice) || invoice.status !== "paid") {
    return false;
  }

  if (invoice.paidAt) {
    return isDateWithinReportBounds(invoice.paidAt, bounds);
  }

  return isDateWithinReportBounds(invoice.issueDate, bounds);
}

function buildSalesFunnel(
  datasets: ReportRawDatasets,
  dateBounds: ProfitabilityReportDateBounds,
): ReportFunnelStage[] {
  const { estimates, jobs, invoices } = datasets;

  const estimatesSent = estimates.filter((estimate) =>
    estimateSentInBounds(estimate, dateBounds),
  ).length;
  const estimatesApproved = estimates.filter((estimate) =>
    estimateApprovedInBounds(estimate, dateBounds),
  ).length;
  const jobsCompleted = jobs.filter((job) =>
    jobCompletedInBounds(job, dateBounds),
  ).length;
  const invoicesPaid = invoices.filter((invoice) =>
    invoicePaidInBounds(invoice, dateBounds),
  ).length;

  return [
    { key: "sent", label: "Estimates sent", count: estimatesSent },
    { key: "approved", label: "Estimates approved", count: estimatesApproved },
    { key: "completed", label: "Jobs completed", count: jobsCompleted },
    { key: "paid", label: "Invoices paid", count: invoicesPaid },
  ];
}

function buildTechnicianProfitability(
  datasets: ReportRawDatasets,
  dateBounds: ProfitabilityReportDateBounds,
): ReportTechnicianProfitability[] {
  const { jobs, payments, invoices, laborEntries, laborCostRates } = datasets;
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const metrics = new Map<
    string,
    { name: string; revenue: number; laborHours: number }
  >();

  for (const job of jobs) {
    if (!jobCompletedInBounds(job, dateBounds) || !job.assignedTechnicianId) {
      continue;
    }

    const existing = metrics.get(job.assignedTechnicianId) ?? {
      name: job.assignedTechnician?.trim() || "Unassigned",
      revenue: 0,
      laborHours: 0,
    };

    metrics.set(job.assignedTechnicianId, existing);
  }

  for (const payment of paymentsInBounds(payments, dateBounds)) {
    const invoice = invoiceById.get(payment.invoiceId);
    if (!invoice?.jobId) {
      continue;
    }

    const job = jobs.find((item) => item.id === invoice.jobId);
    if (!job?.assignedTechnicianId) {
      continue;
    }

    const existing = metrics.get(job.assignedTechnicianId) ?? {
      name: job.assignedTechnician?.trim() || "Unassigned",
      revenue: 0,
      laborHours: 0,
    };

    existing.revenue = roundCurrency(existing.revenue + payment.amount);
    metrics.set(job.assignedTechnicianId, existing);
  }

  for (const entry of laborEntries) {
    if (!isDateWithinReportBounds(entry.startedAt, dateBounds)) {
      continue;
    }

    const minutes = resolveClosedJobLaborMinutes(entry);
    if (minutes == null) {
      continue;
    }

    const existing = metrics.get(entry.technicianId) ?? {
      name: entry.technicianName.trim() || "Technician",
      revenue: 0,
      laborHours: 0,
    };

    existing.laborHours = roundJobMaterialAmount(
      existing.laborHours + minutes / 60,
    );
    metrics.set(entry.technicianId, existing);
  }

  return [...metrics.entries()]
    .map(([technicianId, entry]) => {
      const hourlyRate = laborCostRates.get(technicianId);
      const profitAvailable = hourlyRate != null && hourlyRate >= 0;
      const laborCost =
        profitAvailable && entry.laborHours > 0
          ? roundCurrency(entry.laborHours * hourlyRate!)
          : profitAvailable
            ? 0
            : null;
      const grossProfit =
        profitAvailable && laborCost != null
          ? roundCurrency(entry.revenue - laborCost)
          : null;
      const margin =
        profitAvailable && grossProfit != null && entry.revenue > 0
          ? Math.round((grossProfit / entry.revenue) * 1000) / 10
          : null;

      return {
        technicianId,
        name: entry.name,
        revenue: entry.revenue,
        laborHours: entry.laborHours,
        laborCost,
        grossProfit,
        margin,
        profitAvailable,
      };
    })
    .filter(
      (entry) => entry.revenue > 0 || entry.laborHours > 0,
    )
    .sort((left, right) => {
      const leftScore =
        left.grossProfit ?? left.revenue;
      const rightScore =
        right.grossProfit ?? right.revenue;
      return rightScore - leftScore;
    })
    .slice(0, 5);
}

function resolveExpenseReportDate(expense: Expense): string {
  return expense.purchaseDate ?? expense.createdAt;
}

function expenseAmount(expense: Expense): number {
  return expense.amount ?? 0;
}

function buildTopCustomers(
  payments: InvoicePayment[],
  invoices: Invoice[],
  dateBounds: ProfitabilityReportDateBounds,
): ReportSnapshotRow[] {
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const totals = new Map<string, { name: string; revenue: number; count: number }>();

  for (const payment of paymentsInBounds(payments, dateBounds)) {
    const invoice = invoiceById.get(payment.invoiceId);
    if (!invoice) {
      continue;
    }

    const existing = totals.get(invoice.customerId) ?? {
      name: invoice.customerName,
      revenue: 0,
      count: 0,
    };

    existing.revenue = roundCurrency(existing.revenue + payment.amount);
    existing.count += 1;
    totals.set(invoice.customerId, existing);
  }

  return [...totals.entries()]
    .sort((left, right) => right[1].revenue - left[1].revenue)
    .slice(0, 5)
    .map(([id, entry]) => ({
      id,
      label: entry.name,
      detail: `${entry.count} payment${entry.count === 1 ? "" : "s"}`,
      value: formatCurrency(entry.revenue),
    }));
}

function buildTopServiceCategories(
  jobs: Job[],
  payments: InvoicePayment[],
  invoices: Invoice[],
  dateBounds: ProfitabilityReportDateBounds,
): ReportSnapshotRow[] {
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const totals = new Map<string, { revenue: number; jobCount: number }>();

  for (const job of jobs) {
    if (!jobCompletedInBounds(job, dateBounds)) {
      continue;
    }

    const existing = totals.get(job.jobType) ?? { revenue: 0, jobCount: 0 };
    existing.jobCount += 1;
    totals.set(job.jobType, existing);
  }

  for (const payment of paymentsInBounds(payments, dateBounds)) {
    const invoice = invoiceById.get(payment.invoiceId);
    if (!invoice?.jobId) {
      continue;
    }

    const job = jobs.find((item) => item.id === invoice.jobId);
    if (!job) {
      continue;
    }

    const existing = totals.get(job.jobType) ?? { revenue: 0, jobCount: 0 };
    existing.revenue = roundCurrency(existing.revenue + payment.amount);
    totals.set(job.jobType, existing);
  }

  return [...totals.entries()]
    .sort((left, right) => {
      if (right[1].revenue !== left[1].revenue) {
        return right[1].revenue - left[1].revenue;
      }
      return right[1].jobCount - left[1].jobCount;
    })
    .slice(0, 5)
    .map(([jobType, entry]) => ({
      id: jobType,
      label: jobType,
      detail: `${entry.jobCount} job${entry.jobCount === 1 ? "" : "s"}`,
      value: formatCurrency(entry.revenue),
    }));
}

function buildOverdueInvoices(invoices: Invoice[]): ReportSnapshotRow[] {
  return invoices
    .filter((invoice) => isActiveInvoice(invoice) && invoice.status === "overdue")
    .sort((left, right) => right.balanceDue - left.balanceDue)
    .slice(0, 5)
    .map((invoice) => ({
      id: invoice.id,
      label: invoice.customerName,
      detail: invoice.invoiceNumber,
      value: formatCurrency(invoice.balanceDue),
    }));
}

function buildWorkCompletedSnapshot(
  jobs: Job[],
  dateBounds: ProfitabilityReportDateBounds,
): ReportSnapshotRow[] {
  const completedJobs = jobs.filter((job) => jobCompletedInBounds(job, dateBounds));
  const completionDurations: number[] = [];

  for (const job of completedJobs) {
    if (!job.completedAt || !job.workStartedAt) {
      continue;
    }

    const started = new Date(job.workStartedAt).getTime();
    const completed = new Date(job.completedAt).getTime();
    if (Number.isFinite(started) && Number.isFinite(completed) && completed > started) {
      completionDurations.push((completed - started) / (1000 * 60 * 60));
    }
  }

  const averageHours =
    completionDurations.length > 0
      ? Math.round(
          (completionDurations.reduce((sum, hours) => sum + hours, 0) /
            completionDurations.length) *
            10,
        ) / 10
      : null;

  const technicianCounts = new Map<string, number>();
  for (const job of completedJobs) {
    if (!job.assignedTechnicianId) {
      continue;
    }
    technicianCounts.set(
      job.assignedTechnicianId,
      (technicianCounts.get(job.assignedTechnicianId) ?? 0) + 1,
    );
  }

  const rows: ReportSnapshotRow[] = [
    {
      id: "completed-count",
      label: "Completed jobs",
      detail: "In selected period",
      value: String(completedJobs.length),
    },
  ];

  if (averageHours != null) {
    rows.push({
      id: "avg-completion",
      label: "Avg completion time",
      detail: "Work started to completed",
      value: `${averageHours}h`,
    });
  }

  const topTechnician = [...technicianCounts.entries()].sort(
    (left, right) => right[1] - left[1],
  )[0];

  if (topTechnician) {
    const job = completedJobs.find(
      (item) => item.assignedTechnicianId === topTechnician[0],
    );
    rows.push({
      id: "top-technician",
      label: "Top completions",
      detail: job?.assignedTechnician?.trim() || "Technician",
      value: String(topTechnician[1]),
    });
  }

  return rows.slice(0, 4);
}

function buildOperationsSnapshot(
  datasets: ReportRawDatasets,
  dateBounds: ProfitabilityReportDateBounds,
): ReportOperationsSnapshot {
  const { invoices, payments, jobs } = datasets;

  return {
    topCustomers: buildTopCustomers(payments, invoices, dateBounds),
    topServiceCategories: buildTopServiceCategories(
      jobs,
      payments,
      invoices,
      dateBounds,
    ),
    overdueInvoices: buildOverdueInvoices(invoices),
    workCompleted: buildWorkCompletedSnapshot(jobs, dateBounds),
  };
}

function daysBetweenDates(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate).getTime();
  const end = parseDateOnly(endDate).getTime();
  return Math.max(0, Math.floor((end - start) / (1000 * 60 * 60 * 24)));
}

function buildInvoiceAging(invoices: Invoice[]) {
  const buckets = [
    { label: "Current", count: 0, amount: 0 },
    { label: "1–30 days", count: 0, amount: 0 },
    { label: "31–60 days", count: 0, amount: 0 },
    { label: "61+ days", count: 0, amount: 0 },
  ];

  const today = toDateOnly(new Date());

  for (const invoice of invoices) {
    if (!isActiveInvoice(invoice) || invoice.balanceDue <= 0) {
      continue;
    }

    const daysPastDue = daysBetweenDates(invoice.dueDate, today);
    let bucketIndex = 0;

    if (daysPastDue > 60) {
      bucketIndex = 3;
    } else if (daysPastDue > 30) {
      bucketIndex = 2;
    } else if (daysPastDue > 0) {
      bucketIndex = 1;
    }

    buckets[bucketIndex].count += 1;
    buckets[bucketIndex].amount = roundCurrency(
      buckets[bucketIndex].amount + invoice.balanceDue,
    );
  }

  return buckets;
}

function buildAccountantSummary(
  companyName: string,
  dateRange: ReportsPageDateRange,
  dateBounds: ProfitabilityReportDateBounds,
  datasets: ReportRawDatasets,
): AccountantSummaryData {
  const { invoices, payments, expenses } = datasets;
  const activeInvoices = invoices.filter(isActiveInvoice);
  const scopedInvoices = activeInvoices.filter((invoice) =>
    isDateWithinReportBounds(invoice.issueDate, dateBounds),
  );
  const scopedPayments = paymentsInBounds(payments, dateBounds);
  const scopedExpenses = expenses.filter((expense) => {
    const reportDate = resolveExpenseReportDate(expense);
    return (
      isDateWithinReportBounds(reportDate, dateBounds) &&
      (expense.status === "approved" || expense.status === "reimbursed")
    );
  });

  const totalInvoiceValue = roundCurrency(
    scopedInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
  );
  const totalPaymentsCollected = collectedRevenueInBounds(payments, dateBounds);
  const outstandingBalance = roundCurrency(
    activeInvoices
      .filter((invoice) => invoice.balanceDue > 0)
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0),
  );
  const overdueBalance = roundCurrency(
    activeInvoices
      .filter((invoice) => invoice.status === "overdue")
      .reduce((sum, invoice) => sum + invoice.balanceDue, 0),
  );
  const salesTaxCollected = roundCurrency(
    scopedPayments.reduce((sum, payment) => {
      const invoice = activeInvoices.find((item) => item.id === payment.invoiceId);
      if (!invoice || invoice.total <= 0) {
        return sum;
      }

      const taxShare = (invoice.taxAmount ?? 0) * (payment.amount / invoice.total);
      return sum + taxShare;
    }, 0),
  );
  const expensesRecorded = roundCurrency(
    scopedExpenses.reduce((sum, expense) => sum + expenseAmount(expense), 0),
  );
  const netIncomeEstimate = roundCurrency(
    totalPaymentsCollected - expensesRecorded,
  );

  const methodTotals = new Map<string, { amount: number; count: number }>();
  for (const payment of scopedPayments) {
    const label = formatPaymentMethod(payment.paymentMethod);
    const existing = methodTotals.get(label) ?? { amount: 0, count: 0 };
    existing.amount = roundCurrency(existing.amount + payment.amount);
    existing.count += 1;
    methodTotals.set(label, existing);
  }

  return {
    companyName,
    dateRange,
    dateBounds,
    totalInvoiceValue,
    totalPaymentsCollected,
    outstandingBalance,
    overdueBalance,
    salesTaxCollected,
    expensesRecorded,
    netIncomeEstimate,
    paymentsByMethod: [...methodTotals.entries()].map(([method, totals]) => ({
      method,
      amount: totals.amount,
      count: totals.count,
    })),
    revenueByCustomer: buildTopCustomers(payments, invoices, dateBounds),
    revenueByServiceCategory: buildTopServiceCategories(
      datasets.jobs,
      payments,
      invoices,
      dateBounds,
    ),
    invoiceAging: buildInvoiceAging(activeInvoices),
  };
}

export function buildReportsPageData(input: {
  companyName: string;
  dateRange: ReportsPageDateRange;
  datasets: ReportRawDatasets;
  showTechnicianProfitability: boolean;
}): ReportsPageData {
  const dateBounds =
    resolveReportDateBounds(input.dateRange) ??
    resolveProfitabilityReportDateBounds(input.dateRange);
  const previousBounds = resolvePreviousReportDateBounds(dateBounds);

  const limitations = [
    ...input.datasets.chartSeries.meta.limitations,
    ...input.datasets.chartSeries.revenue.limitations,
    "Outstanding invoice balances reflect current open amounts, not limited to the selected period.",
    "Estimate close rate compares approved estimates to estimates sent in the selected period.",
    "Collection rate compares payments collected in period to invoice totals issued in period.",
  ];

  const technicianProfitability = input.showTechnicianProfitability
    ? buildTechnicianProfitability(input.datasets, dateBounds)
    : [];

  if (
    input.showTechnicianProfitability &&
    technicianProfitability.some((entry) => !entry.profitAvailable)
  ) {
    limitations.push(
      "Technician gross profit requires labor cost rates on team member profiles.",
    );
  }

  return {
    dateRange: input.dateRange,
    dateBounds,
    kpis: buildKpis(input.datasets, dateBounds, previousBounds),
    revenueTrend: buildRevenueTrend(input.datasets.chartSeries),
    cashHealth: buildCashHealth(
      input.datasets.invoices,
      input.datasets.payments,
      dateBounds,
    ),
    salesFunnel: buildSalesFunnel(input.datasets, dateBounds),
    technicianProfitability,
    showTechnicianProfitability: input.showTechnicianProfitability,
    operationsSnapshot: buildOperationsSnapshot(input.datasets, dateBounds),
    accountantSummary: buildAccountantSummary(
      input.companyName,
      input.dateRange,
      dateBounds,
      input.datasets,
    ),
    leadPipeline: buildLeadPipelineMetrics(input.datasets.leads),
    limitations,
  };
}

export type MemberWorkSummary = {
  jobsCompleted: number;
  revenue: number;
  laborHours: number;
  laborCost: number | null;
  grossProfit: number | null;
  margin: number | null;
  profitAvailable: boolean;
};

export function buildMemberWorkSummary(
  technicianId: string,
  datasets: Pick<
    ReportRawDatasets,
    "jobs" | "payments" | "invoices" | "laborEntries" | "laborCostRates"
  >,
  dateBounds: ProfitabilityReportDateBounds,
): MemberWorkSummary {
  const { jobs, payments, invoices, laborEntries, laborCostRates } = datasets;
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));

  let jobsCompleted = 0;
  let revenue = 0;
  let laborHours = 0;

  for (const job of jobs) {
    if (
      job.assignedTechnicianId !== technicianId ||
      !jobCompletedInBounds(job, dateBounds)
    ) {
      continue;
    }

    jobsCompleted += 1;
  }

  for (const payment of paymentsInBounds(payments, dateBounds)) {
    const invoice = invoiceById.get(payment.invoiceId);
    if (!invoice?.jobId) {
      continue;
    }

    const job = jobs.find((item) => item.id === invoice.jobId);
    if (job?.assignedTechnicianId !== technicianId) {
      continue;
    }

    revenue = roundCurrency(revenue + payment.amount);
  }

  for (const entry of laborEntries) {
    if (entry.technicianId !== technicianId) {
      continue;
    }

    if (!isDateWithinReportBounds(entry.startedAt, dateBounds)) {
      continue;
    }

    const minutes = resolveClosedJobLaborMinutes(entry);
    if (minutes == null) {
      continue;
    }

    laborHours = roundJobMaterialAmount(laborHours + minutes / 60);
  }

  const hourlyRate = laborCostRates.get(technicianId);
  const profitAvailable = hourlyRate != null && hourlyRate >= 0;
  const laborCost =
    profitAvailable && laborHours > 0
      ? roundCurrency(laborHours * hourlyRate!)
      : profitAvailable
        ? 0
        : null;
  const grossProfit =
    profitAvailable && laborCost != null
      ? roundCurrency(revenue - laborCost)
      : null;
  const margin =
    profitAvailable && grossProfit != null && revenue > 0
      ? Math.round((grossProfit / revenue) * 1000) / 10
      : null;

  return {
    jobsCompleted,
    revenue,
    laborHours,
    laborCost,
    grossProfit,
    margin,
    profitAvailable,
  };
}
