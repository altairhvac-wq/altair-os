/**
 * Expense filter and work-queue differential (P0-14).
 *
 * ===================== WHY THIS ONE MATTERS MOST =====================
 * Expenses has the widest filter surface in the product — eight dimensions plus
 * four work queues — and unlike the customer queues, its queues OVERLAP: an
 * approved expense with a catch-all category belongs to both `approved` and
 * `uncategorized`. Translating that to SQL by reading it is how a subtle
 * exclusion goes missing and a queue quietly loses rows.
 *
 * So this imports the REAL predicates — filterExpenses and
 * filterExpensesForWorkQueue — the REAL mapper, and the REAL SQL filter builder
 * that ships, runs both over the same fixture, and asserts set equality.
 *
 * It deliberately does NOT assert that the queues partition the book. They do
 * not, and encoding that assumption would make the test wrong rather than the
 * code.
 *
 * ===================== FIXTURE =====================
 * Rows are built to sit on both sides of every predicate: each status, each
 * lifecycle state, a blank merchant, a null amount, a null purchase date, a
 * reimbursable and a company-paid, each receipt state, and purchase dates
 * inside and outside the 7- and 30-day windows.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-expense-filters-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { filterExpenses } from "@/shared/utils/expense-filters";
import { filterExpensesForWorkQueue } from "@/shared/components/expenses/expense-work-queues";
import { mapExpenseRow } from "@/lib/database/queries/expenses";
import {
  applyExpenseListFilters,
  applyExpenseQueueFilters,
} from "@/lib/database/queries/expense-list-filters";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const SLUG_PREFIX = "loadtest-expfilters-";
const RUN_ID = Math.random().toString(36).slice(2, 10);

/** Pinned so the date windows are deterministic on both sides. */
const REFERENCE = new Date("2026-08-27T12:00:00.000Z");

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

const STATUSES = ["draft", "submitted", "approved", "rejected", "reimbursed"];
const CATEGORIES = ["materials", "fuel", "other"];
const RECEIPTS = ["missing", "attached", "pending"];

let company = null;
let technicianId = null;
let jobId = null;

function isoDaysAgo(days) {
  return new Date(REFERENCE.getTime() - days * 86_400_000).toISOString().slice(0, 10);
}

