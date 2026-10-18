"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/database/auth";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { setCompanyAccessGrant } from "@/lib/database/services/platform-access-grants";
import { recordSecurityAuditEvent } from "@/lib/security/audit";
import type { SaasAccessGrant } from "@/lib/saas-billing/types";

export type PlatformAccessGrantActionResult = {
  error?: string;
  success?: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function revalidateAffectedPaths() {
  revalidatePath("/platform");
  // The comped company's own shell, settings and paywall read the row on
  // every render, but the dashboard's upgrade card and the billing page
  // are cached per route; refresh them so the change shows at once.
  revalidatePath("/", "layout");
  revalidatePath("/activate-subscription");
  revalidatePath("/settings/billing");
}

/**
 * The authorization boundary. The control lives on /platform, which is
 * already admin-only, but a Server Action is callable without the page: the
 * check is here, in the action, every time.
 */
async function updateCompanyAccessGrant(
  companyId: string,
  grant: SaasAccessGrant,
): Promise<PlatformAccessGrantActionResult> {
  const user = await getCurrentUser();

  if (!user || !canAccessPlatformAdmin(user)) {
    return { error: "You do not have permission to change access grants." };
  }

  const normalizedCompanyId = companyId.trim();

  if (!UUID_PATTERN.test(normalizedCompanyId)) {
    return { error: "Choose a company first." };
  }

  const result = await setCompanyAccessGrant(normalizedCompanyId, grant);

  if (!result.ok) {
    return { error: result.error };
  }

  // Who comped whom, and when, is the kind of fact that should outlive the
  // session that did it.
  await recordSecurityAuditEvent({
    event:
      grant === "beta_comped"
        ? "platform.access_grant_set"
        : "platform.access_grant_cleared",
    outcome: "succeeded",
    userId: user.id,
    companyId: normalizedCompanyId,
    metadata: { grant },
  });

  revalidateAffectedPaths();

  return {
    success:
      grant === "beta_comped"
        ? `${result.companyName} now has complimentary access.`
        : `Complimentary access removed from ${result.companyName}.`,
  };
}

/** Sets `company_subscriptions.access_grant = 'beta_comped'` for one company. */
export async function grantCompanyBetaCompAction(
  companyId: string,
): Promise<PlatformAccessGrantActionResult> {
  return updateCompanyAccessGrant(companyId, "beta_comped");
}

/** Clears the complimentary grant; the company is paywalled again unless Stripe says otherwise. */
export async function clearCompanyBetaCompAction(
  companyId: string,
): Promise<PlatformAccessGrantActionResult> {
  return updateCompanyAccessGrant(companyId, "none");
}
