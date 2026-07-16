import "server-only";

import Stripe from "stripe";
import { getAppBaseUrl } from "@/lib/email/env";
import { getStripeSecretKey } from "@/lib/payments/env";
import type { CompanyPaymentAccount } from "@/lib/payments/types";
import { getStripeClient } from "@/lib/payments/stripe-client";
import { isCardPaymentsCapabilityActiveFromProviderMetadata } from "@/lib/payments/stripe-account-sync";
import {
  isInvoicePayable,
  type PayableInvoiceStatus,
} from "@/shared/types/invoice-payment";
import { roundCurrency } from "@/shared/types/invoice";

export type InvoiceCheckoutTarget = {
  id: string;
  invoiceNumber: string;
  balanceDue: number;
  status: string;
};

export type StripeInvoiceCheckoutUrls = {
  successUrl: string;
  cancelUrl: string;
};

export type StripeInvoiceCheckoutSessionOptions = {
  /** Unix seconds. Stripe requires this between 30 minutes and 24 hours from creation. */
  expiresAtUnixSeconds?: number;
  /** Recorded in session metadata for traceability back to the owning payment attempt. */
  paymentAttemptId?: string;
};

export type StripeInvoiceCheckoutSessionResult = {
  url: string;
  sessionId: string;
  paymentIntentId: string | null;
  expiresAt: number | null;
};

function extractPaymentIntentIdFromSession(
  paymentIntent: Stripe.Checkout.Session["payment_intent"],
): string | null {
  if (typeof paymentIntent === "string") {
    return paymentIntent.trim() || null;
  }

  if (paymentIntent && typeof paymentIntent === "object" && "id" in paymentIntent) {
    return paymentIntent.id;
  }

  return null;
}

/**
 * Stripe Connect direct charge on the connected Express account.
 * Altair is not merchant of record; funds settle to the connected account.
 * @see https://docs.stripe.com/connect/direct-charges
 *
 * Callers should go through lib/payments/payment-attempts-service.ts rather than
 * calling this directly, so that at most one active Checkout Session exists per
 * invoice (see supabase/migrations/112_payment_attempts.sql).
 */
export async function createStripeInvoiceCheckoutSession(
  companyId: string,
  invoice: InvoiceCheckoutTarget,
  connectedAccountId: string,
  urls: StripeInvoiceCheckoutUrls,
  options: StripeInvoiceCheckoutSessionOptions = {},
): Promise<StripeInvoiceCheckoutSessionResult> {
  if (!isInvoicePayable(invoice.status)) {
    throw new Error("This invoice cannot accept online payment in its current status.");
  }

  const stripe = getStripeClient();
  const amountCents = Math.round(roundCurrency(invoice.balanceDue) * 100);

  if (amountCents <= 0) {
    throw new Error("Invoice balance must be greater than zero.");
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      // Card is the only payment method Altair supports end-to-end. The webhook
      // handler only understands checkout.session.completed with an immediately
      // final payment_status ("paid"/"unpaid") — it has no handling for
      // checkout.session.async_payment_succeeded/failed. Letting Stripe's automatic
      // payment methods offer bank debits, redirects, or BNPL would let a customer
      // pay via a method that settles asynchronously days later with no code path to
      // ever record it, so payment methods are explicitly pinned to card only.
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Invoice ${invoice.invoiceNumber}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      ...(options.expiresAtUnixSeconds
        ? { expires_at: options.expiresAtUnixSeconds }
        : {}),
      metadata: {
        company_id: companyId,
        invoice_id: invoice.id,
        provider: "stripe",
        purpose: "invoice_payment",
        ...(options.paymentAttemptId
          ? { payment_attempt_id: options.paymentAttemptId }
          : {}),
      },
    },
    {
      stripeAccount: connectedAccountId,
    },
  );

  const stripeSecretKey = getStripeSecretKey();
  console.info("[stripe-checkout-mode]", {
    keyMode: stripeSecretKey?.startsWith("sk_live")
      ? "live"
      : stripeSecretKey?.startsWith("sk_test")
        ? "test"
        : "unknown",
    sessionMode: session.id.startsWith("cs_live")
      ? "live"
      : session.id.startsWith("cs_test")
        ? "test"
        : "unknown",
    hasConnectedAccount: Boolean(connectedAccountId),
    hasCompanyId: Boolean(companyId),
    hasInvoiceId: Boolean(invoice.id),
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout session URL.");
  }

  return {
    url: session.url,
    sessionId: session.id,
    paymentIntentId: extractPaymentIntentIdFromSession(session.payment_intent),
    expiresAt: session.expires_at ?? null,
  };
}

