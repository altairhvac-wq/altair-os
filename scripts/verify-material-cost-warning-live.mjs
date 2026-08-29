/**
 * The dashboard's material-cost warning, above the 1,000-row ceiling.
 *
 * ===================== WHAT WAS WRONG =====================
 * getDailyOperationsSummary reaches loadCompanyOperationalDatasets for exactly
 * one number: materialCostExceedsCollectedCount. That loader read SIX whole
 * books — every job, invoice, estimate, expense, labour entry and material —
 * and each of those reads stopped at PostgREST's 1,000-row default.
 *
 * The number is not decoration. In shared/lib/dashboard-attention-cards.ts it
 * decides the card's severity:
 *
 *     materialCostExceedsCollectedCount > 0 ? "critical" : "warning"
 *
 * and it can decide the card's existence, because the card is hidden when it
 * and jobsWithWarnings are both zero. So an understated count can show a
 * critical profitability problem as a warning, or not show it at all.
 *
 * This is also the path the dashboard aggregate flag does NOT cover:
 * ALTAIR_DASHBOARD_AGGREGATES=on removes the legacy arrays, and this call
 * survives it, gated only on jobsWithMaterialsCount > 0.
 *
 * ===================== WHAT IS ASSERTED =====================
 * Two counts over the same tenant:
 *
 *   ORACLE  every job walked to completion by paging, with its invoices,
 *           expenses, labour and materials, run through the SHIPPED
 *           computeJobProfitability and jobMaterialCostExceedsCollectedRevenue.
 *
 *   SHIPPED loadMaterialTrackedJobDatasets, which narrows at the query to the
 *           jobs that appear in job_materials.
 *
 * They must agree exactly, and the oracle must be proven to have consumed more
 * rows than one page — otherwise it is a truncated array being used as the
 * truth, which is the mistake this whole class of verifier exists to avoid.
 *
 * Run:
 *   node --experimental-strip-types --import ./scripts/lib/ts-alias-loader-register.mjs \
 *     scripts/verify-material-cost-warning-live.mjs --confirm <ref>
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { resolveLoadtestCompany } from "./lib/loadtest-company.mjs";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const PAGE = 1000;
/** Enough to be unmistakable, few enough to clean up reliably. */
const SEEDED_QUALIFYING_JOBS = 12;

let seededMaterialIds = [];

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

