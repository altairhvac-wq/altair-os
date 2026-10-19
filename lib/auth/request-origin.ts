import { headers } from "next/headers";
import { AUTH_CALLBACK_PATH } from "@/lib/auth/constants";
import { resolveAppBaseUrl } from "@/lib/email/env";

export type AuthRedirectOriginSource =
  | "env"
  | "request-headers"
  | "none";

export type AuthRedirectOriginResolution = {
  origin: string | null;
  source: AuthRedirectOriginSource;
};

function normalizeRedirectOrigin(origin: string): string {
  const trimmed = origin.trim();

  if (!trimmed) {
    throw new Error("Auth redirect origin is empty.");
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed.replace(/^\/+/, "")}`;

  return new URL(withScheme).origin;
}

async function getOriginFromRequestHeaders(): Promise<string | null> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host");

  if (!host) {
    return null;
  }

  const protocol =
    headersList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host.split(",")[0]?.trim() ?? host}`;
}

/**
 * True when `requestHost` is the configured host or a sibling of it under the
 * same parent domain: with NEXT_PUBLIC_APP_URL = app.altair-op.com, both
 * www.altair-op.com and altair-op.com qualify; an unrelated host never does.
 */
export function isSiblingHost(envHost: string, requestHost: string): boolean {
  const env = envHost.toLowerCase();
  const request = requestHost.toLowerCase();
  if (env === request) return true;
  const labels = env.split(".");
  const parent = labels.length >= 3 ? labels.slice(1).join(".") : env;
  return request === parent || request.endsWith(`.${parent}`);
}

/**
 * ============ WHY THE LINK MUST RETURN TO THE HOST THE VISITOR USED ============
 * Signup and password reset run the PKCE flow: the server action stores a
 * code verifier in a host-only cookie on the host the visitor is on, and the
 * emailed link is exchanged at /auth/callback on the host it points to. The
 * marketing site and every "Start your trial" button live on
 * www.altair-op.com while NEXT_PUBLIC_APP_URL is app.altair-op.com, so a link
 * built from the env origin sent every homepage signup to a host without the
 * verifier, and the confirmation failed with auth_callback. Both hosts serve
 * the app and both callbacks are in the Supabase redirect allow-list, so the
 * request's own host is used whenever it belongs to the same site.
 */
export function shouldPreferRequestOrigin(
  envOrigin: string,
  requestOrigin: string,
): boolean {
  if (envOrigin === requestOrigin) {
    return false;
  }

  const requestUrl = new URL(requestOrigin);
  const requestHost = requestUrl.host;

  if (
    requestHost.endsWith(".vercel.app") ||
    requestHost.startsWith("localhost") ||
    requestHost.startsWith("127.0.0.1")
  ) {
    return true;
  }

  const envUrl = new URL(envOrigin);
  return (
    requestUrl.protocol === envUrl.protocol &&
    isSiblingHost(envUrl.host, requestHost)
  );
}

/**
 * Resolves the public origin for auth redirect URLs.
 * Prefers NEXT_PUBLIC_APP_URL / VERCEL_URL, but uses the live request host on
 * preview/local deployments when it differs from configured env.
 */
export async function resolveAuthRedirectOrigin(): Promise<AuthRedirectOriginResolution> {
  const requestOrigin = await getOriginFromRequestHeaders();
  const resolved = resolveAppBaseUrl();

  if (resolved.ok) {
    const envOrigin = normalizeRedirectOrigin(resolved.url);

    if (
      requestOrigin &&
      shouldPreferRequestOrigin(envOrigin, requestOrigin)
    ) {
      return { origin: requestOrigin, source: "request-headers" };
    }

    return { origin: envOrigin, source: "env" };
  }

  if (requestOrigin) {
    return { origin: requestOrigin, source: "request-headers" };
  }

  return { origin: null, source: "none" };
}

/** @deprecated Prefer resolveAuthRedirectOrigin for diagnostics. */
export async function getRequestOrigin(): Promise<string | null> {
  const { origin } = await resolveAuthRedirectOrigin();
  return origin;
}

/**
 * Builds an allowlist-friendly callback URL for Supabase auth emails.
 * Omit nextPath for password recovery; Supabase adds type=recovery on the link.
 */
export function buildAuthCallbackUrl(origin: string, nextPath?: string | null): string {
  const baseOrigin = normalizeRedirectOrigin(origin);
  const url = new URL(AUTH_CALLBACK_PATH, baseOrigin);

  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }

  return url.toString();
}
