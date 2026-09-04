"use server";

import { revalidatePath } from "next/cache";
import { assertIntegrationsManagementAccess } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { upsertMarketingConnectedResource } from "@/lib/database/queries/marketing-connected-accounts-admin";
import {
  getMissingAltairSiteEnvVars,
  isAltairSiteConfigured,
  getAltairSiteConfig,
} from "@/lib/integrations/altair-site/env";

export type EnableAltairSiteResult = { error?: string; enabled?: boolean };

/**
 * Turn the Altair website on as a publishing destination.
 *
 * ============ WHY THIS IS NOT AN OAUTH CONNECT ============
 * There is no third party to authorize. What this records is a
 * `marketing_connected_accounts` row for `altair_site`, which is what gives
 * the publish path a `connected_account_id` to hang a delivery on and gives
 * the Integrations card something true to report. Without it the card would
 * be permanently "Not connected" for a surface that works, and with a fake
 * row it would claim a connection that had never been checked.
 *
 * The capability is written from EVIDENCE, the same rule the YouTube connect
 * follows: `direct` only when the site origin actually resolves. A
 * deployment with no usable origin gets `none` and a detail naming the
 * variable, because a canonical URL cannot be built without one and a page
 * without a canonical is not publishable.
 */
export async function enableAltairSiteAction(): Promise<EnableAltairSiteResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };

  // The same permission every other integration mutation requires. A Server
  // Action is a public boundary; the disabled button in the UI is not the
  // check.
  const access = assertIntegrationsManagementAccess(context, context.company.id);
  if (access) return { error: access };

  const configured = isAltairSiteConfigured();

  const result = await upsertMarketingConnectedResource({
    companyId: context.company.id,
    connectedBy: context.user.id,
    provider: "altair_site",
    integrationKind: "first_party",
    // The site is the account and the resource. Both are spelled so the
    // partial unique index on (company, provider, resource) has something
    // stable to key on, and so the card can render an identity.
    providerAccountId: "altair-site",
    providerAccountName: "Altair website",
    providerResourceId: "altair-site",
    providerResourceName: configured
      ? getAltairSiteConfig().siteOrigin
      : "Altair website",
    // No delegated grant exists, so there is nothing to record as granted.
    // An empty list is the honest answer, not an oversight.
    scopes: [],
    grantedScopes: [],
    publishCapability: configured ? "direct" : "none",
    capabilityDetail: configured
      ? null
      : `The site origin is not configured, so no canonical URL can be built. Set ${getMissingAltairSiteEnvVars().join(", ")}.`,
    // Migration 181 forbids a token expiry on a first-party row. Null is
    // structural here, not a default.
    tokenExpiresAt: null,
  });

  if (result.error || !result.account) {
    return { error: result.error ?? "Could not enable the Altair website." };
  }

  revalidatePath("/settings/integrations");
  return { enabled: true };
}
