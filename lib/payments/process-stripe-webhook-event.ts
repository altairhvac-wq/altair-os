import "server-only";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidateInvoiceOperationalPages } from "@/lib/database/revalidation/operational-pages";
import type Stripe from "stripe";
import {
  findStripeCompanyPaymentAccountByCompanyId,
  findStripeCompanyPaymentAccountByProviderAccountId,
  syncStripeCompanyPaymentAccountFromWebhook,
} from "@/lib/database/services/company-payment-accounts";
import {
  findPaymentProviderEvent,
  updatePaymentProviderEvent,
} from "@/lib/database/services/payment-provider-events";
import { findExistingStripeCheckoutPayment } from "@/lib/database/queries/invoice-payments";
import { getInvoiceStripePaymentTarget } from "@/lib/database/queries/invoices";
import type { Database } from "@/lib/database/types";
import {
  recordStripeCheckoutPaymentAtomic,
} from "@/lib/payments/recording";
import {
  buildStripeCheckoutIdempotencyKey,
  buildStripeCheckoutProviderMetadata,
  invoiceBalanceDueToCents,
  stripeUnixTimestampToDateOnly,
} from "@/lib/payments/stripe-checkout";
import {
  findLatestPaymentAttemptForInvoice,
  findPaymentAttemptByCheckoutSessionId,
  findPaymentAttemptById,
  findPaymentAttemptByPaymentIntentId,
  markPaymentAttemptCompleted,
  recordPaymentAttemptCardFailure,
} from "@/lib/payments/payment-attempts-service";
import { recordPaymentReconciliationAtomic } from "@/lib/payments/payment-reconciliation-service";
import { captureMonitoredEvent } from "@/lib/operations/monitoring";
import type { PaymentAttemptRecord } from "@/lib/payments/payment-attempts";
import type { PaymentReconciliationReasonCode } from "@/lib/payments/payment-reconciliations";
import {
  findInvoicePaymentByPaymentIntentId,
  parsePaymentDisputeStatus,
  resolvePaymentIntentIdFromDispute,
  sanitizeDisputeReason,
  stripeDisputeAmountToCurrency,
  stripeEvidenceDueByToIso,
  upsertPaymentDispute,
} from "@/lib/payments/payment-disputes-service";
import { isOpenPaymentDisputeStatus } from "@/lib/payments/payment-disputes";
import {
  CHECKOUT_METADATA_PROVIDER,
  CHECKOUT_METADATA_PURPOSE,
  isAltairInvoicePaymentIntentMetadata,
  isCardFailureAttentionEligible,
  readPaymentIntentMetadata,
  type CardFailureDetails,
} from "@/lib/payments/payment-intent-failure";
import {
  isInvoiceBalanceConsistent,
  roundCurrency,
} from "@/shared/types/invoice";
import { isInvoicePayable } from "@/shared/types/invoice-payment";

export type ProcessStripeWebhookEventResult =
  | { processed: true; ignored: false }
  | { processed: false; ignored: true }
  | { processed: false; ignored: false; retryable: true; error: string };

const NO_MATCHING_ACCOUNT_MESSAGE = "No matching company payment account";

function sanitizeProcessingError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.slice(0, 500);
  }

  return "Stripe webhook processing failed";
}

function extractStripeAccountFromEvent(event: Stripe.Event): Stripe.Account | null {
  if (event.type !== "account.updated") {
    return null;
  }

  const account = event.data.object;

  if (!account || typeof account !== "object" || !("id" in account)) {
    return null;
  }

  return account as Stripe.Account;
}

function extractCheckoutSessionFromEvent(
  event: Stripe.Event,
): Stripe.Checkout.Session | null {
  if (event.type !== "checkout.session.completed") {
    return null;
  }

  const session = event.data.object;

  if (!session || typeof session !== "object" || !("id" in session)) {
    return null;
  }

  return session as Stripe.Checkout.Session;
}

function extractPaymentIntentFromEvent(
  event: Stripe.Event,
): Stripe.PaymentIntent | null {
  if (event.type !== "payment_intent.payment_failed") {
    return null;
  }

  const paymentIntent = event.data.object;

  if (!paymentIntent || typeof paymentIntent !== "object" || !("id" in paymentIntent)) {
    return null;
  }

  return paymentIntent as Stripe.PaymentIntent;
}

