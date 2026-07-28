/**
 * Canonical presentation-layer workflow stages.
 *
 * These are derived projections for UI/orchestration only.
 * They do NOT map 1:1 to jobs.status, estimate status, or invoice status,
 * and must never be persisted as database enums.
 */

export const CANONICAL_WORKFLOW_STAGE_IDS = [
  "job_created",
  "technician_assigned",
  "inspection",
  "estimate_created",
  "customer_approval",
  "work_in_progress",
  "work_completed",
  "invoice_created",
  "payment_received",
  "completed",
] as const;

export type CanonicalWorkflowStageId =
  (typeof CANONICAL_WORKFLOW_STAGE_IDS)[number];

export type CanonicalWorkflowStageState =
  | "complete"
  | "current"
  | "upcoming"
  | "skipped";

export type CanonicalWorkflowStage = {
  id: CanonicalWorkflowStageId;
  label: string;
  state: CanonicalWorkflowStageState;
};

/**
 * User-facing stage labels. Aligned with job-status vocabulary where a stage
 * overlaps a canonical field status (e.g. In Progress). Distinct labels remain
 * for billing stages that are not jobs.status values.
 */
export const CANONICAL_WORKFLOW_STAGE_LABELS: Record<
  CanonicalWorkflowStageId,
  string
> = {
  job_created: "Created",
  technician_assigned: "Assigned",
  inspection: "Inspection",
  estimate_created: "Estimate",
  customer_approval: "Approval",
  work_in_progress: "In Progress",
  work_completed: "Work completed",
  invoice_created: "Invoice",
  payment_received: "Payment",
  completed: "Completed",
};

export function getCanonicalWorkflowStageLabel(
  stageId: CanonicalWorkflowStageId,
): string {
  return CANONICAL_WORKFLOW_STAGE_LABELS[stageId];
}

export function getCanonicalWorkflowStageIndex(
  stageId: CanonicalWorkflowStageId,
): number {
  return CANONICAL_WORKFLOW_STAGE_IDS.indexOf(stageId);
}

export function getNextCanonicalWorkflowStageId(
  stageId: CanonicalWorkflowStageId,
): CanonicalWorkflowStageId | null {
  const index = getCanonicalWorkflowStageIndex(stageId);
  if (index < 0 || index >= CANONICAL_WORKFLOW_STAGE_IDS.length - 1) {
    return null;
  }

  return CANONICAL_WORKFLOW_STAGE_IDS[index + 1] ?? null;
}
