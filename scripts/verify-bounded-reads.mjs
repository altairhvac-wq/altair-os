/**
 * High-volume company reads must be bounded, or say why they are not (Phase 4 / P2).
 *
 * ===================== WHAT THIS EXISTS TO STOP =====================
 * PostgREST caps a response at 1,000 rows. It reports the truncation in a
 * Content-Range header, supabase-js does not surface it, and nothing in this
 * application reads it. So an unbounded select against a table that grows with
 * the tenant does not fail, does not warn, and does not look wrong in review:
 *
 *     const { data } = await supabase
 *       .from("invoices")
 *       .select("*")
 *       .eq("company_id", companyId);
 *
 * On a tenant with 10,000 invoices that returns 1,000 of them, ordered newest
 * first, and every total, count and average computed from it is quietly wrong by
 * an amount nobody can see. Measured on the seeded tenant, the dashboard
 * understated unpaid A/R by 90.1% and overdue by 92.3% this way.
 *
 * Paging the lists fixed the lists. This is what stops the next one being added.
 *
 * ===================== WHAT COUNTS AS BOUNDED =====================
 * Any of these, on the same chain:
 *
 *   .limit(n)              an explicit ceiling
 *   .range(a, b)           a window — including a deliberate range-walk loop
 *   .single() / .maybeSingle()
 *   head: true             a count, which returns no rows at all
 *   .eq("id", ...)         one row by primary key
 *
 * ===================== THE ESCAPE HATCH, AND WHY IT NEEDS A REASON =====================
 * Some reads genuinely must see everything: a cron sweep, an export, an
 * aggregate that is walked to completion in pages. Those are allowed, and they
 * are allowed EXPLICITLY:
 *
 *     // unbounded-ok: <reason>
 *
 * on the line above, or anywhere in the ten lines before, the .from(...) call.
 * The reason is mandatory and is printed by this script, so the set of
 * deliberately-unbounded reads stays a list someone chose rather than a
 * category that grew.
 *
 * ===================== WHICH TABLES =====================
 * Only tables that grow with a tenant's HISTORY. A company has one row in
 * `companies`, a handful in `company_memberships`, and a few dozen service
 * items; reading those whole is fine forever. It has an unbounded number of
 * invoices.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-bounded-reads.mjs
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
 * Tables whose row count is a function of how long a company has been trading.
 * If a table is added here it must either be bounded at every read site or be
 * given a reason at each one.
 */
