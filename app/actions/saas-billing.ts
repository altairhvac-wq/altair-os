"use server";

import {
  createSubscriptionCheckout,
  type CreateSubscriptionCheckoutInput,
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

export type { CreateSubscriptionCheckoutInput };
