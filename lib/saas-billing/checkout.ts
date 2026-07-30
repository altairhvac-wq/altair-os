import "server-only";

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

function buildCheckoutUrls(baseUrl: string): {
  successUrl: string;
  cancelUrl: string;
} {
  const origin = baseUrl.replace(/\/$/, "");
  return {
    successUrl: `${origin}/settings?billing=success`,
    cancelUrl: `${origin}/settings?billing=cancel`,
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

  try {
    const existingSubscription = await getCompanySubscription(companyId, supabase);
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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: billingAccount.stripe_customer_id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      client_reference_id: companyId,
      // Card required up front so the trial converts to paid unless canceled.
      payment_method_collection: SAAS_TRIAL_CONFIG.requiresPaymentMethod
        ? "always"
        : "if_required",
      metadata: sharedMetadata,
      subscription_data: {
        trial_period_days: SAAS_TRIAL_CONFIG.durationDays,
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
