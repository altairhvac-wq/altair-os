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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
      return authCallbackErrorRedirect(origin);
    }
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
    typeParam,
  );

  return withSupabaseCookies(
    NextResponse.redirect(`${origin}${destination}`),
    supabaseResponse,
  );
}
