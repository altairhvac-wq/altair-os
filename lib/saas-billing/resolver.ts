import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database/types";
import { SAAS_PLAN_LABELS, isSaasPlanKey } from "@/lib/saas-billing/catalog";
import { isSaasStripeLivemode } from "@/lib/saas-billing/constants";
import { evaluateBillingPolicy } from "@/lib/saas-billing/policy";
import {
  isTrialEndingSoon,
  resolveEffectiveSubscriptionStatus,
} from "@/lib/saas-billing/trial-policy";
import type {
  CompanyBillingAccess,
  CompanySubscriptionBillingSummary,
  CompanySubscriptionRow,
  SaasAccessGrant,
  SaasPlanKey,
  SaasSubscriptionStatus,
  SaasTrialWithheldReason,
} from "@/lib/saas-billing/types";
import { createServiceRoleClient } from "@/lib/supabase/service";

function asPlanKey(value: string): SaasPlanKey {
  return isSaasPlanKey(value) ? value : "beta";
}

function asStatus(value: string): SaasSubscriptionStatus {
  return value as SaasSubscriptionStatus;
}

function asAccessGrant(value: string): SaasAccessGrant {
  return value === "beta_comped" ? "beta_comped" : "none";
}

function asTrialWithheldReason(
  value: string | null,
): SaasTrialWithheldReason | null {
  return value === "email_already_trialed" ? value : null;
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
    trial_withheld_reason: asTrialWithheldReason(row.trial_withheld_reason),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Loads the local subscription mirror. Reads Postgres only — never Stripe.
 *
 * Defaults to the service-role client so owners, admins, and technicians see
 * the same entitlement state after application-layer membership authorization.
 * Do not call without verifying the caller belongs to the company.
 */
export async function getCompanySubscription(
  companyId: string,
  supabase?: SupabaseClient<Database>,
): Promise<CompanySubscriptionRow | null> {
  const client = supabase ?? createServiceRoleClient();
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
 * The Stripe subscription id this company's row may be trusted with.
 *
 * A trial row that carries a Stripe subscription id is left to Stripe to end
 * (the webhook moves it to active or canceled). That only holds when the id
 * lives in the same Stripe mode the server runs in: three companies created
 * during test-mode checkouts before launch kept `status = 'trialing'` and a
 * test-mode id forever, because live webhooks never mention a test
 * subscription. Those rows must fall back to the card-free trial rule
 * (ended at `trial_ends_at`) instead of holding full access indefinitely.
 *
 * Unknown (no billing account row, or Stripe not configured) keeps the
 * previous behaviour and trusts the id.
 */
async function resolveTrustedStripeSubscriptionId(
  companyId: string,
  subscription: CompanySubscriptionRow | null,
  client: SupabaseClient<Database>,
): Promise<string | null> {
  const stripeSubscriptionId = subscription?.stripe_subscription_id ?? null;
  if (!stripeSubscriptionId) {
    return null;
  }

  let serverLivemode: boolean;
  try {
    serverLivemode = isSaasStripeLivemode();
  } catch {
    return stripeSubscriptionId;
  }

  const { data, error } = await client
    .from("company_billing_accounts")
    .select("livemode")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[saas-billing] billing account livemode lookup failed:", {
      companyId,
      code: error.code,
    });
    return stripeSubscriptionId;
  }

  if (!data) {
    return stripeSubscriptionId;
  }

  return data.livemode === serverLivemode ? stripeSubscriptionId : null;
}

/**
 * Canonical billing access resolver. Postgres only — never calls Stripe.
 */
