/**
 * Job Detail presentation map: workflow stages → in-page destinations.
 * Navigation only — never mutates status or permissions.
 */

import type {
  CanonicalWorkflowStage,
  CanonicalWorkflowStageId,
  JobWorkflowAvailableAction,
} from "@/shared/lib/workflow";
import type {
  JobEstimateSummary,
  JobInvoiceSummary,
} from "@/shared/lib/job-next-business-action";
import {
  JOB_DETAIL_ACTIVITY_ANCHOR,
  JOB_DETAIL_BILLING_ANCHOR,
  JOB_DETAIL_DISPATCH_ANCHOR,
  JOB_DETAIL_NEXT_ACTION_ANCHOR,
  JOB_DETAIL_SCOPE_ANCHOR,
} from "@/shared/lib/jobs/job-detail-anchors";

export type JobWorkflowStageDestination =
  | {
      kind: "section";
      sectionId: string;
      label: string;
    }
  | {
      kind: "href";
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
  canViewBilling: boolean;
  showBillingSection: boolean;
  showEquipmentSection: boolean;
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
};

const STAGE_PREREQUISITES: Record<CanonicalWorkflowStageId, string> = {
  job_created: "This stage unlocks when the job is created.",
  technician_assigned: "Assign a technician to advance this stage.",
  inspection: "Complete inspection or field notes after the technician is on site.",
  estimate_created: "Create an estimate to unlock this stage.",
  customer_approval: "Waiting for an estimate to be sent first.",
  work_in_progress: "Start work on site to advance this stage.",
  work_completed: "Complete the job wrap-up to unlock this stage.",
  invoice_created: "Create an invoice after work is ready to bill.",
  payment_received: "Record payment after an invoice is issued.",
  completed: "Finish remaining workflow steps to complete this job.",
};

function newestEstimate(
  estimates: JobEstimateSummary[],
): JobEstimateSummary | null {
  return estimates[0] ?? null;
}

function newestInvoice(invoices: JobInvoiceSummary[]): JobInvoiceSummary | null {
  return invoices[0] ?? null;
}

function sectionDestination(
  sectionId: string,
  label: string,
): JobWorkflowStageDestination {
  return { kind: "section", sectionId, label };
}

function nextActionDestination(): JobWorkflowStageDestination {
  return sectionDestination(JOB_DETAIL_NEXT_ACTION_ANCHOR, "Next action");
}

function lockedDestination(stageId: CanonicalWorkflowStageId): JobWorkflowStageDestination {
  return {
    kind: "locked",
    reason: STAGE_PREREQUISITES[stageId],
  };
}

function resolveContentDestination(
  stageId: CanonicalWorkflowStageId,
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination | null {
  const estimate = newestEstimate(context.estimates);
  const invoice = newestInvoice(context.invoices);

  switch (stageId) {
    case "job_created":
      return sectionDestination(JOB_DETAIL_SCOPE_ANCHOR, "Work scope");

    case "technician_assigned":
      return sectionDestination(JOB_DETAIL_DISPATCH_ANCHOR, "Dispatch");

    case "inspection":
      return sectionDestination(JOB_DETAIL_SCOPE_ANCHOR, "Work scope");

    case "estimate_created":
      if (context.canViewBilling && estimate) {
        return {
          kind: "href",
          href: `/estimates/${estimate.id}`,
          label: `Estimate ${estimate.estimateNumber}`,
        };
      }
      if (context.showBillingSection) {
        return sectionDestination(JOB_DETAIL_BILLING_ANCHOR, "Billing");
      }
      return null;

    case "customer_approval":
      if (context.canViewBilling && estimate) {
        return {
          kind: "href",
          href: `/estimates/${estimate.id}`,
          label: `Estimate ${estimate.estimateNumber}`,
        };
      }
      if (context.showBillingSection) {
        return sectionDestination(JOB_DETAIL_BILLING_ANCHOR, "Billing");
      }
      return null;

    case "work_in_progress":
      return sectionDestination(JOB_DETAIL_SCOPE_ANCHOR, "Work scope");

    case "work_completed":
      return sectionDestination(JOB_DETAIL_ACTIVITY_ANCHOR, "History");

    case "invoice_created":
      if (context.canViewBilling && invoice) {
        return {
          kind: "href",
          href: `/invoices/${invoice.id}`,
          label: `Invoice ${invoice.invoiceNumber}`,
        };
      }
      if (context.showBillingSection) {
        return sectionDestination(JOB_DETAIL_BILLING_ANCHOR, "Billing");
      }
      return null;

    case "payment_received":
      if (context.canViewBilling && invoice) {
        return {
          kind: "href",
          href: `/invoices/${invoice.id}`,
          label: `Invoice ${invoice.invoiceNumber}`,
        };
      }
      if (context.showBillingSection) {
        return sectionDestination(JOB_DETAIL_BILLING_ANCHOR, "Billing");
      }
      return null;

    case "completed":
      return sectionDestination(JOB_DETAIL_ACTIVITY_ANCHOR, "History");

    default:
      return null;
  }
}

function isNextActionableStage(
  stage: CanonicalWorkflowStage,
  context: JobWorkflowStageDestinationContext,
): boolean {
  if (!context.primaryAction || stage.state !== "upcoming") {
    return false;
  }

  const current = context.stages.find((item) => item.state === "current");
  if (!current) {
    return true;
  }

  const currentIndex = context.stages.findIndex((item) => item.id === current.id);
  const stageIndex = context.stages.findIndex((item) => item.id === stage.id);
  return stageIndex === currentIndex + 1;
}

/**
 * Resolve where a workflow stage marker should navigate on Job Detail.
 */
export function resolveJobWorkflowStageDestination(
  stage: CanonicalWorkflowStage,
  context: JobWorkflowStageDestinationContext,
): JobWorkflowStageDestination {
  if (stage.state === "skipped") {
    const content = resolveContentDestination(stage.id, context);
    if (content) {
      return content;
    }
    return {
      kind: "locked",
      reason: "This stage was skipped for this job.",
    };
  }

  if (isNextActionableStage(stage, context)) {
    return nextActionDestination();
  }

  if (stage.state === "complete" || stage.state === "current") {
    const content = resolveContentDestination(stage.id, context);
    if (content) {
      return content;
    }
    return nextActionDestination();
  }

  // Upcoming / future
  const content = resolveContentDestination(stage.id, context);
  if (content && content.kind === "href") {
    return content;
  }
  if (content && content.kind === "section" && stage.state === "upcoming") {
    // Prefer explaining the prerequisite over jumping ahead into empty sections.
    return lockedDestination(stage.id);
  }

  return lockedDestination(stage.id);
}
