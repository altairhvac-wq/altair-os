/**
 * The reports aggregates, held to the shipped builders over every row.
 *
 * ===================== WHAT THIS PROVES, AND WHY IT IS THE ONLY WAY =====================
 * Migrations 169 and 170 moved the reports page's counting into SQL. That means
 * the predicates now exist twice -- which invoice is active, which job counts as
 * completed in a period, which estimate counts as sent -- and a second copy of a
 * business rule is exactly what the rest of this work has been removing.
 *
 * This is what makes the copy defensible. For each date range it:
 *
 *   1. Reads EVERY row of every dataset the old page loaded, paged to
 *      completion, mapped by the SHIPPED mappers.
 *   2. Runs the SHIPPED array builders -- buildReportsPageData,
 *      buildReportChartSeriesBundle, attachReportPageSparklines -- over them.
 *      That result is the oracle.
 *   3. Calls both aggregates as a real signed-in member and runs the new
 *      builders over what they return.
 *   4. Asserts the two are equal, field by field, list by list, IN ORDER.
 *
 * The oracle is deliberately NOT the array the page holds today. That array is
 * the defect: PostgREST caps it at 1,000 rows, so on this fixture it reports
 * outstanding AR of $992,872 against a true $11,304,791 and an empty 90+ day
 * aging bucket against $10,076,347. Comparing the SQL to it would prove the SQL
 * reproduces the bug.
 *
 * ===================== AND THE PRIVILEGE HALF =====================
 * Both functions are SECURITY DEFINER, so behaviour is tested rather than
 * inferred from the migration text: anon, a member of a DIFFERENT company, and
 * a technician in the SAME company (the permission gate, not the tenant gate).
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-reports-live.mjs --confirm <ref> [--company <uuid>]
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import {
  loadReportDatasets,
  loadLaborCostRates,
} from "./lib/reports-oracle.mjs";
import { buildReportsPageData } from "@/shared/lib/reports/report-metrics";
import { buildReportChartSeriesBundle } from "@/shared/lib/reports/chart-series";
import { attachReportPageSparklines } from "@/shared/lib/reports/sparkline-series";
import { buildReportsPageDataFromAggregates } from "@/shared/lib/reports/report-metrics-aggregates";
import {
  attachReportPageSparklinesFromAggregates,
  buildReportChartSeriesFromDailySeries,
} from "@/shared/lib/reports/chart-series-aggregates";
import { resolvePreviousReportDateBounds } from "@/shared/lib/reports/report-metrics";
import { getLeadFollowUpDueCutoff } from "@/shared/lib/leads/lead-status";
import {
  resolveProfitabilityReportDateBounds,
  resolveReportDateBounds,
} from "@/shared/types/reports";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";

const TIME_ZONE = "America/New_York";
const DATE_RANGES = ["7d", "30d", "90d", "ytd"];

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
if (appUrl && appUrl === url) {
  fail("Target is the application's own project. Use scratch.");
}
if (args.confirm !== ref) {
  fail(`--confirm must match the target project ref "${ref}".`);
}

const companyId = args.company ?? "7830cb77-b7cc-481e-bfdf-97a85e77e0b6";
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---------------------------------------------------------------------------
// Comparison helpers
//
// Money is compared to the cent. Everything the builders produce has already
// been through roundCurrency or roundJobMaterialAmount, so an exact comparison
// is the right one -- a tolerance here would hide precisely the class of defect
// this exists to catch.
// ---------------------------------------------------------------------------

function eq(label, actual, expected) {
  check(
    label,
    Object.is(actual, expected) || actual === expected,
    Object.is(actual, expected) ? "" : `expected ${expected}, got ${actual}`,
  );
}

/** Lists compared IN ORDER: the order is what the page renders. */
function eqList(label, actual, expected, describe) {
  const a = (actual ?? []).map(describe);
  const b = (expected ?? []).map(describe);
  const same = a.length === b.length && a.every((row, i) => row === b[i]);
  check(
    label,
    same,
    same
      ? ""
      : `\n        aggregate: ${JSON.stringify(a)}\n        oracle:    ${JSON.stringify(b)}`,
  );
}

