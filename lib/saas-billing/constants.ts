import "server-only";

import {
  SAAS_CHECKOUT_PLAN_KEYS,
  SAAS_PLAN_KEYS,
  SAAS_PLAN_LABELS,
  SAAS_SUBSCRIPTION_CATALOG,
  getSaasStripePriceEnvName,
  isSaasBillingInterval,
  isSaasCheckoutPlanKey,
  isSaasPlanKey,
  type SaasCheckoutPlanKey,
} from "@/lib/saas-billing/catalog";
import type {
  SaasBillingInterval,
  SaasPlanKey,
  SaasStripePriceEnvName,
} from "@/lib/saas-billing/types";

export {
  SAAS_CHECKOUT_PLAN_KEYS,
  SAAS_PLAN_KEYS,
  SAAS_PLAN_LABELS,
  isSaasCheckoutPlanKey,
  isSaasPlanKey,
  type SaasCheckoutPlanKey,
};

export const SAAS_CHECKOUT_METADATA_PURPOSE = "saas_subscription";

/** Days after payment failure before grace ends (local policy). */
export const SAAS_GRACE_PERIOD_DAYS = 7;

export const SAAS_BILLING_WEBHOOK_SECRET_ENV = "STRIPE_BILLING_WEBHOOK_SECRET";
export const SAAS_STRIPE_SECRET_KEY_ENV = "STRIPE_SECRET_KEY";

/**
 * Legacy (pre-interval) Stripe Price env vars.
 * Kept for local/env transition; Checkout resolves interval-aware catalog names.
 * Canonical interval-aware names live on `SAAS_SUBSCRIPTION_CATALOG`.
 */
const LEGACY_PRICE_ENV_BY_PLAN: Record<SaasCheckoutPlanKey, string> = {
  starter: "STRIPE_PRICE_STARTER",
  growth: "STRIPE_PRICE_GROWTH",
  pro: "STRIPE_PRICE_PRO",
};

function readEnvPriceId(envName: string): string | null {
  const raw = process.env[envName]?.trim();
  return raw || null;
}

/**
 * Maps a server-trusted plan_key to a legacy (non-interval) Stripe Price ID.
 * Returns null when the price is not configured (or plan is beta).
 *
 * Prefer {@link getStripePriceIdForPlanInterval} — Checkout uses interval-aware names.
 */
export function getStripePriceIdForPlan(planKey: SaasPlanKey): string | null {
  if (planKey === "beta" || !isSaasCheckoutPlanKey(planKey)) {
    return null;
  }

  return readEnvPriceId(LEGACY_PRICE_ENV_BY_PLAN[planKey]);
}

/**
 * Interval-aware Price ID lookup using canonical catalog env names.
 * Used by SaaS subscription Checkout.
 */
export function getStripePriceIdForPlanInterval(
  planKey: SaasPlanKey,
  interval: SaasBillingInterval,
): string | null {
  const envName = getSaasStripePriceEnvName(planKey, interval);
  if (!envName) {
    return null;
  }
  return readEnvPriceId(envName);
}

export function requireStripePriceIdForPlan(planKey: SaasCheckoutPlanKey): string {
  const priceId = getStripePriceIdForPlan(planKey);

  if (!priceId) {
    throw new Error(
      `${LEGACY_PRICE_ENV_BY_PLAN[planKey]} is not configured for plan "${planKey}"`,
    );
  }

  return priceId;
}

export function requireStripePriceIdForPlanInterval(
  planKey: SaasCheckoutPlanKey,
  interval: SaasBillingInterval,
): string {
  if (!isSaasBillingInterval(interval)) {
    throw new Error(`Invalid billing interval "${String(interval)}"`);
  }

  const envName = getSaasStripePriceEnvName(planKey, interval);
  if (!envName) {
    throw new Error(`No Stripe Price env configured for plan "${planKey}"`);
  }

  const priceId = getStripePriceIdForPlanInterval(planKey, interval);
  if (!priceId) {
    throw new Error(`${envName} is not configured for plan "${planKey}" (${interval})`);
  }

  return priceId;
}

/** All canonical Stripe Price env names from the catalog (no secrets). */
export function listSaasStripePriceEnvNames(): SaasStripePriceEnvName[] {
  const names: SaasStripePriceEnvName[] = [];
  for (const plan of Object.values(SAAS_SUBSCRIPTION_CATALOG)) {
    if (!plan.stripePriceEnv) {
      continue;
    }
    names.push(plan.stripePriceEnv.monthly, plan.stripePriceEnv.annual);
  }
  return names;
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

/**
 * True when platform Stripe is configured and at least one checkout-eligible
 * interval Price ID is present. Individual plan/interval selections still fail
 * safely when their specific Price env is missing.
 */
export function isSaasBillingCheckoutConfigured(): boolean {
  if (!getSaasStripeSecretKey()) {
    return false;
  }

  for (const planKey of SAAS_CHECKOUT_PLAN_KEYS) {
    if (
      getStripePriceIdForPlanInterval(planKey, "monthly") ||
      getStripePriceIdForPlanInterval(planKey, "annual")
    ) {
      return true;
    }
  }

  return false;
}
