import { listExpenses } from "@/lib/database/queries/expenses";
import { listInvoicePayments } from "@/lib/database/queries/invoice-payments";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listDispatchJobsForToday } from "@/lib/database/queries/dispatch";
import { listEstimates } from "@/lib/database/queries/estimates";
import { listInvoicesWithBillingSync } from "@/lib/database/services/invoice-billing";
import { listJobs } from "@/lib/database/queries/jobs";
import { listLeads } from "@/lib/database/queries/leads";
import {
  listCompanyJobLaborEntries,
  listOpenClockEntriesForCompany,
  listTodayTimeEntriesForCompany,
} from "@/lib/database/queries/time-entries";
import { createClient } from "@/lib/supabase/server";
import { listTimeClockEntries } from "@/lib/database/queries/time-clock";
import { getCompanyReportChartSeries } from "@/lib/database/services/reports/report-chart-series";
import { getCompanyOperationalInconsistenciesReport } from "@/lib/database/services/reports/operational-inconsistencies-report";
import { buildReportsPageData } from "@/shared/lib/reports/report-metrics";
import type {
  ReportsPageData,
  ReportsPageDateRange,
} from "@/shared/types/reports-page";
import { getDailyOperationsSummary } from "@/lib/database/services/operations/daily-operations-summary";
import { getTodayOperationsSummary } from "@/shared/types/dashboard";
import type { JobStatus } from "@/shared/types/job";
import {
  getInvoiceSummary,
  hasInvoiceUnpaidBalance,
  isActiveInvoice,
} from "@/shared/types/invoice";
import type { ReportsFoundationData } from "@/shared/types/reports-foundation";
import { roundJobMaterialAmount } from "@/shared/types/job-material";
import { summarizeTodayEntries } from "@/shared/types/time-entry";


const TIME_RELATED_INCONSISTENCY_KINDS = new Set([
  "open_labor_on_cancelled_job",
]);

const CLOSED_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  "completed",
  "cancelled",
]);

const RECENT_TIME_CLOCK_LIMIT = 10;
const TIME_CLOCK_FETCH_LIMIT = 100;
const STALE_OPEN_SHIFT_HOURS = 12;

async function listTechnicianLaborCostRates(
  companyId: string,
): Promise<Map<string, number>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_memberships")
    .select("user_id, labor_cost_rate_cents")
    .eq("company_id", companyId)
    .eq("status", "active")
    .not("user_id", "is", null);

  if (error) {
    console.error("[listTechnicianLaborCostRates] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return new Map();
  }

  const rates = new Map<string, number>();

  for (const row of data ?? []) {
    if (
      row.user_id &&
      row.labor_cost_rate_cents != null &&
      row.labor_cost_rate_cents >= 0
    ) {
      rates.set(row.user_id, row.labor_cost_rate_cents / 100);
    }
  }

  return rates;
}

export async function getReportsPageData(
  companyId: string,
  companyName: string,
  dateRange: ReportsPageDateRange,
  options: {
    showTechnicianPerformance?: boolean;
    showLeadPipeline?: boolean;
    timeZone?: string;
  } = {},
): Promise<ReportsPageData> {
  const showLeadPipeline = options.showLeadPipeline ?? false;

  const [invoices, payments, estimates, jobs, expenses, leads, chartSeries, laborEntries, laborCostRates] =
    await Promise.all([
      listInvoices(companyId),
      listInvoicePayments(companyId),
      listEstimates(companyId),
      listJobs(companyId),
      listExpenses(companyId),
      showLeadPipeline ? listLeads(companyId) : Promise.resolve([]),
      getCompanyReportChartSeries(companyId, { dateRange }),
      listCompanyJobLaborEntries(companyId),
      listTechnicianLaborCostRates(companyId),
    ]);

  return buildReportsPageData({
    companyName,
    dateRange,
    showTechnicianProfitability: options.showTechnicianPerformance ?? true,
    showLeadPipeline,
    timeZone: options.timeZone,
    datasets: {
      invoices,
      payments,
      estimates,
      jobs,
      expenses,
      leads,
      chartSeries,
      laborEntries,
      laborCostRates,
    },
  });
}

