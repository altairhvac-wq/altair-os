import type { StalledJobEntry } from "@/shared/types/reports";

export type DailyOperationsSummarySeverity = "info" | "warning" | "critical";

export type DailyOperationsSummaryHighlight = {
  id: string;
  severity: DailyOperationsSummarySeverity;
  message: string;
  category:
    | "revenue"
    | "jobs"
    | "stalled_jobs"
    | "expenses"
    | "labor"
    | "invoicing"
    | "profitability";
  count?: number;
  href?: string;
};

export type DailyOperationsRevenueSnapshot = {
  collectedRevenue: number;
  outstandingRevenue: number;
  todayCollectedRevenue: number;
  todayPaymentCount: number;
};

export type DailyOperationsOpenJobsSnapshot = {
  count: number;
};

export type DailyOperationsStalledJobsSnapshot = {
  count: number;
  inactivityThresholdDays: number;
  stalledJobs: StalledJobEntry[];
};

export type DailyOperationsPendingExpensesSnapshot = {
  count: number;
  totalAmount: number;
};

export type DailyOperationsActiveTechniciansSnapshot = {
  activeLaborEntries: number;
  technicianCount: number;
};

export type DailyOperationsCompletedAwaitingInvoicingSnapshot = {
  count: number;
};

export type DailyOperationsProfitabilityWarningsSnapshot = {
  jobsWithWarnings: number;
  materialCostExceedsCollectedCount: number;
};

export type DailyOperationsSummarySections = {
  revenue: DailyOperationsRevenueSnapshot;
  openJobs: DailyOperationsOpenJobsSnapshot;
  stalledJobs: DailyOperationsStalledJobsSnapshot;
  pendingExpenses: DailyOperationsPendingExpensesSnapshot;
  activeTechnicians: DailyOperationsActiveTechniciansSnapshot;
  completedAwaitingInvoicing: DailyOperationsCompletedAwaitingInvoicingSnapshot;
  profitabilityWarnings: DailyOperationsProfitabilityWarningsSnapshot;
};

export type DailyOperationsSummary = {
  generatedAt: string;
  sections: DailyOperationsSummarySections;
  highlights: DailyOperationsSummaryHighlight[];
  limitations: string[];
};
