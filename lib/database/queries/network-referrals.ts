/**
 * Queries for `network_referrals` — cross-company lead handoffs.
 *
 * Accepted referrals may spawn leads via `network-referral-lead.ts`.
 * Not partner CRM (`network_partners`). See `shared/components/network/README.md`.
 */

import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  NetworkReferralInsert,
  NetworkReferralRow,
  NetworkReferralUpdate,
} from "@/lib/database/types/core-tables";
import type { LeadNetworkReferralSummary } from "@/shared/types/lead";
import type { NetworkReferral } from "@/shared/types/network-referral";

type NetworkReferralRowWithRelations = NetworkReferralRow & {
  source_company?: { id: string; name: string } | null;
  target_company?: { id: string; name: string } | null;
  source_user?: { id: string; full_name: string | null; email: string } | null;
  target_lead?: { id: string; status: string } | null;
};

function resolveProfileName(
  profile?: { full_name: string | null; email: string } | null,
): string | undefined {
  if (!profile) {
    return undefined;
  }

  return profile.full_name?.trim() || profile.email;
}

function mapNetworkReferralRow(row: NetworkReferralRowWithRelations): NetworkReferral {
  return {
    id: row.id,
    sourceCompanyId: row.source_company_id,
    targetCompanyId: row.target_company_id,
    sourceUserId: row.source_user_id,
    targetLeadId: row.target_lead_id ?? undefined,
    sourceNetworkProfileId: row.source_network_profile_id ?? undefined,
    targetNetworkProfileId: row.target_network_profile_id ?? undefined,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    serviceAddress: row.service_address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    requestedService: row.requested_service,
    urgency: row.urgency,
    notes: row.notes ?? undefined,
    incentiveNote: row.incentive_note ?? undefined,
    status: row.status,
    declineReason: row.decline_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sourceCompanyName: row.source_company?.name,
    targetCompanyName: row.target_company?.name,
    sourceUserName: resolveProfileName(row.source_user),
    targetLeadStatus: row.target_lead?.status as NetworkReferral["targetLeadStatus"],
  };
}

const REFERRAL_SELECT = `
  *,
  source_company:companies!network_referrals_source_company_id_fkey (
    id,
    name
  ),
  target_company:companies!network_referrals_target_company_id_fkey (
    id,
    name
  ),
  source_user:profiles!network_referrals_source_user_id_fkey (
    id,
    full_name,
    email
  ),
  target_lead:leads!network_referrals_target_lead_id_fkey (
    id,
    status
  )
`;

export async function listSentNetworkReferrals(
  sourceCompanyId: string,
): Promise<NetworkReferral[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_referrals")
    .select(REFERRAL_SELECT)
    .eq("source_company_id", sourceCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listSentNetworkReferrals] query failed:", error);
    return [];
  }

  return (data ?? []).map((row) =>
    mapNetworkReferralRow(row as NetworkReferralRowWithRelations),
  );
}

export async function listReceivedNetworkReferrals(
  targetCompanyId: string,
): Promise<NetworkReferral[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_referrals")
    .select(REFERRAL_SELECT)
    .eq("target_company_id", targetCompanyId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listReceivedNetworkReferrals] query failed:", error);
    return [];
  }

  return (data ?? []).map((row) =>
    mapNetworkReferralRow(row as NetworkReferralRowWithRelations),
  );
}

export async function getNetworkReferralById(
  referralId: string,
): Promise<NetworkReferral | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_referrals")
    .select(REFERRAL_SELECT)
    .eq("id", referralId)
    .maybeSingle();

  if (error) {
    console.error("[getNetworkReferralById] query failed:", error);
    return null;
  }

  return data
    ? mapNetworkReferralRow(data as NetworkReferralRowWithRelations)
    : null;
}

export async function insertNetworkReferral(
  row: NetworkReferralInsert,
): Promise<{ referral: NetworkReferral | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_referrals")
    .insert(row)
    .select(REFERRAL_SELECT)
    .single();

  if (error || !data) {
    return {
      referral: null,
      error: mapDatabaseError(error),
    };
  }

  return {
    referral: mapNetworkReferralRow(data as NetworkReferralRowWithRelations),
    error: null,
  };
}

export async function updateNetworkReferral(
  referralId: string,
  updates: NetworkReferralUpdate,
  targetCompanyId: string,
): Promise<{ referral: NetworkReferral | null; error: string | null }> {
  if (updates.status !== "accepted" && updates.status !== "declined") {
    return {
      referral: null,
      error: "Unsupported referral update.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "update_received_network_referral_status",
    {
      p_referral_id: referralId,
      p_target_company_id: targetCompanyId,
      p_status: updates.status,
      p_decline_reason: updates.decline_reason ?? null,
    },
  );

  if (error || !data) {
    return {
      referral: null,
      error: mapDatabaseError(error),
    };
  }

  const referral = await getNetworkReferralById(referralId);
  return {
    referral,
    error: referral ? null : "Referral not found.",
  };
}

export async function getNetworkReferralsByLeadIds(
  companyId: string,
  leadIds: string[],
): Promise<Map<string, LeadNetworkReferralSummary>> {
  if (leadIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_referrals")
    .select(
      `
      id,
      source_company_id,
      source_network_profile_id,
      target_lead_id,
      source_company:companies!network_referrals_source_company_id_fkey (
        id,
        name
      ),
      source_user:profiles!network_referrals_source_user_id_fkey (
        id,
        full_name,
        email
      )
    `,
    )
    .eq("target_company_id", companyId)
    .in("target_lead_id", leadIds);

  if (error) {
    console.error("[getNetworkReferralsByLeadIds] query failed:", error);
    return new Map();
  }

  const result = new Map<string, LeadNetworkReferralSummary>();

  for (const row of data ?? []) {
    if (!row.target_lead_id) {
      continue;
    }

    const sourceCompany = row.source_company as { id: string; name: string } | null;
    const sourceUser = row.source_user as
      | { id: string; full_name: string | null; email: string }
      | null;

    result.set(row.target_lead_id, {
      referralId: row.id,
      sourceCompanyId: row.source_company_id,
      sourceCompanyName: sourceCompany?.name ?? "Partner company",
      sourceUserName: resolveProfileName(sourceUser),
      sourceNetworkProfileId: row.source_network_profile_id ?? undefined,
    });
  }

  return result;
}

export async function getNetworkReferralByLeadId(
  companyId: string,
  leadId: string,
): Promise<LeadNetworkReferralSummary | null> {
  const map = await getNetworkReferralsByLeadIds(companyId, [leadId]);
  return map.get(leadId) ?? null;
}

export async function syncNetworkReferralOutcomeForLeadRpc(
  leadId: string,
  targetCompanyId: string,
  newStatus: Extract<
    NetworkReferral["status"],
    "converted" | "won" | "lost"
  >,
): Promise<{ updated: boolean; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "sync_network_referral_outcome_for_lead",
    {
      p_lead_id: leadId,
      p_target_company_id: targetCompanyId,
      p_new_status: newStatus,
    },
  );

  if (error) {
    return {
      updated: false,
      error: mapDatabaseError(error),
    };
  }

  return {
    updated: Boolean(data),
    error: null,
  };
}
