import { listDispatchJobsForToday } from "@/lib/database/queries/dispatch";
import { listEstimates } from "@/lib/database/queries/estimates";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listJobs } from "@/lib/database/queries/jobs";
import { listTimeClockEntries } from "@/lib/database/queries/time-clock";
import { getDailyOperationsSummary } from "@/lib/database/services/operations/daily-operations-summary";
import { getTodayOperationsSummary } from "@/shared/types/dashboard";
import type { JobStatus } from "@/shared/types/job";
import {
  getInvoiceSummary,
  hasInvoiceUnpaidBalance,
  isActiveInvoice,
} from "@/shared/types/invoice";
import type { ReportsFoundationData } from "@/shared/types/reports-foundation";

const CLOSED_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  "completed",
  "cancelled",
]);

const RECENT_TIME_CLOCK_LIMIT = 10;
const TIME_CLOCK_FETCH_LIMIT = 100;

export async function getReportsFoundationData(
  companyId: string,
): Promise<ReportsFoundationData> {
  const [jobs, invoices, estimates, timeClockEntries, todayJobs, operations] =
    await Promise.all([
      listJobs(companyId),
      listInvoices(companyId),
      listEstimates(companyId),
      listTimeClockEntries(companyId, { limit: TIME_CLOCK_FETCH_LIMIT }),
      listDispatchJobsForToday(companyId),
      getDailyOperationsSummary(companyId),
    ]);

  const todaySummary = getTodayOperationsSummary(todayJobs);
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

  return {
    jobs: {
      jobsToday: todaySummary.totalJobsToday,
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
