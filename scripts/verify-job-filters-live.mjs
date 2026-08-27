/**
 * Jobs list filter differential (P0-14).
 *
 * ===================== WHY =====================
 * The jobs list filters moved from JavaScript run over an array in the browser
 * to SQL run over the whole tenant. Same reasoning as the customer queues, and
 * the same risk: two implementations of one rule with nothing comparing them is
 * precisely how migration 151 shipped SQL that could never run.
 *
 * So this imports the REAL predicate — filterJobsByPageFilters from
 * shared/lib/jobs-page-filters.ts — and the REAL SQL filter builder that ships,
 * runs both over the same rows, and asserts set equality for every combination
 * of status, priority and unassigned-only.
 *
 * The combination that matters most is the dispatch board's "In Progress" card.
 * It counts a job as in progress when the technician has ARRIVED or is actively
 * working, so the SQL has to widen to two statuses rather than match one. A
 * translation that used plain equality would silently drop every
 * arrived-but-not-started job from the view whose entire purpose is showing
 * them, and it would look correct in every other case.
 *
 * ===================== SAFETY =====================
 * Creates a fixture company, removes it. Guarded like the other live scripts.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-job-filters-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { filterJobsByPageFilters } from "@/shared/lib/jobs-page-filters";
import { mapJobRowToJob } from "@/lib/database/mappers/job";
import { applyJobPageFilters } from "@/lib/database/queries/job-page-filters";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const SLUG_PREFIX = "loadtest-jobfilters-";
const RUN_ID = Math.random().toString(36).slice(2, 10);

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

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const STATUSES = ["scheduled", "dispatched", "arrived", "in_progress", "completed", "cancelled"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

let company = null;
let technicianId = null;

async function buildFixture() {
  const { data: co, error: coError } = await admin
    .from("companies")
    .insert({
      name: `[JOBFILTERS] ${RUN_ID}`,
      slug: `${SLUG_PREFIX}${RUN_ID}`,
      trade: "hvac",
    })
    .select("id")
    .single();
  if (coError) throw new Error(`company: ${coError.message}`);
  company = co;

  const email = `altair-jobfilters+${RUN_ID}@example.invalid`;
  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password: `JobFilters!${RUN_ID}-3pR`,
    email_confirm: true,
  });
  if (userError) throw new Error(`createUser: ${userError.message}`);
  technicianId = created.user.id;
  await admin.from("profiles").upsert({ id: technicianId, email });
  await admin.from("company_memberships").insert({
    company_id: company.id,
    user_id: technicianId,
    role: "technician",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({ company_id: company.id, name: "[JOBFILTERS] Customer" })
    .select("id")
    .single();
  if (customerError) throw new Error(`customer: ${customerError.message}`);

  // Every status x priority, half assigned and half unassigned, so each
  // combination the UI can produce has rows on both sides of every predicate.
  const rows = [];
  let index = 0;
  for (const status of STATUSES) {
    for (const priority of PRIORITIES) {
      for (const assigned of [true, false]) {
        rows.push({
          company_id: company.id,
          customer_id: customer.id,
          job_number: `JOB-JF-${RUN_ID}-${index}`,
          scheduled_at: new Date(Date.now() - index * 3600_000).toISOString(),
          status,
          priority,
          job_type: "Filter fixture",
          assigned_technician_id: assigned ? technicianId : null,
        });
        index += 1;
      }
    }
  }

  const { error } = await admin.from("jobs").insert(rows);
  if (error) throw new Error(`jobs: ${error.message}`);
  console.log(`  ${rows.length} fixture jobs in company ${company.id}`);
}

const JOB_SELECT = `
  *,
  customers(name),
  assigned_technician:profiles!jobs_assigned_technician_id_fkey(full_name, email)
`;

async function runDifferential() {
  const { data: rows, error } = await admin
    .from("jobs")
    .select(JOB_SELECT)
    .eq("company_id", company.id)
    .is("deleted_at", null)
    .is("archived_at", null);
  if (error) throw new Error(`fetch: ${error.message}`);

  // The REAL mapper, so the REAL predicate sees what the application sees.
  const jobs = rows.map(mapJobRowToJob);

  console.log("\nSQL filters agree with filterJobsByPageFilters");

  const combos = [];
  for (const status of ["all", ...STATUSES]) {
    for (const priority of ["all", ...PRIORITIES]) {
      for (const unassignedOnly of [false, true]) {
        combos.push({ status, priority, unassignedOnly, dispatchCard: false });
      }
    }
  }
  // The dispatch-board variant of In Progress.
  for (const priority of ["all", ...PRIORITIES]) {
    for (const unassignedOnly of [false, true]) {
      combos.push({
        status: "in_progress",
        priority,
        unassignedOnly,
        dispatchCard: true,
      });
    }
  }

  let mismatches = 0;
  let compared = 0;

  for (const combo of combos) {
    const expected = new Set(
      filterJobsByPageFilters(jobs, combo.status, combo.priority, combo.unassignedOnly, {
        matchDispatchInProgressCard: combo.dispatchCard,
      }).map((job) => job.id),
    );

    const { data, error: queryError } = await applyJobPageFilters(
      admin
        .from("jobs")
        .select("id")
        .eq("company_id", company.id)
        .is("deleted_at", null)
        .is("archived_at", null),
      {
        statusFilter: combo.status,
        priorityFilter: combo.priority,
        unassignedOnly: combo.unassignedOnly,
        matchDispatchInProgressCard: combo.dispatchCard,
      },
    );

    compared += 1;
    if (queryError) {
      mismatches += 1;
      console.error(`        query error for ${JSON.stringify(combo)}: ${queryError.message}`);
      continue;
    }

    const actual = new Set((data ?? []).map((r) => r.id));
    const same =
      expected.size === actual.size && [...expected].every((id) => actual.has(id));
    if (!same) {
      mismatches += 1;
      console.error(
        `        ${JSON.stringify(combo)} expected ${expected.size}, SQL returned ${actual.size}`,
      );
    }
  }

  check(
    `all ${compared} filter combinations agree`,
    mismatches === 0,
    `${mismatches} combinations disagreed`,
  );

  // Called out separately because it is the one a plain equality translation
  // gets wrong, and it would pass every other combination.
  const dispatchExpected = new Set(
    filterJobsByPageFilters(jobs, "in_progress", "all", false, {
      matchDispatchInProgressCard: true,
    }).map((job) => job.id),
  );
  const { data: dispatchActual } = await applyJobPageFilters(
    admin
      .from("jobs")
      .select("id, status")
      .eq("company_id", company.id)
      .is("deleted_at", null)
      .is("archived_at", null),
    { statusFilter: "in_progress", matchDispatchInProgressCard: true },
  );
  const statuses = new Set((dispatchActual ?? []).map((r) => r.status));

  check(
    "the dispatch In Progress card includes arrived AND in_progress",
    statuses.has("arrived") && statuses.has("in_progress") && statuses.size === 2,
    `SQL returned statuses: ${[...statuses].join(", ") || "(none)"}`,
  );
  check(
    "and matches the predicate exactly",
    dispatchExpected.size === (dispatchActual ?? []).length,
    `predicate ${dispatchExpected.size}, SQL ${(dispatchActual ?? []).length}`,
  );
}

async function cleanup() {
  if (!company) return;
  await admin.from("jobs").delete().eq("company_id", company.id);
  await admin.from("customers").delete().eq("company_id", company.id);
  await admin.from("company_memberships").delete().eq("company_id", company.id);
  await admin.from("companies").delete().eq("id", company.id);
  if (technicianId) await admin.auth.admin.deleteUser(technicianId).catch(() => {});
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Run id:         ${RUN_ID}\n`);
  try {
    await buildFixture();
    await runDifferential();
  } finally {
    console.log("\nCleaning up fixture...");
    await cleanup();
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} job filter checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  cleanup().finally(() => process.exit(1));
});
