"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { geocodeAddress } from "@/lib/mapbox/geocode";
import { findNearbyNetworkProfiles } from "@/lib/database/queries/network-profiles";
import type { NetworkProfile } from "@/shared/types/network-referral";

export type NearbyNetworkCompany = {
  profile: NetworkProfile;
  distanceMiles: number;
};

const MAX_RADIUS_MILES = 200;
const MIN_RADIUS_MILES = 1;

export async function searchNearbyNetworkCompaniesAction(
  locationQuery: string,
  radiusMiles: number,
): Promise<{ results: NearbyNetworkCompany[]; error?: string }> {
  const context = await getActiveCompanyContext();
  if (!context) {
    return { results: [], error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageCompany) {
    return {
      results: [],
      error: "Only company owners and admins can search the directory.",
    };
  }

  const query = locationQuery.trim();
  if (!query) {
    return { results: [], error: "Enter a city, state, or ZIP to search." };
  }

  const clampedRadius = Math.min(
    MAX_RADIUS_MILES,
    Math.max(MIN_RADIUS_MILES, radiusMiles || 25),
  );

  const coords = await geocodeAddress(query).catch((error) => {
    console.error("[searchNearbyNetworkCompaniesAction] geocode failed:", error);
    return null;
  });

  if (!coords) {
    return {
      results: [],
      error:
        "We couldn't locate that area. Try a city and state, or a ZIP code.",
    };
  }

  const results = await findNearbyNetworkProfiles(
    context.company.id,
    coords.lat,
    coords.lng,
    clampedRadius,
  );

  return { results };
}
