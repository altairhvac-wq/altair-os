/**
 * Queries for `network_profiles` — public/internal directory profiles.
 *
 * Not to be confused with `network_partners` (private partner CRM) or
 * `network_referrals` (lead handoff). See `shared/components/network/README.md`.
 */

import { selectInChunks } from "@/lib/database/queries/chunked-in";
import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { geocodeAddress } from "@/lib/mapbox/geocode";
import type {
  NetworkProfileInsert,
  NetworkProfileRow,
  NetworkProfileUpdate,
} from "@/lib/database/types/core-tables";
import type {
  NetworkProfile,
  NetworkProfileFormData,
} from "@/shared/types/network-referral";
import {
  deriveNetworkLocationPrecision,
} from "@/shared/types/network-referral";
import { normalizeNetworkTradeType } from "@/shared/types/network";

function mapNetworkProfileRow(row: NetworkProfileRow): NetworkProfile {
  return {
    id: row.id,
    companyId: row.company_id,
    displayName: row.display_name,
    tradeType: normalizeNetworkTradeType(row.trade_type),
    serviceArea: row.service_area,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code ?? "",
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    locationPrecision: row.location_precision ?? "none",
    showOnMap: row.show_on_map ?? false,
    acceptingReferrals: row.accepting_referrals ?? true,
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

/**
 * Approximate city/ZIP-level geocode for the "near me" radius search
 * (migration 139). Never geocodes a street address — this table
 * intentionally never stores one (see migration 085). Best-effort: a
 * Mapbox failure or missing token just leaves lat/lng unset, which simply
 * excludes this profile from radius search results until the next save.
 */
async function geocodeNetworkProfileLocation(input: {
  city: string;
  state: string;
  postalCode: string;
}): Promise<{ latitude: number | null; longitude: number | null }> {
  const queryParts = input.postalCode.trim()
    ? [input.city, input.state, input.postalCode].filter(Boolean)
    : [input.city, input.state].filter(Boolean);

  if (queryParts.length === 0) {
    return { latitude: null, longitude: null };
  }

  try {
    const coords = await geocodeAddress(queryParts.join(", "));
    if (!coords) {
      return { latitude: null, longitude: null };
    }
    return { latitude: coords.lat, longitude: coords.lng };
  } catch (error) {
    console.error("[updateCompanyNetworkProfile] geocode failed:", error);
    return { latitude: null, longitude: null };
  }
}

export async function updateCompanyNetworkProfile(
  companyId: string,
  input: NetworkProfileFormData,
): Promise<{ profile: NetworkProfile | null; error: string | null }> {
  const supabase = await createClient();
  const locationPrecision = deriveNetworkLocationPrecision({
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
  });
  const showOnMap =
    input.showOnMap && locationPrecision !== "none" ? true : false;

  const { latitude, longitude } =
    locationPrecision === "none"
      ? { latitude: null, longitude: null }
      : await geocodeNetworkProfileLocation({
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
        });

  const update: NetworkProfileUpdate = {
    display_name: input.displayName,
    trade_type: input.tradeType,
    city: input.city,
    state: input.state,
    postal_code: input.postalCode || null,
    service_area: input.serviceArea,
    bio: input.bio || null,
    is_visible: input.isVisible,
    location_precision: locationPrecision,
    show_on_map: showOnMap,
    accepting_referrals: input.acceptingReferrals,
    latitude,
    longitude,
  };

  const { data, error } = await supabase
    .from("network_profiles")
    .update(update)
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

/**
 * "Companies near me" radius search (migration 139's
 * get_nearby_network_profiles RPC). Geocodes the caller's free-text query
 * first (see searchNearbyNetworkCompaniesAction), then finds visible,
 * map-opted-in profiles within radiusMiles, nearest first.
 */
export async function findNearbyNetworkProfiles(
  excludeCompanyId: string,
  latitude: number,
  longitude: number,
  radiusMiles: number,
): Promise<{ profile: NetworkProfile; distanceMiles: number }[]> {
  const supabase = await createClient();
  const { data: nearby, error } = await supabase.rpc(
    "get_nearby_network_profiles",
    {
      p_lat: latitude,
      p_lng: longitude,
      p_radius_miles: radiusMiles,
      p_exclude_company_id: excludeCompanyId,
    },
  );

  if (error || !nearby || nearby.length === 0) {
    if (error) {
      console.error("[findNearbyNetworkProfiles] RPC failed:", error);
    }
    return [];
  }

  const distanceByProfileId = new Map(
    nearby.map((row) => [row.id, row.distance_miles]),
  );

  // Chunked — see lib/database/queries/chunked-in.ts. This id set comes from a
  // radius search, so it grows with how many partners are nearby rather than
  // with anything the caller controls.
  const { data: profileRows, error: profilesError } = await selectInChunks<
    NetworkProfileRow
  >(
    nearby.map((row) => row.id),
    (chunk) =>
      supabase.from("network_profiles").select("*").in("id", chunk),
  );

  if (profilesError || !profileRows) {
    console.error(
      "[findNearbyNetworkProfiles] profile lookup failed:",
      profilesError,
    );
    return [];
  }

  return profileRows
    .map((row) => ({
      profile: mapNetworkProfileRow(row),
      distanceMiles: distanceByProfileId.get(row.id) ?? 0,
    }))
    .sort((left, right) => left.distanceMiles - right.distanceMiles);
}
