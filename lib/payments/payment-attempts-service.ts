import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { roundCurrency } from "@/shared/types/invoice";
import { getStripeClient } from "@/lib/payments/stripe-client";
import {
  createStripeInvoiceCheckoutSession,
  expireStripeCheckoutSessionBestEffort,
  type InvoiceCheckoutTarget,
  type StripeInvoiceCheckoutUrls,
} from "@/lib/payments/stripe-checkout";
import type {
  PaymentAttemptRecord,
  PaymentAttemptStatus,
} from "@/lib/payments/payment-attempts";

/** Stripe Checkout Sessions we create expire this long after creation (Stripe minimum is 30 minutes). */
const PAYMENT_ATTEMPT_TTL_MS = 30 * 60 * 1000;
const AMOUNT_EPSILON = 0.005;

const PAYMENT_ATTEMPT_SELECT =
  "id, company_id, invoice_id, status, amount, currency, provider, provider_account_id, stripe_checkout_session_id, stripe_payment_intent_id, expires_at, completed_at, invalidated_at, created_at, updated_at";

function mapPaymentAttemptRow(row: Record<string, unknown>): PaymentAttemptRecord {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    invoice_id: row.invoice_id as string,
    status: row.status as PaymentAttemptStatus,
    amount: Number(row.amount) || 0,
    currency: row.currency as string,
    provider: "stripe",
    provider_account_id: (row.provider_account_id as string | null) ?? null,
    stripe_checkout_session_id:
      (row.stripe_checkout_session_id as string | null) ?? null,
    stripe_payment_intent_id:
      (row.stripe_payment_intent_id as string | null) ?? null,
    expires_at: row.expires_at as string,
    completed_at: (row.completed_at as string | null) ?? null,
    invalidated_at: (row.invalidated_at as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

function amountsMatch(a: number, b: number): boolean {
  return Math.abs(roundCurrency(a) - roundCurrency(b)) < AMOUNT_EPSILON;
}

async function findActivePaymentAttempt(
  supabase: SupabaseClient<Database>,
  companyId: string,
  invoiceId: string,
): Promise<PaymentAttemptRecord | null> {
  const { data, error } = await supabase
    .from("payment_attempts")
    .select(PAYMENT_ATTEMPT_SELECT)
    .eq("company_id", companyId)
    .eq("invoice_id", invoiceId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[findActivePaymentAttempt] query failed:", {
      companyId,
      invoiceId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data ? mapPaymentAttemptRow(data) : null;
}

/**
 * Resolve a payment attempt by the Stripe Checkout Session id it owns.
 * Used by the webhook (Rule 5) as the authoritative lookup instead of session metadata.
 */
export async function findPaymentAttemptByCheckoutSessionId(
  supabase: SupabaseClient<Database>,
  checkoutSessionId: string,
): Promise<PaymentAttemptRecord | null> {
  const { data, error } = await supabase
    .from("payment_attempts")
    .select(PAYMENT_ATTEMPT_SELECT)
    .eq("provider", "stripe")
    .eq("stripe_checkout_session_id", checkoutSessionId)
    .maybeSingle();

  if (error) {
    console.error("[findPaymentAttemptByCheckoutSessionId] query failed:", {
      checkoutSessionId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data ? mapPaymentAttemptRow(data) : null;
}

async function markPaymentAttemptClosed(
  supabase: SupabaseClient<Database>,
  attemptId: string,
  status: "expired" | "invalidated" | "failed",
): Promise<void> {
  const { error } = await supabase
    .from("payment_attempts")
    .update(
      status === "invalidated"
        ? { status, invalidated_at: new Date().toISOString() }
        : { status },
    )
    .eq("id", attemptId);

  if (error) {
    console.error("[markPaymentAttemptClosed] update failed:", {
      attemptId,
      status,
      code: error.code,
      message: error.message,
    });
  }
}

/** Marks the attempt completed after its payment has been recorded (Rule 5/6). */
export async function markPaymentAttemptCompleted(
  supabase: SupabaseClient<Database>,
  attemptId: string,
  providerPaymentId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("payment_attempts")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      ...(providerPaymentId ? { stripe_payment_intent_id: providerPaymentId } : {}),
    })
    .eq("id", attemptId);

  if (error) {
    console.error("[markPaymentAttemptCompleted] update failed:", {
      attemptId,
      code: error.code,
      message: error.message,
    });
  }
}

/**
 * Retrieves the live Checkout Session for a reusable attempt. Returns null if the
 * session can no longer be reused (completed, expired on Stripe's side, or lookup fails).
 */
async function retrieveReusableCheckoutUrl(
  attempt: PaymentAttemptRecord,
): Promise<string | null> {
  if (!attempt.stripe_checkout_session_id || !attempt.provider_account_id) {
    return null;
  }

  try {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.retrieve(
      attempt.stripe_checkout_session_id,
      {},
      { stripeAccount: attempt.provider_account_id },
    );

    if (session.status === "open" && session.url) {
      return session.url;
    }
  } catch (error) {
    console.error("[retrieveReusableCheckoutUrl] Stripe retrieve failed:", {
      attemptId: attempt.id,
      error,
    });
  }

  return null;
}

export type ResolveStripeInvoiceCheckoutSessionInput = {
  companyId: string;
  invoice: InvoiceCheckoutTarget;
  connectedAccountId: string;
  urls: StripeInvoiceCheckoutUrls;
};

async function createNewPaymentAttemptAndCheckoutSession(
  supabase: SupabaseClient<Database>,
  input: ResolveStripeInvoiceCheckoutSessionInput,
): Promise<string> {
  const { companyId, invoice, connectedAccountId, urls } = input;
  const amount = roundCurrency(invoice.balanceDue);
  const expiresAt = new Date(Date.now() + PAYMENT_ATTEMPT_TTL_MS);

  const { data: inserted, error: insertError } = await supabase
    .from("payment_attempts")
    .insert({
      company_id: companyId,
      invoice_id: invoice.id,
      status: "active",
      amount,
      currency: "usd",
      provider: "stripe",
      provider_account_id: connectedAccountId,
      expires_at: expiresAt.toISOString(),
    })
    .select(PAYMENT_ATTEMPT_SELECT)
    .single();

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      // Rule 1: a concurrent click already claimed the active attempt slot for this invoice.
      const winner = await findActivePaymentAttempt(supabase, companyId, invoice.id);
      const reusableUrl = winner ? await retrieveReusableCheckoutUrl(winner) : null;

      if (reusableUrl) {
        return reusableUrl;
      }

      throw new Error(
        "A checkout session for this invoice is already being created. Please try again in a moment.",
      );
    }

    console.error("[createNewPaymentAttemptAndCheckoutSession] insert failed:", {
      companyId,
      invoiceId: invoice.id,
      code: insertError?.code,
      message: insertError?.message,
    });
    throw new Error("Failed to start a new payment attempt.");
  }

  const attempt = mapPaymentAttemptRow(inserted);

  try {
    const session = await createStripeInvoiceCheckoutSession(
      companyId,
      invoice,
      connectedAccountId,
      urls,
      {
        expiresAtUnixSeconds: Math.floor(expiresAt.getTime() / 1000),
        paymentAttemptId: attempt.id,
      },
    );

    // Required sequence (see Implementation Requirement 6): Stripe has already created
    // a payable Session at this point, so the linkage persist below MUST succeed before
    // we ever return session.url. A caller must never receive a Checkout URL for a
    // Session that isn't durably linked to its owning Payment Attempt — the webhook's
    // authoritative lookup (findPaymentAttemptByCheckoutSessionId) depends on that link.
    const { data: linked, error: linkError } = await supabase
      .from("payment_attempts")
      .update({
        stripe_checkout_session_id: session.sessionId,
        stripe_payment_intent_id: session.paymentIntentId,
      })
      .eq("id", attempt.id)
      .select("id")
      .maybeSingle();

    if (linkError || !linked) {
      console.error(
        "[createNewPaymentAttemptAndCheckoutSession] session link persistence failed:",
        {
          attemptId: attempt.id,
          checkoutSessionId: session.sessionId,
          code: linkError?.code,
          message: linkError?.message,
        },
      );

      const expireResult = await expireStripeCheckoutSessionBestEffort({
        checkoutSessionId: session.sessionId,
        connectedAccountId,
        context: {
          paymentAttemptId: attempt.id,
          invoiceId: invoice.id,
          companyId,
        },
      });

      console.info(
        "[createNewPaymentAttemptAndCheckoutSession] expired unlinked session after persistence failure",
        {
          attemptId: attempt.id,
          checkoutSessionId: session.sessionId,
          outcome: expireResult.outcome,
        },
      );

      await markPaymentAttemptClosed(supabase, attempt.id, "failed");

      throw new Error(
        "Failed to start a new payment attempt. Please try again.",
      );
    }

    return session.url;
  } catch (error) {
    await markPaymentAttemptClosed(supabase, attempt.id, "failed");
    throw error;
  }
}

/**
 * Resolves the Checkout Session URL for an invoice, satisfying Payment Attempt Rules 1-4:
 * reuse the active attempt's session when one exists and is still valid (Rule 2), otherwise
 * invalidate/expire it and create a fresh attempt + Checkout Session (Rule 3).
 */
export async function resolveStripeInvoiceCheckoutSession(
  supabase: SupabaseClient<Database>,
  input: ResolveStripeInvoiceCheckoutSessionInput,
): Promise<string> {
  const existing = await findActivePaymentAttempt(
    supabase,
    input.companyId,
    input.invoice.id,
  );

  if (existing) {
    const isExpiredByTime = new Date(existing.expires_at).getTime() <= Date.now();
    const amountStillMatches = amountsMatch(existing.amount, input.invoice.balanceDue);

    if (!isExpiredByTime && amountStillMatches) {
      const reusableUrl = await retrieveReusableCheckoutUrl(existing);

      if (reusableUrl) {
        return reusableUrl;
      }

      await markPaymentAttemptClosed(supabase, existing.id, "expired");
    } else {
      await markPaymentAttemptClosed(
        supabase,
        existing.id,
        isExpiredByTime ? "expired" : "invalidated",
      );
    }
  }

  return createNewPaymentAttemptAndCheckoutSession(supabase, input);
}

export type ExpireStaleCheckoutSessionsResult = {
  attemptsChecked: number;
  expiredCount: number;
};

/**
 * Layer 1 (preventative) of the stale-capture safety design: after an invoice mutation
 * has already committed and the database trigger from migration 112 has invalidated any
 * active Payment Attempt, make a best-effort attempt to expire the associated Stripe
 * Checkout Session(s) so a customer can no longer complete a stale session.
 *
 * This is intentionally best-effort and never throws — callers must call this only
 * after their own mutation has successfully committed, and a failure here must never
 * reverse that mutation. The webhook's reconciliation path (Layer 2) remains the final
 * financial safety boundary regardless of what happens here.
 *
 * Only considers attempts our own bookkeeping has already marked invalidated/expired
 * (the DB trigger remains the sole authority for that) and whose Stripe-side expiry
 * hasn't passed yet, so this never touches the invoice's current active attempt and
 * avoids redundant Stripe calls for sessions long past their own TTL.
 */
export async function expireStaleCheckoutSessionsForInvoice(
  supabase: SupabaseClient<Database>,
  companyId: string,
  invoiceId: string,
): Promise<ExpireStaleCheckoutSessionsResult> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("payment_attempts")
    .select("id, stripe_checkout_session_id, provider_account_id, status")
    .eq("company_id", companyId)
    .eq("invoice_id", invoiceId)
    .in("status", ["invalidated", "expired"])
    .not("stripe_checkout_session_id", "is", null)
    .gt("expires_at", nowIso);

  if (error) {
    console.error("[expireStaleCheckoutSessionsForInvoice] query failed:", {
      companyId,
      invoiceId,
      code: error.code,
      message: error.message,
    });
    return { attemptsChecked: 0, expiredCount: 0 };
  }

  const candidates = data ?? [];
  let expiredCount = 0;

  for (const row of candidates) {
    const checkoutSessionId = row.stripe_checkout_session_id;
    const connectedAccountId = row.provider_account_id;

    if (!checkoutSessionId || !connectedAccountId) {
      continue;
    }

    const result = await expireStripeCheckoutSessionBestEffort({
      checkoutSessionId,
      connectedAccountId,
      context: {
        paymentAttemptId: row.id,
        invoiceId,
        companyId,
      },
    });

    if (result.outcome === "expired") {
      expiredCount += 1;
    }
  }

  return { attemptsChecked: candidates.length, expiredCount };
}
