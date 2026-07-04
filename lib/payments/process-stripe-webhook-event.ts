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

async function processCheckoutSessionCompletedEvent(
  supabase: SupabaseClient<Database>,
  providerEventId: string,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<ProcessStripeWebhookEventResult> {
  const { companyId, invoiceId, purpose, provider } =
    readCheckoutSessionMetadata(session);

  if (
    !companyId ||
    !invoiceId ||
    purpose !== CHECKOUT_METADATA_PURPOSE ||
    provider !== CHECKOUT_METADATA_PROVIDER
  ) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Missing or invalid checkout session metadata",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  const connectedAccountId = extractConnectedAccountId(event);

  if (!connectedAccountId) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Missing Stripe connected account context",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  if (session.payment_status !== "paid") {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Checkout session is not paid",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  if (
    session.amount_total === null ||
    session.amount_total === undefined ||
    session.amount_total <= 0
  ) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Checkout session amount is invalid",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  if ((session.currency ?? "").toLowerCase() !== "usd") {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Checkout session currency must be USD",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  const accountRow = await findStripeCompanyPaymentAccountByCompanyId(
    supabase,
    companyId,
  );

  if (!accountRow || !isStripeCompanyPaymentAccountReady(accountRow, connectedAccountId)) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Stripe payment account is not ready for online checkout",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  const invoice = await getInvoiceStripePaymentTarget(
    supabase,
    companyId,
    invoiceId,
  );

  if (!invoice) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Invoice not found for checkout session",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  if (!isInvoicePayable(invoice.status) || invoice.balanceDue <= 0) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Invoice is not payable",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  if (
    !isInvoiceBalanceConsistent({
      amountPaid: invoice.amountPaid,
      balanceDue: invoice.balanceDue,
      total: invoice.total,
    })
  ) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Invoice balance is inconsistent",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  const expectedAmountCents = invoiceBalanceDueToCents(invoice.balanceDue);

  if (session.amount_total !== expectedAmountCents) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Checkout session amount does not match invoice balance due",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  const checkoutSessionId = session.id;
  const providerPaymentId = extractStripePaymentIntentId(session.payment_intent);
  const idempotencyKey = buildStripeCheckoutIdempotencyKey(checkoutSessionId);

  const existingPayment = await findExistingStripeCheckoutPayment(supabase, companyId, {
    checkoutSessionId,
    providerPaymentId,
    idempotencyKey,
  });

  if (existingPayment) {
    await markProviderEventProcessed(supabase, providerEventId, companyId);
    return { processed: true, ignored: false };
  }

  const paymentDate = stripeUnixTimestampToDateOnly(
    event.created ?? session.created ?? Math.floor(Date.now() / 1000),
  );
  const paymentAmount = roundCurrency(session.amount_total / 100);

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
      await markProviderEventProcessed(supabase, providerEventId, companyId);
      return { processed: true, ignored: false };
    }

    throw new Error(recordResult.error);
  }

  await markProviderEventProcessed(supabase, providerEventId, companyId);
  revalidateInvoiceOperationalPages(invoiceId);
  revalidatePath("/reports");
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
    return { processed: false, ignored: true };
  } catch (error) {
    const message = sanitizeProcessingError(error);
    await markProviderEventFailed(supabase, providerEventId, message);
    return {
      processed: false,
      ignored: false,
      retryable: true,
      error: message,
    };
  }
}
