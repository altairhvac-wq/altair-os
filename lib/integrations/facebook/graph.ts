import "server-only";

import { getFacebookOAuthConfig } from "./env";

export type FacebookOAuthToken = {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
};

export type FacebookUserProfile = {
  id: string;
  name: string;
};

export type FacebookPageSummary = {
  id: string;
  name: string;
  accessToken?: string;
  category?: string;
  tasks?: string[];
};

type FacebookGraphErrorBody = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

function graphBaseUrl(version: string): string {
  return `https://graph.facebook.com/${version}`;
}

async function readFacebookJson<T>(
  response: Response,
  context: string,
): Promise<T> {
  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new Error(`${context}: Facebook returned a non-JSON response.`);
  }

  if (!response.ok) {
    const graphError = body as FacebookGraphErrorBody;
    const message =
      graphError.error?.message?.trim() ||
      `${context}: Facebook request failed (${response.status}).`;
    throw new Error(message);
  }

  return body as T;
}

/**
 * Exchange a Facebook OAuth authorization code for a short-lived user access token.
 */
export async function exchangeFacebookAuthorizationCode(
  code: string,
): Promise<FacebookOAuthToken> {
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    throw new Error("Facebook authorization code is required.");
  }

  const config = getFacebookOAuthConfig();
  const url = new URL(`${graphBaseUrl(config.graphApiVersion)}/oauth/access_token`);
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("client_secret", config.appSecret);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("code", trimmedCode);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const data = await readFacebookJson<{
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  }>(response, "Facebook code exchange");

  if (!data.access_token?.trim()) {
    throw new Error("Facebook code exchange did not return an access token.");
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
    expiresIn:
      typeof data.expires_in === "number" && Number.isFinite(data.expires_in)
        ? data.expires_in
        : undefined,
  };
}

/**
 * Exchange a short-lived user token for a long-lived user token (~60 days).
 */
export async function exchangeFacebookShortLivedToken(
  shortLivedAccessToken: string,
): Promise<FacebookOAuthToken> {
  const trimmed = shortLivedAccessToken.trim();
  if (!trimmed) {
    throw new Error("Facebook access token is required.");
  }

  const config = getFacebookOAuthConfig();
  const url = new URL(`${graphBaseUrl(config.graphApiVersion)}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", config.appId);
  url.searchParams.set("client_secret", config.appSecret);
  url.searchParams.set("fb_exchange_token", trimmed);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const data = await readFacebookJson<{
    access_token?: string;
    token_type?: string;
    expires_in?: number;
  }>(response, "Facebook long-lived token exchange");

  if (!data.access_token?.trim()) {
    throw new Error(
      "Facebook long-lived token exchange did not return an access token.",
    );
  }

  return {
    accessToken: data.access_token,
    tokenType: data.token_type,
    expiresIn:
      typeof data.expires_in === "number" && Number.isFinite(data.expires_in)
        ? data.expires_in
        : undefined,
  };
}

export async function fetchFacebookUserProfile(
  accessToken: string,
): Promise<FacebookUserProfile> {
  const config = getFacebookOAuthConfig();
  const url = new URL(`${graphBaseUrl(config.graphApiVersion)}/me`);
  url.searchParams.set("fields", "id,name");
  url.searchParams.set("access_token", accessToken);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const data = await readFacebookJson<{ id?: string; name?: string }>(
    response,
    "Facebook user profile",
  );

  if (!data.id?.trim()) {
    throw new Error("Facebook user profile did not return an id.");
  }

  return {
    id: data.id,
    name: data.name?.trim() || data.id,
  };
}

/**
 * Lists Pages visible with `pages_show_list` via GET /me/accounts.
 * Read-only connect stage — does not require posting scopes.
 */
type FacebookPagesListResponse = {
  data?: Array<{
    id?: string;
    name?: string;
    access_token?: string;
    category?: string;
    tasks?: string[];
  }>;
  paging?: { next?: string };
};

export async function fetchFacebookPages(
  accessToken: string,
): Promise<FacebookPageSummary[]> {
  const config = getFacebookOAuthConfig();
  const pages: FacebookPageSummary[] = [];
  const initialUrl = new URL(
    `${graphBaseUrl(config.graphApiVersion)}/me/accounts`,
  );
  initialUrl.searchParams.set("fields", "id,name,access_token,category,tasks");
  initialUrl.searchParams.set("access_token", accessToken);

  let nextUrl: string | null = initialUrl.toString();

  while (nextUrl) {
    const response: Response = await fetch(nextUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const data: FacebookPagesListResponse = await readFacebookJson<
      FacebookPagesListResponse
    >(response, "Facebook Pages list");

    for (const page of data.data ?? []) {
      if (!page.id?.trim()) {
        continue;
      }

      pages.push({
        id: page.id,
        name: page.name?.trim() || page.id,
        accessToken: page.access_token?.trim() || undefined,
        category: page.category?.trim() || undefined,
        tasks: Array.isArray(page.tasks) ? page.tasks : undefined,
      });
    }

    const pagingNext = data.paging?.next?.trim();
    nextUrl = pagingNext ? pagingNext : null;
  }

  return pages;
}
