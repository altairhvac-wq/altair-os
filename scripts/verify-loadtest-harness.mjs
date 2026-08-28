/**
 * Load-test harness verification.
 *
 * ===================== WHY THIS IS IN THE GATE =====================
 * scripts/loadtest-seed.mjs holds a service-role key and writes thousands of
 * rows. Its safety rests entirely on four guards, and guards rot silently: a
 * refactor that "simplifies" credential reading, or a helpful default added to
 * --confirm, would disarm it without failing anything. This asserts the guards
 * still exist and still refuse, so disarming one breaks CI instead of breaking
 * a database.
 *
 * It also runs the seeder's own --dry-run, which exercises the generator with
 * no credentials and no network, and checks the properties a benchmark depends
 * on: determinism, unique ids, and a status mix that actually populates the
 * dashboard's attention queues.
 *
 * Offline and side-effect free. It never sets the load-test credential
 * variables, so the seeder it invokes cannot reach any project.
 *
 * Run: node scripts/verify-loadtest-harness.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const SEEDER = "scripts/loadtest-seed.mjs";
const BENCHMARK = "scripts/loadtest-benchmark.mjs";

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

/**
 * Strips comments so no check can be satisfied by prose.
 *
 * Block comments are removed FIRST and as whole units. An earlier version also
 * dropped every line beginning with `*`, which deleted the closing `* /` of each
 * docblock — leaving the block-comment regex unterminated so it swallowed real
 * code up to the next docblock. That produced a failing check against a file
 * that was correct. Strip whole blocks, then line comments, and nothing else.
 */
