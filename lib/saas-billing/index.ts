export {
  SAAS_CHECKOUT_METADATA_PURPOSE,
  SAAS_CHECKOUT_PLAN_KEYS,
  SAAS_GRACE_PERIOD_DAYS,
  SAAS_PLAN_KEYS,
  SAAS_PLAN_LABELS,
  getSaasBillingWebhookSecret,
  getStripePriceIdForPlan,
  isSaasBillingCheckoutConfigured,
  isSaasCheckoutPlanKey,
  isSaasPlanKey,
  isSaasStripeLivemode,
  requireStripePriceIdForPlan,
  type SaasCheckoutPlanKey,
} from "@/lib/saas-billing/constants";

export { createSubscriptionCheckout } from "@/lib/saas-billing/checkout";
export type { CreateSubscriptionCheckoutResult } from "@/lib/saas-billing/checkout";

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
  getCompanySubscription,
  getCompanySubscriptionBillingSummary,
  resolveCompanyBillingAccess,
} from "@/lib/saas-billing/resolver";

export { getRequestCompanyBillingAccess } from "@/lib/saas-billing/request-access";

export {
  claimStaleProcessingSubscriptionEvent,
  claimSubscriptionEventForProcessing,
  claimSubscriptionEventForReprocessing,
  findSubscriptionEvent,
  insertSubscriptionEventLedger,
  isStaleSubscriptionEventProcessing,
  processBillingWebhookEvent,
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
  SaasPlanKey,
  SaasSubscriptionStatus,
  SubscriptionEventLedgerInsert,
  SubscriptionEventLedgerRow,
  SubscriptionEventProcessingStatus,
} from "@/lib/saas-billing/types";
