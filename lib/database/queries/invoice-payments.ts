import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  InvoicePaymentInsert,
  InvoicePaymentRow,
} from "@/lib/database/types/core-tables";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import {
  isInvoicePayable,
  type InvoicePayment,
  type RecordPaymentFormData,
} from "@/shared/types/invoice-payment";
import {
  roundCurrency,
  type InvoiceDetail,
  type InvoiceStatus,
} from "@/shared/types/invoice";

type ProfileSummary = {
  full_name: string | null;
  email: string;
};

type InvoicePaymentRowWithRecorder = InvoicePaymentRow & {
  recorder: ProfileSummary | null;
};

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

function formatProfileName(
  profile: ProfileSummary | null | undefined,
): string | undefined {
  if (!profile) {
    return undefined;
  }

  return profile.full_name?.trim() || profile.email;
}

function mapPaymentRow(row: InvoicePaymentRowWithRecorder): InvoicePayment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount),
    paymentMethod: row.payment_method,
    paymentDate: toDateOnly(row.payment_date),
    reference: row.reference?.trim() || undefined,
    notes: row.notes?.trim() || undefined,
    recordedById: row.recorded_by ?? undefined,
    recordedByName: formatProfileName(row.recorder),
    createdAt: row.created_at,
  };
}

function resolveStatusAfterPayment(
  balanceDue: number,
): InvoiceStatus {
  return balanceDue <= 0 ? "paid" : "partially_paid";
}

export async function listPaymentsForInvoice(
  companyId: string,
  invoiceId: string,
): Promise<InvoicePayment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoice_payments")
    .select(
      `
      *,
      recorder:profiles!invoice_payments_recorded_by_fkey(full_name, email)
    `,
    )
    .eq("company_id", companyId)
    .eq("invoice_id", invoiceId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listPaymentsForInvoice] query failed:", {
      companyId,
      invoiceId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as InvoicePaymentRowWithRecorder[]).map(mapPaymentRow);
}

export async function recordInvoicePayment(
  companyId: string,
  invoiceId: string,
  actorId: string,
  data: RecordPaymentFormData,
): Promise<{
  payment: InvoicePayment | null;
  invoice: InvoiceDetail | null;
  previousStatus: InvoiceStatus | null;
  error: string | null;
}> {
  const amount = roundCurrency(data.amount);

  if (amount <= 0) {
    return {
      payment: null,
      invoice: null,
      previousStatus: null,
      error: "Payment amount must be greater than zero.",
    };
  }

  const invoice = await getInvoiceById(companyId, invoiceId);

  if (!invoice) {
    return {
      payment: null,
      invoice: null,
      previousStatus: null,
      error: "Invoice not found.",
    };
  }

  if (!isInvoicePayable(invoice.status)) {
    return {
      payment: null,
      invoice: null,
      previousStatus: null,
      error: "This invoice cannot accept payments in its current status.",
    };
  }

  if (amount > invoice.balanceDue) {
    return {
      payment: null,
      invoice: null,
      previousStatus: null,
      error: "Payment amount cannot exceed the balance due.",
    };
  }

  const paymentDate = data.paymentDate.trim() || toDateOnly(new Date().toISOString());
  const reference = data.reference.trim() || null;
  const notes = data.notes.trim() || null;
  const previousStatus = invoice.status;

  const newAmountPaid = roundCurrency(invoice.amountPaid + amount);
  const newBalanceDue = roundCurrency(Math.max(invoice.total - newAmountPaid, 0));
  const newStatus = resolveStatusAfterPayment(newBalanceDue);
  const paidAt =
    newStatus === "paid" ? `${paymentDate}T00:00:00.000Z` : invoice.paidAt ?? null;

  const supabase = await createClient();

  const paymentInsert: InvoicePaymentInsert = {
    company_id: companyId,
    invoice_id: invoiceId,
    amount,
    payment_method: data.paymentMethod,
    payment_date: paymentDate,
    reference,
    notes,
    recorded_by: actorId,
  };

  const { data: paymentRow, error: paymentError } = await supabase
    .from("invoice_payments")
    .insert(paymentInsert)
    .select("id")
    .single();

  if (paymentError || !paymentRow) {
    console.error("[recordInvoicePayment] insert failed:", {
      companyId,
      invoiceId,
      code: paymentError?.code,
      message: paymentError?.message,
    });
    return {
      payment: null,
      invoice: null,
      previousStatus: null,
      error: paymentError
        ? mapDatabaseError(paymentError)
        : "Failed to record payment.",
    };
  }

  const { error: updateError } = await supabase
    .from("invoices")
    .update({
      amount_paid: newAmountPaid,
      balance_due: newBalanceDue,
      status: newStatus,
      paid_at: paidAt,
    })
    .eq("company_id", companyId)
    .eq("id", invoiceId);

  if (updateError) {
    console.error("[recordInvoicePayment] invoice update failed:", {
      companyId,
      invoiceId,
      paymentId: paymentRow.id,
      code: updateError.code,
      message: updateError.message,
    });
    await supabase.from("invoice_payments").delete().eq("id", paymentRow.id);
    return {
      payment: null,
      invoice: null,
      previousStatus: null,
      error: mapDatabaseError(updateError),
    };
  }

  const [payment, updatedInvoice] = await Promise.all([
    listPaymentsForInvoice(companyId, invoiceId).then(
      (payments) => payments.find((item) => item.id === paymentRow.id) ?? null,
    ),
    getInvoiceById(companyId, invoiceId),
  ]);

  return {
    payment,
    invoice: updatedInvoice,
    previousStatus,
    error: payment && updatedInvoice ? null : "Failed to load recorded payment.",
  };
}
