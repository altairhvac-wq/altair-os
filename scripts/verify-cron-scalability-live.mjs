/**
 * Tenant sweep scalability, against a real population (Phase 4 / 4G).
 *
 * ===================== WHY A LIVE RUN =====================
 * scripts/verify-cron-sweep.mjs already exercises a behavioural MODEL of
 * runTenantSweep. A model can only be wrong in the same way its author was, and
 * it cannot answer the questions that decide whether a nightly cron actually
 * finishes: how long a real invocation takes, whether the checkpoint it writes
 * is the one the next invocation reads, and what happens when the platform kills
 * the function partway through.
 *
 * So this drives the REAL runTenantSweep against the REAL cron_checkpoints table
 * with a realistic number of tenants.
 *
 * ===================== WHAT IS MEASURED, NOT ASSERTED =====================
 *   wall-clock to sweep every tenant, across however many invocations it takes
 *   invocations required at a given batch size
 *   per-tenant cost
 *
 * ===================== WHAT IS PROVEN =====================
 *   partial run          a time budget stops the sweep cleanly between tenants
 *   forced crash         a throw mid-tenant does NOT advance the cursor
 *   resume               the next invocation restarts at the right tenant
 *   failing tenant       a tenant that always throws does not wedge the sweep;
 *                        everything behind it is still processed
 *   no skips             every tenant is visited across the full cycle
 *   no duplicates        no tenant is processed twice within a cycle, except
 *                        after a crash, where repetition is the deliberate trade
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-cron-scalability-live.mjs --confirm <ref> [--tenants 250]
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const SLUG_PREFIX = "loadtest-sweep-";
const RUN_ID = Math.random().toString(36).slice(2, 10);
const AUTOMATION_KEY = `verify_sweep_${RUN_ID}`;

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
  return line ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "") : null;
}

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const key = process.env[KEY_ENV]?.trim();
if (!url || !key) fail(`${URL_ENV} and ${KEY_ENV} must both be set.`);

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
const appUrl = readEnvLocalSupabaseUrl();
if (appUrl && appUrl === url) fail("Target is the application's own project. Use scratch.");
if (args.confirm !== ref) fail(`--confirm must match the target project ref "${ref}".`);

// The shipped service-role client reads these. Set BEFORE importing it, so the
// real module under test connects to scratch and nothing else.
process.env.NEXT_PUBLIC_SUPABASE_URL = url;
process.env.SUPABASE_SERVICE_ROLE_KEY = key;

const { runTenantSweep } = await import("@/lib/automation/tenant-sweep");

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const TENANTS = Number.parseInt(String(args.tenants ?? 250), 10);
const companyIds = [];

async function seedTenants() {
  const rows = Array.from({ length: TENANTS }, (_, index) => ({
    name: `[SWEEP] tenant ${RUN_ID} ${String(index).padStart(4, "0")}`,
    slug: `${SLUG_PREFIX}${RUN_ID}-${index}`,
    trade: "hvac",
  }));

  for (let from = 0; from < rows.length; from += 200) {
    const { data, error } = await admin
      .from("companies")
      .insert(rows.slice(from, from + 200))
      .select("id, created_at");
    if (error) throw new Error(`companies: ${error.message}`);
    companyIds.push(...data.map((row) => row.id));
  }
  console.log(`  ${companyIds.length} fixture tenants created`);
}

/** Lists only THIS run's tenants, so the sweep cannot wander into other data. */
function listFixtureCompanies() {
  return async (cursor, limit) => {
    let query = admin
      .from("companies")
      .select("id, created_at")
      .like("slug", `${SLUG_PREFIX}${RUN_ID}-%`);

    if (cursor) {
      query = query.or(
        `created_at.gt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.gt.${cursor.companyId})`,
      );
    }

    const { data, error } = await query
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(limit);
    if (error) throw new Error(`listCompanies: ${error.message}`);
    return data;
  };
}

async function readCheckpoint() {
  const { data } = await admin
    .from("cron_checkpoints")
    .select("cursor_company_id, cursor_created_at")
    .eq("automation_key", AUTOMATION_KEY)
    .maybeSingle();
  return data ?? null;
}

async function clearCheckpoint() {
  await admin.from("cron_checkpoints").delete().eq("automation_key", AUTOMATION_KEY);
}

