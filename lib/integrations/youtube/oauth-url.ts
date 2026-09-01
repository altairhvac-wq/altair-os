import "server-only";

import { GOOGLE_AUTHORIZE_URL, getYouTubeOAuthConfig } from "./env";

/**
 * The scopes YouTube Connect asks for, and nothing beyond them.
 *
 * ============ WHY READONLY AND UPLOAD, NOT youtube ============
 * The broad `.../auth/youtube` scope grants full account management —
 * deleting videos, editing playlists, managing comments. Nothing in this
 * platform does any of that, and a scope we never exercise is a permission
 * the customer granted for no reason and a larger blast radius if a token
 * leaks. These two are the minimum that make the feature work:
 *
 *   youtube.readonly  read the channel list, so a connection can name which
 *                     channel it is and the capability probe can confirm the
 *                     grant actually landed.
 *   youtube.upload    insert a video. This is the one write, and it is the
 *                     whole point of connecting.
 *
 * A thumbnail set (`youtube.thumbnails.set`) is covered by `youtube.upload`
 * for videos the app itself uploaded, so it needs no additional scope.
 *
 * ============ ADDING A SCOPE LATER IS NOT ENOUGH ============
 * A token already minted carries the scopes granted at the time. Widening
 * this list changes nothing for an existing connection until the customer
 * RECONNECTS — the same trap `facebook/oauth-url.ts` documents for
 * `read_insights`, written out there after it cost a live debugging session.
 * `granted_scopes` on the account row (migration 181) exists so the
 * difference between what we asked for and what we hold is visible rather
 * than inferred.
 */
export const YOUTUBE_CONNECT_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
] as const;

export type YouTubeConnectScope = (typeof YOUTUBE_CONNECT_SCOPES)[number];

const ALLOWED_YOUTUBE_SCOPES = new Set<string>(YOUTUBE_CONNECT_SCOPES);

export type BuildYouTubeAuthorizationUrlInput = {
  state: string;
  scopes?: string[];
  redirectUri?: string;
};

/**
 * Builds the Google consent URL.
 *
 * ============ access_type=offline AND prompt=consent ============
 * Google issues a refresh token ONLY when `access_type=offline` is set, and
 * only on the FIRST consent for a given user/client pair — a second
 * authorization silently returns an access token with no refresh token,
 * because Google assumes the caller kept the first one. A reconnect after a
 * lost or rotated secret would therefore produce a connection that works for
 * an hour and then cannot refresh, with nothing in the response saying so.
 *
 * `prompt=consent` forces the consent screen every time, which forces a new
 * refresh token every time. It costs the customer one extra click on
 * reconnect and removes an entire class of connection that dies overnight.
 * The capability matrix records YouTube as `requiresRefreshToken: true`, and
 * this is what makes that true rather than aspirational.
 */
export function buildYouTubeAuthorizationUrl(
  input: BuildYouTubeAuthorizationUrlInput,
): string {
  const state = input.state.trim();

  if (!state) {
    throw new Error("OAuth state is required.");
  }

  const scopes = input.scopes ?? [...YOUTUBE_CONNECT_SCOPES];
  const unsupported = scopes.filter(
    (scope) => !ALLOWED_YOUTUBE_SCOPES.has(scope),
  );

  if (unsupported.length > 0) {
    // A scope not in the registry is refused rather than forwarded. Google
    // would show the customer a consent screen asking for a permission this
    // codebase never decided to request, which is a promise nobody made.
    throw new Error(
      `Unsupported YouTube OAuth scopes: ${unsupported.join(", ")}`,
    );
  }

  const config = getYouTubeOAuthConfig();
  const redirectUri = input.redirectUri?.trim() || config.redirectUri;

  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", scopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  // Without this, granting YouTube would silently drop a scope the customer
  // had already given this client for another Google product.
  url.searchParams.set("include_granted_scopes", "true");

  return url.toString();
}