const CHARGE_DISPUTE_EVENT_TYPES = new Set([
  "charge.dispute.created",
  "charge.dispute.updated",
  "charge.dispute.closed",
]);

function isChargeDisputeEventType(
  eventType: string,
): eventType is
  | "charge.dispute.created"
  | "charge.dispute.updated"
  | "charge.dispute.closed" {
  return CHARGE_DISPUTE_EVENT_TYPES.has(eventType);
}

function extractDisputeFromEvent(event: Stripe.Event): Stripe.Dispute | null {
  if (!isChargeDisputeEventType(event.type)) {
    return null;
  }

  const dispute = event.data.object;

  if (!dispute || typeof dispute !== "object" || !("id" in dispute)) {
    return null;
  }

  return dispute as Stripe.Dispute;
}

function extractCardFailureDetailsFromPaymentIntent(
  paymentIntent: Stripe.PaymentIntent,
): CardFailureDetails {
  const lastError = paymentIntent.last_payment_error;

  return {
    code: lastError?.code ?? null,
    message: lastError?.message ?? null,
    declineCode: lastError?.decline_code ?? null,
  };
}

function readCheckoutSessionMetadata(
  session: Stripe.Checkout.Session,
): {
  companyId: string | null;
  invoiceId: string | null;
  purpose: string | null;
  provider: string | null;
} {
  const metadata = session.metadata ?? {};

  return {
    companyId: metadata.company_id?.trim() || null,
    invoiceId: metadata.invoice_id?.trim() || null,
    purpose: metadata.purpose?.trim() || null,
    provider: metadata.provider?.trim() || null,
  };
}

function extractStripePaymentIntentId(
  paymentIntent: Stripe.Checkout.Session["payment_intent"],
): string | null {
  if (typeof paymentIntent === "string") {
    return paymentIntent.trim() || null;
  }

  if (
    paymentIntent &&
    typeof paymentIntent === "object" &&
    "id" in paymentIntent &&
    typeof paymentIntent.id === "string"
  ) {
    return paymentIntent.id.trim() || null;
  }

  return null;
}

/**
 * Connect direct-charge webhooks include event.account for the connected Express account.
 * We require this field and match it against company_payment_accounts.provider_account_id.
 */
function extractConnectedAccountId(event: Stripe.Event): string | null {
  const account = event.account;

  if (typeof account === "string" && account.trim().length > 0) {
    return account.trim();
  }

  return null;
}

function isStripeCompanyPaymentAccountReady(
  accountRow: NonNullable<
    Awaited<ReturnType<typeof findStripeCompanyPaymentAccountByCompanyId>>
  >,
  connectedAccountId: string,
): boolean {
  return (
    accountRow.provider_account_id === connectedAccountId &&
    accountRow.online_payments_enabled === true &&
    accountRow.status === "active" &&
    accountRow.charges_enabled === true &&
    accountRow.payouts_enabled === true &&
    accountRow.disabled_at === null
  );
}

async function markProviderEventIgnored(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  errorMessage: string,
  companyId: string | null = null,
): Promise<void> {
  const updateResult = await updatePaymentProviderEvent(supabase, {
    provider: "stripe",
    providerEventId,
    processingStatus: "ignored",
    companyId,
    errorMessage,
    processedAt: new Date().toISOString(),
  });

  if (!updateResult.ok) {
    throw new Error("Failed to mark payment provider event as ignored");
  }
}

async function markProviderEventProcessed(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  companyId: string,
): Promise<void> {
  const updateResult = await updatePaymentProviderEvent(supabase, {
    provider: "stripe",
    providerEventId,
    processingStatus: "processed",
    companyId,
    errorMessage: null,
    processedAt: new Date().toISOString(),
  });

  if (!updateResult.ok) {
    throw new Error("Failed to mark payment provider event as processed");
  }
}

async function markProviderEventFailed(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  errorMessage: string,
): Promise<void> {
  await updatePaymentProviderEvent(supabase, {
    provider: "stripe",
    providerEventId,
    processingStatus: "failed",
    errorMessage,
    processedAt: new Date().toISOString(),
  });
}

