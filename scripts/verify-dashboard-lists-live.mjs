/**
 * The dashboard's card lists, SQL against the shipped predicates (Phase 5A).
 *
 * ===================== WHAT IS BEING PROVED =====================
 * Every attention card on the dashboard is `{ count, items.slice(0, N) }`.
 * Migration 158 already provides the counts and is proven. Migration 167 now
 * provides the ITEMS, so the dashboard no longer loads every invoice, estimate
 * and expense to take ten rows off the end of a filter.
 *
 * A list is harder to get right than a count, because it has an ORDER. A count
 * that is correct with the wrong order is still correct; a card promising "the
 * ten most overdue" and showing ten arbitrary ones is wrong while looking
 * exactly right. So each assertion below compares the SQL rows against
 *
 *     shippedPredicate(everyRow).slice(0, limit)
 *
 * id for id, in order — not as a set. The shipped predicates and sorts are
 * imported, not restated.
 *
 * ===================== WHY GROUND TRUTH IS RANGE-WALKED =====================
 * The arrays these replace were capped at PostgREST's 1,000 rows. Comparing
 * against a truncated array would prove the SQL wrong when it is right — the
 * error the whole pass exists to remove, reproduced inside its own test. Every
 * ground-truth read below walks to completion.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-dashboard-lists-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { mapInvoiceRowToInvoice } from "@/lib/database/mappers/invoice";
import { mapEstimateRowToEstimate } from "@/lib/database/queries/estimates";
import { mapExpenseRow } from "@/lib/database/queries/expenses";
import {
  hasInvoiceUnpaidBalance,
} from "@/shared/types/invoice";
import {
  buildUnpaidInvoiceFollowUpEntries,
  UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
} from "@/shared/lib/unpaid-invoice-follow-up";
import {
  buildStaleSentEstimateEntries,
  ESTIMATE_RECOVERY_THRESHOLD_DAYS,
} from "@/shared/lib/estimate-recovery";
import { selectAcceptedEstimatesNeedingScheduling } from "@/shared/lib/accepted-estimate-scheduling";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";
const LIMIT = 10;

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

const companyId = args.company ?? "3b781300-e506-425a-a35c-87ffb5662ec0";
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const INVOICE_SELECT = `
  *, customers(name, email), jobs(job_number),
  estimates(estimate_number), invoice_line_items(id)
`;
const ESTIMATE_SELECT = `
  *, customers(name, email), jobs(job_number), estimate_line_items(id)
`;
const EXPENSE_SELECT = `
  *, technician:profiles!expenses_technician_id_fkey(full_name, email),
  job:jobs(job_number, customer_id)
`;

/** Reads to completion, in explicit ranges. Never a bare select. */
async function readAll(table, select, narrow, orderColumn = "created_at", ascending = false) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; from < 500_000; from += PAGE) {
    let query = admin.from(table).select(select).eq("company_id", companyId);
    query = narrow(query);
    const { data, error } = await query
      .order(orderColumn, { ascending })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) break;
  }
  return rows;
}

function idsOf(rows, key = "id") {
  return rows.map((row) => row[key]);
}

