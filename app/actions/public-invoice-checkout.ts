"use server";

import { getPublicInvoiceCheckoutContext } from "@/lib/database/queries/invoice-payment-tokens";
import { isStripeConnectOnboardingConfigured } from "@/lib/payments/env";
import {
  buildPublicInvoiceCheckoutUrls,
  mapStripeCheckoutError,
} from "@/lib/payments/stripe-checkout";
import { resolveStripeInvoiceCheckoutSession } from "@/lib/payments/payment-attempts-service";
import { createServiceRoleClient } from "@/lib/supabase/service";

export type CreatePublicInvoiceCheckoutSessionActionResult = {
  error?: string;
  checkoutUrl?: string;
};

export async function createPublicInvoiceCheckoutSessionAction(
  rawToken: string,
): Promise<CreatePublicInvoiceCheckoutSessionActionResult> {
  const trimmedToken = rawToken.trim();

  if (!trimmedToken) {
    return { error: "This payment link is invalid." };
  }

  const checkoutContext = await getPublicInvoiceCheckoutContext(trimmedToken);

  if (checkoutContext.state === "invalid") {
    return { error: "This payment link is invalid." };
  }

  if (checkoutContext.state === "revoked") {
    return { error: "This payment link is no longer active." };
  }

  if (checkoutContext.state === "expired") {
    return { error: "This payment link has expired." };
  }

  if (checkoutContext.state !== "valid") {
    return { error: "This payment link is invalid." };
  }

  if (!checkoutContext.readiness.ok) {
    return { error: checkoutContext.readiness.error };
  }

  if (!isStripeConnectOnboardingConfigured()) {
    return { error: "Online payment is not available right now. Contact the company." };
  }

  const checkoutUrls = buildPublicInvoiceCheckoutUrls(trimmedToken);

  if (!checkoutUrls) {
    return { error: "Online payment is not available right now. Contact the company." };
  }

  const { companyId, invoice } = checkoutContext;
  const { account } = checkoutContext.readiness;

  try {
    const supabase = createServiceRoleClient();
    const checkoutUrl = await resolveStripeInvoiceCheckoutSession(supabase, {
      companyId,
      invoice,
      connectedAccountId: account.providerAccountId!,
      urls: checkoutUrls,
    });

    return { checkoutUrl };
  } catch (error) {
    console.error("[createPublicInvoiceCheckoutSessionAction] failed:", {
      companyId,
      invoiceId: invoice.id,
      error,
    });
    return { error: mapStripeCheckoutError(error, "Failed to start checkout. Please try again.") };
  }
}
