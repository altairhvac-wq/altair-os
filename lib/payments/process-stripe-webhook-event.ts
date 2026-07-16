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
import { updatePaymentProviderEvent } from "@/lib/database/services/payment-provider-events";
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
  findPaymentAttemptByCheckoutSessionId,
  markPaymentAttemptCompleted,
} from "@/lib/payments/payment-attempts-service";
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
const CHECKOUT_METADATA_PURPOSE = "invoice_payment";
const CHECKOUT_METADATA_PROVIDER = "stripe";

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
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Missing or invalid checkout session metadata",
      metadataCompanyId,
    );
  }

  // Rule 5: resolve against the Payment Attempt first — it is the authoritative
  // source for which company/invoice this checkout session belongs to.
  const attempt = await findPaymentAttemptByCheckoutSessionId(
    supabase,
    checkoutSessionId,
  );

  if (!attempt) {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "No payment attempt found for checkout session",
      metadataCompanyId,
    );
  }

  if (
    attempt.company_id !== metadataCompanyId ||
    attempt.invoice_id !== metadataInvoiceId
  ) {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Payment attempt does not match checkout session metadata",
      attempt.company_id,
    );
  }

  // Rule 6: safely ignore expired, invalidated, or failed attempts. "completed" is
  // allowed through so redelivered webhooks hit the existing dedupe path below.
  if (attempt.status !== "active" && attempt.status !== "completed") {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      `Payment attempt is ${attempt.status}, not active`,
      attempt.company_id,
    );
  }

  const companyId = attempt.company_id;
  const invoiceId = attempt.invoice_id;

  if (!connectedAccountId) {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Missing Stripe connected account context",
      companyId,
    );
  }

  if (session.payment_status !== "paid") {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Checkout session is not paid",
      companyId,
    );
  }

  if (
    session.amount_total === null ||
    session.amount_total === undefined ||
    session.amount_total <= 0
  ) {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Checkout session amount is invalid",
      companyId,
    );
  }

  if ((session.currency ?? "").toLowerCase() !== "usd") {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Checkout session currency must be USD",
      companyId,
    );
  }

  const accountRow = await findStripeCompanyPaymentAccountByCompanyId(
    supabase,
    companyId,
  );

  if (!accountRow || !isStripeCompanyPaymentAccountReady(accountRow, connectedAccountId)) {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Stripe payment account is not ready for online checkout",
      companyId,
    );
  }

  const invoice = await getInvoiceStripePaymentTarget(
    supabase,
    companyId,
    invoiceId,
  );

  if (!invoice) {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Invoice not found for checkout session",
      companyId,
    );
  }

  if (!isInvoicePayable(invoice.status) || invoice.balanceDue <= 0) {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Invoice is not payable",
      companyId,
    );
  }

  if (
    !isInvoiceBalanceConsistent({
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      total: invoice.total,
    })
  ) {
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Invoice balance is inconsistent",
      companyId,
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
    return ignoreCheckoutSessionEvent(
      supabase,
      providerEventId,
      "Checkout session amount does not match invoice balance due",
      companyId,
    );
  }

  const providerPaymentId = extractStripePaymentIntentId(session.payment_intent);
  const idempotencyKey = buildStripeCheckoutIdempotencyKey(checkoutSessionId);

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
