"use server";

import { createSubscriptionCheckout } from "@/lib/saas-billing";

export type CreateSubscriptionCheckoutActionResult = {
  error?: string;
  url?: string;
};

/**
 * Starts Altair SaaS subscription Checkout for the active company.
 * Company is resolved server-side — never trust a client company id.
 */
export async function createSubscriptionCheckoutAction(
  planKey: string,
): Promise<CreateSubscriptionCheckoutActionResult> {
  const result = await createSubscriptionCheckout(planKey);

  if (!result.ok) {
    return { error: result.error };
  }

  return { url: result.url };
}
