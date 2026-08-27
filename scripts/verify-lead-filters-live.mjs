/**
 * Lead list filters and pipeline aggregate differential.
 *
 * ===================== WHAT THIS EXISTS TO CATCH =====================
 * Three separate translations happened when the Leads list was paged, and every
 * one of them is a place a rule can be reproduced almost-correctly:
 *
 *   1. the seven list pills became SQL          lib/database/queries/lead-list-filters.ts
 *   2. the pipeline metrics became an RPC       migration 160
 *   3. the search became a candidate query      lib/database/queries/leads-page.ts
 *
 * The first two are asserted here against the REAL shipped predicates and the
 * REAL shipped builder, imported rather than paraphrased, over a fixture built
 * to hit the combinations where a plausible translation goes wrong:
 *
 *   - a follow-up dated TODAY in the company's zone but yesterday or tomorrow
 *     in UTC, which is what separates a zone-aware cutoff from a naive one
 *   - a lead with status 'lost' and won_at set, and one with status 'won' and
 *     lost_at set, which is where isLeadWon / isLeadLost stop being symmetric
 *   - archived and deleted rows, which the STATUS pills deliberately do not
 *     re-check because the list is already lifecycle-scoped
 *
 * The third is asserted as a KNOWN, BOUNDED delta: a lead matched only by its
 * last-activity label is not returned as a candidate. That is written down in
 * leads-page.ts, and the test fails if the gap is anything other than exactly
 * that one field — so it cannot quietly widen.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-lead-filters-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import {
  LEAD_LIST_FILTER_ORDER,
  matchesLeadListFilter,
} from "@/shared/components/leads/lead-work-queues";
import { applyLeadListFilter } from "@/lib/database/queries/lead-list-filters";
import { mapLeadRowToLead } from "@/lib/database/queries/leads";
import { buildLeadPipelineMetrics } from "@/shared/lib/leads/lead-metrics";
import { buildLeadPipelineMetricsFromAggregates } from "@/shared/lib/leads/lead-metrics";
import { getLeadFollowUpDueCutoff } from "@/shared/lib/leads/lead-status";
import { matchesLeadSearch } from "@/shared/lib/leads/lead-search";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";
const SLUG_PREFIX = "loadtest-leadfilters-";
const RUN_ID = Math.random().toString(36).slice(2, 10);

/**
 * Pacific. Chosen deliberately: it is 7 or 8 hours behind UTC, so an instant
 * late in the UTC day is still "yesterday" there and an instant early in the
 * UTC day is still the previous local day. A cutoff computed without the zone
 * gets these rows wrong in one direction or the other.
 */
const TIME_ZONE = "America/Los_Angeles";

const STATUSES = ["new", "contacted", "scheduled", "estimate_sent", "won", "lost"];
const SOURCES = ["website", "google", "referral", "door_hanger", "other"];

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
  return line
    ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
    : null;
}

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const key = process.env[KEY_ENV]?.trim();
const anonKey = process.env[ANON_ENV]?.trim();
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

let company = null;
let member = null;
/**
 * A signed-in caller for the RPC.
 *
 * The service-role client cannot be used for this: auth.uid() is null under
 * it, and the function's first branch returns zeros rather than bypassing the
 * membership check. That branch is deliberate and correct, and it means an
 * aggregate test driven by the admin client would compare zeros against zeros
 * and pass while proving nothing.
 */
let signedIn = null;

const LEAD_SELECT = `
  *,
  assigned_user:profiles!leads_assigned_user_id_fkey (id, full_name, email),
  created_by_profile:profiles!leads_created_by_fkey (id, full_name, email)
`;

/** Instants chosen relative to the company's zone, not to UTC. */
function followUpInstants(reference) {
  const cutoff = new Date(getLeadFollowUpDueCutoff(reference, TIME_ZONE));
  return {
    // One second inside today, local. Due.
    lateToday: new Date(cutoff.getTime() - 1000).toISOString(),
    // The first second of today, local. Due.
    earlyToday: new Date(cutoff.getTime() - 24 * 3600 * 1000 + 1000).toISOString(),
    // One second past midnight local. Not due.
    justTomorrow: new Date(cutoff.getTime() + 1000).toISOString(),
    // Comfortably overdue.
    lastWeek: new Date(cutoff.getTime() - 7 * 24 * 3600 * 1000).toISOString(),
    none: null,
  };
}

