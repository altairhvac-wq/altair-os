import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { getDateOnlyInTimeZone } from "@/shared/lib/datetime";
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
  isInvoiceBalanceConsistent,
} from "@/shared/types/invoice";

import {
  resolveOptionalSubjectAttributionName,
  type ProfileSummary,
} from "@/shared/lib/profile-attribution";

type InvoicePaymentRowWithRecorder = InvoicePaymentRow & {
  recorder: ProfileSummary | null;
};

function toDateOnly(value: string): string {
  return value.split("T")[0] ?? value;
}

function mapPaymentRow(row: InvoicePaymentRowWithRecorder): InvoicePayment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    amount: Number(row.amount) || 0,
    paymentMethod: row.payment_method,
    paymentDate: toDateOnly(row.payment_date),
    reference: row.reference?.trim() || undefined,
    notes: row.notes?.trim() || undefined,
    recordedById: row.recorded_by ?? undefined,
    recordedByName: resolveOptionalSubjectAttributionName({
      profile: row.recorder,
      subjectUserId: row.recorded_by,
    }),
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

type InvoicePaymentRowWithInvoice = InvoicePaymentRowWithRecorder & {
  invoice: {
    invoice_number: string;
    customers: { name: string } | null;
  } | null;
};

export type RecentInvoicePayment = InvoicePayment & {
  invoiceNumber: string;
  customerName: string;
};

export const listInvoicePayments = cache(async function listInvoicePayments(
  companyId: string,
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
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listInvoicePayments] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as InvoicePaymentRowWithRecorder[]).map(mapPaymentRow);
});

export async function listRecentPayments(
  companyId: string,
  limit = 5,
): Promise<RecentInvoicePayment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoice_payments")
    .select(
      `
      *,
      recorder:profiles!invoice_payments_recorded_by_fkey(full_name, email),
      invoice:invoices(invoice_number, customers(name))
    `,
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listRecentPayments] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as InvoicePaymentRowWithInvoice[]).map((row) => ({
    ...mapPaymentRow(row),
    invoiceNumber: row.invoice?.invoice_number ?? "—",
    customerName: row.invoice?.customers?.name ?? "Unknown",
  }));
}

function getTodayDateOnly(reference = new Date(), timeZone?: string): string {
  return getDateOnlyInTimeZone(reference, timeZone);
}

export async function getPaymentsTodaySummary(
  companyId: string,
  timeZone?: string,
): Promise<{ count: number; total: number }> {
  const supabase = await createClient();
  const today = getTodayDateOnly(new Date(), timeZone);

  const { data, error } = await supabase
    .from("invoice_payments")
    .select("amount")
    .eq("company_id", companyId)
    .eq("payment_date", today);

  if (error) {
    console.error("[getPaymentsTodaySummary] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return { count: 0, total: 0 };
  }

  const payments = data ?? [];

  return {
    count: payments.length,
    total: roundCurrency(
      payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    ),
  };
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

  if (!isInvoiceBalanceConsistent(invoice)) {
    return {
      payment: null,
      invoice: null,
      previousStatus: null,
      error:
        "Invoice balance is inconsistent. Refresh the page or contact support before recording payments.",
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

  const { data: updatedRow, error: updateError } = await supabase
    .from("invoices")
    .update({
      amount_paid: newAmountPaid,
      balance_due: newBalanceDue,
      status: newStatus,
      paid_at: paidAt,
    })
    .eq("company_id", companyId)
    .eq("id", invoiceId)
    .eq("status", previousStatus)
    .eq("amount_paid", invoice.amountPaid)
    .eq("balance_due", invoice.balanceDue)
    .select("id")
    .maybeSingle();

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

  if (!updatedRow) {
    await supabase.from("invoice_payments").delete().eq("id", paymentRow.id);
    return {
      payment: null,
      invoice: null,
      previousStatus: null,
      error:
        "Invoice balance changed while recording this payment. Refresh the page and try again.",
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
    error: payment && updatedInvoice ? null : "Payment may have been saved. Refresh the page to confirm.",
  };
}
