/**
 * Job Detail presentation map: workflow stages → exact artifacts/actions.
 * Navigation only — never mutates status or permissions.
 */

import {
  createEstimateForCustomerHref,
  createInvoiceForCustomerHref,
} from "@/shared/lib/customers/customer-action-links";
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
import {
  JOB_DETAIL_ACTIVITY_ANCHOR,
  JOB_DETAIL_DISPATCH_ANCHOR,
  JOB_DETAIL_SCOPE_ANCHOR,
} from "@/shared/lib/jobs/job-detail-anchors";
import { isActiveInvoice } from "@/shared/types/invoice";
import {
  isValidOfficeReviewQueueCustomerId,
  isValidOfficeReviewQueueJobId,
  safeBuildQueueActionHref,
} from "@/shared/types/office-review-queue";

export type JobWorkflowStageDestinationAction =
  | "create-estimate"
  | "create-invoice";

export type JobWorkflowStageDestination =
  | {
      kind: "route";
      href: string;
      label: string;
    }
  | {
      kind: "section";
      sectionId: string;
      label: string;
    }
  | {
      kind: "action";
      action: JobWorkflowStageDestinationAction;
      href: string;
      label: string;
    }
  | {
      kind: "locked";
      reason: string;
    };

export type JobWorkflowStageDestinationContext = {
  stages: CanonicalWorkflowStage[];
  primaryAction: JobWorkflowAvailableAction | null;
  jobId: string;
  customerId: string;
  canViewBilling: boolean;
  canCreateEstimate: boolean;
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
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

function sectionDestination(
  sectionId: string,
  label: string,
): JobWorkflowStageDestination {
  return { kind: "section", sectionId, label };
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
 * Canonical estimate for stage deep-links.
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

function estimateRoute(estimate: JobEstimateSummary): JobWorkflowStageDestination {
  const href =
    safeBuildQueueActionHref(`/estimates/${encodeURIComponent(estimate.id)}`) ??
    `/estimates/${estimate.id}`;

  return {
    kind: "route",
    href,
    label: `Estimate ${estimate.estimateNumber}`,
  };
}

function invoiceRoute(invoice: JobInvoiceSummary): JobWorkflowStageDestination {
  const href =
    safeBuildQueueActionHref(`/invoices/${encodeURIComponent(invoice.id)}`) ??
    `/invoices/${invoice.id}`;

  return {
    kind: "route",
    href,
    label: `Invoice ${invoice.invoiceNumber}`,
  };
}

function createEstimateDestination(
  customerId: string,
): JobWorkflowStageDestination | null {
  if (!isValidOfficeReviewQueueCustomerId(customerId)) {
    return null;
  }

  return {
    kind: "action",
    action: "create-estimate",
    href: createEstimateForCustomerHref(customerId),
    label: "Create Estimate",
  };
}

function createInvoiceDestination(
  jobId: string,
  customerId: string,
): JobWorkflowStageDestination | null {
  if (!isValidOfficeReviewQueueJobId(jobId)) {
    return null;
  }

  const params: Record<string, string> = {
    create: "1",
    jobId,
  };

  if (isValidOfficeReviewQueueCustomerId(customerId)) {
    params.customerId = customerId;
  }

  const href =
    safeBuildQueueActionHref("/invoices", params) ??
    createInvoiceForCustomerHref(customerId);

  return {
    kind: "action",
    action: "create-invoice",
    href,
    label: "Create Invoice",
  };
}

function resolveEstimateCreatedDestination(
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination {
  const estimate = selectEstimateForStageDestination(context.estimates);

  if (estimate && context.canViewBilling) {
    return estimateRoute(estimate);
  }

  if (!estimate && context.canCreateEstimate) {
    const create = createEstimateDestination(context.customerId);
    if (create) {
      return create;
    }
  }

  if (!context.canViewBilling && !context.canCreateEstimate) {
    return lockedDestination(
      "estimate_created",
      "Billing access is required to open or create estimates.",
    );
  }

  warnUnresolved("estimate_created", "no estimate and create href unavailable");
  return lockedDestination("estimate_created");
}

function resolveCustomerApprovalDestination(
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination {
  const estimate = selectEstimateForStageDestination(context.estimates);

  if (estimate && context.canViewBilling) {
    return estimateRoute(estimate);
  }

  if (!estimate && context.canCreateEstimate) {
    const create = createEstimateDestination(context.customerId);
    if (create) {
      return create;
    }
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
    return invoiceRoute(invoice);
  }

  if (!invoice && context.canViewBilling) {
    const create = createInvoiceDestination(context.jobId, context.customerId);
    if (create) {
      return create;
    }
  }

  if (!context.canViewBilling) {
    return lockedDestination(
      "invoice_created",
      "Office billing access is required to create or open invoices.",
    );
  }

  warnUnresolved("invoice_created", "no invoice and create href unavailable");
  return lockedDestination("invoice_created");
}

function resolvePaymentReceivedDestination(
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination {
  const invoice = selectInvoiceForStageDestination(context.invoices);

  if (invoice && context.canViewBilling) {
    return invoiceRoute(invoice);
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
 * Resolve where a workflow stage marker should navigate on Job Detail.
 * Always returns an exact artifact, creation action, meaningful section, or lock.
 */
export function resolveJobWorkflowStageDestination(
  stage: CanonicalWorkflowStage,
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination {
  switch (stage.id) {
    case "job_created":
      return sectionDestination(JOB_DETAIL_SCOPE_ANCHOR, "Work scope");

    case "technician_assigned":
      return sectionDestination(JOB_DETAIL_DISPATCH_ANCHOR, "Technician assignment");

    case "inspection":
      return sectionDestination(JOB_DETAIL_SCOPE_ANCHOR, "Inspection and work scope");

    case "estimate_created":
      return resolveEstimateCreatedDestination(context);

    case "customer_approval":
      return resolveCustomerApprovalDestination(context);

    case "work_in_progress":
      return sectionDestination(JOB_DETAIL_SCOPE_ANCHOR, "Work controls and scope");

    case "work_completed":
      return sectionDestination(
        JOB_DETAIL_ACTIVITY_ANCHOR,
        "Completion history",
      );

    case "invoice_created":
      return resolveInvoiceCreatedDestination(context);

    case "payment_received":
      return resolvePaymentReceivedDestination(context);

    case "completed":
      return sectionDestination(
        JOB_DETAIL_ACTIVITY_ANCHOR,
        "Completion summary",
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
