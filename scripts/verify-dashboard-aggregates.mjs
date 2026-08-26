/**
 * Dashboard aggregate verification (Phase 4 / P1-1).
 *
 * ===================== WHAT IS BEING PROVED, AND WHAT IS NOT =====================
 * Migration 151 moves dashboard counts and money totals from "load every row and
 * reduce in Node" to "compute in SQL". The risk that matters is not performance,
 * it is a wrong number on the financial screen — an aggregate that disagrees
 * with what a user can page through is worse than a slow page.
 *
 * A true end-to-end equality proof needs a database with real rows, which this
 * checkout does not have (see the blocker in the Phase 4 handoff). So this
 * script proves the two things it actually can, and is explicit that they are
 * not the same as the end-to-end run:
 *
 *   PART A — DRIFT DETECTION. The thresholds and status sets are read out of the
 *            TypeScript source at verify time and asserted against the SQL. If
 *            someone changes UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS from 7 to
 *            10 and forgets the migration, this fails. That is the failure mode
 *            most likely to actually happen.
 *
 *   PART B — SEMANTIC DIFFERENTIAL. Both predicates are transcribed into JS —
 *            one following the TypeScript, one following the SQL — and run over
 *            thousands of generated rows including the boundary cases. This
 *            catches an off-by-one on a day threshold or an inverted filter,
 *            which reading the two side by side does not.
 *
 *   PART C — AUTHORIZATION. Migration 148 shipped two authorization defects that
 *            migration 149 had to fix. These assertions exist so 151 cannot
 *            repeat either of them.
 *
 * NOT PROVED HERE: that the SQL, executed by Postgres against real data,
 * produces the same numbers as the current TypeScript. That requires the seeded
 * scratch tenant, and it is the gate for switching the feature flag on.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-dashboard-aggregates.mjs
 */
import { readFileSync } from "node:fs";

const MIGRATION = "supabase/migrations/151_dashboard_aggregate_rpcs.sql";
const QUERY_MODULE = "lib/database/queries/dashboard-aggregates.ts";

let failures = 0;
let checks = 0;

