import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database/types";
import {
  resolvePostLoginRedirect,
  sanitizeNextPath,
} from "@/lib/auth/redirects";
import { syncSignupNetworkInviteCookieOnResponse } from "@/lib/auth/signup-invite-cookie";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { PUBLIC_SITE_ORIGIN } from "@/shared/lib/site/public-site";
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
/**
 * The free Contractor Business Resource Center: hub, calculators, template
 * downloads, guides and library. Constant content plus the same published
 * Insights pages (RLS-filtered) and public YouTube feeds; no account is
 * needed and nothing here reads or writes tenant data.
 */
const RESOURCES_ROUTE_PREFIX = "/resources";
const SITEMAP_ROUTE = "/sitemap.xml";
const INSTALL_ROUTE = "/install";
const CONTACT_ROUTE = "/contact";
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
/**
 * First-party analytics beacon (migration 202). Anonymous visitors send it, so
 * it must not redirect to /login. The handler refuses cross-site origins,
 * bots and non-production deployments itself, and writes nothing but a
 * sanitised event. Exact path only.
 */
const ANALYTICS_COLLECT_ROUTE = "/api/analytics/collect";

/**
 * Files a browser or crawler fetches on its own initiative, before anyone has
 * signed in: the crawl policy, the PWA manifest and service worker, the link
 * preview image and the home-screen icon. Behind the login redirect each one
 * fails in its own way — the service worker is refused outright ("the script
 * resource is behind a redirect"), robots.txt is read as "no policy", and a
 * link preview shows nothing (launch audit H6, M1). Exact paths only; nothing
 * beneath them is implied.
 */
const PUBLIC_WEB_ASSET_ROUTES = [
  "/robots.txt",
  "/manifest.webmanifest",
  "/sw.js",
  "/opengraph-image",
  "/apple-touch-icon.png",
  "/og.png",
];

/**
 * Where a signed-out visitor is sent to log in, and where they are told the
 * page does not exist.
 *
 * ============ WHY UNKNOWN PATHS 404 INSTEAD OF REDIRECTING ============
 * Every path that is not public used to redirect to /login?next=<path>. For a
 * real product route that is right: the visitor wanted the dashboard, they
 * get it after signing in. For a typo in a video caption it is wrong: a
 * stranger who mistyped the address is shown a sign-in form, with no sign
 * that the page they wanted never existed (launch audit M6).
 *
 * So the redirect is kept for the prefixes that ARE the signed-in product,
 * and anything else is rewritten to a path no route serves, which renders
 * app/not-found.tsx with a 404. The rewrite — rather than letting the request
 * through to the router — is what keeps this change from opening anything:
 * a product route missing from this list 404s for a visitor; it is never
 * served. (Each product layout re-checks the session regardless.)
 *
 * The list is the set of top-level route segments under app/(admin), plus the
 * other authenticated roots. Keep it in step with the route tree; a new
 * signed-in top-level segment that is not added here answers 404 to a
 * signed-out visitor instead of sending them to log in, which is the safe
 * failure.
 */
const AUTHENTICATED_ROUTE_PREFIXES = [
  // app/(admin)
  "/alpha-tracker",
  "/altair-design-lab",
  "/command-center-v1",
  "/community",
  "/customers",
  "/dashboard-north-star-v1",
  "/dashboard-north-star-v2",
  "/dispatch",
  "/estimates",
  "/expenses",
  "/invoices",
  "/jobs",
  "/leads",
  "/marketing",
  "/network",
  "/payments",
  "/payroll",
  "/platform",
  "/price-book",
  "/reports",
  "/sales",
  "/schedule",
  "/settings",
  "/team",
  "/technicians",
  "/time",
  "/time-clock",
  "/work",
  "/workspace-v1",
  // app/(concept)
  "/altair-shell-color-lab-v1",
  "/altair-shell-north-star-v1",
  "/altair-shell-north-star-v2",
  "/altair-shell-north-star-v3",
  // other authenticated roots
  "/technician",
  "/tech",
  "/setup",
  "/activate-subscription",
  "/auth",
  "/api",
];

