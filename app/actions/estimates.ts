"use server";

import { revalidatePath } from "next/cache";
import { canApproveEstimateOnSite } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import {
  createEstimate,
  getEstimateById,
  updateEstimateStatus,
} from "@/lib/database/queries/estimates";
import { upsertBillingSignature } from "@/lib/database/queries/billing-signatures";
import { getJobById } from "@/lib/database/queries/jobs";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  recordEstimateCreatedActivity,
  recordEstimateEmailResentActivity,
  recordEstimateStatusChangedActivity,
} from "@/lib/database/services/estimate-activity";
import { createEstimateApprovalTokenForEmail } from "@/lib/database/queries/estimate-approval-tokens";
import {
  getApprovalLinkFailureUserMessage,
  getBillingEmailFailureUserMessage,
  logBillingEmailFailure,
  INVALID_APP_URL_USER_MESSAGE,
  MISSING_APP_URL_USER_MESSAGE,
} from "@/lib/email/billing-failure";
import { resolveAppBaseUrl } from "@/lib/email/env";
import { sendEstimateEmail, toBillingEmailDelivery } from "@/lib/email/billing-send";
import type { BillingEmailDelivery } from "@/lib/email/billing-send";
import { buildEstimateApprovalUrl } from "@/shared/lib/estimate-approval-link";
import { mapCompanyRowToBillingContact } from "@/shared/lib/billing-company-contact";
import { isValidEmail } from "@/shared/lib/email-validation";
import {
  canResendEstimateEmail,
  getCreateEstimateJobBlockReason,
  getSendEstimateJobBlockReason,
  isAllowedEstimateStatusTransition,
  type EstimateDetail,
  type EstimateFormData,
  type EstimateStatus,
  type FieldEstimateFormData,
} from "@/shared/types/estimate";
import { recordLeadEstimateCreatedFromLeadAction } from "@/app/actions/leads";
import { applyEstimateCreationDefaults } from "@/shared/lib/company-billing-defaults";
import { formatActionError } from "@/shared/lib/operational-errors";

async function buildEstimateApprovalEmailUrl(input: {
  companyId: string;
  estimateId: string;
  customerEmail: string;
  createdBy: string;
}): Promise<{ approvalUrl?: string; error?: string }> {
  const appUrl = resolveAppBaseUrl();

  if (!appUrl.ok) {
    const error =
      appUrl.reason === "invalid"
        ? INVALID_APP_URL_USER_MESSAGE
        : MISSING_APP_URL_USER_MESSAGE;

    console.error("[buildEstimateApprovalEmailUrl] app URL not configured:", {
      estimateId: input.estimateId,
      reason: appUrl.reason,
      hasExplicitAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
      hasVercelUrl: Boolean(process.env.VERCEL_URL?.trim()),
    });

    return { error };
  }

  const { rawToken, error } = await createEstimateApprovalTokenForEmail({
    companyId: input.companyId,
    estimateId: input.estimateId,
    customerEmail: input.customerEmail,
    createdBy: input.createdBy,
  });

  if (error || !rawToken) {
    console.error("[buildEstimateApprovalEmailUrl] approval token creation failed:", {
      estimateId: input.estimateId,
      error: error ?? "missing raw token",
    });

    return {
      error:
        getApprovalLinkFailureUserMessage(
          error ?? "Failed to create estimate approval link.",
        ),
    };
  }

  return {
    approvalUrl: buildEstimateApprovalUrl(appUrl.url, rawToken),
  };
}

export type CreateEstimateActionResult = {
  error?: string;
  estimate?: EstimateDetail;
};

export async function createEstimateAction(
  data: EstimateFormData,
  options?: { leadId?: string },
): Promise<CreateEstimateActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to create estimates." };
  }

  const billingDefaults = getCompanyBillingDefaultsFromRow(context.company);
  const normalizedData = applyEstimateCreationDefaults(
    data,
    billingDefaults,
    context.company.timezone,
  );

  const { estimate, error } = await createEstimate(
    context.company.id,
    normalizedData,
    context.company.timezone,
  );

  if (error || !estimate) {
    return { error: error ?? "Failed to create estimate." };
  }

  await recordEstimateCreatedActivity({
    companyId: context.company.id,
    estimateId: estimate.id,
    actorId: context.user.id,
    estimateNumber: estimate.estimateNumber,
    customerId: estimate.customerId,
    jobId: estimate.jobId,
    jobNumber: estimate.jobNumber,
    creationSource: "office",
  });

  const leadId = options?.leadId?.trim();
  if (leadId) {
    await recordLeadEstimateCreatedFromLeadAction({
      leadId,
      estimateId: estimate.id,
      estimateNumber: estimate.estimateNumber,
    });
  }

  revalidatePath("/estimates");
  revalidatePath("/leads");
  return { estimate };
}

