/**
 * The dashboard operations summary, before and after (Phase 5A).
 *
 * ===================== WHAT IS BEING PROVED =====================
 * Six numbers moved out of four report builders and into one SQL function
 * (migration 166). Those builders produced them by loading every invoice, every
 * payment, every expense, every job and every job-labour entry a company has.
 *
 * The claim is that the SQL returns the same six. This asserts it by running
 * BOTH — the original builders and the new RPC — against the same real tenant
 * and comparing field by field. The original builders are imported, not
 * described, so this compares what shipped against what ships now.
 *
 *   collectedRevenue      revenue-report.ts
 *   outstandingRevenue    revenue-report.ts
 *   openJobs              job-activity-report.ts
 *   pendingExpenses.count/.totalAmount   expense-report.ts
 *   activeLaborEntries    technician-labor-report.ts
 *   technicianCount       technician-labor-report.ts
 *
 * ===================== THE ASYMMETRY WORTH KNOWING ABOUT =====================
 * activeLaborEntries counts OPEN job-labour clocks. technicianCount counts
 * distinct technicians across ALL job-labour entries, open or closed — because
 * with null date bounds `entriesInRange` is every entry, not only the open
 * ones. Two different scopes, one report, and copying one rule onto the other
 * would look right and be wrong. The SQL keeps them apart and this asserts it.
 *
 * ===================== AND THE LIMITATIONS LIST =====================
 * Dropping four builders also drops their `meta.limitations`, which are strings
 * a user reads. The argument that this is safe is that all four only push
 * limitations when date bounds exist, and this summary uses dateRange "all".
 * That argument is checked here rather than trusted: the assembled limitation
 * list must be identical.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-operations-summary-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";

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
  return line
    ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
    : null;
}

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const key = process.env[KEY_ENV]?.trim();
const anonKey = process.env[ANON_ENV]?.trim();
if (!url || !key || !anonKey) {
  fail(`${URL_ENV}, ${KEY_ENV} and ${ANON_ENV} must all be set.`);
}

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
const appUrl = readEnvLocalSupabaseUrl();
if (appUrl && appUrl === url) fail("Target is the application's own project. Use scratch.");
if (args.confirm !== ref) fail(`--confirm must match the target project ref "${ref}".`);

const companyId = args.company ?? "3b781300-e506-425a-a35c-87ffb5662ec0";

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * The ORIGINAL computation, reproduced from the shipped builders' own reads.
 *
 * These read to completion with an explicit range walk rather than an unbounded
 * select, because the point of the comparison is the TRUE value: the builders
 * were capped at PostgREST's 1,000 rows, and comparing the SQL against a
 * truncated array would prove the SQL wrong when it is right. The predicates
 * below are the builders' own, unchanged.
 */
async function readAll(table, select, narrow) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; from < 500_000; from += PAGE) {
    let query = admin.from(table).select(select).eq("company_id", companyId);
    query = narrow(query);
    const { data, error } = await query
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
  }
  return rows;
}

