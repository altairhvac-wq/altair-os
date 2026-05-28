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
import {
  recordEstimateCreatedActivity,
  recordEstimateEmailResentActivity,
  recordEstimateStatusChangedActivity,
} from "@/lib/database/services/estimate-activity";
import { sendEstimateEmail, toBillingEmailDelivery } from "@/lib/email/billing-send";
import type { BillingEmailDelivery } from "@/lib/email/billing-send";
import {
  canResendEstimateEmail,
  getSendEstimateJobBlockReason,
  isAllowedEstimateStatusTransition,
  type EstimateDetail,
  type EstimateFormData,
  type EstimateStatus,
} from "@/shared/types/estimate";
import { applyEstimateCreationDefaults } from "@/shared/lib/company-billing-defaults";

export type CreateEstimateActionResult = {
  error?: string;
  estimate?: EstimateDetail;
};

export async function createEstimateAction(
  data: EstimateFormData,
): Promise<CreateEstimateActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
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
    return { error: "No active company workspace." };
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

    if (!customerEmail || !customerEmail.includes("@")) {
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
      return { error: statusError ?? "Failed to update estimate status." };
    }

    const emailResult = await sendEstimateEmail({
      to: customerEmail,
      companyName: context.company.name,
      customerName: currentEstimate.customerName,
      estimateNumber: currentEstimate.estimateNumber,
      total: currentEstimate.total,
      validUntil: currentEstimate.validUntil,
      timeZone: context.company.timezone,
      lineItems: currentEstimate.lineItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      notes: currentEstimate.notes,
    });

    if (!emailResult.ok) {
      const { error: revertError } = await updateEstimateStatus(
        context.company.id,
        estimateId,
        "sent",
        "draft",
      );

      if (revertError) {
        console.error(
          "[updateEstimateStatusAction] failed to revert estimate after email failure:",
          { estimateId, revertError },
        );
        return {
          error:
            "Estimate could not be sent by email, and the status could not be reverted safely. Refresh the page and verify the estimate status before retrying.",
          emailDelivery: toBillingEmailDelivery(emailResult),
        };
      }

      return { emailDelivery: toBillingEmailDelivery(emailResult) };
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

    return { estimate: sentEstimate };
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
    return { error: "No active company workspace." };
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

  if (!customerEmail || !customerEmail.includes("@")) {
    return {
      error:
        "A valid customer email is required to resend this estimate. Add an email on the customer record and try again.",
    };
  }

  const emailResult = await sendEstimateEmail({
    to: customerEmail,
    companyName: context.company.name,
    customerName: currentEstimate.customerName,
    estimateNumber: currentEstimate.estimateNumber,
    total: currentEstimate.total,
    validUntil: currentEstimate.validUntil,
    timeZone: context.company.timezone,
    lineItems: currentEstimate.lineItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    notes: currentEstimate.notes,
  });

  if (!emailResult.ok) {
    return { emailDelivery: toBillingEmailDelivery(emailResult) };
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

  return { estimate: currentEstimate };
}
