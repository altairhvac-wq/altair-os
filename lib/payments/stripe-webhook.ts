import "server-only";

import Stripe from "stripe";

export class StripeWebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeWebhookVerificationError";
  }
}

/**
 * Verifies a Stripe webhook signature using the endpoint secret only.
 * Uses Stripe.webhooks.constructEvent (static) — no STRIPE_SECRET_KEY required.
 */
export function verifyStripeWebhookEvent(
  rawBody: string,
  signature: string | null,
  webhookSecret: string,
): Stripe.Event {
  if (!signature) {
    throw new StripeWebhookVerificationError("Missing stripe-signature header");
  }

  try {
    return Stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    throw new StripeWebhookVerificationError("Invalid webhook signature");
  }
}
