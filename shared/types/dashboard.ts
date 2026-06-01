import type { CompanyAccessScope } from "@/lib/database/access-control";
import { isSameCalendarDayInTimeZone } from "@/shared/lib/datetime";
import { getOperationalDayJobCounts } from "@/shared/lib/scheduled-today";
import type { DispatchJob } from "@/shared/types/dispatch";
import type { Estimate } from "@/shared/types/estimate";
import type { InvoiceStatus } from "@/shared/types/invoice";
import type { Expense } from "@/shared/types/expense";
import type { Notification } from "@/shared/types/notification";
import type { OperationalActivity } from "@/shared/types/operational-activity";
import type { OfficeReviewQueueReport } from "@/shared/types/office-review-queue";
import type { DailyOperationsSummary } from "@/shared/types/daily-operations-summary";
import type { OperationalHealthReport } from "@/shared/types/operational-health-report";
import type { CompletedWorkAwaitingInvoicingEntry, CompletedWorkReviewEntry, StalledJobEntry } from "@/shared/types/reports";
import type { TechnicianTimeState } from "@/shared/types/time-entry";

export type DashboardOperationsSummary = {
  scheduledToday: number;
  dispatched: number;
  inProgress: number;
  completedToday: number;
  /** Jobs on today's board without an assigned technician. */
  unassignedToday: number;
  /** All non-cancelled jobs scheduled for today. */
  totalJobsToday: number;
  /** Technicians with two or more active jobs on today's board. */
  overloadedTechnicianCount: number;
  todayJobs: DispatchJob[];
  /** Unassigned jobs on today's board (preview for mobile action sheets). */
  unassignedJobs: DispatchJob[];
};

export type DashboardTechnicianStatus = {
  id: string;
  name: string;
  initials: string;
  timeState: TechnicianTimeState;
  currentJobId?: string;
  currentJobNumber?: string;
};

export type DashboardOverdueInvoicePreview = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  balanceDue: number;
  dueDate: string;
  status: InvoiceStatus;
};

export type DashboardRecentPayment = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentDate: string;
  createdAt: string;
};

export type DashboardMoneySnapshot = {
  unpaidCount: number;
  unpaidTotal: number;
  overdueCount: number;
  overdueTotal: number;
  paymentsTodayCount: number;
  paymentsTodayTotal: number;
  recentPayments: DashboardRecentPayment[];
  approvedEstimates: Estimate[];
  /** Overdue invoices (preview for mobile action sheets). */
  overdueInvoices: DashboardOverdueInvoicePreview[];
};

export type DashboardExpenseReview = {
  submittedCount: number;
  submittedTotal: number;
  rejectedCount: number;
  recentReceipts: Expense[];
  pendingExpenses: Expense[];
};

export type DashboardNotificationsSummary = {
  unreadCount: number;
  recent: Notification[];
};

/** Lightweight operational KPIs sourced from shared report services. */
export type DashboardAnalyticsSnapshot = {
  todayCollectedRevenue: number;
  todayPaymentCount: number;
  openJobs: number;
  pendingExpenseCount: number;
  activeLaborEntries: number;
  reviewIssuesResolvedThisWeek: number;
};

export type DashboardStalledJobsSnapshot = {
  stalledCount: number;
  inactivityThresholdDays: number;
  stalledJobs: StalledJobEntry[];
};

export type DashboardCompletedWorkAwaitingInvoicingSnapshot = {
  count: number;
  jobs: CompletedWorkAwaitingInvoicingEntry[];
};

export type DashboardCompletedWorkReviewSnapshot = {
  count: number;
  jobs: CompletedWorkReviewEntry[];
  resolvedThisWeek: number;
};

export type DashboardData = {
  access: CompanyAccessScope;
  analytics: DashboardAnalyticsSnapshot;
  operations: DashboardOperationsSummary;
  technicians: DashboardTechnicianStatus[];
  money: DashboardMoneySnapshot;
  expenses: DashboardExpenseReview;
  notifications: DashboardNotificationsSummary;
  officeReviewQueue: OfficeReviewQueueReport;
  stalledJobs: DashboardStalledJobsSnapshot;
  completedWorkAwaitingInvoicing: DashboardCompletedWorkAwaitingInvoicingSnapshot;
  completedWorkReview: DashboardCompletedWorkReviewSnapshot;
  operationalInsights: DailyOperationsSummary;
  operationalHealth: OperationalHealthReport;
  recentActivity: OperationalActivity[];
};

const ACTIVE_DISPATCH_JOB_STATUSES = new Set<DispatchJob["status"]>([
  "scheduled",
  "dispatched",
  "arrived",
  "in_progress",
]);

function countOverloadedTechnicians(jobs: DispatchJob[]): number {
  const activeJobsByTechnician = new Map<string, number>();

  for (const job of jobs) {
    if (!job.technicianId || !ACTIVE_DISPATCH_JOB_STATUSES.has(job.status)) {
      continue;
    }

    activeJobsByTechnician.set(
      job.technicianId,
      (activeJobsByTechnician.get(job.technicianId) ?? 0) + 1,
    );
  }

  return [...activeJobsByTechnician.values()].filter((count) => count >= 2).length;
}

export function getTodayOperationsSummary(
  jobs: DispatchJob[],
): Pick<
  DashboardOperationsSummary,
  | "scheduledToday"
  | "dispatched"
  | "inProgress"
  | "completedToday"
  | "unassignedToday"
  | "totalJobsToday"
  | "overloadedTechnicianCount"
> {
  const counts = getOperationalDayJobCounts(jobs);

  return {
    scheduledToday: counts.scheduled,
    dispatched: counts.dispatched,
    inProgress: counts.onSiteOrWorking,
    completedToday: counts.completed,
    unassignedToday: counts.unassigned,
    totalJobsToday: counts.activeTotal,
    overloadedTechnicianCount: countOverloadedTechnicians(jobs),
  };
}

export function isPaymentToday(
  paymentDate: string,
  reference = new Date(),
  timeZone?: string,
): boolean {
  return isSameCalendarDayInTimeZone(
    `${paymentDate}T12:00:00.000Z`,
    reference,
    timeZone,
  );
}