function loadJs(path) {
  return readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

/**
 * Runs the seeder with a controlled environment.
 *
 * The load-test credential variables are explicitly deleted rather than merely
 * omitted, so this cannot inherit a real key from the developer's shell and
 * accidentally connect while "testing the guards".
 */
function runSeeder(args, extraEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  delete env.ALTAIR_LOADTEST_SUPABASE_URL;
  delete env.ALTAIR_LOADTEST_SERVICE_ROLE_KEY;
  Object.assign(env, extraEnv);

  const result = spawnSync(process.execPath, [SEEDER, ...args], {
    encoding: "utf8",
    env,
  });
  return {
    status: result.status,
    out: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

// ---------------------------------------------------------------- existence
console.log("\nHarness exists");

check("the seeder exists", existsSync(SEEDER));
check("the benchmark exists", existsSync(BENCHMARK));
check(
  "usage is documented",
  existsSync("docs/development/load-testing.md"),
);

const seeder = loadJs(SEEDER);
const benchmark = loadJs(BENCHMARK);

// ---------------------------------------------------------------- guard 1
console.log("\nGuard 1 — dedicated credentials only");

check(
  "the seeder reads only the load-test credential variables",
  /ALTAIR_LOADTEST_SUPABASE_URL/.test(seeder) &&
    /ALTAIR_LOADTEST_SERVICE_ROLE_KEY/.test(seeder),
);

check(
  "the seeder never reads the application's own Supabase credentials",
  !/process\.env\.NEXT_PUBLIC_SUPABASE_URL/.test(seeder) &&
    !/process\.env\.SUPABASE_SERVICE_ROLE_KEY/.test(seeder) &&
    !/process\.env\[\s*["']SUPABASE_SERVICE_ROLE_KEY["']\s*\]/.test(seeder),
);

check(
  "the seeder does not load .env.local into the environment",
  !/dotenv|config\(\)/.test(seeder),
);

{
  const { status, out } = runSeeder(["--confirm", "anything"]);
  check("running with no credentials refuses", status !== 0);
  check(
    "the refusal explains why the app's own credentials are not used",
    /does NOT read NEXT_PUBLIC_SUPABASE_URL/.test(out),
  );
}

// ---------------------------------------------------------------- guard 2
console.log("\nGuard 2 — refuses the application's own project");

check(
  "the seeder compares the target against .env.local",
  /readEnvLocalSupabaseUrl/.test(seeder) && /appUrl === url/.test(seeder),
);

// Only meaningful when a .env.local exists in this checkout.
if (existsSync(".env.local")) {
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  const appUrl = line
    ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
    : "";
  if (appUrl) {
    const ref = new URL(appUrl).host.split(".")[0];
    const { status, out } = runSeeder(["--confirm", ref], {
      ALTAIR_LOADTEST_SUPABASE_URL: appUrl,
      ALTAIR_LOADTEST_SERVICE_ROLE_KEY: "not-a-real-key",
    });
    check("pointing the seeder at the app's own project refuses", status !== 0);
    check(
      "the refusal names the collision with .env.local",
      /SAME project as NEXT_PUBLIC_SUPABASE_URL/.test(out),
    );
  }
} else {
  console.log("  (no .env.local in this checkout — collision test skipped)");
}

// ---------------------------------------------------------------- guard 3
console.log("\nGuard 3 — explicit project-ref confirmation");

{
  const env = {
    ALTAIR_LOADTEST_SUPABASE_URL: "https://scratchref000.supabase.co",
    ALTAIR_LOADTEST_SERVICE_ROLE_KEY: "not-a-real-key",
  };

  const missing = runSeeder([], env);
  check("omitting --confirm refuses", missing.status !== 0);
  check(
    "the refusal tells the operator the exact ref to confirm",
    /--confirm scratchref000/.test(missing.out),
  );

  const wrong = runSeeder(["--confirm", "someotherref"], env);
  check("a mismatched --confirm refuses", wrong.status !== 0);
  check(
    "the refusal names both the supplied and the actual ref",
    /someotherref/.test(wrong.out) && /scratchref000/.test(wrong.out),
  );

  check(
    "--confirm has no default value",
    !/args\.confirm\s*\?\?\s*["']/.test(seeder),
  );
}

// ---------------------------------------------------------------- guard 4
console.log("\nGuard 4 — containment");

check(
  "every seeded row is scoped to a company the seeder creates",
  /company_id: companyId/.test(seeder) &&
    !/company_id: args\./.test(seeder),
);

check(
  "the seeder refuses to write into a pre-existing company",
  !/--company-id|args\["company-id"\]/.test(seeder),
);

check(
  "clean matches BOTH the load-test name prefix and slug prefix",
  /\.like\("slug", `\$\{COMPANY_SLUG_PREFIX\}%`\)[\s\S]{0,200}?\.like\("name", `\$\{COMPANY_NAME_PREFIX\}%`\)/.test(
    seeder,
  ),
);

check(
  "clean deletes children explicitly rather than relying on cascade",
  /CLEAN_ORDER/.test(seeder) &&
    /invoice_line_items/.test(seeder) &&
    /customers/.test(seeder),
);

/**
 * Parses CLEAN_ORDER rather than comparing raw string offsets.
 *
 * The previous form searched for the literal `"customers",\n  "company_..."`,
 * which silently stopped matching the moment the file was written with CRLF
 * line endings -- and then reported a deletion-order defect that did not exist.
 * A check that fails for a reason unrelated to what it is checking is worse
 * than no check. This one is line-ending agnostic and asserts the order of the
 * actual array.
 */
const cleanOrder = (() => {
  const match = seeder.match(/const CLEAN_ORDER = \[([\s\S]*?)\];/);
  if (!match) return [];
  return [...match[1].matchAll(/"([a-z_]+)"/g)].map((entry) => entry[1]);
})();

check(
  "CLEAN_ORDER is parseable",
  cleanOrder.length > 5,
  `parsed ${cleanOrder.length} entries`,
);

check(
  "clean removes invoices before customers (customer_id is ON DELETE RESTRICT)",
  cleanOrder.indexOf("invoices") >= 0 &&
    cleanOrder.indexOf("customers") >= 0 &&
    cleanOrder.indexOf("invoices") < cleanOrder.indexOf("customers"),
  `order: ${cleanOrder.join(" -> ")}`,
);

check(
  "clean removes jobs before customers (jobs.customer_id is ON DELETE RESTRICT too)",
  cleanOrder.indexOf("jobs") >= 0 &&
    cleanOrder.indexOf("jobs") < cleanOrder.indexOf("customers"),
  `order: ${cleanOrder.join(" -> ")}`,
);

check(
  "clean removes the subscription row the seeder inserts",
  cleanOrder.includes("company_subscriptions"),
  "the seeder inserts company_subscriptions so the tenant is reachable at all; " +
    "leaving it behind blocks the company delete",
);

check(
  "status never lists other companies, only counts them",
  /other \(non-load-test\) companies present/.test(seeder) &&
    /never reads, updates, or deletes any of them/.test(seeder),
);

// ---------------------------------------------------------------- no side effects
console.log("\nNo external side effects");

check(
  "the seeder imports nothing from lib/ or app/",
  !/from\s+["']@\/(lib|app|shared)/.test(seeder) &&
    !/require\(["']\.\.\/(lib|app|shared)/.test(seeder),
);

check(
  "the seeder cannot reach email, SMS, Stripe or AI code",
  !/resend|twilio|stripe|openai/i.test(seeder),
);

check(
  "the seeder only inserts and deletes — it never updates existing rows",
  !/\.update\(/.test(seeder),
);

check(
  "the benchmark is read-only",
  !/method:\s*["'](POST|PUT|PATCH|DELETE)/i.test(benchmark),
);

check(
  "the benchmark refuses a non-local target without --allow-remote",
  /assertLocalOrAllowed/.test(benchmark) && /allow-remote/.test(benchmark),
);

check(
  "the benchmark never persists the session cookie",
  // The written object is everything between writeFileSync( and the closing
  // JSON.stringify argument; `cookie` must not appear anywhere inside it.
  (() => {
    const start = benchmark.indexOf("writeFileSync(");
    if (start === -1) return false;
    const written = benchmark.slice(start, benchmark.indexOf("recordedAt", start) + 400);
    return !/\bcookie\b/.test(written);
  })(),
);

check(
  "the benchmark does not claim to measure query count",
  /Query count is NOT in this file/.test(benchmark) &&
    /pg_stat_statements/.test(benchmark),
);

// ---------------------------------------------------------------- generator
console.log("\nGenerator — determinism and shape (via --dry-run, no network)");

function dryRun(extraArgs = []) {
  const { status, out } = runSeeder([
    "--dry-run",
    "--customers",
    "400",
    "--invoices",
    "900",
    ...extraArgs,
  ]);
  if (status !== 0) return null;
  const jsonStart = out.indexOf("{");
  try {
    return JSON.parse(out.slice(jsonStart));
  } catch {
    return null;
  }
}

const first = dryRun();
const second = dryRun();
const different = dryRun(["--seed-value", "424242"]);

check("--dry-run runs with no credentials at all", first !== null);

if (first && second) {
  check(
    "the same seed produces identical data",
    JSON.stringify(first) === JSON.stringify(second),
  );
  check(
    "customer ids are unique across the whole set",
    first.uniqueCustomerIds === first.customerCount,
  );
  check(
    "invoice ids are unique across the whole set",
    first.uniqueInvoiceIds === first.invoiceCount,
  );
  check(
    "generated ids are UUID-shaped",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      first.firstCustomerId,
    ),
  );
  check(
    "the invoice status mix populates the overdue attention queue",
    (first.statusCounts.overdue ?? 0) > 0,
  );
  check(
    "the invoice status mix populates the unsent-draft queue",
    (first.statusCounts.draft ?? 0) > 0,
  );
  check(
    "the invoice status mix populates the unpaid follow-up queue",
    (first.statusCounts.sent ?? 0) > 0,
  );
  check(
    "most invoices are paid, as in a real book of business",
    (first.statusCounts.paid ?? 0) > first.invoiceCount * 0.4,
  );
  check(
    "dates derive from --as-of rather than the clock",
    first.asOf === second.asOf && /^2026-/.test(first.asOf),
  );
}

if (first && different) {
  check(
    "a different seed produces different data",
    JSON.stringify(first) !== JSON.stringify(different),
  );
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} load-test harness checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
