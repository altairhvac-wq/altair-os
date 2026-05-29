import { createHash, randomBytes } from "crypto";

export const INVOICE_PAYMENT_TOKEN_EXPIRY_DAYS = 30;

export function generateInvoicePaymentToken(): {
  raw: string;
  hash: string;
} {
  const raw = randomBytes(32).toString("base64url");
  const hash = hashInvoicePaymentToken(raw);
  return { raw, hash };
}

export function hashInvoicePaymentToken(rawToken: string): string {
  return createHash("sha256").update(rawToken.trim()).digest("hex");
}

export function getInvoicePaymentTokenExpiresAt(
  from: Date = new Date(),
): string {
  const expires = new Date(from);
  expires.setUTCDate(
    expires.getUTCDate() + INVOICE_PAYMENT_TOKEN_EXPIRY_DAYS,
  );
  return expires.toISOString();
}
