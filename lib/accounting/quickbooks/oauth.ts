import "server-only";

import { QboError } from "@/lib/accounting/quickbooks/errors";
import {
  getQuickBooksConfig,
  INTUIT_AUTHORIZE_URL,
  INTUIT_REVOKE_URL,
  INTUIT_TOKEN_URL,
  QUICKBOOKS_SCOPE,
} from "@/lib/accounting/quickbooks/env";

/**
 * Intuit OAuth 2.0: the sign-in link, the code exchange, refresh and revoke.
 *
 * Rules from Intuit that shape this file:
 *   - An access token lives one hour. A refresh token lives 100 days from its
 *     last use, and Intuit hands back a NEW refresh token on refresh: the
 *     newest one must always be the one stored (lib/accounting/connection.ts).
 *   - Two refreshes at once can get the token revoked. Callers serialise.
 *   - Nothing returned or thrown here contains a token. Intuit's own error
 *     words are not forwarded; a refused grant becomes QboError "auth".
 */

const REQUEST_TIMEOUT_MS = 20_000;

export type QuickBooksTokens = {
  readonly accessToken: string;
  readonly accessTokenExpiresAt: Date;
  readonly refreshToken: string;
  readonly refreshTokenExpiresAt: Date | null;
};

export function buildQuickBooksAuthorizeUrl(state: string): string {
  const config = getQuickBooksConfig();
  const url = new URL(INTUIT_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", QUICKBOOKS_SCOPE);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

function basicAuth(): string {
  const config = getQuickBooksConfig();
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`;
}

async function tokenRequest(form: Record<string, string>): Promise<QuickBooksTokens> {
  let response: Response;
  try {
    response = await fetch(INTUIT_TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuth(),
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(form).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new QboError({ kind: "network" });
  }
  const intuitTid = response.headers.get("intuit_tid");

  if (response.status === 400 || response.status === 401) {
    // invalid_grant: the code or refresh token is used up, expired or revoked.
    throw new QboError({ kind: "auth", intuitTid });
  }
  if (response.status === 429) {
    throw new QboError({ kind: "rate_limit", intuitTid, retryAfterSeconds: 60 });
  }
  if (!response.ok) {
    throw new QboError({ kind: "server", intuitTid });
  }

  const body = (await response.json().catch(() => null)) as {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    x_refresh_token_expires_in?: unknown;
  } | null;
  const accessToken = typeof body?.access_token === "string" ? body.access_token : "";
  const refreshToken = typeof body?.refresh_token === "string" ? body.refresh_token : "";
  if (!accessToken || !refreshToken) {
    throw new QboError({ kind: "server", intuitTid });
  }
  const now = Date.now();
  const accessSeconds = typeof body?.expires_in === "number" ? body.expires_in : 3600;
  const refreshSeconds = typeof body?.x_refresh_token_expires_in === "number" ? body.x_refresh_token_expires_in : null;
  return {
    accessToken,
    accessTokenExpiresAt: new Date(now + accessSeconds * 1000),
    refreshToken,
    refreshTokenExpiresAt: refreshSeconds ? new Date(now + refreshSeconds * 1000) : null,
  };
}

export function exchangeQuickBooksCode(code: string): Promise<QuickBooksTokens> {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: getQuickBooksConfig().redirectUri,
  });
}

export function refreshQuickBooksTokens(refreshToken: string): Promise<QuickBooksTokens> {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}

/**
 * Tell Intuit to forget the connection. Best effort: a disconnect in Altair
 * always deletes the stored keys, whether or not Intuit answers.
 */
export async function revokeQuickBooksToken(refreshToken: string): Promise<boolean> {
  try {
    const response = await fetch(INTUIT_REVOKE_URL, {
      method: "POST",
      headers: {
        Authorization: basicAuth(),
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: refreshToken }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}