function eqNumbers(label, actual, expected) {
  const a = actual ?? [];
  const b = expected ?? [];
  const same = a.length === b.length && a.every((v, i) => v === b[i]);
  const firstDiff = a.findIndex((v, i) => v !== b[i]);
  check(
    label,
    same,
    same
      ? ""
      : `length ${a.length} vs ${b.length}` +
        (firstDiff >= 0
          ? `, first difference at ${firstDiff}: ${a[firstDiff]} vs ${b[firstDiff]}`
          : ""),
  );
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Company:        ${companyId}\n`);

  const suffix = Math.random().toString(36).slice(2, 8);
  const created = [];
  // Tracked here rather than in the try body so an assertion failure part way
  // through still removes it. An earlier run left three orphaned isolation
  // companies behind for exactly that reason.
  let isolationCompanyId = null;

  // Two owners are created (one here, one in another company for the isolation
  // check), so the address is keyed by sequence and not by role.
  let memberSeq = 0;

  async function makeMember(role, targetCompanyId) {
    memberSeq += 1;
    const email = `reports-${role}-${memberSeq}-${suffix}@reports.invalid`;
    const password = `Reports!${role}-${memberSeq}-${suffix}-Zq9`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`${role}: ${error.message}`);
    created.push(data.user.id);
    await admin
      .from("profiles")
      .upsert({ id: data.user.id, email, full_name: `Reports ${role}` });
    const { error: membershipError } = await admin
      .from("company_memberships")
      .insert({
        company_id: targetCompanyId,
        user_id: data.user.id,
        role,
        status: "active",
        joined_at: new Date().toISOString(),
      });
    if (membershipError) {
      throw new Error(`${role} membership: ${membershipError.message}`);
    }
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw new Error(`${role} sign-in: ${signInError.message}`);
    return client;
  }

  try {
    const owner = await makeMember("owner", companyId);

    // -------------------------------------------------------------------
    // The oracle: every row, once. Loading is expensive, and it does not
    // depend on the date range -- only the reduction does.
    // -------------------------------------------------------------------
    console.log("Reading every row (the oracle)\n");
    const datasets = await loadReportDatasets(admin, companyId);
    const laborCostRates = await loadLaborCostRates(admin, companyId);

    for (const [name, rows] of Object.entries(datasets)) {
      console.log(`  ${name.padEnd(14)} ${rows.length}`);
    }

    check(
      "the oracle read past the 1,000-row ceiling on at least one dataset",
      Object.values(datasets).some((rows) => rows.length > 1000),
      "every dataset came back at or under 1,000 rows, so this fixture cannot " +
        "distinguish a paged read from a truncated one",
    );

    for (const dateRange of DATE_RANGES) {
      console.log(`\n=== ${dateRange} ===\n`);

      const dateBounds =
        resolveReportDateBounds(dateRange) ??
        resolveProfitabilityReportDateBounds(dateRange);
      const previousBounds = resolvePreviousReportDateBounds(dateBounds);

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const followUpCutoff = getLeadFollowUpDueCutoff(now, TIME_ZONE);

      // ---------------- oracle ----------------
      const oracleCharts = buildReportChartSeriesBundle(datasets, { dateRange });
      const oracle = attachReportPageSparklines(
        buildReportsPageData({
          companyName: "Bench",
          dateRange,
          showTechnicianProfitability: true,
          showLeadPipeline: true,
          timeZone: TIME_ZONE,
          totalCustomerCount: datasets.customers.length,
          datasets: { ...datasets, chartSeries: oracleCharts, laborCostRates },
        }),
        {
          payments: datasets.payments,
          estimates: datasets.estimates,
          invoices: datasets.invoices,
          chartSeries: oracleCharts,
        },
      );

      // ---------------- aggregate ----------------
      const { data: summary, error: summaryError } = await owner.rpc(
        "get_company_reports_summary",
        {
          p_company_id: companyId,
          p_start_date: dateBounds.startDate,
          p_end_date: dateBounds.endDate,
          p_prev_start_date: previousBounds.startDate,
          p_prev_end_date: previousBounds.endDate,
          p_today: today,
          p_follow_up_cutoff: followUpCutoff,
          p_limit: 5,
        },
      );
      if (summaryError) throw new Error(`summary rpc: ${summaryError.message}`);

      const { data: series, error: seriesError } = await owner.rpc(
        "get_company_report_daily_series",
        {
          p_company_id: companyId,
          p_start_date: dateBounds.startDate,
          p_end_date: dateBounds.endDate,
        },
      );
      if (seriesError) throw new Error(`series rpc: ${seriesError.message}`);

      check(`${dateRange} summary authorized`, summary?.authorized === true);
      check(`${dateRange} series authorized`, series?.authorized === true);

      const aggregateCharts = buildReportChartSeriesFromDailySeries(series, {
        dateRange,
      });
      const actual = attachReportPageSparklinesFromAggregates(
        buildReportsPageDataFromAggregates({
          companyName: "Bench",
          dateRange,
          aggregate: summary,
          chartSeries: aggregateCharts,
          laborCostRates,
          showTechnicianProfitability: true,
          showLeadPipeline: true,
        }),
        { series, chartSeries: aggregateCharts },
      );

      // ---------------- KPIs ----------------
      for (let i = 0; i < oracle.kpis.length; i += 1) {
        const id = oracle.kpis[i].id;
        eq(`${dateRange} kpi ${id} value`, actual.kpis[i].value, oracle.kpis[i].value);
        eq(
          `${dateRange} kpi ${id} comparison`,
          actual.kpis[i].comparison,
          oracle.kpis[i].comparison,
        );
        eq(`${dateRange} kpi ${id} trend`, actual.kpis[i].trend, oracle.kpis[i].trend);
        eqNumbers(
          `${dateRange} kpi ${id} sparkline`,
          actual.kpis[i].sparkline,
          oracle.kpis[i].sparkline,
        );
      }

      // ---------------- cash health ----------------
      for (const field of [
        "paid",
        "outstanding",
        "overdue",
        "collectionRate",
        "collectionRateLabel",
      ]) {
        eq(
          `${dateRange} cashHealth.${field}`,
          actual.cashHealth[field],
          oracle.cashHealth[field],
        );
      }

      // ---------------- funnel ----------------
      eqList(
        `${dateRange} salesFunnel`,
        actual.salesFunnel,
        oracle.salesFunnel,
        (stage) => `${stage.key}=${stage.count}`,
      );

      // ---------------- accountant summary ----------------
      for (const field of [
        "totalInvoiceValue",
        "totalPaymentsCollected",
        "outstandingBalance",
        "overdueBalance",
        "salesTaxCollected",
        "expensesRecorded",
        "netIncomeEstimate",
      ]) {
        eq(
          `${dateRange} accountantSummary.${field}`,
          actual.accountantSummary[field],
          oracle.accountantSummary[field],
        );
      }

      eqList(
        `${dateRange} invoiceAging`,
        actual.accountantSummary.invoiceAging,
        oracle.accountantSummary.invoiceAging,
        (b) => `${b.label}:${b.count}:${b.amount}`,
      );

      // paymentsByMethod has no ordering rule in the array path (Map insertion
      // order), so it is compared as a set.
      const methodKey = (m) => `${m.method}:${m.amount}:${m.count}`;
      eqList(
        `${dateRange} paymentsByMethod (sorted)`,
        [...actual.accountantSummary.paymentsByMethod].sort((x, y) =>
          methodKey(x).localeCompare(methodKey(y)),
        ),
        [...oracle.accountantSummary.paymentsByMethod].sort((x, y) =>
          methodKey(x).localeCompare(methodKey(y)),
        ),
        methodKey,
      );

      // ---------------- snapshots ----------------
      const rowKey = (r) => `${r.id}|${r.label}|${r.detail ?? ""}|${r.value}`;
      eqList(
        `${dateRange} topCustomers`,
        actual.operationsSnapshot.topCustomers,
        oracle.operationsSnapshot.topCustomers,
        rowKey,
      );
      eqList(
        `${dateRange} topServiceCategories`,
        actual.operationsSnapshot.topServiceCategories,
        oracle.operationsSnapshot.topServiceCategories,
        rowKey,
      );
      eqList(
        `${dateRange} overdueInvoices`,
        actual.operationsSnapshot.overdueInvoices,
        oracle.operationsSnapshot.overdueInvoices,
        rowKey,
      );
      eqList(
        `${dateRange} workCompleted`,
        actual.operationsSnapshot.workCompleted,
        oracle.operationsSnapshot.workCompleted,
        rowKey,
      );

      // ---------------- technicians ----------------
      eqList(
        `${dateRange} technicianProfitability`,
        actual.technicianProfitability,
        oracle.technicianProfitability,
        (t) =>
          `${t.technicianId}|${t.name}|${t.revenue}|${t.jobCount}|${t.laborHours}|${t.laborCost}|${t.grossProfit}|${t.margin}|${t.profitAvailable}`,
      );

      // ---------------- customer health ----------------
      for (const field of [
        "repeatCustomerRate",
        "repeatCustomerRateLabel",
        "repeatCustomerCount",
        "totalCustomerCount",
        "lifetimeRevenueTotal",
        "lifetimeRevenueLabel",
      ]) {
        eq(
          `${dateRange} customerHealth.${field}`,
          actual.customerHealth[field],
          oracle.customerHealth[field],
        );
      }

      // ---------------- lead pipeline ----------------
      for (const field of [
        "totalLeads",
        "wonLeads",
        "lostLeads",
        "openLeads",
        "followUpsDue",
        "conversionRate",
        "topSourceInsight",
      ]) {
        eq(
          `${dateRange} leadPipeline.${field}`,
          actual.leadPipeline[field],
          oracle.leadPipeline[field],
        );
      }
      eqList(
        `${dateRange} leadPipeline.sourcePerformance`,
        actual.leadPipeline.sourcePerformance,
        oracle.leadPipeline.sourcePerformance,
        (s) => `${s.source}:${s.total}:${s.won}:${s.lost}:${s.conversionRate}`,
      );

      // ---------------- charts ----------------
      for (const chartId of ["revenue", "expenses", "jobs", "labor"]) {
        for (const seriesEntry of oracle.dateRange
          ? aggregateCharts[chartId].series
          : []) {
          const expected = oracleCharts[chartId].series.find(
            (s) => s.key === seriesEntry.key,
          );
          eqNumbers(
            `${dateRange} chart ${chartId}.${seriesEntry.key}`,
            seriesEntry.points.map((p) => p.value),
            expected?.points.map((p) => p.value),
          );
        }
        eqList(
          `${dateRange} chart ${chartId} limitations`,
          aggregateCharts[chartId].limitations,
          oracleCharts[chartId].limitations,
          (line) => line,
        );
      }

      eqList(
        `${dateRange} revenueTrend`,
        actual.revenueTrend,
        oracle.revenueTrend,
        (p) => `${p.label}:${p.value}`,
      );

      // ---------------- ledger sparklines ----------------
      for (const id of ["collected", "outstanding", "overdue", "net-income"]) {
        eqNumbers(
          `${dateRange} ledger sparkline ${id}`,
          actual.accountantSummary.sparklines?.[id],
          oracle.accountantSummary.sparklines?.[id],
        );
      }

      // ---------------- limitations ----------------
      eqList(
        `${dateRange} limitations`,
        actual.limitations,
        oracle.limitations,
        (line) => line,
      );
    }

    // -------------------------------------------------------------------
    // Privileges. Behaviour, not migration text.
    // -------------------------------------------------------------------
    console.log("\n=== privileges ===\n");

    const bounds = resolveProfitabilityReportDateBounds("30d");
    const summaryArgs = {
      p_company_id: companyId,
      p_start_date: bounds.startDate,
      p_end_date: bounds.endDate,
      p_prev_start_date: bounds.startDate,
      p_prev_end_date: bounds.endDate,
      p_today: bounds.endDate,
      p_follow_up_cutoff: new Date().toISOString(),
      p_limit: 5,
    };
    const seriesArgs = {
      p_company_id: companyId,
      p_start_date: bounds.startDate,
      p_end_date: bounds.endDate,
    };

    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    for (const [fn, callArgs] of [
      ["get_company_reports_summary", summaryArgs],
      ["get_company_report_daily_series", seriesArgs],
    ]) {
      const { error } = await anon.rpc(fn, callArgs);
      check(
        `anon cannot execute ${fn}`,
        error != null,
        error ? "" : "anon received a result",
      );
    }

    // A member of a DIFFERENT company must be refused by the tenant gate.
    const { data: otherCompany, error: otherCompanyError } = await admin
      .from("companies")
      .insert({
        name: `[LOADTEST] Reports Isolation ${suffix}`,
        slug: `loadtest-reports-isolation-${suffix}`,
        trade: "hvac",
      })
      .select("id")
      .single();
    if (otherCompanyError) {
      throw new Error(`other company: ${otherCompanyError.message}`);
    }
    isolationCompanyId = otherCompany.id;

    const outsider = await makeMember("owner", otherCompany.id);
    for (const [fn, callArgs] of [
      ["get_company_reports_summary", summaryArgs],
      ["get_company_report_daily_series", seriesArgs],
    ]) {
      const { error } = await outsider.rpc(fn, callArgs);
      check(
        `a member of another company cannot read ${fn}`,
        error != null && /insufficient_permission/.test(error.message),
        error ? `got: ${error.message}` : "outsider received a result",
      );
    }

    // A technician IS a member, so the tenant gate passes. The reports
    // permission gate must still refuse -- returning the unauthorized shape
    // rather than raising, which is how the function distinguishes "not your
    // company" from "not your report".
    const technician = await makeMember("technician", companyId);
    for (const [fn, callArgs] of [
      ["get_company_reports_summary", summaryArgs],
      ["get_company_report_daily_series", seriesArgs],
    ]) {
      const { data, error } = await technician.rpc(fn, callArgs);
      check(
        `a technician in the same company is refused ${fn}`,
        error == null && data?.authorized === false,
        error ? `raised: ${error.message}` : `authorized=${data?.authorized}`,
      );
    }

  } finally {
    for (const userId of created) {
      await admin.from("company_memberships").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    if (isolationCompanyId) {
      await admin
        .from("company_memberships")
        .delete()
        .eq("company_id", isolationCompanyId);
      await admin
        .from("companies")
        .delete()
        .eq("id", isolationCompanyId)
        .like("slug", "loadtest-reports-isolation-%");
    }
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} reports checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
