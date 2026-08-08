import "server-only";

import { getFacebookOAuthConfig } from "./env";

/**
 * Facebook Login scopes for Page connect + publish.
 *
 * `instagram_content_publish` is deliberately absent: this app is a
 * Facebook Login for Business configuration where that legacy scope is
 * rejected at the OAuth dialog ("Invalid Scopes"). `instagram_basic` still
 * validates and powers linked-IG detection. When Instagram publishing ships
 * (needs image support first), add the Business-app publish permission from
 * the app's Instagram use case and prompt a reconnect.
 */
export const FACEBOOK_CONNECT_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
] as const;

export type FacebookConnectScope = (typeof FACEBOOK_CONNECT_SCOPES)[number];

const ALLOWED_FACEBOOK_OAUTH_SCOPES = new Set<string>(FACEBOOK_CONNECT_SCOPES);

export type BuildFacebookOAuthAuthorizationUrlInput = {
  state: string;
  scopes?: string[];
  redirectUri?: string;
};

export function buildFacebookOAuthAuthorizationUrl(
  input: BuildFacebookOAuthAuthorizationUrlInput,
): string {
  const state = input.state.trim();

  if (!state) {
    throw new Error("OAuth state is required.");
  }

  const scopes = input.scopes ?? [...FACEBOOK_CONNECT_SCOPES];
  const unsupportedScopes = scopes.filter(
    (scope) => !ALLOWED_FACEBOOK_OAUTH_SCOPES.has(scope),
  );

  if (unsupportedScopes.length > 0) {
    throw new Error(
      `Unsupported Facebook OAuth scopes: ${unsupportedScopes.join(", ")}`,
    );
  }

  const config = getFacebookOAuthConfig();
  const redirectUri = input.redirectUri?.trim() || config.redirectUri;

  const url = new URL(
    `https://www.facebook.com/${config.graphApiVersion}/dialog/oauth`,
  );

  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", scopes.join(","));

  return url.toString();
}
