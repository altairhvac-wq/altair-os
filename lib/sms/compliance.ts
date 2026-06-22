/**
 * SMS compliance helpers for outbound payment-link texts.
 *
 * Opt-out is persisted in sms_opt_outs; inbound STOP webhook automation is not
 * live yet — outbound messages still include STOP language.
 */

/** Basic E.164-ish normalization for future validation; not a full libphonenumber pass. */
export function normalizePhoneNumber(raw: string): string | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/[^\d+]/g, "");

  if (!digits) {
    return null;
  }

  if (digits.startsWith("+")) {
    const normalized = `+${digits.slice(1).replace(/\D/g, "")}`;
    return normalized.length >= 8 ? normalized : null;
  }

  const numeric = digits.replace(/\D/g, "");

  if (numeric.length === 10) {
    return `+1${numeric}`;
  }

  if (numeric.length === 11 && numeric.startsWith("1")) {
    return `+${numeric}`;
  }

  return numeric.length >= 8 ? `+${numeric}` : null;
}

/** Mask phone for UI/logging — shows last four digits only. */
export function maskPhoneNumber(e164: string): string {
  const digits = e164.replace(/\D/g, "");

  if (digits.length < 4) {
    return "****";
  }

  return `***${digits.slice(-4)}`;
}

/** Footer included on outbound transactional SMS. */
export function buildOptOutFooter(_companyName: string): string {
  return "Reply STOP to opt out.";
}

export function buildInvoicePaymentLinkSmsBody(input: {
  companyName: string;
  invoiceNumber: string;
  paymentUrl: string;
}): string {
  const companyName = input.companyName.trim() || "Your service provider";
  const footer = buildOptOutFooter(companyName);

  return `${companyName}: Pay invoice ${input.invoiceNumber} securely: ${input.paymentUrl}. ${footer}`;
}
