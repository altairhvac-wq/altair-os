import "server-only";

import type Stripe from "stripe";
import { getAppBaseUrl } from "@/lib/email/env";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  isSaasBillingInterval,
  isSaasCheckoutPlanKey,
  SAAS_TRIAL_CONFIG,
  type SaasCheckoutPlanKey,
} from "@/lib/saas-billing/catalog";
import {
  isSaasBillingCheckoutConfigured,
  requireStripePriceIdForPlanInterval,
  SAAS_CHECKOUT_METADATA_PURPOSE,
} from "@/lib/saas-billing/constants";
import { getOrCreateBillingCustomer, getPlatformStripeClient } from "@/lib/saas-billing/customer";
import { getCompanySubscription } from "@/lib/saas-billing/resolver";
import {
  emailHasPriorStripeSubscription,
  normalizeTrialEmail,
  resolveCheckoutTrialParams,
  type StripeCustomerSubscriptionHistory,
} from "@/lib/saas-billing/trial-policy";
import type {
  SaasBillingInterval,
  SaasPublicPlanKey,
  SaasSubscriptionStatus,
} from "@/lib/saas-billing/types";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Local statuses that mean Checkout must not create another Stripe subscription.
 * incomplete is omitted so an abandoned Checkout can be retried.
 */
const BLOCKED_CHECKOUT_STATUSES = new Set<SaasSubscriptionStatus>([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
]);

/** Canonical Checkout request (public paid plans only; excludes beta). */
export type CreateSubscriptionCheckoutInput = {
  planKey: SaasPublicPlanKey;
  billingInterval: SaasBillingInterval;
};

export type CreateSubscriptionCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Stripe customers inspected per email when looking for prior subscriptions. */
const STRIPE_EMAIL_LOOKUP_LIMIT = 20;

/**
 * The Stripe side of "one trial per person" (the database side is migration
 * 201): has any OTHER Stripe customer reaching the same inbox ever held a
 * subscription? Looks up each email with Stripe's exact-match filter, then
 * asks for one subscription (any status) per match.
 *
 * Fails OPEN. A Stripe hiccup here must not stop a legitimate customer from
 * adding a card; the local rules in resolveCheckoutTrialParams still apply,
 * and the failure is logged (without the address) so a spike is visible.
 */
