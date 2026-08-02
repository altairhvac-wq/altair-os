"use server";

import { redirect } from "next/navigation";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { hasCompanyRole } from "@/lib/database/types/roles";
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
 * Starts Facebook Page Connect (pages_show_list + public_profile only).
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
