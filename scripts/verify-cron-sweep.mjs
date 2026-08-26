/**
 * Cron sweep verification (Phase 4 / P1-12).
 *
 * ===================== WHAT WENT WRONG =====================
 * `evaluateWorkflowRemindersForAllCompanies` ran `select id from companies` —
 * unfiltered, every tenant — and processed them serially with an `await` each,
 * with no time budget and no `maxDuration` configured. A large enough tenant
 * list therefore guaranteed the function would be killed partway through:
 *
 *   * every company after the cut silently got no reminders that day;
 *   * recordPlatformAutomationRunFinished never ran, so the run record sat at
 *     'started' forever;
 *   * the only symptom was a missing finish record, which nothing watched.
 *
 * ===================== WHAT IS PROVED HERE =====================
 * PART A asserts the wiring statically. PART B is the substance: a behavioural
 * model of the sweep, exercised against the failure modes that matter —
 * mid-batch kills, permanently failing tenants, time-budget exhaustion, and
 * repeated resumption — checking two properties on every run:
 *
 *     NO TENANT IS EVER SKIPPED.
 *     NO TENANT'S WORK IS DUPLICATED WITHIN A CYCLE unless the process crashed
 *     mid-company, where repetition is the deliberate trade.
 *
 * The model mirrors runTenantSweep's control flow exactly; PART A is what ties
 * it to the shipped code.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-cron-sweep.mjs
 */
import { readFileSync } from "node:fs";

const SWEEP = "lib/automation/tenant-sweep.ts";
const MIGRATION = "supabase/migrations/152_cron_checkpoints.sql";
const REMINDERS = "lib/database/services/evaluate-workflow-reminders.ts";
const ROUTE = "app/api/cron/workflow-reminders/route.ts";

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

// ===========================================================================
// PART A — wiring
// ===========================================================================

console.log("\nPART A — the sweep is wired and bounded");

const sweep = loadTs(SWEEP);
const migration = loadSql(MIGRATION);
const reminders = loadTs(REMINDERS);
const route = loadTs(ROUTE);
const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));

check(
  "the checkpoint table exists and is service-role only",
  /create table if not exists public\.cron_checkpoints/.test(migration) &&
    /revoke all on table public\.cron_checkpoints from authenticated/.test(migration) &&
    /grant all on table public\.cron_checkpoints to service_role/.test(migration),
);

check(
  "the checkpoint table has RLS enabled",
  /alter table public\.cron_checkpoints enable row level security/.test(migration),
);

check(
  "'partial' is an allowed automation run status",
  /check \(status in \('started', 'succeeded', 'failed', 'partial'\)\)/.test(migration),
);

check(
  "the cursor is (created_at, id), a total order",
  /cursor_created_at timestamptz/.test(migration) &&
    /cursor_company_id uuid/.test(migration),
);

check(
  "the unbounded company lister is gone",
  !/listCompanyIdsForReminderEvaluation/.test(reminders) &&
    !/from\("companies"\)\s*\.select\("id"\)\s*\.order\("created_at", \{ ascending: true \}\);/.test(
      reminders,
    ),
);

check(
  "the reminder batch pages companies with a keyset predicate",
  /listCompanyPageForReminderEvaluation/.test(reminders) &&
    /created_at\.gt\.\$\{cursor\.createdAt\}/.test(reminders) &&
    /and\(created_at\.eq\.\$\{cursor\.createdAt\},id\.gt\.\$\{cursor\.companyId\}\)/.test(
      reminders,
    ),
);

check(
  "the page is limited",
  /\.limit\(limit\)/.test(reminders),
);

