import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Chunked PostgREST `.in()` filters.
 *
 * ============================== THE CEILING ==============================
 * PostgREST puts `.in()` values in the query string: `id=in.(uuid,uuid,...)`.
 * A uuid costs 37 characters there, and the request line has a hard size limit.
 * Past it the request is rejected outright — the client surfaces a bare
 * "Bad Request" or "fetch failed" with no code, which reads like a network
 * blip rather than a query that is too large.
 *
 * Measured against a real project: 395 uuids succeed, 396 fail. That is roughly
 * 14.6 KB of ids. The limit belongs to the HTTP layer, not to Postgres, so it
 * does not move with database size and cannot be tuned away from here.
 *
 * ============================== WHY IT MATTERS ==============================
 * Nothing in the codebase crosses that line on a small tenant, so it does not
 * appear in development or in a demo — it appears once a real customer has a
 * few hundred rows, and then it appears on EVERY request.
 *
 * The failure is silent by construction. These call sites all log the error and
 * degrade: an empty Map of lifecycle timestamps, a skipped status update, a
 * summary that reads zero. The page still renders. So the symptom is not an
 * error page, it is numbers that are quietly wrong for exactly the customers
 * who have enough data to notice.
 *
 * ============================== THE CHUNK SIZE ==============================
 * 200, not 395. The measured limit is a cliff, and the cost of sitting near it
 * is a total failure of the query while the cost of sitting well below it is
 * one extra round trip per additional 200 ids. Anything that could push a
 * single id's encoded length up — a longer column name, an added filter, a
 * proxy with a smaller limit — eats the margin. Take the round trip.
 */
export const POSTGREST_IN_CHUNK_SIZE = 200;

type ChunkResult<TRow> = {
  data: TRow[] | null;
  error: PostgrestError | null;
};

/**
 * Runs `query` once per chunk of `values` and concatenates the rows.
 *
 * Chunks run concurrently: they are independent reads (or independent writes
 * to disjoint id sets), so there is no ordering requirement between them, and
 * serializing would turn one slow page into a much slower one.
 *
 * The first error encountered is returned with whatever rows did arrive, which
 * matches how the callers already behave — they check `error` and fall back —
 * and keeps this from being the thing that turns a degraded read into a crash.
 *
 * Callers that need a stable order must sort the result themselves; chunk
 * completion order is not meaningful. Any `.order()` inside `query` still
 * orders within a chunk, so a global ordering is NOT preserved across chunks.
 */
export async function selectInChunks<TRow, TValue extends string | number = string>(
  values: readonly TValue[],
  query: (chunk: TValue[]) => PromiseLike<ChunkResult<TRow>>,
  chunkSize: number = POSTGREST_IN_CHUNK_SIZE,
): Promise<{ data: TRow[]; error: PostgrestError | null }> {
  if (values.length === 0) {
    return { data: [], error: null };
  }

  // A single chunk is the common case; keep it a plain pass-through so the
  // small-tenant path costs exactly what it did before.
  if (values.length <= chunkSize) {
    const result = await query([...values]);
    return { data: result.data ?? [], error: result.error };
  }

  const chunks: TValue[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  const results = await Promise.all(chunks.map((chunk) => query(chunk)));

  const rows: TRow[] = [];
  let firstError: PostgrestError | null = null;

  for (const result of results) {
    if (result.error && !firstError) {
      firstError = result.error;
    }
    if (result.data) {
      rows.push(...result.data);
    }
  }

  return { data: rows, error: firstError };
}

/**
 * The `count: "exact", head: true` variant of the same problem.
 *
 * Counts are summed rather than concatenated. This is only correct because the
 * chunks partition the id set — every row counted belongs to exactly one chunk,
 * so no row can be counted twice. Do not reuse this for a filter that could
 * match the same row from two different chunks.
 */
export async function countInChunks<TValue extends string | number = string>(
  values: readonly TValue[],
  query: (
    chunk: TValue[],
  ) => PromiseLike<{ count: number | null; error: PostgrestError | null }>,
  chunkSize: number = POSTGREST_IN_CHUNK_SIZE,
): Promise<{ count: number; error: PostgrestError | null }> {
  if (values.length === 0) {
    return { count: 0, error: null };
  }

  if (values.length <= chunkSize) {
    const result = await query([...values]);
    return { count: result.count ?? 0, error: result.error };
  }

  const chunks: TValue[][] = [];
  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  const results = await Promise.all(chunks.map((chunk) => query(chunk)));

  let total = 0;
  let firstError: PostgrestError | null = null;

  for (const result of results) {
    if (result.error && !firstError) {
      firstError = result.error;
    }
    total += result.count ?? 0;
  }

  // A partial count is worse than no count: it looks like a real number. If any
  // chunk failed, the caller gets the error and decides.
  return { count: firstError ? 0 : total, error: firstError };
}