export type StripeCheckoutSessionExpireOutcome =
  | "expired"
  | "already_complete"
  | "already_expired"
  | "not_found"
  | "failed";

export type StripeCheckoutSessionExpireResult = {
  outcome: StripeCheckoutSessionExpireOutcome;
};

/**
 * Best-effort Checkout Session expiration (Layer 1 of the stale-capture safety design).
 * Never throws — callers must not let a failed expiration reverse an already-committed
 * invoice mutation. The durable webhook reconciliation path remains the final financial
 * safety boundary regardless of what this helper reports.
 *
 * Safe to log: only ids and outcomes, never secrets or payment details.
 */
export async function expireStripeCheckoutSessionBestEffort(input: {
  checkoutSessionId: string;
  connectedAccountId: string | null;
  /** Safe identifiers (ids only) attached to log lines for investigation. */
  context?: Record<string, string | null | undefined>;
}): Promise<StripeCheckoutSessionExpireResult> {
  const { checkoutSessionId, connectedAccountId, context = {} } = input;

  if (!checkoutSessionId || !connectedAccountId) {
    console.error("[stripe-checkout-expire] missing session or account id", {
      ...context,
      hasCheckoutSessionId: Boolean(checkoutSessionId),
      hasConnectedAccountId: Boolean(connectedAccountId),
    });
    return { outcome: "failed" };
  }

  const stripe = getStripeClient();

  try {
    await stripe.checkout.sessions.expire(
      checkoutSessionId,
      {},
      { stripeAccount: connectedAccountId },
    );

    console.info("[stripe-checkout-expire] expired", {
      ...context,
      checkoutSessionId,
    });

    return { outcome: "expired" };
  } catch (error) {
    // Stripe's "already complete" / "already expired" rejections are benign races, not
    // failures — determine the authoritative current state instead of parsing error text.
    try {
      const current = await stripe.checkout.sessions.retrieve(
        checkoutSessionId,
        {},
        { stripeAccount: connectedAccountId },
      );

      if (current.status === "complete") {
        console.info("[stripe-checkout-expire] already complete (benign race)", {
          ...context,
          checkoutSessionId,
        });
        return { outcome: "already_complete" };
      }

      if (current.status === "expired") {
        console.info("[stripe-checkout-expire] already expired (benign race)", {
          ...context,
          checkoutSessionId,
        });
        return { outcome: "already_expired" };
      }
    } catch (retrieveError) {
      if (
        retrieveError instanceof Stripe.errors.StripeInvalidRequestError &&
        retrieveError.statusCode === 404
      ) {
        console.warn("[stripe-checkout-expire] session not found", {
          ...context,
          checkoutSessionId,
        });
        return { outcome: "not_found" };
      }

      console.error("[stripe-checkout-expire] retrieve after expire failure also failed", {
        ...context,
        checkoutSessionId,
        errorType:
          retrieveError instanceof Error ? retrieveError.constructor.name : typeof retrieveError,
      });
      return { outcome: "failed" };
    }

    console.error("[stripe-checkout-expire] unexpected expiration failure", {
      ...context,
      checkoutSessionId,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
    });
    return { outcome: "failed" };
  }
}

export function buildAdminInvoiceCheckoutUrls(
  invoiceId: string,
): StripeInvoiceCheckoutUrls | null {
  const baseUrl = getAppBaseUrl();

  if (!baseUrl) {
    return null;
  }

  const invoicePath = `${baseUrl}/invoices/${invoiceId}`;

  return {
    successUrl: `${invoicePath}?checkout=success`,
    cancelUrl: `${invoicePath}?checkout=cancelled`,
  };
}

export function buildPublicInvoiceCheckoutUrls(
  rawToken: string,
): StripeInvoiceCheckoutUrls | null {
  const baseUrl = getAppBaseUrl();

  if (!baseUrl) {
    return null;
  }

  const encodedToken = encodeURIComponent(rawToken.trim());
  const invoicePaymentPath = `${baseUrl}/invoice-payment/${encodedToken}`;

  return {
    successUrl: `${invoicePaymentPath}?checkout=success`,
    cancelUrl: `${invoicePaymentPath}?checkout=cancelled`,
  };
}

