"use server";

import {
  createBillingPortalSession,
  createSubscriptionCheckout,
} from "@/lib/saas-billing";

export type CreateSubscriptionCheckoutActionResult = {
  error?: string;
  url?: string;
};

/**
 * Starts Altair SaaS subscription Checkout for the active company.
 * Company is resolved server-side — never trust a client company id.
 * Accepts a public plan key and billing interval; rejects beta and invalid pairs.
 */
export async function createSubscriptionCheckoutAction(input: {
  planKey: string;
  billingInterval: string;
}): Promise<CreateSubscriptionCheckoutActionResult> {
  const result = await createSubscriptionCheckout(input);

  if (!result.ok) {
    return { error: result.error };
  }

  return { url: result.url };
}

export type CreateBillingPortalSessionActionResult = {
  error?: string;
  url?: string;
};

/**
 * Opens a Stripe Billing Portal session for the active company.
 * Company and authorization are resolved server-side — no billing identifiers accepted from the client.
 */
export async function createBillingPortalSessionAction(): Promise<CreateBillingPortalSessionActionResult> {
  const result = await createBillingPortalSession();

  if (!result.ok) {
    return { error: result.error };
  }

  return { url: result.url };
}
