import "server-only";

import { cache } from "react";
import { createServiceRoleClient } from "@/lib/supabase/service";
import { searchPublicListings } from "@/lib/directory/listings";
import {
  DIRECTORY_HUB_INDEX_MIN,
  DIRECTORY_TRADES,
  directoryCityPath,
  directoryCityTradePath,
  directoryStatePath,
  isUsStateCode,
  placeSlug,
  type DirectoryFacet,
  type DirectoryPublicListing,
} from "@/shared/types/directory";
import { isNetworkTradeType, type TradeType } from "@/shared/types/network";

/**
 * Where the directory has businesses: the counts behind the search page's
 * live chips, the state / city / trade pages and the sitemap.
 *
 * Counts come from `directory_facets()` (migration 214): published listings
 * only, grouped by state, city and trade, with no names, emails or ids.
 * Before 214 is applied the same counts are worked out from the public
 * search function, a page at a time, so the pages work in either order.
 *
 * A count is of businesses BASED in a place. A business that only lists a
 * place in its service area is shown on that place's page under "Also
 * serving", but it does not count towards the page being indexed.
 */

export type DirectoryFacets = { facets: DirectoryFacet[]; available: boolean };

function logFailure(what: string, error: unknown): void {
  const code = (error as { code?: string } | null)?.code ?? "unknown";
  console.error(`[directory-places] ${what} failed:`, { code });
}

function isMissingFunction(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === "PGRST202" || error.code === "42883" || /function .* does not exist|Could not find the function/i.test(error.message ?? "")));
}

function toFacet(row: { state?: unknown; city?: unknown; trade?: unknown; count?: unknown }): DirectoryFacet | null {
  if (!isUsStateCode(row.state) || typeof row.city !== "string" || typeof row.trade !== "string" || !isNetworkTradeType(row.trade)) return null;
  const count = Number(row.count);
  if (!Number.isFinite(count) || count < 1) return null;
  return { state: row.state, city: row.city, trade: row.trade, count };
}

async function facetsFromSearch(): Promise<DirectoryFacets> {
  const counts = new Map<string, DirectoryFacet>();
  for (let page = 1; page <= 40; page += 1) {
    const result = await searchPublicListings({ trade: null, state: null, place: null, subOnly: false, page }, 50);
    if (!result.available) return { facets: [], available: false };
    for (const listing of result.listings) {
      const key = `${listing.state}|${placeSlug(listing.city)}|${listing.tradeType}`;
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { state: listing.state, city: listing.city, trade: listing.tradeType, count: 1 });
    }
    if (page * 50 >= result.total) break;
  }
  return { facets: [...counts.values()], available: true };
}

/** Every place-and-trade with published listings. One read per request. */
export const listDirectoryFacets = cache(async (): Promise<DirectoryFacets> => {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("directory_facets");
    if (error) {
      if (isMissingFunction(error)) return facetsFromSearch();
      throw error;
    }
    const rows = Array.isArray(data) ? (data as Parameters<typeof toFacet>[0][]) : [];
    return { facets: rows.map(toFacet).filter((facet): facet is DirectoryFacet => facet !== null), available: true };
  } catch (error) {
    logFailure("facets", error);
    return { facets: [], available: false };
  }
});

export type PlaceCount = { label: string; slug: string; state: string; count: number };
export type TradeCount = { trade: TradeType; count: number };

/** States with listings, most first. */
export function statesWithListings(facets: DirectoryFacet[]): { state: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const facet of facets) totals.set(facet.state, (totals.get(facet.state) ?? 0) + facet.count);
  return [...totals.entries()].map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count || a.state.localeCompare(b.state));
}

