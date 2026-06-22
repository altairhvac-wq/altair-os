"use server";

import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import { resolvePublicInvoicePaymentTokenContext } from "@/lib/database/queries/invoice-payment-tokens";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import { isStripeConnectOnboardingConfigured } from "@/lib/payments/env";
import {
  buildPublicInvoiceCheckoutUrls,
  createStripeInvoiceCheckoutSession,
  validateStripeInvoiceCheckoutReadiness,
} from "@/lib/payments/stripe-checkout";

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

  const tokenContext = await resolvePublicInvoicePaymentTokenContext(trimmedToken);

  if (tokenContext.state === "invalid") {
    return { error: "This payment link is invalid." };
  }

  if (tokenContext.state === "revoked") {
    return { error: "This payment link is no longer active." };
  }

  if (tokenContext.state === "expired") {
    return { error: "This payment link has expired." };
  }

  if (tokenContext.state !== "valid") {
    return { error: "This payment link is invalid." };
  }

  const { companyId, invoiceId } = tokenContext;
  const invoice = await getInvoiceById(companyId, invoiceId);

  if (!invoice) {
    return { error: "This invoice is no longer available." };
  }

  if (invoice.id !== invoiceId) {
    return { error: "This invoice is no longer available." };
  }

  const paymentAccount = await getCompanyPaymentAccount(companyId, "stripe");
  const readiness = validateStripeInvoiceCheckoutReadiness(paymentAccount, {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    balanceDue: invoice.balanceDue,
    status: invoice.status,
  });

  if (!readiness.ok) {
    return { error: readiness.error };
  }

  if (!isStripeConnectOnboardingConfigured()) {
    return { error: "Online payment is not available right now. Contact the company." };
  }

  const checkoutUrls = buildPublicInvoiceCheckoutUrls(trimmedToken);

  if (!checkoutUrls) {
    return { error: "Online payment is not available right now. Contact the company." };
  }

  try {
    const checkoutUrl = await createStripeInvoiceCheckoutSession(
      companyId,
      {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        balanceDue: invoice.balanceDue,
        status: invoice.status,
      },
      readiness.account.providerAccountId!,
      checkoutUrls,
    );

    return { checkoutUrl };
  } catch (error) {
    console.error("[createPublicInvoiceCheckoutSessionAction] failed:", {
      companyId,
      invoiceId,
      error,
    });
    return { error: "Failed to start checkout. Please try again." };
  }
}
