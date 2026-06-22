import "server-only";

import { getAppBaseUrl } from "@/lib/email/env";
import { getStripeClient } from "@/lib/payments/stripe-client";

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

export async function createStripeExpressConnectedAccount(
  companyId: string,
): Promise<string> {
  const stripe = getStripeClient();

  const account = await stripe.accounts.create({
    type: "express",
    metadata: {
      altair_company_id: companyId,
    },
  });

  if (!account.id) {
    throw new Error("Stripe did not return a connected account id.");
  }

  return account.id;
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
