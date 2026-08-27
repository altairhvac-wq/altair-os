import { captureMonitoredEvent } from "@/lib/operations/monitoring";

/**
 * Detection for PostgREST's silent row ceiling.
 *
 * ============================== THE CEILING ==============================
 * PostgREST caps an unfiltered response at 1000 rows. It is not silent about it
 * at the HTTP layer — it answers 206 Partial Content with
 * `Content-Range: 0-999/10000` — but supabase-js surfaces neither, so a query
 * with no .limit() returns 1000 rows and no indication that 9,000 more exist.
 *
 * Measured on a seeded tenant: 5,000 customers, of which the page received
 * 1,000. The oldest customer was not merely paginated away, it was absent from
 * the payload entirely, so no amount of scrolling or client-side searching could
 * reach it.
 *
 * ============================== WHAT THIS DOES, AND DOES NOT, FIX ==============================
 * This does NOT fix the truncation. Fixing it means pagination, which changes
 * how these pages behave for the people using them and is not a decision to make
 * from inside a query helper.
 *
 * What it fixes is that the truncation is INVISIBLE. A list that comes back at
 * exactly the ceiling is reported through the operations monitoring seam, so the
 * condition shows up in alerting the first time a real tenant crosses it instead
 * of being discovered from a support ticket about a missing customer.
 *
 * Cost is nothing: no extra query, no exact count, one integer comparison. That
 * matters, because `count: "exact"` on these tables would add a full scan to
 * every list render — paying a real price on every request to detect a condition
 * that a length check already identifies.
 *
 * ============================== THE FALSE POSITIVE ==============================
 * A tenant with exactly 1000 rows reports as truncated when it is not. That is
 * the correct trade: the alternative is missing a real truncation, and one
 * spurious report at a single population is cheaper to reason about than
 * silently wrong lists. The report says "at or above", not "above".
 */
export const POSTGREST_ROW_CEILING = 1000;

/**
 * Reports a list that came back at PostgREST's ceiling. Returns the rows
 * unchanged so it can wrap a return value directly.
 */
export function reportIfRowCapped<TRow>(
  rows: TRow[],
  context: { query: string; companyId: string },
): TRow[] {
  if (rows.length >= POSTGREST_ROW_CEILING) {
    captureMonitoredEvent({
      event: "postgrest.row_cap_reached",
      level: "warning",
      companyId: context.companyId,
      meta: {
        query: context.query,
        returned: rows.length,
        ceiling: POSTGREST_ROW_CEILING,
        note:
          "Rows beyond the ceiling were dropped silently and are not reachable " +
          "from this page. Needs pagination, not a larger limit.",
      },
    });
  }

  return rows;
}
