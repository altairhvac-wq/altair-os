import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { roundCurrency } from "@/shared/types/invoice";
import { getStripeClient } from "@/lib/payments/stripe-client";
import {
  isPaymentDisputeStatus,
  type PaymentDisputeRecord,
  type PaymentDisputeStatus,
} from "@/lib/payments/payment-disputes";

const PAYMENT_DISPUTE_SELECT =
  "id, company_id, invoice_id, invoice_payment_id, payment_attempt_id, provider, provider_dispute_id, provider_charge_id, provider_payment_intent_id, connected_account_id, amount, currency, reason, status, evidence_due_by, provider_created_at, created_at, updated_at";

const REASON_MAX_LENGTH = 120;

function mapPaymentDisputeRow(row: Record<string, unknown>): PaymentDisputeRecord {
  const status = row.status as string;
  if (!isPaymentDisputeStatus(status)) {
    throw new Error(`Unexpected payment_disputes.status: ${status}`);
  }

  return {
    id: row.id as string,
    company_id: row.company_id as string,
    invoice_id: (row.invoice_id as string | null) ?? null,
    invoice_payment_id: (row.invoice_payment_id as string | null) ?? null,
    payment_attempt_id: (row.payment_attempt_id as string | null) ?? null,
    provider: "stripe",
    provider_dispute_id: row.provider_dispute_id as string,
    provider_charge_id: (row.provider_charge_id as string | null) ?? null,
    provider_payment_intent_id:
      (row.provider_payment_intent_id as string | null) ?? null,
    connected_account_id: row.connected_account_id as string,
    amount: Number(row.amount) || 0,
    currency: (row.currency as string) || "usd",
    reason: (row.reason as string | null) ?? null,
    status,
    evidence_due_by: (row.evidence_due_by as string | null) ?? null,
    provider_created_at: (row.provider_created_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function extractStripeId(
  value: string | { id?: string | null } | null | undefined,
): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    value.id.trim().length > 0
  ) {
    return value.id.trim();
  }

  return null;
}

export function sanitizeDisputeReason(reason: string | null | undefined): string | null {
  if (typeof reason !== "string") {
    return null;
  }

  const trimmed = reason.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, REASON_MAX_LENGTH);
}

export function stripeDisputeAmountToCurrency(amountCents: number): number {
  return roundCurrency(amountCents / 100);
}

export function stripeEvidenceDueByToIso(
  dueByUnix: number | null | undefined,
): string | null {
  if (typeof dueByUnix !== "number" || !Number.isFinite(dueByUnix) || dueByUnix <= 0) {
    return null;
  }

  return new Date(dueByUnix * 1000).toISOString();
}

export function parsePaymentDisputeStatus(
  status: string | null | undefined,
): PaymentDisputeStatus {
  const normalized = typeof status === "string" ? status.trim() : "";
  if (!isPaymentDisputeStatus(normalized)) {
    throw new Error(
      `Unsupported Stripe dispute status: ${status ?? "(missing)"}`,
    );
  }
  return normalized;
}

/**
 * Prefer dispute.payment_intent; fall back to retrieving the charge on the
 * connected account (Express direct charges).
 */
export async function resolvePaymentIntentIdFromDispute(input: {
  paymentIntent: string | { id?: string | null } | null | undefined;
  charge: string | { id?: string | null } | null | undefined;
  connectedAccountId: string;
}): Promise<{ paymentIntentId: string | null; chargeId: string | null }> {
  const chargeId = extractStripeId(input.charge);
  const fromDispute = extractStripeId(input.paymentIntent);
  if (fromDispute) {
    return { paymentIntentId: fromDispute, chargeId };
  }

  if (!chargeId) {
    return { paymentIntentId: null, chargeId: null };
  }

  try {
    const stripe = getStripeClient();
    const charge = await stripe.charges.retrieve(
      chargeId,
      {},
      { stripeAccount: input.connectedAccountId },
    );
    return {
      paymentIntentId: extractStripeId(charge.payment_intent),
      chargeId,
    };
  } catch (error) {
    console.error("[resolvePaymentIntentIdFromDispute] charge retrieve failed", {
      chargeId,
      connectedAccountId: input.connectedAccountId,
      errorSummary:
        error instanceof Error ? error.message.slice(0, 200) : "unknown",
    });
    return { paymentIntentId: null, chargeId };
  }
}

