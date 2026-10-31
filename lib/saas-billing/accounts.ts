import "server-only";

import type Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { getPlatformStripeClient } from "@/lib/saas-billing/customer";
import { getPlanAccountAllowance, SAAS_TRIAL_ACCOUNT_ALLOWANCE } from "@/lib/saas-billing/catalog";
import {
  getStripeAdditionalAccountPriceId,
  isAdditionalAccountBillingConfigured,
} from "@/lib/saas-billing/constants";
import { getCompanySubscription } from "@/lib/saas-billing/resolver";
import type { SaasBillingInterval } from "@/lib/saas-billing/types";

/**
 * ============ ACCOUNTS PER PLAN, ENFORCED ============
 * The pricing page says Starter has 1 account, Growth up to 5, Pro 10 and
 * $15/month for each additional account. This module is what makes that
 * true: the invite and reactivate actions ask `assertCompanyCanAddAccount`
 * before adding anyone, and every change in the roster calls
 * `syncAdditionalAccountBilling`, which keeps the Pro subscription's
 * additional-account item at the right quantity in Stripe.
 *
 * Counting: active members and pending invitations both hold an account.
 * Suspended members do not. The owner is an account.
 *
 * A company without a paid plan (trial, beta, complimentary) gets the Pro
 * allowance and never bills: a trial can test the whole team.
 */

export type CompanyAccountAllowance = {
  planKey: string;
  usedAccounts: number;
  includedAccounts: number;
  additionalAccountPriceUsd: number | null;
  /** True once the Stripe prices for additional accounts exist. */
  additionalAccountsSellable: boolean;
  /** The subscription is on a paid plan (the cap applies and extras bill). */
  onPaidPlan: boolean;
};

export async function countCompanyAccounts(companyId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("company_memberships")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", ["active", "invited"]);

  if (error) {
    console.error("[saas-billing] account count failed", { companyId, code: error.code });
    // Fail open on a read error: an outage must not lock a team out of
    // inviting; the next sync corrects the quantity.
    return 0;
  }
  return count ?? 0;
}

export async function resolveCompanyAccountAllowance(
  companyId: string,
): Promise<CompanyAccountAllowance> {
  const [subscription, usedAccounts] = await Promise.all([
    getCompanySubscription(companyId),
    countCompanyAccounts(companyId),
  ]);

  const paidStatuses = new Set(["active", "past_due"]);
  const onPaidPlan = Boolean(
    subscription &&
      subscription.plan_key !== "beta" &&
      subscription.access_grant !== "beta_comped" &&
      paidStatuses.has(subscription.status),
  );

  if (!subscription || !onPaidPlan) {
    return {
      planKey: subscription?.plan_key ?? "beta",
      usedAccounts,
      includedAccounts: SAAS_TRIAL_ACCOUNT_ALLOWANCE,
      additionalAccountPriceUsd: null,
      additionalAccountsSellable: false,
      onPaidPlan: false,
    };
  }

  const allowance = getPlanAccountAllowance(subscription.plan_key);
  return {
    planKey: subscription.plan_key,
    usedAccounts,
    includedAccounts: allowance.includedAccounts,
    additionalAccountPriceUsd: allowance.additionalAccountPriceUsd,
    additionalAccountsSellable:
      allowance.additionalAccountPriceUsd !== null && isAdditionalAccountBillingConfigured(),
    onPaidPlan: true,
  };
}

export type AddAccountDecision = { ok: true } | { ok: false; message: string };

/** Whether one more account (an invite, or a reactivation) may be added now. */
export async function assertCompanyCanAddAccount(companyId: string): Promise<AddAccountDecision> {
  const allowance = await resolveCompanyAccountAllowance(companyId);

  if (allowance.usedAccounts < allowance.includedAccounts) return { ok: true };

  if (allowance.additionalAccountPriceUsd !== null) {
    if (allowance.additionalAccountsSellable) return { ok: true };
    return {
      ok: false,
      message: `Your plan includes ${allowance.includedAccounts} accounts, and additional accounts at $${allowance.additionalAccountPriceUsd}/month are not switched on yet. Email us and we will add them to your subscription.`,
    };
  }

  const label = allowance.includedAccounts === 1 ? "1 account" : `${allowance.includedAccounts} accounts`;
  return {
    ok: false,
    message: allowance.onPaidPlan
      ? `Your plan includes ${label}. Cancel a pending invitation or suspend a member to free one, or move to a larger plan in Settings > Billing.`
      : `The trial includes ${label}. Cancel a pending invitation or suspend a member to free one.`,
  };
}

function intervalOfSubscription(subscription: Stripe.Subscription): SaasBillingInterval | null {
  const base = subscription.items.data.find((item) => item.price.recurring);
  const interval = base?.price.recurring?.interval;
  if (interval === "month") return "monthly";
  if (interval === "year") return "annual";
  return null;
}

/**
 * Keeps the Stripe subscription's additional-account item equal to the
 * accounts beyond the plan's included count. Never throws: billing drift is
 * logged and corrected on the next roster change, while the invite itself
 * has already succeeded.
 */
export async function syncAdditionalAccountBilling(companyId: string): Promise<void> {
  try {
    const allowance = await resolveCompanyAccountAllowance(companyId);
    if (!allowance.onPaidPlan || allowance.additionalAccountPriceUsd === null) return;
    if (!allowance.additionalAccountsSellable) return;

    const subscription = await getCompanySubscription(companyId);
    if (!subscription?.stripe_subscription_id) return;

    const stripe = getPlatformStripeClient();
    const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
    const interval = intervalOfSubscription(stripeSubscription);
    if (!interval) return;
    const priceId = getStripeAdditionalAccountPriceId(interval);
    if (!priceId) return;

    const extra = Math.max(0, allowance.usedAccounts - allowance.includedAccounts);
    const item = stripeSubscription.items.data.find((entry) => entry.price.id === priceId);

    if (!item && extra > 0) {
      await stripe.subscriptionItems.create({
        subscription: stripeSubscription.id,
        price: priceId,
        quantity: extra,
        proration_behavior: "create_prorations",
      });
    } else if (item && extra === 0) {
      await stripe.subscriptionItems.del(item.id, { proration_behavior: "create_prorations" });
    } else if (item && item.quantity !== extra) {
      await stripe.subscriptionItems.update(item.id, {
        quantity: extra,
        proration_behavior: "create_prorations",
      });
    }
  } catch (error) {
    console.error("[saas-billing] additional-account sync failed", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
