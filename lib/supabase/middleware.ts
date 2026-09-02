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
/** Public legal documents — linked from the marketing footer. */
const LEGAL_ROUTES = ["/privacy", "/terms"];
/**
 * Published website pages (migration 187) and the sitemap that advertises
 * them.
 *
 * ============ WHY THIS EXEMPTION EXISTS ============
 * These are the marketing site's own articles. A page that 307s an anonymous
 * visitor to /login is not published in any sense that matters: a reader sees
 * a login form, and a crawler indexes the redirect rather than the article.
 * The first live site canary hit exactly that — the page existed, was
 * `published`, had a canonical, and was unreachable.
 *
 * Being public here is not a hole. `marketing_site_pages` RLS exposes only
 * `page_state = 'published'` to anon, and the route reads through the
 * anon-key client, so a draft still 404s for a logged-out visitor. The
 * middleware decides who may KNOCK; the policy decides what they may see.
 */
const SITE_PAGE_ROUTE_PREFIX = "/insights";
const SITEMAP_ROUTE = "/sitemap.xml";
const INSTALL_ROUTE = "/install";
/** Internal rewrite target for the logged-out Mission Control homepage at `/`. */
const MARKETING_HOMEPAGE_ROUTE = "/welcome";
const AUTH_CALLBACK_ROUTE = "/auth/callback";
const ESTIMATE_APPROVAL_ROUTE_PREFIX = "/estimate-approval";
const INVOICE_PAYMENT_ROUTE_PREFIX = "/invoice-payment";
const PAYMENT_WEBHOOK_ROUTE = "/api/webhooks/payments";
const BILLING_WEBHOOK_ROUTE = "/api/webhooks/billing";
/**
 * All cron routes are public at the middleware layer; each handler enforces
 * its own CRON_SECRET bearer check (lib/automation/env.ts), which is the
 * real security boundary. Without this, Vercel cron invocations get 307'd
 * to /login and never execute.
 */
const CRON_ROUTE_PREFIX = "/api/cron/";
/** Dev-only fingerprint check for the Altair Demo Tool preflight guard. */
const DEMO_FINGERPRINT_ROUTE = "/api/demo/fingerprint";
/** Dev-only session-validity check for the Altair Demo Tool (capture contract). */
const DEMO_SESSION_ROUTE = "/api/demo/session";
/**
 * Machine-to-machine media ingest. Public at this layer for the same reason
 * the cron and agent routes are: the render pipeline posting here has no
 * browser session, so without the exemption an unauthenticated POST is 307'd
 * to /login and the handler never runs. The route enforces its own
 * ALTAIR_MEDIA_INGEST_SECRET bearer check, which is the real boundary.
 */
const MARKETING_MEDIA_INGEST_ROUTE = "/api/marketing/media/ingest";

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

/** Recovery session must stay on this route to set a new password. */
function isResetPasswordRoute(pathname: string) {
  return (
    pathname === "/reset-password" || pathname.startsWith("/reset-password/")
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
  return (
    pathname === PAYMENT_WEBHOOK_ROUTE ||
    pathname === `${PAYMENT_WEBHOOK_ROUTE}/`
  );
}

function isBillingWebhookRoute(pathname: string) {
  return (
    pathname === BILLING_WEBHOOK_ROUTE ||
    pathname === `${BILLING_WEBHOOK_ROUTE}/`
  );
}

function isCronRoute(pathname: string) {
  return pathname.startsWith(CRON_ROUTE_PREFIX);
}

function isMarketingMediaIngestRoute(pathname: string) {
  return (
    pathname === MARKETING_MEDIA_INGEST_ROUTE ||
    pathname === `${MARKETING_MEDIA_INGEST_ROUTE}/`
  );
}

function isDemoFingerprintRoute(pathname: string) {
  return (
    pathname === DEMO_FINGERPRINT_ROUTE ||
    pathname === `${DEMO_FINGERPRINT_ROUTE}/` ||
    // /api/demo/session (capture contract): answers "is this saved session
    // signed in" and must therefore be reachable WITHOUT one — a redirect
    // to /login is precisely the signed-out case it exists to report. The
    // route is dev-only (404 elsewhere) and discloses validity only.
    pathname === DEMO_SESSION_ROUTE ||
    pathname === `${DEMO_SESSION_ROUTE}/`
  );
}

function isPricingRoute(pathname: string) {
  return pathname === PRICING_ROUTE;
}

function isLegalRoute(pathname: string) {
  return LEGAL_ROUTES.includes(pathname);
}

/** A published article, or the index of them. Never a draft — RLS decides. */
function isSitePageRoute(pathname: string) {
  return (
    pathname === SITE_PAGE_ROUTE_PREFIX ||
    pathname.startsWith(`${SITE_PAGE_ROUTE_PREFIX}/`)
  );
}

function isSitemapRoute(pathname: string) {
  return pathname === SITEMAP_ROUTE;
}

function isInstallRoute(pathname: string) {
  return pathname === INSTALL_ROUTE;
}

function isMarketingHomepageRoute(pathname: string) {
  return (
    pathname === "/" ||
    pathname === MARKETING_HOMEPAGE_ROUTE ||
    pathname.startsWith(`${MARKETING_HOMEPAGE_ROUTE}/`)
  );
}

/**
 * Agent Platform bridge routes are public at the middleware layer by design,
 * exactly like the cron routes above: each handler enforces its own
 * `AGENT_INGEST_SECRET` bearer check. Without this they would be 307'd to
 * /login and the laptop-side platform could never deliver a snapshot.
 */
function isAgentBridgeRoute(pathname: string) {
  return pathname === "/api/agent" || pathname.startsWith("/api/agent/");
}

function isPublicRoute(pathname: string) {
  return (
    isAuthRoute(pathname) ||
    isPricingRoute(pathname) ||
    isLegalRoute(pathname) ||
    isSitePageRoute(pathname) ||
    isSitemapRoute(pathname) ||
    isInstallRoute(pathname) ||
    isMarketingHomepageRoute(pathname) ||
    pathname === AUTH_CALLBACK_ROUTE ||
    isEstimateApprovalRoute(pathname) ||
    isInvoicePaymentRoute(pathname) ||
    isPaymentWebhookRoute(pathname) ||
    isBillingWebhookRoute(pathname) ||
    isCronRoute(pathname) ||
    isAgentBridgeRoute(pathname) ||
    isMarketingMediaIngestRoute(pathname) ||
    isDemoFingerprintRoute(pathname)
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

  // Logged-out visitors see the Mission Control homepage at `/`.
  // Authenticated users keep the existing dashboard at `/`.
  if (!user && pathname === "/") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = MARKETING_HOMEPAGE_ROUTE;
    return withSupabaseCookies(
      NextResponse.rewrite(rewriteUrl),
      supabaseResponse,
    );
  }

  if (!user && !isPublicRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return withSupabaseCookies(
      NextResponse.redirect(redirectUrl),
      supabaseResponse,
    );
  }

  // Logged-in users leave login/signup/forgot-password, but must stay on
  // /reset-password after the recovery callback creates a session.
  if (user && isAuthRoute(pathname) && !isResetPasswordRoute(pathname)) {
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
