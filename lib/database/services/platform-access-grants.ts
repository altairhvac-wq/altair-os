import "server-only";

import type { SaasAccessGrant } from "@/lib/saas-billing/types";
import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * Complimentary access, set from /platform.
 *
 * ============ WHY THIS EXISTS ============
 * Every company created since migration 124 is born `status='incomplete',
 * access_grant='none'` and is redirected to Checkout before its first screen.
 * The complimentary path (`access_grant='beta_comped'`) has been in the data
 * model since migration 120, but nothing in the product could set it —
 * comping an early client meant SQL in the Supabase editor (launch audit B2).
 * This is the product's way of doing it.
 *
 * It writes with the service role because the subscription row is not
 * something a company's own members may edit. Authorization — platform admin
 * only — happens in the Server Action before this is called; this module
 * trusts that and does not re-check.
 *
 * ============ ONLY THE GRANT CHANGES ============
 * `status` is Stripe's column and is left alone. The app-shell gate admits a
 * comped company whatever its status, and the billing policy already reads a
 * comp on an `incomplete`, `canceled` or absent status as ACTIVE, so a grant
 * on its own is a complete comp. Clearing it returns the company to whatever
 * its status says — for a never-paid company, the paywall.
 */

export type CompanyAccessGrantResult =
  | { ok: true; companyName: string; accessGrant: SaasAccessGrant }
  | { ok: false; error: string };

export async function setCompanyAccessGrant(
  companyId: string,
  grant: SaasAccessGrant,
): Promise<CompanyAccessGrantResult> {
  const supabase = createServiceRoleClient();

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .maybeSingle();

  if (companyError) {
    console.error("[platform-access-grants] company lookup failed:", {
      code: companyError.code,
    });
    return { ok: false, error: "Could not load that company. Try again." };
  }

  if (!company) {
    return { ok: false, error: "Company not found." };
  }

  // Upsert on the company_id unique constraint (migration 120). A company
  // bootstrapped before that migration and never backfilled has no row; the
  // insert path gives it one with the table defaults for everything else.
  const { error: writeError } = await supabase
    .from("company_subscriptions")
    .upsert(
      {
        company_id: companyId,
        access_grant: grant,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "company_id" },
    );

  if (writeError) {
    console.error("[platform-access-grants] write failed:", {
      code: writeError.code,
      grant,
    });
    return { ok: false, error: "Could not update the access grant. Try again." };
  }

  return { ok: true, companyName: company.name, accessGrant: grant };
}
