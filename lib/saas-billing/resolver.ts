import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { createClient } from "@/lib/supabase/server";
import { SAAS_PLAN_LABELS } from "@/lib/saas-billing/constants";
import { evaluateBillingPolicy } from "@/lib/saas-billing/policy";
import type {
  CompanyBillingAccess,
  CompanySubscriptionBillingSummary,
  CompanySubscriptionRow,
  SaasAccessGrant,
  SaasPlanKey,
  SaasSubscriptionStatus,
} from "@/lib/saas-billing/types";
import { isSaasPlanKey } from "@/lib/saas-billing/constants";

function asPlanKey(value: string): SaasPlanKey {
  return isSaasPlanKey(value) ? value : "beta";
}

function asStatus(value: string): SaasSubscriptionStatus {
  return value as SaasSubscriptionStatus;
}

function asAccessGrant(value: string): SaasAccessGrant {
  return value === "beta_comped" ? "beta_comped" : "none";
}

function mapSubscriptionRow(
  row: Database["public"]["Tables"]["company_subscriptions"]["Row"],
): CompanySubscriptionRow {
  return {
    id: row.id,
    company_id: row.company_id,
    billing_account_id: row.billing_account_id,
    plan_key: asPlanKey(row.plan_key),
    stripe_subscription_id: row.stripe_subscription_id,
    status: asStatus(row.status),
    trial_starts_at: row.trial_starts_at,
    trial_ends_at: row.trial_ends_at,
    current_period_starts_at: row.current_period_starts_at,
    current_period_ends_at: row.current_period_ends_at,
    cancel_at_period_end: row.cancel_at_period_end,
    canceled_at: row.canceled_at,
    access_grant: asAccessGrant(row.access_grant),
    grace_period_ends_at: row.grace_period_ends_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Loads the local subscription mirror. Reads Postgres only — never Stripe.
 */
export async function getCompanySubscription(
  companyId: string,
  supabase?: SupabaseClient<Database>,
): Promise<CompanySubscriptionRow | null> {
  const client = supabase ?? (await createClient());
  const { data, error } = await client
    .from("company_subscriptions")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[saas-billing] getCompanySubscription failed:", {
      companyId,
      code: error.code,
    });
    throw new Error("Failed to load company subscription.");
  }

  return data ? mapSubscriptionRow(data) : null;
}

/**
 * Canonical billing access resolver. Postgres only — never calls Stripe.
 */
export async function resolveCompanyBillingAccess(
  companyId: string,
  supabase?: SupabaseClient<Database>,
): Promise<CompanyBillingAccess> {
  const subscription = await getCompanySubscription(companyId, supabase);
  const decision = evaluateBillingPolicy(
    subscription
      ? {
          status: subscription.status,
          accessGrant: subscription.access_grant,
          trialEndsAt: subscription.trial_ends_at,
          graceEndsAt: subscription.grace_period_ends_at,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }
      : null,
  );

  return {
    state: decision.state,
    canUseOperationalFeatures: decision.canUseOperationalFeatures,
    canMutateOperationalData: decision.canMutateOperationalData,
    canManageBilling: decision.canManageBilling,
    warnings: decision.warnings,
    trialEndsAt: subscription?.trial_ends_at ?? null,
    graceEndsAt: subscription?.grace_period_ends_at ?? null,
    isComped: decision.isComped,
    planKey: subscription?.plan_key ?? "beta",
    status: subscription?.status ?? null,
  };
}

/**
 * Settings-facing summary built from the local subscription + policy.
 */
export async function getCompanySubscriptionBillingSummary(
  companyId: string,
  supabase?: SupabaseClient<Database>,
): Promise<CompanySubscriptionBillingSummary> {
  const subscription = await getCompanySubscription(companyId, supabase);
  const decision = evaluateBillingPolicy(
    subscription
      ? {
          status: subscription.status,
          accessGrant: subscription.access_grant,
          trialEndsAt: subscription.trial_ends_at,
          graceEndsAt: subscription.grace_period_ends_at,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }
      : null,
  );
  const planKey = subscription?.plan_key ?? "beta";

  return {
    planKey,
    planLabel: SAAS_PLAN_LABELS[planKey],
    status: subscription?.status ?? null,
    state: decision.state,
    isComped: decision.isComped,
    trialEndsAt: subscription?.trial_ends_at ?? null,
    graceEndsAt: subscription?.grace_period_ends_at ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    currentPeriodEndsAt: subscription?.current_period_ends_at ?? null,
    warnings: decision.warnings,
    hasStripeSubscription: Boolean(subscription?.stripe_subscription_id),
  };
}
