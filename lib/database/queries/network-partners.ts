/**
 * Queries for `network_partners` — private partner CRM / "My Network" layer.
 *
 * Network Connections V1 stores trusted Altair directory companies as rows with
 * `linked_company_id` set. Not directory (`network_profiles`) or handoffs
 * (`network_referrals`). See `shared/components/network/README.md`.
 */

import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  NetworkPartnerInsert,
  NetworkPartnerRow,
} from "@/lib/database/types/core-tables";
import type { NetworkProfile } from "@/shared/types/network-referral";
import type { NetworkPartner } from "@/shared/types/network-partner";
import type { TradeType } from "@/shared/types/network";

const TRADE_TYPES = new Set<string>([
  "HVAC",
  "Plumbing",
  "Electrical",
  "Roofing",
  "General Contracting",
  "Landscaping",
  "Painting",
]);

function normalizeTradeType(value: string): TradeType {
  return TRADE_TYPES.has(value)
    ? (value as TradeType)
    : "General Contracting";
}

function mapNetworkPartnerRow(row: NetworkPartnerRow): NetworkPartner {
  return {
    id: row.id,
    companyId: row.company_id,
    linkedCompanyId: row.linked_company_id ?? undefined,
    partnerCompanyName: row.partner_company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    tradeType: normalizeTradeType(row.trade_type),
    serviceArea: row.service_area,
    city: row.city,
    state: row.state,
    relationshipStatus: row.relationship_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Active linked Altair partners in the source company's private network list. */
export async function listMyNetworkPartners(
  companyId: string,
): Promise<NetworkPartner[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_partners")
    .select("*")
    .eq("company_id", companyId)
    .not("linked_company_id", "is", null)
    .eq("relationship_status", "active")
    .order("partner_company_name", { ascending: true });

  if (error) {
    console.error("[listMyNetworkPartners] query failed:", error);
    return [];
  }

  return (data ?? []).map(mapNetworkPartnerRow);
}

export async function getNetworkPartnerByLinkedCompanyId(
  companyId: string,
  linkedCompanyId: string,
): Promise<NetworkPartner | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_partners")
    .select("*")
    .eq("company_id", companyId)
    .eq("linked_company_id", linkedCompanyId)
    .eq("relationship_status", "active")
    .maybeSingle();

  if (error) {
    console.error("[getNetworkPartnerByLinkedCompanyId] query failed:", error);
    return null;
  }

  return data ? mapNetworkPartnerRow(data) : null;
}

export async function getNetworkPartnerById(
  companyId: string,
  partnerId: string,
): Promise<NetworkPartner | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_partners")
    .select("*")
    .eq("company_id", companyId)
    .eq("id", partnerId)
    .maybeSingle();

  if (error) {
    console.error("[getNetworkPartnerById] query failed:", error);
    return null;
  }

  return data ? mapNetworkPartnerRow(data) : null;
}

export async function addLinkedNetworkPartner(
  companyId: string,
  profile: NetworkProfile,
): Promise<{ partner: NetworkPartner | null; error: string | null }> {
  if (profile.companyId === companyId) {
    return { partner: null, error: "You cannot add your own company to your network." };
  }

  const existing = await getNetworkPartnerByLinkedCompanyId(
    companyId,
    profile.companyId,
  );
  if (existing) {
    return { partner: existing, error: null };
  }

  const supabase = await createClient();
  const row: NetworkPartnerInsert = {
    company_id: companyId,
    linked_company_id: profile.companyId,
    partner_company_name: profile.displayName,
    trade_type: profile.tradeType,
    service_area: profile.serviceArea,
    city: profile.city,
    state: profile.state,
    relationship_status: "active",
  };

  const { data, error } = await supabase
    .from("network_partners")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    return { partner: null, error: mapDatabaseError(error) };
  }

  return { partner: mapNetworkPartnerRow(data), error: null };
}

export async function removeLinkedNetworkPartner(
  companyId: string,
  partnerId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("network_partners")
    .delete()
    .eq("company_id", companyId)
    .eq("id", partnerId)
    .not("linked_company_id", "is", null);

  if (error) {
    return { error: mapDatabaseError(error) };
  }

  return { error: null };
}