async function processAccountUpdatedEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  stripeAccount: Stripe.Account,
): Promise<ProcessStripeWebhookEventResult> {
  const providerAccountId = stripeAccount.id;

  if (!providerAccountId) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Stripe account.updated event missing account id",
    );
    return { processed: false, ignored: true };
  }

  const accountRow = await findStripeCompanyPaymentAccountByProviderAccountId(
    supabase,
    providerAccountId,
  );

  if (!accountRow) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      NO_MATCHING_ACCOUNT_MESSAGE,
    );
    return { processed: false, ignored: true };
  }

  const syncResult = await syncStripeCompanyPaymentAccountFromWebhook(
    supabase,
    accountRow,
    stripeAccount,
  );

  if (!syncResult.ok) {
    throw new Error(syncResult.error ?? "Failed to sync Stripe account status");
  }

  await markProviderEventProcessed(
    supabase,
    providerEventId,
    accountRow.company_id,
  );

  return { processed: true, ignored: false };
}

async function ignoreCheckoutSessionEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  reason: string,
  companyId: string | null = null,
): Promise<ProcessStripeWebhookEventResult> {
  console.info("[stripe-webhook] checkout ignored", {
    eventId: providerEventId,
    reason,
    hasCompanyId: Boolean(companyId),
  });
  await markProviderEventIgnored(supabase, providerEventId, reason, companyId);
  return { processed: false, ignored: true };
}

async function ignorePaymentIntentFailedEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  reason: string,
  companyId: string | null = null,
): Promise<ProcessStripeWebhookEventResult> {
  console.info("[stripe-webhook] payment_intent.payment_failed ignored", {
    eventId: providerEventId,
    reason,
    hasCompanyId: Boolean(companyId),
  });
  await markProviderEventIgnored(supabase, providerEventId, reason, companyId);
  return { processed: false, ignored: true };
}

async function ignoreChargeDisputeEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  reason: string,
  companyId: string | null = null,
): Promise<ProcessStripeWebhookEventResult> {
  console.info("[stripe-webhook] charge.dispute ignored", {
    eventId: providerEventId,
    reason,
    hasCompanyId: Boolean(companyId),
  });
  await markProviderEventIgnored(supabase, providerEventId, reason, companyId);
  return { processed: false, ignored: true };
}

/**
 * Express + direct charges: dispute events arrive on the Connected-accounts
 * webhook with event.account set. Tenant is resolved from company_payment_accounts
 * via that connected account id (not from dispute metadata).
 */
async function processChargeDisputeEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  event: Stripe.Event,
  dispute: Stripe.Dispute,
): Promise<ProcessStripeWebhookEventResult> {
  const connectedAccountId = extractConnectedAccountId(event);

  if (!connectedAccountId) {
    // Direct-charge Connect disputes must carry event.account. Missing account
    // is a configuration / delivery problem — fail so Stripe retries.
    throw new Error(
      `${event.type} missing connected account (event.account) for Express direct-charge dispute`,
    );
  }

  const accountRow = await findStripeCompanyPaymentAccountByProviderAccountId(
    supabase,
    connectedAccountId,
  );

  if (!accountRow) {
    return ignoreChargeDisputeEvent(
      supabase,
      providerEventId,
      NO_MATCHING_ACCOUNT_MESSAGE,
    );
  }

  const companyId = accountRow.company_id;
  const status = parsePaymentDisputeStatus(dispute.status);
  const { paymentIntentId, chargeId } = await resolvePaymentIntentIdFromDispute({
    paymentIntent: dispute.payment_intent,
    charge: dispute.charge,
    connectedAccountId,
  });

  let invoicePaymentId: string | null = null;
  let invoiceId: string | null = null;
  let paymentAttemptId: string | null = null;

  if (paymentIntentId) {
    const invoicePayment = await findInvoicePaymentByPaymentIntentId(
      supabase,
      companyId,
      paymentIntentId,
    );
    if (invoicePayment) {
      invoicePaymentId = invoicePayment.id;
      invoiceId = invoicePayment.invoice_id;
    }

    const attempt = await findPaymentAttemptByPaymentIntentId(
      supabase,
      paymentIntentId,
    );
    if (attempt && attempt.company_id === companyId) {
      paymentAttemptId = attempt.id;
      if (!invoiceId) {
        invoiceId = attempt.invoice_id;
      }
    }
  }

  const amount = stripeDisputeAmountToCurrency(dispute.amount ?? 0);
  const evidenceDueBy = stripeEvidenceDueByToIso(
    dispute.evidence_details?.due_by,
  );
  const providerCreatedAt =
    typeof dispute.created === "number" && dispute.created > 0
      ? new Date(dispute.created * 1000).toISOString()
      : null;

  console.info("[stripe-webhook] charge.dispute received", {
    eventId: providerEventId,
    eventType: event.type,
    disputeId: dispute.id,
    connectedAccountId,
    companyId,
    status,
    hasPaymentIntentId: Boolean(paymentIntentId),
    hasInvoicePaymentId: Boolean(invoicePaymentId),
    hasInvoiceId: Boolean(invoiceId),
    openAttention: isOpenPaymentDisputeStatus(status),
  });

  const record = await upsertPaymentDispute(supabase, {
    companyId,
    invoiceId,
    invoicePaymentId,
    paymentAttemptId,
    providerDisputeId: dispute.id,
    providerChargeId: chargeId,
    providerPaymentIntentId: paymentIntentId,
    connectedAccountId,
    amount,
    currency: dispute.currency ?? "usd",
    reason: sanitizeDisputeReason(dispute.reason),
    status,
    evidenceDueBy,
    providerCreatedAt,
  });

  console.info("[stripe-webhook] payment dispute persisted", {
    eventId: providerEventId,
    eventType: event.type,
    paymentDisputeId: record.id,
    disputeId: record.provider_dispute_id,
    invoiceId: record.invoice_id,
    status: record.status,
  });

  await markProviderEventProcessed(supabase, providerEventId, companyId);
  return { processed: true, ignored: false };
}

