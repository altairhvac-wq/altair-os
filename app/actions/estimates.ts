"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import {
  createEstimate,
  getEstimateById,
  updateEstimateStatus,
} from "@/lib/database/queries/estimates";
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
  getSendEstimateJobBlockReason,
  isAllowedEstimateStatusTransition,
  type EstimateDetail,
  type EstimateFormData,
  type EstimateStatus,
} from "@/shared/types/estimate";
import { applyEstimateCreationDefaults } from "@/shared/lib/company-billing-defaults";

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
  });

  revalidatePath("/estimates");
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
      console.error(
        "[updateEstimateStatusAction] estimate email failed before or at provider:",
        {
          estimateId,
          reason: emailResult.reason,
          message: emailResult.message,
          reachedProvider: emailResult.reason === "provider_error",
        },
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
  });

  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);

  return { estimate };
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
    console.error(
      "[resendEstimateEmailAction] estimate email failed before or at provider:",
      {
        estimateId,
        reason: emailResult.reason,
        message: emailResult.message,
        reachedProvider: emailResult.reason === "provider_error",
      },
    );

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
