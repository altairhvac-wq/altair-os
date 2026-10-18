import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthCallbackDestination } from "@/lib/auth/post-auth";
import type { Database } from "@/lib/database/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email",
  "email_change",
]);

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && EMAIL_OTP_TYPES.has(value as EmailOtpType);
}

function authCallbackErrorRedirect(origin: string) {
  return NextResponse.redirect(`${origin}/login?error=auth_callback`);
}

/**
 * The flow a PKCE code was minted for.
 *
 * auth-js records "recovery" alongside the code verifier when the verifier
 * was created by `resetPasswordForEmail`, and hands it back from the exchange
 * as `redirectType` — but does not include it in the declared return type.
 * It is the only reliable signal in the PKCE flow that this is a password
 * reset: Supabase's redirect carries `?code=` and nothing else.
 */
function readPkceRedirectType(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const value = (data as { redirectType?: unknown }).redirectType;
  return typeof value === "string" && value ? value : null;
}

function withSupabaseCookies(
  target: NextResponse,
  source: NextResponse,
): NextResponse {
  source.cookies.getAll().forEach(({ name, value, ...options }) => {
    target.cookies.set(name, value, options);
  });

  return target;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const accessToken = requestUrl.searchParams.get("access_token");
  const refreshToken = requestUrl.searchParams.get("refresh_token");
  const nextParam = requestUrl.searchParams.get("next");
  const redirectToParam = requestUrl.searchParams.get("redirect_to");
  const typeParam = requestUrl.searchParams.get("type");
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");

  if (errorParam) {
    console.error("[auth/callback] provider error:", {
      error: errorParam,
      description: errorDescription,
    });
    return authCallbackErrorRedirect(origin);
  }

  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  let pkceRedirectType: string | null = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      // The common cause: the link was opened in a different browser or
      // device from the one that submitted the form, so the PKCE verifier
      // cookie is not here. Named so the log says what to do about it.
      console.error("[auth/callback] exchangeCodeForSession failed:", {
        code: error.code,
        message: error.message,
        verifierMissing: error.code === "pkce_code_verifier_missing" || error.name === "AuthPKCECodeVerifierMissingError",
      });
      return authCallbackErrorRedirect(origin);
    }

    pkceRedirectType = readPkceRedirectType(data);
  } else if (tokenHash && isEmailOtpType(typeParam)) {
    const { error } = await supabase.auth.verifyOtp({
      type: typeParam,
      token_hash: tokenHash,
    });

    if (error) {
      console.error("[auth/callback] verifyOtp failed:", error.message);
      return authCallbackErrorRedirect(origin);
    }
  } else if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error("[auth/callback] setSession failed:", error.message);
      return authCallbackErrorRedirect(origin);
    }
  } else {
    return authCallbackErrorRedirect(origin);
  }

  const destination = await resolveAuthCallbackDestination(
    nextParam,
    redirectToParam,
    typeParam ?? pkceRedirectType,
  );

  return withSupabaseCookies(
    NextResponse.redirect(`${origin}${destination}`),
    supabaseResponse,
  );
}