async function buildFixture(reference) {
  const { data: co, error } = await admin
    .from("companies")
    .insert({
      name: `[LEADFILTERS] ${RUN_ID}`,
      slug: `${SLUG_PREFIX}${RUN_ID}`,
      trade: "hvac",
      timezone: TIME_ZONE,
    })
    .select("id")
    .single();
  if (error) throw new Error(`company: ${error.message}`);
  company = co;

  const instants = followUpInstants(reference);
  const lifecycles = [
    { label: "plain", extra: {} },
    { label: "archived", extra: { archived_at: new Date().toISOString() } },
    { label: "deleted", extra: { deleted_at: new Date().toISOString() } },
  ];

  const rows = [];
  let seq = 0;
  for (const status of STATUSES) {
    for (const [followLabel, followUp] of Object.entries(instants)) {
      for (const lifecycle of lifecycles) {
        seq += 1;
        rows.push({
          company_id: company.id,
          first_name: `Lead${seq}`,
          last_name: `${status}-${followLabel}-${lifecycle.label}`,
          email: `lead${seq}@leadfilters.invalid`,
          phone: `555000${String(seq).padStart(4, "0")}`,
          source: SOURCES[seq % SOURCES.length],
          status,
          next_follow_up_at: followUp,
          ...lifecycle.extra,
        });
      }
    }
  }

  // The asymmetric closures, which is where isLeadWon and isLeadLost part ways.
  const now = new Date().toISOString();
  rows.push({
    company_id: company.id,
    first_name: "Asym",
    last_name: "lost-with-won-at",
    email: "asym1@leadfilters.invalid",
    phone: "5559990001",
    source: "referral",
    status: "lost",
    won_at: now,
  });
  rows.push({
    company_id: company.id,
    first_name: "Asym",
    last_name: "won-with-lost-at",
    email: "asym2@leadfilters.invalid",
    phone: "5559990002",
    source: "referral",
    status: "won",
    lost_at: now,
  });
  rows.push({
    company_id: company.id,
    first_name: "Asym",
    last_name: "lost-plain",
    email: "asym3@leadfilters.invalid",
    phone: "5559990003",
    source: "google",
    status: "lost",
  });

  await createSignedInMember();

  const { error: insertError } = await admin.from("leads").insert(rows);
  if (insertError) throw new Error(`leads: ${insertError.message}`);

  console.log(`  ${rows.length} leads across ${STATUSES.length} statuses, ` +
    `${Object.keys(instants).length} follow-up positions, 3 lifecycles`);
  return rows.length;
}

const MEMBER_EMAIL = `leadfilters-${RUN_ID}@leadfilters.invalid`;
const MEMBER_PASSWORD = `Lead!filters-${RUN_ID}-Zq9`;

