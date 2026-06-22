import "server-only";

import { getCompanyPaymentAccountWithServiceRole } from "@/lib/database/queries/company-payment-accounts";
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
  const paymentAccount = await getCompanyPaymentAccountWithServiceRole(
    companyId,
    "stripe",
  );
  const readiness = validateStripeInvoiceCheckoutReadiness(
    paymentAccount,
    PAYABLE_INVOICE_STUB,
  );

  return readiness.ok;
}
