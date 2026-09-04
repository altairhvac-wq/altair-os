import { NextResponse } from "next/server";
import {
  canManageIntegrations,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import {
  createMarketingOAuthState,
  normalizeMarketingOAuthRedirectPath,
} from "@/lib/integrations/oauth-state";
import {
  getMissingYouTubeOAuthEnvVars,
  isYouTubeOAuthConfigured,
} from "@/lib/integrations/youtube/env";
import { buildYouTubeAuthorizationUrl } from "@/lib/integrations/youtube/oauth-url";

export const runtime = "nodejs";
/**
 * Never cached, never prerendered. The response is a redirect carrying a
 * single-use state token; a cached one would hand the same token to the next
 * visitor, which is the one thing a CSRF token must never do.
 */
export const dynamic = "force-dynamic";

const RETURN_PATH = "/settings/integrations";

function back(request: Request, params: Record<string, string>) {
  const url = new URL(RETURN_PATH, request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

/**
 * Starts YouTube Connect.
 *
 * ============ WHY A GET ROUTE, AND WHAT GUARDS IT ============
 * OAuth begins with a top-level browser navigation, so this has to be a GET
 * a link can point at — which means a GET that writes (the single-use state
 * row). Three things keep that from being a CSRF hole:
 *
 *   1. FETCH METADATA. A cross-site initiation is refused before anything is
 *      written. Browsers set `Sec-Fetch-Site` themselves and page script
 *      cannot forge it, so an attacker's page cannot silently start a
 *      connection flow in a logged-in admin's browser. Requests with no such
 *      header at all (older clients, curl) are allowed through to the
 *      permission check rather than refused, because refusing them would
 *      break real browsers for a check the next two steps already cover.
 *   2. AUTHORIZATION. The active company and `manageIntegrations` are checked
 *      HERE, not merely in the UI that rendered the link. A Route Handler is
 *      a public boundary; hiding a button is not authorization.
 *   3. BINDING. The state row records the company and the user who started
 *      it, and the callback consumes it exactly once. A state minted for one
 *      company cannot complete into another.
 *
 * The route is additive: the Marketing Hub's existing Facebook connect is a
 * Server Action and is untouched.
 */
export async function GET(request: Request) {
  // ---------------------------------------------------------------- (1)
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return back(request, {
      connect_error: "denied",
      provider: "youtube",
    });
  }

  // ---------------------------------------------------------------- (2)
  const context = await getActiveCompanyContext();
  if (!context) {
    // Not signed in, or no active company. The login redirect is the shell's
    // job; from here the honest answer is that nothing was started.
    return back(request, { connect_error: "state", provider: "youtube" });
  }

  if (!canManageIntegrations(context)) {
    return back(request, { connect_error: "denied", provider: "youtube" });
  }

  // Configuration is checked before a state row is written, so a deployment
  // that cannot finish the flow does not accumulate pending rows.
  if (!isIntegrationEncryptionConfigured()) {
    return back(request, { connect_error: "config", provider: "youtube" });
  }

  if (!isYouTubeOAuthConfigured()) {
    // NAMES are logged, never values. The operator-facing message stays
    // generic; which variable is missing belongs in the server log and on
    // the Integrations page, which already renders the missing names.
    console.error("[youtube/authorize] not configured:", {
      missing: getMissingYouTubeOAuthEnvVars(),
    });
    return back(request, { connect_error: "config", provider: "youtube" });
  }

  const requestedRedirect = new URL(request.url).searchParams.get("redirect");
  const redirectPath =
    normalizeMarketingOAuthRedirectPath(requestedRedirect) ?? RETURN_PATH;

  // ---------------------------------------------------------------- (3)
  const state = await createMarketingOAuthState({
    companyId: context.company.id,
    userId: context.user.id,
    provider: "youtube",
    redirectPath,
  });

  if (state.error || !state.state) {
    return back(request, { connect_error: "state", provider: "youtube" });
  }

  let authorizationUrl: string;
  try {
    authorizationUrl = buildYouTubeAuthorizationUrl({ state: state.state });
  } catch (error) {
    // The builder throws on an unregistered scope or missing config. The
    // thrown message can name configuration, so it is logged and not shown.
    console.error("[youtube/authorize] authorization URL failed:", error);
    return back(request, { connect_error: "config", provider: "youtube" });
  }

  return NextResponse.redirect(authorizationUrl);
}
