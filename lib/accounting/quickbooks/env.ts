import "server-only";

import { resolveAppBaseUrl } from "@/lib/email/env";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";

/**
 * QuickBooks Online settings, read in one place.
 *
 * Two secrets, both server-only, both from the Intuit developer portal:
 *   QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET
 * One switch:
 *   QUICKBOOKS_ENVIRONMENT  "sandbox" (default) or "production". Intuit gives
 *                           separate keys for each; the keys and this value
 *                           must match.
 * One optional override:
 *   QUICKBOOKS_REDIRECT_URI pins every sign-in to one return address. Leave
 *                           it unset in production: the sign-in then returns
 *                           to the Altair host it started on (app. or www.,
 *                           see quickBooksRedirectUriFor), and both callbacks
 *                           are registered in the Intuit developer portal,
 *                           which matches them exactly.
 *
 * The connection also needs the integrations encryption key
 * (INTEGRATIONS_ENCRYPTION_KEY), the same one the marketing channels use.
 *
 * Until all of that is set, QuickBooks does not appear in the product at all:
 * Settings > Integrations keeps it under "Not available yet".
 */

const CLIENT_ID_ENV = "QUICKBOOKS_CLIENT_ID";
const CLIENT_SECRET_ENV = "QUICKBOOKS_CLIENT_SECRET";
const ENVIRONMENT_ENV = "QUICKBOOKS_ENVIRONMENT";
const REDIRECT_URI_ENV = "QUICKBOOKS_REDIRECT_URI";

export const QUICKBOOKS_CALLBACK_PATH = "/api/integrations/quickbooks/callback";

/**
 * Intuit's endpoints, pinned. The client secret and the refresh token travel
 * to these hosts, so "which host receives them" is not answerable by an
 * environment variable (the same origin pinning lib/integrations/youtube/env.ts
 * states for Google).
 */
export const INTUIT_AUTHORIZE_URL = "https://appcenter.intuit.com/connect/oauth2";
export const INTUIT_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
export const INTUIT_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
export const QBO_API_ORIGINS = {
  sandbox: "https://sandbox-quickbooks.api.intuit.com",
  production: "https://quickbooks.api.intuit.com",
} as const;
/** Intuit treats anything lower as 75; send it explicitly. */
export const QBO_MINOR_VERSION = "75";
export const QUICKBOOKS_SCOPE = "com.intuit.quickbooks.accounting";

export type QuickBooksEnvironment = keyof typeof QBO_API_ORIGINS;

export type QuickBooksConfig = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly environment: QuickBooksEnvironment;
  readonly redirectUri: string;
};

function readEnvironment(): QuickBooksEnvironment {
  return process.env[ENVIRONMENT_ENV]?.trim() === "production" ? "production" : "sandbox";
}

function resolveRedirectUri(): string | null {
  const explicit = process.env[REDIRECT_URI_ENV]?.trim();
  if (explicit) return explicit;
  const base = resolveAppBaseUrl();
  return base.ok ? `${base.url}${QUICKBOOKS_CALLBACK_PATH}` : null;
}

/**
 * The return address for a sign-in started at `origin` (the request's own
 * origin when it is a sibling of NEXT_PUBLIC_APP_URL, from
 * resolveAuthRedirectOrigin). The state cookie and the session are host-only,
 * so the sign-in must come back to the host it left from. An explicit
 * QUICKBOOKS_REDIRECT_URI wins; Intuit refuses any address not registered for
 * the app, so an unexpected origin fails closed at Intuit.
 */
export function quickBooksRedirectUriFor(origin: string | null): string | null {
  const explicit = process.env[REDIRECT_URI_ENV]?.trim();
  if (explicit) return explicit;
  if (origin) return `${new URL(origin).origin}${QUICKBOOKS_CALLBACK_PATH}`;
  return resolveRedirectUri();
}

/** Env var NAMES (never values) that are missing. */
export function getMissingQuickBooksEnvVars(): string[] {
  const missing: string[] = [];
  if (!process.env[CLIENT_ID_ENV]?.trim()) missing.push(CLIENT_ID_ENV);
  if (!process.env[CLIENT_SECRET_ENV]?.trim()) missing.push(CLIENT_SECRET_ENV);
  if (!resolveRedirectUri()) missing.push(REDIRECT_URI_ENV);
  if (!isIntegrationEncryptionConfigured()) missing.push("INTEGRATIONS_ENCRYPTION_KEY");
  return missing;
}

export function isQuickBooksConfigured(): boolean {
  return getMissingQuickBooksEnvVars().length === 0;
}

export function getQuickBooksConfig(): QuickBooksConfig {
  const clientId = process.env[CLIENT_ID_ENV]?.trim();
  const clientSecret = process.env[CLIENT_SECRET_ENV]?.trim();
  const redirectUri = resolveRedirectUri();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(`QuickBooks is not configured (missing: ${getMissingQuickBooksEnvVars().join(", ")})`);
  }
  return { clientId, clientSecret, environment: readEnvironment(), redirectUri };
}
