/**
 * Migration column-existence verification (Phase 4).
 *
 * ===================== THE BUG CLASS =====================
 * Migration 151 shipped SQL that referenced three columns which do not exist:
 *
 *     invoices.sent_at        -- never existed
 *     invoices.issued_at      -- the column is issue_date
 *     estimates.sent_at       -- never existed
 *
 * It passed review, it passed the existing verifier, and it passed CI, because
 * nothing between the author and production ever compared the SQL to a schema.
 * Postgres would have rejected it instantly — but only when the function was
 * first CALLED, and it sat behind a feature flag that had never been switched
 * on. The same week, the load-test seeder turned out to reference four
 * non-existent columns and two enum labels that are not in their types, for
 * exactly the same reason.
 *
 * A migration is the one artifact in this repository that TypeScript cannot
 * check. This closes that gap without needing a database.
 *
 * ===================== HOW =====================
 * lib/database/types/database.ts maps each table to a Row type, and
 * lib/database/types/core-tables.ts declares that type's fields. Together they
 * are a checked-in schema. This binds SQL aliases to tables (from/join/update/
 * insert/delete) and asserts every `alias.column` reference exists.
 *
 * ===================== DELIBERATELY CONSERVATIVE =====================
 * It only checks aliases it can bind with confidence, and only for tables the
 * generated types describe. An alias bound to a subquery, a CTE, a lateral, or
 * a table with no generated type is skipped rather than guessed at. A verifier
 * that cries wolf gets muted, and a muted verifier catches nothing — so this
 * would rather miss a reference than invent one.
 *
 * Scope is migrations 148 and later: the ones this remediation added. Earlier
 * migrations are applied history and are not re-litigated here.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-migration-columns.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const TYPES_INDEX = "lib/database/types/database.ts";
const CORE_TABLES = "lib/database/types/core-tables.ts";
const FIRST_CHECKED = 148;

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n${detail}` : ""}`);
  }
}

// ---------------------------------------------------------------------------
// The checked-in schema
// ---------------------------------------------------------------------------

const typesIndex = readFileSync(TYPES_INDEX, "utf8");
const coreTables = readFileSync(CORE_TABLES, "utf8");

/** table name -> Row type name */
const rowTypeByTable = new Map();
for (const m of typesIndex.matchAll(/^\s{6}(\w+): \{\s*\n\s*Row: (\w+);/gm)) {
  rowTypeByTable.set(m[1], m[2]);
}

/** Row type name -> Set of column names */
const columnsByRowType = new Map();
for (const m of coreTables.matchAll(/export type (\w+) = \{([\s\S]*?)\n\};/g)) {
  const fields = new Set();
  for (const f of m[2].matchAll(/^\s{2}(\w+)\??:/gm)) fields.add(f[1]);
  if (fields.size > 0) columnsByRowType.set(m[1], fields);
}

/** table -> Set of columns, for tables we can resolve end to end. */
const schema = new Map();
for (const [table, rowType] of rowTypeByTable) {
  const columns = columnsByRowType.get(rowType);
  if (columns) schema.set(table, columns);
}

console.log("\nThe checked-in schema is readable");
check(
  "database.ts yields a table -> Row type map",
  rowTypeByTable.size >= 30,
  `        found ${rowTypeByTable.size} tables`,
);
check(
  "core-tables.ts yields column sets",
  columnsByRowType.size >= 30,
  `        found ${columnsByRowType.size} row types`,
);
check(
  "the two join into a usable schema",
  schema.size >= 30 && schema.get("invoices")?.has("issue_date") === true,
  `        resolved ${schema.size} tables`,
);
// If this ever regresses to near-zero the checks below would silently pass on
// nothing at all, which is the classic way a guard stops guarding.
check(
  "the schema knows a column that does NOT exist is absent",
  schema.get("invoices")?.has("sent_at") === false &&
    schema.get("estimates")?.has("sent_at") === false,
);

// ---------------------------------------------------------------------------
// SQL alias binding
// ---------------------------------------------------------------------------

function stripSql(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .replace(/'(?:[^']|'')*'/g, "''"); // string literals cannot hold references
}