export async function findInvoicePaymentByPaymentIntentId(
  supabase: SupabaseClient<Database>,
  companyId: string,
  paymentIntentId: string,
): Promise<{ id: string; invoice_id: string } | null> {
  const { data, error } = await supabase
    .from("invoice_payments")
    .select("id, invoice_id")
    .eq("company_id", companyId)
    .eq("provider", "stripe")
    .eq("provider_payment_id", paymentIntentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[findInvoicePaymentByPaymentIntentId] query failed:", {
      companyId,
      paymentIntentId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  if (!data?.id || !data.invoice_id) {
    return null;
  }

  return { id: data.id, invoice_id: data.invoice_id };
}

export type UpsertPaymentDisputeInput = {
  companyId: string;
  invoiceId: string | null;
  invoicePaymentId: string | null;
  paymentAttemptId: string | null;
  providerDisputeId: string;
  providerChargeId: string | null;
  providerPaymentIntentId: string | null;
  connectedAccountId: string;
  amount: number;
  currency: string;
  reason: string | null;
  status: PaymentDisputeStatus;
  evidenceDueBy: string | null;
  providerCreatedAt: string | null;
};

/**
 * Idempotent upsert keyed by (provider, provider_dispute_id).
 * Created / updated / closed webhooks all share this path.
 */
export async function upsertPaymentDispute(
  supabase: SupabaseClient<Database>,
  input: UpsertPaymentDisputeInput,
): Promise<PaymentDisputeRecord> {
  const row = {
    company_id: input.companyId,
    invoice_id: input.invoiceId,
    invoice_payment_id: input.invoicePaymentId,
    payment_attempt_id: input.paymentAttemptId,
    provider: "stripe" as const,
    provider_dispute_id: input.providerDisputeId,
    provider_charge_id: input.providerChargeId,
    provider_payment_intent_id: input.providerPaymentIntentId,
    connected_account_id: input.connectedAccountId,
    amount: roundCurrency(input.amount),
    currency: input.currency.trim().toLowerCase() || "usd",
    reason: sanitizeDisputeReason(input.reason),
    status: input.status,
    evidence_due_by: input.evidenceDueBy,
    provider_created_at: input.providerCreatedAt,
  };

  const { data, error } = await supabase
    .from("payment_disputes")
    .upsert(row, { onConflict: "provider,provider_dispute_id" })
    .select(PAYMENT_DISPUTE_SELECT)
    .single();

  if (error || !data) {
    console.error("[upsertPaymentDispute] upsert failed:", {
      companyId: input.companyId,
      providerDisputeId: input.providerDisputeId,
      code: error?.code,
      message: error?.message,
    });
    throw new Error("Failed to upsert payment dispute record");
  }

  return mapPaymentDisputeRow(data as Record<string, unknown>);
}

export async function listPaymentDisputesForCompany(
  supabase: SupabaseClient<Database>,
  companyId: string,
  options?: { limit?: number },
): Promise<PaymentDisputeRecord[]> {
  const limit = Math.min(Math.max(options?.limit ?? 50, 1), 100);

  const { data, error } = await supabase
    .from("payment_disputes")
    .select(PAYMENT_DISPUTE_SELECT)
    .eq("company_id", companyId)
    .order("provider_created_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[listPaymentDisputesForCompany] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    throw new Error("Failed to load payment disputes");
  }

  return (data ?? []).map((row) =>
    mapPaymentDisputeRow(row as Record<string, unknown>),
  );
}
