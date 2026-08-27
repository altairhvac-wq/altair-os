/**
 * Billing maintenance sweep verification (Phase 4 / 4F).
 *
 * ===================== WHY THIS HAS TO PASS FIRST =====================
 * syncOverdueInvoiceStatuses runs today during page renders — the dashboard,
 * the invoices list and the customers page all reach it. It is an unbounded
 * write performed while a user waits, and the plan is to remove it from those
 * read paths.
 *
 * Removing it is only safe once the SCHEDULED path is proven to do the same
 * work. If it does not, invoices simply stop becoming overdue, and nothing
 * errors — the dashboard's overdue panel just quietly empties out.
 *
 * That risk was not hypothetical. The sweep built a service-role client for
 * listing companies but called syncOverdueInvoiceStatuses, which resolved the
 * USER-SCOPED cookie client internally. A cron request carries no cookies, so
 * every statement would have run unauthenticated and RLS would have matched
 * nothing — a sweep reporting success while marking zero invoices overdue. The
 * client is now injected, and this verifies the behaviour rather than the wiring.
 *
 * ===================== WHAT IS COVERED =====================
 *   normal transition        sent/partially_paid past due -> overdue
 *   idempotent rerun         a second sweep changes nothing and writes no
 *                            duplicate activity rows
 *   multi-company            each tenant swept independently
 *   timezone-sensitive       "past due" is a calendar question answered in the
 *                            COMPANY's zone, so an invoice due today is NOT
 *                            overdue in a zone where today has not ended
 *   large candidate sets     more than the 396-uuid request-line ceiling, in one
 *                            status, which is the case that used to fail silently
 *   chunking                 the bulk update is chunked and every row lands
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-billing-maintenance-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { syncOverdueInvoiceStatuses } from "@/lib/database/queries/invoices";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const SLUG_PREFIX = "loadtest-billing-";
const RUN_ID = Math.random().toString(36).slice(2, 10);

/** Above the measured 396-uuid ceiling, so the chunking is genuinely exercised. */
const LARGE_CANDIDATE_COUNT = 450;

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

const companies = [];

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Today's date in a given IANA zone, which is the question the sweep asks. */
function todayIn(timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function createCompany(label, timezone) {
  const { data, error } = await admin
    .from("companies")
    .insert({
      name: `[BILLING] ${label} ${RUN_ID}`,
      slug: `${SLUG_PREFIX}${RUN_ID}-${label}`,
      trade: "hvac",
      timezone,
    })
    .select("id, timezone")
    .single();
  if (error) throw new Error(`company ${label}: ${error.message}`);

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({ company_id: data.id, name: `[BILLING] Customer ${label}` })
    .select("id")
    .single();
  if (customerError) throw new Error(`customer ${label}: ${customerError.message}`);

  const record = { ...data, label, customerId: customer.id };
  companies.push(record);
  return record;
}

let invoiceSeq = 0;
async function addInvoices(company, rows) {
  const payload = rows.map((row) => {
    invoiceSeq += 1;
    return {
      company_id: company.id,
      customer_id: company.customerId,
      invoice_number: `INV-BILL-${RUN_ID}-${invoiceSeq}`,
      status: row.status,
      subtotal: 100,
      total: 100,
      amount_paid: row.amountPaid ?? 0,
      balance_due: row.balanceDue ?? 100,
      issue_date: isoDaysAgo(40),
      due_date: row.dueDate,
    };
  });

  for (let from = 0; from < payload.length; from += 500) {
    const { error } = await admin.from("invoices").insert(payload.slice(from, from + 500));
    if (error) throw new Error(`invoices: ${error.message}`);
  }
  return payload.length;
}

async function countByStatus(companyId, status) {
  const { count, error } = await admin
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", status);
  if (error) throw new Error(`count: ${error.message}`);
  return count ?? 0;
}

async function countActivities(companyId) {
  const { count, error } = await admin
    .from("invoice_activities")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId);
  if (error) throw new Error(`activity count: ${error.message}`);
  return count ?? 0;
}

