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

/** Bounded wait for a single Mapbox call. See the comment on the fetch below. */
const GEOCODE_TIMEOUT_MS = 8000;

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

  // Bounded timeout: an unbounded fetch here means a network hiccup (proxy,
  // DNS, IPv6 stall) on the *server* process never resolves or rejects, and
  // the dispatch map's "Locating job addresses…" spinner never stops — no
  // error, no fallback, just forever. That is a real robustness gap, not
  // just a demo-capture nuisance: fail loud after a bounded wait instead,
  // matching the pipeline's own "loud failure" principle (docs/BUILD_PLAN.md
  // Stage 4/8). Investigated 2026-08-07: Mapbox itself answers in ~3ms to a
  // browser request from this machine with the same token, so a hang here
  // points at the Node dev-server's own outbound network path, not Mapbox
  // being down or the token being wrong.
  //
  // Intentionally left uncaught here (not wrapped in try/catch): a timeout
  // or network error propagates out of unstable_cache below WITHOUT being
  // cached — unstable_cache only stores successful returns — so a transient
  // failure can't poison the 30-day geocode cache with a false "unmappable"
  // result for this address. geocodeAddresses() catches it per-address and
  // reports it as unresolved for just this run.
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(GEOCODE_TIMEOUT_MS),
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
 * Throws on a timeout/network error so the cache layer never stores a false
 * negative — callers that want a best-effort batch should catch per-address
 * (see geocodeAddresses).
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
 * A single address timing out or erroring is treated as unresolved for this
 * run only — it never takes down the whole batch (and never poisons the
 * cache; see fetchMapboxGeocode).
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
      try {
        const coords = await geocodeAddress(display);
        if (coords) {
          results.set(normalized, coords);
        }
      } catch (error) {
        console.error("[mapbox.geocode] address failed, marking unresolved", {
          address: display,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }),
  );

  return results;
}
