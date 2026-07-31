export {
  SAAS_BILLING_INTERVALS,
  SAAS_CHECKOUT_PLAN_KEYS,
  SAAS_PLAN_KEYS,
  SAAS_PLAN_LABELS,
  SAAS_SUBSCRIPTION_CATALOG,
  SAAS_TRIAL_CONFIG,
  getSaasCatalogPlan,
  getSaasPlanListPriceUsd,
  getSaasStripePriceEnvName,
  isSaasBillingInterval,
  isSaasCheckoutPlanKey,
  isSaasPlanKey,
  listCheckoutEligibleSaasCatalogPlans,
  listPublicSaasCatalogPlans,
  type SaasCheckoutPlanKey,
} from "@/lib/saas-billing/catalog";

export {
  SAAS_CHECKOUT_METADATA_PURPOSE,
  SAAS_GRACE_PERIOD_DAYS,
  getSaasBillingWebhookSecret,
  getStripePriceIdForPlan,
  getStripePriceIdForPlanInterval,
  isSaasBillingCheckoutConfigured,
  isSaasStripeLivemode,
  listSaasStripePriceEnvNames,
  requireStripePriceIdForPlan,
  requireStripePriceIdForPlanInterval,
} from "@/lib/saas-billing/constants";

export { createSubscriptionCheckout } from "@/lib/saas-billing/checkout";
export type {
  CreateSubscriptionCheckoutInput,
  CreateSubscriptionCheckoutResult,
} from "@/lib/saas-billing/checkout";

export { createBillingPortalSession } from "@/lib/saas-billing/portal";
export type { CreateBillingPortalSessionResult } from "@/lib/saas-billing/portal";

export {
  findBillingAccountByCompanyId,
  getOrCreateBillingCustomer,
  getPlatformStripeClient,
} from "@/lib/saas-billing/customer";

export { evaluateBillingPolicy } from "@/lib/saas-billing/policy";
export type {
  BillingPolicyDecision,
  NormalizedSubscriptionForPolicy,
} from "@/lib/saas-billing/policy";

export {
  SUBSCRIPTION_ACTIVATION_PATH,
  assertCheckoutSessionOwnedByCompany,
  companyHasFullApplicationAccess,
} from "@/lib/saas-billing/app-access-policy";
export type {
  CheckoutSessionOwnershipInput,
  CheckoutSessionOwnershipResult,
  FullApplicationAccessInput,
} from "@/lib/saas-billing/app-access-policy";

export { requireCompanyBillingAppAccess } from "@/lib/saas-billing/require-app-access";

export {
  getCompanySubscription,
  getCompanySubscriptionBillingSummary,
  resolveCompanyBillingAccess,
} from "@/lib/saas-billing/resolver";

export { getRequestCompanyBillingAccess } from "@/lib/saas-billing/request-access";

export { reconcileCheckoutSessionForCompany } from "@/lib/saas-billing/reconcile-checkout";
export type { ReconcileCheckoutSessionResult } from "@/lib/saas-billing/reconcile-checkout";

export {
  claimStaleProcessingSubscriptionEvent,
  claimSubscriptionEventForProcessing,
  claimSubscriptionEventForReprocessing,
  findSubscriptionEvent,
  insertSubscriptionEventLedger,
  isStaleSubscriptionEventProcessing,
  processBillingWebhookEvent,
  upsertCompanySubscriptionFromStripe,
  STALE_SUBSCRIPTION_EVENT_PROCESSING_MS,
  stripeEventPayload,
  verifyBillingWebhookEvent,
  SaasBillingWebhookVerificationError,
} from "@/lib/saas-billing/webhook";
export type { ProcessBillingWebhookResult } from "@/lib/saas-billing/webhook";

export type {
  CompanyBillingAccess,
  CompanyBillingAccountInsert,
  CompanyBillingAccountRow,
  CompanySubscriptionBillingSummary,
  CompanySubscriptionInsert,
  CompanySubscriptionRow,
  SaasAccessGrant,
  SaasBillingAccessState,
  SaasBillingInterval,
  SaasCatalogPlan,
  SaasPlanKey,
  SaasPublicPlanKey,
  SaasStripePriceEnvName,
  SaasSubscriptionStatus,
  SaasTrialConfig,
  SubscriptionEventLedgerInsert,
  SubscriptionEventLedgerRow,
  SubscriptionEventProcessingStatus,
} from "@/lib/saas-billing/types";
