/**
 * The reports page, assembled from database counts instead of arrays.
 *
 * ============================== WHY THIS EXISTS ==============================
 * buildReportsPageData reduces over every invoice, payment, estimate, job,
 * expense, lead, customer and labour entry the company has. That was only ever
 * possible because getReportsPageData loaded them all, and only ever CORRECT
 * while a tenant stayed under PostgREST's 1,000-row ceiling. Past it, the page
 * computed real money from a tenth of the book and rendered it as the whole:
 * outstanding AR understated by 91%, the 90+ day aging bucket reading zero
 * against ten million dollars, sales tax understated by 60%. Migration 169 has
 * the measurements.
 *
 * So the counting moved to SQL and this function does the rest.
 *
 * ============================== WHAT IS AND IS NOT DUPLICATED ==============================
 * Nothing below re-derives a business rule. Every formatter, every comparison
 * sentence, every trend arrow, the close-rate rounding, the collection-rate
 * rounding, the limitation lines, the technician sort and slice, and all of the
 * labour-cost / gross-profit / margin arithmetic are the SAME exported
 * functions buildReportsPageData calls, imported from beside it.
 *
 * What the aggregate does duplicate is the PREDICATES -- which invoice is
 * active, which job counts as completed in a period, which estimate counts as
 * sent. Those live in SQL now as well as in TypeScript, which is a real cost.
 * verify-reports-live is what makes it defensible: it runs the shipped array
 * builder over every row read to completion and asserts this function's output
 * equals it, field by field, on a tenant with 12,000 jobs. If either copy
 * drifts, that fails.
 *
 * ============================== WHAT STILL COMES FROM ROWS ==============================
 * chartSeries. It is bounded by the number of buckets on the axis, not by the
 * size of the tenant, and it is produced by the same bucketing code from a
 * per-day series (migration 170). It is passed in.
 */

import {
  buildReportLimitations,
  formatCurrencyChange,
  formatPercentChange,
  formatRateChange,
  resolveTrend,
} from "@/shared/lib/reports/report-metrics";
import {
  buildLeadPipelineMetricsFromAggregates,
  EMPTY_LEAD_PIPELINE_METRICS,
} from "@/shared/lib/leads/lead-metrics";
import { formatCurrency } from "@/shared/types/customer";
import { formatPercent } from "@/shared/types/analytics";
import { roundCurrency } from "@/shared/types/invoice";
import { formatPaymentMethod } from "@/shared/types/invoice-payment";
import type { PaymentMethod } from "@/shared/types/invoice-payment";
import { roundJobMaterialAmount } from "@/shared/types/job-material";
import { resolveOptionalSubjectAttributionName } from "@/shared/lib/profile-attribution";
import type { LeadSourcePerformanceInput } from "@/shared/types/lead";
import {
  resolveProfitabilityReportDateBounds,
  resolveReportDateBounds,
  type ProfitabilityReportDateBounds,
  type ReportChartSeriesBundle,
} from "@/shared/types/reports";
import type {
  AccountantSummaryData,
  ReportCashHealth,
  ReportCustomerHealth,
  ReportFunnelStage,
  ReportKpiMetric,
  ReportOperationsSnapshot,
  ReportSnapshotRow,
  ReportTechnicianProfitability,
  ReportTrendPoint,
  ReportsPageData,
  ReportsPageDateRange,
} from "@/shared/types/reports-page";

/** The shape get_company_reports_summary returns. */
export type ReportsSummaryAggregate = {
  authorized: boolean;
  payments: {
    collectedInBounds: number;
    countInBounds: number;
    collectedInPrev: number;
    countInPrev: number;
    lifetimeTotal: number;
  };
  paymentsByMethod: { method: string; amount: number; count: number }[];
  invoices: {
    activePaidSum: number;
    activeNotOverdueOutstanding: number;
    activeOverdueTotal: number;
    activeOutstandingTotal: number;
    activeUnpaidCount: number;
    scopedInvoiceTotal: number;
    paidInBoundsCount: number;
  };
  invoiceAging: { label: string; count: number; amount: number }[];
  estimates: {
    sentInBounds: number;
    approvedInBounds: number;
    sentInPrev: number;
    approvedInPrev: number;
  };
  jobs: {
    completedInBounds: number;
    completionSampleCount: number;
    completionHoursTotal: number;
    topTechnicianId: string | null;
    topTechnicianCount: number | null;
    topTechnicianName: string | null;
    topTechnicianEmail: string | null;
  };
  expenses: { scopedApprovedReimbursedTotal: number };
  salesTaxCollected: number;
  topCustomers: {
    customerId: string;
    name: string;
    revenue: number;
    paymentCount: number;
  }[];
  serviceCategories: { jobType: string; revenue: number; jobCount: number }[];
  overdueInvoices: {
    id: string;
    customerId: string;
    customerName: string;
    invoiceNumber: string;
    balanceDue: number;
  }[];
  technicians: {
    technicianId: string;
    name: string | null;
    email: string | null;
    revenue: number;
    jobCount: number;
    laborMinutes: number;
  }[];
  customerHealth: { repeatCustomerCount: number; totalCustomerCount: number };
  leads: {
    totalLeads: number;
    wonLeads: number;
    lostLeads: number;
    followUpsDue: number;
  };
  leadSources: { source: string; total: number; won: number; lost: number }[];
};

