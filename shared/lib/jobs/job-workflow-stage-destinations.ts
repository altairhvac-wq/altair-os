/**
 * Job Detail presentation map: workflow stages → exact artifacts/actions.
 * Navigation only — never mutates status or permissions.
 */

import {
  selectActiveEstimate,
  type JobEstimateSummary,
  type JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import type {
  CanonicalWorkflowStage,
  CanonicalWorkflowStageId,
  JobWorkflowAvailableAction,
} from "@/shared/lib/workflow";
import type {
  JobWorkflowDocument,
  JobWorkflowStageTarget,
} from "@/shared/lib/jobs/job-workflow-documents";
import { JOB_DETAIL_SCOPE_ANCHOR } from "@/shared/lib/jobs/job-detail-anchors";
import { isActiveInvoice } from "@/shared/types/invoice";

export type JobWorkflowStageDestination = JobWorkflowStageTarget;

export type JobWorkflowStageDestinationContext = {
  stages: CanonicalWorkflowStage[];
  primaryAction: JobWorkflowAvailableAction | null;
  jobId: string;
  customerId: string;
  canViewBilling: boolean;
  canCreateEstimate: boolean;
  canEditJob: boolean;
  canAssignTechnician: boolean;
  canUpdateStatus: boolean;
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
  jobStatus: string;
};

const STAGE_PREREQUISITES: Record<CanonicalWorkflowStageId, string> = {
  job_created: "This stage unlocks when the job is created.",
  technician_assigned: "Assign a technician to advance this stage.",
  inspection: "Complete inspection or field notes after the technician is on site.",
  estimate_created: "Create an estimate to unlock this stage.",
  customer_approval: "Send an estimate for approval before this stage opens.",
  work_in_progress: "Start work on site to advance this stage.",
  work_completed: "Complete the job wrap-up to unlock this stage.",
  invoice_created: "Create an invoice after work is ready to bill.",
  payment_received: "Record payment after an invoice is issued.",
  completed: "Finish remaining workflow steps to complete this job.",
};

function documentDestination(
  document: JobWorkflowDocument,
  label: string,
): JobWorkflowStageDestination {
  return { kind: "document", document, label };
}

function lockedDestination(
  stageId: CanonicalWorkflowStageId,
  reason?: string,
): JobWorkflowStageDestination {
  return {
    kind: "locked",
    reason: reason ?? STAGE_PREREQUISITES[stageId],
  };
}

function warnUnresolved(
  stageId: CanonicalWorkflowStageId,
  detail: string,
): void {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.warn(
    `[job-workflow-stage] unresolved destination for ${stageId}: ${detail}`,
  );
}

/**
 * Canonical estimate for stage documents.
 * Reuses selectActiveEstimate; falls back to newest excluded estimate for review.
 */
export function selectEstimateForStageDestination(
  estimates: JobEstimateSummary[],
): JobEstimateSummary | null {
  const active = selectActiveEstimate(estimates);
  if (active) {
    return active;
  }

  return (
    estimates
      .slice()
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ?? null
  );
}

function listActiveEstimatesForChooser(
  estimates: JobEstimateSummary[],
): JobEstimateSummary[] {
  const active = estimates.filter(
    (estimate) =>
      estimate.status !== "converted" &&
      estimate.status !== "cancelled" &&
      estimate.status !== "declined",
  );

  return active
    .slice()
    .sort(
      (left, right) =>
        Date.parse(right.createdAt) - Date.parse(left.createdAt),
    );
}

function selectInvoiceForStageDestination(
  invoices: JobInvoiceSummary[],
): JobInvoiceSummary | null {
  const active =
    invoices
      .filter((invoice) => isActiveInvoice(invoice))
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ?? null;

  if (active) {
    return active;
  }

  return (
    invoices
      .slice()
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ?? null
  );
}

function resolveEstimateDocument(
  estimates: JobEstimateSummary[],
  mode: "view" | "approval",
): JobWorkflowStageDestination | null {
  const chooserCandidates = listActiveEstimatesForChooser(estimates);
  if (chooserCandidates.length > 1) {
    return documentDestination(
      {
        kind: "estimate-chooser",
        estimateIds: chooserCandidates.map((estimate) => estimate.id),
      },
      "Choose estimate",
    );
  }

  const estimate = selectEstimateForStageDestination(estimates);
  if (!estimate) {
    return null;
  }

  if (mode === "approval") {
    return documentDestination(
      { kind: "estimate-approval", estimateId: estimate.id },
      `Estimate ${estimate.estimateNumber}`,
    );
  }

  return documentDestination(
    { kind: "estimate-view", estimateId: estimate.id },
    `Estimate ${estimate.estimateNumber}`,
  );
}

function resolveEstimateCreatedDestination(
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination {
  const estimateDoc = resolveEstimateDocument(context.estimates, "view");
  if (estimateDoc && context.canViewBilling) {
    return estimateDoc;
  }

  if (!selectEstimateForStageDestination(context.estimates) && context.canCreateEstimate) {
    return documentDestination(
      { kind: "estimate-create" },
      "Create Estimate",
    );
  }

  if (!context.canViewBilling && !context.canCreateEstimate) {
    return lockedDestination(
      "estimate_created",
      "Billing access is required to open or create estimates.",
    );
  }

  warnUnresolved("estimate_created", "no estimate and create unavailable");
  return lockedDestination("estimate_created");
}

function resolveCustomerApprovalDestination(
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination {
  const estimate = selectEstimateForStageDestination(context.estimates);

  if (estimate && context.canViewBilling) {
    const approvalDoc = resolveEstimateDocument(context.estimates, "approval");
    if (approvalDoc) {
      return approvalDoc;
    }
  }

  if (!estimate && context.canCreateEstimate) {
    return documentDestination(
      { kind: "estimate-create" },
      "Create Estimate",
    );
  }

  if (!estimate) {
    return lockedDestination(
      "customer_approval",
      "Create and send an estimate before customer approval.",
    );
  }

  return lockedDestination(
    "customer_approval",
    "Billing access is required to open estimate approval.",
  );
}

function resolveInvoiceCreatedDestination(
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination {
  const invoice = selectInvoiceForStageDestination(context.invoices);

  if (invoice && context.canViewBilling) {
    return documentDestination(
      { kind: "invoice-view", invoiceId: invoice.id },
      `Invoice ${invoice.invoiceNumber}`,
    );
  }

  if (!invoice && context.canViewBilling) {
    const estimate = selectEstimateForStageDestination(context.estimates);
    return documentDestination(
      {
        kind: "invoice-create",
        estimateId: estimate?.id,
      },
      estimate ? "Create Invoice from Estimate" : "Create Invoice",
    );
  }

  if (!context.canViewBilling) {
    return lockedDestination(
      "invoice_created",
      "Office billing access is required to create or open invoices.",
    );
  }

  warnUnresolved("invoice_created", "no invoice and create unavailable");
  return lockedDestination("invoice_created");
}

function resolvePaymentReceivedDestination(
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination {
  const invoice = selectInvoiceForStageDestination(context.invoices);

  if (invoice && context.canViewBilling) {
    return documentDestination(
      { kind: "payment", invoiceId: invoice.id },
      `Payment · Invoice ${invoice.invoiceNumber}`,
    );
  }

  if (!invoice) {
    return lockedDestination(
      "payment_received",
      "An invoice must exist before payment can be recorded.",
    );
  }

  return lockedDestination(
    "payment_received",
    "Billing access is required to open payment details.",
  );
}

/**
 * Resolve where a workflow stage marker should open on Job Detail.
 * Always returns an exact document, meaningful section, or lock.
 */
export function resolveJobWorkflowStageDestination(
  stage: CanonicalWorkflowStage,
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination {
  switch (stage.id) {
    case "job_created":
      if (context.canEditJob) {
        return documentDestination({ kind: "job-details" }, "Edit Job");
      }
      return documentDestination({ kind: "job-details" }, "Job details");

    case "technician_assigned":
      return documentDestination(
        { kind: "technician-assignment" },
        "Technician assignment",
      );

    case "inspection":
      return documentDestination(
        { kind: "inspection" },
        "Inspection and work scope",
      );

    case "estimate_created":
      return resolveEstimateCreatedDestination(context);

    case "customer_approval":
      return resolveCustomerApprovalDestination(context);

    case "work_in_progress":
      return documentDestination(
        { kind: "work-controls" },
        "Work controls",
      );

    case "work_completed":
      if (context.jobStatus === "completed") {
        return documentDestination(
          { kind: "completion-details" },
          "Completion details",
        );
      }
      if (context.canUpdateStatus && context.jobStatus === "in_progress") {
        return documentDestination({ kind: "completion" }, "Complete work");
      }
      return lockedDestination(
        "work_completed",
        context.jobStatus === "in_progress"
          ? "Status update permission is required to complete work."
          : "Start and finish on-site work before opening completion.",
      );

    case "invoice_created":
      return resolveInvoiceCreatedDestination(context);

    case "payment_received":
      return resolvePaymentReceivedDestination(context);

    case "completed":
      return documentDestination(
        { kind: "completed-summary" },
        "Completed job summary",
      );

    default: {
      warnUnresolved(stage.id, "unknown stage id");
      return lockedDestination(
        "job_created",
        "This workflow stage has no destination mapping.",
      );
    }
  }
}

/** @deprecated Prefer document destinations; kept for section scroll helpers. */
export function jobWorkflowScopeSectionId(): string {
  return JOB_DETAIL_SCOPE_ANCHOR;
}
