import { NextResponse } from "next/server";
import { completeFacebookOAuthConnect } from "@/lib/integrations/facebook/complete-connect";
import {
  consumeMarketingOAuthState,
  normalizeMarketingOAuthRedirectPath,
} from "@/lib/integrations/oauth-state";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import { isFacebookOAuthConfigured } from "@/lib/integrations/facebook/env";

export const runtime = "nodejs";

function appendMarketingQuery(
  redirectPath: string,
  params: Record<string, string>,
): string {
  const url = new URL(redirectPath, "http://altair.local");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function resolveRedirectPath(redirectPath: string | null | undefined): string {
  return normalizeMarketingOAuthRedirectPath(redirectPath) ?? "/marketing";
}

function redirectToMarketing(
  request: Request,
  redirectPath: string,
  params: Record<string, string>,
) {
  const path = appendMarketingQuery(redirectPath, params);
  return NextResponse.redirect(new URL(path, request.url));
}

/**
 * Facebook OAuth callback expected by FACEBOOK_REDIRECT_URI /
 * lib/integrations/facebook/env.ts default path.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code")?.trim() ?? "";
  const rawState = requestUrl.searchParams.get("state")?.trim() ?? "";
  const oauthError = requestUrl.searchParams.get("error")?.trim() ?? "";
  const oauthErrorReason =
    requestUrl.searchParams.get("error_reason")?.trim() ?? "";

  if (!isFacebookOAuthConfigured() || !isIntegrationEncryptionConfigured()) {
    return redirectToMarketing(request, "/marketing", {
      facebook_error: "config",
    });
  }

  if (oauthError) {
    const denied =
      oauthError === "access_denied" ||
      oauthErrorReason === "user_denied";
    return redirectToMarketing(request, "/marketing", {
      facebook_error: denied ? "denied" : "provider",
    });
  }

  if (!code || !rawState) {
    return redirectToMarketing(request, "/marketing", {
      facebook_error: "state",
    });
  }

  const consumed = await consumeMarketingOAuthState({
    rawState,
    provider: "facebook",
  });

  if (
    consumed.error ||
    !consumed.companyId ||
    !consumed.createdBy
  ) {
    return redirectToMarketing(request, "/marketing", {
      facebook_error: "state",
    });
  }

  const redirectPath = resolveRedirectPath(consumed.redirectPath);

  const result = await completeFacebookOAuthConnect({
    companyId: consumed.companyId,
    connectedBy: consumed.createdBy,
    authorizationCode: code,
  });

  if (result.errorCode === "no_pages") {
    return redirectToMarketing(request, redirectPath, {
      facebook_error: "no_pages",
    });
  }

  if (result.error || result.errorCode) {
    return redirectToMarketing(request, redirectPath, {
      facebook_error: result.errorCode ?? "persist",
    });
  }

  return redirectToMarketing(request, redirectPath, {
    facebook: "connected",
    pages: String(result.pageCount ?? 0),
  });
}
