/**
 * Invoice and estimate queue differential (P0-14).
 *
 * ===================== THE TRAP THIS EXISTS TO CATCH =====================
 * The two lists look like the same list twice. They are not, and the difference
 * is in the lifecycle:
 *
 *   getInvoiceLifecycleState  checks deleted, then VOIDED, then archived — so a
 *                             void or cancelled invoice is NOT active, and the
 *                             invoice Past queue selects that voided state.
 *   getEstimateLifecycleState has no voided state — deleted, archived, active —
 *                             so a converted or cancelled estimate IS still
 *                             active, and the estimate Past queue selects on
 *                             status from inside it.
 *
 * Writing one by copying the other empties a queue, and it empties it quietly.
 * So this imports the REAL predicates, the REAL mappers and the REAL SQL
 * builders, and asserts set equality per queue on both entities.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-document-filters-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { matchesInvoiceWorkQueue } from "@/shared/components/invoices/invoice-work-queues";
import { matchesEstimateWorkQueue } from "@/shared/components/estimates/estimate-work-queues";
import { mapInvoiceRowToInvoice } from "@/lib/database/mappers/invoice";
import { mapEstimateRowToEstimate } from "@/lib/database/queries/estimates";
import {
  applyEstimateQueueFilters,
  applyInvoiceQueueFilters,
} from "@/lib/database/queries/document-queue-filters";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const SLUG_PREFIX = "loadtest-docfilters-";
const RUN_ID = Math.random().toString(36).slice(2, 10);

const INVOICE_STATUSES = [
  "draft", "sent", "viewed", "partially_paid", "paid", "overdue", "void", "cancelled",
];
const INVOICE_QUEUES = ["draft", "sent", "partially_paid", "overdue", "paid", "past"];

const ESTIMATE_STATUSES = ["draft", "sent", "approved", "declined", "cancelled", "converted"];
const ESTIMATE_QUEUES = ["draft", "sent", "approved", "declined", "past"];

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
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

function readEnvLocalSupabaseUrl() {
  if (!existsSync(".env.local")) return null;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const key = process.env[KEY_ENV]?.trim();
if (!url || !key) fail(`${URL_ENV} and ${KEY_ENV} must both be set.`);

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
const appUrl = readEnvLocalSupabaseUrl();
if (appUrl && appUrl === url) fail("Target is the application's own project. Use scratch.");
if (args.confirm !== ref) fail(`--confirm must match the target project ref "${ref}".`);

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let company = null;

const INVOICE_SELECT = `
  *,
  customers(name, email),
  jobs(job_number),
  estimates(estimate_number),
  invoice_line_items(id)
`;
const ESTIMATE_SELECT = `
  *,
  customers(name, email),
  jobs(job_number),
  estimate_line_items(id)
`;

async function buildFixture() {
  const { data: co, error } = await admin
    .from("companies")
    .insert({ name: `[DOCFILTERS] ${RUN_ID}`, slug: `${SLUG_PREFIX}${RUN_ID}`, trade: "hvac" })
    .select("id")
    .single();
  if (error) throw new Error(`company: ${error.message}`);
  company = co;

  const { data: customer } = await admin
    .from("customers")
    .insert({ company_id: company.id, name: "[DOCFILTERS] Customer" })
    .select("id")
    .single();

  // Every status crossed with every lifecycle state — the combinations where
  // the two entities genuinely differ.
  const lifecycles = [
    { label: "plain", extra: {} },
    { label: "archived", extra: { archived_at: new Date().toISOString() } },
    { label: "deleted", extra: { deleted_at: new Date().toISOString() } },
  ];

  let seq = 0;
  const invoices = [];
  for (const status of INVOICE_STATUSES) {
    for (const lifecycle of lifecycles) {
      seq += 1;
      invoices.push({
        company_id: company.id,
        customer_id: customer.id,
        invoice_number: `INV-DF-${RUN_ID}-${seq}`,
        status,
        subtotal: 100,
        total: 100,
        amount_paid: status === "paid" ? 100 : 0,
        balance_due: status === "paid" ? 0 : 100,
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: new Date().toISOString().slice(0, 10),
        ...lifecycle.extra,
      });
    }
  }
  {
    const { error: e } = await admin.from("invoices").insert(invoices);
    if (e) throw new Error(`invoices: ${e.message}`);
  }

  seq = 0;
  const estimates = [];
  for (const status of ESTIMATE_STATUSES) {
    for (const lifecycle of lifecycles) {
      seq += 1;
      estimates.push({
        company_id: company.id,
        customer_id: customer.id,
        estimate_number: `EST-DF-${RUN_ID}-${seq}`,
        status,
        subtotal: 100,
        total: 100,
        ...lifecycle.extra,
      });
    }
  }
  {
    const { error: e } = await admin.from("estimates").insert(estimates);
    if (e) throw new Error(`estimates: ${e.message}`);
  }

  console.log(`  ${invoices.length} invoices, ${estimates.length} estimates`);
}

async function compareQueues({ label, table, select, map, queues, matches, applyFilters }) {
  const { data: rows, error } = await admin
    .from(table)
    .select(select)
    .eq("company_id", company.id);
  if (error) throw new Error(`${table} fetch: ${error.message}`);

  const records = rows.map(map);
  console.log(`\n${label} queues agree with the shipped predicates`);

  for (const queue of queues) {
    const expected = new Set(
      records.filter((record) => matches(record, queue)).map((r) => r.id),
    );

    const { data, error: queryError } = await applyFilters(
      admin.from(table).select("id").eq("company_id", company.id),
      queue,
    );
    if (queryError) {
      check(`${label} "${queue}"`, false, queryError.message);
      continue;
    }

    const actual = new Set((data ?? []).map((r) => r.id));
    const missing = [...expected].filter((id) => !actual.has(id));
    const extra = [...actual].filter((id) => !expected.has(id));

    check(
      `${label} "${queue}" agrees (${expected.size} expected)`,
      missing.length === 0 && extra.length === 0,
      [
        missing.length ? `SQL missed ${missing.length}` : "",
        extra.length ? `SQL wrongly included ${extra.length}` : "",
      ]
        .filter(Boolean)
        .join(", "),
    );
  }
}

async function cleanup() {
  if (!company) return;
  for (const table of ["invoice_line_items", "estimate_line_items", "invoices", "estimates", "customers"]) {
    await admin.from(table).delete().eq("company_id", company.id);
  }
  await admin.from("companies").delete().eq("id", company.id);
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Run id:         ${RUN_ID}\n`);
  try {
    await buildFixture();

    await compareQueues({
      label: "Invoice",
      table: "invoices",
      select: INVOICE_SELECT,
      map: mapInvoiceRowToInvoice,
      queues: INVOICE_QUEUES,
      matches: matchesInvoiceWorkQueue,
      applyFilters: applyInvoiceQueueFilters,
    });

    await compareQueues({
      label: "Estimate",
      table: "estimates",
      select: ESTIMATE_SELECT,
      map: mapEstimateRowToEstimate,
      queues: ESTIMATE_QUEUES,
      matches: matchesEstimateWorkQueue,
      applyFilters: applyEstimateQueueFilters,
    });

    // The asymmetry, asserted directly rather than left implicit.
    console.log("\nThe two lifecycles really do differ");
    const { data: voidInvoices } = await applyInvoiceQueueFilters(
      admin.from("invoices").select("id, status, archived_at").eq("company_id", company.id),
      "past",
    );
    check(
      "a voided invoice counts as Past even when archived",
      (voidInvoices ?? []).some((row) => row.archived_at !== null),
      "getInvoiceLifecycleState checks voided BEFORE archived",
    );

    const { data: draftEstimates } = await applyEstimateQueueFilters(
      admin.from("estimates").select("id, archived_at").eq("company_id", company.id),
      "draft",
    );
    check(
      "an archived estimate is excluded from its status queue",
      (draftEstimates ?? []).every((row) => row.archived_at === null),
    );
  } finally {
    console.log("\nCleaning up fixture...");
    await cleanup();
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} document filter checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  cleanup().finally(() => process.exit(1));
});
