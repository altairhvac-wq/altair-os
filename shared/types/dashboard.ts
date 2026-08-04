import type { CompanyAccessScope } from "@/lib/database/access-control";
import type {
  WorkflowReminderKind,
  WorkflowReminderSourceEntityType,
} from "@/lib/database/types/enums";
import { isSameCalendarDayInTimeZone } from "@/shared/lib/datetime";
import { getOperationalDayJobCounts } from "@/shared/lib/scheduled-today";
import type { DispatchJob, Technician } from "@/shared/types/dispatch";
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

export type DashboardOverloadedTechnicianPreview = {
  id: string;
  name: string;
};

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
  /**
   * Overloaded technicians derived from today's jobs (same rule as
   * getOverloadedTechnicianIds). Names resolved from the loaded roster.
   */
  overloadedTechnicians: DashboardOverloadedTechnicianPreview[];
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

export type DashboardUnpaidInvoiceFollowUpPreview = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  balanceDue: number;
  sentAt?: string;
  issueDate: string;
  daysUnpaid: number;
  status: InvoiceStatus;
};

export type DashboardUnsentInvoicePreview = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  jobId?: string;
  total: number;
  status: InvoiceStatus;
};

export type DashboardUnsentEstimatePreview = {
  id: string;
  estimateNumber: string;
  customerName: string;
  customerEmail?: string;
  jobId?: string;
  total: number;
  status: Estimate["status"];
};

export type DashboardStaleSentEstimatePreview = {
  id: string;
  estimateNumber: string;
  customerName: string;
  customerEmail?: string;
  jobId?: string;
  total: number;
  status: Estimate["status"];
  sentAt: string;
  daysSinceSent: number;
};

export type DashboardAcceptedEstimateSchedulingPreview = {
  id: string;
  estimateNumber: string;
  customerName: string;
  total: number;
  approvedAt?: string;
  jobId?: string;
  jobNumber?: string;
  openHref: string;
};

export type DashboardAcceptedEstimatesNeedingSchedulingSnapshot = {
  count: number;
  estimates: DashboardAcceptedEstimateSchedulingPreview[];
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

/** One day in the Mission Control collections-trend series (company timezone). */
export type DashboardDailyPaymentTotal = {
  paymentDate: string;
  total: number;
};

export type DashboardMoneySnapshot = {
  unpaidCount: number;
  unpaidTotal: number;
  overdueCount: number;
  overdueTotal: number;
  paymentsTodayCount: number;
  paymentsTodayTotal: number;
  /** Collected payment total for yesterday (company timezone), for glance deltas. */
  paymentsYesterdayTotal: number;
  /** Collected payment total for this calendar week (Sunday–today, company timezone). */
  paymentsThisWeekTotal: number;
  /** Collected payment total for this calendar month (month-start–today, company timezone). */
  paymentsThisMonthTotal: number;
  /**
   * Daily collected totals for today and the prior 6 company-timezone days
   * (oldest → newest). Used by the Mission Control collections-trend chart.
   */
  paymentsLast7Days: DashboardDailyPaymentTotal[];
  recentPayments: DashboardRecentPayment[];
  approvedEstimates: Estimate[];
  /** Overdue invoices (preview for mobile action sheets). */
  overdueInvoices: DashboardOverdueInvoicePreview[];
  /** Sent unpaid invoices past the follow-up threshold (preview for action queues). */
  unpaidInvoiceFollowUpCount: number;
  unpaidInvoicesNeedingFollowUp: DashboardUnpaidInvoiceFollowUpPreview[];
  unpaidInvoiceFollowUpThresholdDays: number;
  /** Draft invoices not yet sent (preview for mobile action sheets). */
  unsentInvoiceCount: number;
  unsentInvoices: DashboardUnsentInvoicePreview[];
  /** Draft estimates not yet sent (preview for mobile action sheets). */
  unsentEstimateCount: number;
  unsentEstimates: DashboardUnsentEstimatePreview[];
  /** Sent estimates past recovery threshold (preview for mobile action sheets). */
  staleSentEstimateCount: number;
  staleSentEstimates: DashboardStaleSentEstimatePreview[];
  staleSentEstimateThresholdDays: number;
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

export type DashboardLeadFollowUpPreview = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone: string;
  email: string;
  nextFollowUpAt: string;
  status: string;
};

export type DashboardLeadFollowUpSnapshot = {
  count: number;
  leads: DashboardLeadFollowUpPreview[];
};

export type DashboardLeadAttentionPreview = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  phone: string;
  email: string;
  status: string;
  createdAt: string;
  sourceLabel: string;
  nextFollowUpAt?: string;
  openHref: string;
};