export type CreateFieldEstimateActionResult = {
  error?: string;
  estimate?: EstimateDetail;
};

async function assertFieldEstimateWritePermission(jobId: string): Promise<{
  error?: string;
  jobId?: string;
  customerId?: string;
  customerName?: string;
  jobNumber?: string;
}> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const job = await getJobById(context.company.id, jobId);

  if (!job) {
    return { error: "Linked job not found." };
  }

  if (!job.customerId?.trim()) {
    return { error: "This job does not have a customer assigned." };
  }

  const jobBlockReason = getCreateEstimateJobBlockReason(job.status);
  if (jobBlockReason) {
    return { error: jobBlockReason };
  }

  if (context.permissions.manageBilling) {
    return {
      jobId: job.id,
      customerId: job.customerId,
      customerName: job.customerName,
      jobNumber: job.jobNumber,
    };
  }

  if (!context.permissions.createFieldEstimates) {
    return { error: "You do not have permission to create estimates." };
  }

  if (job.assignedTechnicianId !== context.user.id) {
    return {
      error: "You can only create estimates for jobs assigned to you.",
    };
  }

  return {
    jobId: job.id,
    customerId: job.customerId,
    customerName: job.customerName,
    jobNumber: job.jobNumber,
  };
}

export async function createFieldEstimateFromJobAction(
  jobId: string,
  data: FieldEstimateFormData,
): Promise<CreateFieldEstimateActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const permission = await assertFieldEstimateWritePermission(jobId);
  if (permission.error || !permission.jobId || !permission.customerId) {
    return { error: permission.error ?? "Unable to create estimate for this job." };
  }

  const billingDefaults = getCompanyBillingDefaultsFromRow(context.company);
  const estimateData: EstimateFormData = {
    customerId: permission.customerId,
    jobId: permission.jobId,
    status: "draft",
    validUntil: "",
    notes: data.notes?.trim() ?? "",
    taxRate: billingDefaults.defaultTaxRate,
    lineItems: data.lineItems,
  };

  const normalizedData = applyEstimateCreationDefaults(
    estimateData,
    billingDefaults,
    context.company.timezone,
  );

  normalizedData.status = "draft";

  const { estimate, error } = await createEstimate(
    context.company.id,
    normalizedData,
    context.company.timezone,
    {
      customerName: permission.customerName ?? "Customer",
      jobNumber: permission.jobNumber,
    },
  );

  if (error || !estimate) {
    return { error: error ?? "Failed to create estimate." };
  }

  await recordEstimateCreatedActivity({
    companyId: context.company.id,
    estimateId: estimate.id,
    actorId: context.user.id,
    estimateNumber: estimate.estimateNumber,
    customerId: estimate.customerId,
    jobId: estimate.jobId,
    jobNumber: estimate.jobNumber,
    creationSource: context.permissions.manageBilling ? "office" : "field",
  });

  revalidatePath("/estimates");
  revalidatePath("/technician");
  revalidatePath(`/jobs/${permission.jobId}`);

  return { estimate };
}

export type UpdateEstimateStatusActionResult = {
  error?: string;
  estimate?: EstimateDetail;
  emailDelivery?: BillingEmailDelivery;
};