export async function getReportsFoundationData(
  companyId: string,
  timeZone?: string,
): Promise<ReportsFoundationData> {
  const [jobs, invoices, estimates, timeClockEntries, openClockEntries, todayJobs, operations, laborEntries, todayTimeEntries, inconsistenciesReport] =
    await Promise.all([
      listJobs(companyId),
      listInvoicesWithBillingSync(companyId, timeZone),
      listEstimates(companyId),
      listTimeClockEntries(companyId, { limit: TIME_CLOCK_FETCH_LIMIT }),
      listOpenClockEntriesForCompany(companyId),
      listDispatchJobsForToday(companyId, { timeZone }),
      getDailyOperationsSummary(companyId, timeZone),
      listCompanyJobLaborEntries(companyId),
      listTodayTimeEntriesForCompany(companyId, timeZone),
      getCompanyOperationalInconsistenciesReport(companyId),
    ]);

  const todayJobsSummary = getTodayOperationsSummary(todayJobs);
  const openJobs = jobs.filter((job) => !CLOSED_JOB_STATUSES.has(job.status));
  const activeInvoices = invoices.filter(isActiveInvoice);
  const unpaidInvoices = activeInvoices.filter(hasInvoiceUnpaidBalance);
  const overdueInvoices = activeInvoices.filter(
    (invoice) => invoice.status === "overdue",
  );
  const invoiceTotals = getInvoiceSummary(invoices);
  const clockedInUsers = openClockEntries.map((entry) => ({
    id: entry.id,
    companyId: entry.companyId,
    userId: entry.technicianId,
    userName: entry.technicianName,
    clockInAt: entry.startedAt,
    clockOutAt: entry.endedAt,
    status: "open" as const,
    notes: entry.notes,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }));
  const activeLaborEntries = laborEntries.filter((entry) => entry.endedAt == null);
  const openBreakEntries = todayTimeEntries.filter(
    (entry) => entry.entryType === "break" && entry.endedAt == null,
  );
  const todayTimeSummary = summarizeTodayEntries(todayTimeEntries);
  const totalHoursToday = roundJobMaterialAmount(
    todayTimeSummary.clockMinutes / 60,
  );
  const now = Date.now();
  const staleOpenShifts = openClockEntries
    .map((entry) => ({
      id: entry.id,
      technicianName: entry.technicianName,
      startedAt: entry.startedAt,
      elapsedHours: Math.max(
        0,
        Math.round(((now - new Date(entry.startedAt).getTime()) / 3_600_000) * 10) /
          10,
      ),
    }))
    .filter((entry) => entry.elapsedHours >= STALE_OPEN_SHIFT_HOURS);
  const startedTodayTechnicians = new Set(
    todayTimeEntries
      .filter((entry) => entry.entryType === "clock")
      .map((entry) => entry.technicianId),
  );
  const timeExceptions = inconsistenciesReport.summary.entries.filter(
    (entry) => TIME_RELATED_INCONSISTENCY_KINDS.has(entry.kind),
  );

  return {
    jobs: {
      jobsToday: todayJobsSummary.totalJobsToday,
      openJobs: openJobs.length,
      completedJobs: jobs.filter((job) => job.status === "completed").length,
      unassignedJobs: openJobs.filter((job) => !job.assignedTechnicianId).length,
    },
    invoices: {
      unpaidCount: unpaidInvoices.length,
      unpaidTotal: invoiceTotals.unpaidTotal,
      paidTotal: invoiceTotals.paidTotal,
      overdueCount: overdueInvoices.length,
      overdueTotal: invoiceTotals.overdueTotal,
    },
    estimates: {
      draftCount: estimates.filter((estimate) => estimate.status === "draft")
        .length,
      sentCount: estimates.filter((estimate) => estimate.status === "sent")
        .length,
      approvedCount: estimates.filter(
        (estimate) => estimate.status === "approved",
      ).length,
    },
    labor: {
      currentlyWorkingCount: activeLaborEntries.length,
      currentlyWorking: activeLaborEntries.map((entry) => ({
        id: entry.id,
        technicianName: entry.technicianName,
        jobNumber: entry.jobNumber,
        startedAt: entry.startedAt,
      })),
      startedTodayCount: startedTodayTechnicians.size,
      totalHoursToday,
      openEntryCount:
        clockedInUsers.length + activeLaborEntries.length + openBreakEntries.length,
      exceptionCount: timeExceptions.length + staleOpenShifts.length,
      staleOpenShifts,
    },
    timeClock: {
      clockedInCount: clockedInUsers.length,
      clockedInUsers,
      recentEntries: timeClockEntries.slice(0, RECENT_TIME_CLOCK_LIMIT),
    },
    operations: {
      highlights: operations.highlights,
      todayCollectedRevenue: operations.sections.revenue.todayCollectedRevenue,
      todayPaymentCount: operations.sections.revenue.todayPaymentCount,
      openJobs: operations.sections.openJobs.count,
      stalledJobs: operations.sections.stalledJobs.count,
      pendingExpenseCount: operations.sections.pendingExpenses.count,
      activeLaborEntries:
        operations.sections.activeTechnicians.activeLaborEntries,
      completedAwaitingInvoicing:
        operations.sections.completedAwaitingInvoicing.count,
    },
  };
}