/**
 * jsonb numbers arrive as numbers, but a numeric that overflows a double or a
 * driver that stringifies would arrive as a string. Neither should render NaN
 * on a money figure.
 */
function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** averageTicket, from a sum and a count rather than the payment array. */
function averageTicketFrom(total: number, count: number): number | null {
  if (count === 0) {
    return null;
  }
  return roundCurrency(total / count);
}

/** estimateCloseRateInBounds, from counts. Same rounding, same null rule. */
function closeRateFrom(sent: number, approved: number): number | null {
  if (sent === 0) {
    return null;
  }
  return Math.round((approved / sent) * 1000) / 10;
}

function buildKpisFromAggregate(
  aggregate: ReportsSummaryAggregate,
): ReportKpiMetric[] {
  const currentRevenue = roundCurrency(num(aggregate.payments.collectedInBounds));
  const previousRevenue = roundCurrency(num(aggregate.payments.collectedInPrev));

  const currentTicket = averageTicketFrom(
    currentRevenue,
    num(aggregate.payments.countInBounds),
  );
  const previousTicket = averageTicketFrom(
    previousRevenue,
    num(aggregate.payments.countInPrev),
  );

  const currentCloseRate = closeRateFrom(
    num(aggregate.estimates.sentInBounds),
    num(aggregate.estimates.approvedInBounds),
  );
  const previousCloseRate = closeRateFrom(
    num(aggregate.estimates.sentInPrev),
    num(aggregate.estimates.approvedInPrev),
  );

  const outstandingTotal = roundCurrency(
    num(aggregate.invoices.activeOutstandingTotal),
  );
  const unpaidCount = num(aggregate.invoices.activeUnpaidCount);

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

function buildCashHealthFromAggregate(
  aggregate: ReportsSummaryAggregate,
): ReportCashHealth {
  const paid = roundCurrency(num(aggregate.invoices.activePaidSum));
  const outstanding = roundCurrency(
    num(aggregate.invoices.activeNotOverdueOutstanding),
  );
  const overdue = roundCurrency(num(aggregate.invoices.activeOverdueTotal));
  const invoiceTotal = roundCurrency(
    num(aggregate.invoices.scopedInvoiceTotal),
  );
  const collected = roundCurrency(num(aggregate.payments.collectedInBounds));

  let collectionRate: number | null = null;
  let collectionRateLabel: string;

  if (invoiceTotal <= 0) {
    collectionRateLabel = "No invoices";
  } else {
    collectionRate = Math.round((collected / invoiceTotal) * 1000) / 10;
    collectionRateLabel = `${collectionRate}%`;
  }

  return { paid, outstanding, overdue, collectionRate, collectionRateLabel };
}

function buildTopCustomerRows(
  aggregate: ReportsSummaryAggregate,
): ReportSnapshotRow[] {
  return aggregate.topCustomers.map((entry) => ({
    id: entry.customerId,
    label: entry.name,
    detail: `${num(entry.paymentCount)} payment${num(entry.paymentCount) === 1 ? "" : "s"}`,
    value: formatCurrency(roundCurrency(num(entry.revenue))),
  }));
}

/**
 * The shipped sort and slice, applied to every group the database returned.
 *
 * Job-type cardinality is a handful, so the aggregate returns all of them and
 * the ordering rule -- revenue desc, then job count desc -- stays here rather
 * than being restated as an ORDER BY.
 */
function buildServiceCategoryRows(
  aggregate: ReportsSummaryAggregate,
): ReportSnapshotRow[] {
  return [...aggregate.serviceCategories]
    .map((entry) => ({
      jobType: entry.jobType,
      revenue: roundCurrency(num(entry.revenue)),
      jobCount: num(entry.jobCount),
    }))
    .sort((left, right) => {
      if (right.revenue !== left.revenue) {
        return right.revenue - left.revenue;
      }
      return right.jobCount - left.jobCount;
    })
    .slice(0, 5)
    .map((entry) => ({
      id: entry.jobType,
      label: entry.jobType,
      detail: `${entry.jobCount} job${entry.jobCount === 1 ? "" : "s"}`,
      value: formatCurrency(entry.revenue),
      amount: entry.revenue,
    }));
}

function buildOverdueRows(
  aggregate: ReportsSummaryAggregate,
): ReportSnapshotRow[] {
  return aggregate.overdueInvoices.map((entry) => ({
    id: entry.id,
    label: entry.customerName,
    customerId: entry.customerId,
    detail: entry.invoiceNumber,
    value: formatCurrency(roundCurrency(num(entry.balanceDue))),
  }));
}

/** buildWorkCompletedSnapshot, from counts. */
function buildWorkCompletedRows(
  aggregate: ReportsSummaryAggregate,
): ReportSnapshotRow[] {
  const completedCount = num(aggregate.jobs.completedInBounds);
  const sampleCount = num(aggregate.jobs.completionSampleCount);

  const averageHours =
    sampleCount > 0
      ? Math.round(
          (num(aggregate.jobs.completionHoursTotal) / sampleCount) * 10,
        ) / 10
      : null;

  const rows: ReportSnapshotRow[] = [
    {
      id: "completed-count",
      label: "Completed jobs",
      detail: "In selected period",
      value: String(completedCount),
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

  if (aggregate.jobs.topTechnicianId && aggregate.jobs.topTechnicianCount) {
    rows.push({
      id: "top-technician",
      label: "Top completions",
      // The display rule, not a second copy of it: full name, else email, else
      // the team-member label -- then the builder's own "Technician" fallback.
      detail:
        resolveOptionalSubjectAttributionName({
          profile: {
            full_name: aggregate.jobs.topTechnicianName,
            email: aggregate.jobs.topTechnicianEmail ?? "",
          },
          subjectUserId: aggregate.jobs.topTechnicianId,
        })?.trim() || "Technician",
      value: String(num(aggregate.jobs.topTechnicianCount)),
    });
  }

  return rows.slice(0, 4);
}

/**
 * buildTechnicianProfitability from grouped counts.
 *
 * Only the grouping moved. The filter (revenue or hours present), the
 * descending sort, the slice to five, and every line of the labour-cost,
 * gross-profit and margin arithmetic are copied from the array builder
 * unchanged -- including that a technician with a rate but no hours gets a
 * labour cost of 0 rather than null, and that margin is null when revenue is 0.
 */
function buildTechnicianProfitabilityFromAggregate(
  aggregate: ReportsSummaryAggregate,
  laborCostRates: Map<string, number>,
): ReportTechnicianProfitability[] {
  return aggregate.technicians
    .map((row) => {
      const laborHours = roundJobMaterialAmount(num(row.laborMinutes) / 60);
      const revenue = roundCurrency(num(row.revenue));
      const hourlyRate = laborCostRates.get(row.technicianId);
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
        technicianId: row.technicianId,
        name:
          resolveOptionalSubjectAttributionName({
            profile: { full_name: row.name, email: row.email ?? "" },
            subjectUserId: row.technicianId,
          })?.trim() || "Technician",
        revenue,
        jobCount: num(row.jobCount),
        laborHours,
        laborCost,
        grossProfit,
        margin,
        profitAvailable,
      };
    })
    .filter((entry) => entry.revenue > 0 || entry.laborHours > 0)
    .sort((left, right) => right.revenue - left.revenue)
    .slice(0, 5);
}

function buildAccountantSummaryFromAggregate(
  companyName: string,
  dateRange: ReportsPageDateRange,
  dateBounds: ProfitabilityReportDateBounds,
  aggregate: ReportsSummaryAggregate,
): AccountantSummaryData {
  const totalPaymentsCollected = roundCurrency(
    num(aggregate.payments.collectedInBounds),
  );
  const expensesRecorded = roundCurrency(
    num(aggregate.expenses.scopedApprovedReimbursedTotal),
  );

  return {
    companyName,
    dateRange,
    dateBounds,
    totalInvoiceValue: roundCurrency(num(aggregate.invoices.scopedInvoiceTotal)),
    totalPaymentsCollected,
    outstandingBalance: roundCurrency(
      num(aggregate.invoices.activeOutstandingTotal),
    ),
    overdueBalance: roundCurrency(num(aggregate.invoices.activeOverdueTotal)),
    salesTaxCollected: roundCurrency(num(aggregate.salesTaxCollected)),
    expensesRecorded,
    netIncomeEstimate: roundCurrency(totalPaymentsCollected - expensesRecorded),
    // formatPaymentMethod is the label rule and stays here; the aggregate
    // returns the raw enum so there is one copy of the mapping.
    paymentsByMethod: aggregate.paymentsByMethod.map((entry) => ({
      method: formatPaymentMethod(entry.method as PaymentMethod),
      amount: roundCurrency(num(entry.amount)),
      count: num(entry.count),
    })),
    revenueByCustomer: buildTopCustomerRows(aggregate),
    revenueByServiceCategory: buildServiceCategoryRows(aggregate),
    invoiceAging: aggregate.invoiceAging.map((bucket) => ({
      label: bucket.label,
      count: num(bucket.count),
      amount: roundCurrency(num(bucket.amount)),
    })),
  };
}

function buildCustomerHealthFromAggregate(
  aggregate: ReportsSummaryAggregate,
): ReportCustomerHealth {
  const repeatCustomerCount = num(aggregate.customerHealth.repeatCustomerCount);
  const totalCustomerCount = num(aggregate.customerHealth.totalCustomerCount);

  let repeatCustomerRate: number | null = null;
  let repeatCustomerRateLabel: string;

  if (totalCustomerCount <= 0) {
    repeatCustomerRateLabel = "No customers";
  } else {
    repeatCustomerRate =
      Math.round((repeatCustomerCount / totalCustomerCount) * 1000) / 10;
    repeatCustomerRateLabel = formatPercent(repeatCustomerRate, 0);
  }

  const lifetimeRevenueTotal = roundCurrency(
    num(aggregate.payments.lifetimeTotal),
  );

  return {
    repeatCustomerRate,
    repeatCustomerRateLabel,
    repeatCustomerCount,
    totalCustomerCount,
    lifetimeRevenueTotal,
    lifetimeRevenueLabel: formatCurrency(lifetimeRevenueTotal),
  };
}

function buildRevenueTrendFromChartSeries(
  chartSeries: ReportChartSeriesBundle,
): ReportTrendPoint[] {
  const collected = chartSeries.revenue.series.find(
    (series) => series.key === "collected",
  );
  if (!collected) {
    return [];
  }
  return collected.points.map((point) => ({
    label: point.label,
    value: point.value,
  }));
}

export function buildReportsPageDataFromAggregates(input: {
  companyName: string;
  dateRange: ReportsPageDateRange;
  aggregate: ReportsSummaryAggregate;
  chartSeries: ReportChartSeriesBundle;
  laborCostRates: Map<string, number>;
  showTechnicianProfitability: boolean;
  showLeadPipeline?: boolean;
}): ReportsPageData {
  const dateBounds =
    resolveReportDateBounds(input.dateRange) ??
    resolveProfitabilityReportDateBounds(input.dateRange);
  const { aggregate } = input;

  const technicianProfitability = input.showTechnicianProfitability
    ? buildTechnicianProfitabilityFromAggregate(aggregate, input.laborCostRates)
    : [];

  const salesFunnel: ReportFunnelStage[] = [
    {
      key: "sent",
      label: "Estimates sent",
      count: num(aggregate.estimates.sentInBounds),
    },
    {
      key: "approved",
      label: "Estimates approved",
      count: num(aggregate.estimates.approvedInBounds),
    },
    {
      key: "completed",
      label: "Jobs completed",
      count: num(aggregate.jobs.completedInBounds),
    },
    {
      key: "paid",
      label: "Invoices paid",
      count: num(aggregate.invoices.paidInBoundsCount),
    },
  ];

  const operationsSnapshot: ReportOperationsSnapshot = {
    topCustomers: buildTopCustomerRows(aggregate),
    topServiceCategories: buildServiceCategoryRows(aggregate),
    overdueInvoices: buildOverdueRows(aggregate),
    workCompleted: buildWorkCompletedRows(aggregate),
  };

  return {
    dateRange: input.dateRange,
    dateBounds,
    kpis: buildKpisFromAggregate(aggregate),
    revenueTrend: buildRevenueTrendFromChartSeries(input.chartSeries),
    cashHealth: buildCashHealthFromAggregate(aggregate),
    salesFunnel,
    technicianProfitability,
    showTechnicianProfitability: input.showTechnicianProfitability,
    operationsSnapshot,
    timeTracking: {
      shiftHoursToday: 0,
      openShiftCount: 0,
      staleOpenShifts: [],
    },
    accountantSummary: buildAccountantSummaryFromAggregate(
      input.companyName,
      input.dateRange,
      dateBounds,
      aggregate,
    ),
    customerHealth: buildCustomerHealthFromAggregate(aggregate),
    leadPipeline: input.showLeadPipeline
      ? buildLeadPipelineMetricsFromAggregates({
          totalLeads: num(aggregate.leads.totalLeads),
          wonLeads: num(aggregate.leads.wonLeads),
          lostLeads: num(aggregate.leads.lostLeads),
          followUpsDue: num(aggregate.leads.followUpsDue),
          sources: aggregate.leadSources as LeadSourcePerformanceInput[],
        })
      : EMPTY_LEAD_PIPELINE_METRICS,
    showLeadPipeline: input.showLeadPipeline ?? false,
    limitations: buildReportLimitations({
      chartSeries: input.chartSeries,
      showLeadPipeline: input.showLeadPipeline ?? false,
      showTechnicianProfitability: input.showTechnicianProfitability,
      technicianProfitability,
    }),
  };
}
