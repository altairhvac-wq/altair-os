import "server-only";

import { getCompanyPaymentAccountWithServiceRole } from "@/lib/database/queries/company-payment-accounts";
import { isStripeConnectOnboardingConfigured } from "@/lib/payments/env";
import { validateStripeInvoiceCheckoutReadiness } from "@/lib/payments/stripe-checkout";

const PAYABLE_INVOICE_STUB = {
  id: "00000000-0000-0000-0000-000000000000",
  invoiceNumber: "READINESS",
  balanceDue: 1,
  status: "sent",
} as const;

export async function isCompanyOnlineCheckoutAvailable(
  companyId: string,
): Promise<boolean> {
  if (!isStripeConnectOnboardingConfigured()) {
    return false;
  }

  const paymentAccount = await getCompanyPaymentAccountWithServiceRole(
    companyId,
    "stripe",
  );

  if (!paymentAccount) {
    return false;
  }

  const readiness = validateStripeInvoiceCheckoutReadiness(
    paymentAccount,
    PAYABLE_INVOICE_STUB,
  );

  return readiness.ok;
}
