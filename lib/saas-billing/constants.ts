import "server-only";

import type { SaasPlanKey } from "@/lib/saas-billing/types";

/** Server-trusted SaaS plan keys. Never accept client Price IDs. */
export const SAAS_PLAN_KEYS = [
  "beta",
  "starter",
  "growth",
  "pro",
] as const satisfies readonly SaasPlanKey[];

export const SAAS_PLAN_LABELS: Record<SaasPlanKey, string> = {
  beta: "Beta",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

/** Paid plans available for Checkout in Phase 1. */
export const SAAS_CHECKOUT_PLAN_KEYS = [
  "starter",
  "growth",
  "pro",
] as const satisfies readonly Exclude<SaasPlanKey, "beta">[];

export type SaasCheckoutPlanKey = (typeof SAAS_CHECKOUT_PLAN_KEYS)[number];

const PRICE_ENV_BY_PLAN: Record<SaasCheckoutPlanKey, string> = {
  starter: "STRIPE_PRICE_STARTER",
  growth: "STRIPE_PRICE_GROWTH",
  pro: "STRIPE_PRICE_PRO",
};

export const SAAS_CHECKOUT_METADATA_PURPOSE = "saas_subscription";

/** Days after payment failure before grace ends (local policy). */
export const SAAS_GRACE_PERIOD_DAYS = 7;

export const SAAS_BILLING_WEBHOOK_SECRET_ENV = "STRIPE_BILLING_WEBHOOK_SECRET";
export const SAAS_STRIPE_SECRET_KEY_ENV = "STRIPE_SECRET_KEY";

export function isSaasPlanKey(value: string): value is SaasPlanKey {
  return (SAAS_PLAN_KEYS as readonly string[]).includes(value);
}

export function isSaasCheckoutPlanKey(value: string): value is SaasCheckoutPlanKey {
  return (SAAS_CHECKOUT_PLAN_KEYS as readonly string[]).includes(value);
}

/**
 * Maps a server-trusted plan_key to a Stripe Price ID from environment.
 * Returns null when the price is not configured (or plan is beta).
 */
export function getStripePriceIdForPlan(planKey: SaasPlanKey): string | null {
  if (planKey === "beta") {
    return null;
  }

  const envName = PRICE_ENV_BY_PLAN[planKey];
  const raw = process.env[envName]?.trim();
  return raw || null;
}

export function requireStripePriceIdForPlan(planKey: SaasCheckoutPlanKey): string {
  const priceId = getStripePriceIdForPlan(planKey);

  if (!priceId) {
    throw new Error(
      `${PRICE_ENV_BY_PLAN[planKey]} is not configured for plan "${planKey}"`,
    );
  }

  return priceId;
}

export function getSaasBillingWebhookSecret(): string | null {
  const raw = process.env[SAAS_BILLING_WEBHOOK_SECRET_ENV]?.trim();
  return raw || null;
}

export function requireSaasBillingWebhookSecret(): string {
  const secret = getSaasBillingWebhookSecret();

  if (!secret) {
    throw new Error(`${SAAS_BILLING_WEBHOOK_SECRET_ENV} is not set`);
  }

  return secret;
}

export function getSaasStripeSecretKey(): string | null {
  const raw = process.env[SAAS_STRIPE_SECRET_KEY_ENV]?.trim();
  return raw || null;
}

export function requireSaasStripeSecretKey(): string {
  const secret = getSaasStripeSecretKey();

  if (!secret) {
    throw new Error(`${SAAS_STRIPE_SECRET_KEY_ENV} is not set`);
  }

  return secret;
}

/** True when STRIPE_SECRET_KEY is a live-mode key. */
export function isSaasStripeLivemode(): boolean {
  const key = getSaasStripeSecretKey();
  return key?.startsWith("sk_live_") ?? false;
}

export function isSaasBillingCheckoutConfigured(): boolean {
  return (
    Boolean(getSaasStripeSecretKey()) &&
    Boolean(getStripePriceIdForPlan("starter"))
  );
}
