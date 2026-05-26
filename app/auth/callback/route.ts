import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database/types";
import { resolvePostLoginRedirect, sanitizeNextPath } from "@/lib/auth/redirects";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const origin = requestUrl.origin;

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

  const companyContext = await getActiveCompanyContext();

  if (!companyContext) {
    const setupUrl = new URL("/setup", origin);
    const safeNext = sanitizeNextPath(nextParam);
    if (safeNext) {
      setupUrl.searchParams.set("next", safeNext);
    }
    return NextResponse.redirect(setupUrl);
  }

  const destination = resolvePostLoginRedirect(
    companyContext,
    nextParam ?? requestUrl.searchParams.get("redirect_to"),
  );

  return NextResponse.redirect(`${origin}${destination}`);
}
