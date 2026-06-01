import { listDispatchJobsForToday } from "@/lib/database/queries/dispatch";
import { listEstimates } from "@/lib/database/queries/estimates";
import { listInvoicesWithBillingSync } from "@/lib/database/services/invoice-billing";
import { listJobs } from "@/lib/database/queries/jobs";
import {
  listCompanyJobLaborEntries,
  listTodayTimeEntriesForCompany,
} from "@/lib/database/queries/time-entries";
import { listTimeClockEntries } from "@/lib/database/queries/time-clock";
import { getCompanyOperationalInconsistenciesReport } from "@/lib/database/services/reports/operational-inconsistencies-report";
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

export async function getReportsFoundationData(
  companyId: string,
  timeZone?: string,
): Promise<ReportsFoundationData> {
  const [jobs, invoices, estimates, timeClockEntries, todayJobs, operations, laborEntries, todayTimeEntries, inconsistenciesReport] =
    await Promise.all([
      listJobs(companyId),
      listInvoicesWithBillingSync(companyId, timeZone),
      listEstimates(companyId),
      listTimeClockEntries(companyId, { limit: TIME_CLOCK_FETCH_LIMIT }),
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
  const clockedInUsers = timeClockEntries.filter(
    (entry) => entry.status === "open",
  );
  const activeLaborEntries = laborEntries.filter((entry) => entry.endedAt == null);
  const openBreakEntries = todayTimeEntries.filter(
    (entry) => entry.entryType === "break" && entry.endedAt == null,
  );
  const todayTimeSummary = summarizeTodayEntries(todayTimeEntries);
  const totalHoursToday = roundJobMaterialAmount(
    (todayTimeSummary.clockMinutes + todayTimeSummary.jobLaborMinutes) / 60,
  );
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
      exceptionCount: timeExceptions.length,
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