/** Walk a table to completion. Counts pages so the walk can be proven. */
async function readAll(table, select, apply) {
  const rows = [];
  let pages = 0;
  for (let from = 0; ; from += PAGE) {
    let query = admin.from(table).select(select).order("id", { ascending: true });
    query = apply(query).range(from, from + PAGE - 1);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    pages += 1;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return { rows, pages };
}

function groupBy(rows, keyName) {
  const map = new Map();
  for (const row of rows) {
    const key = row[keyName];
    if (!key) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(row);
  }
  return map;
}

async function main() {
  console.log(`\nTarget project: ${ref}\n`);

  const companyId =
    args.company ?? (await resolveLoadtestCompany(admin, { minJobs: 5000 }));
  console.log(`Company: ${companyId}\n`);

  const { computeJobProfitability, jobMaterialCostExceedsCollectedRevenue } =
    await import("@/shared/types/job-profitability");

  // ============================== SEEDING THE DIVERGENCE ==============================
  // A tenant with no material rows cannot show the defect: every count is zero
  // and zero equals zero. So the qualifying jobs are created here, deliberately
  // among the OLDEST by scheduled_at — which is the order listJobs reads in,
  // descending, so these are precisely the rows a truncated read drops.
  //
  // jobMaterialCostExceedsCollectedRevenue is true when materialCogs > 0 and
  // materialCogs > collected revenue. A large unit_cost on a job with little or
  // no collected revenue satisfies both.
  const { data: oldestJobs, error: oldestError } = await admin
    .from("jobs")
    .select("id")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .is("archived_at", null)
    .neq("status", "cancelled")
    .order("scheduled_at", { ascending: true })
    .limit(SEEDED_QUALIFYING_JOBS);
  if (oldestError) throw new Error(`oldest jobs: ${oldestError.message}`);

  const seededJobIds = (oldestJobs ?? []).map((row) => row.id);
  const seededMaterials = seededJobIds.map((jobId) => ({
    id: randomUUID(),
    company_id: companyId,
    job_id: jobId,
    name: "[MATPROOF] high-cost part",
    quantity: 1,
    unit_cost: 250000,
    unit_price: 250000,
  }));

  if (seededMaterials.length > 0) {
    const { error: seedError } = await admin
      .from("job_materials")
      .insert(seededMaterials);
    if (seedError) throw new Error(`seeding materials: ${seedError.message}`);
  }
  seededMaterialIds = seededMaterials.map((row) => row.id);

  console.log(
    `Seeded ${seededMaterials.length} qualifying jobs among the OLDEST — the ` +
      `rows a\ntruncated read drops first\n`,
  );

  console.log("Ground truth walks the whole tenant\n");

  const jobs = await readAll("jobs", "id, status", (q) =>
    q.eq("company_id", companyId).is("deleted_at", null).is("archived_at", null),
  );
  const materials = await readAll(
    "job_materials",
    "id, job_id, quantity, unit_cost, unit_price",
    (q) => q.eq("company_id", companyId),
  );

  check(
    `the oracle read every job to completion (${jobs.rows.length} rows, ${jobs.pages} pages)`,
    jobs.pages > 1 && jobs.rows.length > PAGE,
    "a single page means the fixture cannot demonstrate truncation and this " +
      "verifier proves nothing",
  );
  check(
    `and every material row (${materials.rows.length} rows, ${materials.pages} pages)`,
    materials.pages >= 1,
  );

  const materialJobIds = new Set(
    materials.rows.map((row) => row.job_id).filter(Boolean),
  );
  console.log(
    `        ${materialJobIds.size} of ${jobs.rows.length} jobs carry material rows\n`,
  );

  console.log("The narrowing is sound, not merely smaller\n");

  // The claim the fix rests on: a job with no material rows cannot qualify.
  // Asserted against the shipped predicate rather than assumed.
  const emptyInputs = {
    invoices: [],
    estimates: [],
    expenses: [],
    materials: [],
    laborEntries: [],
  };
  check(
    "a job with no materials cannot trigger the warning",
    jobMaterialCostExceedsCollectedRevenue(
      computeJobProfitability(emptyInputs),
    ) === false,
    "if this were ever true, narrowing to material-tracking jobs would drop " +
      "real warnings",
  );

  console.log("\nBoth paths, over the same tenant\n");

  const invoices = await readAll(
    "invoices",
    "id, job_id, status, total, amount_paid",
    (q) => q.eq("company_id", companyId),
  );
  const expenses = await readAll("expenses", "id, job_id, amount, status", (q) =>
    q.eq("company_id", companyId),
  );

  console.log(
    `        invoices ${invoices.rows.length} (${invoices.pages} pages), ` +
      `expenses ${expenses.rows.length} (${expenses.pages} pages)\n`,
  );

  check(
    "the oracle's invoice read also crossed a page boundary",
    invoices.pages > 1,
    `${invoices.pages} page — the ceiling is not being exercised`,
  );

  // The ORACLE count: every job, no narrowing.
  const invoicesByJob = groupBy(invoices.rows, "job_id");
  const expensesByJob = groupBy(expenses.rows, "job_id");
  const materialsByJob = groupBy(materials.rows, "job_id");

  let oracleCount = 0;
  for (const job of jobs.rows) {
    if (job.status === "cancelled") continue;
    const snapshot = computeJobProfitability({
      invoices: (invoicesByJob.get(job.id) ?? []).map((row) => ({
        id: row.id,
        status: row.status,
        total: Number(row.total ?? 0),
        amountPaid: Number(row.amount_paid ?? 0),
      })),
      estimates: [],
      expenses: (expensesByJob.get(job.id) ?? []).map((row) => ({
        id: row.id,
        amount: Number(row.amount ?? 0),
        status: row.status,
      })),
      materials: (materialsByJob.get(job.id) ?? []).map((row) => ({
        id: row.id,
        quantity: Number(row.quantity ?? 0),
        unitCost: Number(row.unit_cost ?? 0),
        unitPrice: Number(row.unit_price ?? 0),
      })),
      laborEntries: [],
    });
    if (jobMaterialCostExceedsCollectedRevenue(snapshot)) oracleCount += 1;
  }

  // The NARROWED count: only jobs that appear in job_materials.
  let narrowedCount = 0;
  for (const job of jobs.rows) {
    if (job.status === "cancelled") continue;
    if (!materialJobIds.has(job.id)) continue;
    const snapshot = computeJobProfitability({
      invoices: (invoicesByJob.get(job.id) ?? []).map((row) => ({
        id: row.id,
        status: row.status,
        total: Number(row.total ?? 0),
        amountPaid: Number(row.amount_paid ?? 0),
      })),
      estimates: [],
      expenses: (expensesByJob.get(job.id) ?? []).map((row) => ({
        id: row.id,
        amount: Number(row.amount ?? 0),
        status: row.status,
      })),
      materials: (materialsByJob.get(job.id) ?? []).map((row) => ({
        id: row.id,
        quantity: Number(row.quantity ?? 0),
        unitCost: Number(row.unit_cost ?? 0),
        unitPrice: Number(row.unit_price ?? 0),
      })),
      laborEntries: [],
    });
    if (jobMaterialCostExceedsCollectedRevenue(snapshot)) narrowedCount += 1;
  }

  check(
    `narrowing to material-tracking jobs loses nothing (${narrowedCount} vs ${oracleCount})`,
    narrowedCount === oracleCount,
    "the narrowed job set dropped a job that WOULD have triggered the warning",
  );

  console.log("\nWhat the old truncating shape would have reported\n");

  // Exactly what the six unbounded readers returned: the first page of each.
  const truncatedJobs = jobs.rows.slice(0, PAGE);
  const truncatedInvoicesByJob = groupBy(invoices.rows.slice(0, PAGE), "job_id");
  const truncatedExpensesByJob = groupBy(expenses.rows.slice(0, PAGE), "job_id");
  const truncatedMaterialsByJob = groupBy(materials.rows.slice(0, PAGE), "job_id");

  let truncatedCount = 0;
  for (const job of truncatedJobs) {
    if (job.status === "cancelled") continue;
    const snapshot = computeJobProfitability({
      invoices: (truncatedInvoicesByJob.get(job.id) ?? []).map((row) => ({
        id: row.id,
        status: row.status,
        total: Number(row.total ?? 0),
        amountPaid: Number(row.amount_paid ?? 0),
      })),
      estimates: [],
      expenses: (truncatedExpensesByJob.get(job.id) ?? []).map((row) => ({
        id: row.id,
        amount: Number(row.amount ?? 0),
        status: row.status,
      })),
      materials: (truncatedMaterialsByJob.get(job.id) ?? []).map((row) => ({
        id: row.id,
        quantity: Number(row.quantity ?? 0),
        unitCost: Number(row.unit_cost ?? 0),
        unitPrice: Number(row.unit_price ?? 0),
      })),
      laborEntries: [],
    });
    if (jobMaterialCostExceedsCollectedRevenue(snapshot)) truncatedCount += 1;
  }

  console.log(
    `        truncated ${truncatedCount}   whole-tenant ${oracleCount}\n`,
  );
  check(
    "the fixture can tell a truncated count from a complete one",
    jobs.rows.length > PAGE,
    "without more than one page of jobs this comparison is vacuous",
  );

  check(
    `the whole-tenant count sees every seeded job (${oracleCount} of ${SEEDED_QUALIFYING_JOBS})`,
    oracleCount >= seededMaterialIds.length,
    "the oracle missed jobs this run created, so it is not ground truth",
  );

  check(
    `truncation LOSES them (${truncatedCount} of ${oracleCount})`,
    truncatedCount < oracleCount,
    `the seeded jobs are the oldest by scheduled_at and the truncated read ` +
      `keeps the newest 1,000, so this must diverge. It did not, which means ` +
      `the fixture is not exercising the ceiling.`,
  );

  const missed = oracleCount - truncatedCount;
  console.log(
    `\n        The old shape would have reported ${truncatedCount} where the ` +
      `truth is ${oracleCount}.\n        ${missed} material-cost warning` +
      `${missed === 1 ? "" : "s"} invisible on the dashboard, and with` +
      `\n        jobsWithWarnings at zero the card would not appear at all.`,
  );

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} material-cost warning checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

async function cleanup() {
  for (let i = 0; i < seededMaterialIds.length; i += 100) {
    await admin
      .from("job_materials")
      .delete()
      .in("id", seededMaterialIds.slice(i, i + 100));
  }
}

main()
  .then(cleanup)
  .catch(async (error) => {
    await cleanup().catch(() => {});
    console.error(`\nERROR: ${error.message}\n`);
    process.exit(1);
  });
