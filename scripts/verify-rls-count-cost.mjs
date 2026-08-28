/**
 * Exact counts on high-volume tables must not run under RLS (Phase 5C).
 *
 * ===================== THE INVARIANT THIS ENCODES =====================
 * An exact count makes PostgreSQL evaluate the SELECT policy once per row it
 * counts. On the scale-seeded tenant a single such count was measured at
 * 1.4-2.3 seconds against 139-177 ms with the policy bypassed.
 *
 * That is expensive on its own and much worse in aggregate, because these
 * queries do not fail politely — they hold connections. The dashboard's
 * onboarding snapshot and demo-data status issued TWENTY-TWO of them
 * concurrently, and the effect landed on everything else on the page:
 *
 *   getDashboardData     15,356 ms
 *   onboardingSnapshot   16,452 ms
 *   demoDataStatus       16,752 ms
 *
 * An RPC measured at 606 ms in isolation took 4,805 ms while they ran. Three
 * separate rounds of removing whole-book reads from the dashboard moved the
 * number by nothing, because this was the bottleneck the whole time and it did
 * not appear anywhere in the dashboard's own call graph.
 *
 * Moving those counts to the service-role client took the page from 16,842 ms
 * to 5,433 ms.
 *
 * ===================== WHY A VERIFIER AND NOT A NOTE =====================
 * Nothing about `.select("id", { count: "exact", head: true })` looks expensive.
 * It reads as the cheapest possible query — no rows come back. The cost is
 * invisible at the call site, invisible in review, and invisible in the call
 * graph of the page that ends up paying for it. It was added to twenty-two call
 * sites for exactly that reason.
 *
 * ===================== WHAT COUNTS AS SAFE =====================
 * A count on a high-volume table must either:
 *
 *   - run on the service-role client, with the caller's own authorization
 *     established above it (the pattern in getExpenseQueueCounts,
 *     getCustomerQueueCounts, getCustomerDashboardLists), or
 *   - be narrowed to one parent record, where the policy runs over a handful of
 *     rows and the cost does not scale, or
 *   - carry `// rls-count-ok: <reason>`.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-rls-count-cost.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `\n${detail}` : ""}`);
  }
}

/**
 * Tables where the policy is non-trivial AND the row count grows with the
 * tenant. A count on `companies` evaluates one row; a count on `invoices`
 * evaluates ten thousand.
 */
const HIGH_VOLUME_TABLES = new Set([
  "customers",
  "jobs",
  "invoices",
  "estimates",
  "expenses",
  "leads",
  "invoice_payments",
  "job_activities",
  "lead_activities",
  "estimate_activities",
  "invoice_activities",
  "expense_activities",
  "time_entries",
  "job_materials",
  "notifications",
  "company_files",
]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(full, out);
    } else if (entry.endsWith(".ts") || entry.endsWith(".tsx")) {
      out.push(full.replace(/\\/g, "/"));
    }
  }
  return out;
}

/**
 * The enclosing top-level function — the same unit verify-bounded-reads uses,
 * and for the same reason: the client is chosen several statements above the
 * count, and a chain-scoped scan cannot see it.
 */
function enclosingFunction(lines, index) {
  const isDecl = (line) =>
    /^(export )?(async )?function |^(export )?const [A-Za-z_$]+ = /.test(line);

  let start = 0;
  for (let i = index; i >= 0; i -= 1) {
    if (isDecl(lines[i])) {
      start = i;
      break;
    }
  }
  let end = lines.length;
  for (let i = index + 1; i < lines.length; i += 1) {
    if (isDecl(lines[i])) {
      end = i;
      break;
    }
  }
  while (end > index + 1 && /^\s*(\/\/|\/\*|\*)/.test(lines[end - 1])) end -= 1;

  return lines.slice(Math.max(0, start - 12), end).join("\n");
}

/** Pins the count to one parent record, so the policy runs over few rows. */
const PARENT_SCOPES = [
  /\.eq\(\s*["'](id|job_id|invoice_id|estimate_id|lead_id|expense_id|customer_id|entity_id|user_id|technician_id)["']/,
  /\.in\(\s*["'](id|job_id|invoice_id|estimate_id|lead_id|expense_id|customer_id)["']/,
];

const files = [...walk("app"), ...walk("lib")];
const violations = [];
const allowed = [];
let inspected = 0;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/);
    if (!match) continue;
    if (!HIGH_VOLUME_TABLES.has(match[1])) continue;

    const body = enclosingFunction(lines, i);

    // Only exact counts. A head:true with planned:true or estimated is a
    // different query with a different cost.
    if (!/count:\s*["']exact["']/.test(body)) continue;

    inspected += 1;

    const reason = body.match(/rls-count-ok:\s*(.+)/);
    if (reason) {
      allowed.push({ file, line: i + 1, table: match[1], reason: reason[1].trim() });
      continue;
    }

    // Deliberately matched without the call parentheses. A helper that RECEIVES
    // its client cannot be judged by where the client was made — but a
    // parameter typed `ReturnType<typeof createServiceRoleClient>` cannot be
    // handed an RLS-scoped one, so the type is the proof. activeLeadCountQuery
    // is exactly that shape.
    const bypassesRls = /createServiceRoleClient/.test(body);
    const parentScoped = PARENT_SCOPES.some((pattern) => pattern.test(body));

    if (!bypassesRls && !parentScoped) {
      violations.push({ file, line: i + 1, table: match[1] });
    }
  }
}

console.log(
  `\nExact counts on high-volume tables do not run under RLS ` +
    `(${inspected} counting functions across ${HIGH_VOLUME_TABLES.size} tables)`,
);

check(
  "no exact count on a growing table evaluates the policy per row",
  violations.length === 0,
  violations.map((v) => `        ${v.file}:${v.line}  ${v.table}`).join("\n") +
    (violations.length
      ? "\n\n        Use the service-role client with the caller's own authorization\n" +
        "        established above it, narrow the count to one parent record, or\n" +
        "        add `// rls-count-ok: <reason>`."
      : ""),
);

console.log("\nCounts that stay under RLS, and why");
if (allowed.length === 0) {
  console.log("  (none)");
} else {
  for (const entry of allowed) {
    console.log(`  ${entry.table.padEnd(20)} ${entry.file}:${entry.line}`);
    console.log(`    ${entry.reason}`);
  }
}

check(
  "every count kept under RLS states a reason",
  allowed.every((entry) => entry.reason.length > 10),
  allowed
    .filter((entry) => entry.reason.length <= 10)
    .map((entry) => `        ${entry.file}:${entry.line} — reason too short`)
    .join("\n"),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} RLS count-cost checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
