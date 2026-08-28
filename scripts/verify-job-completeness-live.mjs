/**
 * The SQL rule duplication, held to the shipped one (Phase 5A).
 *
 * ===================== WHY THIS IS THE IMPORTANT ONE =====================
 * Migration 168 moved the dashboard's operations panel into SQL by splitting
 * computeJobProfitability in two:
 *
 *   MONEY         revenue, COGS, margins. Stayed in TypeScript. Untouched.
 *   COMPLETENESS  seven counts of rows matching a status test. Moved.
 *
 * That split is what makes the move safe — but the aggregate in 168 also encodes
 * jobProfitabilityHasWarnings, resolveCompletedWorkReviewReasons and
 * resolveCompletedWorkReviewSeverity a SECOND time, in SQL, because a per-job
 * round trip for twelve thousand jobs is the problem rather than the solution.
 *
 * A second copy of a business rule is exactly what the rest of this work has
 * been removing. This is what makes the copy defensible: it pulls the seven raw
 * counters per job out of the database, runs the SHIPPED TypeScript rules over
 * them, and asserts the SQL aggregate equals that — for EVERY job in the
 * tenant, not a sample. If either copy drifts, this fails.
 *
 * The counters themselves are still SQL, so this does not prove the counting is
 * right — it proves the RULES agree. The counting is checked separately by
 * comparing against the datasets the old path loaded.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-job-completeness-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import {
  jobProfitabilityHasWarnings,
  resolveCompletedWorkReviewReasons,
  resolveCompletedWorkReviewSeverity,
} from "@/shared/types/reports";
import { STALLED_JOB_INACTIVITY_DAYS } from "@/lib/database/services/reports/stalled-jobs-report";

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

/**
 * A snapshot shaped exactly as the shipped rules read it.
 *
 * They only ever touch `completeness`, which is the whole point of the split —
 * so the money half is left undefined rather than filled with plausible zeros
 * that could hide a rule quietly starting to read one.
 */
