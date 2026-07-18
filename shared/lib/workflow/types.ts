import type {
  JobBusinessAction,
  JobBusinessActionOptions,
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import type { JobStatus } from "@/shared/types/job";
import type { JobWorkflowAction } from "@/shared/types/job-workflow";
import type {
  CanonicalWorkflowStage,
  CanonicalWorkflowStageId,
} from "@/shared/lib/workflow/stages";

/**
 * Minimal job snapshot required by the workflow facade.
 * Callers can pass a full Job plus billing summaries.
 */
export type JobWorkflowFacadeInput = {
  jobId: string;
  customerId?: string;
  status: JobStatus;
  assignedTechnicianId?: string | null;
  assignedTechnician?: string | null;
  arrivedAt?: string | null;
  workStartedAt?: string | null;
  completedAt?: string | null;
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
};

export type JobWorkflowFacadeOptions = JobBusinessActionOptions & {
  /**
   * When true, include field actions hidden from normal display
   * (currently `dispatch`). Defaults to false to match getDisplayWorkflowActions.
   */
  includeHiddenFieldActions?: boolean;
};

export type JobWorkflowActionSource = "field" | "business";

export type JobWorkflowFieldAvailableAction = JobWorkflowAction & {
  source: "field";
};

export type JobWorkflowBusinessAvailableAction = JobBusinessAction & {
  source: "business";
};

export type JobWorkflowAvailableAction =
  | JobWorkflowFieldAvailableAction
  | JobWorkflowBusinessAvailableAction;

export type JobWorkflowProgress = {
  stages: CanonicalWorkflowStage[];
  completedCount: number;
  totalCount: number;
  /** 0–100 integer progress across non-skipped stages. */
  percent: number;
  currentStageId: CanonicalWorkflowStageId | null;
  nextStageId: CanonicalWorkflowStageId | null;
};

export type JobWorkflowResolution = {
  jobId: string;
  jobStatus: JobStatus;
  isTerminal: boolean;
  isCancelled: boolean;

  currentStage: CanonicalWorkflowStage | null;
  nextStage: CanonicalWorkflowStage | null;
  progress: JobWorkflowProgress;

  /** Combined primary action for “what happens next”. */
  primaryAction: JobWorkflowAvailableAction | null;
  availableActions: JobWorkflowAvailableAction[];

  /** Direct pass-through of existing field-workflow helpers. */
  fieldPrimaryAction: JobWorkflowAction | null;
  fieldActions: JobWorkflowAction[];

  /** Direct pass-through of getJobNextBusinessAction. */
  businessAction: JobBusinessAction | null;

  canAdvance: boolean;

  activeEstimate: JobEstimateSummary | null;
  activeInvoice: JobInvoiceSummary | null;
};