/**
 * Resolve the payment attempt for a failed PaymentIntent using the same
 * authoritative-link preference as checkout.session.completed:
 * PaymentIntent id → payment_attempt_id metadata → company/invoice metadata.
 */
async function resolvePaymentAttemptForFailedPaymentIntent(
  supabase: SupabaseClient<Database>,
  paymentIntent: Stripe.PaymentIntent,
): Promise<PaymentAttemptRecord | null> {
  const metadata = readPaymentIntentMetadata(
    paymentIntent.metadata as Record<string, string> | null,
  );

  const byPaymentIntent = await findPaymentAttemptByPaymentIntentId(
    supabase,
    paymentIntent.id,
  );
  if (byPaymentIntent) {
    return byPaymentIntent;
  }

  if (metadata.paymentAttemptId) {
    const byAttemptId = await findPaymentAttemptById(
      supabase,
      metadata.paymentAttemptId,
    );
    if (byAttemptId) {
      return byAttemptId;
    }
  }

  if (
    isAltairInvoicePaymentIntentMetadata(metadata) &&
    metadata.companyId &&
    metadata.invoiceId
  ) {
    return findLatestPaymentAttemptForInvoice(
      supabase,
      metadata.companyId,
      metadata.invoiceId,
    );
  }

  return null;
}

async function processPaymentIntentPaymentFailedEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  event: Stripe.Event,
  paymentIntent: Stripe.PaymentIntent,
): Promise<ProcessStripeWebhookEventResult> {
  const metadata = readPaymentIntentMetadata(
    paymentIntent.metadata as Record<string, string> | null,
  );
  const connectedAccountId = extractConnectedAccountId(event);
  const failure = extractCardFailureDetailsFromPaymentIntent(paymentIntent);

  console.info("[stripe-webhook] payment_intent.payment_failed received", {
    eventId: providerEventId,
    paymentIntentId: paymentIntent.id,
    hasEventAccount: Boolean(connectedAccountId),
    hasCompanyId: Boolean(metadata.companyId),
    hasInvoiceId: Boolean(metadata.invoiceId),
    hasPaymentAttemptId: Boolean(metadata.paymentAttemptId),
    purpose: metadata.purpose,
    provider: metadata.provider,
    failureCode: failure.code,
    declineCode: failure.declineCode,
  });

  const attempt = await resolvePaymentAttemptForFailedPaymentIntent(
    supabase,
    paymentIntent,
  );

  if (!attempt) {
    // Connected accounts can emit unrelated PaymentIntents. Only hard-fail when
    // the PI presents itself as one of Altair's invoice-payment intents.
    if (isAltairInvoicePaymentIntentMetadata(metadata)) {
      throw new Error(
        "Altair payment_intent.payment_failed has no matching payment attempt record",
      );
    }

    return ignorePaymentIntentFailedEvent(
      supabase,
      providerEventId,
      "No matching payment attempt for payment_intent.payment_failed",
      metadata.companyId,
    );
  }

  if (
    metadata.companyId &&
    metadata.invoiceId &&
    (attempt.company_id !== metadata.companyId ||
      attempt.invoice_id !== metadata.invoiceId)
  ) {
    throw new Error(
      "payment_intent.payment_failed payment attempt does not match PaymentIntent metadata",
    );
  }

  if (metadata.paymentAttemptId && attempt.id !== metadata.paymentAttemptId) {
    throw new Error(
      "payment_intent.payment_failed payment attempt id does not match PaymentIntent metadata",
    );
  }

  if (attempt.status === "completed") {
    console.info(
      "[stripe-webhook] payment_intent.payment_failed on completed attempt ignored as already paid",
      {
        eventId: providerEventId,
        paymentAttemptId: attempt.id,
        paymentIntentId: paymentIntent.id,
      },
    );
    await markProviderEventProcessed(
      supabase,
      providerEventId,
      attempt.company_id,
    );
    return { processed: true, ignored: false };
  }

  const updated = await recordPaymentAttemptCardFailure(supabase, {
    attempt,
    paymentIntentId: paymentIntent.id,
    failure,
    failedAt: new Date((event.created ?? Math.floor(Date.now() / 1000)) * 1000),
  });

  if (!updated) {
    // Lost a race with checkout.session.completed marking the attempt completed.
    await markProviderEventProcessed(
      supabase,
      providerEventId,
      attempt.company_id,
    );
    return { processed: true, ignored: false };
  }

  console.info("[stripe-webhook] payment attempt card failure persisted", {
    eventId: providerEventId,
    paymentAttemptId: updated.id,
    invoiceId: updated.invoice_id,
    paymentIntentId: paymentIntent.id,
    cardFailureCount: updated.card_failure_count,
    attentionEligible: isCardFailureAttentionEligible(updated),
  });

  await markProviderEventProcessed(
    supabase,
    providerEventId,
    updated.company_id,
  );
  return { processed: true, ignored: false };
}

/**
 * Financial safety invariant (see supabase/migrations/113_payment_reconciliations.sql):
 * once Stripe has conclusively captured funds for a checkout session that identifies
 * itself as one of Altair's invoice-payment sessions, every remaining branch below must
 * end in exactly one of:
 *   - a normal invoice payment (the existing atomic RPC path), or
 *   - a durable payment_reconciliations "requires_review" record, or
 *   - a thrown error (HTTP 500, so Stripe retries).
 * A captured-funds event must never again reach markProviderEventIgnored.
 */
async function reconcileStaleCapturedCheckoutSession(
  supabase: SupabaseClient<Database>,
  input: {
    providerEventId: string;
    companyId: string;
    invoiceId: string;
    attempt: PaymentAttemptRecord;
    session: Stripe.Checkout.Session;
    reasonCode: PaymentReconciliationReasonCode;
  },
): Promise<ProcessStripeWebhookEventResult> {
  const { providerEventId, companyId, invoiceId, attempt, session, reasonCode } = input;
  const checkoutSessionId = session.id;
  const providerPaymentId = extractStripePaymentIntentId(session.payment_intent);
  const capturedAmount = roundCurrency((session.amount_total ?? 0) / 100);

  console.info(
    "[stripe-checkout-reconciliation] recognized stale capture, recording reconciliation",
    {
      eventId: providerEventId,
      checkoutSessionId,
      invoiceId,
      paymentAttemptId: attempt.id,
      reasonCode,
    },
  );

  const providerEventRecord = await findPaymentProviderEvent(
    supabase,
    "stripe",
    providerEventId,
  );

  if (!providerEventRecord) {
    throw new Error(
      "Provider event record not found while recording payment reconciliation",
    );
  }

  const reconcileResult = await recordPaymentReconciliationAtomic(supabase, {
    companyId,
    invoiceId,
    paymentAttemptId: attempt.id,
    providerEventId: providerEventRecord.id,
    checkoutSessionId,
    providerPaymentId,
    capturedAmount,
    currency: (session.currency ?? "usd").toLowerCase(),
    reasonCode,
  });

  if (!reconcileResult.ok) {
    console.error("[stripe-checkout-reconciliation] RPC failed", {
      eventId: providerEventId,
      checkoutSessionId,
      errorSummary: reconcileResult.error.slice(0, 200),
    });
    throw new Error(reconcileResult.error);
  }

  console.info("[stripe-checkout-reconciliation] recorded", {
    eventId: providerEventId,
    checkoutSessionId,
    reconciliationId: reconcileResult.result.reconciliation_id,
    created: reconcileResult.result.created,
  });

  // ==================== WHY THIS IS AN ALERT ====================
  // Nothing threw. The webhook is about to correctly return 200. And yet money
  // was captured by Stripe that has NOT been applied to an invoice, because the
  // invoice or the payment attempt moved underneath the capture.
  //
  // That is the single most important condition in this file and, until now,
  // it was discoverable only if someone happened to open the founder
  // reconciliation dashboard. `created` distinguishes a genuinely new
  // reconciliation from a redelivered webhook re-reaching an existing one, so
  // a retry storm does not become an alert storm.
  if (reconcileResult.result.created) {
    captureMonitoredEvent({
      event: "payments.reconciliation_required",
      level: "error",
      companyId,
      route: "/api/webhooks/payments",
      meta: {
        reasonCode,
        invoiceId,
        capturedAmount,
        currency: (session.currency ?? "usd").toLowerCase(),
        reconciliationId: reconcileResult.result.reconciliation_id,
        paymentAttemptId: attempt.id,
      },
    });
  }

  revalidateInvoiceOperationalPages(invoiceId);
  return { processed: true, ignored: false };
}

async function processCheckoutSessionCompletedEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<ProcessStripeWebhookEventResult> {
  const {
    companyId: metadataCompanyId,
    invoiceId: metadataInvoiceId,
    purpose,
    provider,
  } = readCheckoutSessionMetadata(session);
  const connectedAccountId = extractConnectedAccountId(event);
  const checkoutSessionId = session.id;

  console.info("[stripe-webhook] checkout.session.completed received", {
    eventId: providerEventId,
    checkoutSessionId,
    hasEventAccount: Boolean(connectedAccountId),
    hasSessionMetadata: Boolean(session.metadata),
    hasCompanyId: Boolean(metadataCompanyId),
    hasInvoiceId: Boolean(metadataInvoiceId),
    hasPurpose: Boolean(purpose),
    hasProvider: Boolean(provider),
    purpose,
    provider,
    paymentStatus: session.payment_status ?? null,
    amountTotal: session.amount_total ?? null,
    currency: session.currency ?? null,
  });

  if (
    purpose !== CHECKOUT_METADATA_PURPOSE ||
    provider !== CHECKOUT_METADATA_PROVIDER
  ) {
    // Not a session Altair's invoice-payment flow created — nothing to associate,
    // reconcile, or record regardless of payment status.
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Missing or invalid checkout session metadata",
      metadataCompanyId,
    );
  }

  // "Is this a currently supported successfully paid Checkout event?" — decided before
  // any attempt/invoice resolution, per the required webhook decision flow. Everything
  // past this gate is a conclusively captured payment and must not be silently ignored.
  const isSupportedPaidCheckout =
    session.payment_status === "paid" &&
    typeof session.amount_total === "number" &&
    session.amount_total > 0 &&
    (session.currency ?? "").toLowerCase() === "usd";

  if (!isSupportedPaidCheckout) {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Checkout session is not a supported successful payment",
      metadataCompanyId,
    );
  }

  if (!connectedAccountId) {
    throw new Error(
      "Paid checkout session missing Stripe connected account context",
    );
  }

  // Rule 5: resolve against the Payment Attempt — it is the authoritative source for
  // which company/invoice this checkout session belongs to, never client metadata alone.
  const attempt = await findPaymentAttemptByCheckoutSessionId(
    supabase,
    checkoutSessionId,
  );

  if (!attempt) {
    // Funds were captured for a session that presents itself as one of ours, but no
    // Payment Attempt links to it. Requirement 6 guarantees every session Altair now
    // creates is durably linked before its URL is ever returned, so this indicates a
    // missing authoritative record rather than a normal business-state conflict — it
    // must not be silently ignored and must not be guessed into a reconciliation record.
    throw new Error(
      "Paid checkout session has no matching payment attempt record",
    );
  }

  if (
    attempt.company_id !== metadataCompanyId ||
    attempt.invoice_id !== metadataInvoiceId
  ) {
    throw new Error(
      "Paid checkout session payment attempt does not match session metadata",
    );
  }

  const companyId = attempt.company_id;
  const invoiceId = attempt.invoice_id;

  // Rule 6 (extended): a stale attempt no longer means "ignore" — Stripe already
  // captured the money, so this routes to the durable reconciliation record instead.
  // "completed" is allowed through so redelivered webhooks hit the dedupe path below.
  if (attempt.status !== "active" && attempt.status !== "completed") {
    return reconcileStaleCapturedCheckoutSession(supabase, {
      providerEventId,
      companyId,
      invoiceId,
      attempt,
      session,
      reasonCode: "attempt_invalidated",
    });
  }

  const providerPaymentId = extractStripePaymentIntentId(session.payment_intent);
  const idempotencyKey = buildStripeCheckoutIdempotencyKey(checkoutSessionId);

  // Redelivery/idempotency check must happen before evaluating the invoice's *current*
  // payable/balance state: a webhook retry for an already-recorded Stripe payment will
  // legitimately find the invoice now "paid" (or its balance already reduced), which
  // must resolve as idempotent success rather than a spurious reconciliation record.
  const existingPayment = await findExistingStripeCheckoutPayment(supabase, companyId, {
    checkoutSessionId,
    providerPaymentId,
    idempotencyKey,
  });

  if (existingPayment) {
    console.info("[stripe-checkout-recording] duplicate payment already recorded", {
      eventId: providerEventId,
      checkoutSessionId,
    });
    await markPaymentAttemptCompleted(supabase, attempt.id, providerPaymentId);
    await markProviderEventProcessed(supabase, providerEventId, companyId);
    return { processed: true, ignored: false };
  }

  const accountRow = await findStripeCompanyPaymentAccountByCompanyId(
    supabase,
    companyId,
  );

  if (!accountRow || !isStripeCompanyPaymentAccountReady(accountRow, connectedAccountId)) {
    throw new Error(
      "Stripe payment account is not ready for a captured checkout session",
    );
  }

  const invoice = await getInvoiceStripePaymentTarget(
    supabase,
    companyId,
    invoiceId,
  );

  if (!invoice) {
    throw new Error(
      "Paid checkout session invoice record could not be loaded",
    );
  }

  if (!isInvoicePayable(invoice.status) || invoice.balanceDue <= 0) {
    return reconcileStaleCapturedCheckoutSession(supabase, {
      providerEventId,
      companyId,
      invoiceId,
      attempt,
      session,
      reasonCode: "invoice_not_payable",
    });
  }

  if (
    !isInvoiceBalanceConsistent({
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      total: invoice.total,
    })
  ) {
    throw new Error(
      "Invoice balance is inconsistent for a captured checkout session",
    );
  }

  const expectedAmountCents = invoiceBalanceDueToCents(invoice.balanceDue);

  if (session.amount_total !== expectedAmountCents) {
    console.info("[stripe-checkout-recording] amount mismatch", {
      eventId: providerEventId,
      checkoutSessionId,
      amountTotal: session.amount_total,
      expectedAmountCents,
    });
    return reconcileStaleCapturedCheckoutSession(supabase, {
      providerEventId,
      companyId,
      invoiceId,
      attempt,
      session,
      reasonCode: "amount_mismatch",
    });
  }

  const paymentDate = stripeUnixTimestampToDateOnly(
    event.created ?? session.created ?? Math.floor(Date.now() / 1000),
  );
  const paymentAmount = roundCurrency(session.amount_total / 100);

  console.info("[stripe-checkout-recording] calling record_invoice_payment_atomic", {
    eventId: providerEventId,
    checkoutSessionId,
    amount: paymentAmount,
    currency: session.currency ?? "usd",
    hasProviderPaymentId: Boolean(providerPaymentId),
  });

  const recordResult = await recordStripeCheckoutPaymentAtomic(supabase, {
    companyId,
    invoiceId,
    amount: paymentAmount,
    paymentDate,
    checkoutSessionId,
    providerPaymentId,
    idempotencyKey,
    providerMetadata: buildStripeCheckoutProviderMetadata({
      checkoutSessionId,
      paymentIntentId: providerPaymentId,
      amountTotal: session.amount_total,
      currency: session.currency ?? "usd",
      paymentStatus: session.payment_status,
      connectedAccountId,
    }),
  });

  if (!recordResult.ok) {
    if (recordResult.duplicate) {
      console.info("[stripe-checkout-recording] RPC duplicate treated as success", {
        eventId: providerEventId,
        checkoutSessionId,
      });
      await markPaymentAttemptCompleted(supabase, attempt.id, providerPaymentId);
      await markProviderEventProcessed(supabase, providerEventId, companyId);
      return { processed: true, ignored: false };
    }

    if (recordResult.reconciliationReason) {
      console.info("[stripe-checkout-recording] RPC rejected with recognized stale-state conflict", {
        eventId: providerEventId,
        checkoutSessionId,
        reasonCode: recordResult.reconciliationReason,
      });
      return reconcileStaleCapturedCheckoutSession(supabase, {
        providerEventId,
        companyId,
        invoiceId,
        attempt,
        session,
        reasonCode: recordResult.reconciliationReason,
      });
    }

    console.error("[stripe-checkout-recording] RPC failed", {
      eventId: providerEventId,
      checkoutSessionId,
      errorSummary: recordResult.error.slice(0, 200),
    });
    throw new Error(recordResult.error);
  }

  await markPaymentAttemptCompleted(supabase, attempt.id, providerPaymentId);
  await markProviderEventProcessed(supabase, providerEventId, companyId);
  revalidateInvoiceOperationalPages(invoiceId);
  revalidatePath("/invoice-payment", "layout");
  revalidatePath("/reports");
  console.info("[stripe-checkout-recording] recorded successfully", {
    eventId: providerEventId,
    checkoutSessionId,
    newStatus: recordResult.result.new_status,
    amountPaid: recordResult.result.amount_paid,
    balanceDue: recordResult.result.balance_due,
  });
  return { processed: true, ignored: false };
}

