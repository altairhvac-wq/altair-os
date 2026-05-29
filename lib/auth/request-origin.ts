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

function shouldPreferRequestOrigin(
  envOrigin: string,
  requestOrigin: string,
): boolean {
  if (envOrigin === requestOrigin) {
    return false;
  }

  const requestHost = new URL(requestOrigin).host;

  return (
    requestHost.endsWith(".vercel.app") ||
    requestHost.startsWith("localhost") ||
    requestHost.startsWith("127.0.0.1")
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