check(
  "the reminder batch runs through runTenantSweep",
  /runTenantSweep\(\{/.test(reminders) &&
    /automationKey: WORKFLOW_REMINDER_SWEEP_KEY/.test(reminders),
);

check(
  "the cron route records 'partial' for an incomplete cycle",
  /cycleIncomplete[\s\S]{0,200}?"partial"/.test(route),
);

check(
  "the cron route declares a maxDuration",
  /export const maxDuration = \d+/.test(route),
);

check(
  "vercel.json configures maxDuration for every cron route",
  Boolean(vercel.functions) &&
    ["workflow-reminders", "marketing-ai", "marketing-insights"].every((name) =>
      Object.keys(vercel.functions).some(
        (key) => key.includes(name) && vercel.functions[key].maxDuration >= 30,
      ),
    ),
);

{
  const routeMax = Number(route.match(/export const maxDuration = (\d+)/)?.[1] ?? 0);
  const budget = Number(sweep.match(/DEFAULT_TIME_BUDGET_MS = ([\d_]+)/)?.[1]?.replace(/_/g, "") ?? 0);
  check(
    `the sweep time budget (${budget / 1000}s) leaves room under maxDuration (${routeMax}s) to write the checkpoint`,
    budget > 0 && routeMax > 0 && budget / 1000 <= routeMax - 10,
  );
}

check(
  "a failed tenant is reported to the error monitor",
  /captureMonitoredEvent\(\{[\s\S]{0,200}?cron\.tenant_sweep_company_failed/.test(sweep),
);

check(
  "the time budget is checked BEFORE starting a company, never mid-company",
  /if \(now\(\) - startedAt >= timeBudgetMs\) \{[\s\S]{0,120}?break;[\s\S]{0,200}?outcome\.attempted \+= 1;/.test(
    sweep,
  ),
);

// ===========================================================================
// PART B — behavioural model
// ===========================================================================

console.log("\nPART B — no tenant is skipped, under every failure mode");

/**
 * Mirrors runTenantSweep. `crashAfter` simulates the platform killing the
 * function mid-company: the attempt neither completes nor advances the cursor.
 */
function simulateInvocation(state, options = {}) {
  const {
    batchSize = 5,
    timeBudget = Infinity,
    failing = new Set(),
    crashAfter = null,
    perCompanyCost = 1,
  } = options;

  const after = state.cursor;
  const startIndex = after === null ? 0 : state.companies.findIndex((c) => c.id === after) + 1;
  const page = state.companies.slice(startIndex, startIndex + batchSize);

  if (page.length === 0) {
    state.cursor = null;
    state.cyclesCompleted += 1;
    return { cycleComplete: true, attempted: 0, crashed: false };
  }

  let elapsed = 0;
  let attempted = 0;

  for (const company of page) {
    if (elapsed >= timeBudget) break;

    if (crashAfter !== null && attempted >= crashAfter) {
      // Killed mid-company: nothing recorded, cursor unchanged.
      return { cycleComplete: false, attempted, crashed: true };
    }

    attempted += 1;
    elapsed += perCompanyCost;

    if (failing.has(company.id)) {
      state.failed.push(company.id);
    } else {
      state.processed.push(company.id);
    }

    // Advance after the attempt COMPLETES — success or handled failure.
    state.cursor = company.id;
  }

  return { cycleComplete: false, attempted, crashed: false };
}

function makeState(count) {
  return {
    companies: Array.from({ length: count }, (_, i) => ({ id: `c${i}` })),
    cursor: null,
    processed: [],
    failed: [],
    cyclesCompleted: 0,
  };
}

function runToCycleCompletion(state, options = {}, maxInvocations = 500) {
  let invocations = 0;
  while (invocations < maxInvocations) {
    invocations += 1;
    const result = simulateInvocation(state, options);
    if (result.cycleComplete) return invocations;
  }
  return -1;
}

// --- a full cycle covers every tenant exactly once -------------------------
{
  const state = makeState(137);
  const invocations = runToCycleCompletion(state, { batchSize: 10 });
  const touched = [...state.processed, ...state.failed];
  check(
    `137 tenants across ${invocations} invocations: every tenant touched`,
    new Set(touched).size === 137,
  );
  check(
    "no tenant touched twice within one cycle",
    touched.length === 137,
  );
  check("the cycle reports completion and resets the cursor", state.cursor === null);
}

// --- 3x tenant population (the stated gate) --------------------------------
{
  const state = makeState(411);
  const invocations = runToCycleCompletion(state, { batchSize: 50 });
  check(
    `3x population (411 tenants) completes a cycle in ${invocations} invocations`,
    invocations > 0 && new Set(state.processed).size === 411,
  );
}

// --- time budget exhaustion -----------------------------------------------
{
  const state = makeState(200);
  // Each company costs 10 units against a 25-unit budget: 3 per invocation.
  const invocations = runToCycleCompletion(state, {
    batchSize: 50,
    timeBudget: 25,
    perCompanyCost: 10,
  });
  const touched = [...state.processed, ...state.failed];
  check(
    "a tight time budget still reaches every tenant, just over more invocations",
    new Set(touched).size === 200 && touched.length === 200,
  );
  check(`the budget forced many small invocations (${invocations})`, invocations > 50);
}

// --- crash mid-company ----------------------------------------------------
{
  const state = makeState(60);
  // Kill after 3 companies on every invocation, forever.
  let invocations = 0;
  let completed = false;
  while (invocations < 400 && !completed) {
    invocations += 1;
    const result = simulateInvocation(state, { batchSize: 10, crashAfter: 3 });
    completed = result.cycleComplete;
  }
  const touched = [...state.processed, ...state.failed];
  check(
    "a crash every 3 companies still reaches every tenant",
    new Set(touched).size === 60,
  );
  check(
    "a crash repeats work but never skips a tenant",
    touched.length >= 60 && new Set(touched).size === 60,
  );
}

// --- permanently failing tenant -------------------------------------------
{
  const state = makeState(40);
  const invocations = runToCycleCompletion(state, {
    batchSize: 8,
    failing: new Set(["c7", "c23"]),
  });
  const touched = [...state.processed, ...state.failed];
  check(
    "two permanently failing tenants do not stall the sweep",
    invocations > 0 && new Set(touched).size === 40,
  );
  check(
    "the failures are recorded rather than silently dropped",
    state.failed.includes("c7") && state.failed.includes("c23"),
  );
  check(
    "the other 38 tenants are still processed",
    new Set(state.processed).size === 38,
  );
}

// --- resumption preserves order -------------------------------------------
{
  const state = makeState(100);
  runToCycleCompletion(state, { batchSize: 7 });
  const expected = Array.from({ length: 100 }, (_, i) => `c${i}`);
  check(
    "tenants are processed in cursor order across invocations",
    JSON.stringify(state.processed) === JSON.stringify(expected),
  );
}

// --- an empty tenant list is a completed cycle, not a hang ----------------
{
  const state = makeState(0);
  const result = simulateInvocation(state, { batchSize: 10 });
  check("an empty tenant list completes the cycle immediately", result.cycleComplete === true);
}

// --- repeated cycles ------------------------------------------------------
{
  const state = makeState(25);
  runToCycleCompletion(state, { batchSize: 10 });
  const firstCycle = [...state.processed];
  state.processed = [];
  state.failed = [];
  runToCycleCompletion(state, { batchSize: 10 });
  check(
    "a second cycle re-sweeps every tenant from the beginning",
    new Set(state.processed).size === 25 &&
      JSON.stringify(state.processed) === JSON.stringify(firstCycle),
  );
  check("both cycles were recorded as complete", state.cyclesCompleted === 2);
}

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} cron sweep checks passed (${checks} total).`,
);
if (failures > 0) process.exit(1);
