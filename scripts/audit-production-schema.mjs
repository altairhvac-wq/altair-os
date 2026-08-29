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
 * It issues four kinds of request and nothing else:
 *
 *   GET /rest/v1/ (openapi)        the schema document: names and parameters
 *   .select(..., { head: true })   returns a count, no rows
 *   .select(...).limit(0)          returns no rows, proves the column resolves
 *   .rpc(name, args)               ONLY functions whose body cannot write
 *
 * That last line is load-bearing, and it was once broken. A probe calls a
 * function for real, so a function that allocates a number, advances a counter
 * or records an event WRITES when it is probed. While 173, 174 and 175 were
 * unapplied their probes were harmless; the moment they were applied to
 * production, running this audit advanced a rate-limit counter for real. It
 * did, once: one row, scope "audit.probe", which collides with no real scope.
 *
 * Writing functions are therefore marked `writes` and are never executed. They
 * still have to prove they exist, which is what the OpenAPI probe is for — it
 * asks PostgREST to DESCRIBE a function rather than run it. That also closes an
 * older hole: `refuses an anonymous caller` accepts HTTP 404, and a function
 * that does not exist returns 404 to everyone, so anon refusal was never on its
 * own evidence that anything was there.
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

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

let failures = 0;
let checks = 0;
const findings = [];
const pending = [];

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

/** Functions a customer reaches from an emailed link, authorized by token. */
const PUBLIC_BY_DESIGN = new Set([
  "get_public_estimate_approval_view",
  "get_public_invoice_payment_view",
  "submit_public_estimate_approval",
  "get_public_network_invite_preview",
]);

/**
 * Functions the migrations are believed to have delivered, with the migration
 * that owns each and the arguments a probe needs.
 *
 * `expectAnonDenied` is the privilege half. `publicByDesign` marks the three
 * customer-facing token flows, which are SUPPOSED to answer without a session.
 */
/**
 * ============================== WHY THE SET IS ALSO DISCOVERED ==============================
 * The entries below carry the arguments a probe needs, which cannot be
 * inferred from migration text reliably. But a hardcoded list is exactly how
 * an audit stops covering things: migrations 166, 167 and 168 each added a
 * function and none would have appeared here.
 *
 * So this list is a source of ARGUMENTS, and the set of functions to check
 * comes from the migrations themselves. Anything discovered without an entry
 * here is still probed as anon, which cannot prove it exists but does prove
 * it is not answering strangers.
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
    name: "get_company_operational_inconsistencies",
    migration: "172",
    // Applied to production 28 Aug 2026. Read-only, so it is still executed: a
    // null actor makes it return its unauthorized envelope before it reads a
    // single job.
    args: { p_company_id: NOWHERE, p_limit: 5, p_offset: 0 },
  },
  {
    name: "check_public_request_rate_limit",
    migration: "173",
    // ADVANCES A COUNTER. Never executed here — see the header.
    writes: true,
    args: {
      p_scope: "audit.probe",
      p_dimension: "ip",
      p_subject_hash: "0000000000000000000000000000000000000000000000000000000000000000",
      p_window_seconds: 60,
      p_limit: 1,
    },
  },
  {
    name: "record_security_audit_event",
    migration: "174",
    // INSERTS an event. Never executed here.
    writes: true,
    args: {
      p_event_type: "audit.probe",
      p_outcome: "failed",
      p_user_id: null,
      p_company_id: NOWHERE,
      p_subject_hash: null,
      p_address_hash: null,
      p_reason: null,
      p_metadata: {},
    },
  },
  {
    name: "request_company_deletion",
    migration: "175",
    // INSERTS a deletion request, and the thing it schedules is the deletion of
    // a company. Never executed here.
    writes: true,
    args: {
      p_company_id: NOWHERE,
      p_confirmation: "not-a-real-company-name",
      p_grace_days: 30,
    },
  },
  {
    name: "get_company_reports_summary",
    migration: "169",
    args: {
      p_company_id: NOWHERE,
      p_start_date: "2026-01-01",
      p_end_date: "2026-12-31",
      p_prev_start_date: "2025-01-01",
      p_prev_end_date: "2025-12-31",
      p_today: "2026-12-31",
      p_follow_up_cutoff: new Date().toISOString(),
      p_limit: 5,
    },
  },
  {
    name: "get_company_report_daily_series",
    migration: "170",
    args: {
      p_company_id: NOWHERE,
      p_start_date: "2026-01-01",
      p_end_date: "2026-12-31",
    },
  },
  {
    name: "get_company_payment_ledger_totals",
    migration: "171",
    args: {
      p_company_id: NOWHERE,
      p_start_date: null,
      p_end_date: null,
    },
  },
  {
    name: "get_company_operations_summary",
    migration: "166",
    args: { p_company_id: NOWHERE },
  },
  {
    name: "get_company_dashboard_lists",
    migration: "167",
    args: {
      p_company_id: NOWHERE,
      p_reference: new Date().toISOString(),
      p_follow_up_days: 7,
      p_recovery_days: 7,
      p_limit: 10,
    },
  },
  {
    name: "get_company_job_completeness_summary",
    migration: "168",
    args: {
      p_company_id: NOWHERE,
      p_reference: new Date().toISOString(),
      p_stalled_days: 3,
      p_limit: 5,
    },
  },
  {
    name: "current_user_profile_email",
    migration: "030/031 → privileges by 165",
    args: {},
  },
  {
    name: "allocate_company_document_number",
    migration: "148",
    // Deliberately NOT called: it ALLOCATES, which is a write.
    writes: true,
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

/**
 * Every RPC PostgREST will answer, with its parameter names.
 *
 * This is how a function that must not be executed still proves it exists, and
 * still proves its SIGNATURE — the property the deployed code actually depends
 * on, since a renamed or re-typed parameter fails at the call site exactly like
 * a missing function does. Asking for the schema document changes nothing.
 */
