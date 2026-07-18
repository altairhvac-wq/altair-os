import "server-only";

import { getAppBaseUrl } from "@/lib/email/env";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  isSaasBillingCheckoutConfigured,
  isSaasCheckoutPlanKey,
  requireStripePriceIdForPlan,
  SAAS_CHECKOUT_METADATA_PURPOSE,
  type SaasCheckoutPlanKey,
} from "@/lib/saas-billing/constants";
import { getOrCreateBillingCustomer, getPlatformStripeClient } from "@/lib/saas-billing/customer";
import { createServiceRoleClient } from "@/lib/supabase/service";

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
 */
export async function createSubscriptionCheckout(
  planKey: string,
): Promise<CreateSubscriptionCheckoutResult> {
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

  if (!isSaasCheckoutPlanKey(planKey)) {
    return { ok: false, error: "Invalid subscription plan." };
  }

  const checkoutPlanKey: SaasCheckoutPlanKey = planKey;

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
    priceId = requireStripePriceIdForPlan(checkoutPlanKey);
  } catch {
    return {
      ok: false,
      error: `Price is not configured for the ${checkoutPlanKey} plan.`,
    };
  }

  const companyId = context.company.id;
  const supabase = createServiceRoleClient();

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

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: billingAccount.stripe_customer_id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      client_reference_id: companyId,
      metadata: {
        purpose: SAAS_CHECKOUT_METADATA_PURPOSE,
        company_id: companyId,
        plan_key: checkoutPlanKey,
      },
      subscription_data: {
        metadata: {
          purpose: SAAS_CHECKOUT_METADATA_PURPOSE,
          company_id: companyId,
          plan_key: checkoutPlanKey,
        },
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
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "Failed to start subscription checkout." };
  }
}
