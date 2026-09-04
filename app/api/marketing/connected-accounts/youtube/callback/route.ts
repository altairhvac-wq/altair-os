import { NextResponse } from "next/server";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import {
  consumeMarketingOAuthState,
  normalizeMarketingOAuthRedirectPath,
} from "@/lib/integrations/oauth-state";
import { completeYouTubeConnect } from "@/lib/integrations/youtube/complete-connect";
import { isYouTubeOAuthConfigured } from "@/lib/integrations/youtube/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FALLBACK_PATH = "/settings/integrations";

function appendQuery(path: string, params: Record<string, string>): string {
  const url = new URL(path, "http://altair.local");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

function redirectBack(
  request: Request,
  path: string,
  params: Record<string, string>,
) {
  return NextResponse.redirect(
    new URL(appendQuery(path, params), request.url),
  );
}

/**
 * YouTube OAuth callback — the path `YOUTUBE_REDIRECT_URI` defaults to.
 *
 * ============ THE STATE IS THE ONLY THING TRUSTED HERE ============
 * Everything else on this request arrives from Google via the customer's
 * browser and is attacker-influenceable. The company and the user are read
 * from the consumed state row, NEVER from the query string — that is what
 * stops a code minted for one company from completing into another. The
 * consume is a compare-and-swap on `status = 'pending'` scoped to this
 * provider, so a state is single-use and cannot be replayed here or at
 * another provider's callback.
 *
 * ============ EVERY FAILURE LANDS SOMEWHERE A HUMAN CAN SEE ============
 * The outcome is always a redirect carrying a closed error code that
 * `formatIntegrationConnectFlash` maps to copy. Google's own error strings
 * are never echoed into the redirect: they arrive on a query string, and
 * painting attacker-influenceable text into a page is how a connection
 * screen becomes an injection surface.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code")?.trim() ?? "";
  const rawState = params.get("state")?.trim() ?? "";
  const oauthError = params.get("error")?.trim() ?? "";

  if (!isYouTubeOAuthConfigured() || !isIntegrationEncryptionConfigured()) {
    return redirectBack(request, FALLBACK_PATH, {
      connect_error: "config",
      provider: "youtube",
    });
  }

  if (oauthError) {
    // Google sends `access_denied` when the customer declines. That is an
    // ordinary outcome, not a fault, and it reads differently to a human
    // than a provider error does.
    return redirectBack(request, FALLBACK_PATH, {
      connect_error: oauthError === "access_denied" ? "denied" : "provider",
      provider: "youtube",
    });
  }

  if (!code || !rawState) {
    return redirectBack(request, FALLBACK_PATH, {
      connect_error: "state",
      provider: "youtube",
    });
  }

  const consumed = await consumeMarketingOAuthState({
    rawState,
    provider: "youtube",
  });

  if (consumed.error || !consumed.companyId || !consumed.createdBy) {
    // Expired, already used, or minted for a different provider. All three
    // are the same answer to the customer — start again — and distinguishing
    // them here would tell an attacker which of their guesses was closest.
    return redirectBack(request, FALLBACK_PATH, {
      connect_error: "state",
      provider: "youtube",
    });
  }

  const redirectPath =
    normalizeMarketingOAuthRedirectPath(consumed.redirectPath) ?? FALLBACK_PATH;

  const result = await completeYouTubeConnect({
    companyId: consumed.companyId,
    connectedBy: consumed.createdBy,
    authorizationCode: code,
  });

  if (result.errorCode === "no_channels") {
    return redirectBack(request, redirectPath, {
      connect_error: "no_accounts",
      provider: "youtube",
    });
  }

  if (result.errorCode || result.error) {
    return redirectBack(request, redirectPath, {
      connect_error: result.errorCode ?? "persist",
      provider: "youtube",
    });
  }

  return redirectBack(request, redirectPath, {
    connected: "1",
    provider: "youtube",
  });
}