export async function resolveCompanyBillingAccess(
  companyId: string,
  supabase?: SupabaseClient<Database>,
): Promise<CompanyBillingAccess> {
  const client = supabase ?? createServiceRoleClient();
  const subscription = await getCompanySubscription(companyId, client);
  const stripeSubscriptionId = await resolveTrustedStripeSubscriptionId(
    companyId,
    subscription,
    client,
  );
  // One clock read for the whole resolution: the policy decision and the
  // derived trial flags below must describe the same instant, and this is the
  // only place any of them is allowed to consult the clock (see
  // `CompanyBillingAccess.trialHasEnded`).
  const nowMs = Date.now();
  // A card-free trial has no Stripe subscription to end it; the effective
  // status is derived from trial_ends_at here, once, and used everywhere
  // below. See lib/saas-billing/trial-policy.ts.
  const effectiveStatus = subscription
    ? resolveEffectiveSubscriptionStatus(
        {
          status: subscription.status,
          trialEndsAt: subscription.trial_ends_at,
          stripeSubscriptionId,
        },
        nowMs,
      )
    : null;
  const decision = evaluateBillingPolicy(
    subscription
      ? {
          status: effectiveStatus,
          accessGrant: subscription.access_grant,
          trialEndsAt: subscription.trial_ends_at,
          graceEndsAt: subscription.grace_period_ends_at,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }
      : null,
    nowMs,
  );

  const trialEndsAt = subscription?.trial_ends_at ?? null;
  const trialEndsMs = trialEndsAt ? Date.parse(trialEndsAt) : Number.NaN;

  return {
    state: decision.state,
    canUseOperationalFeatures: decision.canUseOperationalFeatures,
    canMutateOperationalData: decision.canMutateOperationalData,
    canManageBilling: decision.canManageBilling,
    warnings: decision.warnings,
    trialEndsAt,
    graceEndsAt: subscription?.grace_period_ends_at ?? null,
    trialHasEnded: Number.isFinite(trialEndsMs) && trialEndsMs <= nowMs,
    trialEndingSoon: subscription
      ? isTrialEndingSoon(
          {
            status: subscription.status,
            trialEndsAt: subscription.trial_ends_at,
            stripeSubscriptionId,
          },
          nowMs,
        )
      : false,
    hasStripeSubscription: Boolean(stripeSubscriptionId),
    isComped: decision.isComped,
    planKey: subscription?.plan_key ?? "beta",
    status: effectiveStatus,
  };
}

/**
 * Settings-facing summary built from the local subscription + policy.
 */
export async function getCompanySubscriptionBillingSummary(
  companyId: string,
  supabase?: SupabaseClient<Database>,
): Promise<CompanySubscriptionBillingSummary> {
  const client = supabase ?? createServiceRoleClient();
  const subscription = await getCompanySubscription(companyId, client);
  const stripeSubscriptionId = await resolveTrustedStripeSubscriptionId(
    companyId,
    subscription,
    client,
  );
  const nowMs = Date.now();
  const effectiveStatus = subscription
    ? resolveEffectiveSubscriptionStatus(
        {
          status: subscription.status,
          trialEndsAt: subscription.trial_ends_at,
          stripeSubscriptionId,
        },
        nowMs,
      )
    : null;
  const decision = evaluateBillingPolicy(
    subscription
      ? {
          status: effectiveStatus,
          accessGrant: subscription.access_grant,
          trialEndsAt: subscription.trial_ends_at,
          graceEndsAt: subscription.grace_period_ends_at,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        }
      : null,
    nowMs,
  );
  const planKey = subscription?.plan_key ?? "beta";

  return {
    planKey,
    planLabel: SAAS_PLAN_LABELS[planKey],
    status: effectiveStatus,
    state: decision.state,
    isComped: decision.isComped,
    trialEndsAt: subscription?.trial_ends_at ?? null,
    graceEndsAt: subscription?.grace_period_ends_at ?? null,
    cancelAtPeriodEnd: subscription?.cancel_at_period_end ?? false,
    currentPeriodEndsAt: subscription?.current_period_ends_at ?? null,
    warnings: decision.warnings,
    hasStripeSubscription: Boolean(stripeSubscriptionId),
    trialWithheld: subscription?.trial_withheld_reason != null,
  };
}