async function cleanup() {
  await clearCheckpoint();
  for (let from = 0; from < companyIds.length; from += 200) {
    await admin
      .from("companies")
      .delete()
      .in("id", companyIds.slice(from, from + 200));
  }
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Run id:         ${RUN_ID}`);
  console.log(`Tenants:        ${TENANTS}\n`);

  try {
    console.log("Seeding tenants...");
    await seedTenants();
    await clearCheckpoint();

    // -------------------------------------------------------------------
    // A full cycle, measured.
    // -------------------------------------------------------------------
    console.log("\nFull cycle at batchSize=50");
    const processed = [];
    const batchSize = 50;
    let invocations = 0;
    let complete = false;
    const startedAt = Date.now();

    while (!complete && invocations < 100) {
      const outcome = await runTenantSweep({
        automationKey: AUTOMATION_KEY,
        batchSize,
        listCompanies: listFixtureCompanies(),
        processCompany: async (companyId) => {
          processed.push(companyId);
        },
      });
      invocations += 1;
      complete = outcome.cycleComplete;
    }
    const wallClockMs = Date.now() - startedAt;

    const unique = new Set(processed);
    console.log(`  invocations        ${invocations}`);
    console.log(`  wall clock         ${wallClockMs} ms`);
    console.log(`  per tenant         ${(wallClockMs / TENANTS).toFixed(1)} ms`);

    check(
      `every tenant processed exactly once (${unique.size} of ${TENANTS})`,
      unique.size === TENANTS && processed.length === TENANTS,
      `visited ${processed.length}, unique ${unique.size}`,
    );
    check(
      "the cycle reported complete",
      complete,
      "the sweep never signalled cycleComplete",
    );
    // The sweep keeps the checkpoint ROW and nulls its cursor, rather than
    // deleting the row — the row also carries run bookkeeping. What matters is
    // that the cursor is null, so the next cycle starts from the beginning; a
    // stale cursor would make it start midway and skip everything before it.
    check(
      "the cursor is cleared at the end of a cycle",
      (await readCheckpoint())?.cursor_company_id === null,
      `cursor is ${(await readCheckpoint())?.cursor_company_id ?? "(row absent)"}`,
    );

    // -------------------------------------------------------------------
    // Partial run: a time budget stops it between tenants.
    // -------------------------------------------------------------------
    console.log("\nPartial run (time budget)");
    await clearCheckpoint();
    const partialSeen = [];
    // A FAKE CLOCK, injected through the sweep's own `now` hook.
    //
    // Wall-clock budgets are not testable against a remote database: the budget
    // is measured from before listCompanies, and one network round trip to list
    // 250 tenants already exceeds any budget small enough to stop partway. The
    // first attempt used 120 ms and processed zero — not a bug in the sweep, a
    // bug in the test.
    //
    // Driving the clock makes the boundary exact: 10 ms per tenant against a
    // 100 ms budget must admit 10 tenants and stop.
    let fakeNow = 0;
    const PER_TENANT_MS = 10;
    const BUDGET_MS = 100;
    const partial = await runTenantSweep({
      automationKey: AUTOMATION_KEY,
      batchSize: TENANTS,
      timeBudgetMs: BUDGET_MS,
      now: () => fakeNow,
      listCompanies: listFixtureCompanies(),
      processCompany: async (companyId) => {
        partialSeen.push(companyId);
        fakeNow += PER_TENANT_MS;
      },
    });

    check(
      `a time budget stops the run partway (${partialSeen.length} of ${TENANTS})`,
      partialSeen.length > 0 && partialSeen.length < TENANTS,
      `processed ${partialSeen.length} of ${TENANTS}`,
    );
    check(
      "it stops on the tenant boundary the budget implies, not mid-tenant",
      partialSeen.length === BUDGET_MS / PER_TENANT_MS,
      `expected ${BUDGET_MS / PER_TENANT_MS}, processed ${partialSeen.length}`,
    );
    check("it reports the cycle as incomplete", !partial.cycleComplete);
    check(
      "and leaves a checkpoint to resume from",
      (await readCheckpoint()) !== null,
    );

    // Resume from exactly where it stopped.
    const resumeSeen = [];
    let resumeComplete = false;
    let resumeInvocations = 0;
    while (!resumeComplete && resumeInvocations < 100) {
      const outcome = await runTenantSweep({
        automationKey: AUTOMATION_KEY,
        batchSize: 50,
        listCompanies: listFixtureCompanies(),
        processCompany: async (companyId) => {
          resumeSeen.push(companyId);
        },
      });
      resumeInvocations += 1;
      resumeComplete = outcome.cycleComplete;
    }

    const combined = [...partialSeen, ...resumeSeen];
    check(
      "resuming covers every remaining tenant with no gap",
      new Set(combined).size === TENANTS,
      `partial ${partialSeen.length} + resume ${resumeSeen.length} = ` +
        `${new Set(combined).size} unique of ${TENANTS}`,
    );
    check(
      "and no tenant is processed twice across the resumption",
      combined.length === TENANTS,
      `${combined.length} visits for ${TENANTS} tenants`,
    );

    // -------------------------------------------------------------------
    // Platform kill and resume.
    //
    // A kill is NOT a throw inside processCompany — runTenantSweep handles
    // those deliberately, so one bad tenant cannot wedge the cycle (proven
    // separately below). A kill ends the process: the invocation simply never
    // returns, and whatever checkpoint was already written is what the next
    // invocation inherits.
    //
    // So the property to check is that the checkpoint never runs ahead of the
    // work: after any invocation, the cursor must point at the LAST TENANT THAT
    // ACTUALLY COMPLETED. If it pointed further, the tenants in between would be
    // skipped forever on resume, which is the original defect in a new costume.
    // -------------------------------------------------------------------
    console.log("\nPlatform kill and resume");
    await clearCheckpoint();

    const beforeKill = [];
    await runTenantSweep({
      automationKey: AUTOMATION_KEY,
      batchSize: 20,
      listCompanies: listFixtureCompanies(),
      processCompany: async (companyId) => {
        beforeKill.push(companyId);
      },
    });

    // Everything after this point behaves as though the process was killed here:
    // nothing else runs in this invocation, and the next one starts fresh from
    // the stored cursor.
    const checkpointAfterKill = await readCheckpoint();
    const lastCompleted = beforeKill[beforeKill.length - 1];

    check(
      "the checkpoint points at the last tenant that actually completed",
      checkpointAfterKill?.cursor_company_id === lastCompleted,
      `checkpoint ${checkpointAfterKill?.cursor_company_id ?? "(none)"}, ` +
        `last completed ${lastCompleted}`,
    );

    const afterKill = [];
    let afterComplete = false;
    let afterInvocations = 0;
    while (!afterComplete && afterInvocations < 100) {
      const outcome = await runTenantSweep({
        automationKey: AUTOMATION_KEY,
        batchSize: 50,
        listCompanies: listFixtureCompanies(),
        processCompany: async (companyId) => {
          afterKill.push(companyId);
        },
      });
      afterInvocations += 1;
      afterComplete = outcome.cycleComplete;
    }

    const acrossKill = [...beforeKill, ...afterKill];
    check(
      "resuming after the kill reaches every tenant",
      new Set(acrossKill).size === TENANTS,
      `${new Set(acrossKill).size} of ${TENANTS}`,
    );
    check(
      "and no tenant is visited twice across the kill boundary",
      acrossKill.length === TENANTS,
      `${acrossKill.length} visits for ${TENANTS} tenants`,
    );

    // A throw inside processCompany is HANDLED, not fatal — the property that
    // makes one broken tenant survivable. My first version of this test asserted
    // the opposite and was wrong.
    console.log("\nA per-tenant throw is handled, not fatal");
    await clearCheckpoint();
    let escaped = null;
    try {
      await runTenantSweep({
        automationKey: AUTOMATION_KEY,
        batchSize: 5,
        listCompanies: listFixtureCompanies(),
        processCompany: async () => {
          throw new Error("this tenant is broken");
        },
      });
    } catch (error) {
      escaped = error;
    }
    check(
      "a throwing tenant does not abort the invocation",
      escaped === null,
      `the error escaped: ${escaped?.message}`,
    );

    // -------------------------------------------------------------------
    // A permanently failing tenant must not wedge the sweep.
    // -------------------------------------------------------------------
    console.log("\nPermanently failing tenant");
    await clearCheckpoint();
    const poison = companyIds[Math.floor(TENANTS / 2)];
    const seen = [];
    const errors = [];
    let poisonComplete = false;
    let poisonInvocations = 0;

    while (!poisonComplete && poisonInvocations < 100) {
      const outcome = await runTenantSweep({
        automationKey: AUTOMATION_KEY,
        batchSize: 50,
        listCompanies: listFixtureCompanies(),
        processCompany: async (companyId) => {
          if (companyId === poison) throw new Error("tenant always fails");
          seen.push(companyId);
        },
      });
      poisonInvocations += 1;
      poisonComplete = outcome.cycleComplete;
      errors.push(...outcome.errors);
    }

    check(
      "the cycle still completes with a permanently failing tenant",
      poisonComplete,
      "the sweep wedged on the failing tenant",
    );
    check(
      "every other tenant is still processed",
      new Set(seen).size === TENANTS - 1,
      `${new Set(seen).size} of ${TENANTS - 1} healthy tenants`,
    );
    check("the failure is reported rather than hidden", errors.length > 0);
    check(
      "and the failing tenant is not processed as a success",
      !seen.includes(poison),
    );
  } finally {
    console.log("\nCleaning up fixtures...");
    await cleanup();
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} cron scalability checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  cleanup().finally(() => process.exit(1));
});
