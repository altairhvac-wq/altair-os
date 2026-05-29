import { headers } from "next/headers";
import { AUTH_CALLBACK_PATH } from "@/lib/auth/constants";
import { resolveAppBaseUrl } from "@/lib/email/env";

/**
 * Resolves the public origin for auth redirect URLs.
 * Prefers NEXT_PUBLIC_APP_URL / VERCEL_URL, then request headers for local dev.
 */
export async function getRequestOrigin(): Promise<string | null> {
  const resolved = resolveAppBaseUrl();

  if (resolved.ok) {
    return resolved.url;
  }

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

  return `${protocol}://${host}`;
}

export function buildAuthCallbackUrl(origin: string, nextPath?: string | null): string {
  const url = new URL(AUTH_CALLBACK_PATH, origin);

  if (nextPath) {
    url.searchParams.set("next", nextPath);
  }

  return url.toString();
}
