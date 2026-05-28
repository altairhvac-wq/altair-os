"use server";

import { revalidatePath } from "next/cache";
import { canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyBillingDefaultsFromRow } from "@/lib/database/queries/companies";
import { getEstimateById } from "@/lib/database/queries/estimates";
import {
  convertEstimateToInvoice,
  createInvoice,
  getInvoiceById,
  updateInvoice,
  updateInvoiceStatus,
  voidInvoice,
} from "@/lib/database/queries/invoices";
import { getJobById } from "@/lib/database/queries/jobs";
import {
  captureCompletedJobReviewSnapshot,
  trackJobReviewBlockerResolutions,
} from "@/lib/database/services/job-review-resolution";
import {
  recordInvoiceConvertedFromEstimateActivity,
  recordInvoiceCreatedActivity,
  recordInvoiceEmailResentActivity,
  recordInvoiceStatusChangedActivity,
  recordInvoiceUpdatedActivity,
} from "@/lib/database/services/invoice-activity";
import { recordEstimateStatusChangedActivity } from "@/lib/database/services/estimate-activity";
import { sendInvoiceEmail, toBillingEmailDelivery } from "@/lib/email/billing-send";
import type { BillingEmailDelivery } from "@/lib/email/billing-send";
import type {
  InvoiceDetail,
  InvoiceEditFormData,
  InvoiceFormData,
} from "@/shared/types/invoice";
import {
  canResendInvoiceEmail,
  getSendInvoiceJobBlockReason,
} from "@/shared/types/invoice";
import { applyInvoiceCreationDefaults } from "@/shared/lib/company-billing-defaults";

export type { BillingEmailDelivery } from "@/lib/email/billing-send";

export type CreateInvoiceActionResult = {
  error?: string;
  invoice?: InvoiceDetail;
};

export async function createInvoiceAction(
  data: InvoiceFormData,
): Promise<CreateInvoiceActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to create invoices." };
  }

  const billingDefaults = getCompanyBillingDefaultsFromRow(context.company);
  const normalizedData = applyInvoiceCreationDefaults(
    data,
    billingDefaults,
    context.company.timezone,
  );

  let reviewSnapshotBefore = null;
  let reviewJobStatus = null;
  if (normalizedData.jobId) {
    const job = await getJobById(context.company.id, normalizedData.jobId);
    if (job) {
      reviewJobStatus = job.status;
      reviewSnapshotBefore = await captureCompletedJobReviewSnapshot(
        context.company.id,
        job.id,
        job.status,
      );
    }
  }

  const { invoice, error } = await createInvoice(
    context.company.id,
    normalizedData,
    context.company.timezone,
  );

  if (error || !invoice) {
    return { error: error ?? "Failed to create invoice." };
  }

  await recordInvoiceCreatedActivity({
    companyId: context.company.id,
    invoiceId: invoice.id,
    actorId: context.user.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    jobId: invoice.jobId,
    jobNumber: invoice.jobNumber,
  });

  if (reviewSnapshotBefore && invoice.jobId && reviewJobStatus) {
    void trackJobReviewBlockerResolutions({
      companyId: context.company.id,
      jobId: invoice.jobId,
      jobStatus: reviewJobStatus,
      actorId: context.user.id,
      beforeSnapshot: reviewSnapshotBefore,
      jobNumber: invoice.jobNumber,
      customerId: invoice.customerId,
    }).catch((trackingError) => {
      console.error("[createInvoiceAction] review resolution tracking failed:", {
        jobId: invoice.jobId,
        trackingError,
      });
    });
  }

  revalidatePath("/invoices");
  return { invoice };
}

export type ConvertEstimateToInvoiceActionResult = {
  error?: string;
  invoice?: InvoiceDetail;
};

