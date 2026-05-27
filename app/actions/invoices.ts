"use server";

import { revalidatePath } from "next/cache";
import { canViewBilling } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
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
  recordInvoiceStatusChangedActivity,
  recordInvoiceUpdatedActivity,
} from "@/lib/database/services/invoice-activity";
import { recordEstimateStatusChangedActivity } from "@/lib/database/services/estimate-activity";
import type {
  InvoiceDetail,
  InvoiceEditFormData,
  InvoiceFormData,
} from "@/shared/types/invoice";

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

  let reviewSnapshotBefore = null;
  let reviewJobStatus = null;
  if (data.jobId) {
    const job = await getJobById(context.company.id, data.jobId);
    if (job) {
      reviewJobStatus = job.status;
      reviewSnapshotBefore = await captureCompletedJobReviewSnapshot(
        context.company.id,
        job.id,
        job.status,
      );
    }
  }

  const { invoice, error } = await createInvoice(context.company.id, data);

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

  const { invoice, error } = await convertEstimateToInvoice(
    context.company.id,
    estimateId,
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

  const { invoice, error } = await updateInvoiceStatus(
    context.company.id,
    invoiceId,
    "draft",
    "sent",
  );

  if (error || !invoice) {
    return { error: error ?? "Failed to send invoice." };
  }

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
