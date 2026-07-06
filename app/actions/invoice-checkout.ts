"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getCompanyPaymentAccount } from "@/lib/database/queries/company-payment-accounts";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { isStripeConnectOnboardingConfigured } from "@/lib/payments/env";
import {
  buildAdminInvoiceCheckoutUrls,
  createStripeInvoiceCheckoutSession,
  mapStripeCheckoutError,
  validateStripeInvoiceCheckoutReadiness,
} from "@/lib/payments/stripe-checkout";

export type CreateInvoiceCheckoutSessionActionResult = {
  error?: string;
  checkoutUrl?: string;
};

export async function createInvoiceCheckoutSessionAction(
  invoiceId: string,
): Promise<CreateInvoiceCheckoutSessionActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to create checkout sessions." };
  }

  const companyId = context.company.id;
  const trimmedInvoiceId = invoiceId.trim();

  if (!trimmedInvoiceId) {
    return { error: "Invoice is required." };
  }

  const invoice = await getInvoiceById(companyId, trimmedInvoiceId);

  if (!invoice) {
    return { error: "Invoice not found." };
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
    return {
      error:
        "Stripe checkout is not configured. Set STRIPE_SECRET_KEY and NEXT_PUBLIC_APP_URL.",
    };
  }

  const checkoutUrls = buildAdminInvoiceCheckoutUrls(trimmedInvoiceId);

  if (!checkoutUrls) {
    return {
      error:
        "App URL is not configured. Set NEXT_PUBLIC_APP_URL before creating checkout sessions.",
    };
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
    console.error("[createInvoiceCheckoutSessionAction] failed:", {
      companyId,
      invoiceId: trimmedInvoiceId,
      error,
    });
    return { error: mapStripeCheckoutError(error) };
  }
}
