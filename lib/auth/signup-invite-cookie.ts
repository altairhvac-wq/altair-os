import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

/** HttpOnly cookie binding the signup page to the invite link the user opened. */
export const SIGNUP_NETWORK_INVITE_COOKIE = "signup_network_invite_token";

const SIGNUP_INVITE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

const SIGNUP_INVITE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: SIGNUP_INVITE_COOKIE_MAX_AGE_SECONDS,
  path: "/",
};

/** Sync invite cookie from the signup URL query param (middleware-safe). */
export function syncSignupNetworkInviteCookieOnResponse(
  response: NextResponse,
  inviteToken: string | null | undefined,
): void {
  const token = inviteToken?.trim();

  if (token) {
    response.cookies.set(
      SIGNUP_NETWORK_INVITE_COOKIE,
      token,
      SIGNUP_INVITE_COOKIE_OPTIONS,
    );
    return;
  }

  response.cookies.delete(SIGNUP_NETWORK_INVITE_COOKIE);
}

export async function setSignupNetworkInviteCookie(rawToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SIGNUP_NETWORK_INVITE_COOKIE, rawToken, SIGNUP_INVITE_COOKIE_OPTIONS);
}

export async function readSignupNetworkInviteCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SIGNUP_NETWORK_INVITE_COOKIE)?.value?.trim();
  return value || null;
}

export async function clearSignupNetworkInviteCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SIGNUP_NETWORK_INVITE_COOKIE);
}

/**
 * Resolves the invite token for signup.
 * Rejects mismatched form/cookie pairs (token swap). Allows a form-only token
 * when the cookie expired but the hidden field still holds the original link token.
 */
export function resolveSignupNetworkInviteToken(input: {
  formToken: string | null;
  cookieToken: string | null;
}): { token: string | null; error?: string } {
  const formToken = input.formToken?.trim() || null;
  const cookieToken = input.cookieToken?.trim() || null;

  if (formToken && cookieToken && formToken !== cookieToken) {
    return {
      token: null,
      error:
        "This invitation link does not match your signup session. Open the invite link again and retry.",
    };
  }

  return { token: cookieToken ?? formToken };
}
