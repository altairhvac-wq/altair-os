import "server-only";

import { resolveAppBaseUrl } from "@/lib/email/env";

const FACEBOOK_APP_ID_ENV = "FACEBOOK_APP_ID";
const FACEBOOK_APP_SECRET_ENV = "FACEBOOK_APP_SECRET";
const FACEBOOK_REDIRECT_URI_ENV = "FACEBOOK_REDIRECT_URI";
const FACEBOOK_GRAPH_API_VERSION_ENV = "FACEBOOK_GRAPH_API_VERSION";

/**
 * THE Graph API version. One pin, used by every Meta call this deployment
 * makes: OAuth, Page feed, Page photos, Instagram containers, both Reel flows,
 * and the `rupload.facebook.com` upload host.
 *
 * ==================== WHY ONE VALUE AND NOT TWO ====================
 * The obvious shortcut when adding Reels was to hardcode the version Meta's
 * Reel documentation happens to use in its examples. That produces a Reel flow
 * on a different version from the OAuth flow that minted the token it uses —
 * a divergence nobody notices until a token or a field behaves differently
 * than expected, at which point it is invisible in the diff that caused it.
 * `scripts/verify-marketing-reel.mjs` asserts structurally that the Reel
 * module contains no version literal at all.
 *
 * ==================== WHY v22.0 IS STILL THE PIN ====================
 * Meta's stated policy: "A version will no longer be usable two years after
 * the date that the subsequent version is released." v22.0 shipped
 * 21 January 2025 and v23.0 shipped 29 May 2025, so v22.0 remains callable
 * until roughly 29 May 2027. Meta's own changelog lists it as "Available
 * until TBD" — no expiry has been announced.
 *
 * Both Reel surfaces exist in v22.0: `/{page-id}/video_reels` and Instagram's
 * `media_type=REELS` both landed in v14.0.
 *
 * Moving to the newest version (v25.0 at the time of writing) is a ONE-LINE
 * change here, or a single `FACEBOOK_GRAPH_API_VERSION` env var with no
 * deploy. It is deliberately NOT bundled into this milestone: bumping the
 * version changes the behaviour of the already-working text and image publish
 * paths as well, and that belongs in its own change that can be tested on its
 * own rather than riding along with a new feature.
 */
export const DEFAULT_FACEBOOK_GRAPH_API_VERSION = "v22.0";

/**
 * When Meta's data access for the connected Page expires.
 *
 * Read off the live token via `GET /debug_token` on 2026-09-13
 * (`data_access_expires_at` = 2026-11-30). This is a property of the GRANT,
 * not of the token: the Page token itself never expires, so nothing in
 * `token_expires_at` or the channel state machine will ever warn about it —
 * publishing and insights both go dark on this date with every stored
 * credential still "valid". The only fix is a human re-consenting
 * (reconnect Facebook), which resets the window and this constant.
 */
export const META_DATA_ACCESS_EXPIRES_ON = "2026-11-30";

/** How far ahead the expiry starts being reported as a warning. */
export const META_DATA_ACCESS_WARN_DAYS = 45;

/**
 * The operator-facing warning, or null while the expiry is comfortably far.
 * Pure date math so schedulers and summaries on both repos can print the
 * same sentence without holding a token.
 */
export function metaDataAccessWarning(nowIso: string): string | null {
  const now = Date.parse(nowIso);
  const expires = Date.parse(`${META_DATA_ACCESS_EXPIRES_ON}T00:00:00Z`);
  if (Number.isNaN(now) || Number.isNaN(expires)) return null;

  const daysLeft = Math.floor((expires - now) / 86_400_000);
  if (daysLeft > META_DATA_ACCESS_WARN_DAYS) return null;

  if (daysLeft < 0) {
    return (
      `Meta data access EXPIRED on ${META_DATA_ACCESS_EXPIRES_ON}. Facebook and Instagram ` +
      "publishing and insights are dark until someone reconnects the Facebook Page " +
      "(Integrations → Facebook), which renews the grant."
    );
  }

  return (
    `Meta data access expires ${META_DATA_ACCESS_EXPIRES_ON} (${daysLeft} day${daysLeft === 1 ? "" : "s"} left). ` +
    "Reconnect the Facebook Page before then — the stored token stays 'valid' right through " +
    "the cutoff, so nothing else will warn about this."
  );
}

const FACEBOOK_OAUTH_CALLBACK_PATH =
  "/api/marketing/connected-accounts/facebook/callback";

export type FacebookOAuthConfig = {
  appId: string;
  appSecret: string;
  redirectUri: string;
  graphApiVersion: string;
};

function readGraphApiVersion(): string {
  const raw = process.env[FACEBOOK_GRAPH_API_VERSION_ENV]?.trim();
  return raw || DEFAULT_FACEBOOK_GRAPH_API_VERSION;
}

function resolveFacebookRedirectUri(): string | null {
  const explicit = process.env[FACEBOOK_REDIRECT_URI_ENV]?.trim();
  if (explicit) {
    return explicit;
  }

  const baseUrl = resolveAppBaseUrl();
  if (baseUrl.ok) {
    return `${baseUrl.url}${FACEBOOK_OAUTH_CALLBACK_PATH}`;
  }

  return null;
}

/** Returns env var names missing when Facebook OAuth cannot be configured. */
export function getMissingFacebookOAuthEnvVars(): string[] {
  const missing: string[] = [];

  if (!process.env[FACEBOOK_APP_ID_ENV]?.trim()) {
    missing.push(FACEBOOK_APP_ID_ENV);
  }

  if (!process.env[FACEBOOK_APP_SECRET_ENV]?.trim()) {
    missing.push(FACEBOOK_APP_SECRET_ENV);
  }

  if (!resolveFacebookRedirectUri()) {
    missing.push(FACEBOOK_REDIRECT_URI_ENV);
  }

  return missing;
}

export function isFacebookOAuthConfigured(): boolean {
  return getMissingFacebookOAuthEnvVars().length === 0;
}

export function getFacebookOAuthConfig(): FacebookOAuthConfig {
  const missing = getMissingFacebookOAuthEnvVars();

  if (missing.length > 0) {
    throw new Error(
      `Facebook OAuth is not configured. Missing: ${missing.join(", ")}`,
    );
  }

  const redirectUri = resolveFacebookRedirectUri();

  if (!redirectUri) {
    throw new Error(
      `Facebook OAuth is not configured. Missing: ${FACEBOOK_REDIRECT_URI_ENV}`,
    );
  }

  return {
    appId: process.env[FACEBOOK_APP_ID_ENV]!.trim(),
    appSecret: process.env[FACEBOOK_APP_SECRET_ENV]!.trim(),
    redirectUri,
    graphApiVersion: readGraphApiVersion(),
  };
}
