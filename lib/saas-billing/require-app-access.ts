import "server-only";

import { redirect } from "next/navigation";
import {
  SUBSCRIPTION_ACTIVATION_PATH,
  billingPolicyAllowsAppShell,
  companyHasFullApplicationAccess,
} from "@/lib/saas-billing/app-access-policy";
import { getRequestCompanyBillingAccess } from "@/lib/saas-billing/request-access";
import type { CompanyBillingAccess } from "@/lib/saas-billing/types";

export { SUBSCRIPTION_ACTIVATION_PATH, companyHasFullApplicationAccess };

/**
 * Shared server-side gate for authenticated admin/technician application shells.
 * Must be called only after membership/company context is resolved.
 * Uses the trusted billing resolver (service-role read after authz).
 *
 * The decision comes from `evaluateBillingPolicy` (through the resolver), so a
 * `past_due` subscription inside its grace window keeps the company working
 * instead of locking every technician out on the first card decline. See
 * `billingPolicyAllowsAppShell` for which states pass.
 */
export async function requireCompanyBillingAppAccess(
  companyId: string,
): Promise<CompanyBillingAccess> {
  const access = await getRequestCompanyBillingAccess(companyId);

  if (billingPolicyAllowsAppShell(access)) {
    return access;
  }

  console.info("[saas-billing] app access denied", {
    companyId,
    status: access.status,
    state: access.state,
    isComped: access.isComped,
    planKey: access.planKey,
  });

  redirect(SUBSCRIPTION_ACTIVATION_PATH);
}
