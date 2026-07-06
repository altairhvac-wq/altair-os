import "server-only";

import Stripe from "stripe";
import { getAppBaseUrl } from "@/lib/email/env";
import type { StripeCapabilityStatus } from "@/lib/payments/stripe-account-sync";
import { getStripeClient } from "@/lib/payments/stripe-client";

const STRIPE_SETUP_FALLBACK_ERROR =
  "Failed to start Stripe setup. Please try again.";

const STRIPE_SETUP_INVALID_KEY_ERROR =
  "Stripe setup could not start because the Stripe secret key is invalid. Check STRIPE_SECRET_KEY in your environment settings.";

const STRIPE_SETUP_NOT_CONFIGURED_ERROR =
  "Stripe setup is not configured yet. Add STRIPE_SECRET_KEY and NEXT_PUBLIC_APP_URL, then restart the app.";

const STRIPE_SETUP_CONNECT_NOT_ENABLED_ERROR =
  "Stripe Connect may need to be enabled in your Stripe dashboard before setup can continue.";

function isStripeConnectNotEnabledMessage(message: string): boolean {
  return (
    /connect/i.test(message) &&
    /not enabled|signed up for connect|enable connect|oauth is not enabled/i.test(
      message,
    )
  );
}

/** Maps Stripe/setup failures to safe, user-facing settings copy (no secrets). */
export function mapStripeConnectSetupError(error: unknown): string {
  if (error instanceof Stripe.errors.StripeAuthenticationError) {
    return STRIPE_SETUP_INVALID_KEY_ERROR;
  }

  if (error instanceof Stripe.errors.StripeError) {
    const message = error.message ?? "";

    if (isStripeConnectNotEnabledMessage(message)) {
      return STRIPE_SETUP_CONNECT_NOT_ENABLED_ERROR;
    }
  }

  if (error instanceof Error) {
    const message = error.message;

    if (/STRIPE_SECRET_KEY is not set/i.test(message)) {
      return STRIPE_SETUP_NOT_CONFIGURED_ERROR;
    }

    if (isStripeConnectNotEnabledMessage(message)) {
      return STRIPE_SETUP_CONNECT_NOT_ENABLED_ERROR;
    }
  }

  return STRIPE_SETUP_FALLBACK_ERROR;
}

export type StripeConnectOnboardingUrls = {
  returnUrl: string;
  refreshUrl: string;
};

export function buildStripeConnectOnboardingUrls(): StripeConnectOnboardingUrls | null {
  const baseUrl = getAppBaseUrl();

  if (!baseUrl) {
    return null;
  }

  return {
    returnUrl: `${baseUrl}/settings?payments=return`,
    refreshUrl: `${baseUrl}/settings?payments=refresh`,
  };
}

const STRIPE_CONNECT_CAPABILITIES = {
  card_payments: { requested: true },
  transfers: { requested: true },
} as const;

export async function createStripeExpressConnectedAccount(
  companyId: string,
): Promise<string> {
  const stripe = getStripeClient();

  const account = await stripe.accounts.create({
    type: "express",
    capabilities: STRIPE_CONNECT_CAPABILITIES,
    metadata: {
      altair_company_id: companyId,
    },
  });

  if (!account.id) {
    throw new Error("Stripe did not return a connected account id.");
  }

  return account.id;
}

export async function retrieveStripeConnectedAccount(
  providerAccountId: string,
): Promise<Stripe.Account> {
  const stripe = getStripeClient();

  return stripe.accounts.retrieve(providerAccountId);
}

function stripeCapabilityNeedsRequest(
  status: StripeCapabilityStatus | undefined,
): boolean {
  return status === undefined || status === "unrequested";
}

export function stripeConnectedAccountNeedsCapabilityRequest(
  account: Stripe.Account,
): boolean {
  return (
    stripeCapabilityNeedsRequest(account.capabilities?.card_payments) ||
    stripeCapabilityNeedsRequest(account.capabilities?.transfers)
  );
}

export async function requestStripeConnectedAccountCapabilities(
  providerAccountId: string,
): Promise<Stripe.Account> {
  const stripe = getStripeClient();

  return stripe.accounts.update(providerAccountId, {
    capabilities: STRIPE_CONNECT_CAPABILITIES,
  });
}

export async function createStripeAccountOnboardingLink(
  providerAccountId: string,
  urls: StripeConnectOnboardingUrls,
): Promise<string> {
  const stripe = getStripeClient();

  const accountLink = await stripe.accountLinks.create({
    type: "account_onboarding",
    account: providerAccountId,
    return_url: urls.returnUrl,
    refresh_url: urls.refreshUrl,
  });

  if (!accountLink.url) {
    throw new Error("Stripe did not return an onboarding link URL.");
  }

  return accountLink.url;
}
