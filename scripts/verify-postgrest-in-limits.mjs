/**
 * PostgREST `.in()` request-size guard (Phase 4 / P1-13).
 *
 * ===================== THE BUG THIS PREVENTS =====================
 * PostgREST puts `.in()` values in the query string. Past roughly 395 uuids
 * (measured: 395 succeeds, 396 fails) the request line is too large and the
 * request is rejected before it reaches Postgres.
 *
 * Every call site that hit this degraded quietly — an empty Map, a skipped bulk
 * update, a summary reading zero — so the page still rendered and the numbers
 * were simply wrong. Worse, it is invisible on a small tenant: it appears only
 * once a customer has a few hundred rows, and then it appears on every request.
 * One instance meant no invoice was ever marked overdue for a large company.
 *
 * The fix is lib/database/queries/chunked-in.ts. The risk is that the NEXT
 * `.in()` someone writes reintroduces it, in a codebase where nothing about
 * writing it looks wrong and no test at development scale can fail.
 *
 * ===================== WHAT COUNTS AS SAFE =====================
 * An `.in()` argument is safe when its size cannot grow with tenant data:
 *
 *   1. an inline array literal      .in("status", ["sent", "paid"])
 *   2. a spread of one             .in("type", [...options.types])
 *   3. a module-level CONST list   .in("role", LEAD_MANAGER_ROLES)
 *   4. the `chunk` parameter       — i.e. already inside selectInChunks
 *
 * Anything else is a variable whose length follows a row count, and is flagged.
 * A genuinely bounded case that does not fit those shapes can be added to
 * ALLOWED below WITH a reason — the point is that it becomes a decision someone
 * writes down, not an omission.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-postgrest-in-limits.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["lib", "app", "shared"];

/**
 * Bounded arguments that are not array literals or SCREAMING_CASE constants.
 * Each needs a reason that explains why its length cannot follow a row count.
 */
const ALLOWED = new Map([
  [
    "lib/marketing/store.ts:options.statuses",
    "A caller-supplied subset of the marketing post status enum — bounded by the enum, not by rows.",
  ],
]);

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

/** Block comments first, then line comments — see verify-perimeter.mjs. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

const SAFE_ARGUMENT = [
  /^\[/, // inline array literal, including [...spread]
  /^chunk$/, // the selectInChunks / countInChunks callback parameter
  /^[A-Z][A-Z0-9_]*$/, // a module-level SCREAMING_CASE constant list
];

const files = ROOTS.flatMap((root) => walk(root));
const offenders = [];

for (const file of files) {
  const source = stripComments(readFileSync(file, "utf8"));
  // .in("column", <argument>)  — argument runs to the matching close paren on
  // the same line, which covers every call shape in this codebase.
  for (const match of source.matchAll(/\.in\(\s*"([a-z_]+)"\s*,\s*([^;\n]+?)\)\s*[,;.\n]/g)) {
    const argument = match[2].trim();
    if (SAFE_ARGUMENT.some((pattern) => pattern.test(argument))) continue;

    const key = `${file.replace(/\\/g, "/")}:${argument}`;
    if (ALLOWED.has(key)) continue;

    offenders.push({ file: file.replace(/\\/g, "/"), column: match[1], argument });
  }
}

console.log("\nEvery .in() argument is bounded or chunked");

check(
  "no .in() filter is passed an unbounded, unchunked array",
  offenders.length === 0,
  offenders
    .map(
      (o) =>
        `${o.file}  .in("${o.column}", ${o.argument})\n        ` +
        `wrap it with selectInChunks/countInChunks from lib/database/queries/chunked-in.ts,\n        ` +
        `or add it to ALLOWED in this script with a reason it cannot grow.`,
    )
    .join("\n        "),
);

// The helper itself has to keep its margin, or the guard is pointing at
// something that no longer protects anything.
const helper = readFileSync("lib/database/queries/chunked-in.ts", "utf8");
const declared = helper.match(/POSTGREST_IN_CHUNK_SIZE = (\d+)/);

check("the helper declares a chunk size", Boolean(declared));
check(
  "the chunk size keeps real margin under the measured 396 limit",
  declared && Number.parseInt(declared[1], 10) <= 300,
  declared ? `declared ${declared[1]}; the measured cliff is 396` : "",
);
check(
  "the measured limit is recorded, so the margin can be re-judged later",
  /395/.test(helper) && /396/.test(helper),
);
check(
  "both a row helper and a count helper exist",
  /export async function selectInChunks/.test(helper) &&
    /export async function countInChunks/.test(helper),
);
check(
  "the count helper refuses to return a partial total",
  /count: firstError \? 0 : total/.test(helper),
);

// ---------------------------------------------------------------------------
// The other half of the same ceiling: the response row cap.
// ---------------------------------------------------------------------------
console.log("\nThe 1000-row response ceiling is at least detectable");

const rowCap = readFileSync("lib/database/queries/row-cap.ts", "utf8");

check(
  "the ceiling is recorded as a named constant",
  /POSTGREST_ROW_CEILING = 1000/.test(rowCap),
);
check(
  "detection reports through the operations monitoring seam",
  /captureMonitoredEvent/.test(rowCap) && /postgrest\.row_cap_reached/.test(rowCap),
);
check(
  "detection costs no extra query",
  // Comments stripped first: the module explains at length WHY it avoids an
  // exact count, and matching that prose would fail the check it is describing.
  !/count:\s*"exact"/.test(stripComments(rowCap)),
  "an exact count would add a scan to every list render",
);
check(
  "the module is explicit that this DETECTS rather than fixes",
  /does NOT fix/i.test(rowCap) && /pagination/i.test(rowCap),
);

// The four company-wide lists a real tenant crosses first.
for (const [file, label] of [
  ["lib/database/queries/customers.ts", "listCustomers"],
  ["lib/database/queries/invoices.ts", "listInvoices"],
  ["lib/database/queries/estimates.ts", "listEstimates"],
  ["lib/database/queries/jobs.ts", "listJobs"],
]) {
  const source = readFileSync(file, "utf8");
  check(
    `${label} reports when it comes back at the ceiling`,
    /reportIfRowCapped/.test(source) && source.includes(`query: "${label}"`),
  );
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} PostgREST .in() checks passed (${checks} total).`,
);
console.log(
  "\n  NOT fixed here: the lists themselves are still truncated at 1000 rows.\n" +
    "  Detection only makes that visible. The fix is pagination.\n",
);
if (failures > 0) process.exit(1);
