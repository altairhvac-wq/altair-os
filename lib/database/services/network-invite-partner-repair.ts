import { createClient } from "@/lib/supabase/server";

/**
 * Idempotently creates or reactivates bidirectional network_partners rows for
 * every accepted invite where `companyId` is the source or accepted company.
 * Safe to call before My Network loads; does not expose cross-company invite data.
 */
export async function repairAcceptedInvitePartnerLinksForCompany(
  companyId: string,
): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc(
    "repair_accepted_invite_partner_links_for_company",
    { p_company_id: companyId },
  );

  if (error) {
    console.error(
      "[repairAcceptedInvitePartnerLinksForCompany] RPC failed:",
      { companyId, error: error.message },
    );
  }
}