/** Cities with listings, optionally in one state and of one trade, most first. */
export function citiesWithListings(facets: DirectoryFacet[], filter: { state?: string | null; trade?: TradeType | null } = {}): PlaceCount[] {
  const totals = new Map<string, PlaceCount>();
  for (const facet of facets) {
    if (filter.state && facet.state !== filter.state) continue;
    if (filter.trade && facet.trade !== filter.trade) continue;
    const slug = placeSlug(facet.city);
    const key = `${facet.state}|${slug}`;
    const existing = totals.get(key);
    if (existing) existing.count += facet.count;
    else totals.set(key, { label: facet.city, slug, state: facet.state, count: facet.count });
  }
  return [...totals.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Trades with listings, optionally in one state and city, most first; ties in the trade list's order. */
export function tradesWithListings(facets: DirectoryFacet[], filter: { state?: string | null; citySlug?: string | null } = {}): TradeCount[] {
  const totals = new Map<TradeType, number>();
  for (const facet of facets) {
    if (filter.state && facet.state !== filter.state) continue;
    if (filter.citySlug && placeSlug(facet.city) !== filter.citySlug) continue;
    totals.set(facet.trade, (totals.get(facet.trade) ?? 0) + facet.count);
  }
  return DIRECTORY_TRADES.filter((trade) => totals.has(trade))
    .map((trade) => ({ trade, count: totals.get(trade) as number }))
    .sort((a, b) => b.count - a.count);
}

/** How many published listings are based in this place (and trade). */
export function countBasedIn(facets: DirectoryFacet[], place: { state: string; citySlug?: string | null; trade?: TradeType | null }): number {
  return facets
    .filter(
      (facet) =>
        facet.state === place.state &&
        (!place.citySlug || placeSlug(facet.city) === place.citySlug) &&
        (!place.trade || facet.trade === place.trade),
    )
    .reduce((sum, facet) => sum + facet.count, 0);
}

export function isIndexableHub(count: number): boolean {
  return count >= DIRECTORY_HUB_INDEX_MIN;
}

/** The city's name as the businesses there wrote it, or null when no business is based there. */
export function cityName(facets: DirectoryFacet[], state: string, citySlug: string): string | null {
  return facets.find((facet) => facet.state === state && placeSlug(facet.city) === citySlug)?.city ?? null;
}

/**
 * The place pages search engines may be shown: each state, city and
 * city-and-trade with at least DIRECTORY_HUB_INDEX_MIN businesses based
 * there. Everything else stays out of the sitemap (and is noindex).
 */
export async function listIndexableHubPaths(): Promise<string[]> {
  const { facets } = await listDirectoryFacets();
  const paths: string[] = [];
  for (const { state, count } of statesWithListings(facets)) {
    if (isIndexableHub(count)) paths.push(directoryStatePath(state));
  }
  for (const city of citiesWithListings(facets)) {
    if (isIndexableHub(city.count)) paths.push(directoryCityPath(city.state, city.label));
    for (const { trade, count } of tradesWithListings(facets, { state: city.state, citySlug: city.slug })) {
      if (isIndexableHub(count)) paths.push(directoryCityTradePath(city.state, city.label, trade));
    }
  }
  return paths;
}

export type HubListings = {
  /** Based in the place. */
  based: DirectoryPublicListing[];
  /** Based elsewhere, but their service area names the place. */
  alsoServing: DirectoryPublicListing[];
  available: boolean;
};

/**
 * The listings for a place page. Uses the public search (published, public
 * columns only), then keeps the ones based in the city; the others matched
 * because their service area names it.
 */
export async function listingsForPlace(place: { state: string; city?: string | null; trade?: TradeType | null }): Promise<HubListings> {
  const result = await searchPublicListings(
    { trade: place.trade ?? null, state: place.state, place: place.city ?? null, subOnly: false, page: 1 },
    50,
  );
  if (!result.available) return { based: [], alsoServing: [], available: false };
  if (!place.city) return { based: result.listings, alsoServing: [], available: true };
  const slug = placeSlug(place.city);
  return {
    based: result.listings.filter((listing) => placeSlug(listing.city) === slug),
    alsoServing: result.listings.filter((listing) => placeSlug(listing.city) !== slug),
    available: true,
  };
}
