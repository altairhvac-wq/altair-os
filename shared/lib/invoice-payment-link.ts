export const INVOICE_PAYMENT_PATH = "/invoice-payment";

export function buildInvoicePaymentUrl(
  appBaseUrl: string,
  rawToken: string,
): string {
  const base = appBaseUrl.replace(/\/$/, "");
  const encoded = encodeURIComponent(rawToken);
  return `${base}${INVOICE_PAYMENT_PATH}/${encoded}`;
}