export async function updateEstimateStatusAction(
  estimateId: string,
  fromStatus: EstimateStatus,
  toStatus: EstimateStatus,
): Promise<UpdateEstimateStatusActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to update estimates." };
  }

  const currentEstimate = await getEstimateById(context.company.id, estimateId);

  if (!currentEstimate) {
    return { error: "Estimate not found." };
  }

  if (currentEstimate.status !== fromStatus) {
    return {
      error: "Estimate status has changed. Refresh the page and try again.",
    };
  }

  if (!isAllowedEstimateStatusTransition(fromStatus, toStatus)) {
    return { error: "This estimate status change is not allowed." };
  }

  if (fromStatus === "draft" && toStatus === "sent") {
    if (currentEstimate.jobId) {
      const linkedJob = await getJobById(
        context.company.id,
        currentEstimate.jobId,
      );
      const jobBlockReason = linkedJob
        ? getSendEstimateJobBlockReason(linkedJob.status)
        : null;

      if (jobBlockReason) {
        return { error: jobBlockReason };
      }
    }

    const customerEmail = currentEstimate.customerEmail?.trim();

    if (!customerEmail || !isValidEmail(customerEmail)) {
      return {
        error:
          "A valid customer email is required to send this estimate. Add an email on the customer record and try again.",
      };
    }

    const { estimate: sentEstimate, error: statusError } =
      await updateEstimateStatus(
        context.company.id,
        estimateId,
        fromStatus,
        toStatus,
      );

    if (statusError || !sentEstimate) {
      return { error: statusError ?? "We couldn't mark this estimate as sent. Try again." };
    }

    const approvalLink = await buildEstimateApprovalEmailUrl({
      companyId: context.company.id,
      estimateId,
      customerEmail,
      createdBy: context.user.id,
    });

    if (approvalLink.error) {
      console.error(
        "[updateEstimateStatusAction] approval link generation failed before email send:",
        {
          estimateId,
          error: approvalLink.error,
        },
      );

      const { error: revertError } = await updateEstimateStatus(
        context.company.id,
        estimateId,
        "sent",
        "draft",
      );

      if (revertError) {
        console.error(
          "[updateEstimateStatusAction] failed to revert estimate after approval link failure:",
          { estimateId, revertError },
        );
      }

      return {
        error: getApprovalLinkFailureUserMessage(approvalLink.error),
      };
    }

    const emailResult = await sendEstimateEmail({
      to: customerEmail,
      company: mapCompanyRowToBillingContact(context.company),
      customerName: currentEstimate.customerName,
      estimateNumber: currentEstimate.estimateNumber,
      issuedDate: currentEstimate.createdAt.slice(0, 10),
      subtotal: currentEstimate.subtotal,
      taxRate: currentEstimate.taxRate,
      taxAmount: currentEstimate.tax ?? 0,
      total: currentEstimate.total,
      validUntil: currentEstimate.validUntil,
      timeZone: context.company.timezone,
      lineItems: currentEstimate.lineItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      notes: currentEstimate.notes,
      approvalUrl: approvalLink.approvalUrl,
    });

    if (!emailResult.ok) {
      logBillingEmailFailure(
        "updateEstimateStatusAction",
        emailResult,
        { estimateId },
      );

      const { error: revertError } = await updateEstimateStatus(
        context.company.id,
        estimateId,
        "sent",
        "draft",
      );

      const emailDelivery = toBillingEmailDelivery(emailResult);
      const classifiedError = getBillingEmailFailureUserMessage(emailResult, {
        document: "estimate",
        mode: "send",
      });

      if (revertError) {
        console.error(
          "[updateEstimateStatusAction] failed to revert estimate after email failure:",
          { estimateId, revertError },
        );
        return {
          error:
            "Estimate could not be sent by email, and the status could not be reverted safely. Refresh the page and verify the estimate status before retrying.",
          emailDelivery,
        };
      }

      return { error: classifiedError, emailDelivery };
    }

    await recordEstimateStatusChangedActivity({
      companyId: context.company.id,
      estimateId,
      actorId: context.user.id,
      fromStatus,
      toStatus,
      customerId: sentEstimate.customerId,
      jobId: sentEstimate.jobId,
      jobNumber: sentEstimate.jobNumber,
      estimateNumber: sentEstimate.estimateNumber,
    });

    revalidatePath("/estimates");
    revalidatePath(`/estimates/${estimateId}`);

    const emailDelivery = toBillingEmailDelivery(emailResult);

    return {
      estimate: sentEstimate,
      emailDelivery: emailDelivery.recipientRedirect?.redirected
        ? emailDelivery
        : undefined,
    };
  }

  const { estimate, error } = await updateEstimateStatus(
    context.company.id,
    estimateId,
    fromStatus,
    toStatus,
  );

  if (error || !estimate) {
    return { error: error ?? "Failed to update estimate status." };
  }

  await recordEstimateStatusChangedActivity({
    companyId: context.company.id,
    estimateId,
    actorId: context.user.id,
    fromStatus,
    toStatus,
    customerId: estimate.customerId,
    jobId: estimate.jobId,
    jobNumber: estimate.jobNumber,
    estimateNumber: estimate.estimateNumber,
    approvalSource: toStatus === "approved" ? "admin_manual" : undefined,
  });

  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);
  if (toStatus === "approved") {
    revalidatePath("/dispatch");
    if (estimate.jobId) {
      revalidatePath("/technician");
      revalidatePath(`/jobs/${estimate.jobId}`);
    }
  }

  return { estimate };
}

