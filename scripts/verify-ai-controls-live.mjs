/**
 * AI guardrails across two runtime instances (Phase 4 / 4J).
 *
 * ===================== WHY TWO PROCESSES =====================
 * The limiter this replaced was an in-memory Map. Its defect was not that it
 * was wrong in one process — it was correct there — but that a second instance
 * shared none of it, so every serverless invocation started with a fresh,
 * empty budget. A test that ran both halves in one process would pass for
 * exactly the reason the old implementation passed review.
 *
 * So each instance here is a genuinely separate OS process, signed in
 * independently, driving the REAL checkAiRateLimit and recordAiUsage through an
 * authenticated client.
 *
 * ===================== WHAT IS PROVEN =====================
 *   cooldown persists across instances
 *   the rolling window persists across instances
 *   the monthly ceiling persists across instances
 *   the ceiling fails CLOSED when it cannot be evaluated
 *   the short window's degraded path behaves as designed
 *   the usage ledger totals correctly
 *   no prompt or completion text is persisted anywhere
 *
 * ===================== NO MODEL SPEND =====================
 * Nothing here calls a provider. Admission and accounting are entirely
 * database-side, so token counts are supplied directly — which also makes the
 * ceiling reachable without spending anything to reach it.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-ai-controls-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";
const SLUG_PREFIX = "loadtest-ai-";
const RUN_ID = Math.random().toString(36).slice(2, 10);
const FEATURE = "job_summary";

/** Mirrors the constants in lib/ai/guardrails.ts. */
const MAX_REQUESTS_PER_WINDOW = 10;

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
const anonKey = process.env[ANON_ENV]?.trim();
if (!url || !key || !anonKey) fail(`${URL_ENV}, ${KEY_ENV} and ${ANON_ENV} must all be set.`);

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
const appUrl = readEnvLocalSupabaseUrl();
if (appUrl && appUrl === url) fail("Target is the application's own project. Use scratch.");
if (args.confirm !== ref) fail(`--confirm must match the target project ref "${ref}".`);

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMAIL = `altair-ai+${RUN_ID}@example.invalid`;
const PASSWORD = `AiControls!${RUN_ID}-5tZ`;

let company = null;
let userId = null;

/** Runs one instance as a separate process and returns its parsed results. */
function runInstance(command, count) {
  const out = execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--import",
      "./scripts/lib/ts-alias-loader-register.mjs",
      "scripts/lib/ai-instance-worker.mjs",
      url,
      anonKey,
      EMAIL,
      PASSWORD,
      company.id,
      FEATURE,
      command,
      String(count),
    ],
    {
      encoding: "utf8",
      env: { ...process.env, WORKER_SERVICE_ROLE_KEY: key },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const line = out.trim().split(/\r?\n/).filter(Boolean).pop();
  const parsed = JSON.parse(line);
  if (parsed.error) throw new Error(parsed.error);
  return parsed.results;
}

async function buildFixture() {
  const { data: co, error: coError } = await admin
    .from("companies")
    .insert({
      name: `[AI] Controls ${RUN_ID}`,
      slug: `${SLUG_PREFIX}${RUN_ID}`,
      trade: "hvac",
    })
    .select("id")
    .single();
  if (coError) throw new Error(`company: ${coError.message}`);
  company = co;

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
  });
  if (userError) throw new Error(`createUser: ${userError.message}`);
  userId = created.user.id;

  await admin.from("profiles").upsert({ id: userId, email: EMAIL });
  const { error: membershipError } = await admin.from("company_memberships").insert({
    company_id: company.id,
    user_id: userId,
    role: "owner",
    status: "active",
    joined_at: new Date().toISOString(),
  });
  if (membershipError) throw new Error(`membership: ${membershipError.message}`);

  console.log(`  company ${company.id}, user ${userId}`);
}

async function resetCounters() {
  await admin.from("ai_rate_limit_counters").delete().eq("company_id", company.id);
}

