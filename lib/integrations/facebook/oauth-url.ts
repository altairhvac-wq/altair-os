import "server-only";

import { getFacebookOAuthConfig } from "./env";

/**
 * Facebook Login scopes for Page connect + publish.
 *
 * `instagram_content_publish` requires the Instagram use case's "content
 * management" permissions to be attached in the Meta app dashboard (Use
 * cases → Instagram API → API setup with Facebook login → Add required
 * content permissions) — without that, the OAuth dialog rejects it with
 * "Invalid Scopes". That setup was completed on 2026-08-08. Note the
 * dashboard displays the permission as "instagram_content_publishing", but
 * the OAuth scope string is `instagram_content_publish`.
 *
 * `business_management` is required for Pages owned by a Meta Business
 * Portfolio (like the Altair Page): those are business-mediated, so they
 * surface via GET /me/assigned_pages rather than GET /me/accounts, and that
 * edge rejects tokens without this scope.
 */
export const FACEBOOK_CONNECT_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  /**
   * Required by GET /{ig-media-id}/insights, per Meta's Instagram Media
   * Insights reference. Without it that edge answers every request with
   * `(#10) Application does not have permission for this action` — which is
   * exactly what the live collector saw on real, published media ids.
   *
   * ADDING IT HERE IS NOT ENOUGH: a token already minted carries the scopes it
   * was granted at the time, so Instagram must be RECONNECTED before any
   * insight can be read.
   */
  "instagram_manage_insights",
  "business_management",
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