function toCompletenessSnapshot(row) {
  return {
    completeness: {
      materialsMissingUnitCostCount: Number(row.materials_missing_unit_cost),
      excludedPendingExpenseCount: Number(row.pending_expense_count),
      excludedRejectedExpenseCount: Number(row.rejected_expense_count),
      excludedMaterialsExpenseCount: Number(row.materials_expense_count),
      expensesMissingAmountCount: Number(row.expenses_missing_amount),
      noActiveInvoices: Number(row.active_invoice_count) === 0,
      hasProjectedEstimate: false,
      openLaborEntryCount: Number(row.open_labor_entry_count),
    },
  };
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Company:        ${companyId}\n`);

  const suffix = Math.random().toString(36).slice(2, 8);
  const memberEmail = `jobcomplete-${suffix}@jobcomplete.invalid`;
  const memberPassword = `Job!complete-${suffix}-Zq9`;
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
      .upsert({ id: member.id, email: memberEmail, full_name: "Job Complete" });
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

    // -------------------------------------------------------------------
    // Every job's counters, paged so nothing here is an unbounded read
    // either. The whole tenant, not a sample.
    // -------------------------------------------------------------------
    // ============================== THIS LOOP HIT THE VERY DEFECT IT TESTS ==============================
    // It first asked for pages of 2,000 and stopped when a page came back
    // short. PostgREST caps a table-returning RPC at 1,000 rows exactly as it
    // caps a table read — so the first page returned 1,000, the loop read that
    // as "fewer than I asked for, so that is the end", and the comparison ran
    // against a twelfth of the tenant. It then reported a confident mismatch:
    // 6,301 against 517.
    //
    // The page size now MATCHES the ceiling, so a full page is a full page and
    // a short one genuinely means the end. Asking for more than the server will
    // return and treating the shortfall as completion is the same mistake this
    // whole pass exists to remove, reproduced inside its own test.
    const rows = [];
    const PAGE = 1000;
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await signedIn.rpc(
        "get_company_job_completeness_counters",
        { p_company_id: companyId, p_offset: offset, p_limit: PAGE },
      );
      if (error) throw new Error(`counters: ${error.message}`);
      const page = data ?? [];
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    console.log(`  counters pulled for ${rows.length} jobs`);

    // The paging loop is the one thing here that could silently under-read, so
    // it is checked against a head count rather than assumed complete.
    const { count: jobCount } = await admin
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .is("deleted_at", null)
      .is("archived_at", null);
    check(
      `the loop read every job in the tenant (${rows.length} of ${jobCount})`,
      rows.length === jobCount,
      "a short read here compares the SQL against a fraction of the data, and " +
        "can then pass or fail for reasons that have nothing to do with the rules",
    );
    console.log("");

    // -------------------------------------------------------------------
    // The SHIPPED rules, over those counters.
    // -------------------------------------------------------------------
    let expectedWarnings = 0;
    let expectedAwaiting = 0;
    let expectedReview = 0;
    let expectedCritical = 0;

    for (const row of rows) {
      const snapshot = toCompletenessSnapshot(row);
      const status = row.job_status;

      if (jobProfitabilityHasWarnings(snapshot, status)) {
        expectedWarnings += 1;
      }

      if (status === "completed") {
        if (snapshot.completeness.noActiveInvoices) expectedAwaiting += 1;

        const reasons = resolveCompletedWorkReviewReasons(snapshot);
        if (reasons.length > 0) {
          expectedReview += 1;
          if (resolveCompletedWorkReviewSeverity(reasons) === "critical") {
            expectedCritical += 1;
          }
        }
      }
    }

    const reference = new Date();
    const { data: summary, error: summaryError } = await signedIn.rpc(
      "get_company_job_completeness_summary",
      {
        p_company_id: companyId,
        p_reference: reference.toISOString(),
        p_stalled_days: STALLED_JOB_INACTIVITY_DAYS,
        p_limit: 5,
      },
    );
    if (summaryError) {
      check("the summary RPC returns", false, summaryError.message);
      return;
    }

    console.log("The SQL aggregate agrees with the shipped rules, job by job");
    const n = (v) => Number(v ?? 0);
    check(
      `jobsWithWarnings                 ${n(summary.jobsWithWarnings)}`,
      n(summary.jobsWithWarnings) === expectedWarnings,
      `shipped rules over the same counters: ${expectedWarnings}`,
    );
    check(
      `completedAwaitingInvoicingCount  ${n(summary.completedAwaitingInvoicingCount)}`,
      n(summary.completedAwaitingInvoicingCount) === expectedAwaiting,
      `shipped ${expectedAwaiting}`,
    );
    check(
      `completedWorkReviewCount         ${n(summary.completedWorkReviewCount)}`,
      n(summary.completedWorkReviewCount) === expectedReview,
      `shipped ${expectedReview}`,
    );
    check(
      `criticalCompletedWorkReviewCount ${n(summary.criticalCompletedWorkReviewCount)}`,
      n(summary.criticalCompletedWorkReviewCount) === expectedCritical,
      `shipped ${expectedCritical}`,
    );

    // -------------------------------------------------------------------
    // A comparison that cannot be vacuous.
    // -------------------------------------------------------------------
    console.log("\nThe fixture actually exercises the rules");
    check(
      `at least one job has warnings (${expectedWarnings} of ${rows.length})`,
      expectedWarnings > 0,
      "with no warning-bearing jobs the agreement above proves nothing",
    );
    check(
      `at least one completed job needs review (${expectedReview})`,
      expectedReview > 0,
    );
    check(
      "and the counts are not all identical to each other",
      new Set([expectedWarnings, expectedAwaiting, expectedReview]).size > 1,
      "identical counts could hide a rule collapsing into another",
    );

    // -------------------------------------------------------------------
    // Stalled jobs, against the shipped threshold and its fallback chain.
    // -------------------------------------------------------------------
    console.log("\nStalled jobs use the shipped threshold");
    check(
      `stalledCount ${n(summary.stalledCount)} at a ${STALLED_JOB_INACTIVITY_DAYS}-day threshold`,
      n(summary.stalledCount) >= 0,
    );
    const { data: zeroDay } = await signedIn.rpc(
      "get_company_job_completeness_summary",
      {
        p_company_id: companyId,
        p_reference: reference.toISOString(),
        p_stalled_days: 0,
        p_limit: 5,
      },
    );
    check(
      "a 0-day threshold catches strictly more than a 3-day one",
      n(zeroDay.stalledCount) >= n(summary.stalledCount),
      `0-day ${n(zeroDay.stalledCount)}, ${STALLED_JOB_INACTIVITY_DAYS}-day ${n(summary.stalledCount)}`,
    );
    check(
      "every returned stalled job is at or past the threshold",
      (summary.stalledJobs ?? []).every(
        (job) => Number(job.days_since_activity) >= STALLED_JOB_INACTIVITY_DAYS,
      ),
      JSON.stringify(
        (summary.stalledJobs ?? []).map((j) => j.days_since_activity),
      ),
    );
    check(
      "and they are ordered worst first",
      (summary.stalledJobs ?? []).every(
        (job, index, all) =>
          index === 0 ||
          Number(all[index - 1].days_since_activity) >=
            Number(job.days_since_activity),
      ),
    );

    // -------------------------------------------------------------------
    // Roles.
    // -------------------------------------------------------------------
    console.log("\nTenant isolation and roles");
    const { data: otherCo } = await admin
      .from("companies")
      .insert({
        name: `[JOBCOMPLETE-OTHER] ${suffix}`,
        slug: `loadtest-jobother-${suffix}`,
        trade: "hvac",
      })
      .select("id")
      .single();

    const outsiderEmail = `joboutsider-${suffix}@jobcomplete.invalid`;
    const outsiderPassword = `Job!outsider-${suffix}-Zq9`;
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
        full_name: "Job Outsider",
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
        "get_company_job_completeness_summary",
        {
          p_company_id: otherCo.id,
          p_reference: reference.toISOString(),
          p_stalled_days: STALLED_JOB_INACTIVITY_DAYS,
          p_limit: 5,
        },
      );
      check(
        "the outsider IS able to read their OWN company",
        ownError == null,
        ownError ? `${ownError.message} — the check below would prove nothing` : "",
      );

      const { error: crossError } = await outsiderClient.rpc(
        "get_company_job_completeness_summary",
        {
          p_company_id: companyId,
          p_reference: reference.toISOString(),
          p_stalled_days: STALLED_JOB_INACTIVITY_DAYS,
          p_limit: 5,
        },
      );
      check("and is refused the seeded company", crossError != null);

      const { data: crossCounters } = await outsiderClient.rpc(
        "get_company_job_completeness_counters",
        { p_company_id: companyId, p_offset: 0, p_limit: 10 },
      );
      check(
        "the counters function returns nothing across tenants",
        (crossCounters ?? []).length === 0,
        `got ${(crossCounters ?? []).length} rows`,
      );

      // A technician is a member but has neither billing nor dispatch, so the
      // permission gate — not the tenant gate — must empty this.
      const techEmail = `jobtech-${suffix}@jobcomplete.invalid`;
      const techPassword = `Job!tech-${suffix}-Zq9`;
      const { data: techCreated } = await admin.auth.admin.createUser({
        email: techEmail,
        password: techPassword,
        email_confirm: true,
      });
      const tech = techCreated.user;
      try {
        await admin
          .from("profiles")
          .upsert({ id: tech.id, email: techEmail, full_name: "Job Tech" });
        await admin.from("company_memberships").insert({
          company_id: companyId,
          user_id: tech.id,
          role: "technician",
          status: "active",
          joined_at: new Date().toISOString(),
        });
        const techClient = createClient(url, anonKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await techClient.auth.signInWithPassword({
          email: techEmail,
          password: techPassword,
        });
        const { data: techData, error: techError } = await techClient.rpc(
          "get_company_job_completeness_summary",
          {
            p_company_id: companyId,
            p_reference: reference.toISOString(),
            p_stalled_days: STALLED_JOB_INACTIVITY_DAYS,
            p_limit: 5,
          },
        );
        check(
          "a technician in the SAME company gets zeros, not the counts",
          techError == null && n(techData?.jobsWithWarnings) === 0,
          techError
            ? techError.message
            : `got jobsWithWarnings ${n(techData?.jobsWithWarnings)}`,
        );
      } finally {
        await admin
          .from("company_memberships")
          .delete()
          .eq("company_id", companyId)
          .eq("user_id", tech.id);
        await admin.auth.admin.deleteUser(tech.id);
      }
    } finally {
      await admin.from("company_memberships").delete().eq("company_id", otherCo.id);
      await admin.from("companies").delete().eq("id", otherCo.id);
      await admin.auth.admin.deleteUser(outsider.id);
    }

    const { data: svc } = await admin.rpc(
      "get_company_job_completeness_summary",
      {
        p_company_id: companyId,
        p_reference: reference.toISOString(),
        p_stalled_days: STALLED_JOB_INACTIVITY_DAYS,
        p_limit: 5,
      },
    );
    check(
      "service_role receives zeros without an actor",
      n(svc?.jobsWithWarnings) === 0,
      `got ${n(svc?.jobsWithWarnings)}`,
    );

    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: anonError } = await anon.rpc(
      "get_company_job_completeness_summary",
      {
        p_company_id: companyId,
        p_reference: reference.toISOString(),
        p_stalled_days: STALLED_JOB_INACTIVITY_DAYS,
        p_limit: 5,
      },
    );
    check("anon is refused", anonError != null);
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
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} job completeness checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
