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

/** True when STRIPE_SECRET_KEY is a Stripe test-mode key (settings UI hint only). */
export function isStripeTestMode(): boolean {
  const key = getStripeSecretKey();
  return key?.startsWith("sk_test_") ?? false;
}

/**
 * True when STRIPE_SECRET_KEY is a live-mode key.
 *
 * The Connect payment webhook compares `event.livemode` against this before
 * recording anything (launch audit M17): a test-mode signing secret pasted
 * into production would otherwise let test-mode payments be recorded as real
 * money against real invoices. Mirrors `isSaasStripeLivemode` on the SaaS side.
 */
export function isStripeLivemode(): boolean {
  const key = getStripeSecretKey();
  return key?.startsWith("sk_live_") ?? false;
}
