"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { recordInvoicePayment } from "@/lib/database/queries/invoice-payments";
import { recordInvoicePaymentActivity } from "@/lib/database/services/invoice-activity";
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

  await recordInvoicePaymentActivity({
    companyId: context.company.id,
    invoiceId,
    actorId: context.user.id,
    amount: payment.amount,
    paymentMethod: payment.paymentMethod,
    reference: payment.reference,
    fromStatus: previousStatus,
    toStatus: invoice.status,
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);

  return { payment, invoice };
}
