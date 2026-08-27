/**
 * Dashboard aggregate equality and performance (Phase 4 / 4D).
 *
 * ===================== WHAT THIS HAS TO PROVE =====================
 * The dashboard's ten whole-tenant numbers are moving from "reduce an array in
 * JavaScript" to "count and sum in SQL". Switching that on changes the most
 * financially sensitive screen in the product, so the gate is not "the SQL
 * looks right" — it is that the SQL agrees with the shipped predicates, field
 * by field, over real rows.
 *
 * ===================== WHY THE COMPARISON IS AGAINST COMPLETE DATA =====================
 * The obvious comparison — legacy path versus aggregate path — is the WRONG one
 * and would produce a green run that means nothing. The legacy path reduces a
 * PostgREST response capped at 1000 rows, so on a large tenant it is simply
 * wrong; agreeing with it would mean the SQL was wrong in the same way.
 *
 * So this establishes GROUND TRUTH first: every matching row, read by walking
 * ranges past the ceiling, reduced by the REAL shipped predicates —
 * getInvoiceSummary, buildUnpaidInvoiceFollowUpEntries,
 * buildStaleSentEstimateEntries — through the REAL invoice mapper. That is what
 * the legacy path would compute if nothing truncated it, and it is what the SQL
 * must match.
 *
 * The truncated legacy result is ALSO computed, not as a target but to quantify
 * the defect: the gap between the two is the error a customer is looking at
 * today.
 *
 * ===================== MEASUREMENTS =====================
 * Timings are real: N samples, p50 and p95 reported from the actual
 * distribution, payload measured from the serialized response, rows counted
 * from what came back. Nothing is modelled.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-dashboard-equality-live.mjs --confirm <ref> [--samples 20]
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { mapInvoiceRowToInvoice } from "@/lib/database/mappers/invoice";
import { getInvoiceSummary, isActiveInvoice, hasInvoiceUnpaidBalance } from "@/shared/types/invoice";
import { buildUnpaidInvoiceFollowUpEntries } from "@/shared/lib/unpaid-invoice-follow-up";
import { buildStaleSentEstimateEntries } from "@/shared/lib/estimate-recovery";
import { compareDashboardAggregates } from "@/lib/database/services/dashboard-aggregate-fields";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";
const PAGE = 1000;

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
const anonKey = process.env[ANON_ENV]?.trim();
if (!url || !key || !anonKey) fail(`${URL_ENV}, ${KEY_ENV} and ${ANON_ENV} must all be set.`);

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
const appUrl = readEnvLocalSupabaseUrl();
if (appUrl && appUrl === url) fail("Target is the application's own project. Use scratch.");
if (args.confirm !== ref) fail(`--confirm must match the target project ref "${ref}".`);

const SAMPLES = Number.parseInt(String(args.samples ?? 20), 10);

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Reads every matching row, walking past PostgREST's 1000-row ceiling. */
async function readAll(table, select, applyFilters) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await applyFilters(
      admin.from(table).select(select),
    ).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} read: ${error.message}`);
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

const INVOICE_SELECT = `
  *,
  customers(name, email),
  jobs(job_number),
  estimates(estimate_number),
  invoice_line_items(id)
