"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { getMarketingConnectedAccountById } from "@/lib/database/queries/marketing-connected-accounts";
import { setConnectionPublishingPause } from "@/lib/database/queries/marketing-connected-accounts-admin";
import { hasCompanyRole } from "@/lib/database/types/roles";
import { isIntegrationProvider } from "@/shared/types/integration-provider";
import type { MarketingConnectedAccount } from "@/shared/types/marketing-connected-account";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import {
  isFacebookOAuthConfigured,
  getMissingFacebookOAuthEnvVars,
} from "@/lib/integrations/facebook/env";
import { buildFacebookOAuthAuthorizationUrl } from "@/lib/integrations/facebook/oauth-url";
import {
  createMarketingOAuthState,
  normalizeMarketingOAuthRedirectPath,
} from "@/lib/integrations/oauth-state";

export type StartFacebookOAuthConnectActionResult = {
  error?: string;
};

async function assertFacebookConnectManager() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  // Matches marketing_connected_accounts RLS: owner/admin write.
  if (!hasCompanyRole(context.role, ["owner", "admin"])) {
    return {
      error: "Only company owners and admins can connect marketing accounts.",
    } as const;
  }

  return { context } as const;
}

/**
 * Starts Facebook Page Connect with publish scopes (Pages + Instagram Content Publishing).
 * Redirects to Meta's consent screen on success.
 */
export async function startFacebookOAuthConnectAction(
  redirectPath?: string,
): Promise<StartFacebookOAuthConnectActionResult> {
  const permission = await assertFacebookConnectManager();
  if ("error" in permission) {
    return { error: permission.error };
  }

  if (!isIntegrationEncryptionConfigured()) {
    return {
      error:
        "Integration encryption is not configured. Set INTEGRATIONS_ENCRYPTION_KEY (openssl rand -base64 32), then try again.",
    };
  }

  if (!isFacebookOAuthConfigured()) {
    const missing = getMissingFacebookOAuthEnvVars();
    return {
      error: `Facebook OAuth is not configured. Missing: ${missing.join(", ")}.`,
    };
  }

  const safeRedirectPath =
    normalizeMarketingOAuthRedirectPath(redirectPath) ?? "/marketing";

  const stateResult = await createMarketingOAuthState({
    companyId: permission.context.company.id,
    userId: permission.context.user.id,
    provider: "facebook",
    redirectPath: safeRedirectPath,
  });

  if (stateResult.error || !stateResult.state) {
    return {
      error: stateResult.error ?? "Failed to start Facebook connection.",
    };
  }

  let authorizationUrl: string;

  try {
    authorizationUrl = buildFacebookOAuthAuthorizationUrl({
      state: stateResult.state,
    });
  } catch (error) {
    console.error("[startFacebookOAuthConnectAction] auth URL failed:", error);
    return {
      error: "Failed to build Facebook authorization URL.",
    };
  }

  redirect(authorizationUrl);
}

/* ====================================================================== *
 *                        THE PER-CHANNEL PAUSE
 * ====================================================================== */

export type SetPublishingPauseActionResult = {
  error?: string;
  account?: MarketingConnectedAccount;
};

/**
 * Pause or resume publishing through one connected account (migration 205).
 *
 * `provider` is the channel to pause: omitted or equal to the row's own
 * provider pauses the whole row; "instagram" on a Facebook Page row pauses
 * Instagram alone (a metadata flag — the Page row serves both). Platform
 * admin AND company owner/admin, because this is the one lever that stops a
 * destination the automation would otherwise publish to, and the row is
 * owner/admin-writable under RLS.
 */
export async function setConnectedAccountPublishingPauseAction(input: {
  connectedAccountId: string;
  provider?: string | null;
  paused: boolean;
  reason?: string | null;
}): Promise<SetPublishingPauseActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }
  if (!canAccessPlatformAdmin(context.user)) {
    return { error: "Only platform admins can pause or resume publishing channels." };
  }
  if (!hasCompanyRole(context.role, ["owner", "admin"])) {
    return {
      error: "Only company owners and admins can pause or resume publishing channels.",
    };
  }

  const connectedAccountId =
    typeof input?.connectedAccountId === "string" ? input.connectedAccountId.trim() : "";
  if (!connectedAccountId) {
    return { error: "A connected account is required." };
  }
  if (typeof input.paused !== "boolean") {
    return { error: "Say whether the channel should be paused or resumed." };
  }
  const provider =
    typeof input.provider === "string" && input.provider.trim()
      ? input.provider.trim()
      : null;
  if (provider !== null && !isIntegrationProvider(provider)) {
    return { error: "Unknown publishing provider." };
  }
  const reason =
    typeof input.reason === "string" && input.reason.trim()
      ? input.reason.trim().slice(0, 500)
      : null;

  // Company-scoped read first: the service-role write below must never reach
  // a row that is not this company's.
  const account = await getMarketingConnectedAccountById(
    context.company.id,
    connectedAccountId,
  );
  if (!account || account.companyId !== context.company.id) {
    return { error: "Connected account not found." };
  }
  if (provider !== null && provider !== account.provider) {
    // The only shared-row case today: Instagram publishes through a Facebook
    // Page row. Anything else is a mismatch, not a sub-channel.
    const sharesRow = account.provider === "facebook" && provider === "instagram";
    if (!sharesRow) {
      return {
        error: `This connection is ${account.provider}, not ${provider}. Pick the matching connection.`,
      };
    }
  }

  const result = await setConnectionPublishingPause({
    connectedAccountId: account.id,
    provider,
    paused: input.paused,
    reason,
  });
  if (result.error || !result.account) {
    return { error: result.error ?? "Could not update the publishing pause." };
  }

  revalidatePath("/marketing");
  revalidatePath("/settings/integrations");
  return { account: result.account };
}