function check(name, condition) {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}`);
  }
}

/** Line comments first — see the note in scripts/verify-perimeter.mjs. */
function loadTs(path) {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

function loadSql(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .toLowerCase();
}

const sql = loadSql(MIGRATION);

// ===========================================================================
// PART A — the SQL has not drifted from the TypeScript it transcribes
// ===========================================================================

console.log("\nPART A — thresholds and status sets read from the TypeScript source");

const followUpSource = loadTs("shared/lib/unpaid-invoice-follow-up.ts");
const recoverySource = loadTs("shared/lib/estimate-recovery.ts");
const invoiceTypes = loadTs("shared/types/invoice.ts");

function extractNumber(source, name) {
  const match = source.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractStatusSet(source, name) {
  const match = source.match(
    new RegExp(`${name}[^=]*=\\s*new Set<[^>]*>\\(\\s*\\[([^\\]]*)\\]`),
  );
  if (!match) return null;
  return match[1]
    .split(",")
    .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

const followUpDays = extractNumber(
  followUpSource,
  "UNPAID_INVOICE_FOLLOW_UP_THRESHOLD_DAYS",
);
const recoveryDays = extractNumber(
  recoverySource,
  "ESTIMATE_RECOVERY_THRESHOLD_DAYS",
);
const sentUnpaidStatuses = extractStatusSet(followUpSource, "SENT_UNPAID_STATUSES");
const inactiveInvoiceStatuses = extractStatusSet(
  invoiceTypes,
  "INACTIVE_INVOICE_STATUSES",
);

check("the follow-up threshold was readable from the TypeScript", followUpDays !== null);
check("the recovery threshold was readable from the TypeScript", recoveryDays !== null);
check("SENT_UNPAID_STATUSES was readable from the TypeScript", Array.isArray(sentUnpaidStatuses));
check(
  "INACTIVE_INVOICE_STATUSES was readable from the TypeScript",
  Array.isArray(inactiveInvoiceStatuses),
);

if (followUpDays !== null) {
  check(
    `the SQL follow-up threshold matches the TypeScript (${followUpDays})`,
    new RegExp(`v_follow_up_days\\s+constant\\s+integer\\s*:=\\s*${followUpDays}\\b`).test(sql),
  );
}
if (recoveryDays !== null) {
  check(
    `the SQL recovery threshold matches the TypeScript (${recoveryDays})`,
    new RegExp(`v_recovery_days\\s+constant\\s+integer\\s*:=\\s*${recoveryDays}\\b`).test(sql),
  );
}

if (sentUnpaidStatuses) {
  check(
    `the SQL follow-up status list matches SENT_UNPAID_STATUSES (${sentUnpaidStatuses.join(", ")})`,
    sentUnpaidStatuses.every((status) =>
      new RegExp(`'${status}'::public\\.invoice_status`).test(sql),
    ) &&
      // and nothing extra: the IN list must contain exactly these two
      (sql.match(/status in \(\s*'sent'::public\.invoice_status,\s*'partially_paid'::public\.invoice_status\s*\)/s) !==
        null),
  );
}

// 'cancelled' is in the TS inactive set but is NOT a member of the
// public.invoice_status enum, so that arm of the TS check is dead code and the
// SQL cannot reference it. Assert the reasoning is written down rather than
// letting a future reader think it was forgotten.
check(
  "the SQL excludes 'void' for the active-invoice predicate",
  /status\s*<>\s*'void'::public\.invoice_status/.test(sql),
);
check(
  "the migration explains why 'cancelled' is not enumerated in SQL",
  /cancelled/.test(readFileSync(MIGRATION, "utf8")) &&
    /not.{0,40}member of public\.invoice_status/is.test(readFileSync(MIGRATION, "utf8")),
);

// ===========================================================================
// PART B — semantic differential over generated rows
// ===========================================================================

console.log("\nPART B — TypeScript and SQL semantics agree over generated rows");

const DAY_MS = 86_400_000;

/** Transcription of the TypeScript predicates. */
const tsModel = {
  isActive: (row) => row.status !== "void" && row.status !== "cancelled",
  hasUnpaidBalance: (row) =>
    tsModel.isActive(row) && row.status !== "paid" && row.balanceDue > 0,
  daysSince: (iso, reference) =>
    Math.max(0, Math.floor((reference.getTime() - new Date(iso).getTime()) / DAY_MS)),
  awaitingFollowUp: (row, reference) => {
    if (!tsModel.isActive(row) || !tsModel.hasUnpaidBalance(row)) return false;
    if (row.status === "overdue" || row.status === "draft") return false;
    if (!(sentUnpaidStatuses ?? ["sent", "partially_paid"]).includes(row.status)) return false;
    const ref = row.sentAt ?? row.issuedAt ?? row.createdAt;
    if (!ref) return false;
    return tsModel.daysSince(ref, reference) >= (followUpDays ?? 7);
  },
  estimateAwaitingRecovery: (row, reference) => {
    if (row.status !== "sent") return false;
    if (!row.sentAt) return false;
    return tsModel.daysSince(row.sentAt, reference) >= (recoveryDays ?? 7);
  },
};

/** Transcription of the SQL predicates in migration 151. */
const sqlModel = {
  isActive: (row) => row.status !== "void",
  hasUnpaidBalance: (row) =>
    row.status !== "void" && row.status !== "paid" && row.balanceDue > 0,
  floorDays: (iso, reference) =>
    Math.floor((reference.getTime() - new Date(iso).getTime()) / 1000 / 86400),
  awaitingFollowUp: (row, reference) => {
    if (!["sent", "partially_paid"].includes(row.status)) return false;
    if (!(row.balanceDue > 0)) return false;
    const ref = row.sentAt ?? row.issuedAt ?? row.createdAt;
    if (!ref) return false;
    return sqlModel.floorDays(ref, reference) >= (followUpDays ?? 7);
  },
  estimateAwaitingRecovery: (row, reference) => {
    if (row.status !== "sent") return false;
    if (!row.sentAt) return false;
    return sqlModel.floorDays(row.sentAt, reference) >= (recoveryDays ?? 7);
  },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const INVOICE_STATUSES = [
  "draft", "sent", "viewed", "partially_paid", "paid", "overdue", "void",
];
const ESTIMATE_STATUSES = [
  "draft", "sent", "approved", "declined", "expired", "converted",
];

const reference = new Date("2026-08-26T12:00:00.000Z");
const rnd = mulberry32(4242);

function generateInvoices(count) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const status = INVOICE_STATUSES[Math.floor(rnd() * INVOICE_STATUSES.length)];
    // Boundary-heavy: cluster ages tightly around the threshold so an
    // off-by-one is caught rather than averaged away.
    const daysOld =
      i % 5 === 0
        ? (followUpDays ?? 7) - 1
        : i % 5 === 1
          ? followUpDays ?? 7
          : i % 5 === 2
            ? (followUpDays ?? 7) + 1
            : Math.floor(rnd() * 400);
    const created = new Date(reference.getTime() - daysOld * DAY_MS).toISOString();
    const hasSentAt = rnd() < 0.6;
    const hasIssued = rnd() < 0.8;
    rows.push({
      status,
      balanceDue: rnd() < 0.25 ? 0 : Math.round(rnd() * 500000) / 100,
      sentAt: hasSentAt ? created : null,
      issuedAt: hasIssued ? created : null,
      createdAt: created,
    });
  }
  return rows;
}

function generateEstimates(count) {
  const rows = [];
  for (let i = 0; i < count; i += 1) {
    const status = ESTIMATE_STATUSES[Math.floor(rnd() * ESTIMATE_STATUSES.length)];
    const daysOld =
      i % 4 === 0
        ? (recoveryDays ?? 7) - 1
        : i % 4 === 1
          ? recoveryDays ?? 7
          : Math.floor(rnd() * 300);
    rows.push({
      status,
      sentAt: rnd() < 0.75
        ? new Date(reference.getTime() - daysOld * DAY_MS).toISOString()
        : null,
    });
  }
  return rows;
}

const invoiceRows = generateInvoices(8000);
const estimateRows = generateEstimates(4000);

function countBy(rows, predicate) {
  return rows.reduce((sum, row) => sum + (predicate(row) ? 1 : 0), 0);
}

// --- active / unpaid ------------------------------------------------------
{
  const tsActive = countBy(invoiceRows, tsModel.isActive);
  const sqlActive = countBy(invoiceRows, sqlModel.isActive);
  check(
    `active-invoice predicate agrees over ${invoiceRows.length} rows (${tsActive})`,
    tsActive === sqlActive,
  );

  const tsUnpaid = countBy(invoiceRows, tsModel.hasUnpaidBalance);
  const sqlUnpaid = countBy(invoiceRows, sqlModel.hasUnpaidBalance);
  check(
    `unpaid-balance predicate agrees (${tsUnpaid})`,
    tsUnpaid === sqlUnpaid,
  );
}

// --- follow-up ------------------------------------------------------------
{
  const tsCount = countBy(invoiceRows, (row) => tsModel.awaitingFollowUp(row, reference));
  const sqlCount = countBy(invoiceRows, (row) => sqlModel.awaitingFollowUp(row, reference));
  check(
    `unpaid follow-up predicate agrees (${tsCount})`,
    tsCount === sqlCount,
  );
  check("the follow-up set is non-trivial (the test would pass vacuously otherwise)", tsCount > 50);

  // Explicit boundary rows, in case generation ever stops covering them.
  const atThreshold = {
    status: "sent",
    balanceDue: 100,
    sentAt: new Date(reference.getTime() - (followUpDays ?? 7) * DAY_MS).toISOString(),
    issuedAt: null,
    createdAt: null,
  };
  const justUnder = {
    ...atThreshold,
    sentAt: new Date(
      reference.getTime() - ((followUpDays ?? 7) * DAY_MS - 1000),
    ).toISOString(),
  };
  check(
    "exactly at the threshold counts in both models",
    tsModel.awaitingFollowUp(atThreshold, reference) === true &&
      sqlModel.awaitingFollowUp(atThreshold, reference) === true,
  );
  check(
    "one second under the threshold counts in neither model",
    tsModel.awaitingFollowUp(justUnder, reference) === false &&
      sqlModel.awaitingFollowUp(justUnder, reference) === false,
  );
}

// --- sent_at / issued_at / created_at fallback ----------------------------
{
  const fallbackRows = invoiceRows.filter((row) => !row.sentAt && row.issuedAt);
  const tsCount = countBy(fallbackRows, (row) => tsModel.awaitingFollowUp(row, reference));
  const sqlCount = countBy(fallbackRows, (row) => sqlModel.awaitingFollowUp(row, reference));
  check(
    `the coalesce(sent_at, issued_at, created_at) fallback agrees (${fallbackRows.length} rows)`,
    tsCount === sqlCount,
  );
}

// --- estimate recovery ----------------------------------------------------
{
  const tsCount = countBy(estimateRows, (row) =>
    tsModel.estimateAwaitingRecovery(row, reference),
  );
  const sqlCount = countBy(estimateRows, (row) =>
    sqlModel.estimateAwaitingRecovery(row, reference),
  );
  check(`stale-sent estimate predicate agrees (${tsCount})`, tsCount === sqlCount);
  check("the stale-sent set is non-trivial", tsCount > 20);
}

// --- money totals ---------------------------------------------------------
{
  const tsUnpaidTotal = invoiceRows
    .filter(tsModel.hasUnpaidBalance)
    .reduce((sum, row) => sum + row.balanceDue, 0);
  const sqlUnpaidTotal = invoiceRows
    .filter(sqlModel.hasUnpaidBalance)
    .reduce((sum, row) => sum + row.balanceDue, 0);
  check(
    "unpaid money total agrees to the cent",
    Math.round(tsUnpaidTotal * 100) === Math.round(sqlUnpaidTotal * 100),
  );
}

// ===========================================================================
// PART C — authorization, so 151 cannot repeat the 148 mistakes
// ===========================================================================

console.log("\nPART C — authorization (the migration-148 lesson)");

check(
  "the RPC is SECURITY DEFINER with a pinned search_path",
  /security definer[\s\S]{0,120}?set search_path\s*=\s*public,\s*pg_temp/.test(sql),
);

check(
  "the RPC requires active company membership",
  /is_active_company_member\s*\(\s*p_company_id\s*\)[\s\S]{0,120}?insufficient_permission/.test(sql),
);

check(
  "billing sections are gated on can_manage_billing, matching canViewBilling",
  /v_can_billing\s*:=\s*public\.can_manage_billing\(p_company_id\)/.test(sql),
);

check(
  "expense sections are gated on manage_billing OR dispatch, matching canViewCompanyExpenses",
  /v_can_expenses\s*:=[\s\S]{0,120}?can_manage_billing\(p_company_id\)[\s\S]{0,60}?or\s+public\.can_dispatch_jobs\(p_company_id\)/.test(sql),
);

check(
  "an unauthenticated actor gets zeros rather than a bypass",
  /if v_user_id is null then[\s\S]{0,300}?return jsonb_build_object/.test(sql),
);

check(
  "the RPC is read-only — no insert, update or delete",
  !/\binsert\s+into\b/.test(sql) &&
    !/\bupdate\s+public\./.test(sql) &&
    !/\bdelete\s+from\b/.test(sql),
);

check(
  "no new helper function is granted to authenticated (the 148 leak shape)",
  (sql.match(/grant execute on function/g) ?? []).length === 1 &&
    /grant execute on function public\.get_company_dashboard_aggregates/.test(sql),
);

check(
  "the migration creates no table and alters no policy",
  !/\bcreate table\b/.test(sql) &&
    !/\bcreate policy\b/.test(sql) &&
    !/\bdrop policy\b/.test(sql),
);

// ===========================================================================
// PART D — exactness and rollout posture
// ===========================================================================

console.log("\nPART D — exactness and rollout");

check(
  "every value comes from count(*) or sum(...) FILTER, never a truncated list",
  /count\(\*\) filter/.test(sql) &&
    /sum\([a-z_.]+\) filter/.test(sql) &&
    !/limit\s+\d+/.test(sql),
);

const queryModule = loadTs(QUERY_MODULE);

check(
  "the aggregate path is opt-in and defaults to off",
  /=== "on"/.test(queryModule) &&
    /ALTAIR_DASHBOARD_AGGREGATES/.test(queryModule),
);

check(
  "a shadow-compare mode exists for the equality run",
  /isDashboardAggregatesShadowCompareEnabled/.test(queryModule) &&
    /=== "shadow"/.test(queryModule),
);

check(
  "the reader coerces PostgREST numerics defensively",
  /function toNumber/.test(queryModule) && /Number\.parseFloat/.test(queryModule),
);

check(
  "an RPC failure degrades to zeros rather than throwing the page down",
  /return EMPTY_DASHBOARD_AGGREGATES;/.test(queryModule),
);

check(
  "customers and leads are documented as deliberately excluded",
  /validateCustomerFormData/.test(readFileSync(MIGRATION, "utf8")) &&
    /lead pipeline metrics/i.test(readFileSync(MIGRATION, "utf8")),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} dashboard aggregate checks passed (${checks} total).`,
);
console.log(
  "\n  NOT proved here: that Postgres executing this SQL against real rows returns\n" +
    "  the same numbers as the current TypeScript. That needs the seeded scratch\n" +
    "  tenant and is the gate for setting ALTAIR_DASHBOARD_AGGREGATES=on.\n",
);
if (failures > 0) process.exit(1);
