/**
 * Client-safe SaaS catalog labels and checkout plan helpers.
 * Re-exports from the canonical catalog (no server env / Stripe secrets).
 */
export {
  SAAS_BILLING_INTERVALS,
  SAAS_CHECKOUT_PLAN_KEYS,
  SAAS_PLAN_LABELS,
  SAAS_SUBSCRIPTION_CATALOG,
  SAAS_TRIAL_CONFIG,
  getSaasPlanListPriceUsd,
  isSaasBillingInterval,
  isSaasCheckoutPlanKey,
  type SaasCheckoutPlanKey,
} from "@/lib/saas-billing/catalog";
