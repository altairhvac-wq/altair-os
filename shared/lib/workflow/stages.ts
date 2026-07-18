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

export const CANONICAL_WORKFLOW_STAGE_LABELS: Record<
  CanonicalWorkflowStageId,
  string
> = {
  job_created: "Job Created",
  technician_assigned: "Technician Assigned",
  inspection: "Inspection",
  estimate_created: "Estimate Created",
  customer_approval: "Customer Approval",
  work_in_progress: "Work In Progress",
  work_completed: "Work Completed",
  invoice_created: "Invoice Created",
  payment_received: "Payment Received",
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
