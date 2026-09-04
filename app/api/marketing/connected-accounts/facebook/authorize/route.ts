import { NextResponse } from "next/server";
import { canManageIntegrations } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import {
  createMarketingOAuthState,
  normalizeMarketingOAuthRedirectPath,
} from "@/lib/integrations/oauth-state";
import {
  getMissingFacebookOAuthEnvVars,
  isFacebookOAuthConfigured,
} from "@/lib/integrations/facebook/env";
import { buildFacebookOAuthAuthorizationUrl } from "@/lib/integrations/facebook/oauth-url";

export const runtime = "nodejs";
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
 * Starts Facebook Connect from Settings → Integrations.
 *
 * ============ A SECOND DOOR, NOT A REPLACEMENT ============
 * `startFacebookOAuthConnectAction` remains the Marketing Hub's entry point
 * and is untouched: it is the only connect path with live customer
 * connections behind it, and rewiring a working credential flow as a side
 * effect of building a different provider's route is how a change takes down
 * the thing it was not about.
 *
 * This route exists because the capability matrix advertises a `connectPath`
 * and the Integrations page renders it as a link. That path pointed at
 * nothing until now — a Connect button that navigates to a 404 — which
 * `verify-youtube-connect.mjs` found by comparing the matrix against the
 * filesystem. Both doors mint the same state through the same helper, build
 * the same authorization URL, and land on the same existing callback.
 *
 * The guards mirror the YouTube route exactly; the reasoning for each is
 * written out there.
 */
export async function GET(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return back(request, { connect_error: "denied", provider: "facebook" });
  }

  const context = await getActiveCompanyContext();
  if (!context) {
    return back(request, { connect_error: "state", provider: "facebook" });
  }

  if (!canManageIntegrations(context)) {
    return back(request, { connect_error: "denied", provider: "facebook" });
  }

  if (!isIntegrationEncryptionConfigured()) {
    return back(request, { connect_error: "config", provider: "facebook" });
  }

  if (!isFacebookOAuthConfigured()) {
    console.error("[facebook/authorize] not configured:", {
      missing: getMissingFacebookOAuthEnvVars(),
    });
    return back(request, { connect_error: "config", provider: "facebook" });
  }

  const requestedRedirect = new URL(request.url).searchParams.get("redirect");
  const redirectPath =
    normalizeMarketingOAuthRedirectPath(requestedRedirect) ?? RETURN_PATH;

  const state = await createMarketingOAuthState({
    companyId: context.company.id,
    userId: context.user.id,
    provider: "facebook",
    redirectPath,
  });

  if (state.error || !state.state) {
    return back(request, { connect_error: "state", provider: "facebook" });
  }

  let authorizationUrl: string;
  try {
    authorizationUrl = buildFacebookOAuthAuthorizationUrl({
      state: state.state,
    });
  } catch (error) {
    console.error("[facebook/authorize] authorization URL failed:", error);
    return back(request, { connect_error: "config", provider: "facebook" });
  }

  return NextResponse.redirect(authorizationUrl);
}
