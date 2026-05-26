import { COMPANY_ROLE_LABELS } from "@/lib/database/types/roles";
import { listDispatchJobsForToday } from "@/lib/database/queries/dispatch";
import { listRecentOperationalActivitiesForCompany } from "@/lib/database/queries/dashboard";
import { listEstimates } from "@/lib/database/queries/estimates";
import { listExpenses } from "@/lib/database/queries/expenses";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listRecentPayments, getPaymentsTodaySummary } from "@/lib/database/queries/invoice-payments";
import {
  getUnreadNotificationCount,
  getUserNotifications,
} from "@/lib/database/queries/notifications";
import { listTechnicians } from "@/lib/database/queries/technicians";
import {
  listActiveTechnicianTimeEntries,
  mapEntryTypeToTimeState,
} from "@/lib/database/queries/time-entries";
import type { DashboardData } from "@/shared/types/dashboard";
import {
  getTodayOperationsSummary,
} from "@/shared/types/dashboard";
import { getInvoiceSummary } from "@/shared/types/invoice";
import type { TechnicianTimeState } from "@/shared/types/time-entry";
import type { TimeEntry } from "@/shared/types/time-entry";

const TODAY_JOBS_LIMIT = 8;
const PENDING_EXPENSES_LIMIT = 5;
const RECENT_RECEIPTS_LIMIT = 5;
const APPROVED_ESTIMATES_LIMIT = 5;
const RECENT_PAYMENTS_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 10;
const RECENT_NOTIFICATIONS_LIMIT = 5;

function buildTechnicianStatuses(
  technicians: Awaited<ReturnType<typeof listTechnicians>>,
  activeEntries: TimeEntry[],
): DashboardData["technicians"] {
  const entryByTechnician = new Map(
    activeEntries.map((entry) => [entry.technicianId, entry]),
  );

  return technicians
    .filter((technician) => technician.role === COMPANY_ROLE_LABELS.technician)
    .map((technician) => {
      const activeEntry = entryByTechnician.get(technician.id);
      const timeState: TechnicianTimeState = activeEntry
        ? mapEntryTypeToTimeState(activeEntry.entryType)
        : "off_clock";

      return {
        id: technician.id,
        name: technician.name,
        initials: technician.initials,
        timeState,
        currentJobId: activeEntry?.jobId,
        currentJobNumber: activeEntry?.jobNumber,
      };
    });
}

export async function getDashboardData(
  companyId: string,
  userId: string,
): Promise<DashboardData> {
  const todayJobs = await listDispatchJobsForToday(companyId);

  const [
    technicians,
    activeTimeEntries,
    invoices,
    estimates,
    expenses,
    recentPayments,
    paymentsTodaySummary,
    recentActivity,
    notifications,
    unreadCount,
  ] = await Promise.all([
    listTechnicians(companyId, todayJobs),
    listActiveTechnicianTimeEntries(companyId),
    listInvoices(companyId),
    listEstimates(companyId),
    listExpenses(companyId),
    listRecentPayments(companyId, RECENT_PAYMENTS_LIMIT),
    getPaymentsTodaySummary(companyId),
    listRecentOperationalActivitiesForCompany(
      companyId,
      RECENT_ACTIVITY_LIMIT,
    ),
    getUserNotifications(companyId, userId, {
      limit: RECENT_NOTIFICATIONS_LIMIT,
    }),
    getUnreadNotificationCount(companyId, userId),
  ]);

  const operationsSummary = getTodayOperationsSummary(todayJobs);
  const invoiceSummary = getInvoiceSummary(invoices);

  const unpaidInvoices = invoices.filter(
    (invoice) =>
      invoice.status !== "void" &&
      invoice.status !== "cancelled" &&
      invoice.status !== "paid" &&
      invoice.balanceDue > 0,
  );

  const overdueInvoices = unpaidInvoices.filter(
    (invoice) => invoice.status === "overdue",
  );

  const approvedEstimates = estimates
    .filter((estimate) => estimate.status === "approved")
    .slice(0, APPROVED_ESTIMATES_LIMIT);

  const submittedExpenses = expenses.filter(
    (expense) => expense.status === "submitted",
  );
  const rejectedExpenses = expenses.filter(
    (expense) => expense.status === "rejected",
  );

  const recentReceipts = [...expenses]
    .filter((expense) => expense.receiptStatus === "attached")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, RECENT_RECEIPTS_LIMIT);

  return {
    operations: {
      ...operationsSummary,
      todayJobs: todayJobs.slice(0, TODAY_JOBS_LIMIT),
    },
    technicians: buildTechnicianStatuses(technicians, activeTimeEntries),
    money: {
      unpaidCount: unpaidInvoices.length,
      unpaidTotal: invoiceSummary.unpaidTotal,
      overdueCount: overdueInvoices.length,
      overdueTotal: invoiceSummary.overdueTotal,
      paymentsTodayCount: paymentsTodaySummary.count,
      paymentsTodayTotal: paymentsTodaySummary.total,
      recentPayments: recentPayments.map((payment) => ({
        id: payment.id,
        invoiceId: payment.invoiceId,
        invoiceNumber: payment.invoiceNumber,
        customerName: payment.customerName,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        createdAt: payment.createdAt,
      })),
      approvedEstimates,
    },
    expenses: {
      submittedCount: submittedExpenses.length,
      submittedTotal: submittedExpenses.reduce(
        (sum, expense) => sum + (expense.amount ?? 0),
        0,
      ),
      rejectedCount: rejectedExpenses.length,
      recentReceipts,
      pendingExpenses: submittedExpenses.slice(0, PENDING_EXPENSES_LIMIT),
    },
    notifications: {
      unreadCount,
      recent: notifications,
    },
    recentActivity,
  };
}
