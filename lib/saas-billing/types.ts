import type { Json, Timestamp, UUID } from "@/lib/database/types/enums";

export type SaasPlanKey = "beta" | "starter" | "growth" | "pro";

/** Public paid plans offered at launch (excludes internal `beta`). */
export type SaasPublicPlanKey = Exclude<SaasPlanKey, "beta">;

/** Supported SaaS billing intervals. */
export type SaasBillingInterval = "monthly" | "annual";

/**
 * Canonical Stripe Price environment-variable names.
 * Interval-aware; preferred over legacy `STRIPE_PRICE_*` (no interval) keys.
 */
export type SaasStripePriceEnvName =
  | "STRIPE_PRICE_STARTER_MONTHLY"
  | "STRIPE_PRICE_STARTER_ANNUAL"
  | "STRIPE_PRICE_GROWTH_MONTHLY"
  | "STRIPE_PRICE_GROWTH_ANNUAL"
  | "STRIPE_PRICE_PRO_MONTHLY"
  | "STRIPE_PRICE_PRO_ANNUAL";

/** Trial policy for new public Checkout subscriptions (not applied to beta_comped). */
export type SaasTrialConfig = {
  durationDays: number;
  requiresPaymentMethod: boolean;
  convertsToPaidUnlessCanceled: boolean;
};

/**
 * One plan in the canonical SaaS subscription catalog.
 * Entitlements / feature gates are intentionally absent until approved.
 */
export type SaasCatalogPlan = {
  planKey: SaasPlanKey;
  label: string;
  /** Lower sorts first in public/settings plan lists. */
  displayOrder: number;
  /** Shown on public marketing / pricing surfaces. */
  isPublic: boolean;
  /** Eligible for SaaS subscription Checkout (paid plans only). */
  checkoutEligible: boolean;
  /** Whole-dollar USD list price for monthly billing; null when not sold. */
  monthlyPriceUsd: number | null;
  /** Whole-dollar USD list price for annual billing; null when not sold. */
  annualPriceUsd: number | null;
  /** Dollars saved vs paying monthly for 12 months; null when not sold. */
  annualSavingsUsd: number | null;
  /** Equivalent free months when paying annually (e.g. 2). */
  annualSavingsMonths: number | null;
  stripePriceEnv: {
    monthly: SaasStripePriceEnvName;
    annual: SaasStripePriceEnvName;
  } | null;
};

export type SaasSubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type SaasAccessGrant = "none" | "beta_comped";

export type SaasBillingAccessState =
  | "ACTIVE"
  | "TRIAL"
  | "GRACE"
  | "LIMITED"
  | "READ_ONLY"
  | "BLOCKED";

export type SubscriptionEventProcessingStatus =
  | "received"
  | "processing"
  | "processed"
  | "failed"
  | "ignored";

export type CompanyBillingAccountRow = {
  id: UUID;
  company_id: UUID;
  stripe_customer_id: string | null;
  livemode: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CompanyBillingAccountInsert = {
  id?: UUID;
  company_id: UUID;
  stripe_customer_id?: string | null;
  livemode?: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type CompanySubscriptionRow = {
  id: UUID;
  company_id: UUID;
  billing_account_id: UUID | null;
  plan_key: SaasPlanKey;
  stripe_subscription_id: string | null;
  status: SaasSubscriptionStatus;
  trial_starts_at: Timestamp | null;
  trial_ends_at: Timestamp | null;
  current_period_starts_at: Timestamp | null;
  current_period_ends_at: Timestamp | null;
  cancel_at_period_end: boolean;
  canceled_at: Timestamp | null;
  access_grant: SaasAccessGrant;
  grace_period_ends_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type CompanySubscriptionInsert = {
  id?: UUID;
  company_id: UUID;
  billing_account_id?: UUID | null;
  plan_key?: SaasPlanKey;
  stripe_subscription_id?: string | null;
  status?: SaasSubscriptionStatus;
  trial_starts_at?: Timestamp | null;
  trial_ends_at?: Timestamp | null;
  current_period_starts_at?: Timestamp | null;
  current_period_ends_at?: Timestamp | null;
  cancel_at_period_end?: boolean;
  canceled_at?: Timestamp | null;
  access_grant?: SaasAccessGrant;
  grace_period_ends_at?: Timestamp | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type SubscriptionEventLedgerRow = {
  id: UUID;
  company_id: UUID | null;
  provider: "stripe";
  provider_event_id: string;
  event_type: string;
  processing_status: SubscriptionEventProcessingStatus;
  payload: Json;
  processed_at: Timestamp | null;
  error_message: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type SubscriptionEventLedgerInsert = {
  id?: UUID;
  company_id?: UUID | null;
  provider?: "stripe";
  provider_event_id: string;
  event_type: string;
  processing_status?: SubscriptionEventProcessingStatus;
  payload?: Json;
  processed_at?: Timestamp | null;
  error_message?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

export type CompanyBillingAccess = {
  state: SaasBillingAccessState;
  canUseOperationalFeatures: boolean;
  canMutateOperationalData: boolean;
  canManageBilling: boolean;
  warnings: string[];
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  /**
   * Whether `trialEndsAt` is already in the past, decided ONCE on the server
   * against the same instant the policy decision used.
   *
   * `state` alone cannot answer this: it only moves when billing is
   * re-evaluated, so a company can sit in `TRIAL` for days after its trial
   * end date. Consumers must not recompute this from the clock — this object
   * is serialized into client components, and a `Date.now()` read there
   * produces different text on the server and on the client, which is a
   * hydration mismatch.
   */
  trialHasEnded: boolean;
  isComped: boolean;
  planKey: SaasPlanKey;
  status: SaasSubscriptionStatus | null;
};

export type CompanySubscriptionBillingSummary = {
  planKey: SaasPlanKey;
  planLabel: string;
  status: SaasSubscriptionStatus | null;
  state: SaasBillingAccessState;
  isComped: boolean;
  trialEndsAt: string | null;
  graceEndsAt: string | null;
  cancelAtPeriodEnd: boolean;
  currentPeriodEndsAt: string | null;
  warnings: string[];
  hasStripeSubscription: boolean;
};
