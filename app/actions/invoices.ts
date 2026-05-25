"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  convertEstimateToInvoice,
  createInvoice,
  getInvoiceById,
  updateInvoiceStatus,
} from "@/lib/database/queries/invoices";
import {
  recordInvoiceConvertedFromEstimateActivity,
  recordInvoiceCreatedActivity,
  recordInvoiceStatusChangedActivity,
} from "@/lib/database/services/invoice-activity";
import { recordEstimateStatusChangedActivity } from "@/lib/database/services/estimate-activity";
import type { InvoiceDetail, InvoiceFormData } from "@/shared/types/invoice";

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

  return { invoice };
}

export async function getInvoiceDetailAction(
  invoiceId: string,
): Promise<{ invoice: InvoiceDetail | null; error?: string }> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { invoice: null, error: "No active company workspace." };
  }

  const invoice = await getInvoiceById(context.company.id, invoiceId);
  return { invoice };
}