export type DashboardLeadAttentionSnapshot = {
  count: number;
  leads: DashboardLeadAttentionPreview[];
};

export type DashboardLeadPipelineSummary = {
  totalLeads: number;
  followUpsDue: number;
  wonLeads: number;
  lostLeads: number;
  hasLeads: boolean;
  /** Leads created today in the company timezone. */
  newLeadsToday: number;
};

export type DashboardWorkflowReminderPreview = {
  id: string;
  title: string;
  message: string | null;
  triggeredAt: string;
  reminderKind: WorkflowReminderKind;
  sourceEntityType: WorkflowReminderSourceEntityType;
  sourceEntityId: string;
  kindLabel: string;
  sourceLabel: string;
  ageLabel: string;
  openHref: string;
  openLabel: string;
};

export type DashboardWorkflowRemindersSnapshot = {
  totalActiveCount: number;
  visibleCount: number;
  reminders: DashboardWorkflowReminderPreview[];
};

export type DashboardCustomerNeedsInfoPreview = {
  id: string;
  name: string;
};

export type DashboardCustomersNeedingInfoSnapshot = {
  count: number;
  customers: DashboardCustomerNeedsInfoPreview[];
};

export type DashboardStaleOpenShiftPreview = {
  id: string;
  technicianName: string;
  startedAt: string;
  elapsedHours: number;
};

export type DashboardStaleOpenShiftsSnapshot = {
  count: number;
  shifts: DashboardStaleOpenShiftPreview[];
};

export type DashboardPaymentCardFailurePreview = {
  id: string;
  invoiceId: string;
  invoiceNumber: string | null;
  amount: number;
  lastCardFailureAt: string | null;
};

export type DashboardPaymentDisputePreview = {
  id: string;
  amount: number;
  status: string;
  reason: string | null;
  invoiceId: string | null;
  invoiceNumber: string | null;
};

export type DashboardPaymentAttentionSnapshot = {
  /** Attempts matching isCardFailureAttentionEligible. */
  cardFailureCount: number;
  /** Disputes with open/unresolved Stripe status. */
  openDisputeCount: number;
  /** Preview rows for exception-board drill-down (capped). */
  cardFailures: DashboardPaymentCardFailurePreview[];
  openDisputes: DashboardPaymentDisputePreview[];
};

export type DashboardData = {
  access: CompanyAccessScope;
  analytics: DashboardAnalyticsSnapshot;
  operations: DashboardOperationsSummary;
  technicians: DashboardTechnicianStatus[];
  /** Full roster entries eligible for dispatch assignment recommendations. */
  assignableTechnicians: Technician[];
  money: DashboardMoneySnapshot;
  expenses: DashboardExpenseReview;
  notifications: DashboardNotificationsSummary;
  officeReviewQueue: OfficeReviewQueueReport;
  stalledJobs: DashboardStalledJobsSnapshot;
  completedWorkAwaitingInvoicing: DashboardCompletedWorkAwaitingInvoicingSnapshot;
  completedWorkReview: DashboardCompletedWorkReviewSnapshot;
  acceptedEstimatesNeedingScheduling: DashboardAcceptedEstimatesNeedingSchedulingSnapshot;
  newLeadsNeedingContact: DashboardLeadAttentionSnapshot;
  /**
   * Pipeline "needs contact" queue: status===new OR nextFollowUpAt ≤ today.
   * Broader than newLeadsNeedingContact (first-contact only).
   */
  leadsNeedingContactQueue: DashboardLeadAttentionSnapshot;
  leadsReadyForEstimate: DashboardLeadAttentionSnapshot;
  leadFollowUp: DashboardLeadFollowUpSnapshot;
  leadPipelineSummary: DashboardLeadPipelineSummary;
  /** Active customers missing email/phone/address (needs-info queue). */
  customersNeedingInfo: DashboardCustomersNeedingInfoSnapshot;
  /** Open clock shifts stale ≥ 12h. */
  staleOpenShifts: DashboardStaleOpenShiftsSnapshot;
  /** Card failures + open payment disputes for the Payments bucket. */
  paymentAttention: DashboardPaymentAttentionSnapshot;
  workflowReminders: DashboardWorkflowRemindersSnapshot;
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
