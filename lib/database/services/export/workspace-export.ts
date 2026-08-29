import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  EXPORTED_TABLES,
  type WorkspaceExportTable,
} from "@/lib/database/services/export/workspace-export-manifest";

/**
 * A tenant-scoped export of the customer's own business records.
 *
 * ============================== SCOPING ==============================
 * Every read is `.eq("company_id", companyId)` against a table the manifest
 * classified as business data. There is no path here that reads a table the
 * manifest did not name, and no path that omits the company filter — the two
 * properties a cross-tenant leak would need.
 *
 * ============================== SIZE ==============================
 * It streams. Rows are read a page at a time and handed to a callback, so the
 * whole tenant is never in memory at once: on the scale fixture that would be
 * roughly 36,000 rows across the business tables, and a real tenant can be far
 * larger. The caller decides what to do with each chunk — write it to a file,
 * push it into an archive, count it.
 *
 * PAGE is 1,000 and not a byte more, and pagination is by an ordered key with
 * an offset rather than "read until short". PostgREST caps a response at 1,000
 * rows regardless of what was asked for, so a loop that asked for 2,000 and
 * treated 1,000 as "that was everything" would silently export a twelfth of a
 * large table. That mistake has already been made twice in this codebase.
 */

const PAGE = 1000;

/**
 * What the export promises, in the words it can actually keep.
 *
 * Every row belonging to the tenant that existed for the WHOLE export appears
 * exactly once. A row created during the export is excluded where the table
 * carries a created_at, and may or may not appear where it does not. A row
 * deleted during the export appears if the walk had already passed it and does
 * not if it had not. No row ever appears twice.
 *
 * It is deliberately not "a consistent snapshot". PostgREST cannot hold a
 * transaction across pages, and claiming a guarantee the implementation does
 * not have is worse than stating a smaller one accurately.
 */
export const EXPORT_CONSISTENCY_CONTRACT =
  "The export contains every row belonging to this company that existed for " +
  "the duration of the export, each exactly once. Rows created or deleted " +
  "while it ran may or may not be included, and none is included twice. This " +
  "is not a point-in-time snapshot.";

export type WorkspaceExportChunk = {
  table: string;
  rows: Record<string, unknown>[];
  /** Rows emitted for this table so far, including this chunk. */
  emitted: number;
};

export type WorkspaceExportSummary = {
  companyId: string;
  generatedAt: string;
  /** The instant the export began. Rows created after it are excluded. */
  boundary: string;
  /** What the export promises. See EXPORT_CONSISTENCY_CONTRACT. */
  consistency: string;
  tables: { table: string; rowCount: number }[];
  totalRows: number;
};

function stripOmittedColumns(
  row: Record<string, unknown>,
  omit: string[] | undefined,
): Record<string, unknown> {
  if (!omit || omit.length === 0) return row;
  const copy = { ...row };
  for (const column of omit) delete copy[column];
  return copy;
}

/**
 * Tables with no `created_at`, which therefore take no boundary filter.
 *
 * Named rather than discovered: a table added tomorrow without a created_at
 * should make someone decide, not inherit an exemption by accident. All five
 * are small, derived, operational state — none of them is a customer record.
 */
const TABLES_WITHOUT_CREATED_AT = new Set([
  "agent_marketing_decisions",
  "agent_marketing_snapshots",
  "ai_rate_limit_counters",
  "company_ai_limits",
  "marketing_metrics",
]);

/**
 * One table, read as a KEYSET walk rather than by offset.
 *
 * ===================== WHY NOT OFFSET =====================
 * This used to page with `.range(from, from + PAGE - 1)`. Offsets are positions
 * in a result set that is being recomputed for every page, so a concurrent
 * write before the cursor moves every later row:
 *
 *   a DELETE before the cursor shifts rows back by one, so the row that would
 *   have been first on the next page is never returned — a SKIP, and a silent
 *   one, because the export still looks complete.
 *
 *   an INSERT before the cursor shifts rows forward, so the last row of the
 *   previous page is returned again — a DUPLICATE.
 *
 * A keyset walk asks for rows strictly after the last key it saw, so no
 * concurrent write can move a row across the cursor.
 *
 * ===================== THE BOUNDARY =====================
 * `boundary` is captured once, when the export starts. Tables that have a
 * created_at are filtered to rows at or before it, which makes two things true:
 * rows created mid-export are deterministically excluded rather than included
 * by luck of where their key sorts, and a tenant inserting rows faster than the
 * export reads them cannot make it run forever.
 *
 * ===================== WHAT IS NOT CLAIMED =====================
 * This is not an ACID snapshot. PostgREST cannot hold a repeatable-read
 * transaction across pages, so nothing here sees one consistent instant. What
 * it guarantees is stated in EXPORT_CONSISTENCY_CONTRACT below, and no more.
 */
