/**
 * Cursor-walk verification for every paged list surface (P0-14).
 *
 * ===================== WHAT THIS PROVES =====================
 * Keyset pagination makes one promise: walking the cursor from the top visits
 * every row exactly once. If it under-delivers you have the truncation bug back,
 * in a form that looks like working pagination. If it over-delivers you have
 * duplicates. If the cursor stops advancing you have an infinite loop.
 *
 * None of that is visible on a small tenant, which is the same reason the
 * original defect survived: a 50-row table pages correctly under almost any
 * implementation. So this walks the seeded load-test tenant — thousands of rows
 * per surface — and checks the walk against an exact count taken independently.
 *
 * It uses the REAL cursor encoder and keyset filter builder from
 * lib/database/queries/pagination.ts, not a copy, so a change to how cursors are
 * built is a change to what this tests.
 *
 * ===================== SAFETY =====================
 * Read-only. It creates nothing and deletes nothing. Still guarded like the
 * other live scripts: dedicated env vars, refuses the application's own project,
 * --confirm must match the target ref.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-pagination-live.mjs --confirm <ref>
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import {
  buildKeysetFilter,
  buildSearchFilter,
  decodeCursor,
  encodeCursor,
  normalizeSearchTerm,
} from "@/lib/database/queries/pagination";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const PAGE_SIZE = 50;

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

/**
 * Mirrors the sortable columns and search columns each surface configures in
 * lib/database/queries/list-pages.ts. Every sort column here must be NOT NULL —
 * a null sort value makes the cursor ambiguous and the walk silently skips rows.
 */
const SURFACES = [
  {
    table: "customers",
    sort: "created_at",
    searchColumns: ["name", "email", "phone"],
    searchFrom: (row) => row.name,
    label: "customers",
  },
  {
    table: "invoices",
    sort: "created_at",
    searchColumns: ["invoice_number", "notes"],
    searchFrom: (row) => row.invoice_number,
    label: "invoices",
  },
  {
    table: "estimates",
    sort: "created_at",
    searchColumns: ["estimate_number", "notes"],
    searchFrom: (row) => row.estimate_number,
    label: "estimates",
  },
  {
    table: "jobs",
    sort: "scheduled_at",
    searchColumns: ["job_number", "service_address", "city"],
    searchFrom: (row) => row.job_number,
    label: "jobs",
  },
  {
    table: "expenses",
    sort: "created_at",
    searchColumns: ["expense_number", "merchant"],
    searchFrom: (row) => row.expense_number,
    label: "expenses",
  },
  {
    table: "leads",
    sort: "created_at",
    searchColumns: ["first_name", "last_name", "email"],
    searchFrom: (row) => row.last_name,
    label: "leads",
  },
];

/** The lifecycle scope the "active" list uses, applied identically to walk and count. */
function activeScope(query) {
  return query.is("deleted_at", null).is("archived_at", null);
}

async function walkSurface(companyId, surface) {
  const { table, sort } = surface;

  const { count: total, error: countError } = await activeScope(
    admin.from(table).select("id", { count: "exact", head: true }).eq("company_id", companyId),
  );
  if (countError) {
    check(`${surface.label}: exact count`, false, countError.message);
    return;
  }

  const seen = new Set();
  let duplicates = 0;
  let cursor = null;
  let pages = 0;
  let lastRow = null;

  for (;;) {
    let query = activeScope(
      admin.from(table).select(`id, ${sort}`).eq("company_id", companyId),
    );

    const decoded = decodeCursor(cursor);
    if (decoded) query = query.or(buildKeysetFilter(sort, "desc", decoded));

    const { data, error } = await query
      .order(sort, { ascending: false })
      .order("id", { ascending: false })
      .limit(PAGE_SIZE + 1);

    if (error) {
      check(`${surface.label}: walk completes`, false, error.message);
      return;
    }

    const hasMore = data.length > PAGE_SIZE;
    const rows = hasMore ? data.slice(0, PAGE_SIZE) : data;
    for (const row of rows) {
      if (seen.has(row.id)) duplicates += 1;
      seen.add(row.id);
      lastRow = row;
    }
    pages += 1;

    if (!hasMore) break;
    const last = rows[rows.length - 1];
    cursor = encodeCursor(last[sort], last.id);

    if (pages > 1000) {
      check(`${surface.label}: walk terminates`, false, "over 1000 pages — cursor not advancing");
      return;
    }
  }

  check(
    `${surface.label}: walk visits every row (${seen.size} of ${total}, ${pages} pages)`,
    seen.size === total,
    `walk saw ${seen.size}, exact count says ${total}` +
      (seen.size === 1000 ? " — 1000 is the old PostgREST ceiling, so this looks like the original bug" : ""),
  );
  check(`${surface.label}: no duplicates across pages`, duplicates === 0, `${duplicates} repeats`);

  if (total === 0) return;

  // The last row the walk yielded must be the genuinely oldest row.
  const { data: oldest } = await activeScope(
    admin.from(table).select(`id, ${sort}`).eq("company_id", companyId),
  )
    .order(sort, { ascending: true })
    .order("id", { ascending: true })
    .limit(1)
    .single();

  check(
    `${surface.label}: walk reaches the oldest row`,
    Boolean(oldest) && seen.has(oldest.id),
    "the oldest row was never visited — this is the truncation symptom",
  );
  check(
    `${surface.label}: walk ends exactly on it`,
    lastRow?.id === oldest?.id,
    `ended on ${lastRow?.id}, oldest is ${oldest?.id}`,
  );

  // Server-side search must find a row that page 1 never contained.
  const { data: oldestFull } = await admin
    .from(table)
    .select("*")
    .eq("id", oldest.id)
    .single();

  const raw = surface.searchFrom(oldestFull);
  const term = normalizeSearchTerm(typeof raw === "string" ? raw : null);
  if (!term) return;

  const { data: found, error: searchError } = await activeScope(
    admin.from(table).select("id").eq("company_id", companyId),
  )
    .or(buildSearchFilter(surface.searchColumns, term))
    .limit(PAGE_SIZE);

  check(
    `${surface.label}: server-side search finds that oldest row`,
    !searchError && (found ?? []).some((r) => r.id === oldest.id),
    searchError ? searchError.message : `search for "${term}" did not return it`,
  );
}

async function main() {
  console.log(`\nTarget project: ${ref}`);

  const { data: seeded } = await admin
    .from("companies")
    .select("id, name")
    .like("slug", "loadtest-2%")
    .limit(1)
    .maybeSingle();

  if (!seeded) {
    console.error(
      "\nNo seeded load-test tenant found. Run scripts/loadtest-seed.mjs first —\n" +
        "walking a small tenant proves nothing, which is how the original bug survived.\n",
    );
    process.exit(1);
  }

  console.log(`Tenant:         ${seeded.name}\n`);

  for (const surface of SURFACES) {
    console.log(`Walking ${surface.label}...`);
    await walkSurface(seeded.id, surface);
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} pagination checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
