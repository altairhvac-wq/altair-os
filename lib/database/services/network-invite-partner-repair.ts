import { createClient } from "@/lib/supabase/server";

/**
 * Idempotently creates missing bidirectional network_partners rows for accepted
 * invites where `companyId` is the source or accepted company. Does not
 * reactivate rows with relationship_status = removed.
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