function compareIdLists(name, expected, actual) {
  const same =
    expected.length === actual.length &&
    expected.every((id, index) => id === actual[index]);
  check(
    `${name.padEnd(34)} ${actual.length} rows, in order`,
    same,
    same
      ? ""
      : `shipped ${JSON.stringify(expected)}\n        SQL     ${JSON.stringify(actual)}`,
  );
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Company:        ${companyId}`);
  console.log(`Limit:          ${LIMIT}\n`);

  const reference = new Date();

  // ---------------------------------------------------------------------
  // Ground truth, from the shipped predicates over EVERY row.
  // ---------------------------------------------------------------------
  const [invoiceRows, estimateRows, expenseRows] = await Promise.all([
    readAll("invoices", INVOICE_SELECT, (q) =>
      q.is("deleted_at", null).is("archived_at", null),
    ),
    readAll("estimates", ESTIMATE_SELECT, (q) =>
      q.is("deleted_at", null).is("archived_at", null),
    ),
    readAll("expenses", EXPENSE_SELECT, (q) =>
      q.is("deleted_at", null).is("archived_at", null),
    ),
  ]);

  console.log(
    `  ground truth read to completion: ${invoiceRows.length} invoices, ` +
      `${estimateRows.length} estimates, ${expenseRows.length} expenses`,
  );

  const invoices = invoiceRows.map(mapInvoiceRowToInvoice);
  const estimates = estimateRows.map(mapEstimateRowToEstimate);
  const expenses = expenseRows.map(mapExpenseRow);

  // The shipped derivations, exactly as dashboard.ts performs them.
  const unpaidInvoices = invoices.filter(hasInvoiceUnpaidBalance);
  const expectedOverdue = unpaidInvoices.filter((i) => i.status === "overdue");
  const expectedUnsentInvoices = invoices.filter((i) => i.status === "draft");
  const expectedFollowUp = buildUnpaidInvoiceFollowUpEntries(invoices, reference);
  const expectedUnsentEstimates = estimates.filter((e) => e.status === "draft");
  const expectedStaleSent = buildStaleSentEstimateEntries(estimates, reference);
  const expectedPendingExpenses = expenses.filter((e) => e.status === "submitted");
  const expectedRecentReceipts = [...expenses]
    .filter((e) => e.receiptStatus === "attached")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  const expectedRejectedCount = expenses.filter(
    (e) => e.status === "rejected",
  ).length;

  // ---------------------------------------------------------------------
  // The RPC, as a real signed-in owner.
  // ---------------------------------------------------------------------
  const suffix = Math.random().toString(36).slice(2, 8);
  const memberEmail = `dashlists-${suffix}@dashlists.invalid`;
  const memberPassword = `Dash!lists-${suffix}-Zq9`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: memberEmail,
    password: memberPassword,
    email_confirm: true,
  });
  if (createError) throw new Error(`member: ${createError.message}`);
  const member = created.user;

  try {
    await admin
      .from("profiles")
      .upsert({ id: member.id, email: memberEmail, full_name: "Dash Lists" });
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

    const signedIn = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await signedIn.auth.signInWithPassword({
      email: memberEmail,
      password: memberPassword,
    });
    if (signInError) throw new Error(`sign-in: ${signInError.message}`);

    const started = Date.now();
    const { data, error } = await signedIn.rpc("get_company_dashboard_lists", {
      p_company_id: companyId,
      p_reference: reference.toISOString(),
      p_follow_up_days: UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
      p_recovery_days: ESTIMATE_RECOVERY_THRESHOLD_DAYS,
      p_limit: LIMIT,
    });
    const elapsed = Date.now() - started;
    if (error) {
      check("the RPC returns", false, error.message);
      return;
    }
    console.log(`  RPC returned in ${elapsed} ms\n`);

    console.log("Every list equals the shipped predicate, truncated the same way");
    compareIdLists(
      "overdueInvoices",
      idsOf(expectedOverdue).slice(0, LIMIT),
      idsOf(data.overdueInvoices ?? []),
    );
    compareIdLists(
      "unsentInvoices",
      idsOf(expectedUnsentInvoices).slice(0, LIMIT),
      idsOf(data.unsentInvoices ?? []),
    );
    compareIdLists(
      "followUpInvoices",
      expectedFollowUp.slice(0, LIMIT).map((entry) => entry.invoiceId),
      idsOf(data.followUpInvoices ?? []),
    );
    compareIdLists(
      "unsentEstimates",
      idsOf(expectedUnsentEstimates).slice(0, LIMIT),
      idsOf(data.unsentEstimates ?? []),
    );
    compareIdLists(
      "staleSentEstimates",
      expectedStaleSent.slice(0, LIMIT).map((entry) => entry.estimateId),
      idsOf(data.staleSentEstimates ?? []),
    );
    compareIdLists(
      "pendingExpenses",
      idsOf(expectedPendingExpenses).slice(0, LIMIT),
      idsOf(data.pendingExpenses ?? []),
    );
    compareIdLists(
      "recentReceipts",
      idsOf(expectedRecentReceipts).slice(0, LIMIT),
      idsOf(data.recentReceipts ?? []),
    );
    check(
      `rejectedExpenseCount ${data.rejectedExpenseCount}`,
      Number(data.rejectedExpenseCount) === expectedRejectedCount,
      `shipped ${expectedRejectedCount}`,
    );

    // ---------------------------------------------------------------------
    // Accepted estimates needing scheduling — the one with a join in it.
    // ---------------------------------------------------------------------
    console.log("\nApproved estimates still needing action");
    const approvedCandidates = estimates.filter(
      (e) => e.status === "approved" && !e.archivedAt && !e.deletedAt,
    );
    const linkedJobIds = approvedCandidates
      .map((e) => e.jobId)
      .filter((id) => Boolean(id));

    const jobsById = new Map();
    for (let i = 0; i < linkedJobIds.length; i += 200) {
      const chunk = linkedJobIds.slice(i, i + 200);
      const { data: jobRows, error: jobError } = await admin
        .from("jobs")
        .select("id, status, assigned_technician_id, job_number")
        .eq("company_id", companyId)
        .in("id", chunk);
      if (jobError) throw new Error(`jobs: ${jobError.message}`);
      for (const row of jobRows ?? []) {
        jobsById.set(row.id, {
          id: row.id,
          status: row.status,
          assignedTechnicianId: row.assigned_technician_id ?? undefined,
          assignedTechnician: undefined,
          jobNumber: row.job_number,
        });
      }
    }

    const expectedAccepted = selectAcceptedEstimatesNeedingScheduling(
      approvedCandidates,
      jobsById,
    );

    check(
      `count ${data.acceptedEstimatesNeedingSchedulingCount}`,
      Number(data.acceptedEstimatesNeedingSchedulingCount) ===
        expectedAccepted.length,
      `shipped ${expectedAccepted.length}`,
    );
    compareIdLists(
      "acceptedEstimatesNeedingSchedul.",
      idsOf(expectedAccepted).slice(0, LIMIT),
      idsOf(data.acceptedEstimatesNeedingScheduling ?? []),
    );

    // ---------------------------------------------------------------------
    // The limit is honoured, not assumed.
    // ---------------------------------------------------------------------
    console.log("\nThe limit is an argument, not a constant");
    const { data: small } = await signedIn.rpc("get_company_dashboard_lists", {
      p_company_id: companyId,
      p_reference: reference.toISOString(),
      p_follow_up_days: UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
      p_recovery_days: ESTIMATE_RECOVERY_THRESHOLD_DAYS,
      p_limit: 3,
    });
    check(
      "a limit of 3 returns 3 overdue invoices",
      (small.overdueInvoices ?? []).length === Math.min(3, expectedOverdue.length),
      `got ${(small.overdueInvoices ?? []).length}`,
    );
    check(
      "and they are the same first three",
      idsOf(small.overdueInvoices ?? []).every(
        (id, index) => id === idsOf(expectedOverdue)[index],
      ),
    );

    // ---------------------------------------------------------------------
    // Roles.
    // ---------------------------------------------------------------------
    console.log("\nTenant isolation and roles");
    const { data: otherCo } = await admin
      .from("companies")
      .insert({
        name: `[DASHLISTS-OTHER] ${suffix}`,
        slug: `loadtest-dashother-${suffix}`,
        trade: "hvac",
      })
      .select("id")
      .single();

    const outsiderEmail = `dashoutsider-${suffix}@dashlists.invalid`;
    const outsiderPassword = `Dash!outsider-${suffix}-Zq9`;
    const { data: outsiderCreated } = await admin.auth.admin.createUser({
      email: outsiderEmail,
      password: outsiderPassword,
      email_confirm: true,
    });
    const outsider = outsiderCreated.user;

    try {
      await admin.from("profiles").upsert({
        id: outsider.id,
        email: outsiderEmail,
        full_name: "Dash Outsider",
      });
      await admin.from("company_memberships").insert({
        company_id: otherCo.id,
        user_id: outsider.id,
        role: "owner",
        status: "active",
        joined_at: new Date().toISOString(),
      });

      const outsiderClient = createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await outsiderClient.auth.signInWithPassword({
        email: outsiderEmail,
        password: outsiderPassword,
      });

      const { error: ownError } = await outsiderClient.rpc(
        "get_company_dashboard_lists",
        {
          p_company_id: otherCo.id,
          p_reference: reference.toISOString(),
          p_follow_up_days: UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
          p_recovery_days: ESTIMATE_RECOVERY_THRESHOLD_DAYS,
          p_limit: LIMIT,
        },
      );
      check(
        "the outsider IS able to read their OWN company",
        ownError == null,
        ownError ? `${ownError.message} — the check below would prove nothing` : "",
      );

      const { data: crossData, error: crossError } = await outsiderClient.rpc(
        "get_company_dashboard_lists",
        {
          p_company_id: companyId,
          p_reference: reference.toISOString(),
          p_follow_up_days: UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
          p_recovery_days: ESTIMATE_RECOVERY_THRESHOLD_DAYS,
          p_limit: LIMIT,
        },
      );
      check(
        "and is refused the seeded company",
        crossError != null,
        crossError
          ? ""
          : `the call SUCCEEDED and returned ${(crossData?.overdueInvoices ?? []).length} invoice rows`,
      );
    } finally {
      await admin.from("company_memberships").delete().eq("company_id", otherCo.id);
      await admin.from("companies").delete().eq("id", otherCo.id);
      await admin.auth.admin.deleteUser(outsider.id);
    }

    const { data: svcData } = await admin.rpc("get_company_dashboard_lists", {
      p_company_id: companyId,
      p_reference: reference.toISOString(),
      p_follow_up_days: UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
      p_recovery_days: ESTIMATE_RECOVERY_THRESHOLD_DAYS,
      p_limit: LIMIT,
    });
    check(
      "service_role receives empty lists, not the company's rows",
      (svcData?.overdueInvoices ?? []).length === 0,
      `got ${(svcData?.overdueInvoices ?? []).length} rows`,
    );

    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: anonError } = await anon.rpc("get_company_dashboard_lists", {
      p_company_id: companyId,
      p_reference: reference.toISOString(),
      p_follow_up_days: UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS,
      p_recovery_days: ESTIMATE_RECOVERY_THRESHOLD_DAYS,
      p_limit: LIMIT,
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
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} dashboard list checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
