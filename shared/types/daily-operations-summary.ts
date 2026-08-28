import type {
  CompletedWorkAwaitingInvoicingEntry,
  CompletedWorkReviewEntry,
  StalledJobEntry,
} from "@/shared/types/reports";
import type { QueueResolutionTrendSummary } from "@/shared/types/queue-resolution-trends";

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
    | "profitability"
    | "completed_work_review"
    | "data_integrity";
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
  jobs: CompletedWorkAwaitingInvoicingEntry[];
};

export type DailyOperationsCompletedWorkReviewSnapshot = {
  count: number;
  /**
   * Exact whole-tenant count of reviews whose severity is critical.
   *
   * It used to be derived by filtering `jobs`, which is a five-row preview --
   * so a tenant with two hundred critical reviews reported at most five. The
   * number comes from migration 168 now; `jobs` remains the preview.
   */
  criticalCount: number;
  jobs: CompletedWorkReviewEntry[];
  resolvedThisWeek: number;
  resolutionTrend: QueueResolutionTrendSummary;
};

/**
 * The data-integrity scan's own state.
 *
 * `unavailable` exists because zero problems and a scan that could not run
 * produce identical numbers, and only one of them means the company is fine.
 */
export type DailyOperationsDataIntegritySnapshot = {
  jobCount: number;
  criticalJobCount: number;
  unavailable: boolean;
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
  completedWorkReview: DailyOperationsCompletedWorkReviewSnapshot;
  profitabilityWarnings: DailyOperationsProfitabilityWarningsSnapshot;
  dataIntegrity: DailyOperationsDataIntegritySnapshot;
};

export type DailyOperationsSummary = {
  generatedAt: string;
  sections: DailyOperationsSummarySections;
  highlights: DailyOperationsSummaryHighlight[];
  limitations: string[];
};
