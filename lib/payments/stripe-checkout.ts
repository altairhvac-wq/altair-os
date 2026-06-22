import "server-only";

import { getAppBaseUrl } from "@/lib/email/env";
import type { CompanyPaymentAccount } from "@/lib/payments/types";
import { getStripeClient } from "@/lib/payments/stripe-client";
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

/**
 * Stripe Connect direct charge on the connected Express account.
 * Altair is not merchant of record; funds settle to the connected account.
 * @see https://docs.stripe.com/connect/direct-charges
 */
export async function createStripeInvoiceCheckoutSession(
  companyId: string,
  invoice: InvoiceCheckoutTarget,
  connectedAccountId: string,
  urls: StripeInvoiceCheckoutUrls,
): Promise<string> {
  const stripe = getStripeClient();
  const amountCents = Math.round(roundCurrency(invoice.balanceDue) * 100);

  if (amountCents <= 0) {
    throw new Error("Invoice balance must be greater than zero.");
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
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
      metadata: {
        company_id: companyId,
        invoice_id: invoice.id,
        provider: "stripe",
        purpose: "invoice_payment",
      },
    },
    {
      stripeAccount: connectedAccountId,
    },
  );

  if (!session.url) {
    throw new Error("Stripe did not return a checkout session URL.");
  }

  return session.url;
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