export type BatchSendEstimateResultItem = {
  estimateId: string;
  estimateNumber: string;
  success: boolean;
  error?: string;
  estimate?: EstimateDetail;
};

export type BatchSendEstimatesActionResult = {
  error?: string;
  results: BatchSendEstimateResultItem[];
  successCount: number;
  failureCount: number;
};

export async function batchSendEstimatesAction(
  estimateIds: string[],
): Promise<BatchSendEstimatesActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return {
      error: NO_ACTIVE_COMPANY_MESSAGE,
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  if (!context.permissions.manageBilling) {
    return {
      error: "You do not have permission to send estimates.",
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const uniqueIds = [...new Set(estimateIds.map((id) => id.trim()).filter(Boolean))];

  if (uniqueIds.length === 0) {
    return {
      error: "Select at least one estimate to send.",
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const results: BatchSendEstimateResultItem[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const estimateId of uniqueIds) {
    const sendResult = await updateEstimateStatusAction(estimateId, "draft", "sent");

    if (sendResult.error || !sendResult.estimate) {
      const currentEstimate = await getEstimateById(context.company.id, estimateId);

      results.push({
        estimateId,
        estimateNumber: currentEstimate?.estimateNumber ?? estimateId,
        success: false,
        error: formatActionError(
          sendResult.error,
          "We couldn't send this estimate. Try again.",
        ),
      });
      failureCount += 1;
      continue;
    }

    results.push({
      estimateId,
      estimateNumber: sendResult.estimate.estimateNumber,
      success: true,
      estimate: sendResult.estimate,
    });
    successCount += 1;
  }

  revalidatePath("/estimates");

  return {
    results,
    successCount,
    failureCount,
  };
}

export type ResendEstimateEmailActionResult = {
  error?: string;
  estimate?: EstimateDetail;
  emailDelivery?: BillingEmailDelivery;
};

export async function resendEstimateEmailAction(
  estimateId: string,
): Promise<ResendEstimateEmailActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to resend estimate emails." };
  }

  const currentEstimate = await getEstimateById(context.company.id, estimateId);

  if (!currentEstimate) {
    return { error: "Estimate not found." };
  }

  if (!canResendEstimateEmail(currentEstimate.status)) {
    return {
      error:
        "Only sent estimates can be resent by email. Refresh the page and try again.",
    };
  }

  if (currentEstimate.jobId) {
    const linkedJob = await getJobById(
      context.company.id,
      currentEstimate.jobId,
    );
    const jobBlockReason = linkedJob
      ? getSendEstimateJobBlockReason(linkedJob.status)
      : null;

    if (jobBlockReason) {
      return { error: jobBlockReason };
    }
  }

  const customerEmail = currentEstimate.customerEmail?.trim();

  if (!customerEmail || !isValidEmail(customerEmail)) {
    return {
      error:
        "A valid customer email is required to resend this estimate. Add an email on the customer record and try again.",
    };
  }

  const approvalLink = await buildEstimateApprovalEmailUrl({
    companyId: context.company.id,
    estimateId,
    customerEmail,
    createdBy: context.user.id,
  });

  if (approvalLink.error) {
    console.error(
      "[resendEstimateEmailAction] approval link generation failed before email send:",
      {
        estimateId,
        error: approvalLink.error,
      },
    );

    return { error: getApprovalLinkFailureUserMessage(approvalLink.error) };
  }

  const emailResult = await sendEstimateEmail({
    to: customerEmail,
    company: mapCompanyRowToBillingContact(context.company),
    customerName: currentEstimate.customerName,
    estimateNumber: currentEstimate.estimateNumber,
    issuedDate: currentEstimate.createdAt.slice(0, 10),
    subtotal: currentEstimate.subtotal,
    taxRate: currentEstimate.taxRate,
    taxAmount: currentEstimate.tax ?? 0,
    total: currentEstimate.total,
    validUntil: currentEstimate.validUntil,
    timeZone: context.company.timezone,
    lineItems: currentEstimate.lineItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    notes: currentEstimate.notes,
    approvalUrl: approvalLink.approvalUrl,
  });

  if (!emailResult.ok) {
    logBillingEmailFailure("resendEstimateEmailAction", emailResult, {
      estimateId,
    });

    const emailDelivery = toBillingEmailDelivery(emailResult);

    return {
      error: getBillingEmailFailureUserMessage(emailResult, {
        document: "estimate",
        mode: "resend",
      }),
      emailDelivery,
    };
  }

  await recordEstimateEmailResentActivity({
    companyId: context.company.id,
    estimateId,
    actorId: context.user.id,
    estimateNumber: currentEstimate.estimateNumber,
    customerId: currentEstimate.customerId,
    jobId: currentEstimate.jobId,
    jobNumber: currentEstimate.jobNumber,
  });

  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);

  if (currentEstimate.jobId) {
    revalidatePath(`/jobs/${currentEstimate.jobId}`);
  }

  const emailDelivery = toBillingEmailDelivery(emailResult);

  return {
    estimate: currentEstimate,
    emailDelivery: emailDelivery.recipientRedirect?.redirected
      ? emailDelivery
      : undefined,
  };
}

export type ApproveEstimateOnSiteActionResult = {
  error?: string;
  estimate?: EstimateDetail;
};

export async function approveEstimateOnSiteAction(
  estimateId: string,
  formData: FormData,
): Promise<ApproveEstimateOnSiteActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  const signerName = String(formData.get("signerName") ?? "");
  const signatureData = String(formData.get("signatureData") ?? "");
  const authorized = formData.get("authorized") === "on";

  if (!authorized) {
    return {
      error:
        "Please confirm that the customer authorizes the proposed work before approving.",
    };
  }

  const currentEstimate = await getEstimateById(context.company.id, estimateId);

  if (!currentEstimate) {
    return { error: "Estimate not found." };
  }

  if (currentEstimate.status !== "sent") {
    return {
      error: "Only sent estimates can be approved on site. Refresh and try again.",
    };
  }

  if (!currentEstimate.jobId) {
    return {
      error: "This estimate must be linked to a job before on-site approval.",
    };
  }

  const linkedJob = await getJobById(
    context.company.id,
    currentEstimate.jobId,
  );

  if (!linkedJob) {
    return { error: "Linked job not found." };
  }

  if (!canApproveEstimateOnSite(context, linkedJob)) {
    return {
      error: "You do not have permission to approve this estimate on site.",
    };
  }

  const { signature, error: signatureError } = await upsertBillingSignature(
    context.company.id,
    context.user.id,
    "estimate",
    estimateId,
    { signerName, signatureData },
  );

  if (signatureError || !signature) {
    return {
      error: signatureError ?? "We couldn't save the customer signature.",
    };
  }

  const { estimate, error: statusError } = await updateEstimateStatus(
    context.company.id,
    estimateId,
    "sent",
    "approved",
  );

  if (statusError || !estimate) {
    return {
      error: statusError ?? "We couldn't approve this estimate. Try again.",
    };
  }

  await recordEstimateStatusChangedActivity({
    companyId: context.company.id,
    estimateId,
    actorId: context.user.id,
    fromStatus: "sent",
    toStatus: "approved",
    customerId: estimate.customerId,
    jobId: estimate.jobId,
    jobNumber: estimate.jobNumber,
    estimateNumber: estimate.estimateNumber,
    approvalSource: "technician_device",
    signerName: signature.signerName,
  });

  const customerEmail = estimate.customerEmail?.trim();
  if (customerEmail && isValidEmail(customerEmail)) {
    const emailResult = await sendEstimateEmail({
      to: customerEmail,
      company: mapCompanyRowToBillingContact(context.company),
      customerName: estimate.customerName,
      estimateNumber: estimate.estimateNumber,
      issuedDate: estimate.createdAt.slice(0, 10),
      subtotal: estimate.subtotal,
      taxRate: estimate.taxRate,
      taxAmount: estimate.tax ?? 0,
      total: estimate.total,
      validUntil: estimate.validUntil,
      timeZone: context.company.timezone,
      lineItems: estimate.lineItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      notes: estimate.notes,
      signature,
    });

    if (!emailResult.ok) {
      logBillingEmailFailure("approveEstimateOnSiteAction", emailResult, {
        estimateId,
      });
    }
  }

  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);
  revalidatePath("/technician");
  revalidatePath("/dispatch");
  revalidatePath(`/jobs/${estimate.jobId}`);

  return { estimate };
}