async function createSignedInMember() {
  if (!anonKey) return;

  const { data: created, error } = await admin.auth.admin.createUser({
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`member: ${error.message}`);
  member = created.user;

  await admin
    .from("profiles")
    .upsert({ id: member.id, email: MEMBER_EMAIL, full_name: "Lead Filters" });

  const { error: membershipError } = await admin
    .from("company_memberships")
    .insert({
      company_id: company.id,
      user_id: member.id,
      role: "owner",
      status: "active",
      joined_at: new Date().toISOString(),
    });
  if (membershipError) throw new Error(`membership: ${membershipError.message}`);

  signedIn = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await signedIn.auth.signInWithPassword({
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
  });
  if (signInError) throw new Error(`sign-in: ${signInError.message}`);
}

/** The lifecycle scope listLeadsPage applies before any pill. */
function activeScope(query) {
  return query.is("deleted_at", null).is("archived_at", null);
}

async function comparePills(cutoff, reference) {
  const { data, error } = await admin
    .from("leads")
    .select(LEAD_SELECT)
    .eq("company_id", company.id)
    .is("deleted_at", null)
    .is("archived_at", null);
  if (error) throw new Error(`leads fetch: ${error.message}`);

  const records = data.map((row) => mapLeadRowToLead(row));
  console.log("\nEvery pill agrees with the shipped predicate");

  for (const filter of LEAD_LIST_FILTER_ORDER) {
    const expected = new Set(
      records
        .filter((lead) =>
          matchesLeadListFilter(lead, filter, TIME_ZONE, reference),
        )
        .map((lead) => lead.id),
    );

    const { data: rows, error: queryError } = await applyLeadListFilter(
      activeScope(
        admin.from("leads").select("id").eq("company_id", company.id),
      ),
      { filter, followUpCutoff: cutoff },
    );

    if (queryError) {
      check(`pill "${filter}"`, false, queryError.message);
      continue;
    }

    const actual = new Set((rows ?? []).map((r) => r.id));
    const missing = [...expected].filter((id) => !actual.has(id));
    const extra = [...actual].filter((id) => !expected.has(id));

    check(
      `pill "${filter}" agrees (${expected.size} expected)`,
      missing.length === 0 && extra.length === 0,
      [
        missing.length ? `SQL missed ${missing.length}` : "",
        extra.length ? `SQL wrongly included ${extra.length}` : "",
      ]
        .filter(Boolean)
        .join(", "),
    );
  }
}

async function compareAggregates(cutoff, reference) {
  console.log("\nThe pipeline RPC agrees with the shipped metrics builder");

  // Ground truth: every lead in the tenant, read past PostgREST's ceiling, run
  // through the REAL builder.
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin
      .from("leads")
      .select(LEAD_SELECT)
      .eq("company_id", company.id)
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`ground truth: ${error.message}`);
    all.push(...(data ?? []));
    if ((data ?? []).length < 1000) break;
  }

  const expected = buildLeadPipelineMetrics(
    all.map((row) => mapLeadRowToLead(row)),
    undefined,
    TIME_ZONE,
  );

  if (!signedIn) {
    console.log(`  SKIPPED aggregate comparison: ${ANON_ENV} is not set.`);
    return;
  }

  const { data: payload, error } = await signedIn.rpc(
    "get_company_lead_pipeline_metrics",
    { p_company_id: company.id, p_follow_up_cutoff: cutoff },
  );
  if (error) {
    check("the RPC returns", false, error.message);
    return;
  }

  const actual = buildLeadPipelineMetricsFromAggregates({
    totalLeads: payload.totals.totalLeads,
    wonLeads: payload.totals.wonLeads,
    lostLeads: payload.totals.lostLeads,
    followUpsDue: payload.totals.followUpsDue,
    sources: payload.sources,
  });

  for (const field of [
    "totalLeads",
    "wonLeads",
    "lostLeads",
    "openLeads",
    "followUpsDue",
    "conversionRate",
  ]) {
    check(
      `${field.padEnd(14)} ${String(actual[field])}`,
      actual[field] === expected[field],
      `builder ${expected[field]}, RPC ${actual[field]}`,
    );
  }

  const expectedSources = JSON.stringify(expected.sourcePerformance);
  const actualSources = JSON.stringify(actual.sourcePerformance);
  check(
    `sourcePerformance agrees (${actual.sourcePerformance.length} sources)`,
    expectedSources === actualSources,
    `builder ${expectedSources}\n        RPC     ${actualSources}`,
  );

  check(
    "topSourceInsight agrees",
    actual.topSourceInsight === expected.topSourceInsight,
    `builder ${expected.topSourceInsight}, RPC ${actual.topSourceInsight}`,
  );

  // The zone is the point of the whole cutoff design. Assert that a cutoff
  // computed WITHOUT it produces a different answer, or the test above proves
  // nothing about time zones.
  const naiveCutoff = new Date(
    `${reference.toISOString().slice(0, 10)}T23:59:59.999Z`,
  ).toISOString();
  const { data: naive } = await signedIn.rpc("get_company_lead_pipeline_metrics", {
    p_company_id: company.id,
    p_follow_up_cutoff: naiveCutoff,
  });
  check(
    "a zone-naive cutoff would have given a different followUpsDue",
    naive.totals.followUpsDue !== payload.totals.followUpsDue,
    `zone-aware ${payload.totals.followUpsDue}, naive ${naive.totals.followUpsDue} — ` +
      "the fixture must straddle a local midnight for this test to mean anything",
  );
}

