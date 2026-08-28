/**
 * The shadow classifier decides whether a disagreement is expected or a bug.
 *
 * ===================== WHY THIS IS TESTED AT ALL =====================
 * The first version of shadow reporting could not fail this test, because it
 * did not classify anything — it emitted "these fields disagree" with a fixed
 * note saying the aggregate was right. That note was attached unconditionally,
 * so the three cases below all produced the same reassuring sentence:
 *
 *   a large tenant whose legacy numbers were truncated   (expected)
 *   a small tenant whose numbers disagree at all         (a defect)
 *   an RPC that failed and returned zeros                (a deployment fault)
 *
 * The third is the worst: a missing migration or a revoked EXECUTE produced
 * drift on every field, reported as evidence the new path was working.
 *
 * This asserts the classifier separates them, using the SAME functions the
 * application calls. It is a pure module, so no database is involved.
 *
 * Offline and side-effect free.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-shadow-report.mjs
 */

import {
  buildShadowReport,
  buildUnavailableReport,
  describeShadowVerdict,
  POSTGREST_ROW_CEILING,
} from "@/lib/database/services/dashboard-shadow-report";
import { compareDashboardAggregates } from "@/lib/database/services/dashboard-aggregate-fields";

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

/** A complete set of the ten fields, so the comparison sees real shapes. */
function fields(overrides = {}) {
  return {
    unpaidCount: 10,
    unpaidTotal: 1000,
    overdueCount: 4,
    overdueTotal: 400,
    unpaidInvoiceFollowUpCount: 2,
    unsentInvoiceCount: 3,
    unsentEstimateCount: 1,
    staleSentEstimateCount: 1,
    expenseSubmittedCount: 5,
    expenseSubmittedTotal: 250,
    ...overrides,
  };
}

const BIG = { invoices: 10_000, estimates: 6_000, expenses: 2_000 };
const SMALL = { invoices: 26, estimates: 34, expenses: 12 };

console.log("\nAgreement is reported as agreement, at both scales");
for (const [label, scale] of [["large tenant", BIG], ["small tenant", SMALL]]) {
  const report = buildShadowReport({
    drift: compareDashboardAggregates(fields(), fields()),
    scale,
  });
  check(`${label}: verdict is "agree"`, report.verdict === "agree");
  check(`${label}: no fields reported`, report.driftedFields.length === 0);
}

console.log("\nTruncation is only called truncation when it could have happened");
{
  // The legacy path reduced a subset, so every field is understated.
  const legacy = fields();
  const aggregate = fields({
    unpaidCount: 100,
    unpaidTotal: 10_000,
    overdueCount: 40,
    overdueTotal: 4_000,
  });
  const drift = compareDashboardAggregates(legacy, aggregate);

  const big = buildShadowReport({ drift, scale: BIG });
  check(
    "understated on a large tenant is truncation",
    big.verdict === "truncation",
    `got "${big.verdict}"`,
  );
  check(
    "and it names the tables above the ceiling",
    big.tablesAboveCeiling.includes("invoices") &&
      big.tablesAboveCeiling.includes("estimates"),
    JSON.stringify(big.tablesAboveCeiling),
  );

  // ============================== THE CASE THAT MATTERS FOR PRODUCTION ==============================
  // Identical drift, small tenant. The legacy path reduced the COMPLETE set, so
  // truncation cannot be the explanation and this must not be excused.
  const small = buildShadowReport({ drift, scale: SMALL });
  check(
    "the same drift on a small tenant is a DEFECT, not truncation",
    small.verdict === "defect",
    `got "${small.verdict}" — this is the production shape today, where the ` +
      `largest tenant has 26 invoices`,
  );
  check(
    "and the note says truncation cannot explain it",
    describeShadowVerdict(small).includes("truncation cannot be the explanation"),
    describeShadowVerdict(small),
  );
}

