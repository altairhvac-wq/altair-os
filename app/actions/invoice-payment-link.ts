"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getInvoiceById } from "@/lib/database/queries/invoices";
import { createInvoicePaymentTokenForEmail } from "@/lib/database/queries/invoice-payment-tokens";
import {
  getPaymentLinkFailureUserMessage,
  INVALID_APP_URL_USER_MESSAGE,
  MISSING_APP_URL_USER_MESSAGE,
} from "@/lib/email/billing-failure";
import { resolveAppBaseUrl } from "@/lib/email/env";
import { buildInvoicePaymentUrl } from "@/shared/lib/invoice-payment-link";
import { isValidEmail } from "@/shared/lib/email-validation";
import { canShowInvoicePaymentLink } from "@/shared/types/invoice";

export type CopyInvoicePaymentLinkActionResult = {
  error?: string;
  paymentUrl?: string;
};

export async function copyInvoicePaymentLinkAction(
  invoiceId: string,
): Promise<CopyInvoicePaymentLinkActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to copy invoice payment links." };
  }

  const invoice = await getInvoiceById(context.company.id, invoiceId);

  if (!invoice) {
    return { error: "Invoice not found." };
  }

  if (!canShowInvoicePaymentLink(invoice.status)) {
    return {
      error:
        "Payment links are only available for invoices that have been sent.",
    };
  }

  const customerEmail = invoice.customerEmail?.trim();

  if (!customerEmail || !isValidEmail(customerEmail)) {
    return {
      error:
        "A valid customer email is required. Add an email on the customer record first.",
    };
  }

  const appUrl = resolveAppBaseUrl();

  if (!appUrl.ok) {
    const error =
      appUrl.reason === "invalid"
        ? INVALID_APP_URL_USER_MESSAGE
        : MISSING_APP_URL_USER_MESSAGE;

    console.error("[copyInvoicePaymentLinkAction] app URL not configured:", {
      invoiceId,
      reason: appUrl.reason,
    });

    return { error: getPaymentLinkFailureUserMessage(error) };
  }

  const { rawToken, error: tokenError } = await createInvoicePaymentTokenForEmail(
    {
      companyId: context.company.id,
      invoiceId,
      customerEmail,
      createdBy: context.user.id,
    },
  );

  if (tokenError || !rawToken) {
    console.error("[copyInvoicePaymentLinkAction] token creation failed:", {
      invoiceId,
      error: tokenError ?? "missing raw token",
    });

    return {
      error: getPaymentLinkFailureUserMessage(
        tokenError ?? "Failed to create invoice payment link.",
      ),
    };
  }

  return {
    paymentUrl: buildInvoicePaymentUrl(appUrl.url, rawToken),
  };
}