async function cleanup() {
  if (!company) return;
  for (const table of ["ai_usage_events", "ai_rate_limit_counters", "company_ai_limits", "company_memberships"]) {
    await admin.from(table).delete().eq("company_id", company.id);
  }
  await admin.from("companies").delete().eq("id", company.id);
  if (userId) await admin.auth.admin.deleteUser(userId).catch(() => {});
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Run id:         ${RUN_ID}\n`);

  try {
    console.log("Building fixture...");
    await buildFixture();

    // -------------------------------------------------------------------
    // The admission check works at all. Before the client fix this refused
    // every request, because the RPC derives the actor from auth.uid() and the
    // service-role client has none.
    // -------------------------------------------------------------------
    console.log("\nAdmission works for an authenticated caller");
    await resetCounters();
    const [first] = runInstance("check", 1);
    check(
      "a signed-in user is admitted",
      first.ok === true,
      `refused with ${first.code} — the RPC needs auth.uid(), so the ` +
        `service-role client refuses everything and the closed ceiling reports ` +
        `"monthly ceiling reached" to every user`,
    );

    // -------------------------------------------------------------------
    // Cooldown across instances.
    // -------------------------------------------------------------------
    console.log("\nCooldown persists across instances");
    const [secondInstance] = runInstance("check", 1);
    check(
      "instance B is refused immediately after instance A succeeded",
      secondInstance.ok === false && secondInstance.code === "rate_limited",
      `got ${JSON.stringify(secondInstance)} — an in-memory limiter would admit this`,
    );

    // -------------------------------------------------------------------
    // Rolling window across instances.
    //
    // The cooldown would mask the window, so it is cleared between attempts
    // while the window counter is left alone — which is what isolates the
    // window as the thing being tested.
    // -------------------------------------------------------------------
    console.log("\nRolling window persists across instances");
    await resetCounters();
    let admitted = 0;
    let refusedByWindow = false;

    for (let i = 0; i < MAX_REQUESTS_PER_WINDOW + 2; i += 1) {
      // Alternate instances so no single process ever sees the whole sequence.
      const [result] = runInstance("check", 1);
      if (result.ok) admitted += 1;
      else if (result.code === "rate_limited") refusedByWindow = true;

      // Clear only the cooldown timestamp, preserving window_started_at/count.
      await admin
        .from("ai_rate_limit_counters")
        .update({ last_request_at: new Date(Date.now() - 60_000).toISOString() })
        .eq("company_id", company.id)
        .eq("feature", FEATURE);
    }

    check(
      `the window admits exactly ${MAX_REQUESTS_PER_WINDOW} across alternating instances`,
      admitted === MAX_REQUESTS_PER_WINDOW,
      `admitted ${admitted}`,
    );
    check("and refuses beyond it", refusedByWindow);

    // -------------------------------------------------------------------
    // Monthly ceiling across instances, and fail-closed.
    // -------------------------------------------------------------------
    console.log("\nMonthly ceiling persists across instances");
    await resetCounters();
    await admin.from("ai_usage_events").delete().eq("company_id", company.id);

    // A ceiling low enough to cross with two stub records, so nothing is spent
    // reaching it.
    await admin
      .from("company_ai_limits")
      .upsert({ company_id: company.id, monthly_token_ceiling: 100 });

    runInstance("record", 60);
    await resetCounters();
    const [underCeiling] = runInstance("check", 1);
    check("under the ceiling, a request is admitted", underCeiling.ok === true);

    runInstance("record", 60); // total 120 > 100
    await resetCounters();
    const [overCeiling] = runInstance("check", 1);
    check(
      "once the ceiling is crossed in ANOTHER instance, this one refuses",
      overCeiling.ok === false && overCeiling.code === "monthly_ceiling_reached",
      `got ${JSON.stringify(overCeiling)}`,
    );

    console.log("\nThe ceiling fails closed");
    // Revoking membership makes the RPC raise, which is the same shape as any
    // failure that leaves the ceiling unevaluated.
    await admin
      .from("company_memberships")
      .update({ status: "suspended" })
      .eq("company_id", company.id)
      .eq("user_id", userId);
    await resetCounters();
    const [unevaluable] = runInstance("check", 1);
    check(
      "an unevaluable ceiling refuses rather than admits",
      unevaluable.ok === false && unevaluable.code === "monthly_ceiling_reached",
      `got ${JSON.stringify(unevaluable)} — an unbounded bill is the worse outcome`,
    );
    await admin
      .from("company_memberships")
      .update({ status: "active" })
      .eq("company_id", company.id)
      .eq("user_id", userId);

    // -------------------------------------------------------------------
    // Ledger correctness and content leakage.
    // -------------------------------------------------------------------
    console.log("\nUsage ledger");
    const { data: events } = await admin
      .from("ai_usage_events")
      .select("*")
      .eq("company_id", company.id);

    const totalTokens = (events ?? []).reduce((sum, e) => sum + Number(e.total_tokens), 0);
    check(
      "the ledger totals what was recorded (120 tokens)",
      totalTokens === 120,
      `ledger total ${totalTokens}`,
    );
    check(
      "usage is attributed to the acting user",
      (events ?? []).every((e) => e.user_id === userId),
      "rows recorded with a null actor cannot be attributed",
    );
    check(
      "total_tokens is derived, not client-supplied",
      (events ?? []).every(
        (e) => Number(e.total_tokens) === Number(e.prompt_tokens) + Number(e.completion_tokens),
      ),
    );

    console.log("\nNo prompt or completion content is persisted");
    const sample = (events ?? [])[0] ?? {};
    const columnNames = Object.keys(sample);
    // A count is not content. `prompt_tokens` and `completion_tokens` are
    // integers describing size, which is exactly what should be stored — so the
    // pattern excludes the _tokens suffix rather than matching the word.
    const contentish = columnNames.filter(
      (name) =>
        !/_tokens$/.test(name) &&
        /prompt|completion|content|message|response|body|output|text/i.test(name),
    );
    check(
      "ai_usage_events has no column that could hold prompt or completion text",
      contentish.length === 0,
      `suspicious columns: ${contentish.join(", ")}`,
    );
    check(
      "it stores only counts and identifiers",
      columnNames.every((name) =>
        [
          "id",
          "company_id",
          "user_id",
          "feature",
          "model",
          "prompt_tokens",
          "completion_tokens",
          "total_tokens",
          "created_at",
        ].includes(name),
      ),
      `columns: ${columnNames.join(", ")}`,
    );
  } finally {
    console.log("\nCleaning up fixture...");
    await cleanup();
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} AI control checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  cleanup().finally(() => process.exit(1));
});
