/**
 * Keyset pagination, server-side search, and exact counts for tenant lists.
 *
 * ============================== WHY THIS EXISTS ==============================
 * PostgREST caps an unfiltered response at 1000 rows and reports the truncation
 * only in a Content-Range header that nothing read. Every company-wide list was
 * unbounded, so a tenant with 5,000 customers received 1,000 of them and the
 * other 4,000 were unreachable — search and filtering ran in the browser over
 * whatever had arrived, so they could not find what was never sent.
 *
 * The fix is not a bigger limit. It is to stop sending whole tables to the
 * browser: page on the server, search on the server, count on the server.
 *
 * ============================== WHY KEYSET, NOT OFFSET ==============================
 * OFFSET makes the database walk and discard every skipped row, so page 80 costs
 * eighty times page 1. It is also unstable: a row inserted while someone pages
 * shifts the window and silently duplicates or skips records.
 *
 * Keyset asks "the next N rows after this exact position", which is an index
 * seek at any depth and cannot skip a row that was there when paging started.
 * Migration 150 created the supporting indexes in the required shape:
 *
 *     (company_id, <sort column> desc, id desc) where deleted_at is null
 *
 * The trailing `id` is what makes it total. Sorting by a non-unique column alone
 * has ties, and a cursor pointing into a tie cannot say which side of it the
 * reader already saw. Every sort here is (column, id), and the cursor carries
 * both.
 *
 * ============================== MEASURED ==============================
 * Against a 5,000-customer tenant: first page 92 ms, a page deep in the set
 * 129 ms, exact count 167 ms, search page 130 ms. The unbounded query it
 * replaces took over a second and returned a 4.4 MB payload that was still
 * missing 80% of the table.
 */
/*
 * Deliberately NOT marked server-only. Everything here is pure computation over
 * strings and numbers — no secrets, no database handle, nothing that would be
 * unsafe in a client bundle. Marking it would buy nothing and would stop
 * scripts/verify-customer-queues-live.mjs importing the real cursor and filter
 * builders, which is the whole basis of the differential test.
 */

/** Rows per page. Deliberately modest: these lists are read, not exported. */
export const DEFAULT_PAGE_SIZE = 50;

/**
 * A caller-supplied page size is clamped to this. It exists so a crafted
 * ?pageSize= cannot ask for the whole table and reintroduce the problem this
 * module was written to fix.
 */
export const MAX_PAGE_SIZE = 100;

export type SortDirection = "asc" | "desc";

export type PaginatedResult<TRow> = {
  rows: TRow[];
  /** Opaque; pass back as `cursor` to get the following page. */
  nextCursor: string | null;
  /** Exact, over the whole filtered set — not the size of this page. */
  totalCount: number;
  hasMore: boolean;
};

export type PageRequest = {
  cursor?: string | null;
  pageSize?: number;
  search?: string | null;
  sortColumn?: string | null;
  sortDirection?: SortDirection | null;
};

/**
 * A cursor is a position, not a token of authority: it names a row's sort value
 * and id. It carries no tenant, and every query that consumes one still applies
 * its own company_id filter, so a forged cursor can at most point at a position
 * inside the caller's own tenant.
 */
type DecodedCursor = { value: string | number | null; id: string };

export function encodeCursor(value: string | number | null, id: string): string {
  return Buffer.from(JSON.stringify({ v: value, id }), "utf8").toString("base64url");
}

/** Returns null for anything malformed. A bad cursor starts from the top. */
export function decodeCursor(cursor: string | null | undefined): DecodedCursor | null {
  if (!cursor) return null;

  try {
    const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.id !== "string" || parsed.id.length === 0) return null;

    const value = parsed.v;
    if (value !== null && typeof value !== "string" && typeof value !== "number") {
      return null;
    }
    return { value, id: parsed.id };
  } catch {
    return null;
  }
}

export function clampPageSize(requested: number | null | undefined): number {
  if (!requested || !Number.isFinite(requested)) return DEFAULT_PAGE_SIZE;
  return Math.min(Math.max(Math.trunc(requested), 1), MAX_PAGE_SIZE);
}