async function buildFixture() {
  const { data: co, error: coError } = await admin
    .from("companies")
    .insert({ name: `[EXPFILTERS] ${RUN_ID}`, slug: `${SLUG_PREFIX}${RUN_ID}`, trade: "hvac" })
    .select("id")
    .single();
  if (coError) throw new Error(`company: ${coError.message}`);
  company = co;

  const email = `altair-expfilters+${RUN_ID}@example.invalid`;
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password: `ExpFilters!${RUN_ID}-8mQ`,
    email_confirm: true,
  });
  if (userError) throw new Error(`createUser: ${userError.message}`);
  technicianId = created.user.id;
  await admin.from("profiles").upsert({ id: technicianId, email, full_name: "Fixture Tech" });
  await admin.from("company_memberships").insert({
    company_id: company.id,
    user_id: technicianId,
    role: "technician",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  const { data: customer } = await admin
    .from("customers")
    .insert({ company_id: company.id, name: "[EXPFILTERS] Customer" })
    .select("id")
    .single();

  const { data: job } = await admin
    .from("jobs")
    .insert({
      company_id: company.id,
      customer_id: customer.id,
      job_number: `JOB-EXPF-${RUN_ID}`,
      scheduled_at: REFERENCE.toISOString(),
      job_type: "Fixture",
    })
    .select("id")
    .single();
  jobId = job.id;

  const rows = [];
  let index = 0;

  const push = (overrides) => {
    index += 1;
    rows.push({
      company_id: company.id,
      technician_id: technicianId,
      expense_number: `EXP-EF-${RUN_ID}-${index}`,
      amount: 25,
      purchase_date: isoDaysAgo(3),
      merchant: "Fixture Supply",
      category: "materials",
      receipt_status: "attached",
      status: "approved",
      is_reimbursable: true,
      customer_id: customer.id,
      job_id: job.id,
      ...overrides,
    });
  };

  // Every status, across two receipt states.
  for (const status of STATUSES) {
    for (const receipt of RECEIPTS) {
      push({ status, receipt_status: receipt });
    }
  }
  // Category coverage.
  for (const category of CATEGORIES) push({ category });
  // The uncategorized triggers.
  push({ merchant: "" });
  push({ merchant: "   " });
  push({ amount: null });
  push({ status: "draft" });
  // Payment split.
  push({ is_reimbursable: false });
  // Date windows, including a null purchase date that falls back to created_at.
  push({ purchase_date: isoDaysAgo(1) });
  push({ purchase_date: isoDaysAgo(20) });
  push({ purchase_date: isoDaysAgo(90) });
  push({ purchase_date: null });
  // Lifecycle.
  push({ archived_at: new Date().toISOString() });
  push({ deleted_at: new Date().toISOString() });
  // Unlinked from the job, to exercise the job filters.
  push({ job_id: null, customer_id: null });

  const { error } = await admin.from("expenses").insert(rows);
  if (error) throw new Error(`expenses: ${error.message}`);
  console.log(`  ${rows.length} fixture expenses in company ${company.id}`);
}

const EXPENSE_SELECT = `
  *,
  technician:profiles!expenses_technician_id_fkey(full_name, email),
  job:jobs(job_number, customer_id)
`;

/** The filter shape filterExpenses expects. */
function toListFilters(overrides) {
  return {
    search: "",
    statusFilter: "all",
    categoryFilter: "all",
    technicianFilter: "all",
    jobFilter: "all",
    paymentFilter: "all",
    dateFilter: "all",
    receiptFilter: "all",
    jobIdFilter: undefined,
    customerIdFilter: undefined,
    ...overrides,
  };
}

async function runDifferential() {
  const { data: rows, error } = await admin
    .from("expenses")
    .select(EXPENSE_SELECT)
    .eq("company_id", company.id);
  if (error) throw new Error(`fetch: ${error.message}`);

  const expenses = rows.map(mapExpenseRow);

  // -------------------------------------------------------------------
  // Work queues.
  // -------------------------------------------------------------------
  console.log("\nWork queues agree with the shipped predicates");

  for (const queue of ["needs-review", "uncategorized", "approved", "past"]) {
    const expected = new Set(
      filterExpensesForWorkQueue(expenses, queue).map((e) => e.id),
    );

    const { data, error: queryError } = await applyExpenseQueueFilters(
      admin.from("expenses").select("id").eq("company_id", company.id),
      queue,
    );
    if (queryError) {
      check(`queue "${queue}"`, false, queryError.message);
      continue;
    }
    const actual = new Set((data ?? []).map((r) => r.id));
    const missing = [...expected].filter((id) => !actual.has(id));
    const extra = [...actual].filter((id) => !expected.has(id));
    const numberOf = (id) =>
      expenses.find((e) => e.id === id)?.expenseNumber ?? id;

    check(
      `queue "${queue}" agrees (${expected.size} expected)`,
      missing.length === 0 && extra.length === 0,
      [
        missing.length ? `SQL missed: ${missing.map(numberOf).join(", ")}` : "",
        extra.length ? `SQL wrongly included: ${extra.map(numberOf).join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n        "),
    );
  }

  // The queues legitimately overlap; recording it stops a future change from
  // "fixing" that into a partition.
  const membership = expenses.map((expense) => ({
    number: expense.expenseNumber,
    queues: ["needs-review", "uncategorized", "approved", "past"].filter((queue) =>
      filterExpensesForWorkQueue([expense], queue).length > 0,
    ),
  }));
  const overlapping = membership.filter((m) => m.queues.length > 1);
  console.log(
    `  (${overlapping.length} of ${membership.length} fixture rows belong to more than one queue — expected, and asserted nowhere)`,
  );

  // -------------------------------------------------------------------
  // Every filter dimension, one at a time and then combined.
  // -------------------------------------------------------------------
  console.log("\nEach filter dimension agrees");

  const cases = [];
  for (const status of ["all", ...STATUSES]) cases.push({ statusFilter: status });
  for (const category of ["all", ...CATEGORIES]) cases.push({ categoryFilter: category });
  for (const payment of ["all", "reimbursable", "company_paid"]) cases.push({ paymentFilter: payment });
  for (const receipt of ["all", "attached", "missing"]) cases.push({ receiptFilter: receipt });
  for (const date of ["all", "last_7", "last_30", "older"]) cases.push({ dateFilter: date });
  cases.push({ technicianFilter: technicianId });
  cases.push({ jobFilter: jobId });
  cases.push({ jobIdFilter: jobId });
  // A few combinations, since dimensions AND together.
  cases.push({ statusFilter: "approved", receiptFilter: "attached" });
  cases.push({ categoryFilter: "other", paymentFilter: "reimbursable" });
  cases.push({ dateFilter: "older", statusFilter: "draft" });

  let mismatches = 0;
  for (const overrides of cases) {
    const filters = toListFilters(overrides);
    // The TypeScript runs over lifecycle-active rows only in the UI, so the
    // comparison is scoped the same way — otherwise the two sides are being
    // asked different questions.
    const activeExpenses = expenses.filter(
      (expense) => !expense.archivedAt && !expense.deletedAt,
    );
    const expected = new Set(
      filterExpenses(activeExpenses, filters).map((e) => e.id),
    );

    const { data, error: queryError } = await applyExpenseListFilters(
      admin
        .from("expenses")
        .select("id")
        .eq("company_id", company.id)
        .is("deleted_at", null)
        .is("archived_at", null),
      { ...overrides, reference: REFERENCE },
    );

    if (queryError) {
      mismatches += 1;
      console.error(`        query error for ${JSON.stringify(overrides)}: ${queryError.message}`);
      continue;
    }

    const actual = new Set((data ?? []).map((r) => r.id));
    const same =
      expected.size === actual.size && [...expected].every((id) => actual.has(id));
    if (!same) {
      mismatches += 1;
      console.error(
        `        ${JSON.stringify(overrides)} expected ${expected.size}, SQL returned ${actual.size}`,
      );
    }
  }

  check(
    `all ${cases.length} filter cases agree`,
    mismatches === 0,
    `${mismatches} disagreed`,
  );
}

async function cleanup() {
  if (!company) return;
  for (const table of ["expenses", "jobs", "customers", "company_memberships"]) {
    await admin.from(table).delete().eq("company_id", company.id);
  }
  await admin.from("companies").delete().eq("id", company.id);
  if (technicianId) await admin.auth.admin.deleteUser(technicianId).catch(() => {});
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Run id:         ${RUN_ID}\n`);
  try {
    await buildFixture();
    await runDifferential();
  } finally {
    console.log("\nCleaning up fixture...");
    await cleanup();
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} expense filter checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  cleanup().finally(() => process.exit(1));
});