const HIGH_VOLUME_TABLES = new Set([
  "customers",
  "jobs",
  "invoices",
  "estimates",
  "expenses",
  "leads",
  "invoice_payments",
  "invoice_line_items",
  "estimate_line_items",
  "job_line_items",
  "job_attachments",
  "job_activities",
  "lead_activities",
  "estimate_activities",
  "invoice_activities",
  "expense_activities",
  "time_entries",
  "notifications",
  "company_files",
  "payment_attempts",
  "ai_usage_events",
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
 * The body of the top-level function a line sits in.
 *
 * ===================== WHY THE FUNCTION AND NOT THE CHAIN =====================
 * The obvious implementation reads forward from `.from(` to the end of the
 * expression. It does not work here, because this codebase builds queries in
 * stages:
 *
 *     let query = supabase.from("leads").select(...).eq("company_id", id);
 *     if (cursor) query = query.or(buildKeysetFilter(...));
 *     return query.order(...).limit(pageSize + 1);
 *
 * The .limit() is three statements away from the .from(). A chain-scoped scan
 * calls that unbounded, and a verifier that reports fifty false alarms is a
 * verifier somebody switches off — which is worse than not having one.
 *
 * So the unit is the enclosing top-level function. This is deliberately crude in
 * the SAFE direction: a function containing one bounded and one unbounded read
 * passes. That trade is made knowingly. The purpose here is to stop a whole
 * unbounded READ PATH being added, which is what actually happened and what
 * actually hurt; catching every last line is a job for review.
 */
function extractFunctionBody(lines, index) {
  let start = 0;
  for (let i = index; i >= 0; i -= 1) {
    if (/^(export )?(async )?function |^(export )?const [A-Za-z_$]+ = /.test(lines[i])) {
      start = i;
      break;
    }
  }

  let end = lines.length;
  for (let i = index + 1; i < lines.length; i += 1) {
    if (/^(export )?(async )?function |^(export )?const [A-Za-z_$]+ = /.test(lines[i])) {
      end = i;
      break;
    }
  }

  // A reason written above the NEXT function must not bleed backwards into this
  // one, so the body stops before that function's comment block, not at its
  // declaration. Caught by getTodayTimeEntriesForTechnician inheriting the
  // reason belonging to listTodayTimeEntriesForCompany below it.
  while (end > index + 1 && /^\s*(\/\/|\/\*|\*)/.test(lines[end - 1])) {
    end -= 1;
  }

  // Twelve lines of headroom above the declaration, so a `// unbounded-ok:`
  // written where a reader would naturally write it — above the function, not
  // buried next to the .from() — is actually found.
  return lines.slice(Math.max(0, start - 12), end).join("\n");
}

/**
 * A filter that pins the read to ONE parent record — and only where that parent
 * genuinely bounds the child count.
 *
 * `invoice_line_items` is in the high-volume list because a tenant accumulates
 * an unbounded number of them. A read of the line items belonging to ONE invoice
 * is not unbounded in any sense that matters: it is bounded by that invoice, and
 * an invoice with a thousand lines is a different problem.
 *
 * That reasoning does NOT extend to every foreign key, and this list used to
 * pretend it did. `customer_id`, `user_id` and `technician_id` name a parent
 * that accumulates children for the whole life of the tenant: a long-standing
 * customer has thousands of invoices, a technician has thousands of time
 * entries. Those reads truncate at 1,000 exactly like a company-wide one.
 *
 * It cost a real defect. countCustomerInvoicePayments read every invoice id for
 * a customer with `.eq("customer_id", …)` and no limit, then carefully CHUNKED
 * the payment count over that already-truncated list — the chunking was there
 * because the author knew a customer can exceed one `.in()` filter, which is
 * the same knowledge that should have paged the read above it. Past a thousand
 * invoices the dependency count came back quietly low.
 */
const ONE_RECORD_SCOPES = [
  // Children of one document. Bounded by that document.
  /\.eq\(\s*["'](job_id|invoice_id|estimate_id|lead_id|expense_id|entity_id)["']/,
  // An .in() over ids resolved elsewhere is bounded by that list, and the list
  // itself is bounded by whatever produced it — chunked-in.ts caps the chunk.
  /\.in\(\s*["'](id|job_id|invoice_id|estimate_id|lead_id|expense_id|customer_id)["']/,
];

/**
 * Foreign keys that name a parent whose children grow without bound.
 *
 * Filtering by one of these is NOT a bound. A read scoped this way still needs
 * .limit()/.range(), an aggregate, or an explicit `unbounded-ok:` reason.
 */
const HIGH_CARDINALITY_PARENTS =
  /\.eq\(\s*["'](customer_id|user_id|technician_id|assigned_technician_id|created_by)["']/;

const BOUND_MARKERS = [
  /\.limit\(/,
  /\.range\(/,
  /\.single\(\)/,
  /\.maybeSingle\(\)/,
  /head:\s*true/,
  /\.eq\(\s*["']id["']/,
  // A chunked helper is bounded by construction — see chunked-in.ts.
  /selectInChunks|countInChunks/,
];

const files = [...walk("app"), ...walk("lib"), ...walk("shared")];

const violations = [];
const allowed = [];
let inspected = 0;

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/\.from\(\s*["'`]([a-z_]+)["'`]\s*\)/);
    if (!match) continue;
    const table = match[1];
    if (!HIGH_VOLUME_TABLES.has(table)) continue;

    const chain = extractFunctionBody(lines, i);

    // Writes are not reads. An update or delete with a company filter is a
    // different question and a different verifier.
    if (/\.(insert|update|upsert|delete)\(/.test(chain)) continue;
    if (!/\.select\(/.test(chain)) continue;

    inspected += 1;

    // The reason may sit above the .from(), or above the function that
    // contains it — a whole read path is usually explained once, at the top.
    const context = lines.slice(Math.max(0, i - 10), i + 1).join("\n") + "\n" + chain;
    const reason = context.match(/unbounded-ok:\s*(.+)/);
    const bounded =
      BOUND_MARKERS.some((marker) => marker.test(chain)) ||
      ONE_RECORD_SCOPES.some((marker) => marker.test(chain));

    // Recorded so the report can say WHY a read is a violation: "filtered by a
    // parent that grows" reads very differently from "filtered by nothing".
    const highCardinalityOnly =
      !bounded && HIGH_CARDINALITY_PARENTS.test(chain);

    if (reason) {
      allowed.push({ file, line: i + 1, table, reason: reason[1].trim() });
      continue;
    }
    if (bounded) continue;

    violations.push({ file, line: i + 1, table, highCardinalityOnly });
  }
}

console.log(
  `\nHigh-volume company reads are bounded or explained ` +
    `(${inspected} reads across ${HIGH_VOLUME_TABLES.size} tables)`,
);

check(
  "no unbounded read of a table that grows with the tenant",
  violations.length === 0,
  violations
    .map(
      (v) =>
        `        ${v.file}:${v.line}  ${v.table}` +
        (v.highCardinalityOnly
          ? "  — filtered by a parent whose children grow with the tenant, " +
            "which is not a bound"
          : ""),
    )
    .join("\n") +
    (violations.length
      ? "\n\n        Add .limit()/.range(), or a `// unbounded-ok: <reason>` line above it."
      : ""),
);

// Two very different things wear the same marker, and blurring them is how a
// debt list turns into a category. A reason tagged [debt] means "this is still
// wrong and here is what would fix it"; an untagged one means "this is bounded
// by something real". They are printed apart, and the debt is counted, so the
// number has to go down deliberately rather than drift up unnoticed.
const debt = allowed.filter((entry) => entry.reason.startsWith("[debt]"));
const safe = allowed.filter((entry) => !entry.reason.startsWith("[debt]"));

console.log(`\nBounded by something real (${safe.length})`);
if (safe.length === 0) {
  console.log("  (none)");
} else {
  for (const entry of safe) {
    console.log(`  ${entry.table.padEnd(20)} ${entry.file}:${entry.line}`);
    console.log(`    ${entry.reason}`);
  }
}

console.log(
  `\nKNOWN DEBT — still unbounded, tracked rather than assumed away (${debt.length})`,
);
if (debt.length === 0) {
  console.log("  (none)");
} else {
  for (const entry of debt) {
    console.log(`  ${entry.table.padEnd(20)} ${entry.file}:${entry.line}`);
    console.log(`    ${entry.reason.replace(/^\[debt\]\s*/, "")}`);
  }
  console.log(
    "\n  Every one of these reduces a whole-tenant read into a figure a person\n" +
      "  acts on. They are listed, not fixed. Moving them into SQL is the Phase 5\n" +
      "  reports-and-dashboard work.",
  );
}

/**
 * The debt is allowed to exist and is NOT allowed to grow.
 *
 * A passing run of this file has been read as "reads are scale-safe", which it
 * has never meant: it means every unbounded read is either bounded, explained,
 * or on the list below. Without a ceiling the list can absorb a new whole-book
 * read at any time and the check still says PASS.
 *
 * Lower it when one is fixed. Raising it is a decision someone has to write
 * down, which is the point.
 */
const DEBT_CEILING = 12;

check(
  `no NEW unbounded read joins the debt list (${debt.length}/${DEBT_CEILING})`,
  debt.length <= DEBT_CEILING,
  `the tracked debt grew to ${debt.length}. Fix the read, or raise ` +
    `DEBT_CEILING deliberately and say why.`,
);

check(
  "every deliberately-unbounded read states a reason",
  allowed.every((entry) => entry.reason.length > 10),
  allowed
    .filter((entry) => entry.reason.length <= 10)
    .map((entry) => `        ${entry.file}:${entry.line} — reason too short to be one`)
    .join("\n"),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} bounded-read checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
