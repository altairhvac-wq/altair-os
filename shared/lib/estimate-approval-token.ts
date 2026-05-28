import { createHash, randomBytes } from "crypto";

export const ESTIMATE_APPROVAL_TOKEN_EXPIRY_DAYS = 30;

export function generateEstimateApprovalToken(): {
  raw: string;
  hash: string;
} {
  const raw = randomBytes(32).toString("base64url");
  const hash = hashEstimateApprovalToken(raw);
  return { raw, hash };
}

export function hashEstimateApprovalToken(rawToken: string): string {
  return createHash("sha256").update(rawToken.trim()).digest("hex");
}

export function getEstimateApprovalTokenExpiresAt(
  from: Date = new Date(),
): string {
  const expires = new Date(from);
  expires.setUTCDate(
    expires.getUTCDate() + ESTIMATE_APPROVAL_TOKEN_EXPIRY_DAYS,
  );
  return expires.toISOString();
}
