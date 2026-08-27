import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database/types";
import {
  addDaysToDateOnly,
  getCompanyTimeZone,
  getDateOnlyInTimeZone,
} from "@/shared/lib/datetime";
import type { InvoicePaymentRow } from "@/lib/database/types/core-tables";
import {
  mapRecordInvoicePaymentRpcError,
  parseRecordInvoicePaymentRpcResult,
} from "@/lib/payments/recording";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import { expireStaleCheckoutSessionsForInvoice } from "@/lib/payments/payment-attempts-service";
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

function mapProviderMetadata(
  value: InvoicePaymentRow["provider_metadata"],
): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

export function mapPaymentRow(row: InvoicePaymentRowWithRecorder): InvoicePayment {
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
    source: row.source,
    provider: row.provider,
    providerPaymentId: row.provider_payment_id,
    providerCheckoutSessionId: row.provider_checkout_session_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    feeAmount: row.fee_amount === null ? null : Number(row.fee_amount),
    netAmount: row.net_amount === null ? null : Number(row.net_amount),
    providerMetadata: mapProviderMetadata(row.provider_metadata),
  };
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

type InvoicePaymentRowWithCustomerInvoice = InvoicePaymentRowWithRecorder & {
  invoice: { customer_id: string } | null;
};

// unbounded-ok: one customer's payment history. Bounded by that customer's
// trading relationship rather than by the company's, and it is rendered as
// a history rather than reduced into a headline figure.
export async function listInvoicePaymentsForCustomer(
  companyId: string,
  customerId: string,
): Promise<InvoicePayment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoice_payments")
    .select(
      `
      *,
      recorder:profiles!invoice_payments_recorded_by_fkey(full_name, email),
      invoice:invoices!inner(customer_id)
    `,
    )
    .eq("company_id", companyId)
    .eq("invoice.customer_id", customerId)
    .order("payment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listInvoicePaymentsForCustomer] query failed:", {
      companyId,
      customerId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as InvoicePaymentRowWithCustomerInvoice[]).map(
    mapPaymentRow,
  );
}

type InvoicePaymentRowWithInvoice = InvoicePaymentRowWithRecorder & {
  invoice: {
    invoice_number: string;
    customers: { id: string; name: string } | null;
  } | null;
};

export type RecentInvoicePayment = InvoicePayment & {
  invoiceNumber: string;
  customerName: string;
  customerId?: string;
};

const INVOICE_PAYMENT_LIST_SELECT = `
  *,
  recorder:profiles!invoice_payments_recorded_by_fkey(full_name, email),
  invoice:invoices(invoice_number, customers(id, name))
`;

function mapPaymentRowWithInvoice(
  row: InvoicePaymentRowWithInvoice,
): RecentInvoicePayment {
  return {
    ...mapPaymentRow(row),
    invoiceNumber: row.invoice?.invoice_number ?? "—",
    customerName: row.invoice?.customers?.name ?? "Unknown",
    customerId: row.invoice?.customers?.id,
  };
}

// unbounded-ok: [debt] reads the whole payment ledger. Same Phase 5
// aggregate work as the lists above, and the same failure: a truncated
// ledger understates collected revenue without saying so. The date-ranged
// summaries beside it already walk to completion for exactly that reason.
export const listInvoicePayments = cache(async function listInvoicePayments(
  companyId: string,
): Promise<RecentInvoicePayment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoice_payments")
    .select(INVOICE_PAYMENT_LIST_SELECT)
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

  return ((data ?? []) as InvoicePaymentRowWithInvoice[]).map(
    mapPaymentRowWithInvoice,
  );
});

export async function listRecentPayments(
  companyId: string,
  limit = 5,
): Promise<RecentInvoicePayment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invoice_payments")
    .select(INVOICE_PAYMENT_LIST_SELECT)
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

  return ((data ?? []) as InvoicePaymentRowWithInvoice[]).map(
    mapPaymentRowWithInvoice,
  );
}

function getTodayDateOnly(reference = new Date(), timeZone?: string): string {
  return getDateOnlyInTimeZone(reference, timeZone);
}

/**
 * Every payment row matching a filter, read to completion.
 *
 * ============================== WHY A WALK AND NOT A LIMIT ==============================
 * These reads produce MONEY TOTALS. A limit would make them fast and wrong: the
 * page would show a smaller figure with no indication that anything was left
 * out, which is the failure mode this whole pass exists to remove. A date filter
 * is not a bound either — a busy company can take more than a thousand payments
 * in a month, and that is exactly the company whose totals matter.
 *
 * So it walks. PostgREST's ceiling stops applying once you ask for explicit
 * ranges, and the loop stops as soon as a page comes back short.
 *
 * The guard is a runaway backstop, not a correctness limit: it sits far above
 * any plausible payment volume for one date range, and reaching it is logged
 * rather than silently absorbed.
 */
const PAYMENT_PAGE = 1000;
const PAYMENT_WALK_MAX = 200_000;

