/**
 * Canonical workflow facade.
 *
 * Single read-only entry point for presentation-layer job workflow:
 * where is this job, what happens next, and what actions are available.
 *
 * This module composes existing helpers. It does not replace the field
 * workflow engine, RPCs, estimate approval routing, or invoice writes.
 */

export {
  CANONICAL_WORKFLOW_STAGE_IDS,
  CANONICAL_WORKFLOW_STAGE_LABELS,
  getCanonicalWorkflowStageIndex,
  getCanonicalWorkflowStageLabel,
  getNextCanonicalWorkflowStageId,
  type CanonicalWorkflowStage,
  type CanonicalWorkflowStageId,
  type CanonicalWorkflowStageState,
} from "@/shared/lib/workflow/stages";

export {
  canAdvance,
  getAvailableActions,
  getCurrentStage,
  getNextStage,
  getNextStageId,
  getPrimaryAction,
  getWorkflowProgress,
  resolveJobWorkflow,
} from "@/shared/lib/workflow/resolve-job-workflow";

export type {
  JobWorkflowActionSource,
  JobWorkflowAvailableAction,
  JobWorkflowBusinessAvailableAction,
  JobWorkflowFacadeInput,
  JobWorkflowFacadeOptions,
  JobWorkflowFieldAvailableAction,
  JobWorkflowProgress,
  JobWorkflowResolution,
} from "@/shared/lib/workflow/types";

/** Re-export composed business-next-action primitives for callers. */
export {
  getJobNextBusinessAction,
  isFieldEstimateBusinessAction,
  selectActiveEstimate,
  type JobBusinessAction,
  type JobBusinessActionId,
  type JobBusinessActionInput,
  type JobBusinessActionOptions,
  type JobEstimateSummary,
  type JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";

/** Re-export company-level dashboard rail (aggregate, not per-job). */
export {
  buildDashboardWorkflowRail,
  type DashboardWorkflowStage,
  type DashboardWorkflowStageId,
  type DashboardWorkflowStageState,
} from "@/shared/lib/dashboard-workflow-rail";

/** Re-export field workflow action helpers used by the facade. */
export {
  getAvailableWorkflowActions,
  getDisplayWorkflowActions,
  getPrimaryWorkflowAction,
  getTargetStatusForAction,
  isTerminalJobStatus,
  type JobWorkflowAction,
  type JobWorkflowActionId,
} from "@/shared/types/job-workflow";
