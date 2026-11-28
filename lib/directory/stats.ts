import "server-only";

import { selectInChunks } from "@/lib/database/queries/chunked-in";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  isDirectoryListingEvent,
  isValidListingSlug,
  type DirectoryListingEvent,
  type DirectoryListingStats,
} from "@/shared/types/directory";

/**
 * Listing owners' numbers (migration 214): page views and call, website and
 * map taps, counted per listing per UTC day.
 *
 * ============ WHAT IS STORED ============
 * Four counters per listing per day. Not who looked, not from where, not a
 * device or a visitor id. The route that counts drops bots and our own
 * devices before it gets here (app/api/directory/listing-event/route.ts).
 *
 * ============ WHO SEES IT ============
 * The business, on its manage page (behind its signed link) and in the
 * monthly email to its listing address. Nobody else; the numbers are never on
 * a public page, so a listing cannot be compared with its neighbours.
 */

function logFailure(what: string, error: unknown): void {
  const code = (error as { code?: string } | null)?.code ?? "unknown";
  console.error(`[directory-stats] ${what} failed:`, { code });
}

const EMPTY: DirectoryListingStats = { views: 0, calls: 0, website: 0, directions: 0 };

/** Counts one view or tap. Quietly does nothing for an unknown listing or event. */
export async function recordListingEvent(slug: string, event: DirectoryListingEvent): Promise<boolean> {
  if (!isValidListingSlug(slug) || !isDirectoryListingEvent(event)) return false;
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("directory_record_listing_event", { p_slug: slug, p_event: event });
    if (error) throw error;
    return data === true;
  } catch (error) {
    logFailure("record", error);
    return false;
  }
}

type DayRow = { day: string; views: number; calls: number; website_taps: number; directions_taps: number };

function add(total: DirectoryListingStats, row: DayRow): DirectoryListingStats {
  return {
    views: total.views + (row.views ?? 0),
    calls: total.calls + (row.calls ?? 0),
    website: total.website + (row.website_taps ?? 0),
    directions: total.directions + (row.directions_taps ?? 0),
  };
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);

export function monthBounds(reference: Date, offset: number): { start: string; end: string; label: string } {
  const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + offset, 1));
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return {
    start: isoDay(start),
    end: isoDay(end),
    label: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(start),
  };
}

export type ListingStatsSummary = {
  last30: DirectoryListingStats;
  thisMonth: DirectoryListingStats;
  lastMonth: DirectoryListingStats;
  lastMonthLabel: string;
  thisMonthLabel: string;
  /** Views per day for the last 30 days, oldest first, zero-filled. */
  daily: { day: string; views: number; taps: number }[];
};

/** Null when the numbers cannot be read (migration 214 not applied, or an outage). */
export async function getListingStats(listingId: string, now: Date = new Date()): Promise<ListingStatsSummary | null> {
  try {
    const lastMonth = monthBounds(now, -1);
    const thisMonth = monthBounds(now, 0);
    const since = new Date(now.getTime() - 29 * 86_400_000);
    const from = [lastMonth.start, isoDay(since)].sort()[0];
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("directory_listing_daily_stats")
      .select("day, views, calls, website_taps, directions_taps")
      .eq("listing_id", listingId)
      .gte("day", from)
      .order("day", { ascending: true })
      .limit(100);
    if (error) throw error;
    const rows = (data ?? []) as DayRow[];
    const byDay = new Map(rows.map((row) => [row.day, row]));
    const daily: ListingStatsSummary["daily"] = [];
    let last30 = { ...EMPTY };
    for (let index = 0; index < 30; index += 1) {
      const day = isoDay(new Date(since.getTime() + index * 86_400_000));
      const row = byDay.get(day);
      daily.push({ day, views: row?.views ?? 0, taps: row ? row.calls + row.website_taps + row.directions_taps : 0 });
      if (row) last30 = add(last30, row);
    }
    const inRange = (start: string, end: string) => rows.filter((row) => row.day >= start && row.day < end).reduce(add, { ...EMPTY });
    return {
      last30,
      thisMonth: inRange(thisMonth.start, thisMonth.end),
      lastMonth: inRange(lastMonth.start, lastMonth.end),
      lastMonthLabel: lastMonth.label,
      thisMonthLabel: thisMonth.label,
      daily,
    };
  } catch (error) {
    logFailure("read", error);
    return null;
  }
}

/** Totals for one month for many listings, by listing id. */
export async function monthTotals(listingIds: string[], month: { start: string; end: string }): Promise<Map<string, DirectoryListingStats>> {
  const totals = new Map<string, DirectoryListingStats>();
  if (listingIds.length === 0) return totals;
  const supabase = createServiceRoleClient();
  // Chunked: the id list grows with the directory (verify-postgrest-in-limits).
  const { data, error } = await selectInChunks<DayRow & { listing_id: string }>(listingIds, (chunk) =>
    supabase
      .from("directory_listing_daily_stats")
      .select("listing_id, day, views, calls, website_taps, directions_taps")
      .in("listing_id", chunk)
      .gte("day", month.start)
      .lt("day", month.end)
      .limit(5000),
  );
  if (error) throw error;
  for (const row of data) {
    totals.set(row.listing_id, add(totals.get(row.listing_id) ?? { ...EMPTY }, row));
  }
  return totals;
}
