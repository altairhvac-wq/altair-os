import { createHash, randomBytes } from "crypto";

export const NETWORK_INVITE_TOKEN_EXPIRY_DAYS = 30;

export function generateNetworkInviteToken(): {
  raw: string;
  hash: string;
} {
  const raw = randomBytes(32).toString("base64url");
  const hash = hashNetworkInviteToken(raw);
  return { raw, hash };
}

export function hashNetworkInviteToken(rawToken: string): string {
  return createHash("sha256").update(rawToken.trim()).digest("hex");
}

export function getNetworkInviteTokenExpiresAt(from: Date = new Date()): string {
  const expires = new Date(from);
  expires.setUTCDate(expires.getUTCDate() + NETWORK_INVITE_TOKEN_EXPIRY_DAYS);
  return expires.toISOString();
}

export function buildNetworkInviteSignupUrl(
  origin: string,
  rawToken: string,
): string {
  const url = new URL("/signup", origin);
  url.searchParams.set("invite", rawToken);
  return url.toString();
}