async function walkPaymentRows<T>(
  label: string,
  companyId: string,
  columns: string,
  narrow: (query: PaymentWalkQuery) => PaymentWalkQuery,
): Promise<{ rows: T[]; error: PaymentWalkError | null }> {
  const supabase = await createClient();
  const rows: T[] = [];

  for (let from = 0; from < PAYMENT_WALK_MAX; from += PAYMENT_PAGE) {
    const page = await narrow(
      supabase
        .from("invoice_payments")
        .select(columns)
        .eq("company_id", companyId) as unknown as PaymentWalkQuery,
    )
      .order("id", { ascending: true })
      .range(from, from + PAYMENT_PAGE - 1);

    if (page.error) {
      return { rows, error: page.error };
    }

    const batch = (page.data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAYMENT_PAGE) break;

    if (from + PAYMENT_PAGE >= PAYMENT_WALK_MAX) {
      console.error(`[${label}] hit the runaway guard:`, {
        companyId,
        rows: rows.length,
      });
    }
  }

  return { rows, error: null };
}

type PaymentWalkError = { code?: string; message: string };

/** The slice of the builder walkPaymentRows needs. Structural, so no `any`. */
type PaymentWalkQuery = {
  eq: (column: string, value: string) => PaymentWalkQuery;
  gte: (column: string, value: string) => PaymentWalkQuery;
  lte: (column: string, value: string) => PaymentWalkQuery;
  order: (
    column: string,
    options: { ascending: boolean },
  ) => PaymentWalkQuery;
  range: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: unknown[] | null;
    error: PaymentWalkError | null;
  }>;
};

export async function getPaymentsSummaryForDate(
  companyId: string,
  paymentDate: string,
): Promise<{ count: number; total: number }> {
  const { rows: payments, error } = await walkPaymentRows<{ amount: number }>(
    "getPaymentsSummaryForDate",
    companyId,
    "amount",
    (query) => query.eq("payment_date", paymentDate),
  );

  if (error) {
    console.error("[getPaymentsSummaryForDate] query failed:", {
      companyId,
      paymentDate,
      code: error.code,
      message: error.message,
    });
    return { count: 0, total: 0 };
  }

  return {
    count: payments.length,
    total: roundCurrency(
      payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    ),
  };
}

export async function getPaymentsTodaySummary(
  companyId: string,
  timeZone?: string,
): Promise<{ count: number; total: number }> {
  const today = getTodayDateOnly(new Date(), timeZone);
  return getPaymentsSummaryForDate(companyId, today);
}

export async function getPaymentsYesterdaySummary(
  companyId: string,
  timeZone?: string,
): Promise<{ count: number; total: number }> {
  const today = getTodayDateOnly(new Date(), timeZone);
  const yesterday = addDaysToDateOnly(today, -1, timeZone);
  return getPaymentsSummaryForDate(companyId, yesterday);
}

export async function getPaymentsSummaryForDateRange(
  companyId: string,
  startDateOnly: string,
  endDateOnly: string,
): Promise<{ count: number; total: number }> {
  const { rows: payments, error } = await walkPaymentRows<{ amount: number }>(
    "getPaymentsSummaryForDateRange",
    companyId,
    "amount",
    (query) =>
      query.gte("payment_date", startDateOnly).lte("payment_date", endDateOnly),
  );

  if (error) {
    console.error("[getPaymentsSummaryForDateRange] query failed:", {
      companyId,
      startDateOnly,
      endDateOnly,
      code: error.code,
      message: error.message,
    });
    return { count: 0, total: 0 };
  }

  return {
    count: payments.length,
    total: roundCurrency(
      payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    ),
  };
}

function getDayOfWeekInTimeZone(reference: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(reference);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}

/** Sunday–today window in company timezone (matches Mission Control calendar week). */
export async function getPaymentsThisWeekSummary(
  companyId: string,
  timeZone?: string,
): Promise<{ count: number; total: number }> {
  const reference = new Date();
  const today = getTodayDateOnly(reference, timeZone);
  const dayOfWeek = getDayOfWeekInTimeZone(
    reference,
    timeZone ?? getCompanyTimeZone(),
  );
  const weekStart = addDaysToDateOnly(today, -dayOfWeek, timeZone);
  return getPaymentsSummaryForDateRange(companyId, weekStart, today);
}

/** Month-start–today window in company timezone. */
export async function getPaymentsThisMonthSummary(
  companyId: string,
  timeZone?: string,
): Promise<{ count: number; total: number }> {
  const today = getTodayDateOnly(new Date(), timeZone);
  const [yearStr, monthStr] = today.split("-");
  const monthStart = `${yearStr}-${String(monthStr).padStart(2, "0")}-01`;
  return getPaymentsSummaryForDateRange(companyId, monthStart, today);
}

export type DailyPaymentTotal = {
  paymentDate: string;
  total: number;
  count: number;
};

/**
 * Sum payments per calendar day for [startDateOnly, endDateOnly].
 * Only returns days that have at least one payment.
 */