export function validateStripeInvoiceCheckoutReadiness(
  account: CompanyPaymentAccount | null,
  invoice: InvoiceCheckoutTarget,
): { ok: true; account: CompanyPaymentAccount } | { ok: false; error: string } {
  if (!account) {
    return {
      ok: false,
      error: "Connect Stripe before creating a checkout session.",
    };
  }

  if (account.provider !== "stripe") {
    return { ok: false, error: "Stripe payment account is required." };
  }

  if (!account.providerAccountId) {
    return { ok: false, error: "Stripe account linkage is incomplete." };
  }

  if (account.status !== "active") {
    return {
      ok: false,
      error: "Stripe account must be active before accepting online payments.",
    };
  }

  if (!account.chargesEnabled) {
    return {
      ok: false,
      error: "Stripe charges must be enabled before accepting online payments.",
    };
  }

  if (!account.payoutsEnabled) {
    return {
      ok: false,
      error: "Stripe payouts must be enabled before accepting online payments.",
    };
  }

  if (!account.onboardingCompletedAt) {
    return {
      ok: false,
      error: "Stripe onboarding must be completed before accepting online payments.",
    };
  }

  if (account.disabledAt) {
    return {
      ok: false,
      error: "Stripe account is disabled and cannot accept online payments.",
    };
  }

  if (!account.onlinePaymentsEnabled) {
    return {
      ok: false,
      error: "Online checkout is not enabled for this company.",
    };
  }

  if (!isCardPaymentsCapabilityActiveFromProviderMetadata(account.providerMetadata)) {
    return {
      ok: false,
      error:
        "Stripe card payments are not active for this company yet. Refresh Stripe status or continue Stripe setup.",
    };
  }

  if (invoice.balanceDue <= 0) {
    return { ok: false, error: "This invoice has no balance due." };
  }

  if (!isInvoicePayable(invoice.status)) {
    if (invoice.status === "draft") {
      return { ok: false, error: "Send this invoice before accepting online payment." };
    }

    if (invoice.status === "paid") {
      return { ok: false, error: "This invoice is fully paid." };
    }

    if (invoice.status === "void") {
      return { ok: false, error: "This invoice is void and cannot accept payment." };
    }

    if (invoice.status === "cancelled") {
      return {
        ok: false,
        error: "This invoice is cancelled and cannot accept payment.",
      };
    }

    return {
      ok: false,
      error: "This invoice cannot accept online payment in its current status.",
    };
  }

  return { ok: true, account };
}

export function isPayableInvoiceStatus(status: string): status is PayableInvoiceStatus {
  return isInvoicePayable(status);
}

export function invoiceBalanceDueToCents(balanceDue: number): number {
  return Math.round(roundCurrency(balanceDue) * 100);
}

export function buildStripeCheckoutIdempotencyKey(sessionId: string): string {
  return `stripe:checkout_session:${sessionId}`;
}

export type StripeCheckoutProviderMetadata = {
  checkout_session_id: string;
  payment_intent: string | null;
  amount_total: number;
  currency: string;
  payment_status: string;
  connected_account_id: string;
};

export function buildStripeCheckoutProviderMetadata(input: {
  checkoutSessionId: string;
  paymentIntentId: string | null;
  amountTotal: number;
  currency: string;
  paymentStatus: string;
  connectedAccountId: string;
}): StripeCheckoutProviderMetadata {
  return {
    checkout_session_id: input.checkoutSessionId,
    payment_intent: input.paymentIntentId,
    amount_total: input.amountTotal,
    currency: input.currency,
    payment_status: input.paymentStatus,
    connected_account_id: input.connectedAccountId,
  };
}

export function stripeUnixTimestampToDateOnly(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().split("T")[0] ?? "";
}

const STRIPE_CARD_PAYMENTS_NOT_ACTIVE_ERROR =
  "Stripe card payments are not active for this company yet. Refresh Stripe status or continue Stripe setup.";

const STRIPE_CHECKOUT_FALLBACK_ERROR =
  "Failed to create checkout session. Please try again.";

/** Maps Stripe checkout failures to safe, user-facing copy (no secrets). */
export function mapStripeCheckoutError(
  error: unknown,
  fallback = STRIPE_CHECKOUT_FALLBACK_ERROR,
): string {
  if (error instanceof Stripe.errors.StripeError) {
    const message = error.message ?? "";

    if (/card_payments capability/i.test(message)) {
      return STRIPE_CARD_PAYMENTS_NOT_ACTIVE_ERROR;
    }
  }

  if (error instanceof Error) {
    const message = error.message;

    if (/card_payments capability/i.test(message)) {
      return STRIPE_CARD_PAYMENTS_NOT_ACTIVE_ERROR;
    }
  }

  return fallback;
}
