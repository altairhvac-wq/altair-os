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
 * ===================== ON EVERY CALENDAR THE PAGE CAN COUNT ON =====================
 * Migrations 220 and 221 let both functions count a timestamp on the
 * company's calendar instead of UTC's. So the whole comparison above runs
 * three times: on the old rule (no zone argument at all, the call every
 * deployment made before), on Mountain time and on Eastern time. The oracle
 * is the same shipped array builders, given the same day basis the page
 * gives them.
 *
 * Then, on a company made for the purpose, the case the change exists for: a
 * job finished at 03:30 UTC on the first of a month is in the month before
 * for a Mountain or Eastern company, in both the figures and the per-day
 * series, and stays where it was for a caller that passes no zone.
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
import { resolveLoadtestCompany } from "./lib/loadtest-company.mjs";

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
  resolveReportDayBasis,
  resolveReportPageDateBounds,
} from "@/shared/types/reports";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";

const TIME_ZONE = "America/New_York";
const DATE_RANGES = ["7d", "30d", "90d", "ytd"];
// null is the old rule: no zone argument, UTC days, this machine's own today.
const DAY_ZONES = [null, "America/Denver", "America/New_York"];

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

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// The fixture is named by its slug, not by a uuid the seeder reassigns on
// every rebuild. minJobs is the load-bearing argument: the whole point of
// this differential is behaviour above the PostgREST 1,000-row ceiling, and
// a small tenant would pass it without ever crossing that line.
const companyId =
  args.company ?? (await resolveLoadtestCompany(admin, { minJobs: 5000 }));

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

    // What each calendar counted, so the run can say whether the fixture
    // tells them apart at all.
    const countedOn = new Map();

    for (const dayZone of DAY_ZONES) {
    for (const dateRange of DATE_RANGES) {
      const zoneLabel = dayZone ?? "UTC days (no zone argument)";
      const label = `[${dayZone ?? "old rule"}] ${dateRange}`;
      console.log(`\n=== ${dateRange} on ${zoneLabel} ===\n`);

      const now = new Date();
      // The page's own rule: one basis for the period, the aging reference
      // date and every timestamp.
      const dayBasis = resolveReportDayBasis(dayZone, now);
      const dateBounds = resolveReportPageDateBounds(dateRange, dayBasis);
      const previousBounds = resolvePreviousReportDateBounds(dateBounds);
      const today = dayBasis.today;
      const followUpCutoff = getLeadFollowUpDueCutoff(now, TIME_ZONE);
      const zoneArg = dayBasis.timeZone ? { p_time_zone: dayBasis.timeZone } : {};

      // ---------------- oracle ----------------
      const oracleCharts = buildReportChartSeriesBundle(datasets, {
        dateRange,
        dayBasis,
      });
      const oracle = attachReportPageSparklines(
        buildReportsPageData({
          companyName: "Bench",
          dateRange,
          showTechnicianProfitability: true,
          showLeadPipeline: true,
          timeZone: TIME_ZONE,
          dayBasis,
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
          ...zoneArg,
        },
      );
      if (summaryError) throw new Error(`summary rpc: ${summaryError.message}`);

      const { data: series, error: seriesError } = await owner.rpc(
        "get_company_report_daily_series",
        {
          p_company_id: companyId,
          p_start_date: dateBounds.startDate,
          p_end_date: dateBounds.endDate,
          ...zoneArg,
        },
      );
      if (seriesError) throw new Error(`series rpc: ${seriesError.message}`);

      check(`${label} summary authorized`, summary?.authorized === true);
      check(`${label} series authorized`, series?.authorized === true);

      const aggregateCharts = buildReportChartSeriesFromDailySeries(series, {
        dateRange,
        dayBasis,
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
          dayBasis,
        }),
        { series, chartSeries: aggregateCharts },
      );

      check(
        `${label} both paths state the same period`,
        JSON.stringify(actual.dateBounds) === JSON.stringify(oracle.dateBounds) &&
          JSON.stringify(actual.dateBounds) === JSON.stringify(dateBounds),
        `aggregate ${JSON.stringify(actual.dateBounds)} oracle ${JSON.stringify(oracle.dateBounds)}`,
      );

      countedOn.set(
        `${dayZone ?? "old"}|${dateRange}`,
        JSON.stringify({
          bounds: [dateBounds.startDate, dateBounds.endDate],
          funnel: actual.salesFunnel.map((stage) => stage.count),
          jobs: aggregateCharts.jobs.series.map((entry) =>
            entry.points.map((point) => point.value),
          ),
          labor: aggregateCharts.labor.series.map((entry) =>
            entry.points.map((point) => point.value),
          ),
        }),
      );

      // ---------------- KPIs ----------------
      for (let i = 0; i < oracle.kpis.length; i += 1) {
        const id = oracle.kpis[i].id;
        eq(`${label} kpi ${id} value`, actual.kpis[i].value, oracle.kpis[i].value);
        eq(
          `${label} kpi ${id} comparison`,
          actual.kpis[i].comparison,
          oracle.kpis[i].comparison,
        );
        eq(`${label} kpi ${id} trend`, actual.kpis[i].trend, oracle.kpis[i].trend);
        eqNumbers(
          `${label} kpi ${id} sparkline`,
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
          `${label} cashHealth.${field}`,
          actual.cashHealth[field],
          oracle.cashHealth[field],
        );
      }

      // ---------------- funnel ----------------
      eqList(
        `${label} salesFunnel`,
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
          `${label} accountantSummary.${field}`,
          actual.accountantSummary[field],
          oracle.accountantSummary[field],
        );
      }

      eqList(
        `${label} invoiceAging`,
        actual.accountantSummary.invoiceAging,
        oracle.accountantSummary.invoiceAging,
        (b) => `${b.label}:${b.count}:${b.amount}`,
      );

      // paymentsByMethod has no ordering rule in the array path (Map insertion
      // order), so it is compared as a set.
      const methodKey = (m) => `${m.method}:${m.amount}:${m.count}`;
      eqList(
        `${label} paymentsByMethod (sorted)`,
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
        `${label} topCustomers`,
        actual.operationsSnapshot.topCustomers,
        oracle.operationsSnapshot.topCustomers,
        rowKey,
      );
      eqList(
        `${label} topServiceCategories`,
        actual.operationsSnapshot.topServiceCategories,
        oracle.operationsSnapshot.topServiceCategories,
        rowKey,
      );
      eqList(
        `${label} overdueInvoices`,
        actual.operationsSnapshot.overdueInvoices,
        oracle.operationsSnapshot.overdueInvoices,
        rowKey,
      );
      eqList(
        `${label} workCompleted`,
        actual.operationsSnapshot.workCompleted,
        oracle.operationsSnapshot.workCompleted,
        rowKey,
      );

      // ---------------- technicians ----------------
      eqList(
        `${label} technicianProfitability`,
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
          `${label} customerHealth.${field}`,
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
          `${label} leadPipeline.${field}`,
          actual.leadPipeline[field],
          oracle.leadPipeline[field],
        );
      }
      eqList(
        `${label} leadPipeline.sourcePerformance`,
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
            `${label} chart ${chartId}.${seriesEntry.key}`,
            seriesEntry.points.map((p) => p.value),
            expected?.points.map((p) => p.value),
          );
        }
        eqList(
          `${label} chart ${chartId} limitations`,
          aggregateCharts[chartId].limitations,
          oracleCharts[chartId].limitations,
          (line) => line,
        );
      }

      eqList(
        `${label} revenueTrend`,
        actual.revenueTrend,
        oracle.revenueTrend,
        (p) => `${p.label}:${p.value}`,
      );

      // ---------------- ledger sparklines ----------------
      for (const id of ["collected", "outstanding", "overdue", "net-income"]) {
        eqNumbers(
          `${label} ledger sparkline ${id}`,
          actual.accountantSummary.sparklines?.[id],
          oracle.accountantSummary.sparklines?.[id],
        );
      }

      // ---------------- limitations ----------------
      eqList(
        `${label} limitations`,
        actual.limitations,
        oracle.limitations,
        (line) => line,
      );
    }
    }

    // -------------------------------------------------------------------
    // The comparison above is only worth three runs if the calendars
    // disagree somewhere on this fixture. Same period, different counts.
    // -------------------------------------------------------------------
    console.log("\n=== the calendars are told apart ===\n");
    for (const zone of DAY_ZONES.filter((entry) => entry !== null)) {
      const pairs = DATE_RANGES.map((range) => ({
        old: JSON.parse(countedOn.get(`old|${range}`)),
        zoned: JSON.parse(countedOn.get(`${zone}|${range}`)),
      }));
      const samePeriod = pairs.filter(
        (pair) => JSON.stringify(pair.old.bounds) === JSON.stringify(pair.zoned.bounds),
      );
      if (samePeriod.length === 0) {
        console.log(
          `  NOTE  today differs between ${zone} and this machine right now, so the periods differ; the 90-day check and the first-of-month case below are the proof`,
        );
        continue;
      }
      check(
        `${zone} counts at least one range differently from UTC days over the same period`,
        samePeriod.some((pair) => JSON.stringify(pair.old) !== JSON.stringify(pair.zoned)),
        "every figure matched: this fixture has no timestamp near midnight, so it cannot tell the calendars apart",
      );
    }

    // -------------------------------------------------------------------
    // A caller that passes no zone gets exactly what it got before, and
    // 'UTC' and a zone the server does not know are the same thing.
    // -------------------------------------------------------------------
    console.log("\n=== a caller on UTC is unchanged ===\n");
    {
      const utcBounds = resolveProfitabilityReportDateBounds("90d");
      const utcPrev = resolvePreviousReportDateBounds(utcBounds);
      const base = {
        p_company_id: companyId,
        p_start_date: utcBounds.startDate,
        p_end_date: utcBounds.endDate,
      };
      const summaryBase = {
        ...base,
        p_prev_start_date: utcPrev.startDate,
        p_prev_end_date: utcPrev.endDate,
        p_today: utcBounds.endDate,
        p_follow_up_cutoff: new Date().toISOString(),
        p_limit: 5,
      };
      for (const [fn, callArgs] of [
        ["get_company_reports_summary", summaryBase],
        ["get_company_report_daily_series", base],
      ]) {
        const plain = await owner.rpc(fn, callArgs);
        const utc = await owner.rpc(fn, { ...callArgs, p_time_zone: "UTC" });
        const unknown = await owner.rpc(fn, {
          ...callArgs,
          p_time_zone: "Mars/Olympus",
        });
        const blank = await owner.rpc(fn, { ...callArgs, p_time_zone: "  " });
        const denver = await owner.rpc(fn, {
          ...callArgs,
          p_time_zone: "America/Denver",
        });
        if (plain.error) throw new Error(`${fn}: ${plain.error.message}`);
        const asText = (result) => JSON.stringify(result.data);
        check(
          `${fn}: no zone argument and 'UTC' give the same answer`,
          utc.error == null && asText(plain) === asText(utc),
          utc.error?.message ?? "",
        );
        check(
          `${fn}: a zone the server does not know counts UTC days instead of failing`,
          unknown.error == null && asText(plain) === asText(unknown),
          unknown.error?.message ?? "",
        );
        check(
          `${fn}: a blank zone counts UTC days`,
          blank.error == null && asText(plain) === asText(blank),
          blank.error?.message ?? "",
        );
        check(
          `${fn}: a real zone is accepted and moves this fixture's counts`,
          denver.error == null &&
            denver.data?.authorized === true &&
            asText(plain) !== asText(denver),
          denver.error?.message ??
            "Mountain time gave exactly the UTC answer over 90 days",
        );
      }
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
    // Migration 171. Gated on can_manage_billing rather than the reports
    // predicate, because the payment ledger is billing data -- so a technician
    // is refused here for a DIFFERENT reason than above, and that difference is
    // worth testing rather than assuming.
    const ledgerArgs = {
      p_company_id: companyId,
      p_start_date: null,
      p_end_date: null,
    };

    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    for (const [fn, callArgs] of [
      ["get_company_reports_summary", summaryArgs],
      ["get_company_report_daily_series", seriesArgs],
      ["get_company_payment_ledger_totals", ledgerArgs],
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

    // -------------------------------------------------------------------
    // The case migration 221 exists for, on a company that holds nothing
    // else: one job finished at 03:30 UTC on the first of this month. That
    // is the evening of the last day of LAST month in Denver and New York.
    // Read as that company's own owner.
    // -------------------------------------------------------------------
    console.log("\n=== 03:30 UTC on the first of the month ===\n");
    {
      const nowUtc = new Date();
      const year = nowUtc.getUTCFullYear();
      const month = nowUtc.getUTCMonth();
      const iso = (date) => date.toISOString().slice(0, 10);
      const firstOfMonth = new Date(Date.UTC(year, month, 1));
      const lastOfMonth = new Date(Date.UTC(year, month + 1, 0));
      const firstOfPrev = new Date(Date.UTC(year, month - 1, 1));
      const lastOfPrev = new Date(Date.UTC(year, month, 0));
      const finishedAt = new Date(Date.UTC(year, month, 1, 3, 30)).toISOString();

      const { data: proofCustomer, error: proofCustomerError } = await admin
        .from("customers")
        .insert({
          company_id: otherCompany.id,
          name: `[LOADTEST] Zone Proof ${suffix}`,
          status: "active",
        })
        .select("id")
        .single();
      if (proofCustomerError) {
        throw new Error(`proof customer: ${proofCustomerError.message}`);
      }
      const { error: proofJobError } = await admin.from("jobs").insert({
        company_id: otherCompany.id,
        customer_id: proofCustomer.id,
        job_number: `TZ-PROOF-${suffix}`,
        job_type: "Zone proof",
        status: "completed",
        scheduled_at: finishedAt,
        completed_at: finishedAt,
        description: "Finished at 03:30 UTC on the first of the month",
      });
      if (proofJobError) throw new Error(`proof job: ${proofJobError.message}`);

      const months = {
        before: [iso(firstOfPrev), iso(lastOfPrev)],
        current: [iso(firstOfMonth), iso(lastOfMonth)],
      };
      const readMonth = async (zone, [startDate, endDate]) => {
        const zoneArg = zone ? { p_time_zone: zone } : {};
        const summary = await outsider.rpc("get_company_reports_summary", {
          p_company_id: otherCompany.id,
          p_start_date: startDate,
          p_end_date: endDate,
          p_prev_start_date: startDate,
          p_prev_end_date: endDate,
          p_today: iso(nowUtc),
          p_follow_up_cutoff: nowUtc.toISOString(),
          p_limit: 5,
          ...zoneArg,
        });
        const series = await outsider.rpc("get_company_report_daily_series", {
          p_company_id: otherCompany.id,
          p_start_date: startDate,
          p_end_date: endDate,
          ...zoneArg,
        });
        if (summary.error) throw new Error(`proof summary: ${summary.error.message}`);
        if (series.error) throw new Error(`proof series: ${series.error.message}`);
        return {
          figure: Number(summary.data?.jobs?.completedInBounds ?? -1),
          categories: (summary.data?.serviceCategories ?? [])
            .map((row) => `${row.jobType}:${row.jobCount}`)
            .join(","),
          days: (series.data?.jobs ?? [])
            .filter((row) => Number(row.completed) > 0)
            .map((row) => `${row.d}:${row.completed}`)
            .join(","),
        };
      };

      for (const zone of ["America/Denver", "America/New_York"]) {
        const prev = await readMonth(zone, months.before);
        const current = await readMonth(zone, months.current);
        check(
          `${zone}: the figures count it in the month before`,
          prev.figure === 1 &&
            current.figure === 0 &&
            prev.categories === "Zone proof:1" &&
            current.categories === "",
          `before=${JSON.stringify(prev)} this=${JSON.stringify(current)}`,
        );
        check(
          `${zone}: the per-day series puts it on the last day of the month before`,
          prev.days === `${iso(lastOfPrev)}:1` && current.days === "",
          `before=${prev.days} this=${current.days}`,
        );
      }
      for (const zone of [null, "UTC"]) {
        const name = zone ?? "no zone argument";
        const prev = await readMonth(zone, months.before);
        const current = await readMonth(zone, months.current);
        check(
          `${name}: the figures count it this month, as before`,
          prev.figure === 0 && current.figure === 1,
          `before=${JSON.stringify(prev)} this=${JSON.stringify(current)}`,
        );
        check(
          `${name}: the per-day series puts it on the first, as before`,
          prev.days === "" && current.days === `${iso(firstOfMonth)}:1`,
          `before=${prev.days} this=${current.days}`,
        );
      }
    }
    for (const [fn, callArgs] of [
      ["get_company_reports_summary", summaryArgs],
      ["get_company_report_daily_series", seriesArgs],
      ["get_company_payment_ledger_totals", ledgerArgs],
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
      ["get_company_payment_ledger_totals", ledgerArgs],
    ]) {
      const { data, error } = await technician.rpc(fn, callArgs);
      check(
        `a technician in the same company is refused ${fn}`,
        error == null && data?.authorized === false,
        error ? `raised: ${error.message}` : `authorized=${data?.authorized}`,
      );
    }

    // The owner CAN read it, and the total must equal every payment row the
    // oracle read -- the figure the Sales hub prints as "All-time collected",
    // which used to be summed from the newest thousand.
    const { data: ledger, error: ledgerError } = await owner.rpc(
      "get_company_payment_ledger_totals",
      ledgerArgs,
    );
    const oracleTotal =
      Math.round(
        datasets.payments.reduce((sum, payment) => sum + payment.amount, 0) * 100,
      ) / 100;
    check(
      "the ledger total equals every payment row, to the cent",
      ledgerError == null &&
        Number(ledger?.count) === datasets.payments.length &&
        Math.round(Number(ledger?.total) * 100) / 100 === oracleTotal,
      ledgerError
        ? ledgerError.message
        : `rpc ${ledger?.count}/${ledger?.total} vs oracle ${datasets.payments.length}/${oracleTotal}`,
    );

  } finally {
    for (const userId of created) {
      await admin.from("company_memberships").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    if (isolationCompanyId) {
      // The zone-proof job and its customer, before the company they belong to.
      await admin.from("jobs").delete().eq("company_id", isolationCompanyId);
      await admin.from("customers").delete().eq("company_id", isolationCompanyId);
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
