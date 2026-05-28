import type { JobStatus } from "@/shared/types/job";
import type { JobProfitabilityCompleteness } from "@/shared/types/job-profitability";

/** Activity event types emitted when a completed-job review blocker clears. */
export type JobReviewBlockerResolutionEventType =
  | "invoice_created_for_completed_job"
  | "labor_entries_closed"
  | "pending_expenses_resolved"
  | "material_costs_completed";

export const JOB_REVIEW_BLOCKER_RESOLUTION_EVENT_TYPES: readonly JobReviewBlockerResolutionEventType[] =
  [
    "invoice_created_for_completed_job",
    "labor_entries_closed",
    "pending_expenses_resolved",
    "material_costs_completed",
  ] as const;

export const JOB_REVIEW_BLOCKER_RESOLUTION_LABELS: Record<
  JobReviewBlockerResolutionEventType,
  string
> = {
  invoice_created_for_completed_job: "Invoice created (office review complete)",
  labor_entries_closed: "Labor entries closed (office review complete)",
  pending_expenses_resolved: "Pending expenses resolved (office review complete)",
  material_costs_completed: "Material costs completed (office review complete)",
};

/**
 * Deterministic transition detection using the same completeness flags as
 * JobReviewChecklistSection and completed-work-review-report.
 */
export function detectJobReviewBlockerResolutions(
  before: JobProfitabilityCompleteness,
  after: JobProfitabilityCompleteness,
): JobReviewBlockerResolutionEventType[] {
  const resolutions: JobReviewBlockerResolutionEventType[] = [];

  if (before.noActiveInvoices && !after.noActiveInvoices) {
    resolutions.push("invoice_created_for_completed_job");
  }

  if (before.openLaborEntryCount > 0 && after.openLaborEntryCount === 0) {
    resolutions.push("labor_entries_closed");
  }

  if (
    before.excludedPendingExpenseCount > 0 &&
    after.excludedPendingExpenseCount === 0
  ) {
    resolutions.push("pending_expenses_resolved");
  }

  if (
    before.materialsMissingUnitCostCount > 0 &&
    after.materialsMissingUnitCostCount === 0
  ) {
    resolutions.push("material_costs_completed");
  }

  return resolutions;
}

export function isCompletedJobReviewResolutionCandidate(
  jobStatus: JobStatus,
): boolean {
  return jobStatus === "completed";
}