export async function convertEstimateToInvoiceAction(
  estimateId: string,
): Promise<ConvertEstimateToInvoiceActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to convert estimates." };
  }

  let reviewSnapshotBefore = null;
  let reviewJobStatus = null;
  const estimate = await getEstimateById(context.company.id, estimateId);
  if (estimate?.jobId) {
    const job = await getJobById(context.company.id, estimate.jobId);
    if (job) {
      reviewJobStatus = job.status;
      reviewSnapshotBefore = await captureCompletedJobReviewSnapshot(
        context.company.id,
        job.id,
        job.status,
      );
    }
  }

  const billingDefaults = getCompanyBillingDefaultsFromRow(context.company);
  const { invoice, error } = await convertEstimateToInvoice(
    context.company.id,
    estimateId,
    context.company.timezone,
    billingDefaults,
  );

  if (error || !invoice) {
    return { error: error ?? "Failed to convert estimate to invoice." };
  }

  await Promise.all([
    recordInvoiceConvertedFromEstimateActivity({
      companyId: context.company.id,
      invoiceId: invoice.id,
      actorId: context.user.id,
      invoiceNumber: invoice.invoiceNumber,
      estimateId,
      estimateNumber: invoice.estimateNumber ?? "",
      customerId: invoice.customerId,
      jobId: invoice.jobId,
      jobNumber: invoice.jobNumber,
    }),
    recordEstimateStatusChangedActivity({
      companyId: context.company.id,
      estimateId,
      actorId: context.user.id,
      fromStatus: "approved",
      toStatus: "converted",
      customerId: invoice.customerId,
      jobId: invoice.jobId,
      jobNumber: invoice.jobNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      estimateNumber: invoice.estimateNumber,
    }),
  ]);

  if (reviewSnapshotBefore && invoice.jobId && reviewJobStatus) {
    void trackJobReviewBlockerResolutions({
      companyId: context.company.id,
      jobId: invoice.jobId,
      jobStatus: reviewJobStatus,
      actorId: context.user.id,
      beforeSnapshot: reviewSnapshotBefore,
      jobNumber: invoice.jobNumber,
      customerId: invoice.customerId,
    }).catch((trackingError) => {
      console.error(
        "[convertEstimateToInvoiceAction] review resolution tracking failed:",
        {
          jobId: invoice.jobId,
          trackingError,
        },
      );
    });
  }

  revalidatePath("/invoices");
  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);
  revalidatePath(`/invoices/${invoice.id}`);

  return { invoice };
}

export type SendInvoiceActionResult = {
  error?: string;
  invoice?: InvoiceDetail;
  emailDelivery?: BillingEmailDelivery;
};

export async function sendInvoiceAction(
  invoiceId: string,
): Promise<SendInvoiceActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to send invoices." };
  }

  const currentInvoice = await getInvoiceById(context.company.id, invoiceId);

  if (!currentInvoice) {
    return { error: "Invoice not found." };
  }

  if (currentInvoice.status !== "draft") {
    return {
      error: "Only draft invoices can be sent. Refresh the page and try again.",
    };
  }

  if (currentInvoice.jobId) {
    const linkedJob = await getJobById(
      context.company.id,
      currentInvoice.jobId,
    );
    const jobBlockReason = linkedJob
      ? getSendInvoiceJobBlockReason(linkedJob.status)
      : null;

    if (jobBlockReason) {
      return { error: jobBlockReason };
    }
  }

  const customerEmail = currentInvoice.customerEmail?.trim();

  if (!customerEmail || !customerEmail.includes("@")) {
    return {
      error:
        "A valid customer email is required to send this invoice. Add an email on the customer record and try again.",
    };
  }

  const { invoice: sentInvoice, error: statusError } = await updateInvoiceStatus(
    context.company.id,
    invoiceId,
    "draft",
    "sent",
  );

  if (statusError || !sentInvoice) {
    return { error: statusError ?? "Failed to send invoice." };
  }

  const emailResult = await sendInvoiceEmail({
    to: customerEmail,
    companyName: context.company.name,
    customerName: currentInvoice.customerName,
    invoiceNumber: currentInvoice.invoiceNumber,
    amountDue: currentInvoice.balanceDue,
    dueDate: currentInvoice.dueDate,
    timeZone: context.company.timezone,
    lineItems: currentInvoice.lineItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    notes: currentInvoice.notes,
  });

  if (!emailResult.ok) {
    const { error: revertError } = await updateInvoiceStatus(
      context.company.id,
      invoiceId,
      "sent",
      "draft",
    );

    if (revertError) {
      console.error("[sendInvoiceAction] failed to revert invoice after email failure:", {
        invoiceId,
        revertError,
      });
      return {
        error:
          "Invoice could not be sent by email, and the status could not be reverted safely. Refresh the page and verify the invoice status before retrying.",
        emailDelivery: toBillingEmailDelivery(emailResult),
      };
    }

    return { emailDelivery: toBillingEmailDelivery(emailResult) };
  }

  const invoice = sentInvoice;

  await recordInvoiceStatusChangedActivity({
    companyId: context.company.id,
    invoiceId,
    actorId: context.user.id,
    fromStatus: "draft",
    toStatus: "sent",
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    jobId: invoice.jobId,
    jobNumber: invoice.jobNumber,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/customers/${invoice.customerId}`);

  if (invoice.jobId) {
    revalidatePath(`/jobs/${invoice.jobId}`);
  }

  return { invoice };
}

export type ResendInvoiceEmailActionResult = {
  error?: string;
  invoice?: InvoiceDetail;
  emailDelivery?: BillingEmailDelivery;
};

export async function resendInvoiceEmailAction(
  invoiceId: string,
): Promise<ResendInvoiceEmailActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to resend invoice emails." };
  }

  const currentInvoice = await getInvoiceById(context.company.id, invoiceId);

  if (!currentInvoice) {
    return { error: "Invoice not found." };
  }

  if (!canResendInvoiceEmail(currentInvoice.status)) {
    return {
      error:
        "Only invoices that have already been sent can be resent by email. Refresh the page and try again.",
    };
  }

  if (currentInvoice.jobId) {
    const linkedJob = await getJobById(
      context.company.id,
      currentInvoice.jobId,
    );
    const jobBlockReason = linkedJob
      ? getSendInvoiceJobBlockReason(linkedJob.status)
      : null;

    if (jobBlockReason) {
      return { error: jobBlockReason };
    }
  }

  const customerEmail = currentInvoice.customerEmail?.trim();

  if (!customerEmail || !customerEmail.includes("@")) {
    return {
      error:
        "A valid customer email is required to resend this invoice. Add an email on the customer record and try again.",
    };
  }

  const emailResult = await sendInvoiceEmail({
    to: customerEmail,
    companyName: context.company.name,
    customerName: currentInvoice.customerName,
    invoiceNumber: currentInvoice.invoiceNumber,
    amountDue: currentInvoice.balanceDue,
    dueDate: currentInvoice.dueDate,
    timeZone: context.company.timezone,
    lineItems: currentInvoice.lineItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    notes: currentInvoice.notes,
  });

  if (!emailResult.ok) {
    return { emailDelivery: toBillingEmailDelivery(emailResult) };
  }

  await recordInvoiceEmailResentActivity({
    companyId: context.company.id,
    invoiceId,
    actorId: context.user.id,
    invoiceNumber: currentInvoice.invoiceNumber,
    customerId: currentInvoice.customerId,
    jobId: currentInvoice.jobId,
    jobNumber: currentInvoice.jobNumber,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/customers/${currentInvoice.customerId}`);

  if (currentInvoice.jobId) {
    revalidatePath(`/jobs/${currentInvoice.jobId}`);
  }

  return { invoice: currentInvoice };
}