/** A path no route serves; the rewrite target that renders app/not-found.tsx. */
const NOT_FOUND_REWRITE_PATH = "/__not-found";

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

function isResourcesRoute(pathname: string) {
  return (
    pathname === RESOURCES_ROUTE_PREFIX ||
    pathname.startsWith(`${RESOURCES_ROUTE_PREFIX}/`)
  );
}

function isSitemapRoute(pathname: string) {
  return pathname === SITEMAP_ROUTE;
}

function isInstallRoute(pathname: string) {
  return pathname === INSTALL_ROUTE;
}

function isContactRoute(pathname: string) {
  return pathname === CONTACT_ROUTE;
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

function isPublicWebAssetRoute(pathname: string) {
  return PUBLIC_WEB_ASSET_ROUTES.includes(pathname);
}

function isAuthenticatedAppRoute(pathname: string) {
  return AUTHENTICATED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** The public marketing site: what the canonical host alone should serve. */
function isMarketingRoute(pathname: string) {
  return (
    isMarketingHomepageRoute(pathname) ||
    isPricingRoute(pathname) ||
    isLegalRoute(pathname) ||
    isSitePageRoute(pathname) ||
    isResourcesRoute(pathname) ||
    isInstallRoute(pathname) ||
    isContactRoute(pathname)
  );
}

function isPublicRoute(pathname: string) {
  return (
    isAuthRoute(pathname) ||
    isPublicWebAssetRoute(pathname) ||
    isPricingRoute(pathname) ||
    isLegalRoute(pathname) ||
    isSitePageRoute(pathname) ||
    isResourcesRoute(pathname) ||
    isSitemapRoute(pathname) ||
    isInstallRoute(pathname) ||
    isContactRoute(pathname) ||
    isMarketingHomepageRoute(pathname) ||
    pathname === AUTH_CALLBACK_ROUTE ||
    isEstimateApprovalRoute(pathname) ||
    isInvoicePaymentRoute(pathname) ||
    isPaymentWebhookRoute(pathname) ||
    isBillingWebhookRoute(pathname) ||
    isCronRoute(pathname) ||
    isAgentBridgeRoute(pathname) ||
    isMarketingMediaIngestRoute(pathname) ||
    pathname === ANALYTICS_COLLECT_ROUTE ||
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

  // The marketing pages have one public address. The app host serves the
  // same routes (it has to: /login and the auth callback live there), so a
  // logged-out visitor who lands on app.<domain>/pricing is sent to the
  // canonical host rather than seeing a second copy of the site.
  if (!user && isMarketingRoute(pathname)) {
    const canonicalHost = new URL(PUBLIC_SITE_ORIGIN).host;
    const requestHost = request.nextUrl.host;
    const apex = canonicalHost.replace(/^www\./, "");
    if (
      requestHost !== canonicalHost &&
      requestHost !== apex &&
      requestHost.endsWith(`.${apex}`)
    ) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.host = canonicalHost;
      // `/welcome` is an internal rewrite target; its public address is `/`.
      if (isMarketingHomepageRoute(pathname)) redirectUrl.pathname = "/";
      return withSupabaseCookies(
        NextResponse.redirect(redirectUrl, 308),
        supabaseResponse,
      );
    }
  }

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

  // The homepage route reads no session of its own (so it can be served as
  // static HTML); a signed-in user who types /welcome belongs on the dashboard.
  if (user && pathname !== "/" && isMarketingHomepageRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return withSupabaseCookies(
      NextResponse.redirect(redirectUrl),
      supabaseResponse,
    );
  }

  if (!user && !isPublicRoute(pathname)) {
    if (isAuthenticatedAppRoute(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return withSupabaseCookies(
        NextResponse.redirect(redirectUrl),
        supabaseResponse,
      );
    }

    // Not public, not a product route: nothing lives here for anyone. Say so
    // (404 via app/not-found.tsx) rather than asking a stranger to sign in.
    const notFoundUrl = request.nextUrl.clone();
    notFoundUrl.pathname = NOT_FOUND_REWRITE_PATH;
    notFoundUrl.search = "";
    return withSupabaseCookies(
      NextResponse.rewrite(notFoundUrl),
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
