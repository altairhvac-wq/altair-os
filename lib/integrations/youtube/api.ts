import "server-only";

import {
  GOOGLE_TOKEN_URL,
  YOUTUBE_API_ORIGIN,
  getYouTubeOAuthConfig,
} from "./env";

/**
 * The HTTP layer for Google's token endpoint and the YouTube Data API.
 *
 * ====================== WHAT NEVER LEAVES HERE ======================
 * A token exchange carries the client SECRET in the request body and returns
 * an access token and a refresh token. Neither the secret nor either token
 * may appear in a thrown message, a log line, or an error handed upward.
 * `YouTubeApiError` therefore carries a status, Google's machine-readable
 * error CODE, and nothing else — no response body, no request echo. Google's
 * token endpoint quotes back what it rejected on some failures, which is
 * exactly how a credential ends up in a log that outlives it.
 *
 * That is the same posture `lib/integrations/credentials.ts` arrived at the
 * hard way: forwarding a provider's prose and scrubbing known secrets out of
 * it is a denylist, and a denylist cannot remove what it does not know.
 *
 * ====================== ORIGIN PINNING ======================
 * Both hosts are constants from `./env`. No URL from a response body is ever
 * followed and no host is configurable, so no response can redirect a
 * credential to somewhere of its choosing.
 */

const DEFAULT_TIMEOUT_MS = 20_000;

/** Google's `error` field is a short machine code; the description is not. */
export class YouTubeApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    // The message is assembled here from two non-secret values, never from
    // the response body.
    super(`YouTube API request failed (${status}: ${code})`);
    this.name = "YouTubeApiError";
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * The safe-to-keep part of a Google error body: its short code.
 *
 * Never the `error_description`, which is prose Google writes and can quote
 * the value it rejected.
 */
function extractErrorCode(body: unknown): string {
  if (!isRecord(body)) return "unparseable_error";

  // Token endpoint shape: { error: "invalid_grant", error_description: "..." }
  if (typeof body.error === "string") {
    return sanitizeCode(body.error);
  }

  // Data API shape: { error: { code, message, status, errors: [...] } }
  if (isRecord(body.error)) {
    const status = body.error.status;
    if (typeof status === "string") return sanitizeCode(status);
    const code = body.error.code;
    if (typeof code === "number") return String(code);
  }

  return "unknown_error";
}

/**
 * A code is only allowed through if it looks like a code. Google's codes are
 * lowercase identifiers; anything else is a body we do not recognise, and
 * passing an unrecognised string upward is how prose gets forwarded by
 * accident.
 */
function sanitizeCode(raw: string): string {
  const trimmed = raw.trim();
  return /^[A-Za-z0-9_.-]{1,64}$/.test(trimmed) ? trimmed : "unrecognized_error";
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export type YouTubeTokenResponse = {
  readonly accessToken: string;
  /**
   * Absent when Google declines to issue one — which happens on a repeat
   * authorization without `prompt=consent`. The caller must treat absence as
   * a real condition rather than an oddity: a connection with no refresh
   * token dies at the first expiry and can only be revived by reconnecting.
   */
  readonly refreshToken: string | null;
  readonly expiresInSeconds: number | null;
  /** What Google actually GRANTED, which may be narrower than we asked for. */
  readonly grantedScopes: readonly string[];
};

function parseTokenResponse(body: unknown): YouTubeTokenResponse | null {
  if (!isRecord(body)) return null;

  const accessToken =
    typeof body.access_token === "string" ? body.access_token.trim() : "";
  if (!accessToken) return null;

  const refreshToken =
    typeof body.refresh_token === "string" && body.refresh_token.trim()
      ? body.refresh_token.trim()
      : null;

  const expiresIn =
    typeof body.expires_in === "number" && Number.isFinite(body.expires_in)
      ? body.expires_in
      : null;

  // Google returns granted scopes space-delimited in `scope`.
  const grantedScopes =
    typeof body.scope === "string"
      ? body.scope.split(/\s+/).filter(Boolean)
      : [];

  return { accessToken, refreshToken, expiresInSeconds: expiresIn, grantedScopes };
}

/** Authorization code → tokens. The client secret travels in the body. */
export async function exchangeYouTubeAuthorizationCode(
  authorizationCode: string,
): Promise<YouTubeTokenResponse> {
  const config = getYouTubeOAuthConfig();

  const response = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: authorizationCode,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }).toString(),
  });

  const body = await readJson(response);

  if (!response.ok) {
    throw new YouTubeApiError(response.status, extractErrorCode(body));
  }

  const parsed = parseTokenResponse(body);
  if (!parsed) {
    // A 200 whose body we cannot read is not a success. Continuing would
    // store an empty credential and report a working connection.
    throw new YouTubeApiError(response.status, "unreadable_token_response");
  }

  return parsed;
}