async function* readTable(
  companyId: string,
  entry: WorkspaceExportTable,
  boundary: string,
): AsyncGenerator<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient();

  // Exactly one column, and it must be unique WITHIN THE TENANT — a keyset walk
  // over a non-unique key skips every row that ties with the last of a page.
  // `id` for almost everything; company_document_counters has no id and its
  // primary key is (company_id, document_type), so document_type is unique once
  // company_id is already filtered.
  const keyColumns = entry.orderBy ?? ["id"];
  if (keyColumns.length !== 1) {
    throw new Error(
      `export ${entry.table}: keyset pagination needs exactly one ordering ` +
        `column, got ${keyColumns.length}. A compound key would need row-value ` +
        `comparison, which PostgREST does not expose.`,
    );
  }
  const keyColumn = keyColumns[0];
  const applyBoundary = !TABLES_WITHOUT_CREATED_AT.has(entry.table);

  let cursor: string | number | null = null;

  for (;;) {
    let query = supabase
      .from(entry.table)
      .select("*")
      .eq("company_id", companyId)
      .order(keyColumn, { ascending: true })
      .limit(PAGE);

    if (applyBoundary) {
      query = query.lte("created_at", boundary);
    }
    if (cursor !== null) {
      query = query.gt(keyColumn, cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`export ${entry.table}: ${error.message}`);
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) return;

    const lastKey = rows[rows.length - 1][keyColumn];
    if (lastKey === null || lastKey === undefined) {
      throw new Error(
        `export ${entry.table}: ordering column "${keyColumn}" is null on a ` +
          `row, so the walk cannot advance without risking a loop`,
      );
    }
    cursor = lastKey as string | number;

    yield rows.map((row) => stripOmittedColumns(row, entry.omitColumns));

    if (rows.length < PAGE) return;
  }
}

/**
 * Streams the export, one chunk at a time, and returns a summary.
 *
 * The caller supplies `onChunk`; nothing is buffered here beyond one page.
 */
export async function streamWorkspaceExport(
  companyId: string,
  onChunk: (chunk: WorkspaceExportChunk) => Promise<void> | void,
): Promise<WorkspaceExportSummary> {
  const tables: { table: string; rowCount: number }[] = [];
  let totalRows = 0;

  // Captured ONCE, before the first table, FROM THE DATABASE. Every table
  // filters to rows at or before this instant, so "during the export" means the
  // same thing for the first table and the sixty-fifth, and a tenant writing
  // rows faster than the export reads them cannot extend it.
  //
  // new Date() would be the wrong clock. The application host was measured
  // running ~700 ms AHEAD of the database — the dangerous direction, because a
  // boundary in the future relative to the stamping clock lets a row inserted
  // after the export began slip in under it. One clock stamps created_at; the
  // same clock has to draw the line. See migration 178.
  const boundaryClient = createServiceRoleClient();
  const { data: boundaryValue, error: boundaryError } =
    await boundaryClient.rpc("export_boundary");
  if (boundaryError || !boundaryValue) {
    throw new Error(
      `export boundary unavailable: ${boundaryError?.message ?? "no value"}. ` +
        "Refusing to export without one — falling back to the host clock is " +
        "how rows created mid-export get silently included.",
    );
  }
  const boundary = String(boundaryValue);

  for (const entry of EXPORTED_TABLES) {
    let emitted = 0;

    for await (const rows of readTable(companyId, entry, boundary)) {
      emitted += rows.length;
      await onChunk({ table: entry.table, rows, emitted });
    }

    tables.push({ table: entry.table, rowCount: emitted });
    totalRows += emitted;
  }

  return {
    companyId,
    generatedAt: new Date().toISOString(),
    boundary,
    consistency: EXPORT_CONSISTENCY_CONTRACT,
    tables,
    totalRows,
  };
}
