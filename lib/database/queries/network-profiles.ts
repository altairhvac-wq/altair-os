/**
 * Queries for `network_profiles` — public/internal directory profiles.
 *
 * Not to be confused with `network_partners` (private partner CRM) or
 * `network_referrals` (lead handoff). See `shared/components/network/README.md`.
 */

import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  NetworkProfileInsert,
  NetworkProfileRow,
} from "@/lib/database/types/core-tables";
import type { NetworkProfile } from "@/shared/types/network-referral";
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

function mapNetworkProfileRow(row: NetworkProfileRow): NetworkProfile {
  return {
    id: row.id,
    companyId: row.company_id,
    displayName: row.display_name,
    tradeType: normalizeTradeType(row.trade_type),
    serviceArea: row.service_area,
    city: row.city,
    state: row.state,
    bio: row.bio ?? undefined,
    isVisible: row.is_visible,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getNetworkProfileByCompanyId(
  companyId: string,
): Promise<NetworkProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_profiles")
    .select("*")
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    console.error("[getNetworkProfileByCompanyId] query failed:", error);
    return null;
  }

  return data ? mapNetworkProfileRow(data) : null;
}

export async function getNetworkProfileById(
  profileId: string,
): Promise<NetworkProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_profiles")
    .select("*")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    console.error("[getNetworkProfileById] query failed:", error);
    return null;
  }

  return data ? mapNetworkProfileRow(data) : null;
}

export async function getVisibleNetworkProfileById(
  profileId: string,
): Promise<NetworkProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_profiles")
    .select("*")
    .eq("id", profileId)
    .eq("is_visible", true)
    .maybeSingle();

  if (error) {
    console.error("[getVisibleNetworkProfileById] query failed:", error);
    return null;
  }

  return data ? mapNetworkProfileRow(data) : null;
}

export async function listVisibleNetworkProfiles(
  excludeCompanyId: string,
): Promise<NetworkProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_profiles")
    .select("*")
    .eq("is_visible", true)
    .neq("company_id", excludeCompanyId)
    .order("display_name", { ascending: true });

  if (error) {
    console.error("[listVisibleNetworkProfiles] query failed:", error);
    return [];
  }

  return (data ?? []).map(mapNetworkProfileRow);
}

export async function ensureCompanyNetworkProfile(
  companyId: string,
  displayName: string,
): Promise<{ profile: NetworkProfile | null; error: string | null }> {
  const existing = await getNetworkProfileByCompanyId(companyId);
  if (existing) {
    return { profile: existing, error: null };
  }

  const supabase = await createClient();
  const row: NetworkProfileInsert = {
    company_id: companyId,
    display_name: displayName.trim() || "Company",
    is_visible: false,
  };

  const { data, error } = await supabase
    .from("network_profiles")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    return {
      profile: null,
      error: mapDatabaseError(error),
    };
  }

  return { profile: mapNetworkProfileRow(data), error: null };
}

export async function updateCompanyNetworkProfileVisibility(
  companyId: string,
  isVisible: boolean,
): Promise<{ profile: NetworkProfile | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("network_profiles")
    .update({ is_visible: isVisible })
    .eq("company_id", companyId)
    .select("*")
    .maybeSingle();

  if (error) {
    return { profile: null, error: mapDatabaseError(error) };
  }

  return {
    profile: data ? mapNetworkProfileRow(data) : null,
    error: data ? null : "Network profile not found.",
  };
}