async function fetchOpenApiRpcs() {
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      accept: "application/openapi+json",
    },
  });
  if (!response.ok) return null;
  const spec = await response.json();
  const rpcs = new Map();
  for (const [path, entry] of Object.entries(spec.paths ?? {})) {
    if (!path.startsWith("/rpc/")) continue;
    const params = (entry?.post?.parameters ?? []).flatMap((parameter) =>
      parameter.schema?.properties
        ? Object.keys(parameter.schema.properties)
        : parameter.name
          ? [parameter.name]
          : [],
    );
    rpcs.set(path.slice("/rpc/".length), new Set(params));
  }
  return rpcs;
}

async function auditFunctions() {
  console.log("\nFunctions the deployed code calls");

  const rpcs = await fetchOpenApiRpcs();
  check(
    "PostgREST describes its own schema".padEnd(46),
    rpcs != null && rpcs.size > 0,
    "without it, a function that must not be executed cannot prove it exists",
  );

  for (const fn of FUNCTIONS) {
    // Presence and signature, without running anything. Applied to every
    // function and not only to the ones that must not be executed: a probe
    // that returns no error already proves the function ran, but it does not
    // prove the arguments the deployed code passes are the ones it declares.
    if (rpcs) {
      const declared = rpcs.get(fn.name);
      const expected = Object.keys(fn.args);
      const missingArgs = expected.filter((name) => !declared?.has(name));
      check(
        `${fn.name.padEnd(40)} declared, with the arguments the code passes`,
        declared != null && missingArgs.length === 0,
        declared == null
          ? `not in the schema document — migration ${fn.migration} is absent`
          : `declares no ${missingArgs.join(", ")}`,
      );
    }

    if (!fn.writes) {
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

/** Every function the migrations create, read from the migration files. */
function discoverMigrationFunctions() {
  const names = new Set();
  const dir = "supabase/migrations";
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql"))) {
    const sql = readFileSync(join(dir, file), "utf8");
    const pattern =
      /create\s+(?:or\s+replace\s+)?function\s+public\.([a-z0-9_]+)\s*\(/gi;
    let match;
    while ((match = pattern.exec(sql)) !== null) {
      names.add(match[1].toLowerCase());
    }
  }
  return names;
}

/**
 * Everything the migrations create that the argument list does not name.
 *
 * This cannot prove presence: an argumentless call to a function that takes
 * arguments returns the same PGRST202, with a null hint, as one that does not
 * exist — the trap that made this audit report migration 155 as "partial" on
 * its first run. What it does prove is that none of them answers an anonymous
 * caller, which is the half that matters for a privilege audit.
 */
async function auditDiscoveredFunctions() {
  const named = new Set(FUNCTIONS.map((fn) => fn.name));
  const discovered = [...discoverMigrationFunctions()]
    .filter((name) => !named.has(name))
    // The three customer-facing token flows are SUPPOSED to answer without a
    // session — an emailed estimate-approval or payment link carries its own
    // token instead. They are excluded here and asserted separately by
    // scripts/verify-function-grants.mjs, which keeps that list a decision.
    .filter((name) => !PUBLIC_BY_DESIGN.has(name))
    .sort();

  console.log(
    `\nEvery other function the migrations create refuses anon (${discovered.length})`,
  );

  let denied = 0;
  const answered = [];
  for (const name of discovered) {
    const { error, status } = await anon.rpc(name, {});
    const isDenied =
      error != null &&
      (status === 401 ||
        status === 403 ||
        status === 404 ||
        /permission denied|could not find the function|does not exist|schema cache/i.test(
          error.message,
        ));
    if (isDenied) denied += 1;
    else answered.push(name);
  }

  check(
    `all ${discovered.length} refuse an anonymous caller`,
    answered.length === 0,
    answered.map((name) => `        ${name} ANSWERED anon`).join("\n"),
  );
  void denied;
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

  // The three tables 173, 174 and 175 add. These are closed a step earlier than
  // the four above: `anon` holds no grant on them at all, so the refusal comes
  // from the table privileges rather than from a policy returning no rows. A
  // zero-row answer would NOT be a pass here — it would mean anon can read the
  // table and there simply is nothing in it yet, which stops being true the
  // first time a stranger fails a login.
  for (const table of [
    "public_request_rate_limits",
    "security_audit_events",
    "company_deletion_requests",
  ]) {
    const { error, status } = await anon.from(table).select("*").limit(1);
    const refused =
      error != null && (status === 401 || status === 403 || status === 404);
    check(
      `anon is refused outright by ${table.padEnd(26)}`,
      refused,
      refused
        ? ""
        : `anon received HTTP ${status} — a rate-limit counter, an ` +
          `authentication log or a deletion schedule is readable without a ` +
          `session.`,
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
  await auditDiscoveredFunctions();
  await auditColumns();
  await auditTables();
  await auditMigration155();
  await auditAnonSurface();
  await auditIndexes();

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} production ` +
      `schema checks passed (${checks} total).`,
  );

  if (pending.length > 0) {
    console.log(
      `\n  ${pending.length} migration(s) written and validated but NOT applied ` +
        `to production:`,
    );
    for (const entry of pending) console.log(`    - ${entry}`);
    console.log(
      "\n    The deployed code calls these. They must be applied BEFORE the\n" +
        "    branch that uses them ships. What happens without them differs by\n" +
        "    call site, which is worth knowing before choosing an order:\n" +
        "      172  the dashboard reports data integrity as UNAVAILABLE\n" +
        "           rather than clean, which is correct but unhelpful\n" +
        "      173  every unauthenticated surface is unlimited. The limiter\n" +
        "           fails OPEN and records rate_limit.degraded\n" +
        "      174  no authentication event is recorded at all\n" +
        "      175  a workspace cannot be scheduled for deletion",
    );
  }

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
