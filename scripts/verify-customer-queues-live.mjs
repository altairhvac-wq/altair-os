/**
 * Customer pagination and work-queue differential (P0-14).
 *
 * ===================== WHY THIS EXISTS =====================
 * The customer work queues moved from JavaScript predicates run in the browser
 * to SQL filters run in the database. That is the only way to make them correct
 * at scale — the old ones classified whatever rows had survived PostgREST's
 * 1000-row cap and presented the answer as the state of the whole book.
 *
 * But re-expressing a rule in a second language is exactly how migration 151
 * shipped SQL that referenced three non-existent columns: two implementations,
 * nothing comparing them. So this does not test the SQL against a description of
 * the rule. It imports the REAL TypeScript predicates from
 * shared/components/customers/customer-work-queues.ts, the REAL row mapper, and
 * the REAL filter builder that ships, runs both over the same rows, and asserts
 * the two agree exactly — set equality, not counts.
 *
 * Running the shipped TypeScript needs Node's --experimental-strip-types plus a
 * hook that understands the `@/` alias; see scripts/lib/ts-alias-loader.mjs.
 *
 * ===================== WHAT ELSE IT PROVES =====================
 *   * A full cursor walk of a 5,000-customer tenant visits every row exactly
 *     once — no duplicate, no gap, no early stop. That is the claim keyset
 *     pagination has to earn, and the one an offset implementation quietly
 *     fails when rows shift.
 *   * The customer that was previously UNREACHABLE — the oldest, absent from
 *     the payload entirely — is now both reachable by paging and findable by
 *     server-side search.
 *   * The exact count matches the number of rows the walk actually yields.
 *
 * ===================== SAFETY =====================
 * Same guard model as the other live scripts: dedicated env vars, refuses the
 * application's own project, --confirm must match the target ref, all writes
 * contained in a company it creates and removes.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-customer-queues-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import {
  isCustomerActiveQueue,
  isCustomerInactiveQueue,
  isCustomerNeedsInfoQueue,
  isCustomerPastQueue,
} from "@/shared/components/customers/customer-work-queues";
import { mapCustomerRowToCustomer } from "@/lib/database/mappers/customer";
import { applyCustomerQueueFilters } from "@/lib/database/queries/customer-queue-filters";
import {
  buildKeysetFilter,
  buildSearchFilter,
  decodeCursor,
  encodeCursor,
  normalizeSearchTerm,
} from "@/lib/database/queries/pagination";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const SLUG_PREFIX = "loadtest-queues-";
const RUN_ID = Math.random().toString(36).slice(2, 10);

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

// ---------------------------------------------------------------------------
// Fixture: one customer per interesting shape.
//
// The seeded load-test tenant has every field populated, so it exercises paging
// but says nothing about the queue predicates. These rows are the edge cases —
// including a phone that is a single SPACE, which the UI treats as missing
// because the form data is trimmed before validation, and which a naive `= ''`
// filter would treat as present.
// ---------------------------------------------------------------------------
const COMPLETE = {
  email: "person@example.invalid",
  phone: "5205550100",
  address_line1: "100 Main St",
  city: "Tucson",
  state: "AZ",
  postal_code: "85701",
};

const FIXTURES = [
  { key: "complete-active", status: "active", fields: {} },
  { key: "complete-inactive", status: "inactive", fields: {} },
  { key: "complete-lead", status: "lead", fields: {} },
  { key: "missing-email", status: "active", fields: { email: "" } },
  { key: "missing-phone", status: "active", fields: { phone: "" } },
  { key: "blank-phone-space", status: "active", fields: { phone: " " } },
  { key: "blank-city-spaces", status: "active", fields: { city: "   " } },
  { key: "missing-address", status: "active", fields: { address_line1: "" } },
  { key: "missing-state", status: "active", fields: { state: "" } },
  { key: "missing-zip", status: "active", fields: { postal_code: "" } },
  { key: "malformed-email-no-at", status: "active", fields: { email: "nope" } },
  { key: "malformed-email-no-dot", status: "active", fields: { email: "a@b" } },
  { key: "malformed-email-space", status: "active", fields: { email: "a b@c.d" } },
  { key: "inactive-missing-email", status: "inactive", fields: { email: "" } },
  { key: "archived", status: "active", fields: {}, archived: true },
  { key: "deleted", status: "active", fields: {}, deleted: true },
  { key: "archived-incomplete", status: "active", fields: { email: "" }, archived: true },
];

let company = null;

async function buildFixture() {
  const { data, error } = await admin
    .from("companies")
    .insert({
      name: `[QUEUES] Customer queue differential ${RUN_ID}`,
      slug: `${SLUG_PREFIX}${RUN_ID}`,
      trade: "hvac",
    })
    .select("id")
    .single();
  if (error) throw new Error(`company: ${error.message}`);
  company = data;

  const rows = FIXTURES.map((fixture, index) => ({
    company_id: company.id,
    name: `[QUEUES] ${fixture.key} ${index}`,
    status: fixture.status,
    ...COMPLETE,
    ...fixture.fields,
    ...(fixture.archived ? { archived_at: new Date().toISOString() } : {}),
    ...(fixture.deleted ? { deleted_at: new Date().toISOString() } : {}),
  }));

  const { error: insertError } = await admin.from("customers").insert(rows);
  if (insertError) throw new Error(`customers: ${insertError.message}`);

  console.log(`  ${rows.length} fixture customers in company ${company.id}`);
}

async function fetchAllFixtureRows() {
  const { data, error } = await admin
    .from("customers")
    .select("*")
    .eq("company_id", company.id);
  if (error) throw new Error(`fetch: ${error.message}`);
  return data;
}

const QUEUE_PREDICATES = {
  active: isCustomerActiveQueue,
  "needs-info": isCustomerNeedsInfoQueue,
  inactive: isCustomerInactiveQueue,
  past: isCustomerPastQueue,
};

async function runDifferential() {
  const rows = await fetchAllFixtureRows();
  // The REAL mapper, so the predicates see exactly what the application sees.
  const customers = rows.map(mapCustomerRowToCustomer);

  console.log("\nSQL filters agree with the shipped TypeScript predicates");

  for (const [queue, predicate] of Object.entries(QUEUE_PREDICATES)) {
    const expected = new Set(customers.filter(predicate).map((c) => c.id));

    const { data, error } = await applyCustomerQueueFilters(
      admin.from("customers").select("id").eq("company_id", company.id),
      { queue },
    );
    if (error) {
      check(`queue "${queue}" agrees`, false, `query error: ${error.message}`);
      continue;
    }
    const actual = new Set((data ?? []).map((r) => r.id));

    const missing = [...expected].filter((id) => !actual.has(id));
    const extra = [...actual].filter((id) => !expected.has(id));
    const nameOf = (id) => customers.find((c) => c.id === id)?.name ?? id;

    check(
      `queue "${queue}" agrees (${expected.size} expected)`,
      missing.length === 0 && extra.length === 0,
      [
        missing.length ? `SQL missed: ${missing.map(nameOf).join(", ")}` : "",
        extra.length ? `SQL wrongly included: ${extra.map(nameOf).join(", ")}` : "",
      ]
        .filter(Boolean)
        .join("\n        "),
    );
  }

  // Every fixture must land in exactly one queue, or the tab strip double-counts.
  console.log("\nThe queues partition the book");
  const assignments = customers.map((customer) => ({
    name: customer.name,
    queues: Object.entries(QUEUE_PREDICATES)
      .filter(([, predicate]) => predicate(customer))
      .map(([queue]) => queue),
  }));
  const misfiled = assignments.filter((a) => a.queues.length !== 1);
  check(
    "every customer belongs to exactly one queue",
    misfiled.length === 0,
    misfiled.map((m) => `${m.name} -> [${m.queues.join(", ")}]`).join("\n        "),
  );
}

// ---------------------------------------------------------------------------
// Cursor walk over the seeded tenant.
// ---------------------------------------------------------------------------
async function runCursorWalk() {
  const { data: seeded } = await admin
    .from("companies")
    .select("id, name")
    .like("slug", "loadtest-2%")
    .limit(1)
    .maybeSingle();

  if (!seeded) {
    console.log(
      "\n  Cursor walk SKIPPED: no seeded load-test tenant found.\n" +
        "  Run scripts/loadtest-seed.mjs first to exercise this at scale.\n",
    );
    return;
  }

  console.log(`\nCursor walk over the seeded tenant (${seeded.name})`);

  const { count: total } = await admin
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("company_id", seeded.id)
    .is("deleted_at", null)
    .is("archived_at", null);

  const pageSize = 50;
  const seen = new Set();
  let duplicates = 0;
  let cursor = null;
  let pages = 0;
  let oldestRow = null;

  for (;;) {
    let query = admin
      .from("customers")
      .select("id, created_at, name")
      .eq("company_id", seeded.id)
      .is("deleted_at", null)
      .is("archived_at", null);

    const decoded = decodeCursor(cursor);
    if (decoded) query = query.or(buildKeysetFilter("created_at", "desc", decoded));

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);

    if (error) {
      check("cursor walk completes without error", false, error.message);
      return;
    }

    const hasMore = data.length > pageSize;
    const rows = hasMore ? data.slice(0, pageSize) : data;
    for (const row of rows) {
      if (seen.has(row.id)) duplicates += 1;
      seen.add(row.id);
      oldestRow = row;
    }
    pages += 1;

    if (!hasMore) break;
    const last = rows[rows.length - 1];
    cursor = encodeCursor(last.created_at, last.id);

    if (pages > 500) {
      check("cursor walk terminates", false, "exceeded 500 pages — cursor is not advancing");
      return;
    }
  }

  console.log(`  walked ${pages} pages`);
  check(
    `the walk visits every row (${seen.size} of ${total})`,
    seen.size === total,
    `saw ${seen.size}, exact count says ${total}`,
  );
  check("the walk yields no duplicates", duplicates === 0, `${duplicates} repeated rows`);

  // The record that used to be unreachable.
  const { data: oldest } = await admin
    .from("customers")
    .select("id, name")
    .eq("company_id", seeded.id)
    .is("deleted_at", null)
    .is("archived_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .single();

  check(
    "the OLDEST customer is reached by paging (it was absent from the old payload)",
    seen.has(oldest.id),
    `${oldest.name} was not visited`,
  );
  check(
    "the walk ends on that same oldest row",
    oldestRow?.id === oldest.id,
    `walk ended on ${oldestRow?.name}, expected ${oldest.name}`,
  );

  // ...and findable by server-side search.
  const term = normalizeSearchTerm(oldest.name.replace("[LOADTEST] ", ""));
  const { data: found, error: searchError } = await admin
    .from("customers")
    .select("id")
    .eq("company_id", seeded.id)
    .or(buildSearchFilter(["name", "email", "phone"], term))
    .limit(50);

  check(
    "the oldest customer is findable by server-side search",
    !searchError && (found ?? []).some((r) => r.id === oldest.id),
    searchError ? searchError.message : `search for "${term}" did not return it`,
  );
}

async function cleanup() {
  if (!company) return;
  await admin.from("customers").delete().eq("company_id", company.id);
  await admin.from("companies").delete().eq("id", company.id);
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Run id:         ${RUN_ID}\n`);

  try {
    await buildFixture();
    await runDifferential();
    await runCursorWalk();
  } finally {
    console.log("\nCleaning up fixture...");
    await cleanup();
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} customer queue checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  cleanup().finally(() => process.exit(1));
});
