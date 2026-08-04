/**
 * Pure helpers for Stripe payment_intent.payment_failed → payment_attempts.
 * No server-only import so noise rules and payload parsing can be verified
 * outside the Next.js runtime.
 *
 * Attention / noise rules (product judgment — Step 1 persists data only;
 * Dashboard bucket wiring is a later step):
 *
 * Persist every linked card failure on the payment attempt (count + last error).
 * Do NOT flip status to "failed" on decline — the Checkout session can still
 * succeed on retry, and killing the active attempt would break reuse (Rule 1).
 *
 * A failure is noise (not attention) when the customer immediately retries and
 * the same attempt later completes successfully.
 *
 * A failure is attention-eligible when either:
 *   1. card_failure_count >= 2 on an attempt that never completed, OR
 *   2. card_failure_count >= 1 and the attempt ends without success
 *      (status in expired | invalidated | failed, completed_at is null).
 *
 * Reasoning: a single decline is a normal checkout typo/wrong-card moment.
 * Two declines on the same open attempt, or one decline followed by abandon /
 * expiry, means money collection is stuck and an owner should care later.
 */

import type { PaymentAttemptStatus } from "@/lib/payments/payment-attempts";

export const CHECKOUT_METADATA_PURPOSE = "invoice_payment";
export const CHECKOUT_METADATA_PROVIDER = "stripe";

/** Failures at or above this count are attention-eligible while unresolved. */
export const CARD_FAILURE_ATTENTION_MIN_COUNT = 2;

const MAX_FAILURE_MESSAGE_LENGTH = 280;

export type PaymentIntentFailureMetadata = {
  companyId: string | null;
  invoiceId: string | null;
  purpose: string | null;
  provider: string | null;
  paymentAttemptId: string | null;
};

export type CardFailureDetails = {
  code: string | null;
  message: string | null;
  declineCode: string | null;
};

export type CardFailureAttentionInput = {
  status: PaymentAttemptStatus;
  card_failure_count: number;
  completed_at: string | null;
};

export function readPaymentIntentMetadata(
  metadata: Record<string, string> | null | undefined,
): PaymentIntentFailureMetadata {
  const meta = metadata ?? {};

  return {
    companyId: meta.company_id?.trim() || null,
    invoiceId: meta.invoice_id?.trim() || null,
    purpose: meta.purpose?.trim() || null,
    provider: meta.provider?.trim() || null,
    paymentAttemptId: meta.payment_attempt_id?.trim() || null,
  };
}

export function isAltairInvoicePaymentIntentMetadata(
  metadata: PaymentIntentFailureMetadata,
): boolean {
  return (
    metadata.purpose === CHECKOUT_METADATA_PURPOSE &&
    metadata.provider === CHECKOUT_METADATA_PROVIDER
  );
}

export function sanitizeCardFailureMessage(
  message: string | null | undefined,
): string | null {
  if (!message || typeof message !== "string") {
    return null;
  }

  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, MAX_FAILURE_MESSAGE_LENGTH);
}

/**
 * Prefer decline_code for card declines; fall back to last_payment_error.code.
 */
export function resolveCardFailureCode(details: CardFailureDetails): string | null {
  const decline = details.declineCode?.trim() || null;
  if (decline) {
    return decline.slice(0, 120);
  }

  const code = details.code?.trim() || null;
  if (code) {
    return code.slice(0, 120);
  }

  return null;
}

/**
 * Whether this attempt should receive card-failure telemetry.
 * Completed attempts already succeeded — ignore late/redundant failure events.
 */
export function shouldPersistCardFailureForAttempt(
  status: PaymentAttemptStatus,
): boolean {
  return status !== "completed";
}

/**
 * Query-time / Dashboard exception-board criterion. Not written as a column —
 * consumers should call this (or equivalent SQL) against persisted fields.
 */
export function isCardFailureAttentionEligible(
  attempt: CardFailureAttentionInput,
): boolean {
  if (attempt.completed_at != null || attempt.status === "completed") {
    return false;
  }

  if (attempt.card_failure_count >= CARD_FAILURE_ATTENTION_MIN_COUNT) {
    return true;
  }

  if (
    attempt.card_failure_count >= 1 &&
    (attempt.status === "expired" ||
      attempt.status === "invalidated" ||
      attempt.status === "failed")
  ) {
    return true;
  }

  return false;
}