export type VoidInvoiceActionResult = {
  error?: string;
  invoice?: InvoiceDetail;
};

export async function voidInvoiceAction(
  invoiceId: string,
): Promise<VoidInvoiceActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to void invoices." };
  }

  const { invoice, previousStatus, error } = await voidInvoice(
    context.company.id,
    invoiceId,
  );

  if (error || !invoice || !previousStatus) {
    return { error: error ?? "Failed to void invoice." };
  }

  await recordInvoiceStatusChangedActivity({
    companyId: context.company.id,
    invoiceId,
    actorId: context.user.id,
    fromStatus: previousStatus,
    toStatus: "void",
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    jobId: invoice.jobId,
    jobNumber: invoice.jobNumber,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/customers/${invoice.customerId}`);

  if (invoice.jobId) {
    revalidatePath(`/jobs/${invoice.jobId}`);
  }

  return { invoice };
}

export type UpdateInvoiceActionResult = {
  error?: string;
  invoice?: InvoiceDetail;
};

export async function updateInvoiceAction(
  invoiceId: string,
  data: InvoiceEditFormData,
): Promise<UpdateInvoiceActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to edit invoices." };
  }

  const { invoice, previousTotal, error } = await updateInvoice(
    context.company.id,
    invoiceId,
    data,
  );

  if (error || !invoice || previousTotal === null) {
    return { error: error ?? "Failed to update invoice." };
  }

  await recordInvoiceUpdatedActivity({
    companyId: context.company.id,
    invoiceId,
    actorId: context.user.id,
    previousTotal,
    newTotal: invoice.total,
    lineItemCount: invoice.lineItems.length,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    jobId: invoice.jobId,
    jobNumber: invoice.jobNumber,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/customers/${invoice.customerId}`);

  if (invoice.jobId) {
    revalidatePath(`/jobs/${invoice.jobId}`);
  }

  return { invoice };
}

export async function getInvoiceDetailAction(
  invoiceId: string,
): Promise<{ invoice: InvoiceDetail | null; error?: string }> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { invoice: null, error: "No active company workspace." };
  }

  if (!canViewBilling(context)) {
    return { invoice: null, error: "You do not have permission to view invoices." };
  }

  const invoice = await getInvoiceById(context.company.id, invoiceId);
  return { invoice };
}