export async function getPaymentsDailyTotalsForDateRange(
  companyId: string,
  startDateOnly: string,
  endDateOnly: string,
): Promise<DailyPaymentTotal[]> {
  const { rows: payments, error } = await walkPaymentRows<{
    payment_date: string;
    amount: number;
  }>(
    "getPaymentsDailyTotalsForDateRange",
    companyId,
    "payment_date, amount",
    (query) =>
      query.gte("payment_date", startDateOnly).lte("payment_date", endDateOnly),
  );

  if (error) {
    console.error("[getPaymentsDailyTotalsForDateRange] query failed:", {
      companyId,
      startDateOnly,
      endDateOnly,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  const totalsByDate = new Map<string, { total: number; count: number }>();

  for (const row of payments) {
    const paymentDate = toDateOnly(String(row.payment_date));
    const amount = Number(row.amount) || 0;
    const existing = totalsByDate.get(paymentDate) ?? { total: 0, count: 0 };
    existing.total = roundCurrency(existing.total + amount);
    existing.count += 1;
    totalsByDate.set(paymentDate, existing);
  }

  return [...totalsByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([paymentDate, { total, count }]) => ({
      paymentDate,
      total,
      count,
    }));
}

/**
 * Daily payment totals for the last 7 company-timezone calendar days
 * (today and the prior 6 days). Days with no payments are included as 0.
 */
export async function getPaymentsLast7DaysDailyTotals(
  companyId: string,
  timeZone?: string,
): Promise<DailyPaymentTotal[]> {
  const today = getTodayDateOnly(new Date(), timeZone);
  const startDateOnly = addDaysToDateOnly(today, -6, timeZone);
  const paidDays = await getPaymentsDailyTotalsForDateRange(
    companyId,
    startDateOnly,
    today,
  );
  const byDate = new Map(
    paidDays.map((day) => [day.paymentDate, day] as const),
  );

  const series: DailyPaymentTotal[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const paymentDate = addDaysToDateOnly(today, -offset, timeZone);
    const existing = byDate.get(paymentDate);
    series.push({
      paymentDate,
      total: existing?.total ?? 0,
      count: existing?.count ?? 0,
    });
  }

  return series;
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

  const supabase = await createClient();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "record_invoice_payment_atomic",
    {
      p_company_id: companyId,
      p_invoice_id: invoiceId,
      p_amount: amount,
      p_payment_method: data.paymentMethod,
      p_payment_date: paymentDate,
      p_reference: reference,
      p_notes: notes,
      p_expected_updated_at: data.expectedUpdatedAt ?? null,
      p_idempotency_key: data.idempotencyKey ?? null,
    },
  );

  if (rpcError) {
    console.error("[recordInvoicePayment] rpc failed:", {
      companyId,
      invoiceId,
      actorId,
      code: rpcError.code,
      message: rpcError.message,
    });
    return {
      payment: null,
      invoice: null,
      previousStatus: null,
      error: mapRecordInvoicePaymentRpcError(rpcError),
    };
  }

  const rpcResult = parseRecordInvoicePaymentRpcResult(rpcData);

  if (!rpcResult) {
    console.error("[recordInvoicePayment] rpc returned invalid payload:", {
      companyId,
      invoiceId,
      actorId,
      rpcData,
    });
    return {
      payment: null,
      invoice: null,
      previousStatus: null,
      error: "Failed to record payment.",
    };
  }

  const [payment, updatedInvoice] = await Promise.all([
    listPaymentsForInvoice(companyId, invoiceId).then(
      (payments) =>
        payments.find((item) => item.id === rpcResult.payment_id) ?? null,
    ),
    getInvoiceById(companyId, invoiceId),
  ]);

  // Layer 1 (best-effort, preventative): the RPC above already committed this manual
  // payment and the migration 112 trigger already invalidated any active Payment
  // Attempt for this invoice. Try to expire the corresponding Stripe Checkout Session so
  // a customer can no longer complete a stale session for the old balance. Never allowed
  // to affect the payment we just successfully recorded.
  try {
    await expireStaleCheckoutSessionsForInvoice(supabase, companyId, invoiceId);
  } catch (expireError) {
    console.error("[recordInvoicePayment] stale session expiration failed:", {
      companyId,
      invoiceId,
      expireError,
    });
  }

  return {
    payment,
    invoice: updatedInvoice,
    previousStatus: rpcResult.previous_status,
    error: payment && updatedInvoice ? null : "Payment may have been saved. Refresh the page to confirm.",
  };
}

export async function findExistingStripeCheckoutPayment(
  supabase: SupabaseClient<Database>,
  companyId: string,
  options: {
    checkoutSessionId: string;
    providerPaymentId: string | null;
    idempotencyKey: string;
  },
): Promise<{ id: string } | null> {
  const filters = [
    `and(provider.eq.stripe,provider_checkout_session_id.eq.${options.checkoutSessionId})`,
    `idempotency_key.eq.${options.idempotencyKey}`,
  ];

  if (options.providerPaymentId) {
    filters.push(
      `and(provider.eq.stripe,provider_payment_id.eq.${options.providerPaymentId})`,
    );
  }

  const { data, error } = await supabase
    .from("invoice_payments")
    .select("id")
    .eq("company_id", companyId)
    .or(filters.join(","))
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[findExistingStripeCheckoutPayment] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    throw new Error("Failed to check existing Stripe checkout payment.");
  }

  return data ? { id: data.id } : null;
}
