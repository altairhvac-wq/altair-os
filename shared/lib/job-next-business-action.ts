import { canResendEstimateEmail, type EstimateStatus } from "@/shared/types/estimate";
import {
  canResendInvoiceEmail,
  hasInvoiceUnpaidBalance,
  isActiveInvoice,
  type InvoiceStatus,
} from "@/shared/types/invoice";
import type { JobStatus } from "@/shared/types/job";
import {
  isValidOfficeReviewQueueCustomerId,
  isValidOfficeReviewQueueJobId,
  safeBuildQueueActionHref,
} from "@/shared/types/office-review-queue";

export type JobEstimateSummary = {
  id: string;
  status: EstimateStatus;
  createdAt: string;
  estimateNumber: string;
};

export type JobInvoiceSummary = {
  id: string;
  status: InvoiceStatus;
  balanceDue: number;
  amountPaid: number;
  createdAt: string;
  invoiceNumber: string;
};

export type JobBillingSummariesByJobId = {
  estimatesByJobId: Record<string, JobEstimateSummary[]>;
  invoicesByJobId: Record<string, JobInvoiceSummary[]>;
};

export type JobBusinessActionId =
  | "create_estimate"
  | "finish_send_estimate"
  | "awaiting_approval"
  | "complete_work"
  | "create_invoice"
  | "awaiting_payment";

export type JobBusinessActionSecondaryId = "resend_estimate" | "resend_invoice";

export type JobBusinessActionKind = "cta" | "status" | "workflow_align";

export type JobBusinessActionSecondary = {
  id: JobBusinessActionSecondaryId;
  label: string;
  estimateId?: string;
  invoiceId?: string;
  href: string;
};

export type JobBusinessAction = {
  id: JobBusinessActionId;
  label: string;
  kind: JobBusinessActionKind;
  emphasize: boolean;
  estimateId?: string;
  invoiceId?: string;
  href?: string;
  hint?: string;
  secondary?: JobBusinessActionSecondary;
};

export type JobBusinessActionInput = {
  jobId: string;
  customerId?: string;
  jobStatus: JobStatus;
  estimates: JobEstimateSummary[];
  invoices: JobInvoiceSummary[];
};

export type JobBusinessActionOptions = {
  canCreateEstimate?: boolean;
  canViewBilling?: boolean;
};

const EXCLUDED_ESTIMATE_STATUSES = new Set<EstimateStatus>([
  "converted",
  "cancelled",
  "declined",
]);

function selectActiveEstimate(
  estimates: JobEstimateSummary[],
): JobEstimateSummary | null {
  return (
    estimates
      .filter((estimate) => !EXCLUDED_ESTIMATE_STATUSES.has(estimate.status))
      .sort(
        (left, right) =>
          Date.parse(right.createdAt) - Date.parse(left.createdAt),
      )[0] ?? null
  );
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

function buildEstimateHref(estimateId: string): string | null {
  return safeBuildQueueActionHref(`/estimates/${encodeURIComponent(estimateId)}`);
}

function buildInvoiceHref(invoiceId: string): string | null {
  return safeBuildQueueActionHref(`/invoices/${encodeURIComponent(invoiceId)}`);
}

function buildCreateInvoiceHref(
  jobId: string,
  customerId: string | undefined,
): string | null {
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

  return safeBuildQueueActionHref("/invoices", params);
}

/**
 * Pure, deterministic next business action for a job from estimate/invoice summaries.
 * Does not change job lifecycle — labels and prioritizes billing guidance only.
 */
export function getJobNextBusinessAction(
  input: JobBusinessActionInput,
  options: JobBusinessActionOptions = {},
): JobBusinessAction | null {
  const { jobId, customerId, jobStatus, estimates, invoices } = input;
  const canCreateEstimate = options.canCreateEstimate ?? false;
  const canViewBilling = options.canViewBilling ?? false;

  if (jobStatus === "cancelled") {
    return null;
  }

  if (jobStatus === "completed") {
    if (!canViewBilling) {
      return null;
    }

    const activeInvoice = selectNewestActiveInvoice(invoices);

    if (!activeInvoice) {
      const href = buildCreateInvoiceHref(jobId, customerId);
      if (!href) {
        return null;
      }

      return {
        id: "create_invoice",
        label: "Create Invoice",
        kind: "cta",
        emphasize: true,
        href,
        hint: "Work is finished — create an invoice to bill the customer.",
      };
    }

    if (hasInvoiceUnpaidBalance(activeInvoice)) {
      const href = buildInvoiceHref(activeInvoice.id);
      const secondaryHref = canResendInvoiceEmail(activeInvoice.status)
        ? href
        : null;

      return {
        id: "awaiting_payment",
        label: "Awaiting Payment",
        kind: "status",
        emphasize: true,
        invoiceId: activeInvoice.id,
        href: href ?? undefined,
        hint: "Invoice sent — payment is still outstanding.",
        secondary:
          secondaryHref && canViewBilling
            ? {
                id: "resend_invoice",
                label: "Resend Invoice",
                invoiceId: activeInvoice.id,
                href: secondaryHref,
              }
            : undefined,
      };
    }

    return null;
  }

  const estimate = selectActiveEstimate(estimates);

  if (!estimate) {
    if (!canCreateEstimate) {
      return null;
    }

    return {
      id: "create_estimate",
      label: "Create Estimate",
      kind: "cta",
      emphasize: true,
      hint: "No estimate yet — quote repair or install work before finishing the job.",
    };
  }

  switch (estimate.status) {
    case "draft": {
      if (!canCreateEstimate && !canViewBilling) {
        return null;
      }

      const href = buildEstimateHref(estimate.id);

      return {
        id: "finish_send_estimate",
        label: "Finish/Send Estimate",
        kind: "cta",
        emphasize: true,
        estimateId: estimate.id,
        href: href ?? undefined,
        hint: "Draft saved — finish line items and send for customer approval.",
      };
    }
    case "sent": {
      const href = buildEstimateHref(estimate.id);

      return {
        id: "awaiting_approval",
        label: "Awaiting Approval",
        kind: "status",
        emphasize: true,
        estimateId: estimate.id,
        href: href ?? undefined,
        hint: "Estimate sent — waiting on customer approval before work is finished.",
        secondary:
          canViewBilling && canResendEstimateEmail(estimate.status) && href
            ? {
                id: "resend_estimate",
                label: "Resend Estimate",
                estimateId: estimate.id,
                href,
              }
            : undefined,
      };
    }
    case "approved":
      if (jobStatus === "in_progress") {
        return {
          id: "complete_work",
          label: "Complete Work",
          kind: "workflow_align",
          emphasize: false,
          hint: "Estimate approved — complete work when finished on site.",
        };
      }
      return null;
    default:
      return null;
  }
}

export function isFieldEstimateBusinessAction(
  action: JobBusinessAction | null,
): boolean {
  return (
    action?.id === "create_estimate" || action?.id === "finish_send_estimate"
  );
}