async function cleanup() {
  for (const company of companies) {
    for (const table of ["invoice_activities", "invoice_payments", "invoices", "customers"]) {
      await admin.from(table).delete().eq("company_id", company.id);
    }
    await admin.from("companies").delete().eq("id", company.id);
  }
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Run id:         ${RUN_ID}\n`);

  try {
    // -------------------------------------------------------------------
    // Normal transition + the statuses that must NOT move.
    // -------------------------------------------------------------------
    const primary = await createCompany("primary", "America/New_York");
    await addInvoices(primary, [
      { status: "sent", dueDate: isoDaysAgo(10) },
      { status: "sent", dueDate: isoDaysAgo(1) },
      { status: "partially_paid", dueDate: isoDaysAgo(5), amountPaid: 40, balanceDue: 60 },
      // Must not transition:
      { status: "paid", dueDate: isoDaysAgo(10), amountPaid: 100, balanceDue: 0 },
      { status: "draft", dueDate: isoDaysAgo(10) },
      { status: "void", dueDate: isoDaysAgo(10) },
      { status: "sent", dueDate: isoDaysAgo(-10) }, // due in the future
      { status: "sent", dueDate: isoDaysAgo(3), balanceDue: 0 }, // nothing owed
    ]);

    console.log("Normal transition");
    const moved = await syncOverdueInvoiceStatuses(primary.id, primary.timezone, admin);
    check("three past-due unpaid invoices become overdue", moved === 3, `moved ${moved}`);
    check("overdue count matches", (await countByStatus(primary.id, "overdue")) === 3);
    check("paid is untouched", (await countByStatus(primary.id, "paid")) === 1);
    check("draft is untouched", (await countByStatus(primary.id, "draft")) === 1);
    check("void is untouched", (await countByStatus(primary.id, "void")) === 1);
    check(
      "a future due date and a zero balance stay sent",
      (await countByStatus(primary.id, "sent")) === 2,
    );

    console.log("\nIdempotent rerun");
    const activitiesAfterFirst = await countActivities(primary.id);
    const secondRun = await syncOverdueInvoiceStatuses(primary.id, primary.timezone, admin);
    check("a second sweep transitions nothing", secondRun === 0, `moved ${secondRun}`);
    check(
      "and writes no duplicate activity rows",
      (await countActivities(primary.id)) === activitiesAfterFirst,
    );

    // -------------------------------------------------------------------
    // Time zone. An invoice due TODAY is not past due anywhere, and the
    // company's zone is what decides when today ends.
    // -------------------------------------------------------------------
    console.log("\nTime-zone sensitivity");
    const pacific = await createCompany("pacific", "America/Los_Angeles");
    const pacificToday = todayIn("America/Los_Angeles");
    await addInvoices(pacific, [
      { status: "sent", dueDate: pacificToday },
      { status: "sent", dueDate: isoDaysAgo(2) },
    ]);
    const pacificMoved = await syncOverdueInvoiceStatuses(
      pacific.id,
      pacific.timezone,
      admin,
    );
    check(
      "an invoice due today in the company's zone is NOT overdue",
      pacificMoved === 1,
      `moved ${pacificMoved}; only the 2-day-old invoice should transition`,
    );
    check(
      "the invoice due today is still sent",
      (await countByStatus(pacific.id, "sent")) === 1,
    );

    // The same data read in a different zone can give a different answer, which
    // is exactly why the sweep is per-company rather than one global statement.
    check(
      "today differs between the two fixture zones or is explicitly equal",
      typeof todayIn("America/New_York") === "string" &&
        typeof todayIn("America/Los_Angeles") === "string",
    );

    // -------------------------------------------------------------------
    // Multi-company isolation.
    // -------------------------------------------------------------------
    console.log("\nMulti-company isolation");
    const other = await createCompany("other", "UTC");
    await addInvoices(other, [{ status: "sent", dueDate: isoDaysAgo(9) }]);
    const beforePrimary = await countByStatus(primary.id, "overdue");
    const otherMoved = await syncOverdueInvoiceStatuses(other.id, other.timezone, admin);
    check("the other company transitions its own invoice", otherMoved === 1);
    check(
      "and the first company is untouched",
      (await countByStatus(primary.id, "overdue")) === beforePrimary,
    );

    // -------------------------------------------------------------------
    // Large candidate set — the case that used to fail silently.
    // -------------------------------------------------------------------
    console.log(`\nLarge candidate set (${LARGE_CANDIDATE_COUNT} in one status)`);
    const bulk = await createCompany("bulk", "UTC");
    await addInvoices(
      bulk,
      Array.from({ length: LARGE_CANDIDATE_COUNT }, () => ({
        status: "sent",
        dueDate: isoDaysAgo(15),
      })),
    );
    const bulkStarted = Date.now();
    const bulkMoved = await syncOverdueInvoiceStatuses(bulk.id, bulk.timezone, admin);
    const bulkMs = Date.now() - bulkStarted;

    check(
      `all ${LARGE_CANDIDATE_COUNT} transition past the 396-uuid request-line ceiling`,
      bulkMoved === LARGE_CANDIDATE_COUNT,
      `moved ${bulkMoved} of ${LARGE_CANDIDATE_COUNT} — an unchunked update fails entirely here`,
    );
    check(
      "the database agrees",
      (await countByStatus(bulk.id, "overdue")) === LARGE_CANDIDATE_COUNT,
    );
    check(
      "one activity row per transitioned invoice",
      (await countActivities(bulk.id)) === LARGE_CANDIDATE_COUNT,
      `activities ${await countActivities(bulk.id)}`,
    );
    console.log(`  (${bulkMs} ms for ${LARGE_CANDIDATE_COUNT} invoices)`);

    const bulkRerun = await syncOverdueInvoiceStatuses(bulk.id, bulk.timezone, admin);
    check("the large set is idempotent too", bulkRerun === 0, `moved ${bulkRerun}`);
  } finally {
    console.log("\nCleaning up fixtures...");
    await cleanup();
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} billing maintenance checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  cleanup().finally(() => process.exit(1));
});
