import "server-only";

import { resolveAppBaseUrl } from "@/lib/email/env";

/**
 * YouTube OAuth configuration.
 *
 * ============ ONE GOOGLE CLIENT, TWO PRODUCTS ============
 * `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` are deliberately
 * NOT named for YouTube. The same Google Cloud OAuth client serves YouTube
 * and Google Business Profile — they are two APIs enabled on one project,
 * and issuing a second client for the second product would mean two consent
 * screens, two verification reviews and two sets of credentials to rotate
 * for one Google relationship. The capability matrix records both providers
 * requiring the same pair, and `verify-integration-registry.mjs` asserts
 * those names are NAMES rather than values.
 *
 * The redirect URI is per-PROVIDER even though the client is shared: Google
 * matches the redirect_uri against a registered list exactly, and the
 * callback that knows how to read a YouTube channel is not the callback that
 * knows how to read a Business Profile location.
 */

const GOOGLE_CLIENT_ID_ENV = "GOOGLE_OAUTH_CLIENT_ID";
const GOOGLE_CLIENT_SECRET_ENV = "GOOGLE_OAUTH_CLIENT_SECRET";
const YOUTUBE_REDIRECT_URI_ENV = "YOUTUBE_REDIRECT_URI";

const YOUTUBE_OAUTH_CALLBACK_PATH =
  "/api/marketing/connected-accounts/youtube/callback";

/**
 * Google's endpoints, pinned as constants rather than built from a
 * configurable host.
 *
 * The credential travels to the token endpoint, so "which host receives the
 * client secret" must not be answerable by an environment variable. This is
 * the same origin-pinning posture `page-insights.ts` states for the Graph
 * API and `marketing-reel.ts` states for the Facebook upload host.
 */
export const GOOGLE_AUTH_ORIGIN = "https://accounts.google.com";
export const GOOGLE_TOKEN_ORIGIN = "https://oauth2.googleapis.com";
export const YOUTUBE_API_ORIGIN = "https://www.googleapis.com";

export const GOOGLE_AUTHORIZE_URL = `${GOOGLE_AUTH_ORIGIN}/o/oauth2/v2/auth`;
export const GOOGLE_TOKEN_URL = `${GOOGLE_TOKEN_ORIGIN}/token`;

export type YouTubeOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

function resolveYouTubeRedirectUri(): string | null {
  const explicit = process.env[YOUTUBE_REDIRECT_URI_ENV]?.trim();
  if (explicit) {
    return explicit;
  }

  const baseUrl = resolveAppBaseUrl();
  if (baseUrl.ok) {
    return `${baseUrl.url}${YOUTUBE_OAUTH_CALLBACK_PATH}`;
  }

  return null;
}

/** Env var NAMES missing when YouTube OAuth cannot be configured. */
export function getMissingYouTubeOAuthEnvVars(): string[] {
  const missing: string[] = [];

  if (!process.env[GOOGLE_CLIENT_ID_ENV]?.trim()) {
    missing.push(GOOGLE_CLIENT_ID_ENV);
  }

  if (!process.env[GOOGLE_CLIENT_SECRET_ENV]?.trim()) {
    missing.push(GOOGLE_CLIENT_SECRET_ENV);
  }

  if (!resolveYouTubeRedirectUri()) {
    missing.push(YOUTUBE_REDIRECT_URI_ENV);
  }

  return missing;
}

export function isYouTubeOAuthConfigured(): boolean {
  return getMissingYouTubeOAuthEnvVars().length === 0;
}

export function getYouTubeOAuthConfig(): YouTubeOAuthConfig {
  const missing = getMissingYouTubeOAuthEnvVars();

  if (missing.length > 0) {
    throw new Error(
      `YouTube OAuth is not configured. Missing: ${missing.join(", ")}`,
    );
  }

  const redirectUri = resolveYouTubeRedirectUri();

  if (!redirectUri) {
    throw new Error(
      `YouTube OAuth is not configured. Missing: ${YOUTUBE_REDIRECT_URI_ENV}`,
    );
  }

  return {
    clientId: process.env[GOOGLE_CLIENT_ID_ENV]!.trim(),
    clientSecret: process.env[GOOGLE_CLIENT_SECRET_ENV]!.trim(),
    redirectUri,
  };
}
