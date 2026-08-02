import "server-only";

import { unstable_cache } from "next/cache";
import { getMapboxAccessToken } from "@/lib/mapbox/env";

export type GeocodedCoordinates = {
  lng: number;
  lat: number;
};

/** Process-lifetime L1 cache — avoids repeat Mapbox calls within one server instance. */
const memoryCache = new Map<string, GeocodedCoordinates | null>();

export function normalizeGeocodeAddress(address: string): string {
  return address
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

type MapboxGeocodeFeature = {
  center?: [number, number];
};

type MapboxGeocodeResponse = {
  features?: MapboxGeocodeFeature[];
};

async function fetchMapboxGeocode(
  address: string,
): Promise<GeocodedCoordinates | null> {
  const token = getMapboxAccessToken();
  if (!token) {
    return null;
  }

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`,
  );
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "1");
  url.searchParams.set("types", "address,place,locality,neighborhood,postcode");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    // Geocode results are stable; Next fetch cache complements unstable_cache.
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!response.ok) {
    console.error("[mapbox.geocode] request failed", {
      status: response.status,
      address,
    });
    return null;
  }

  const data = (await response.json()) as MapboxGeocodeResponse;
  const center = data.features?.[0]?.center;
  if (!center || center.length < 2) {
    return null;
  }

  const [lng, lat] = center;
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  return { lng, lat };
}

const cachedGeocodeAddress = unstable_cache(
  async (normalizedAddress: string): Promise<GeocodedCoordinates | null> => {
    return fetchMapboxGeocode(normalizedAddress);
  },
  ["mapbox-geocode-v1"],
  { revalidate: 60 * 60 * 24 * 30 },
);

/**
 * Forward-geocode a single address with L1 memory + Next data cache.
 * Returns null when Mapbox is unconfigured, the address is empty, or no match.
 */
export async function geocodeAddress(
  address: string,
): Promise<GeocodedCoordinates | null> {
  const normalized = normalizeGeocodeAddress(address);
  if (!normalized) {
    return null;
  }

  if (memoryCache.has(normalized)) {
    return memoryCache.get(normalized) ?? null;
  }

  const result = await cachedGeocodeAddress(normalized);
  memoryCache.set(normalized, result);
  return result;
}

/**
 * Geocode many addresses, deduping by normalized form and preserving input keys.
 */
export async function geocodeAddresses(
  addresses: string[],
): Promise<Map<string, GeocodedCoordinates>> {
  const uniqueNormalized = new Map<string, string>();

  for (const address of addresses) {
    const normalized = normalizeGeocodeAddress(address);
    if (!normalized || uniqueNormalized.has(normalized)) {
      continue;
    }
    uniqueNormalized.set(normalized, address.trim().replace(/\s+/g, " "));
  }

  const results = new Map<string, GeocodedCoordinates>();

  await Promise.all(
    [...uniqueNormalized.entries()].map(async ([normalized, display]) => {
      const coords = await geocodeAddress(display);
      if (coords) {
        results.set(normalized, coords);
      }
    }),
  );

  return results;
}
