import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import {
  findStripeCompanyPaymentAccountByCompanyId,
  findStripeCompanyPaymentAccountByProviderAccountId,
  syncStripeCompanyPaymentAccountFromWebhook,
} from "@/lib/database/services/company-payment-accounts";
import { updatePaymentProviderEvent } from "@/lib/database/services/payment-provider-events";
import type { Database } from "@/lib/database/types";

export type ProcessStripeWebhookEventResult =
  | { processed: true; ignored: false }
  | { processed: false; ignored: true }
  | { processed: false; ignored: false; retryable: true; error: string };

const NO_MATCHING_ACCOUNT_MESSAGE = "No matching company payment account";
const CHECKOUT_METADATA_PURPOSE = "invoice_payment";

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
} {
  const metadata = session.metadata ?? {};

  return {
    companyId: metadata.company_id?.trim() || null,
    invoiceId: metadata.invoice_id?.trim() || null,
    purpose: metadata.purpose?.trim() || null,
  };
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
  session: Stripe.Checkout.Session,
): Promise<ProcessStripeWebhookEventResult> {
  const { companyId, invoiceId, purpose } = readCheckoutSessionMetadata(session);

  if (!companyId || !invoiceId || purpose !== CHECKOUT_METADATA_PURPOSE) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Missing or invalid checkout session metadata",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  const accountRow = await findStripeCompanyPaymentAccountByCompanyId(
    supabase,
    companyId,
  );

  if (!accountRow || !accountRow.online_payments_enabled) {
    await markProviderEventIgnored(
      supabase,
      providerEventId,
      "Online payments not enabled for company",
      companyId,
    );
    return { processed: false, ignored: true };
  }

  // Actual payment recording comes in a future phase after payment intent/amount/currency validation is implemented.
  await markProviderEventProcessed(supabase, providerEventId, companyId);
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
