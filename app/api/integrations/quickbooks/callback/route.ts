import { NextResponse, type NextRequest } from "next/server";
import { saveQuickBooksSignIn } from "@/lib/accounting/connection";
import { HttpQboApi } from "@/lib/accounting/quickbooks/http-api";
import { exchangeQuickBooksCode } from "@/lib/accounting/quickbooks/oauth";
import { getQuickBooksConfig, isQuickBooksConfigured } from "@/lib/accounting/quickbooks/env";
import { QUICKBOOKS_STATE_COOKIE, readQuickBooksState } from "@/lib/accounting/quickbooks/oauth-state";
import { assertIntegrationsManagementAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";

/**
 * Where Intuit sends the owner back after "Connect QuickBooks".
 *
 * A public URL, so it trusts nothing it is given:
 *   - `state` must match the encrypted, HttpOnly cookie set when THIS owner
 *     pressed Connect, less than ten minutes ago (oauth-state.ts);
 *   - the signed-in session must be that same user, in that same company,
 *     and still an owner or admin of it;
 *   - realmId must be a number.
 * Only then is the code exchanged and the keys stored, encrypted.
 *
 * It always answers with a redirect (Intuit asks that a route receiving
 * tokens never render a page) and never puts a token or an Intuit error in
 * the URL: the settings page reads a fixed word from `quickbooks=`.
 */

export const dynamic = "force-dynamic";

function back(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.url), 302);
  response.cookies.set(QUICKBOOKS_STATE_COOKIE, "", { path: "/api/integrations/quickbooks", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isQuickBooksConfigured()) return back(request, "/settings/integrations?quickbooks=unavailable");

  const params = request.nextUrl.searchParams;
  if (params.get("error")) return back(request, "/settings/integrations?quickbooks=cancelled");

  const verified = readQuickBooksState(request.cookies.get(QUICKBOOKS_STATE_COOKIE)?.value, params.get("state"));
  if (!verified) return back(request, "/settings/integrations?quickbooks=expired");

  const context = await getActiveCompanyContext();
  if (
    !context ||
    context.user.id !== verified.userId ||
    context.company.id !== verified.companyId ||
    assertIntegrationsManagementAccess(context, context.company.id)
  ) {
    return back(request, "/settings/integrations?quickbooks=denied");
  }

  const code = params.get("code");
  const realmId = params.get("realmId");
  if (!code || !realmId || !/^\d{1,30}$/.test(realmId)) {
    return back(request, "/settings/integrations?quickbooks=failed");
  }

  try {
    const tokens = await exchangeQuickBooksCode(code);
    const environment = getQuickBooksConfig().environment;
    const facts = await new HttpQboApi({
      realmId,
      environment,
      getAccessToken: async () => tokens.accessToken,
    }).readCompanyFacts();

    const connection = await saveQuickBooksSignIn({
      companyId: context.company.id,
      userId: context.user.id,
      realmId,
      environment,
      tokens,
      companyName: facts.companyName,
      taxMode: facts.taxMode,
      customDocNumbers: facts.customDocNumbers,
    });
    return back(
      request,
      connection.status === "active"
        ? "/settings/integrations?quickbooks=reconnected"
        : "/settings/integrations/quickbooks",
    );
  } catch {
    console.error("[quickbooks-callback] connect failed", { companyId: context.company.id });
    return back(request, "/settings/integrations?quickbooks=failed");
  }
}
