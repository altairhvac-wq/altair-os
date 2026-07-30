/**
 * Canonical Altair SaaS subscription catalog.
 *
 * Single source of truth for plan keys, labels, list prices, intervals,
 * trial policy, checkout eligibility, public visibility, and Stripe Price
 * environment-variable names.
 *
 * Does not contain secrets or read process.env. Stripe Price ID resolution
 * stays in constants.ts. Checkout uses interval-aware Price env names from here.
 *
 * Entitlements / feature gates are intentionally omitted until approved.
 * Stripe Connect customer invoice payments are out of scope.
 */

import type {
  SaasBillingInterval,
  SaasCatalogPlan,
  SaasPlanKey,
  SaasPublicPlanKey,
  SaasStripePriceEnvName,
  SaasTrialConfig,
} from "@/lib/saas-billing/types";

export const SAAS_BILLING_INTERVALS = [
  "monthly",
  "annual",
] as const satisfies readonly SaasBillingInterval[];

/** Launch trial: card required; converts to paid unless canceled. */
export const SAAS_TRIAL_CONFIG = {
  durationDays: 14,
  requiresPaymentMethod: true,
  convertsToPaidUnlessCanceled: true,
} as const satisfies SaasTrialConfig;

/**
 * Database-compatible plan key order (includes internal `beta`).
 * Prefer catalog helpers for public/checkout subsets.
 */
export const SAAS_PLAN_KEYS = [
  "beta",
  "starter",
  "growth",
  "pro",
] as const satisfies readonly SaasPlanKey[];

function paidPlan(input: {
  planKey: SaasPublicPlanKey;
  label: string;
  displayOrder: number;
  monthlyPriceUsd: number;
  annualPriceUsd: number;
  stripePriceEnv: {
    monthly: SaasStripePriceEnvName;
    annual: SaasStripePriceEnvName;
  };
}): SaasCatalogPlan {
  const annualIfMonthly = input.monthlyPriceUsd * 12;
  const annualSavingsUsd = annualIfMonthly - input.annualPriceUsd;
  const annualSavingsMonths =
    input.monthlyPriceUsd > 0
      ? annualSavingsUsd / input.monthlyPriceUsd
      : null;

  return {
    planKey: input.planKey,
    label: input.label,
    displayOrder: input.displayOrder,
    isPublic: true,
    checkoutEligible: true,
    monthlyPriceUsd: input.monthlyPriceUsd,
    annualPriceUsd: input.annualPriceUsd,
    annualSavingsUsd,
    annualSavingsMonths,
    stripePriceEnv: input.stripePriceEnv,
  };
}

/**
 * Authoritative launch catalog.
 *
 * - `beta`: internal / complimentary (`beta_comped`) — not sold, not public.
 * - Public paid plans: Starter / Growth / Pro with monthly + annual USD prices.
 */
export const SAAS_SUBSCRIPTION_CATALOG = {
  beta: {
    planKey: "beta",
    label: "Beta",
    displayOrder: 0,
    isPublic: false,
    checkoutEligible: false,
    monthlyPriceUsd: null,
    annualPriceUsd: null,
    annualSavingsUsd: null,
    annualSavingsMonths: null,
    stripePriceEnv: null,
  },
  starter: paidPlan({
    planKey: "starter",
    label: "Starter",
    displayOrder: 1,
    monthlyPriceUsd: 39,
    annualPriceUsd: 390,
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_STARTER_MONTHLY",
      annual: "STRIPE_PRICE_STARTER_ANNUAL",
    },
  }),
  growth: paidPlan({
    planKey: "growth",
    label: "Growth",
    displayOrder: 2,
    monthlyPriceUsd: 79,
    annualPriceUsd: 790,
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_GROWTH_MONTHLY",
      annual: "STRIPE_PRICE_GROWTH_ANNUAL",
    },
  }),
  pro: paidPlan({
    planKey: "pro",
    label: "Pro",
    displayOrder: 3,
    monthlyPriceUsd: 149,
    annualPriceUsd: 1490,
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_PRO_MONTHLY",
      annual: "STRIPE_PRICE_PRO_ANNUAL",
    },
  }),
} as const satisfies Record<SaasPlanKey, SaasCatalogPlan>;

/** Display labels derived from the catalog (client-safe). */
export const SAAS_PLAN_LABELS: Record<SaasPlanKey, string> = {
  beta: SAAS_SUBSCRIPTION_CATALOG.beta.label,
  starter: SAAS_SUBSCRIPTION_CATALOG.starter.label,
  growth: SAAS_SUBSCRIPTION_CATALOG.growth.label,
  pro: SAAS_SUBSCRIPTION_CATALOG.pro.label,
};

/**
 * Paid plans eligible for Checkout (excludes internal `beta`).
 * Order matches catalog `displayOrder`.
 */
export const SAAS_CHECKOUT_PLAN_KEYS = [
  "starter",
  "growth",
  "pro",
] as const satisfies readonly SaasPublicPlanKey[];

export type SaasCheckoutPlanKey = (typeof SAAS_CHECKOUT_PLAN_KEYS)[number];

export function isSaasPlanKey(value: string): value is SaasPlanKey {
  return (SAAS_PLAN_KEYS as readonly string[]).includes(value);
}

export function isSaasCheckoutPlanKey(value: string): value is SaasCheckoutPlanKey {
  return (SAAS_CHECKOUT_PLAN_KEYS as readonly string[]).includes(value);
}

export function isSaasBillingInterval(
  value: string,
): value is SaasBillingInterval {
  return (SAAS_BILLING_INTERVALS as readonly string[]).includes(value);
}

export function getSaasCatalogPlan(planKey: SaasPlanKey): SaasCatalogPlan {
  return SAAS_SUBSCRIPTION_CATALOG[planKey];
}

/** Public plans in display order (marketing / pricing). */
export function listPublicSaasCatalogPlans(): SaasCatalogPlan[] {
  return Object.values(SAAS_SUBSCRIPTION_CATALOG)
    .filter((plan) => plan.isPublic)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Checkout-eligible plans in display order. */
export function listCheckoutEligibleSaasCatalogPlans(): SaasCatalogPlan[] {
  return Object.values(SAAS_SUBSCRIPTION_CATALOG)
    .filter((plan) => plan.checkoutEligible)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Canonical Stripe Price env var name for a plan + interval.
 * Returns null for non-sold plans (e.g. `beta`).
 */
export function getSaasStripePriceEnvName(
  planKey: SaasPlanKey,
  interval: SaasBillingInterval,
): SaasStripePriceEnvName | null {
  const plan = SAAS_SUBSCRIPTION_CATALOG[planKey];
  if (!plan.stripePriceEnv) {
    return null;
  }
  return plan.stripePriceEnv[interval];
}

export function getSaasPlanListPriceUsd(
  planKey: SaasPlanKey,
  interval: SaasBillingInterval,
): number | null {
  const plan = SAAS_SUBSCRIPTION_CATALOG[planKey];
  return interval === "monthly" ? plan.monthlyPriceUsd : plan.annualPriceUsd;
}