console.log("\nOverstatement is never truncation, however large the tenant");
{
  // A subset cannot total MORE than the whole.
  const legacy = fields({ unpaidTotal: 50_000 });
  const aggregate = fields({ unpaidTotal: 1_000 });
  const report = buildShadowReport({
    drift: compareDashboardAggregates(legacy, aggregate),
    scale: BIG,
  });
  check("verdict is defect", report.verdict === "defect", `got "${report.verdict}"`);
  check(
    "the direction is recorded as over",
    report.directions.unpaidTotal === "over",
    JSON.stringify(report.directions),
  );
  check(
    "the note says a subset cannot total more than the whole",
    describeShadowVerdict(report).includes("subset cannot total more than the whole"),
  );
}

console.log("\nMixed directions are a defect even on a large tenant");
{
  const legacy = fields({ unpaidCount: 5, overdueCount: 40 });
  const aggregate = fields({ unpaidCount: 500, overdueCount: 4 });
  const report = buildShadowReport({
    drift: compareDashboardAggregates(legacy, aggregate),
    scale: BIG,
  });
  check(
    "one understated and one overstated is a defect",
    report.verdict === "defect",
    `got "${report.verdict}"`,
  );
}

console.log("\nA failed RPC is never reported as drift");
{
  const report = buildUnavailableReport();
  check("verdict is unavailable", report.verdict === "unavailable");
  check("no fields are named", report.driftedFields.length === 0);
  check(
    "truncationPossible is not asserted from a failure",
    report.truncationPossible === false,
  );
  const note = describeShadowVerdict(report);
  check(
    "the note says explicitly that this is NOT drift",
    note.includes("NOT drift"),
    note,
  );
  check(
    "and it explains the zeros trap",
    note.includes("returns zeros on failure"),
    note,
  );
}

console.log("\nNo report carries a value");
{
  // The whole point of the rewrite: three of the ten fields are money.
  const legacy = fields({ unpaidTotal: 123_456.78 });
  const aggregate = fields({ unpaidTotal: 987_654.32 });
  const report = buildShadowReport({
    drift: compareDashboardAggregates(legacy, aggregate),
    scale: BIG,
  });
  const serialized = JSON.stringify(report);

  check(
    "the legacy figure does not appear anywhere in the report",
    !serialized.includes("123456") && !serialized.includes("123,456"),
    serialized,
  );
  check(
    "nor does the aggregate figure",
    !serialized.includes("987654") && !serialized.includes("987,654"),
    serialized,
  );
  check(
    "nor the difference",
    !serialized.includes("864197"),
    serialized,
  );
  check(
    "the magnitude is a bucket, not a ratio",
    typeof report.magnitude === "string" &&
      ["none", "under-1pct", "1-10pct", "10-50pct", "over-50pct"].includes(
        report.magnitude,
      ),
    String(report.magnitude),
  );
}

console.log("\nThe ceiling is the real one");
check(
  `POSTGREST_ROW_CEILING is ${POSTGREST_ROW_CEILING}`,
  POSTGREST_ROW_CEILING === 1000,
);
{
  // Exactly at the ceiling is NOT above it: PostgREST returns 1,000 rows and a
  // tenant with exactly 1,000 has not lost any.
  const drift = compareDashboardAggregates(
    fields(),
    fields({ unpaidCount: 99 }),
  );
  const atCeiling = buildShadowReport({
    drift,
    scale: { invoices: 1000, estimates: 0, expenses: 0 },
  });
  check(
    "a tenant with exactly 1,000 rows cannot have truncated",
    atCeiling.verdict === "defect",
    `got "${atCeiling.verdict}"`,
  );

  const aboveCeiling = buildShadowReport({
    drift,
    scale: { invoices: 1001, estimates: 0, expenses: 0 },
  });
  check(
    "one row above the ceiling can",
    aboveCeiling.verdict === "truncation",
    `got "${aboveCeiling.verdict}"`,
  );
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} shadow report checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