async function stripeEmailAlreadySubscribed(
  stripe: Stripe,
  ownCustomerId: string,
  emails: Array<string | null | undefined>,
  companyId: string,
): Promise<boolean> {
  const lookups = new Map<string, string>();
  for (const email of emails) {
    const trimmed = email?.trim();
    const inbox = normalizeTrialEmail(trimmed);
    if (trimmed && inbox && !lookups.has(inbox)) {
      lookups.set(inbox, trimmed);
    }
  }

  if (lookups.size === 0) return false;

  try {
    const candidates: StripeCustomerSubscriptionHistory[] = [];

    for (const email of lookups.values()) {
      const customers = await stripe.customers.list({
        email,
        limit: STRIPE_EMAIL_LOOKUP_LIMIT,
      });

      for (const customer of customers.data) {
        if (customer.id === ownCustomerId) continue;
        const subscriptions = await stripe.subscriptions.list({
          customer: customer.id,
          status: "all",
          limit: 1,
        });
        candidates.push({
          customerId: customer.id,
          email: customer.email,
          hasSubscription: subscriptions.data.length > 0,
        });
      }
    }

    return emailHasPriorStripeSubscription({
      ownCustomerId,
      emails: [...lookups.values()],
      candidates,
    });
  } catch (error) {
    console.error("[saas-billing] prior-subscription lookup failed; trial rule falls back to the local row:", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return false;
  }
}

function buildCheckoutUrls(baseUrl: string): {
  successUrl: string;
  cancelUrl: string;
} {
  const origin = baseUrl.replace(/\/$/, "");
  return {
    successUrl: `${origin}/activate-subscription?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${origin}/activate-subscription?billing=cancel`,
  };
}

/**
 * Creates a Stripe Checkout Session (mode: subscription) for Altair SaaS billing.
 * Company is resolved exclusively from getActiveCompanyContext() — never from client input.
 * Owner/Admin (manageCompany) only.
 *
 * Uses canonical catalog Price env names, applies the approved 14-day card-required trial,
 * and records plan_key + billing_interval on session and subscription metadata.
 */
export async function createSubscriptionCheckout(input: {
  planKey: string;
  billingInterval: string;
}): Promise<CreateSubscriptionCheckoutResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { ok: false, error: "No active company workspace." };
  }

  if (!context.permissions.manageCompany) {
    return {
      ok: false,
      error: "Only owners and admins can manage the company subscription.",
    };
  }

  if (!isSaasCheckoutPlanKey(input.planKey)) {
    return { ok: false, error: "Invalid subscription plan." };
  }

  if (!isSaasBillingInterval(input.billingInterval)) {
    return { ok: false, error: "Invalid billing interval." };
  }

  const checkoutPlanKey: SaasCheckoutPlanKey = input.planKey;
  const billingInterval: SaasBillingInterval = input.billingInterval;

  if (!isSaasBillingCheckoutConfigured()) {
    return {
      ok: false,
      error:
        "Subscription billing is not configured yet. Add STRIPE_SECRET_KEY and plan price IDs.",
    };
  }

  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: "App URL is not configured. Set NEXT_PUBLIC_APP_URL.",
    };
  }

  let priceId: string;
  try {
    priceId = requireStripePriceIdForPlanInterval(
      checkoutPlanKey,
      billingInterval,
    );
  } catch {
    return {
      ok: false,
      error: `Price is not configured for the ${checkoutPlanKey} plan (${billingInterval}).`,
    };
  }

  const companyId = context.company.id;
  const supabase = createServiceRoleClient();

  let existingSubscription: Awaited<ReturnType<typeof getCompanySubscription>>;
  try {
    existingSubscription = await getCompanySubscription(companyId, supabase);
    if (
      existingSubscription?.stripe_subscription_id &&
      BLOCKED_CHECKOUT_STATUSES.has(existingSubscription.status)
    ) {
      return {
        ok: false,
        error:
          "This company already has a subscription. Manage it from Settings once Billing Portal is available, or contact support.",
      };
    }
  } catch (error) {
    console.error("[saas-billing] existing subscription check failed:", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "Failed to verify current subscription." };
  }

  let billingAccount;
  try {
    billingAccount = await getOrCreateBillingCustomer(companyId, supabase);
  } catch (error) {
    console.error("[saas-billing] getOrCreateBillingCustomer failed:", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "Failed to prepare billing customer." };
  }

  if (!billingAccount.stripe_customer_id) {
    return { ok: false, error: "Billing customer is missing." };
  }

  const urls = buildCheckoutUrls(baseUrl);
  const stripe = getPlatformStripeClient();
  const sharedMetadata = {
    purpose: SAAS_CHECKOUT_METADATA_PURPOSE,
    company_id: companyId,
    plan_key: checkoutPlanKey,
    billing_interval: billingInterval,
  };

  // One trial per person, Stripe side: the company's Stripe customer email
  // (the company email) and the signed-in owner's own address are both
  // checked against customers that already hold a subscription.
  let stripeCustomerEmail: string | null = null;
  try {
    const customer = await stripe.customers.retrieve(
      billingAccount.stripe_customer_id,
    );
    stripeCustomerEmail = customer.deleted ? null : (customer.email ?? null);
  } catch (error) {
    console.error("[saas-billing] customer retrieve failed; prior-subscription check uses the signed-in email only:", {
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  const emailAlreadySubscribedInStripe = await stripeEmailAlreadySubscribed(
    stripe,
    billingAccount.stripe_customer_id,
    [stripeCustomerEmail, context.user.email],
    companyId,
  );

  // The trial started without a card (migration 200); Checkout is where the
  // card is added. A running trial keeps its own end date so the first charge
  // lands on the day the customer was told; an expired one gets no second
  // trial, nor does a withheld one (migration 201), nor does an email Stripe
  // already knows as a subscriber. See resolveCheckoutTrialParams.
  const trialParams = resolveCheckoutTrialParams(
    existingSubscription
      ? {
          trialEndsAt: existingSubscription.trial_ends_at,
          trialWithheldReason: existingSubscription.trial_withheld_reason,
        }
      : null,
    Date.now(),
    SAAS_TRIAL_CONFIG.durationDays,
    { emailAlreadySubscribedInStripe },
  );

  if (emailAlreadySubscribedInStripe) {
    console.info("[saas-billing] checkout without trial: email already subscribed in Stripe", {
      companyId,
    });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: billingAccount.stripe_customer_id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      client_reference_id: companyId,
      // Always: this session exists to put a card on file. (The catalog's
      // requiresPaymentMethod describes the start of the trial, not Checkout.)
      payment_method_collection: "always",
      metadata: sharedMetadata,
      subscription_data: {
        ...trialParams,
        metadata: sharedMetadata,
      },
    });

    if (!session.url) {
      return { ok: false, error: "Stripe Checkout did not return a URL." };
    }

    return { ok: true, url: session.url };
  } catch (error) {
    console.error("[saas-billing] checkout.sessions.create failed:", {
      companyId,
      planKey: checkoutPlanKey,
      billingInterval,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "Failed to start subscription checkout." };
  }
}