/**
 * Escapes a value for use inside a PostgREST `or=(...)` filter string.
 *
 * This matters more than it looks. Those strings are parsed by PostgREST, and a
 * raw comma, parenthesis or dot in a user's search term does not merely fail to
 * match — it changes which filters the server sees. Quoting the value and
 * escaping the two characters that can terminate a quoted string keeps the term
 * a term.
 *
 * Filters are always ANDed with an explicit .eq("company_id", …) that is never
 * built from user input, so tenant scoping does not depend on this. But a
 * search box should not be able to rewrite a query, and here it cannot.
 */
export function escapeFilterValue(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Normalizes a raw search box value; returns null when there is nothing to search for. */
export function normalizeSearchTerm(search: string | null | undefined): string | null {
  const trimmed = search?.trim();
  if (!trimmed) return null;
  // A single character matches most of the table and costs a scan for nothing.
  if (trimmed.length < 2) return null;
  return trimmed.slice(0, 120);
}

/**
 * Builds the `or=` clause for a case-insensitive substring search across
 * several columns.
 */
export function buildSearchFilter(columns: readonly string[], term: string): string {
  const escaped = escapeFilterValue(`%${term}%`);
  return columns.map((column) => `${column}.ilike.${escaped}`).join(",");
}

/**
 * Builds the `or=` clause that positions a query strictly after `cursor`.
 *
 * For a descending sort this is the tuple comparison (col, id) < (value, id),
 * spelled out because PostgREST has no row-value syntax:
 *
 *     col < value  OR  (col = value AND id < cursorId)
 *
 * Null sort values are not supported and callers must not offer a nullable
 * column for sorting — ordering with nulls has no single correct answer, and
 * silently guessing one produces a cursor walk that skips rows.
 */
export function buildKeysetFilter(
  column: string,
  direction: SortDirection,
  cursor: DecodedCursor,
): string {
  const comparison = direction === "desc" ? "lt" : "gt";
  const value =
    typeof cursor.value === "string" ? escapeFilterValue(cursor.value) : String(cursor.value);
  const id = escapeFilterValue(cursor.id);

  return `${column}.${comparison}.${value},and(${column}.eq.${value},id.${comparison}.${id})`;
}

/**
 * Resolves a caller-supplied sort against an allowlist.
 *
 * The allowlist is not only about injection — PostgREST would reject an unknown
 * column anyway. It is about the index. A sort on a column without the matching
 * (company_id, column, id) index turns every page into a sort of the whole
 * tenant, which is the cost profile this module exists to avoid. Offering a sort
 * is therefore a decision to create its index.
 */
export function resolveSort<TColumn extends string>(
  requested: string | null | undefined,
  allowed: readonly TColumn[],
  fallback: TColumn,
): TColumn {
  if (requested && (allowed as readonly string[]).includes(requested)) {
    return requested as TColumn;
  }
  return fallback;
}

export function resolveDirection(
  requested: string | null | undefined,
  fallback: SortDirection = "desc",
): SortDirection {
  return requested === "asc" || requested === "desc" ? requested : fallback;
}

/**
 * Turns `pageSize + 1` fetched rows into a page and its next cursor.
 *
 * Fetching one extra row is how `hasMore` is known without a second query: if
 * the extra row came back there is at least one more, and it is discarded.
 */
export function buildPage<TRow extends { id: string }>(
  fetched: TRow[],
  pageSize: number,
  totalCount: number,
  cursorValueOf: (row: TRow) => string | number | null,
): PaginatedResult<TRow> {
  const hasMore = fetched.length > pageSize;
  const rows = hasMore ? fetched.slice(0, pageSize) : fetched;
  const last = rows[rows.length - 1];

  return {
    rows,
    nextCursor: hasMore && last ? encodeCursor(cursorValueOf(last), last.id) : null,
    totalCount,
    hasMore,
  };
}
