import type { DocumentQueueMetrics } from "@/lib/database/queries/list-pages";

/** One calendar month in the Business performance chart (company timezone). */
export type DashboardPerformanceMonth = {
  /** YYYY-MM */
  key: string;
  /** Short month label for the axis, e.g. "Oct". */
  label: string;
  collected: number;
  jobsCompleted: number;
  estimatesSent: number;
  estimatesApproved: number;
};

/**
 * Six months of performance, built from the reports per-day series
 * (migration 170) so it is bounded by the axis, not the size of the tenant.
 */
export type DashboardPerformance = {
  months: DashboardPerformanceMonth[];
  /** Sum of `collected` over the window. */
  collectedTotal: number;
  /** Sum of `jobsCompleted` over the window. */
  jobsCompletedTotal: number;
  /** Approved ÷ sent over the window; null when nothing was sent. */
  estimateCloseRate: number | null;
  estimatesSentTotal: number;
  estimatesApprovedTotal: number;
  /** Collected in the full calendar month before the current one. */
  collectedPriorMonth: number;
  /** Collected in the six months before this window; null when the window itself is the first. */
  collectedPriorWindow: number | null;
  jobsCompletedPriorWindow: number | null;
};

export type DashboardOverviewExtras = {
  /** Per-queue counts and money for the estimate pipeline and invoice ledger. Null without billing access or on RPC failure. */
  queueMetrics: DocumentQueueMetrics | null;
  /** Null without reports access or on RPC failure. */
  performance: DashboardPerformance | null;
};

export const EMPTY_DASHBOARD_OVERVIEW_EXTRAS: DashboardOverviewExtras = {
  queueMetrics: null,
  performance: null,
};
