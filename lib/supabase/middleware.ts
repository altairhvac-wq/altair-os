import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database/types";
import {
  resolvePostLoginRedirect,
  sanitizeNextPath,
} from "@/lib/auth/redirects";
import { syncSignupNetworkInviteCookieOnResponse } from "@/lib/auth/signup-invite-cookie";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { getSupabaseEnv } from "./env";

const AUTH_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];
const PRICING_ROUTE = "/pricing";
const INSTALL_ROUTE = "/install";
const AUTH_CALLBACK_ROUTE = "/auth/callback";
const ESTIMATE_APPROVAL_ROUTE_PREFIX = "/estimate-approval";
const INVOICE_PAYMENT_ROUTE_PREFIX = "/invoice-payment";
const PAYMENT_WEBHOOK_ROUTE = "/api/webhooks/payments";
const WORKFLOW_REMINDERS_CRON_ROUTE = "/api/cron/workflow-reminders";

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isEstimateApprovalRoute(pathname: string) {
  return (
    pathname === ESTIMATE_APPROVAL_ROUTE_PREFIX ||
    pathname.startsWith(`${ESTIMATE_APPROVAL_ROUTE_PREFIX}/`)
  );
}

function isInvoicePaymentRoute(pathname: string) {
  return (
    pathname === INVOICE_PAYMENT_ROUTE_PREFIX ||
    pathname.startsWith(`${INVOICE_PAYMENT_ROUTE_PREFIX}/`)
  );
}

function isPaymentWebhookRoute(pathname: string) {
  return pathname === PAYMENT_WEBHOOK_ROUTE;
}

function isWorkflowRemindersCronRoute(pathname: string) {
  return pathname === WORKFLOW_REMINDERS_CRON_ROUTE;
}

function isPricingRoute(pathname: string) {
  return pathname === PRICING_ROUTE;
}

function isInstallRoute(pathname: string) {
  return pathname === INSTALL_ROUTE;
}

function isPublicRoute(pathname: string) {
  return (
    isAuthRoute(pathname) ||
    isPricingRoute(pathname) ||
    isInstallRoute(pathname) ||
    pathname === AUTH_CALLBACK_ROUTE ||
    isEstimateApprovalRoute(pathname) ||
    isInvoicePaymentRoute(pathname) ||
    isPaymentWebhookRoute(pathname) ||
    isWorkflowRemindersCronRoute(pathname)
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

function isSignupRoute(pathname: string) {
  return pathname === "/signup" || pathname.startsWith("/signup/");
}

function applySignupInviteCookieSync(
  request: NextRequest,
  response: NextResponse,
  pathname: string,
): NextResponse {
  if (!isSignupRoute(pathname)) {
    return response;
  }

  syncSignupNetworkInviteCookieOnResponse(
    response,
    request.nextUrl.searchParams.get("invite"),
  );

  return response;
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

  return applySignupInviteCookieSync(request, supabaseResponse, pathname);
}
