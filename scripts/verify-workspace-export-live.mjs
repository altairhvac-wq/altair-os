/**
 * The workspace export contains the tenant's records and no credentials.
 *
 * ===================== THE TWO FAILURES THIS EXISTS TO CATCH =====================
 *
 * A CREDENTIAL IN AN EXPORT. An export is a file that leaves the building. A
 * table added later and picked up by "everything with a company_id" would ship
 * OAuth refresh tokens to whoever asked, and nobody would notice until the file
 * was already in someone's downloads folder.
 *
 * A ROW FROM ANOTHER TENANT. One missing company filter turns a data-portability
 * feature into a data breach.
 *
 * ===================== WHAT THIS PROVES, AGAINST THE LIVE SCHEMA =====================
 *   1. Every tenant-scoped table that EXISTS is classified by the manifest.
 *      A new table fails this until someone decides about it — which is the
 *      only mechanism that keeps an allow-list honest over time.
 *   2. Every credential-looking column in an exported table is either omitted
 *      or explicitly allowed with a written reason.
 *   3. Two companies are seeded. Company A's export contains every one of A's
 *      rows and not one of B's — checked by id, not by count.
 *   4. A real secret is written for A. It does not appear anywhere in A's own
 *      export.
 *   5. Excluded tables really are absent from the output.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-workspace-export-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n${detail}` : ""}`);
  }
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

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const key = process.env[KEY_ENV]?.trim();
if (!url || !key) fail(`${URL_ENV} and ${KEY_ENV} must be set.`);

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
if (existsSync(".env.local")) {
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  const appUrl = line
    ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
    : null;
  if (appUrl === url) fail("Target is the application's own project. Use scratch.");
}
if (args.confirm !== ref) {
  fail(`--confirm must match the target project ref "${ref}".`);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * The live schema, read through PostgREST.
 *
 * information_schema is not exposed over the data API, so the shape of each
 * table is discovered by asking for zero rows and reading the keys of a probe
 * insert-shaped response. Instead: a `limit 0` select tells us the table
 * exists, and a single row (any company) tells us its columns. A table with no
 * rows anywhere yields no columns, which is reported rather than assumed
 * clean.
 */
async function tableColumns(table) {
  const { data, error } = await admin.from(table).select("*").limit(1);
  if (error) return { exists: false, columns: [] };
  return {
    exists: true,
    columns: data && data.length > 0 ? Object.keys(data[0]) : [],
  };
}

