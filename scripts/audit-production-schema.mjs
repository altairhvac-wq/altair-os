/**
 * Production schema-state audit (Phase 5E). READ ONLY.
 *
 * ===================== WHY THIS EXISTS =====================
 * The deployment history has not always matched the migration filenames. A row
 * in a migration-history table says a file ran; it does not say the objects that
 * file was supposed to create are present, executable, and carrying the right
 * privileges. Migration 151 is the standing proof: it was believed applied, and
 * its body references three columns that do not exist, so every call raised.
 *
 * So this asks the database about the OBJECTS, not about the history. Every
 * check below is a behavioural probe of the thing the application actually
 * depends on:
 *
 *   a function        -> call it and see whether PostgREST can find it
 *   a privilege       -> call it as anon and require a refusal
 *   a column          -> select it with limit 0
 *   an index          -> not directly observable over PostgREST; reported as
 *                        such rather than guessed at
 *
 * A probe that proves the object WORKS is worth more than a catalog row saying
 * it exists.
 *
 * ===================== WHY IT CANNOT WRITE =====================
 * It issues three kinds of request and nothing else:
 *
 *   .select(..., { head: true })   returns a count, no rows
 *   .select(...).limit(0)          returns no rows, proves the column resolves
 *   .rpc(name, args)               only functions declared read-only below
 *
 * There is no insert, update, upsert or delete anywhere in this file, and the
 * RPC allowlist is explicit. Nothing here can change production.
 *
 * ===================== WHY IT PRINTS NO CUSTOMER DATA =====================
 * Row CONTENT is never selected into the output. The RPC probes deliberately
 * pass a random uuid with a service-role client, so `auth.uid()` is null and
 * every one of these functions returns its zeros envelope before it reaches a
 * company — the existence of the function is proven without reading a single
 * tenant's numbers.
 *
 * Run:
 *   node scripts/audit-production-schema.mjs --confirm <production-ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

let failures = 0;
let checks = 0;
const findings = [];

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    findings.push({ name, detail });
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

function note(name, text) {
  console.log(`  NOTE  ${name}\n        ${text}`);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (!t.startsWith("--")) continue;
    const key = t.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i += 1;
    } else args[key] = true;
  }
  return args;
}

function fail(message) {
  console.error(`\nREFUSED: ${message}\n`);
  process.exit(1);
}

function readEnvLocal(key) {
  if (!existsSync(".env.local")) return null;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith(`${key}=`));
  return line
    ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
    : null;
}

const args = parseArgs(process.argv.slice(2));
const url = readEnvLocal("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = readEnvLocal("SUPABASE_SERVICE_ROLE_KEY");
const anonKey = readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (!url || !serviceKey || !anonKey) {
  fail(".env.local must supply the Supabase URL, service-role key and anon key.");
}

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL.");
}

if (args.confirm !== ref) {
  fail(
    `--confirm must match the target project ref "${ref}".\n` +
      `This audit is READ ONLY, but naming the target is still required so it ` +
      `cannot be pointed somewhere by accident.`,
  );
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** A uuid that belongs to no company. Every RPC probe uses it. */
const NOWHERE = randomUUID();

/**
 * Functions the migrations are believed to have delivered, with the migration
 * that owns each and the arguments a probe needs.
 *
 * `expectAnonDenied` is the privilege half. `publicByDesign` marks the three
 * customer-facing token flows, which are SUPPOSED to answer without a session.
 */
const FUNCTIONS = [
  {
    name: "get_company_dashboard_aggregates",
    migration: "151 → fixed by 158, privileges by 159",
    args: { p_company_id: NOWHERE, p_reference: new Date().toISOString() },
  },
  {
    name: "get_company_lead_pipeline_metrics",
    migration: "160",
    args: { p_company_id: NOWHERE, p_follow_up_cutoff: new Date().toISOString() },
  },
  {
    name: "get_company_document_queue_metrics",
    migration: "161",
    args: { p_company_id: NOWHERE },
  },
  {
    name: "get_platform_company_rollups",
    migration: "164",
    args: {},
    // service_role only: `authenticated` is revoked because it crosses tenants.
    serviceRoleOnly: true,
  },
  {
    name: "current_user_profile_email",
    migration: "030/031 → privileges by 165",
    args: {},
  },
  {
    name: "allocate_company_document_number",
    migration: "148",
    // Deliberately NOT called: it ALLOCATES, which is a write. Existence is
    // proven by the anon refusal alone.
    probeAsServiceRole: false,
    args: { p_company_id: NOWHERE, p_document_type: "job" },
  },
];