export async function processStripeWebhookEvent(
  supabase: SupabaseClient<Database>,
  event: Stripe.Event,
): Promise<ProcessStripeWebhookEventResult> {
  const providerEventId = event.id;

  try {
    if (event.type === "account.updated") {
      const stripeAccount = extractStripeAccountFromEvent(event);

      if (!stripeAccount) {
        await markProviderEventIgnored(
          supabase,
          providerEventId,
          "Invalid Stripe account.updated payload",
        );
        return { processed: false, ignored: true };
      }

      return await processAccountUpdatedEvent(
        supabase,
        providerEventId,
        stripeAccount,
      );
    }

    if (event.type === "checkout.session.completed") {
      const session = extractCheckoutSessionFromEvent(event);

      if (!session) {
        await markProviderEventIgnored(
          supabase,
          providerEventId,
          "Invalid Stripe checkout.session.completed payload",
        );
        return { processed: false, ignored: true };
      }

      return await processCheckoutSessionCompletedEvent(
        supabase,
        providerEventId,
        event,
        session,
      );
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = extractPaymentIntentFromEvent(event);

      if (!paymentIntent) {
        await markProviderEventIgnored(
          supabase,
          providerEventId,
          "Invalid Stripe payment_intent.payment_failed payload",
        );
        return { processed: false, ignored: true };
      }

      return await processPaymentIntentPaymentFailedEvent(
        supabase,
        providerEventId,
        event,
        paymentIntent,
      );
    }

    if (isChargeDisputeEventType(event.type)) {
      const dispute = extractDisputeFromEvent(event);

      if (!dispute) {
        await markProviderEventIgnored(
          supabase,
          providerEventId,
          `Invalid Stripe ${event.type} payload`,
        );
        return { processed: false, ignored: true };
      }

      return await processChargeDisputeEvent(
        supabase,
        providerEventId,
        event,
        dispute,
      );
    }

    await markProviderEventIgnored(
      supabase,
      providerEventId,
      `Unsupported Stripe event type: ${event.type}`,
    );
    console.info("[stripe-webhook] unsupported event ignored", {
      eventId: providerEventId,
      eventType: event.type,
    });
    return { processed: false, ignored: true };
  } catch (error) {
    const message = sanitizeProcessingError(error);
    console.error("[payment-provider-event] processing failed", {
      eventId: providerEventId,
      eventType: event.type,
      hasEventAccount: Boolean(extractConnectedAccountId(event)),
      errorSummary: message,
    });
    await markProviderEventFailed(supabase, providerEventId, message);
    return {
      processed: false,
      ignored: false,
      retryable: true,
      error: message,
    };
  }
}
