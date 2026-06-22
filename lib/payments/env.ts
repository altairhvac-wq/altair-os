import "server-only";

import { getAppBaseUrl } from "@/lib/email/env";

const STRIPE_WEBHOOK_SECRET_ENV = "STRIPE_WEBHOOK_SECRET";
const STRIPE_SECRET_KEY_ENV = "STRIPE_SECRET_KEY";

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

export function getStripeSecretKey(): string | null {
  const raw = process.env[STRIPE_SECRET_KEY_ENV]?.trim();
  return raw || null;
}

export function requireStripeSecretKey(): string {
  const secret = getStripeSecretKey();

  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }

  return secret;
}

/** True when server-side Stripe Connect onboarding can run (secret key + app base URL). */
export function isStripeConnectOnboardingConfigured(): boolean {
  return Boolean(getStripeSecretKey()) && Boolean(getAppBaseUrl());
}