/** Columns a migration added that the application now selects by name. */
const COLUMNS = [
  { table: "customers", column: "phone_match_key", migration: "163" },
  { table: "customers", column: "email_match_key", migration: "163" },
  { table: "cron_checkpoints", column: "cursor_company_id", migration: "152" },
  { table: "cron_checkpoints", column: "cursor_created_at", migration: "152" },
  {
    table: "cron_checkpoints",
    column: "companies_processed_this_cycle",
    migration: "152",
  },
  { table: "job_attachments", column: "job_id", migration: "156 (table only)" },
];

/** Tables a migration created. */
const TABLES = [
  { table: "cron_checkpoints", migration: "152" },
  { table: "company_document_sequences", migration: "148" },
];

/**
 * Migration 155 in full.
 *
 * The stated production position is "155 is intentionally not applied yet", and
 * a single table probe cannot tell "not applied" from "half applied" — which is
 * the more dangerous of the two, because the code would find some of what it
 * needs. Every object 155 creates is listed, and the audit reports the SET.
 */
const MIGRATION_155_TABLES = [
  "ai_rate_limit_counters",
  "ai_usage_events",
  "company_ai_limits",
];
/**
 * Probed BY SIGNATURE, and only as anon.
 *
 * ============================== TWO TRAPS, BOTH HIT ==============================
 * The first attempt called these with no arguments and read PGRST202 as
 * "absent". PostgREST returns the identical message — "Could not find the
 * function ... without parameters in the schema cache", with a null hint — for a
 * function that does not exist AND for one that exists with a different
 * signature. That probe reported migration 155 as PARTIALLY applied, which is
 * the most alarming of the three possible answers and was simply wrong.
 *
 * With the real signature the two cases separate cleanly:
 *   PGRST202              -> genuinely absent
 *   42501 permission denied -> present
 *
 * The second trap is that both of these WRITE — one upserts rate-limit counters,
 * the other inserts a usage row. They are therefore probed as ANON and never as
 * service_role. Migration 155 revokes them from PUBLIC and grants only to
 * authenticated and service_role, so Postgres refuses at the privilege check and
 * the body never executes. The refusal IS the existence proof, and it is the
 * only form of proof available here that cannot write to production.
 */
const MIGRATION_155_FUNCTIONS = [
  {
    name: "check_and_record_ai_request",
    args: {
      p_company_id: NOWHERE,
      p_feature: "schema-audit-probe",
      p_cooldown_seconds: 1,
      p_window_seconds: 1,
      p_window_limit: 1,
      p_default_monthly_token_ceiling: 1,
    },
  },
  {
    name: "record_ai_usage",
    args: {
      p_company_id: NOWHERE,
      p_feature: "schema-audit-probe",
      p_model: "schema-audit-probe",
      p_prompt_tokens: 0,
      p_completion_tokens: 0,
    },
  },
];

async function auditFunctions() {
  console.log("\nFunctions the deployed code calls");

  for (const fn of FUNCTIONS) {
    if (fn.probeAsServiceRole !== false) {
      const { error } = await admin.rpc(fn.name, fn.args);
      // A null actor makes every one of these return its zeros envelope before
      // it reaches a company, so "no error" means present and executable.
      const missing =
        error != null &&
        /could not find the function|does not exist|schema cache/i.test(
          error.message,
        );
      check(
        `${fn.name.padEnd(40)} present and executable  (${fn.migration})`,
        !missing,
        missing ? `PostgREST: ${error.message}` : "",
      );
      if (error && !missing) {
        note(
          fn.name,
          `executed but returned an error, which may be correct for a nowhere ` +
            `company: ${error.message}`,
        );
      }
    }

    const { error: anonError, status } = await anon.rpc(fn.name, fn.args);
    const denied =
      anonError != null &&
      (status === 401 ||
        status === 403 ||
        status === 404 ||
        /permission denied|could not find the function|does not exist|schema cache/i.test(
          anonError.message,
        ));
    check(
      `${fn.name.padEnd(40)} refuses an anonymous caller`,
      denied,
      denied
        ? ""
        : `anon received HTTP ${status} with no error — EXECUTE is still ` +
          `granted to PUBLIC or anon.`,
    );
  }
}

async function auditColumns() {
  console.log("\nColumns the deployed code selects by name");

  for (const entry of COLUMNS) {
    // limit(0) resolves the column without returning a single row.
    const { error } = await admin
      .from(entry.table)
      .select(entry.column)
      .limit(0);
    check(
      `${`${entry.table}.${entry.column}`.padEnd(40)} resolves  (${entry.migration})`,
      error == null,
      error ? `${error.code ?? ""} ${error.message}` : "",
    );
  }
}

async function auditTables() {
  console.log("\nTables");

  for (const entry of TABLES) {
    const { error } = await admin
      .from(entry.table)
      .select("*", { count: "exact", head: true });
    const present = error == null;

    if (entry.expectAbsent) {
      check(
        `${entry.table.padEnd(40)} absent as expected  (${entry.migration})`,
        !present,
        present
          ? `the table EXISTS — migration 155 was applied, which contradicts the ` +
            `stated production state.`
          : "",
      );
      continue;
    }

    check(
      `${entry.table.padEnd(40)} present  (${entry.migration})`,
      present,
      error ? `${error.code ?? ""} ${error.message}` : "",
    );
  }
}