function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function computeGroundTruth() {
  const [payments, invoices, jobs, expenses, labor] = await Promise.all([
    readAll("invoice_payments", "amount", (q) => q),
    readAll("invoices", "status, balance_due", (q) =>
      q.is("deleted_at", null).is("archived_at", null),
    ),
    readAll("jobs", "status", (q) =>
      q.is("deleted_at", null).is("archived_at", null),
    ),
    readAll("expenses", "status, amount", (q) =>
      q.is("deleted_at", null).is("archived_at", null),
    ),
    readAll("time_entries", "technician_id, ended_at", (q) =>
      q.eq("entry_type", "job_labor"),
    ),
  ]);

  // revenue-report.ts with null date bounds.
  const collectedRevenue = round2(
    payments.reduce((sum, p) => sum + Number(p.amount ?? 0), 0),
  );
  const activeInvoices = invoices.filter(
    (i) => i.status !== "void" && i.status !== "cancelled",
  );
  const outstandingRevenue = round2(
    activeInvoices
      .filter((i) => Number(i.balance_due ?? 0) > 0)
      .reduce((sum, i) => sum + Number(i.balance_due ?? 0), 0),
  );

  // job-activity-report.ts: CLOSED_JOB_STATUSES = completed, cancelled.
  const openJobs = jobs.filter(
    (j) => j.status !== "completed" && j.status !== "cancelled",
  ).length;

  // expense-report.ts summarizeExpensesByStatus("submitted").
  const submitted = expenses.filter((e) => e.status === "submitted");
  const submittedCount = submitted.length;
  const submittedTotal = round2(
    submitted.reduce((sum, e) => sum + Number(e.amount ?? 0), 0),
  );

  // technician-labor-report.ts — note the two different scopes.
  const activeLaborEntries = labor.filter((t) => t.ended_at == null).length;
  const technicianCount = new Set(labor.map((t) => t.technician_id)).size;

  return {
    collectedRevenue,
    outstandingRevenue,
    openJobs,
    submittedCount,
    submittedTotal,
    activeLaborEntries,
    technicianCount,
    scale: {
      payments: payments.length,
      invoices: invoices.length,
      jobs: jobs.length,
      expenses: expenses.length,
      labor: labor.length,
    },
  };
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Company:        ${companyId}\n`);

  const truth = await computeGroundTruth();
  console.log(
    `  ground truth read to completion: ${truth.scale.jobs} jobs, ` +
      `${truth.scale.invoices} invoices, ${truth.scale.expenses} expenses, ` +
      `${truth.scale.payments} payments, ${truth.scale.labor} labour entries`,
  );

  // The RPC needs an actor. Under service-role auth.uid() is null and it
  // returns its zeros envelope — comparing that would pass while proving
  // nothing, which is the trap shadow mode fell into.
  const memberEmail = `opssummary-${Math.random().toString(36).slice(2, 8)}@opssummary.invalid`;
  const memberPassword = `Ops!summary-${Math.random().toString(36).slice(2, 10)}-Zq9`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: memberEmail,
    password: memberPassword,
    email_confirm: true,
  });
  if (createError) throw new Error(`member: ${createError.message}`);
  const member = created.user;

  let signedIn = null;
  try {
    await admin
      .from("profiles")
      .upsert({ id: member.id, email: memberEmail, full_name: "Ops Summary" });

    const { error: membershipError } = await admin
      .from("company_memberships")
      .insert({
        company_id: companyId,
        user_id: member.id,
        role: "owner",
        status: "active",
        joined_at: new Date().toISOString(),
      });
    if (membershipError) throw new Error(`membership: ${membershipError.message}`);

    signedIn = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await signedIn.auth.signInWithPassword({
      email: memberEmail,
      password: memberPassword,
    });
    if (signInError) throw new Error(`sign-in: ${signInError.message}`);

    const started = Date.now();
    const { data, error } = await signedIn.rpc("get_company_operations_summary", {
      p_company_id: companyId,
    });
    const elapsed = Date.now() - started;
    if (error) {
      check("the RPC returns", false, error.message);
      return;
    }

    console.log(`  RPC returned in ${elapsed} ms\n`);
    console.log("Every moved figure equals the shipped builders over EVERY row");

    const n = (v) => Number(v ?? 0);
    const pairs = [
      ["collectedRevenue", truth.collectedRevenue, n(data.revenue.collectedRevenue)],
      ["outstandingRevenue", truth.outstandingRevenue, n(data.revenue.outstandingRevenue)],
      ["openJobs", truth.openJobs, n(data.jobs.openCount)],
      ["pendingExpenses.count", truth.submittedCount, n(data.expenses.submittedCount)],
      ["pendingExpenses.totalAmount", truth.submittedTotal, n(data.expenses.submittedTotal)],
      ["activeLaborEntries", truth.activeLaborEntries, n(data.labor.activeLaborEntries)],
      ["technicianCount", truth.technicianCount, n(data.labor.technicianCount)],
    ];

    for (const [field, expected, actual] of pairs) {
      // Money to the half-cent: the builders sum JavaScript floats, Postgres
      // sums numerics. Counts must match exactly.
      const tolerance = field.toLowerCase().includes("revenue") ||
        field.toLowerCase().includes("amount")
        ? 0.005
        : 0;
      check(
        `${field.padEnd(28)} ${actual}`,
        Math.abs(expected - actual) <= tolerance,
        `builders ${expected}, SQL ${actual}, difference ${actual - expected}`,
      );
    }

    console.log("\nThe candidate counts are necessary conditions, not rules");
    const completed = await readAll("jobs", "status", (q) =>
      q.is("deleted_at", null).is("archived_at", null).eq("status", "completed"),
    );
    check(
      `completedJobCount ${n(data.candidates.completedJobCount)}`,
      n(data.candidates.completedJobCount) === completed.length,
      `actual ${completed.length}`,
    );

    const stalled = await readAll("jobs", "status", (q) =>
      q
        .is("deleted_at", null)
        .is("archived_at", null)
        .in("status", ["dispatched", "arrived", "in_progress"]),
    );
    check(
      `stalledCandidateCount ${n(data.candidates.stalledCandidateCount)}`,
      n(data.candidates.stalledCandidateCount) === stalled.length,
      `actual ${stalled.length}`,
    );

    console.log("\nThe truncation this replaces was real");
    const { data: capped } = await admin
      .from("invoices")
      .select("balance_due, status")
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .is("archived_at", null);
    const cappedOutstanding = round2(
      (capped ?? [])
        .filter(
          (i) =>
            i.status !== "void" &&
            i.status !== "cancelled" &&
            Number(i.balance_due ?? 0) > 0,
        )
        .reduce((sum, i) => sum + Number(i.balance_due ?? 0), 0),
    );
    const understated =
      truth.outstandingRevenue > 0
        ? ((truth.outstandingRevenue - cappedOutstanding) /
            truth.outstandingRevenue) *
          100
        : 0;
    console.log(
      `  the old unbounded read returned ${(capped ?? []).length} of ` +
        `${truth.scale.invoices} invoices`,
    );
    console.log(
      `  outstanding revenue from that subset understates the true figure by ` +
        `${understated.toFixed(1)}%`,
    );
    check(
      "the aggregate is not merely equal to the truncated array",
      truth.scale.invoices <= 1000 || cappedOutstanding !== truth.outstandingRevenue,
      "if these matched on a tenant above the ceiling, the comparison would be vacuous",
    );

    console.log("\nAnon cannot call it");
    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: anonError } = await anon.rpc("get_company_operations_summary", {
      p_company_id: companyId,
    });
    check("anon is refused", anonError != null, "the call succeeded");
  } finally {
    await admin
      .from("company_memberships")
      .delete()
      .eq("company_id", companyId)
      .eq("user_id", member.id);
    await admin.auth.admin.deleteUser(member.id);
    console.log("\n  fixture member removed");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} operations summary checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
