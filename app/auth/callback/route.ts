import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { resolveAuthCallbackDestination } from "@/lib/auth/post-auth";
import type { Database } from "@/lib/database/types";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
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
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  const destination = await resolveAuthCallbackDestination(
    nextParam,
    redirectToParam,
    typeParam,
  );

  return NextResponse.redirect(`${origin}${destination}`);
}
