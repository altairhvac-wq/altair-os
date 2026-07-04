"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { revalidateInvoiceOperationalPages } from "@/lib/database/revalidation/operational-pages";
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
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";

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
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
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
    return { error: error ?? "We couldn't record this payment. Try again." };
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

  revalidateInvoiceOperationalPages(invoiceId);
  revalidatePath("/reports");
  revalidatePath("/customers");
  revalidatePath(`/customers/${invoice.customerId}`);

  if (invoice.jobId) {
    revalidatePath(`/jobs/${invoice.jobId}`);
  }

  return { payment, invoice };
}
