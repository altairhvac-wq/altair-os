import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database/types";
import {
  resolvePostLoginRedirect,
  sanitizeNextPath,
} from "@/lib/auth/redirects";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getSupabaseEnv } from "./env";

const AUTH_ROUTES = ["/login", "/signup"];
const AUTH_CALLBACK_ROUTE = "/auth/callback";

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isPublicRoute(pathname: string) {
  return (
    isAuthRoute(pathname) || pathname === AUTH_CALLBACK_ROUTE
  );
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

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = getSupabaseEnv();

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
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublicRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return withSupabaseCookies(
      NextResponse.redirect(redirectUrl),
      supabaseResponse,
    );
  }

  if (user && isAuthRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    const companyContext = await getActiveCompanyContext();
    const nextParam = request.nextUrl.searchParams.get("next");

    if (!companyContext) {
      redirectUrl.pathname = "/setup";
      const safeNext = sanitizeNextPath(nextParam);
      redirectUrl.search = safeNext ? `next=${encodeURIComponent(safeNext)}` : "";
    } else {
      redirectUrl.pathname = resolvePostLoginRedirect(
        companyContext,
        nextParam,
      );
      redirectUrl.search = "";
    }

    return withSupabaseCookies(
      NextResponse.redirect(redirectUrl),
      supabaseResponse,
    );
  }

  return supabaseResponse;
}