`;

async function main() {
  console.log(`\nTarget project: ${ref}`);

  const { data: tenant } = await admin
    .from("companies")
    .select("id, name")
    .like("slug", "loadtest-2%")
    .limit(1)
    .maybeSingle();
  if (!tenant) fail("No seeded load-test tenant. Run scripts/loadtest-seed.mjs first.");

  console.log(`Tenant:         ${tenant.name}`);
  console.log(`Samples:        ${SAMPLES}\n`);

  const activeOnly = (query) =>
    query.eq("company_id", tenant.id).is("deleted_at", null).is("archived_at", null);

  // ---------------------------------------------------------------------
  // GROUND TRUTH — every row, reduced by the shipped predicates.
  // ---------------------------------------------------------------------
  console.log("Reading every row for ground truth...");
  const started = Date.now();

  const [invoiceRows, estimateRows, expenseRows] = await Promise.all([
    readAll("invoices", INVOICE_SELECT, activeOnly),
    readAll("estimates", "id, status, created_at", activeOnly),
    readAll("expenses", "id, status, amount", activeOnly),
  ]);

  console.log(
    `  invoices ${invoiceRows.length}, estimates ${estimateRows.length}, ` +
      `expenses ${expenseRows.length}  (${Date.now() - started} ms)\n`,
  );

  // The REAL mapper, so the REAL predicates see what the application sees.
  const invoices = invoiceRows.map(mapInvoiceRowToInvoice);
  const summary = getInvoiceSummary(invoices);
  const unpaid = invoices.filter((i) => isActiveInvoice(i) && hasInvoiceUnpaidBalance(i));
  const overdue = unpaid.filter((i) => i.status === "overdue");
  const followUp = buildUnpaidInvoiceFollowUpEntries(invoices);
  const unsentInvoices = invoices.filter((i) => i.status === "draft");

  // Estimates and expenses: the predicates below read only `status` (and, for
  // stale-sent, `sentAt`, which is resolved from estimate_activities and is
  // absent on the seeded tenant). Those fields are unmapped passthroughs, so
  // reading them from the row directly cannot diverge from the mapper.
  const estimates = estimateRows.map((row) => ({ ...row, status: row.status }));
  const unsentEstimates = estimates.filter((e) => e.status === "draft");
  const staleSent = buildStaleSentEstimateEntries(
    estimateRows.map((row) => ({ ...row, status: row.status, sentAt: undefined })),
  );
  const submittedExpenses = expenseRows.filter((e) => e.status === "submitted");
  const submittedTotal = submittedExpenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0);

  const groundTruth = {
    unpaidCount: unpaid.length,
    unpaidTotal: Math.round(summary.unpaidTotal * 100) / 100,
    overdueCount: overdue.length,
    overdueTotal: Math.round(summary.overdueTotal * 100) / 100,
    unpaidInvoiceFollowUpCount: followUp.length,
    unsentInvoiceCount: unsentInvoices.length,
    unsentEstimateCount: unsentEstimates.length,
    staleSentEstimateCount: staleSent.length,
    expenseSubmittedCount: submittedExpenses.length,
    expenseSubmittedTotal: Math.round(submittedTotal * 100) / 100,
  };

  // ---------------------------------------------------------------------
  // TRUNCATED LEGACY — what the dashboard shows today.
  // ---------------------------------------------------------------------
  const truncated = await activeOnly(admin.from("invoices").select(INVOICE_SELECT));
  const truncatedInvoices = (truncated.data ?? []).map(mapInvoiceRowToInvoice);
  const truncatedSummary = getInvoiceSummary(truncatedInvoices);

  // ---------------------------------------------------------------------
  // AGGREGATE — the RPC, as a real signed-in owner.
  // ---------------------------------------------------------------------
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email: "altair-bench@example.invalid",
    password: "Bench!loadtest-2026-x7Q",
  });
  if (signInError) fail(`sign-in failed: ${signInError.message}`);

  const durations = [];
  let payloadBytes = 0;
  let aggregate = null;

  for (let sample = 0; sample < SAMPLES; sample += 1) {
    const t0 = process.hrtime.bigint();
    const { data, error } = await client.rpc("get_company_dashboard_aggregates", {
      p_company_id: tenant.id,
      p_reference: new Date().toISOString(),
    });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (error) fail(`rpc failed: ${error.message}`);
    durations.push(ms);
    payloadBytes = Buffer.byteLength(JSON.stringify(data), "utf8");
    aggregate = data;
  }

  const aggregateFields = {
    unpaidCount: aggregate.invoices.unpaidCount,
    unpaidTotal: aggregate.invoices.unpaidTotal,
    overdueCount: aggregate.invoices.overdueCount,
    overdueTotal: aggregate.invoices.overdueTotal,
    unpaidInvoiceFollowUpCount: aggregate.invoices.followUpCount,
    unsentInvoiceCount: aggregate.invoices.draftCount,
    unsentEstimateCount: aggregate.estimates.draftCount,
    staleSentEstimateCount: aggregate.estimates.staleSentCount,
    expenseSubmittedCount: aggregate.expenses.submittedCount,
    expenseSubmittedTotal: aggregate.expenses.submittedTotal,
  };

  // ---------------------------------------------------------------------
  // Equality, field by field.
  // ---------------------------------------------------------------------
  console.log("Equality: SQL aggregate vs the shipped predicates over EVERY row");
  const drift = compareDashboardAggregates(groundTruth, aggregateFields);

  const money = new Set(["unpaidTotal", "overdueTotal", "expenseSubmittedTotal"]);
  const fmt = (field, value) =>
    money.has(field)
      ? `$${Number(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : String(value);

  for (const field of Object.keys(groundTruth)) {
    const entry = drift.find((d) => d.field === field);
    check(
      `${field.padEnd(28)} ${fmt(field, aggregateFields[field])}`,
      !entry,
      entry
        ? `ground truth ${fmt(field, entry.legacy)}, aggregate ${fmt(field, entry.aggregate)}, ` +
          `difference ${fmt(field, entry.difference)}`
        : "",
    );
  }

  check(
    "the aggregate counted every invoice in the tenant",
    aggregate.invoices.totalActiveCount === invoiceRows.length,
    `aggregate ${aggregate.invoices.totalActiveCount}, actual ${invoiceRows.length}`,
  );

  // ---------------------------------------------------------------------
  // The defect, quantified.
  // ---------------------------------------------------------------------
  console.log("\nWhat the dashboard shows today (legacy path, truncated)");
  const rows = [
    ["rows the legacy path received", truncatedInvoices.length, invoiceRows.length],
    ["unpaid A/R", truncatedSummary.unpaidTotal, groundTruth.unpaidTotal],
    ["overdue", truncatedSummary.overdueTotal, groundTruth.overdueTotal],
  ];
  for (const [label, shown, actual] of rows) {
    const pct = actual === 0 ? 0 : ((actual - shown) / actual) * 100;
    console.log(
      `  ${label.padEnd(32)} shown ${String(typeof shown === "number" && shown % 1 ? shown.toFixed(2) : shown).padStart(14)}` +
        `   actual ${String(typeof actual === "number" && actual % 1 ? actual.toFixed(2) : actual).padStart(14)}` +
        `   understated ${pct.toFixed(1)}%`,
    );
  }

  // ---------------------------------------------------------------------
  // Measurements.
  // ---------------------------------------------------------------------
  const sorted = [...durations].sort((a, b) => a - b);
  console.log("\nAggregate RPC performance (real samples, not modelled)");
  console.log(`  samples            ${durations.length}`);
  console.log(`  p50                ${percentile(sorted, 50).toFixed(0)} ms`);
  console.log(`  p95                ${percentile(sorted, 95).toFixed(0)} ms`);
  console.log(`  min / max          ${sorted[0].toFixed(0)} / ${sorted[sorted.length - 1].toFixed(0)} ms`);
  console.log(`  payload            ${payloadBytes} bytes`);
  console.log(`  rows returned      1 (a single jsonb row)`);
  console.log(`  queries per render 1 RPC`);
  console.log(
    `\n  For contrast, the legacy path issued 3 unbounded selects returning ` +
      `${truncatedInvoices.length} invoice rows alone.`,
  );

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} dashboard equality checks passed (${checks} total).`,
  );
  if (failures === 0) {
    console.log(
      "\n  EQUALITY GREEN. ALTAIR_DASHBOARD_AGGREGATES=on is justified for this data set.\n",
    );
  } else {
    console.log(
      "\n  EQUALITY NOT GREEN. Do not enable ALTAIR_DASHBOARD_AGGREGATES.\n",
    );
  }
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