/** Refresh token → a fresh access token. Google returns no new refresh token. */
export async function refreshYouTubeAccessToken(
  refreshToken: string,
): Promise<YouTubeTokenResponse> {
  const config = getYouTubeOAuthConfig();

  const response = await fetchWithTimeout(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
    }).toString(),
  });

  const body = await readJson(response);

  if (!response.ok) {
    throw new YouTubeApiError(response.status, extractErrorCode(body));
  }

  const parsed = parseTokenResponse(body);
  if (!parsed) {
    throw new YouTubeApiError(response.status, "unreadable_token_response");
  }

  return parsed;
}

export type YouTubeChannel = {
  readonly channelId: string;
  readonly title: string;
  readonly customUrl: string | null;
};

/**
 * The channels this credential can act for.
 *
 * `mine=true` returns the channels owned by the authorizing user. A Brand
 * Account the user merely manages is returned only when they picked it on
 * the consent screen, which is why the connection records WHICH channel it
 * landed on rather than assuming there is one.
 */
export async function fetchYouTubeChannels(
  accessToken: string,
): Promise<readonly YouTubeChannel[]> {
  const url = new URL(`${YOUTUBE_API_ORIGIN}/youtube/v3/channels`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("mine", "true");
  url.searchParams.set("maxResults", "50");

  const response = await fetchWithTimeout(url.toString(), {
    method: "GET",
    // The credential travels in the header, never the query string — a URL
    // reaches access logs, proxies and Referer headers.
    headers: { authorization: `Bearer ${accessToken}` },
  });

  const body = await readJson(response);

  if (!response.ok) {
    throw new YouTubeApiError(response.status, extractErrorCode(body));
  }

  if (!isRecord(body) || !Array.isArray(body.items)) {
    throw new YouTubeApiError(response.status, "unreadable_channel_response");
  }

  const channels: YouTubeChannel[] = [];
  for (const item of body.items) {
    if (!isRecord(item)) continue;
    const channelId = typeof item.id === "string" ? item.id.trim() : "";
    if (!channelId) continue;

    const snippet = isRecord(item.snippet) ? item.snippet : {};
    const title =
      typeof snippet.title === "string" && snippet.title.trim()
        ? snippet.title.trim()
        : channelId;
    const customUrl =
      typeof snippet.customUrl === "string" && snippet.customUrl.trim()
        ? snippet.customUrl.trim()
        : null;

    channels.push({ channelId, title, customUrl });
  }

  return channels;
}

/**
 * One video as YouTube reports it back. Every field is nullable because a
 * readback that cannot prove a fact must say so rather than default it — a
 * missing `privacyStatus` read as "private" is precisely the assumption the
 * private-only canary exists to rule out.
 */
export type YouTubeVideoStatus = {
  readonly videoId: string;
  readonly privacyStatus: string | null;
  readonly uploadStatus: string | null;
  readonly channelId: string | null;
  readonly title: string | null;
};
