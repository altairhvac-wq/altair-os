"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  convertEstimateToInvoice,
  createInvoice,
  getInvoiceById,
} from "@/lib/database/queries/invoices";
import {
  recordInvoiceConvertedFromEstimateActivity,
  recordInvoiceCreatedActivity,
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
    recordInvoiceCreatedActivity({
      companyId: context.company.id,
      invoiceId: invoice.id,
      actorId: context.user.id,
      invoiceNumber: invoice.invoiceNumber,
    }),
    recordInvoiceConvertedFromEstimateActivity({
      companyId: context.company.id,
      invoiceId: invoice.id,
      actorId: context.user.id,
      invoiceNumber: invoice.invoiceNumber,
      estimateId,
      estimateNumber: invoice.estimateNumber ?? "",
    }),
    recordEstimateStatusChangedActivity({
      companyId: context.company.id,
      estimateId,
      actorId: context.user.id,
      fromStatus: "approved",
      toStatus: "converted",
      jobId: invoice.jobId,
      jobNumber: invoice.jobNumber,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    }),
  ]);

  revalidatePath("/invoices");
  revalidatePath("/estimates");
  revalidatePath(`/estimates/${estimateId}`);
  revalidatePath(`/invoices/${invoice.id}`);

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
