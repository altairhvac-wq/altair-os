import "server-only";

const STRIPE_WEBHOOK_SECRET_ENV = "STRIPE_WEBHOOK_SECRET";

export function getStripeWebhookSecret(): string | null {
  const raw = process.env[STRIPE_WEBHOOK_SECRET_ENV]?.trim();
  return raw || null;
}

export function requireStripeWebhookSecret(): string {
  const secret = getStripeWebhookSecret();

  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }

  return secret;
}
