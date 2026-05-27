"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { recordInvoicePayment } from "@/lib/database/queries/invoice-payments";
import {
  recordInvoicePaidActivity,
  recordInvoicePaymentActivity,
} from "@/lib/database/services/invoice-activity";
import type { InvoiceDetail } from "@/shared/types/invoice";
import type {
  InvoicePayment,
  RecordPaymentFormData,
} from "@/shared/types/invoice-payment";

export type RecordInvoicePaymentActionResult = {
  error?: string;
  payment?: InvoicePayment;
  invoice?: InvoiceDetail;
};

export async function recordInvoicePaymentAction(
  invoiceId: string,
  data: RecordPaymentFormData,
): Promise<RecordInvoicePaymentActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to record payments." };
  }

  const { payment, invoice, previousStatus, error } = await recordInvoicePayment(
    context.company.id,
    invoiceId,
    context.user.id,
    data,
  );

  if (error || !payment || !invoice || !previousStatus) {
    return { error: error ?? "Failed to record payment." };
  }

  const activityContext = {
    companyId: context.company.id,
    invoiceId,
    actorId: context.user.id,
    paymentId: payment.id,
    amount: payment.amount,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    jobId: invoice.jobId,
    jobNumber: invoice.jobNumber,
  };

  await recordInvoicePaymentActivity({
    ...activityContext,
    paymentMethod: payment.paymentMethod,
    reference: payment.reference,
    fromStatus: previousStatus,
    toStatus: invoice.status,
  });

  if (invoice.status === "paid") {
    await recordInvoicePaidActivity({
      ...activityContext,
      fromStatus: previousStatus,
    });
  }

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath(`/customers/${invoice.customerId}`);

  if (invoice.jobId) {
    revalidatePath(`/jobs/${invoice.jobId}`);
  }

  return { payment, invoice };
}
