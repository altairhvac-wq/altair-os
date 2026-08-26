/**
 * Document numbering: regression verification for the COUNT(*) defect.
 *
 * ===================== WHAT WENT WRONG =====================
 * Job, invoice, estimate and expense numbers were a fixed base plus COUNT(*)
 * of the company's rows, against a UNIQUE (company_id, <number>) constraint.
 * Hard-deleting any row that was not the highest numbered one lowered the
 * count, so the next number collided with a row that still existed — and
 * because the formula is deterministic it collided again on every retry.
 * Document creation stayed broken permanently.
 *
 * ===================== WHY THIS IS STATIC + MODELLED =====================
 * The only Supabase project this checkout is linked to is hosted and may be
 * production, so this script must never connect to it. It therefore proves the
 * fix in two complementary halves, and says which is which:
 *
 *   PART A — static assertions on migration 148 and on the four query modules.
 *            Does the shipped SQL actually implement a monotonic counter, is
 *            it seeded from max() rather than count(), is the old formula
 *            really gone from every code path?
 *
 *   PART B — a reference model of the allocator's semantics, exercised against
 *            the exact scenarios the defect requires: create, hard delete,
 *            create again, and concurrent allocation. Part A is what ties the
 *            model to the real SQL.
 *
 * A live end-to-end check against a scratch project is scripted in
 * docs/development/backup-and-restore-runbook.md and is not run from here.
 *
 * Run: node scripts/verify-document-numbering.mjs
 */
import { readFileSync } from "node:fs";

const MIGRATION = "supabase/migrations/148_document_number_sequences.sql";
const HARDENING_MIGRATION =
  "supabase/migrations/149_document_number_allocator_hardening.sql";

const QUERY_MODULES = {
  jobs: "lib/database/queries/jobs.ts",
  invoices: "lib/database/queries/invoices.ts",
  estimates: "lib/database/queries/estimates.ts",
  expenses: "lib/database/queries/expenses.ts",
};

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

/** Comments stripped so no check can be satisfied by prose. */
function loadSql(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .toLowerCase();
}

