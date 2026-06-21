import "server-only";

import { resolveAppBaseUrl } from "@/lib/email/env";

const FACEBOOK_APP_ID_ENV = "FACEBOOK_APP_ID";
const FACEBOOK_APP_SECRET_ENV = "FACEBOOK_APP_SECRET";
const FACEBOOK_REDIRECT_URI_ENV = "FACEBOOK_REDIRECT_URI";
const FACEBOOK_GRAPH_API_VERSION_ENV = "FACEBOOK_GRAPH_API_VERSION";

/** Pinned default Graph API version for OAuth and future API calls. */
export const DEFAULT_FACEBOOK_GRAPH_API_VERSION = "v22.0";

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
