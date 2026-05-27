import type { DailyOperationsSummaryHighlight } from "@/shared/types/daily-operations-summary";
import type { TimeClockEntry } from "@/shared/types/time-clock";

export type ReportsJobsSummary = {
  jobsToday: number;
  openJobs: number;
  completedJobs: number;
  unassignedJobs: number;
};

export type ReportsInvoicesSummary = {
  unpaidCount: number;
  unpaidTotal: number;
  paidTotal: number;
  overdueCount: number;
  overdueTotal: number;
};

export type ReportsEstimatesSummary = {
  draftCount: number;
  sentCount: number;
  approvedCount: number;
};

export type ReportsTimeClockSummary = {
  clockedInCount: number;
  clockedInUsers: TimeClockEntry[];
  recentEntries: TimeClockEntry[];
};

export type ReportsOperationsSnapshot = {
  highlights: DailyOperationsSummaryHighlight[];
  todayCollectedRevenue: number;
  todayPaymentCount: number;
  openJobs: number;
  stalledJobs: number;
  pendingExpenseCount: number;
  activeLaborEntries: number;
  completedAwaitingInvoicing: number;
};

export type ReportsFoundationData = {
  jobs: ReportsJobsSummary;
  invoices: ReportsInvoicesSummary;
  estimates: ReportsEstimatesSummary;
  timeClock: ReportsTimeClockSummary;
  operations: ReportsOperationsSnapshot;
};