/** Line comments and block comments stripped, for the same reason. */
/** Line comments first — see the note in scripts/verify-perimeter.mjs. */
function loadTs(path) {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

// ===========================================================================
// PART A1 — the migration implements a monotonic, atomic, delete-proof counter
// ===========================================================================

const sql = loadSql(MIGRATION);

console.log("\nPART A1 — migration 148 structure");

check(
  "creates the per-company counter table",
  /create\s+table\s+if\s+not\s+exists\s+public\.company_document_counters/.test(
    sql,
  ),
);

check(
  "counter is keyed by (company_id, document_type)",
  /primary\s+key\s*\(\s*company_id\s*,\s*document_type\s*\)/.test(sql),
);

check(
  "counter is company-scoped with a cascading FK",
  /company_id\s+uuid\s+not\s+null\s+references\s+public\.companies\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/.test(
    sql,
  ),
);

check(
  "counter table has RLS enabled",
  /alter\s+table\s+public\.company_document_counters\s+enable\s+row\s+level\s+security/.test(
    sql,
  ),
);

check(
  "authenticated and anon cannot touch counters directly",
  /revoke\s+all\s+on\s+table\s+public\.company_document_counters\s+from\s+anon/.test(
    sql,
  ) &&
    /revoke\s+all\s+on\s+table\s+public\.company_document_counters\s+from\s+authenticated/.test(
      sql,
    ),
);

check(
  "allocation is a single atomic upsert (not select-then-update)",
  /insert\s+into\s+public\.company_document_counters[\s\S]*?on\s+conflict\s*\(\s*company_id\s*,\s*document_type\s*\)\s*do\s+update[\s\S]*?returning/.test(
    sql,
  ),
);

check(
  "the conflict branch increments — the counter only ever moves forward",
  /do\s+update\s*\n?\s*set\s+next_value\s*=\s*c\.next_value\s*\+\s*1/.test(sql),
);

check(
  "no statement anywhere decrements a counter",
  !/next_value\s*=\s*[^;]*-\s*1/.test(sql),
);

check(
  "the seed comes from max(), never count()",
  /max\s*\(\s*\(\s*regexp_match/.test(sql) &&
    !/count\s*\(\s*\*\s*\)/.test(sql),
);

check(
  "seed patterns are anchored, so DEMO and job-linked child numbers are excluded",
  /\^job-\[0-9\]\+\$/.test(sql) &&
    /\^est-\[0-9\]\+\$/.test(sql) &&
    /\^inv-\[0-9\]\+\$/.test(sql) &&
    /\^exp-\[0-9\]\+\$/.test(sql),
);

check(
  "historical bases are preserved (job 1049, estimate/invoice 1050, expense 1013)",
  /when\s+'job'\s+then\s+1049/.test(sql) &&
    /when\s+'estimate'\s+then\s+1050/.test(sql) &&
    /when\s+'invoice'\s+then\s+1050/.test(sql) &&
    /when\s+'expense'\s+then\s+1013/.test(sql),
);

check(
  "the allocator is SECURITY DEFINER with a pinned search_path",
  /create\s+or\s+replace\s+function\s+public\.allocate_company_document_number[\s\S]*?security\s+definer[\s\S]*?set\s+search_path\s*=\s*public,\s*pg_temp/.test(
    sql,
  ),
);

check(
  "the allocator requires active company membership for an authenticated caller",
  /if\s+v_user_id\s+is\s+not\s+null\s+then[\s\S]*?is_active_company_member\s*\(\s*p_company_id\s*\)[\s\S]*?insufficient_permission/.test(
    sql,
  ),
);

check(
  "the allocator checks a document-type-appropriate permission",
  /can_dispatch_jobs\s*\(\s*p_company_id\s*\)/.test(sql) &&
    /can_manage_billing\s*\(\s*p_company_id\s*\)/.test(sql),
);

check(
  "the allocator rejects an unknown document type",
  /document_type_invalid/.test(sql),
);

check(
  "the counter table constrains document_type to the four known kinds",
  /check\s*\(\s*document_type\s+in\s*\(\s*'job'\s*,\s*'estimate'\s*,\s*'invoice'\s*,\s*'expense'\s*\)\s*\)/.test(
    sql,
  ),
);

check(
  "generate_expense_number no longer computes a count-based number",
  /create\s+or\s+replace\s+function\s+public\.generate_expense_number[\s\S]*?allocate_company_document_number/.test(
    sql,
  ) && !/1013\s*\+\s*coalesce/.test(sql),
);

check(
  "migration is non-destructive — no DROP or DELETE against customer data",
  !/\bdrop\s+table\b/.test(sql) &&
    !/\bdelete\s+from\b/.test(sql) &&
    !/\bupdate\s+public\.(jobs|invoices|estimates|expenses)\b/.test(sql),
);

check(
  "migration DDL is idempotent (safe to re-run)",
  /create\s+table\s+if\s+not\s+exists/.test(sql) &&
    !/create\s+table\s+public\./.test(sql),
);

// ===========================================================================
// PART A2 — the COUNT(*) formula is gone from every application path
// ===========================================================================

// ===========================================================================
// PART A1b — migration 149 closes two allocator authorization defects
// ===========================================================================
//
// Both were introduced by 148 and found in the post-Phase-3 adversarial review:
//
//   P1  max_existing_document_number is SECURITY DEFINER, performs no
//       membership check, and 148 granted EXECUTE on it to `authenticated` —
//       so any signed-in user could read any company's highest document
//       number. The company UUIDs needed are handed out by the Community
//       directory (listVisibleNetworkProfiles), so this was reachable.
//
//   P2  the estimate/invoice branch accepted can_dispatch_jobs, which is
//       wider than the RLS INSERT policy on public.invoices and wider than
//       every application path. A dispatcher could burn invoice numbers.

console.log("\nPART A1b — migration 149 allocator hardening");

const sql149 = loadSql(HARDENING_MIGRATION);

check(
  "149 revokes EXECUTE on the RLS-bypassing seed helper from authenticated",
  /revoke\s+execute\s+on\s+function\s+public\.max_existing_document_number\s*\(\s*uuid\s*,\s*text\s*\)\s*from\s+authenticated/.test(
    sql149,
  ),
);

check(
  "149 revokes EXECUTE on document_number_base from authenticated",
  /revoke\s+execute\s+on\s+function\s+public\.document_number_base\s*\(\s*text\s*\)\s*from\s+authenticated/.test(
    sql149,
  ),
);

check(
  "149 does not re-grant the seed helper to authenticated",
  !/grant\s+execute\s+on\s+function\s+public\.max_existing_document_number[^;]*authenticated/.test(
    sql149,
  ),
);

check(
  "149 narrows the estimate/invoice branch to can_manage_billing alone",
  /if not public\.can_manage_billing\(p_company_id\) then/.test(sql149) &&
    !/can_manage_billing\(p_company_id\)\s*or public\.can_dispatch_jobs\(p_company_id\)/.test(
      sql149,
    ),
);

check(
  "149 leaves the job/expense branch accepting dispatchers and billing managers",
  /if p_document_type in \('job', 'expense'\) then[\s\S]{0,400}?can_dispatch_jobs\(p_company_id\)[\s\S]{0,200}?can_manage_billing\(p_company_id\)/.test(
    sql149,
  ),
);

check(
  "149 keeps the allocator callable by authenticated",
  /grant\s+execute\s+on\s+function\s+public\.allocate_company_document_number[\s\S]{0,80}?authenticated/.test(
    sql149,
  ),
);

check(
  "149 still requires active company membership for an authenticated caller",
  /is_active_company_member\s*\(\s*p_company_id\s*\)[\s\S]{0,140}?insufficient_permission/.test(
    sql149,
  ),
);

check(
  "149 preserves the atomic upsert and the monotonic increment",
  /on\s+conflict\s*\(\s*company_id\s*,\s*document_type\s*\)\s*do\s+update[\s\S]{0,140}?next_value\s*=\s*c\.next_value\s*\+\s*1/.test(
    sql149,
  ),
);

check(
  "149 touches no customer data and creates no table",
  !/\bdrop\s+table\b/.test(sql149) &&
    !/\bdelete\s+from\b/.test(sql149) &&
    !/\bupdate\s+public\.(jobs|invoices|estimates|expenses)\b/.test(sql149) &&
    !/\bcreate\s+table\b/.test(sql149),
);

check(
  "the seed helper is reachable only through the allocator, never from app code",
  !/max_existing_document_number/.test(
    loadTs("lib/database/queries/document-numbers.ts"),
  ),
);

console.log("\nPART A2 — application code no longer derives numbers from counts");

const BROKEN_FORMULAS = [
  [/`JOB-\$\{\s*1049\s*\+/, "jobs", "JOB-${1049 + count}"],
  [/`INV-\$\{\s*1050\s*\+/, "invoices", "INV-${1050 + count}"],
  [/`EST-\$\{\s*1050\s*\+/, "estimates", "EST-${1050 + count}"],
  [/`EXP-\$\{\s*1013\s*\+/, "expenses", "EXP-${1013 + count}"],
];

const sources = Object.fromEntries(
  Object.entries(QUERY_MODULES).map(([key, path]) => [key, loadTs(path)]),
);

for (const [pattern, moduleKey, label] of BROKEN_FORMULAS) {
  check(`${moduleKey}: the ${label} formula is gone`, !pattern.test(sources[moduleKey]));
}

for (const [moduleKey, source] of Object.entries(sources)) {
  check(
    `${moduleKey}: allocates through allocateDocumentNumber`,
    /allocateDocumentNumber\s*\(/.test(source),
  );
}

check(
  "no generator falls back to a Date.now()-derived number",
  !Object.values(sources).some((source) =>
    /`(JOB|INV|EST|EXP)-\$\{Date\.now\(\)\}`/.test(source),
  ),
);

check(
  "no generator still counts rows to build a number",
  !Object.values(sources).some((source) =>
    /count:\s*"exact",\s*head:\s*true[\s\S]{0,400}?`(JOB|INV|EST|EXP)-/.test(source),
  ),
);

const allocator = loadTs("lib/database/queries/document-numbers.ts");

check(
  "the allocator throws rather than returning a fabricated fallback",
  /throw\s+new\s+DocumentNumberAllocationError/.test(allocator) &&
    !/Date\.now\(\)/.test(allocator),
);

check(
  "the allocator rejects a non-integer RPC result instead of formatting NaN",
  /Number\.isSafeInteger/.test(allocator),
);

for (const [moduleKey, source] of Object.entries(sources)) {
  check(
    `${moduleKey}: an allocation failure surfaces as an action error`,
    /Could not assign an? \w+ number\. Please try again\./.test(source),
  );
}

// The job-linked child scheme is a DIFFERENT allocator and must keep its retry.
check(
  "invoices keep the retry loop the job-linked child scheme still needs",
  /DOCUMENT_NUMBER_INSERT_RETRIES/.test(sources.invoices) &&
    /generateJobLinkedInvoiceNumberValue/.test(sources.invoices),
);
check(
  "estimates keep the retry loop the job-linked child scheme still needs",
  /DOCUMENT_NUMBER_INSERT_RETRIES/.test(sources.estimates) &&
    /generateJobLinkedEstimateNumberValue/.test(sources.estimates),
);

// ===========================================================================
// PART B — behavioural model of the allocator
// ===========================================================================
//
// Mirrors migration 148 exactly:
//   * seed  = greatest(base, max(existing numeric suffix) + 1), computed once
//   * alloc = return next_value, then next_value += 1
//   * nothing ever lowers next_value
//
// PART A1 is what makes this model trustworthy: it asserts the SQL has those
// three properties and no others that would contradict them.

console.log("\nPART B — allocator behaviour under delete and concurrency");

const BASES = { job: 1049, estimate: 1050, invoice: 1050, expense: 1013 };
const PREFIX = { job: "JOB", estimate: "EST", invoice: "INV", expense: "EXP" };

function createCompany(documentType) {
  return {
    documentType,
    counter: null,
    /** Rows that exist right now, as formatted numbers. */
    rows: new Set(),
    /** Every number ever handed out, to prove none is reused. */
    everAllocated: [],
  };
}

function seedFrom(company) {
  const prefix = PREFIX[company.documentType];
  const anchored = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;
  for (const row of company.rows) {
    const match = row.match(anchored);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return Math.max(BASES[company.documentType], max + 1);
}

function allocate(company) {
  if (company.counter === null) company.counter = seedFrom(company);
  const value = company.counter;
  company.counter += 1;
  const formatted = `${PREFIX[company.documentType]}-${value}`;
  company.everAllocated.push(formatted);
  return formatted;
}

function createRecord(company) {
  const number = allocate(company);
  if (company.rows.has(number)) {
    throw new Error(`COLLISION: ${number} already exists`);
  }
  company.rows.add(number);
  return number;
}

function hardDelete(company, number) {
  company.rows.delete(number);
}

// --- the exact scenario the defect required -------------------------------
for (const documentType of Object.keys(BASES)) {
  const company = createCompany(documentType);

  const created = [
    createRecord(company),
    createRecord(company),
    createRecord(company),
    createRecord(company),
    createRecord(company),
  ];

  check(
    `${documentType}: first number keeps the historical base (${PREFIX[documentType]}-${BASES[documentType]})`,
    created[0] === `${PREFIX[documentType]}-${BASES[documentType]}`,
  );

  // Delete a MIDDLE record — the case that permanently broke the old scheme.
  const victim = created[2];
  hardDelete(company, victim);

  let afterDelete = null;
  let threw = null;
  try {
    afterDelete = createRecord(company);
  } catch (error) {
    threw = error;
  }

  check(
    `${documentType}: create after a hard delete does not collide`,
    threw === null,
  );
  check(
    `${documentType}: the deleted number is not reused`,
    afterDelete !== victim && !company.everAllocated.slice(0, -1).includes(afterDelete),
  );
  check(
    `${documentType}: numbering continues past the highest ever issued`,
    afterDelete === `${PREFIX[documentType]}-${BASES[documentType] + 5}`,
  );

  // Delete every record and create again — count() would restart at the base.
  for (const number of [...company.rows]) hardDelete(company, number);
  const afterWipe = createRecord(company);
  check(
    `${documentType}: emptying the table does not rewind the counter`,
    afterWipe === `${PREFIX[documentType]}-${BASES[documentType] + 6}`,
  );
}

// --- concurrency ----------------------------------------------------------
{
  const company = createCompany("invoice");
  // The upsert serializes concurrent allocators on the counter row, so N
  // simultaneous callers observe N distinct values.
  const concurrent = Array.from({ length: 250 }, () => allocate(company));
  check(
    "250 concurrent allocations return 250 distinct numbers",
    new Set(concurrent).size === concurrent.length,
  );
  check(
    "concurrent allocations are contiguous and ascending",
    concurrent.every(
      (value, index) =>
        value === `INV-${BASES.invoice + index}`,
    ),
  );
}

// --- seeding an existing company -----------------------------------------
{
  const company = createCompany("invoice");
  // A company that has been running on the old scheme, plus demo rows and a
  // job-linked child that must NOT influence the seed.
  company.rows = new Set([
    "INV-1050",
    "INV-1051",
    "INV-1052",
    "INV-DEMO-3011",
    "INV-1049-01",
    "INV-9999999-02",
  ]);

  const next = createRecord(company);
  check(
    "an existing company seeds from its highest standalone number, not its row count",
    next === "INV-1053",
  );

  const company2 = createCompany("invoice");
  company2.rows = new Set(["INV-DEMO-3011", "INV-1049-01"]);
  check(
    "demo and job-linked numbers alone leave the base untouched",
    createRecord(company2) === "INV-1050",
  );
}

// --- a gap is acceptable, a duplicate is not ------------------------------
{
  const company = createCompany("job");
  const first = allocate(company); // allocated, then the insert "fails"
  const second = createRecord(company);
  check(
    "a burned number leaves a gap rather than being handed out twice",
    first === "JOB-1049" && second === "JOB-1050",
  );
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} document numbering checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
