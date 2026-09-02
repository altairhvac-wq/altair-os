/**
 * Static safety checks over the integration/publishing migrations (179+).
 *
 * ============ WHY A SECOND MIGRATION VERIFIER ============
 * `scripts/verify-marketing-migrations.mjs` carries a HARDCODED map of
 * migrations 141-145 and cannot see anything newer — its own header records
 * that stale checks in it once masked every later verifier for weeks. Rather
 * than widen a map that has already failed that way, this file DISCOVERS
 * every migration at or above FIRST_CHECKED, the pattern
 * `verify-migration-columns.mjs` and `verify-function-grants.mjs` use. A new
 * migration is covered the moment it lands, with nobody remembering to
 * register it.
 *
 * Purely textual: it reads SQL from disk and asserts invariants. No database
 * connection, no credentials, no network.
 *
 * Run: node scripts/verify-integration-migrations.mjs
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const FIRST_CHECKED = 179;

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail ?? "");
  }
}

/** Comments stripped and lowercased, so prose can never satisfy a check. */
function readSql(file) {
  return readFileSync(join(MIGRATIONS_DIR, file), "utf8")
    .replace(/--[^\n]*/g, "")
    .toLowerCase();
}

const files = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .filter((f) => {
    const n = Number.parseInt(f.slice(0, 3), 10);
    return Number.isInteger(n) && n >= FIRST_CHECKED;
  })
  .sort();

console.log(
  `\nDiscovered ${files.length} migration(s) at or above ${FIRST_CHECKED}`,
);
check("at least one integration migration exists to check", files.length > 0);

/* ------------------------------------------------------------ destructive */

// The whole set, every time. A destructive statement in a migration that
// runs against production is unrecoverable, so this is checked first and
// checked for all files rather than only the ones a map remembered.
const DESTRUCTIVE = [
  /\bdrop\s+table\b/,
  /\bdrop\s+schema\b/,
  /\btruncate\b/,
  /\bdelete\s+from\b/,
  /\bdrop\s+database\b/,
  /\bdrop\s+column\b/,
  /\bdrop\s+type\b/,
];

console.log("\nNo destructive statements");
for (const file of files) {
  const sql = readSql(file);
  const hit = DESTRUCTIVE.find((re) => re.test(sql));
  check(`${file} contains no destructive statement`, !hit, hit?.source);
}

/* ------------------------------------------------------------ idempotency */

console.log("\nIdempotent DDL");
for (const file of files) {
  const sql = readSql(file);

  const creates = [
    ...sql.matchAll(/create\s+(table|index|unique index)\s+([^\s(]+)/g),
  ];
  const unguarded = creates.filter(
    (m) => !/if\s+not\s+exists/.test(m[0]) && m[2] !== "if",
  );
  check(
    `${file} guards every create with 'if not exists'`,
    unguarded.length === 0,
    unguarded.map((m) => m[0]),
  );

  // A bare `create policy` re-run fails. The repo's idiom is an explicit
  // drop immediately before, or a pg_policies existence guard.
  const policies = [...sql.matchAll(/create\s+policy\s+"([^"]+)"/g)].map(
    (m) => m[1],
  );
  const unguardedPolicies = policies.filter(
    (name) =>
      !sql.includes(`drop policy if exists "${name}"`) &&
      !/pg_policies/.test(sql),
  );
  check(
    `${file} makes every policy re-runnable`,
    unguardedPolicies.length === 0,
    unguardedPolicies,
  );

  const constraints = [...sql.matchAll(/add\s+constraint\s+([a-z0-9_]+)/g)].map(
    (m) => m[1],
  );
  const unguardedConstraints = constraints.filter(
    (name) =>
      !sql.includes(`drop constraint if exists ${name}`) &&
      !/pg_constraint/.test(sql),
  );
  check(
    `${file} makes every constraint re-runnable`,
    unguardedConstraints.length === 0,
    unguardedConstraints,
  );
}

/* ------------------------------------------------ enum-only files stay alone */

// `alter type ... add value` cannot share a transaction with a statement that
// USES the label. This fails at APPLY time, not review time — which is why
// 146 split itself and why 179/180 are separate files.
console.log("\nEnum migrations stay alone");
for (const file of files) {
  const sql = readSql(file);
  if (!/alter\s+type\s+public\.\w+\s+add\s+value/.test(sql)) continue;

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const nonEnum = statements.filter(
    (s) => !/^alter\s+type\s+public\.\w+\s+add\s+value/.test(s),
  );
  check(
    `${file} contains ONLY 'alter type ... add value' statements`,
    nonEnum.length === 0,
    nonEnum.map((s) => s.slice(0, 60)),
  );
}