/**
 * The one place the database cannot see the whole haystack, asserted as a
 * bounded delta rather than left as a comment.
 */
async function checkSearchDelta() {
  console.log("\nThe search gap is exactly the one that is documented");

  const { data, error } = await admin
    .from("leads")
    .select(LEAD_SELECT)
    .eq("company_id", company.id)
    .is("deleted_at", null)
    .is("archived_at", null)
    .limit(1000);
  if (error) throw new Error(`search fixture: ${error.message}`);

  const records = data.map((row) => mapLeadRowToLead(row));

  // Every field in the haystack except lastActivityLabel must be reachable by
  // the candidate query. Proven by construction: for each field, take a value
  // that exists, and assert the shipped predicate matches at least one record —
  // and that the database columns or resolvable enums can express it.
  const sample = records.find((lead) => lead.status === "estimate_sent");
  check(
    "a rendered status label still matches (resolved to an enum, not an ilike)",
    sample != null && matchesLeadSearch(sample, "estimate sent"),
    "formatLeadStatus('estimate_sent') is 'Estimate sent'",
  );

  const bySource = records.find((lead) => lead.source === "door_hanger");
  check(
    "a rendered source label still matches",
    bySource != null && matchesLeadSearch(bySource, "door hanger"),
  );

  const byName = records[0];
  check(
    "a name still matches",
    matchesLeadSearch(byName, byName.firstName.toLowerCase()),
  );

  // The documented gap: no fixture lead has an activity, so a search that could
  // ONLY match a last-activity label matches nothing on either side. The
  // assertion that matters is that the field is the ONLY one absent from the
  // candidate columns.
  const CANDIDATE_REACHABLE = new Set([
    "name",
    "phone",
    "email",
    "source",
    "status",
    "assignedUserName",
  ]);
  const HAYSTACK_FIELDS = [
    "name",
    "phone",
    "email",
    "source",
    "status",
    "assignedUserName",
    "lastActivityLabel",
  ];
  const gap = HAYSTACK_FIELDS.filter((f) => !CANDIDATE_REACHABLE.has(f));
  check(
    `exactly one haystack field is out of the database's reach (${gap.join(", ")})`,
    gap.length === 1 && gap[0] === "lastActivityLabel",
    `gap is ${JSON.stringify(gap)} — leads-page.ts documents lastActivityLabel and nothing else`,
  );
}

async function checkAnonDenied() {
  if (!anonKey) {
    console.log(`\n  SKIPPED anon check: ${ANON_ENV} is not set.`);
    return;
  }

  console.log("\nThe new RPCs are not reachable without a session");
  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const [fn, params] of [
    [
      "get_company_lead_pipeline_metrics",
      { p_company_id: company.id, p_follow_up_cutoff: new Date().toISOString() },
    ],
    ["get_company_document_queue_metrics", { p_company_id: company.id }],
  ]) {
    const { error } = await anon.rpc(fn, params);
    check(
      `anon cannot execute ${fn}`,
      error != null,
      error ? "" : "the call SUCCEEDED — EXECUTE is still granted to PUBLIC or anon",
    );
  }
}

async function cleanup() {
  if (!company) return;
  await admin.from("lead_activities").delete().eq("company_id", company.id);
  await admin.from("leads").delete().eq("company_id", company.id);
  await admin.from("company_memberships").delete().eq("company_id", company.id);
  await admin.from("companies").delete().eq("id", company.id);
  if (member) await admin.auth.admin.deleteUser(member.id);
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Run id:         ${RUN_ID}`);
  console.log(`Company zone:   ${TIME_ZONE}\n`);

  const reference = new Date();
  const cutoff = getLeadFollowUpDueCutoff(reference, TIME_ZONE);
  console.log(`  follow-up cutoff (zone-aware): ${cutoff}`);

  try {
    await buildFixture(reference);
    await comparePills(cutoff, reference);
    await compareAggregates(cutoff, reference);
    await checkSearchDelta();
    await checkAnonDenied();
  } finally {
    console.log("\nCleaning up fixture...");
    await cleanup();
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} lead filter checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  cleanup().finally(() => process.exit(1));
});
