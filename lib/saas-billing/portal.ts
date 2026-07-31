import "server-only";

import { getAppBaseUrl } from "@/lib/email/env";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { isSaasStripeLivemode } from "@/lib/saas-billing/constants";
import {
  findBillingAccountByCompanyId,
  getPlatformStripeClient,
} from "@/lib/saas-billing/customer";

export type CreateBillingPortalSessionResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Creates a short-lived Stripe Billing Portal session for the authenticated company.
 *
 * Security boundaries:
 * - Company is resolved exclusively from getActiveCompanyContext() — no client input accepted.
 * - manageCompany permission is required (owner and admin only).
 * - Uses only the Altair platform Stripe account.
 * - No stripeAccount, configuration, flow_data, or connected-account options are passed.
 * - Return URL is constructed server-side; no client-supplied redirect is accepted.
 * - No Stripe Customer is created here; this is a management operation.
 */
export async function createBillingPortalSession(): Promise<CreateBillingPortalSessionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { ok: false, error: "No active company workspace." };
  }

  if (!context.permissions.manageCompany) {
    return {
      ok: false,
      error: "You do not have permission to manage this subscription.",
    };
  }

  const baseUrl = getAppBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: "Billing management is temporarily unavailable. Please try again.",
    };
  }

  // Fixed server-generated return URL — never forwarded from client input.
  const returnUrl = `${baseUrl}/settings`;
  const companyId = context.company.id;
  const userId = context.user.id;

  let billingAccount;
  try {
    billingAccount = await findBillingAccountByCompanyId(companyId);
  } catch (error) {
    console.error("[saas-billing/portal] billing account lookup failed:", {
      userId,
      companyId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return {
      ok: false,
      error: "Billing management is temporarily unavailable. Please try again.",
    };
  }

  if (!billingAccount?.stripe_customer_id) {
    console.info("[saas-billing/portal] no billing account or stripe_customer_id:", {
      userId,
      companyId,
    });
    return {
      ok: false,
      error: "Billing management is not available for this company yet.",
    };
  }

  // Fail closed if the stored billing account mode conflicts with the active Stripe key.
  const expectedLivemode = isSaasStripeLivemode();
  if (billingAccount.livemode !== expectedLivemode) {
    console.error("[saas-billing/portal] livemode mismatch — failing closed:", {
      userId,
      companyId,
      accountLivemode: billingAccount.livemode,
      expectedLivemode,
      category: "mode_mismatch",
    });
    return {
      ok: false,
      error: "Billing management is temporarily unavailable. Please try again.",
    };
  }

  const stripe = getPlatformStripeClient();

  try {
    // Minimum required fields only.
    // Intentionally omits stripeAccount, configuration, flow_data, subscription,
    // locale, and all connected-account options — platform account only.
    const session = await stripe.billingPortal.sessions.create({
      customer: billingAccount.stripe_customer_id,
      return_url: returnUrl,
    });

    console.info("[saas-billing/portal] portal session created:", {
      userId,
      companyId,
      outcome: "success",
    });

    return { ok: true, url: session.url };
  } catch (error) {
    const stripeError = error as {
      type?: string;
      code?: string;
      message?: string;
    };

    console.error("[saas-billing/portal] billingPortal.sessions.create failed:", {
      userId,
      companyId,
      errorType: stripeError.type ?? "unknown",
      errorCode: stripeError.code ?? "unknown",
    });

    const rawMessage = stripeError.message ?? "";

    // Deleted or missing Stripe Customer.
    if (
      stripeError.code === "resource_missing" ||
      rawMessage.includes("No such customer")
    ) {
      return {
        ok: false,
        error: "Billing management is not available for this company yet.",
      };
    }

    // Portal not configured in Stripe Dashboard.
    if (
      rawMessage.includes("No configuration provided") ||
      rawMessage.includes("portal configuration") ||
      rawMessage.includes("billing portal")
    ) {
      return {
        ok: false,
        error: "Billing management is temporarily unavailable. Please try again.",
      };
    }

    return {
      ok: false,
      error: "Billing management is temporarily unavailable. Please try again.",
    };
  }
}
