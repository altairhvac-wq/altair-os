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

export type WorkspaceExportChunk = {
  table: string;
  rows: Record<string, unknown>[];
  /** Rows emitted for this table so far, including this chunk. */
  emitted: number;
};

export type WorkspaceExportSummary = {
  companyId: string;
  generatedAt: string;
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

async function* readTable(
  companyId: string,
  entry: WorkspaceExportTable,
): AsyncGenerator<Record<string, unknown>[]> {
  const supabase = createServiceRoleClient();

  for (let from = 0; ; from += PAGE) {
    // An ordered key is required for a stable page walk; without it two pages
    // can overlap or skip. Most tables have an id; company_document_counters
    // does not, which the export verifier found by failing on it.
    let query = supabase.from(entry.table).select("*").eq("company_id", companyId);
    for (const column of entry.orderBy ?? ["id"]) {
      query = query.order(column, { ascending: true });
    }

    const { data, error } = await query.range(from, from + PAGE - 1);

    if (error) {
      throw new Error(`export ${entry.table}: ${error.message}`);
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length > 0) {
      yield rows.map((row) => stripOmittedColumns(row, entry.omitColumns));
    }
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

  for (const entry of EXPORTED_TABLES) {
    let emitted = 0;

    for await (const rows of readTable(companyId, entry)) {
      emitted += rows.length;
      await onChunk({ table: entry.table, rows, emitted });
    }

    tables.push({ table: entry.table, rowCount: emitted });
    totalRows += emitted;
  }

  return {
    companyId,
    generatedAt: new Date().toISOString(),
    tables,
    totalRows,
  };
}
