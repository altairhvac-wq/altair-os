import {
  getJobNextBusinessAction,
  selectActiveEstimate,
  type JobBusinessAction,
  type JobEstimateSummary,
  type JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import {
  CANONICAL_WORKFLOW_STAGE_IDS,
  getCanonicalWorkflowStageLabel,
  getNextCanonicalWorkflowStageId,
  type CanonicalWorkflowStage,
  type CanonicalWorkflowStageId,
  type CanonicalWorkflowStageState,
} from "@/shared/lib/workflow/stages";
import type {
  JobWorkflowAvailableAction,
  JobWorkflowFacadeInput,
  JobWorkflowFacadeOptions,
  JobWorkflowProgress,
  JobWorkflowResolution,
} from "@/shared/lib/workflow/types";
import {
  hasInvoiceUnpaidBalance,
  isActiveInvoice,
} from "@/shared/types/invoice";
import type { JobStatus } from "@/shared/types/job";
import {
  getAvailableWorkflowActions,
  getDisplayWorkflowActions,
  getPrimaryWorkflowAction,
  isTerminalJobStatus,
  type JobWorkflowAction,
} from "@/shared/types/job-workflow";

function hasTechnicianAssignment(input: JobWorkflowFacadeInput): boolean {
  return Boolean(input.assignedTechnicianId || input.assignedTechnician);
}

function selectNewestActiveInvoice(
  invoices: JobInvoiceSummary[],
): JobInvoiceSummary | null {
  return (
    invoices
      .filter((invoice) => isActiveInvoice(invoice))
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ?? null
  );
}

function isInvoicePaid(invoice: JobInvoiceSummary | null): boolean {
  if (!invoice) {
    return false;
  }

  return invoice.status === "paid" || !hasInvoiceUnpaidBalance(invoice);
}

function estimatePathIsActive(
  estimate: JobEstimateSummary | null,
  businessAction: JobBusinessAction | null,
): boolean {
  if (estimate) {
    return (
      estimate.status === "draft" ||
      estimate.status === "sent" ||
      estimate.status === "approved"
    );
  }

  return (
    businessAction?.id === "create_estimate" ||
    businessAction?.id === "finish_send_estimate" ||
    businessAction?.id === "awaiting_approval" ||
    businessAction?.id === "approve_estimate_on_site"
  );
}

/**
 * Whether commercial estimate stages were bypassed (common for same-day
 * repair without a quote). Skipped stages are presentation-only.
 */
function shouldSkipEstimateStages(
  input: JobWorkflowFacadeInput,
  estimate: JobEstimateSummary | null,
  invoice: JobInvoiceSummary | null,
  businessAction: JobBusinessAction | null,
): boolean {
  if (estimatePathIsActive(estimate, businessAction)) {
    return false;
  }

  if (invoice) {
    return true;
  }

  return (
    input.status === "in_progress" ||
    input.status === "completed" ||
    Boolean(input.workStartedAt)
  );
}

function stageReachedFacts(
  input: JobWorkflowFacadeInput,
  estimate: JobEstimateSummary | null,
  invoice: JobInvoiceSummary | null,
  skipEstimateStages: boolean,
): Record<CanonicalWorkflowStageId, boolean> {
  const assigned =
    hasTechnicianAssignment(input) ||
    input.status === "dispatched" ||
    input.status === "arrived" ||
    input.status === "in_progress" ||
    input.status === "completed";

  const inspected =
    input.status === "arrived" ||
    input.status === "in_progress" ||
    input.status === "completed" ||
    Boolean(input.arrivedAt);

  // Artifact truth only — never treat "create estimate" recommendation as complete.
  const estimateCreated = skipEstimateStages ? false : Boolean(estimate);

  const customerApproved = skipEstimateStages
    ? false
    : estimate?.status === "approved" || estimate?.status === "converted";

  const workInProgress =
    input.status === "in_progress" ||
    input.status === "completed" ||
    Boolean(input.workStartedAt);

  const workCompleted = input.status === "completed";
  const invoiceCreated = Boolean(invoice);
  const paymentReceived = isInvoicePaid(invoice);
  const fullyComplete = workCompleted && paymentReceived;

  return {
    job_created: true,
    technician_assigned: assigned,
    inspection: inspected,
    estimate_created: estimateCreated,
    customer_approval: customerApproved,
    work_in_progress: workInProgress,
    work_completed: workCompleted,
    invoice_created: invoiceCreated,
    payment_received: paymentReceived,
    completed: fullyComplete,
  };
}

function resolveCurrentStageId(
  input: JobWorkflowFacadeInput,
  estimate: JobEstimateSummary | null,
  invoice: JobInvoiceSummary | null,
  businessAction: JobBusinessAction | null,
  skipEstimateStages: boolean,
): CanonicalWorkflowStageId | null {
  if (input.status === "cancelled") {
    return null;
  }

  if (input.status === "completed") {
    if (!invoice) {
      return "work_completed";
    }
    if (invoice.status === "draft") {
      return "invoice_created";
    }
    if (hasInvoiceUnpaidBalance(invoice)) {
      return "payment_received";
    }
    return "completed";
  }

  switch (businessAction?.id) {
    case "create_estimate":
      // Next actionable stage, not current — keep current on last reached field stage.
      break;
    case "finish_send_estimate":
      return "estimate_created";
    case "awaiting_approval":
    case "approve_estimate_on_site":
      return "customer_approval";
    case "complete_work":
      return "work_in_progress";
    case "create_invoice":
      return "work_completed";
    case "view_invoice":
      return "invoice_created";
    case "awaiting_payment":
      return "payment_received";
    default:
      break;
  }

  if (input.status === "in_progress") {
    return "work_in_progress";
  }

  if (input.status === "arrived") {
    return "inspection";
  }

  if (input.status === "dispatched" || hasTechnicianAssignment(input)) {
    return "technician_assigned";
  }

  if (!skipEstimateStages && estimate?.status === "approved") {
    return "technician_assigned";
  }

  return "job_created";
}

function buildProgress(
  currentStageId: CanonicalWorkflowStageId | null,
  reached: Record<CanonicalWorkflowStageId, boolean>,
  skipEstimateStages: boolean,
): JobWorkflowProgress {
  const skipped = new Set<CanonicalWorkflowStageId>();
  if (skipEstimateStages) {
    skipped.add("estimate_created");
    skipped.add("customer_approval");
  }

  const stages: CanonicalWorkflowStage[] = CANONICAL_WORKFLOW_STAGE_IDS.map(
    (id) => {
      let state: CanonicalWorkflowStageState;

      if (skipped.has(id)) {
        state = "skipped";
      } else if (currentStageId && id === currentStageId) {
        state = "current";
      } else if (reached[id]) {
        state = "complete";
      } else {
        state = "upcoming";
      }

      return {
        id,
        label: getCanonicalWorkflowStageLabel(id),
        state,
      };
    },
  );

  const countable = stages.filter((stage) => stage.state !== "skipped");
  const completedCount = countable.filter(
    (stage) => stage.state === "complete" || stage.state === "current",
  ).length;
  const totalCount = countable.length;
  const percent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  let nextStageId: CanonicalWorkflowStageId | null = null;
  if (currentStageId) {
    const currentIndex = CANONICAL_WORKFLOW_STAGE_IDS.indexOf(currentStageId);
    for (let i = currentIndex + 1; i < CANONICAL_WORKFLOW_STAGE_IDS.length; i++) {
      const candidate = CANONICAL_WORKFLOW_STAGE_IDS[i];
      if (candidate && !skipped.has(candidate)) {
        nextStageId = candidate;
        break;
      }
    }
  }

  return {
    stages,
    completedCount,
    totalCount,
    percent,
    currentStageId,
    nextStageId,
  };
}

function resolvePrimaryAction(
  fieldPrimaryAction: JobWorkflowAction | null,
  businessAction: JobBusinessAction | null,
): JobWorkflowAvailableAction | null {
  if (businessAction?.emphasize && businessAction.kind !== "status") {
    return { ...businessAction, source: "business" };
  }

  if (fieldPrimaryAction) {
    return { ...fieldPrimaryAction, source: "field" };
  }

  if (businessAction) {
    return { ...businessAction, source: "business" };
  }

  return null;
}

function resolveAvailableActions(
  fieldActions: JobWorkflowAction[],
  businessAction: JobBusinessAction | null,
): JobWorkflowAvailableAction[] {
  const actions: JobWorkflowAvailableAction[] = fieldActions.map((action) => ({
    ...action,
    source: "field" as const,
  }));

  if (businessAction) {
    actions.push({ ...businessAction, source: "business" });
  }

  return actions;
}

function canAdvanceFromActions(
  fieldPrimaryAction: JobWorkflowAction | null,
  businessAction: JobBusinessAction | null,
  jobStatus: JobStatus,
): boolean {
  if (jobStatus === "cancelled") {
    return false;
  }

  if (fieldPrimaryAction) {
    return true;
  }

  if (!businessAction) {
    return false;
  }

  return businessAction.kind === "cta" || businessAction.kind === "workflow_align";
}

/**
 * Canonical job workflow facade.
 *
 * Composes existing field-workflow and business-next-action helpers into one
 * read-only resolution. Does not mutate state, call RPCs, or change auth.
 */
export function resolveJobWorkflow(
  input: JobWorkflowFacadeInput,
  options: JobWorkflowFacadeOptions = {},
): JobWorkflowResolution {
  const { includeHiddenFieldActions = false, ...businessActionOptions } =
    options;

  const activeEstimate = selectActiveEstimate(input.estimates);
  const activeInvoice = selectNewestActiveInvoice(input.invoices);

  const businessAction = getJobNextBusinessAction(
    {
      jobId: input.jobId,
      customerId: input.customerId,
      jobStatus: input.status,
      estimates: input.estimates,
      invoices: input.invoices,
    },
    businessActionOptions,
  );

  const fieldActions = includeHiddenFieldActions
    ? getAvailableWorkflowActions(input.status)
    : getDisplayWorkflowActions(input.status);
  const fieldPrimaryAction = getPrimaryWorkflowAction(input.status);

  const skipEstimateStages = shouldSkipEstimateStages(
    input,
    activeEstimate,
    activeInvoice,
    businessAction,
  );

  const currentStageId = resolveCurrentStageId(
    input,
    activeEstimate,
    activeInvoice,
    businessAction,
    skipEstimateStages,
  );

  const reached = stageReachedFacts(
    input,
    activeEstimate,
    activeInvoice,
    skipEstimateStages,
  );

  const progress = buildProgress(
    currentStageId,
    reached,
    skipEstimateStages,
  );

  const currentStage =
    progress.stages.find((stage) => stage.id === currentStageId) ?? null;
  const nextStage =
    progress.stages.find((stage) => stage.id === progress.nextStageId) ?? null;

  const primaryAction = resolvePrimaryAction(fieldPrimaryAction, businessAction);
  const availableActions = resolveAvailableActions(fieldActions, businessAction);

  return {
    jobId: input.jobId,
    jobStatus: input.status,
    isTerminal: isTerminalJobStatus(input.status),
    isCancelled: input.status === "cancelled",
    currentStage,
    nextStage,
    progress,
    primaryAction,
    availableActions,
    fieldPrimaryAction,
    fieldActions,
    businessAction,
    canAdvance: canAdvanceFromActions(
      fieldPrimaryAction,
      businessAction,
      input.status,
    ),
    activeEstimate,
    activeInvoice,
  };
}

export function getCurrentStage(
  input: JobWorkflowFacadeInput,
  options?: JobWorkflowFacadeOptions,
): CanonicalWorkflowStage | null {
  return resolveJobWorkflow(input, options).currentStage;
}

export function getNextStage(
  input: JobWorkflowFacadeInput,
  options?: JobWorkflowFacadeOptions,
): CanonicalWorkflowStage | null {
  return resolveJobWorkflow(input, options).nextStage;
}

export function getPrimaryAction(
  input: JobWorkflowFacadeInput,
  options?: JobWorkflowFacadeOptions,
): JobWorkflowAvailableAction | null {
  return resolveJobWorkflow(input, options).primaryAction;
}

export function getAvailableActions(
  input: JobWorkflowFacadeInput,
  options?: JobWorkflowFacadeOptions,
): JobWorkflowAvailableAction[] {
  return resolveJobWorkflow(input, options).availableActions;
}

export function getWorkflowProgress(
  input: JobWorkflowFacadeInput,
  options?: JobWorkflowFacadeOptions,
): JobWorkflowProgress {
  return resolveJobWorkflow(input, options).progress;
}

export function canAdvance(
  input: JobWorkflowFacadeInput,
  options?: JobWorkflowFacadeOptions,
): boolean {
  return resolveJobWorkflow(input, options).canAdvance;
}

/**
 * Convenience: next presentation stage id after a known stage,
 * without requiring a full job resolution.
 */
export function getNextStageId(
  stageId: CanonicalWorkflowStageId,
): CanonicalWorkflowStageId | null {
  return getNextCanonicalWorkflowStageId(stageId);
}
