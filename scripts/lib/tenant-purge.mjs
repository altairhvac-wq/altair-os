/**
 * Deleting and counting one tenant's rows, across every scoping shape.
 *
 * ===================== WHY THIS IS SHARED =====================
 * The purge script and its verifier must agree exactly about what "all of this
 * tenant's data" means. If the verifier counted rows differently from the way
 * the purge deleted them, a purge that missed a table would still pass.
 *
 * ===================== THE THREE SHAPES =====================
 * Most tenant tables carry company_id. Two do not, and assuming they did is
 * what the deletion verifier caught on its first run — the purge aborted on
 * `column marketing_connected_account_secrets.company_id does not exist`,
 * leaving four tables behind:
 *
 *   { column: "company_id" }          the ordinary case
 *   { columns: [...] }                network_invites, reachable as either
 *                                     source_company_id or accepted_company_id
 *   { via: { parentTable, ... } }     marketing_connected_account_secrets,
 *                                     scoped only through its parent row
 *
 * The `via` shape is why ordering matters twice over: the child has to go
 * before the parent, or the ids that identify it are already gone.
 */

import { readFileSync } from "node:fs";

export const TENANT_DELETE_ORDER = JSON.parse(
  readFileSync("scripts/lib/tenant-delete-order.json", "utf8"),
);

/** The parent ids that scope a `via` table, for one company. */
async function resolveViaIds(client, scope, companyId) {
  const ids = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client
      .from(scope.via.parentTable)
      .select(scope.via.parentKey)
      .eq("company_id", companyId)
      .order(scope.via.parentKey, { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`${scope.via.parentTable}: ${error.message}`);
    const rows = data ?? [];
    ids.push(...rows.map((row) => row[scope.via.parentKey]));
    if (rows.length < 1000) break;
  }
  return ids;
}

/**
 * Rows this company owns in one table.
 *
 * Returns null when the table cannot be counted at all — a schema version
 * without it, say. Null is reported by the caller and never treated as zero:
 * "I could not look" and "there is nothing there" are different answers, and
 * only one of them means it is safe to finish.
 */
export async function countTenantRows(client, entry, companyId) {
  const { table, scope } = entry;

  if (scope.column) {
    const { count, error } = await client
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq(scope.column, companyId);
    return error ? null : (count ?? 0);
  }

  if (scope.columns) {
    let total = 0;
    for (const column of scope.columns) {
      const { count, error } = await client
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq(column, companyId);
      if (error) return null;
      total += count ?? 0;
    }
    return total;
  }

  const ids = await resolveViaIds(client, scope, companyId);
  if (ids.length === 0) return 0;

  const { count, error } = await client
    .from(table)
    .select("*", { count: "exact", head: true })
    .in(scope.via.childKey, ids);
  return error ? null : (count ?? 0);
}

/** Deletes this company's rows from one table. Throws on any error. */
export async function deleteTenantRows(client, entry, companyId) {
  const { table, scope } = entry;

  if (scope.column) {
    const { error } = await client.from(table).delete().eq(scope.column, companyId);
    if (error) throw new Error(`${table}: ${error.message}`);
    return;
  }

  if (scope.columns) {
    for (const column of scope.columns) {
      const { error } = await client.from(table).delete().eq(column, companyId);
      if (error) throw new Error(`${table}.${column}: ${error.message}`);
    }
    return;
  }

  const ids = await resolveViaIds(client, scope, companyId);
  if (ids.length === 0) return;

  // Chunked: an .in() list goes in the query string and the request line has a
  // hard size limit at a few hundred uuids.
  for (let index = 0; index < ids.length; index += 200) {
    const chunk = ids.slice(index, index + 200);
    const { error } = await client
      .from(table)
      .delete()
      .in(scope.via.childKey, chunk);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
}
