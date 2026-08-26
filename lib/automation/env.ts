import "server-only";

import { isAuthorizedBearerRequest } from "@/lib/operations/bearer-auth";

const CRON_SECRET_ENV = "CRON_SECRET";

export function getCronSecret(): string | null {
  const raw = process.env[CRON_SECRET_ENV]?.trim();
  return raw || null;
}

export function isCronSecretConfigured(): boolean {
  return Boolean(getCronSecret());
}

/**
 * Cron authorization.
 *
 * This used to be `authorization === "Bearer " + secret` — an ordinary string
 * comparison that short-circuits on the first differing byte, and a second
 * implementation of a security-sensitive check that already existed elsewhere.
 * It now shares the single constant-time comparison in
 * lib/operations/bearer-auth.ts with the Agent Platform bridge.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  return isAuthorizedBearerRequest(request, getCronSecret());
}