/**
 * Reports whether migration 155 is applied, absent, or partially applied.
 *
 * Deliberately a REPORT and not a pass/fail. Which of the three is correct is a
 * product decision — the AI features are gated by AI_FEATURES_ENABLED as well —
 * and an audit that fails on a deliberate choice teaches people to skip it.
 * What it must never do is leave the state ambiguous.
 */
async function auditMigration155() {
  console.log("\nMigration 155 — AI usage, rate limits, ceilings");

  const presentTables = [];
  for (const table of MIGRATION_155_TABLES) {
    const { error } = await admin
      .from(table)
      .select("*", { count: "exact", head: true });
    if (!error) presentTables.push(table);
  }

  const presentFunctions = [];
  for (const fn of MIGRATION_155_FUNCTIONS) {
    const { error } = await anon.rpc(fn.name, fn.args);
    // PGRST202 with the real signature means genuinely absent. A privilege
    // refusal means present — and means the body did not run.
    const absent = error != null && error.code === "PGRST202";
    if (!absent) presentFunctions.push(fn.name);
  }

  const total = MIGRATION_155_TABLES.length + MIGRATION_155_FUNCTIONS.length;
  const found = presentTables.length + presentFunctions.length;

  if (found === 0) {
    console.log("  STATE  absent — matches a production position of \"not applied\"");
  } else if (found === total) {
    console.log(
      "  STATE  APPLIED — all 3 tables and both functions are present.\n" +
        "         This CONTRADICTS a stated production position of \"155 is\n" +
        "         intentionally not applied yet\". The schema is live; whether the\n" +
        "         FEATURE is live is a separate question governed by\n" +
        "         AI_FEATURES_ENABLED.",
    );
  } else {
    console.log(
      `  STATE  PARTIAL — ${found} of ${total} objects present. This is the\n` +
        "         dangerous case: the code can find some of what it needs.",
    );
  }

  console.log(`         tables present:    ${presentTables.join(", ") || "(none)"}`);
  console.log(
    `         functions present: ${presentFunctions.join(", ") || "(none)"}`,
  );

  // Whatever the intended state, these must not be reachable without a session.
  for (const fn of MIGRATION_155_FUNCTIONS) {
    const { error, status } = await anon.rpc(fn.name, fn.args);
    const denied =
      error != null &&
      (status === 401 ||
        status === 403 ||
        status === 404 ||
        /permission denied|could not find the function|does not exist|schema cache/i.test(
          error.message,
        ));
    check(`${fn.name.padEnd(40)} refuses an anonymous caller`, denied);
  }
}

async function auditAnonSurface() {
  console.log("\nThe unauthenticated surface");

  // A table anon must never read. RLS, not privileges, is what stops this — so
  // a zero-row result is the pass, not an error.
  for (const table of ["invoices", "customers", "leads", "expenses"]) {
    const { data, error } = await anon.from(table).select("id").limit(1);
    const rows = (data ?? []).length;
    check(
      `anon reads no rows from ${table.padEnd(24)}`,
      rows === 0,
      rows > 0
        ? `anon received ${rows} row(s) — RLS is not closing this table.`
        : error
          ? ""
          : "",
    );
  }
}

async function auditIndexes() {
  console.log("\nIndexes");
  note(
    "not observable over PostgREST",
    "Index presence cannot be probed through the data API. Migration 162's five " +
      "keyset indexes and 163's two match-key indexes must be confirmed with a " +
      "catalog query from the Supabase SQL editor — the exact statement is in " +
      "the handoff. Their ABSENCE is a latency problem, not a correctness one, " +
      "which is why this audit reports rather than fails.",
  );
}

async function main() {
  console.log(`\nProduction schema-state audit — READ ONLY`);
  console.log(`Target project: ${ref}`);
  console.log(
    `Probe company:  ${NOWHERE} (belongs to nobody; every RPC returns its ` +
      `zeros envelope)\n`,
  );

  await auditFunctions();
  await auditColumns();
  await auditTables();
  await auditMigration155();
  await auditAnonSurface();
  await auditIndexes();

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} production ` +
      `schema checks passed (${checks} total).`,
  );

  if (failures > 0) {
    console.error("\nMismatches between believed-deployed and actual state:");
    for (const entry of findings) {
      console.error(`  - ${entry.name}`);
    }
    process.exit(1);
  }

  console.log(
    "\n  Nothing was written. Every request was a head count, a zero-row " +
      "select, or a read-only RPC against a company that does not exist.\n",
  );
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