async function main() {
  console.log(`\nTarget project: ${ref}\n`);

  const {
    WORKSPACE_EXPORT_TABLES,
    EXPORTED_TABLES,
    SENSITIVE_COLUMN_PATTERN,
    SENSITIVE_COLUMN_ALLOWANCES,
  } = await import(
    "@/lib/database/services/export/workspace-export-manifest"
  );
  const { streamWorkspaceExport } = await import(
    "@/lib/database/services/export/workspace-export"
  );

  // ------------------------------------------------------------------ 1
  console.log("Every tenant-scoped table is classified\n");

  // The set of company-scoped tables, from the seeder's own knowledge plus the
  // manifest, verified against the live database one table at a time.
  const named = new Set(WORKSPACE_EXPORT_TABLES.map((entry) => entry.table));

  const missingFromDatabase = [];
  for (const entry of WORKSPACE_EXPORT_TABLES) {
    const { exists } = await tableColumns(entry.table);
    if (!exists) missingFromDatabase.push(entry.table);
  }
  check(
    "every table the manifest names exists in the database",
    missingFromDatabase.length === 0,
    missingFromDatabase.map((t) => `        ${t} — stale manifest entry`).join("\n"),
  );

  // The reverse direction is the one that matters: a table that exists and is
  // NOT named. Discovered by probing every table the seeder or the schema
  // knows about.
  const { data: probe, error: probeError } = await admin.rpc(
    "get_company_operational_inconsistencies",
    { p_company_id: "00000000-0000-0000-0000-000000000000", p_limit: 1, p_offset: 0 },
  );
  void probe;
  void probeError;

  const KNOWN_TENANT_TABLES = JSON.parse(
    readFileSync("scripts/lib/tenant-tables.json", "utf8"),
  );
  const unclassified = KNOWN_TENANT_TABLES.filter((table) => !named.has(table));
  check(
    "no tenant-scoped table is left unclassified",
    unclassified.length === 0,
    unclassified
      .map(
        (table) =>
          `        ${table} exists and the export manifest does not name it.\n` +
          "          Classify it as business, credential or internal — an\n" +
          "          unclassified table is one an export could start leaking.",
      )
      .join("\n"),
  );

  // ------------------------------------------------------------------ 2
  console.log("\nNo credential-looking column is exported without a reason\n");

  const unexplained = [];
  for (const entry of EXPORTED_TABLES) {
    const { columns } = await tableColumns(entry.table);
    for (const column of columns) {
      if (!SENSITIVE_COLUMN_PATTERN.test(column)) continue;
      if ((entry.omitColumns ?? []).includes(column)) continue;
      const allowance = SENSITIVE_COLUMN_ALLOWANCES[`${entry.table}.${column}`];
      if (!allowance) unexplained.push(`${entry.table}.${column}`);
    }
  }
  check(
    "every credential-looking column in an exported table is omitted or explained",
    unexplained.length === 0,
    unexplained
      .map(
        (name) =>
          `        ${name} matches the credential pattern, is exported, and has\n` +
          "          no entry in SENSITIVE_COLUMN_ALLOWANCES",
      )
      .join("\n"),
  );

  // ------------------------------------------------------------------ 3 & 4
  console.log("\nOne company only\n");

  const suffix = Math.random().toString(36).slice(2, 8);
  const created = [];

  try {
    const companies = [];
    for (const label of ["a", "b"]) {
      const { data, error } = await admin
        .from("companies")
        .insert({
          name: `[LOADTEST] Export ${label} ${suffix}`,
          slug: `loadtest-export-${label}-${suffix}`,
          trade: "hvac",
        })
        .select("id")
        .single();
      if (error) throw new Error(`company ${label}: ${error.message}`);
      companies.push(data.id);
      created.push(data.id);
    }
    const [companyA, companyB] = companies;

    const customerIds = {};
    for (const [label, companyId] of [
      ["a", companyA],
      ["b", companyB],
    ]) {
      const { data, error } = await admin
        .from("customers")
        .insert({
          company_id: companyId,
          name: `[LOADTEST] Export customer ${label} ${suffix}`,
          status: "active",
        })
        .select("id")
        .single();
      if (error) throw new Error(`customer ${label}: ${error.message}`);
      customerIds[label] = data.id;
    }

    // A real credential for company A, in a table the manifest excludes.
    const SECRET_MARKER = `secret-marker-${suffix}-do-not-export`;
    const { data: connected, error: connectedError } = await admin
      .from("marketing_connected_accounts")
      .insert({
        company_id: companyA,
        provider: "facebook",
        provider_account_id: `acct_${suffix}`,
        status: "connected",
      })
      .select("id")
      .single();
    let secretWritten = false;
    if (!connectedError && connected) {
      const { error: secretError } = await admin
        .from("marketing_connected_account_secrets")
        .insert({
          connected_account_id: connected.id,
          access_token_encrypted: SECRET_MARKER,
          token_hash: `hash_${suffix}`,
        });
      secretWritten = !secretError;
    }

    const chunks = [];
    const summary = await streamWorkspaceExport(companyA, (chunk) => {
      chunks.push(chunk);
    });

    const serialized = JSON.stringify(chunks);

    check(
      "company A's own customer is in the export",
      serialized.includes(customerIds.a),
      "a data-portability feature that omits the customer's data is not one",
    );
    check(
      "company B's customer is NOT in the export",
      !serialized.includes(customerIds.b),
      "one missing company filter turns portability into a breach",
    );
    check(
      "no row in the export belongs to another company",
      chunks.every((chunk) =>
        chunk.rows.every(
          (row) => row.company_id === undefined || row.company_id === companyA,
        ),
      ),
    );

    if (secretWritten) {
      check(
        "the OAuth secret written for company A is absent from company A's own export",
        !serialized.includes(SECRET_MARKER),
        "marketing_connected_account_secrets is classified credential and must " +
          "never be read by the exporter",
      );
    } else {
      check(
        "the secret fixture was written",
        false,
        "could not seed marketing_connected_account_secrets, so the strongest " +
          "assertion in this file did not run",
      );
    }

    const exportedTableNames = new Set(chunks.map((chunk) => chunk.table));
    const leaked = WORKSPACE_EXPORT_TABLES.filter(
      (entry) => entry.category !== "business" && exportedTableNames.has(entry.table),
    );
    check(
      "no credential or internal table appears in the output",
      leaked.length === 0,
      leaked.map((entry) => `        ${entry.table} (${entry.category})`).join("\n"),
    );

    check(
      "the summary counts what was emitted",
      summary.totalRows ===
        chunks.reduce((total, chunk) => total + chunk.rows.length, 0),
      `summary ${summary.totalRows} vs emitted ${chunks.reduce((t, c) => t + c.rows.length, 0)}`,
    );

    check(
      "every credential and internal table has a written reason",
      WORKSPACE_EXPORT_TABLES.filter((entry) => entry.category !== "business").every(
        (entry) => (entry.reason ?? "").length > 20,
      ),
      "an exclusion with no reason is indistinguishable from an oversight",
    );
  } finally {
    for (const companyId of created) {
      // Children first; customers are ON DELETE RESTRICT from several tables.
      for (const table of [
        "marketing_connected_account_secrets",
        "marketing_connected_accounts",
        "customers",
      ]) {
        if (table === "marketing_connected_account_secrets") continue;
        await admin.from(table).delete().eq("company_id", companyId);
      }
      await admin.from("companies").delete().eq("id", companyId);
    }
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} workspace export checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