const RESERVED_AFTER_TABLE = new Set([
  "on", "where", "set", "using", "as", "values", "select", "from", "join",
  "left", "right", "inner", "outer", "lateral", "group", "order", "limit",
  "returning", "and", "or", "for", "do", "nothing", "update", "conflict",
  "when", "then", "else", "end", "if", "loop", "begin", "commit", "into",
]);

/** alias -> table, plus table -> table for unaliased references. */
function bindAliases(sql) {
  const bound = new Map();
  const pattern =
    /\b(?:from|join|update|into|delete\s+from)\s+public\.(\w+)(?:\s+(?:as\s+)?(\w+))?/gi;
  for (const m of sql.matchAll(pattern)) {
    const table = m[1];
    if (!schema.has(table)) continue;
    bound.set(table, table);
    const alias = m[2]?.toLowerCase();
    if (alias && !RESERVED_AFTER_TABLE.has(alias)) {
      // An alias reused for two different tables in one migration is ambiguous;
      // drop it rather than pick a side.
      if (bound.has(alias) && bound.get(alias) !== table) {
        bound.set(alias, null);
      } else {
        bound.set(alias, table);
      }
    }
  }
  return bound;
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => {
    const n = Number.parseInt(f.slice(0, 3), 10);
    return Number.isFinite(n) && n >= FIRST_CHECKED;
  })
  .sort();

/**
 * Migrations whose bad references are superseded by a later migration.
 *
 * Applied history is not rewritten here — the house rule is a new ordered
 * migration, not an edit to an old one. So 151's broken SQL stays on disk and
 * 158 replaces the function. Each entry names the migration that supersedes it,
 * so an exemption cannot quietly become permanent.
 */
const SUPERSEDED = new Map([
  [
    "151_dashboard_aggregate_rpcs.sql",
    "Superseded by 158_dashboard_aggregate_column_fix.sql, which replaces the " +
      "function with one that uses issue_date and derives estimate sent_at from " +
      "estimate_activities. 151 was never applied to production.",
  ],
]);

const offenders = [];

for (const file of files) {
  if (SUPERSEDED.has(file)) continue;
  const sql = stripSql(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
  const bound = bindAliases(sql);
  if (bound.size === 0) continue;

  for (const m of sql.matchAll(/\b(\w+)\.(\w+)\b/g)) {
    const qualifier = m[1].toLowerCase();
    const column = m[2];

    if (qualifier === "public" || qualifier === "auth" || qualifier === "storage") continue;
    const table = bound.get(qualifier);
    if (!table) continue; // unbound, ambiguous, or not a table we can resolve

    const columns = schema.get(table);
    if (!columns || columns.has(column)) continue;

    offenders.push({ file, reference: `${m[1]}.${column}`, table });
  }
}

console.log(`\nEvery column referenced by migrations ${FIRST_CHECKED}+ exists`);
console.log(`  (${files.length} migrations checked)`);

check(
  "no migration references a column that is not in the schema",
  offenders.length === 0,
  offenders
    .map((o) => `        ${o.file}  ${o.reference}  -> public.${o.table} has no such column`)
    .join("\n"),
);

// An exemption that outlives its replacement is just a disabled check.
for (const [file, reason] of SUPERSEDED) {
  const replacement = reason.match(/(\d{3}_[\w-]+\.sql)/)?.[1];
  check(
    `${file} is exempt only because ${replacement} exists`,
    Boolean(replacement) && files.includes(replacement),
    `        ${replacement ?? "(none named)"} was not found in ${MIGRATIONS_DIR}`,
  );
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} migration column checks passed (${checks} total).`,
);
console.log(
  "\n  Conservative by design: aliases bound to CTEs, subqueries or tables\n" +
    "  without a generated Row type are skipped, not guessed at.\n",
);
if (failures > 0) process.exit(1);