/* --------------------------------------------------- tenancy, RLS, grants */

/**
 * Tables that are deliberately readable by anonymous visitors.
 *
 * Exactly one, and it is the public website. Adding to this set is a decision
 * to put a table on the internet, and belongs in the migration that does it
 * rather than here.
 */
const ANON_READABLE_TABLES = new Set(["marketing_site_pages"]);

console.log("\nTenancy, RLS and grants on every new table");
for (const file of files) {
  const sql = readSql(file);
  const tables = [
    ...sql.matchAll(
      /create\s+table\s+if\s+not\s+exists\s+public\.([a-z0-9_]+)/g,
    ),
  ].map((m) => m[1]);

  for (const table of tables) {
    const body =
      sql.split(`create table if not exists public.${table}`)[1] ?? "";
    const definition = body.slice(0, body.indexOf(");") + 2);

    check(
      `${table}: is company-scoped with a cascading FK`,
      /company_id\s+uuid\s+not\s+null\s+references\s+public\.companies\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/.test(
        definition,
      ),
    );
    check(
      `${table}: enables row level security`,
      new RegExp(
        `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
      ).test(sql),
    );
    // RLS narrows an existing privilege; it does not create one. A SELECT
    // policy without a table-level GRANT is silently inert — the trap
    // migration 143 documents at length.
    check(
      `${table}: grants select to authenticated (RLS narrows, it does not grant)`,
      new RegExp(
        `grant\\s+select\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+authenticated`,
      ).test(sql),
    );
    check(
      `${table}: revokes writes from authenticated`,
      new RegExp(
        `revoke\\s+insert,\\s*update,\\s*delete\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+authenticated`,
      ).test(sql),
    );
    // ============ THE ONE TABLE ANON MAY READ ============
    // Every other table here holds credentials, ledgers or unreleased copy,
    // and `revoke all from anon` is right for all of them. A PUBLIC WEBSITE
    // is the exception by definition: a page no anonymous visitor can read
    // is not published.
    //
    // The exception is named rather than inferred, so adding a second
    // anon-readable table is a deliberate edit here and not a side effect of
    // how someone wrote their grants. And it is not a hole: the assertions
    // below are STRICTER than the blanket revoke they replace — anon must be
    // granted SELECT only, must be denied every write, and the row-level
    // policy must narrow that read to published rows.
    if (ANON_READABLE_TABLES.has(table)) {
      check(
        `${table}: anon may select (a public page must be readable)`,
        new RegExp(
          `grant\\s+select\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+anon`,
        ).test(sql),
      );
      check(
        `${table}: anon is granted NOTHING but select`,
        !new RegExp(
          `grant\\s+(all|insert|update|delete)[^;]*\\s+to\\s+[^;]*anon`,
        ).test(sql),
      );
      check(
        `${table}: anon writes are revoked explicitly`,
        new RegExp(
          `revoke\\s+insert,\\s*update,\\s*delete\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+anon`,
        ).test(sql),
      );
      check(
        `${table}: the anon policy narrows to published rows only`,
        /to\s+anon[^;]*using\s*\(\s*page_state\s*=\s*'published'\s*\)/s.test(
          sql,
        ),
      );
    } else {
      check(
        `${table}: revokes everything from anon`,
        new RegExp(
          `revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+anon`,
        ).test(sql),
      );
    }
    check(
      `${table}: grants all to service_role`,
      new RegExp(
        `grant\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+to\\s+service_role`,
      ).test(sql),
    );
    check(
      `${table}: has at least one row level security policy`,
      new RegExp(`on\\s+public\\.${table}\\s+for\\s+select`).test(sql),
    );
  }
}

/* ---------------------------------------------------------- new functions */

// verify-function-grants.mjs auto-discovers from migration 1 and requires a
// pinned search_path with pg_temp LAST plus explicit grants. Rather than
// duplicate that logic, assert the simpler invariant these migrations were
// designed around: they introduce no new function at all.
console.log(
  "\nNo new database functions (keeps verify-function-grants' contract simple)",
);
for (const file of files) {
  const sql = readSql(file);
  const fns = [
    ...sql.matchAll(
      /create\s+(?:or\s+replace\s+)?function\s+public\.([a-z0-9_]+)/g,
    ),
  ];
  check(
    `${file} introduces no new public function`,
    fns.length === 0,
    fns.map((m) => m[1]),
  );
}

/* ------------------------------------------------------- data-write safety */

// A migration that writes rows runs against production data. Any UPDATE must
// be scoped by a WHERE clause; an unscoped one rewrites every tenant's rows.
console.log("\nData writes are scoped");
for (const file of files) {
  const sql = readSql(file);
  const updates = [
    ...sql.matchAll(/update\s+public\.[a-z0-9_]+[\s\S]*?(?=;)/g),
  ];
  for (const [statement] of updates) {
    check(
      `${file}: every update is scoped by a where clause`,
      /\bwhere\b/.test(statement),
      statement.slice(0, 80),
    );
  }
}

/* -------------------------------------------- the 181 capability backfill */

// 181 promotes publish_capability to 'direct' on live production rows. That
// is only defensible if it records EVIDENCE rather than an assumption: a
// connection that merely holds a token has not demonstrated it can publish,
// and marking it 'direct' would be exactly the "connected when it isn't"
// failure the whole capability model exists to prevent.
const BACKFILL = "181_integration_connection_model.sql";
if (files.includes(BACKFILL)) {
  const sql = readSql(BACKFILL);
  const statement =
    sql.match(
      /update\s+public\.marketing_connected_accounts[\s\S]*?(?=;)/,
    )?.[0] ?? "";

  console.log("\nThe 181 capability backfill is evidence-scoped");
  check(
    "promotes only rows that currently hold a credential",
    /exists\s*\([\s\S]*?marketing_connected_account_secrets[\s\S]*?\)/.test(
      statement,
    ),
  );
  check(
    "promotes only rows with a COMPLETED external publish on record",
    /exists\s*\([\s\S]*?marketing_channel_deliveries[\s\S]*?delivery_state\s*=\s*'posted'[\s\S]*?\)/.test(
      statement,
    ),
  );
  check(
    "requires a provider-issued post id, not merely a local state",
    /provider_post_id\s+is\s+not\s+null/.test(statement),
  );
  check(
    "never demotes or overwrites an established capability",
    /publish_capability\s*=\s*'none'/.test(statement),
  );
  check(
    "matches the delivery to the same company, not just the account",
    /d\.company_id\s*=\s*a\.company_id/.test(statement),
  );
}

/* ------------------------------------------- bigserial sequence grants */

// ============ THE 42501 CLASS OF BUG, MADE UNSHIPPABLE ============
// `grant all on TABLE x to service_role` does NOT cover the sequence a
// `bigserial` column creates, and in this database the default privileges do
// not either. Migrations 142, 188 and 189 all shipped that way: every SELECT
// worked, every service-role INSERT failed with 42501 "permission denied for
// sequence", and mapDatabaseError rendered it as a permission error that sent
// the founder auditing authorization gates that were never involved (found
// live 2026-09-01; repaired by migration 190).
//
// This sweep covers EVERY migration, not just >= FIRST_CHECKED, because 142
// predates that horizon and carried the bug: any migration that creates a
// bigserial column on a table it grants to service_role must grant the
// backing sequence in the same file.
console.log("\nEvery service-role bigserial table grants its sequence");
{
  const allFiles = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let bigserialTables = 0;
  for (const file of allFiles) {
    const sql = readSql(file);
    if (!/\bbigserial\b/.test(sql)) continue;

    for (const table of sql.matchAll(
      /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.([a-z0-9_]+)\s*\(([\s\S]*?)\n\)/g,
    )) {
      const [, tableName, body] = table;
      const grantedToServiceRole = new RegExp(
        `grant\\s+[a-z, ]*on\\s+table\\s+public\\.${tableName}\\s+to\\s+service_role`,
      ).test(sql);
      for (const col of body.matchAll(/^\s*([a-z0-9_]+)\s+bigserial\b/gm)) {
        if (!grantedToServiceRole) continue;
        bigserialTables += 1;
        const sequence = `public.${tableName}_${col[1]}_seq`;
        check(
          `${file}: ${sequence} is granted to service_role`,
          new RegExp(
            `grant\\s+usage,\\s*select\\s+on\\s+sequence\\s+${sequence.replace(/\./g, "\\.")}\\s+to\\s+service_role`,
          ).test(sql),
        );
      }
    }
  }
  check(
    "the sweep found the known bigserial tables (not vacuous)",
    bigserialTables >= 3,
    bigserialTables,
  );
}

// Migration 190 must repair every already-applied environment: one grant per
// known queue sequence, and nothing else in it may be destructive (the
// destructive sweep above only covers >= 179 by number — 190 is included).
{
  const repair = readSql("190_agent_queue_sequence_grants.sql");
  for (const sequence of [
    "agent_marketing_decisions_seq_seq",
    "agent_chief_messages_seq_seq",
    "agent_work_requests_seq_seq",
  ]) {
    check(
      `190 repairs ${sequence}`,
      new RegExp(
        `grant\\s+usage,\\s*select\\s+on\\s+sequence\\s+public\\.${sequence}\\s+to\\s+service_role`,
      ).test(repair),
    );
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
