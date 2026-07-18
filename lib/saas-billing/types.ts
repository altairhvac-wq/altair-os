import type { Json, Timestamp, UUID } from "@/lib/database/types/enums";

export type SaasPlanKey = "beta" | "starter" | "growth" | "pro";

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
