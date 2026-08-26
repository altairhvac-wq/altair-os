/**
 * Phase 4 load-test tenant seeder.
 *
 * Creates one clearly-labelled tenant carrying production-scale data so the
 * dashboard and list pages can be measured before and after the Phase 4
 * scalability work. It is a MEASUREMENT tool, not a demo tool: the rows it
 * writes are ordinary rows (is_demo = false, standalone document numbers) so
 * every query under test behaves exactly as it would for a real customer who
 * imported three years of history.
 *
 * ============================ HOW IT REFUSES TO TOUCH PRODUCTION ============================
 *
 * Four independent guards, three of which are about TARGETING and one about
 * CONTAINMENT. The containment guard is the important one, because targeting
 * guards only help if you notice you got them wrong.
 *
 *   1. SEPARATE CREDENTIAL NAMES. This script reads ALTAIR_LOADTEST_SUPABASE_URL
 *      and ALTAIR_LOADTEST_SERVICE_ROLE_KEY, and NOTHING ELSE. It never reads
 *      NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY, and it does not
 *      load .env.local into the environment. Running it in a normal checkout
 *      with production credentials present does nothing at all — there is no
 *      variable for it to pick up.
 *
 *   2. .env.local COLLISION CHECK. If a .env.local exists and its Supabase URL
 *      matches the target, the script refuses. That is the signature of
 *      "someone copied the production values into the load-test variables".
 *
 *   3. EXPLICIT PROJECT-REF CONFIRMATION. --confirm <ref> must match the
 *      project ref parsed out of the target URL. You cannot run it without
 *      typing the identity of the project you are about to write to.
 *
 *   4. CONTAINMENT. Every row is scoped to a company this script creates, named
 *      "[LOADTEST] ..." with a slug beginning "loadtest-". It never writes to a
 *      pre-existing company. --clean only ever deletes companies matching BOTH
 *      the name prefix and the slug prefix. So even if guards 1–3 were all
 *      defeated, the worst outcome is a labelled extra tenant that --clean
 *      removes; no existing row is read for modification, updated, or deleted.
 *
 * ============================ NO EXTERNAL SIDE EFFECTS ============================
 *
 * Deliberately standalone. It imports @supabase/supabase-js and nothing from
 * lib/ or app/, which makes it structurally impossible for it to reach the
 * email, SMS, Stripe, AI or marketing-publish code paths — there is no import
 * edge to them. It performs plain INSERTs and does not call any RPC that
 * triggers side effects.
 *
 * ============================ DETERMINISM ============================
 *
 * All randomness comes from a seeded mulberry32 PRNG. The same --seed-value
 * produces byte-identical data, so a before/after benchmark compares like with
 * like. Dates are derived from --as-of (default: a fixed date) rather than
 * Date.now(), for the same reason.
 *
 * ============================ USAGE ============================
 *
 *   # 1. Restore a Supabase backup into a SCRATCH project, then:
 *   export ALTAIR_LOADTEST_SUPABASE_URL="https://<scratch-ref>.supabase.co"
 *   export ALTAIR_LOADTEST_SERVICE_ROLE_KEY="<scratch service role key>"
 *
 *   # 2. Find an existing auth user id in that project to own the tenant.
 *   node scripts/loadtest-seed.mjs --status --confirm <scratch-ref>
 *
 *   # 3. Seed.
 *   node scripts/loadtest-seed.mjs \
 *     --confirm <scratch-ref> \
 *     --owner-user-id <uuid> \
 *     --customers 5000 --invoices 10000
 *
 *   # 4. Measure (see scripts/loadtest-benchmark.mjs), then:
 *   node scripts/loadtest-seed.mjs --clean --confirm <scratch-ref>
 *
 * Documented in docs/development/load-testing.md.
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Labels — the containment guard depends on these being stable
// ---------------------------------------------------------------------------

const COMPANY_NAME_PREFIX = "[LOADTEST]";
const COMPANY_SLUG_PREFIX = "loadtest-";
const CUSTOMER_NAME_PREFIX = "[LOADTEST]";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";

const DEFAULT_SEED_VALUE = 20260826;
/** Fixed reference date so generated dates never drift between runs. */
const DEFAULT_AS_OF = "2026-08-26T12:00:00.000Z";

const INSERT_CHUNK = 500;

// ---------------------------------------------------------------------------
// Deterministic PRNG
// ---------------------------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRandom(seedValue) {
  const next = mulberry32(seedValue);
  return {
    next,
    int(minInclusive, maxInclusive) {
      return minInclusive + Math.floor(next() * (maxInclusive - minInclusive + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    /** Weighted pick: entries are [value, weight]. */
    weighted(entries) {
      const total = entries.reduce((sum, [, w]) => sum + w, 0);
      let roll = next() * total;
      for (const [value, weight] of entries) {
        roll -= weight;
        if (roll <= 0) return value;
      }
      return entries[entries.length - 1][0];
    },
    money(minCents, maxCents) {
      return Math.round(minInclusiveCents(minCents, maxCents, next)) / 100;
    },
  };
}

function minInclusiveCents(min, max, next) {
  return min + next() * (max - min);
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const nextToken = argv[i + 1];
    if (nextToken && !nextToken.startsWith("--")) {
      args[key] = nextToken;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function fail(message) {
  console.error(`\nREFUSED: ${message}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).host;
    const [ref] = host.split(".");
    return ref || null;
  } catch {
    return null;
  }
}

/** Reads .env.local WITHOUT putting anything into process.env. */
function readEnvLocalSupabaseUrl() {
  if (!existsSync(".env.local")) return null;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  if (!line) return null;
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

function resolveTarget(args) {
  const url = process.env[URL_ENV]?.trim();
  const key = process.env[KEY_ENV]?.trim();

  // GUARD 1 — dedicated credential names only.
  if (!url || !key) {
    fail(
      `${URL_ENV} and ${KEY_ENV} must both be set.\n\n` +
        `This script deliberately does NOT read NEXT_PUBLIC_SUPABASE_URL or\n` +
        `SUPABASE_SERVICE_ROLE_KEY, so it cannot pick up the application's own\n` +
        `(possibly production) credentials by accident. Point these two at a\n` +
        `SCRATCH project restored from a backup — never at production.`,
    );
  }

  const ref = projectRefFromUrl(url);
  if (!ref) fail(`${URL_ENV} is not a valid URL: ${url}`);

  // GUARD 2 — collision with the application's configured project.
  const appUrl = readEnvLocalSupabaseUrl();
  if (appUrl && appUrl === url) {
    fail(
      `${URL_ENV} is the SAME project as NEXT_PUBLIC_SUPABASE_URL in .env.local.\n\n` +
        `That is the project this application is configured to use, which is very\n` +
        `likely production. Restore a backup into a separate project and point\n` +
        `${URL_ENV} at that instead.`,
    );
  }

  // GUARD 3 — explicit confirmation of the target's identity.
  const confirm = typeof args.confirm === "string" ? args.confirm.trim() : "";
  if (!confirm) {
    fail(
      `--confirm <project-ref> is required.\n\n` +
        `The target project ref is "${ref}". Re-run with:\n` +
        `  --confirm ${ref}`,
    );
  }
  if (confirm !== ref) {
    fail(
      `--confirm "${confirm}" does not match the target project ref "${ref}".\n\n` +
        `Confirm the project you actually intend to write to.`,
    );
  }

  return { url, key, ref };
}

// ---------------------------------------------------------------------------
// Data generation
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  "James", "Maria", "Robert", "Linda", "Michael", "Patricia", "David", "Jennifer",
  "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah",
  "Charles", "Karen", "Daniel", "Nancy", "Matthew", "Lisa", "Anthony", "Betty",
];
const LAST_NAMES = [
  "Alvarez", "Bennett", "Carver", "Delgado", "Ellison", "Foster", "Grant", "Hayes",
  "Ibarra", "Jennings", "Keller", "Lindqvist", "Moreau", "Nakamura", "Okafor",
  "Pruitt", "Quintero", "Rasmussen", "Sandoval", "Thornton", "Underwood", "Vargas",
];
const STREETS = [
  "Alder Ct", "Birchwood Ln", "Cedar Hollow Rd", "Dunmore Ave", "Elmridge Dr",
  "Fairbanks St", "Glenmoor Way", "Harborview Rd", "Ironwood Ter", "Juniper Pl",
];
const CITIES = [
  ["Tucson", "AZ", "857"], ["Mesa", "AZ", "852"], ["Chandler", "AZ", "852"],
  ["Gilbert", "AZ", "852"], ["Peoria", "AZ", "853"], ["Surprise", "AZ", "853"],
];
const JOB_TYPES = [
  "AC Repair", "Furnace Tune-Up", "Heat Pump Install", "Duct Cleaning",
  "Thermostat Replacement", "Refrigerant Recharge", "Coil Replacement",
  "Seasonal Maintenance", "Emergency No-Cool", "Air Handler Service",
];
const MERCHANTS = [
  "Ferguson Supply", "Grainger", "Home Depot Pro", "Johnstone Supply",
  "SiteOne", "Shell", "Chevron", "Napa Auto Parts",
];
const EXPENSE_CATEGORIES = [
  "materials", "fuel", "tools", "meals", "lodging", "vehicle", "office", "other",
];

function isoAtOffsetDays(asOf, days) {
  return new Date(asOf.getTime() + days * 86_400_000).toISOString();
}

function dateOnlyAtOffsetDays(asOf, days) {
  return isoAtOffsetDays(asOf, days).slice(0, 10);
}

function buildLineItems(rnd, count) {
  const items = [];
  for (let i = 0; i < count; i += 1) {
    const quantity = rnd.int(1, 4);
    const unitPrice = Math.round(rnd.int(4_500, 68_000)) / 100;
    items.push({
      id: `li-${i}`,
      name: rnd.pick(JOB_TYPES),
      description: "Load-test line item",
      quantity,
      unitPrice,
      total: Math.round(quantity * unitPrice * 100) / 100,
    });
  }
  return items;
}

function totalsFromLineItems(items, taxRate) {
  const subtotal =
    Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

// ---------------------------------------------------------------------------
// Insert helper
// ---------------------------------------------------------------------------

async function insertChunked(client, table, rows, label) {
  let written = 0;
  for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
    const chunk = rows.slice(i, i + INSERT_CHUNK);
    const { error } = await client.from(table).insert(chunk);
    if (error) {
      throw new Error(
        `insert into ${table} failed at row ${i}: ${error.code ?? ""} ${error.message}`,
      );
    }
    written += chunk.length;
    process.stdout.write(`\r    ${label}: ${written}/${rows.length}   `);
  }
  process.stdout.write(`\r    ${label}: ${written}/${rows.length}   \n`);
  return written;
}

// ---------------------------------------------------------------------------
// Modes
// ---------------------------------------------------------------------------

async function runStatus(client) {
  console.log("\nLoad-test tenants in this project:");
  const { data, error } = await client
    .from("companies")
    .select("id, name, slug, created_at")
    .like("slug", `${COMPANY_SLUG_PREFIX}%`)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    console.log("  (none)");
  } else {
    for (const row of data) {
      const counts = await countsForCompany(client, row.id);
      console.log(
        `  ${row.slug}  ${row.id}\n` +
          `    customers=${counts.customers} jobs=${counts.jobs} ` +
          `invoices=${counts.invoices} estimates=${counts.estimates} expenses=${counts.expenses}`,
      );
    }
  }

  // Non-load-test companies are reported as a COUNT ONLY — never listed, never
  // touched. This exists so the operator can see at a glance whether they are
  // pointed at a restored copy with real tenants in it.
  const { count } = await client
    .from("companies")
    .select("id", { count: "exact", head: true })
    .not("slug", "like", `${COMPANY_SLUG_PREFIX}%`);
  console.log(`\n  other (non-load-test) companies present: ${count ?? 0}`);
  console.log("  this script never reads, updates, or deletes any of them.\n");
}

async function countsForCompany(client, companyId) {
  const tables = ["customers", "jobs", "invoices", "estimates", "expenses"];
  const result = {};
  for (const table of tables) {
    const { count } = await client
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId);
    result[table] = count ?? 0;
  }
  return result;
}

/**
 * Deletion order matters. jobs.customer_id and invoices.customer_id are
 * ON DELETE RESTRICT, so deleting the company and letting cascades race can
 * fail. Children are removed explicitly, deepest first.
 */
const CLEAN_ORDER = [
  "invoice_payments",
  "invoice_line_items",
  "estimate_line_items",
  "invoice_activities",
  "estimate_activities",
  "job_activities",
  "expense_activities",
  "customer_activities",
  "lead_activities",
  "time_entries",
  "dispatch_assignments",
  "expenses",
  "invoices",
  "estimates",
  "jobs",
  "leads",
  "customers",
  "company_document_counters",
  "company_memberships",
];

async function runClean(client) {
  const { data, error } = await client
    .from("companies")
    .select("id, name, slug")
    .like("slug", `${COMPANY_SLUG_PREFIX}%`)
    .like("name", `${COMPANY_NAME_PREFIX}%`);

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    console.log("\nNothing to clean: no company matches both the load-test name and slug prefix.\n");
    return;
  }

  for (const company of data) {
    console.log(`\nCleaning ${company.slug} (${company.id})`);
    for (const table of CLEAN_ORDER) {
      const { error: deleteError } = await client
        .from(table)
        .delete()
        .eq("company_id", company.id);
      if (deleteError) {
        // A table that does not exist in this schema version is not a failure.
        if (/does not exist|schema cache/i.test(deleteError.message)) continue;
        throw new Error(`delete from ${table}: ${deleteError.message}`);
      }
      process.stdout.write(`    cleared ${table}\n`);
    }
    const { error: companyError } = await client
      .from("companies")
      .delete()
      .eq("id", company.id)
      .like("slug", `${COMPANY_SLUG_PREFIX}%`);
    if (companyError) throw new Error(`delete company: ${companyError.message}`);
    console.log(`    removed company ${company.slug}`);
  }
  console.log("\nClean complete.\n");
}

async function runSeed(client, args) {
  const ownerUserId =
    typeof args["owner-user-id"] === "string" ? args["owner-user-id"].trim() : "";
  if (!ownerUserId) {
    fail(
      `--owner-user-id <uuid> is required.\n\n` +
        `It must be an EXISTING auth user in the target project — the account you\n` +
        `will sign in with to view the seeded dashboard. This script does not\n` +
        `create auth users. Run --status first, or read profiles.id from the\n` +
        `target project.`,
    );
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, email")
    .eq("id", ownerUserId)
    .maybeSingle();
  if (profileError) throw new Error(`profile lookup: ${profileError.message}`);
  if (!profile) {
    fail(
      `No profiles row for ${ownerUserId} in the target project.\n\n` +
        `Sign in to the scratch project once with that account so its profile\n` +
        `exists, then re-run.`,
    );
  }

  const customerCount = Number.parseInt(String(args.customers ?? 5000), 10);
  const invoiceCount = Number.parseInt(String(args.invoices ?? 10000), 10);
  const jobCount = Number.parseInt(String(args.jobs ?? Math.round(invoiceCount * 1.2)), 10);
  const estimateCount = Number.parseInt(String(args.estimates ?? Math.round(invoiceCount * 0.6)), 10);
  const expenseCount = Number.parseInt(String(args.expenses ?? 2000), 10);
  const leadCount = Number.parseInt(String(args.leads ?? 800), 10);
  const seedValue = Number.parseInt(String(args["seed-value"] ?? DEFAULT_SEED_VALUE), 10);
  const asOf = new Date(String(args["as-of"] ?? DEFAULT_AS_OF));

  if (!Number.isFinite(asOf.getTime())) fail("--as-of is not a valid date");

  const rnd = makeRandom(seedValue);
  const stamp = `${seedValue}`;
  const slug = `${COMPANY_SLUG_PREFIX}${stamp}`;

  const { data: existing } = await client
    .from("companies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existing) {
    fail(
      `A load-test company with slug "${slug}" already exists (${existing.id}).\n\n` +
        `Run --clean first, or pass a different --seed-value.`,
    );
  }

  console.log(`\nSeeding load-test tenant "${slug}"`);
  console.log(
    `  customers=${customerCount} jobs=${jobCount} invoices=${invoiceCount} ` +
      `estimates=${estimateCount} expenses=${expenseCount} leads=${leadCount}`,
  );
  console.log(`  deterministic seed=${seedValue}  as-of=${asOf.toISOString()}\n`);

  // ---- company + membership -----------------------------------------------
  const { data: company, error: companyError } = await client
    .from("companies")
    .insert({
      name: `${COMPANY_NAME_PREFIX} Scale Harness ${stamp}`,
      slug,
      trade: "hvac",
    })
    .select("id")
    .single();
  if (companyError) throw new Error(`create company: ${companyError.message}`);
  const companyId = company.id;
  console.log(`    company: ${companyId}`);

  const { error: membershipError } = await client
    .from("company_memberships")
    .insert({
      company_id: companyId,
      user_id: ownerUserId,
      role: "owner",
      status: "active",
      joined_at: asOf.toISOString(),
    });
  if (membershipError) throw new Error(`create membership: ${membershipError.message}`);
  console.log(`    membership: owner ${ownerUserId}`);

  // ---- customers -----------------------------------------------------------
  const customerIds = [];
  const customers = [];
  for (let i = 0; i < customerCount; i += 1) {
    const id = deterministicUuid(seedValue, "customer", i);
    customerIds.push(id);
    const [city, state, zipPrefix] = rnd.pick(CITIES);
    const first = rnd.pick(FIRST_NAMES);
    const last = rnd.pick(LAST_NAMES);
    customers.push({
      id,
      company_id: companyId,
      name: `${CUSTOMER_NAME_PREFIX} ${first} ${last} ${i}`,
      email: `loadtest+c${i}@example.invalid`,
      phone: `520555${String(1000 + (i % 9000)).padStart(4, "0")}`,
      status: rnd.weighted([["active", 78], ["inactive", 12], ["lead", 10]]),
      address_line1: `${rnd.int(100, 9899)} ${rnd.pick(STREETS)}`,
      city,
      state,
      postal_code: `${zipPrefix}${String(rnd.int(10, 99))}`,
      created_at: isoAtOffsetDays(asOf, -rnd.int(1, 1095)),
    });
  }
  await insertChunked(client, "customers", customers, "customers");

  // ---- jobs ----------------------------------------------------------------
  const jobIds = [];
  const jobs = [];
  for (let i = 0; i < jobCount; i += 1) {
    const id = deterministicUuid(seedValue, "job", i);
    jobIds.push(id);
    const [city, state, zipPrefix] = rnd.pick(CITIES);
    jobs.push({
      id,
      company_id: companyId,
      customer_id: rnd.pick(customerIds),
      // Standalone numbering, deliberately far above the historical base so it
      // cannot collide with anything the allocator produces for this tenant.
      job_number: `JOB-${900000 + i}`,
      service_address: `${rnd.int(100, 9899)} ${rnd.pick(STREETS)}`,
      city,
      state,
      postal_code: `${zipPrefix}${String(rnd.int(10, 99))}`,
      job_type: rnd.pick(JOB_TYPES),
      scheduled_at: isoAtOffsetDays(asOf, rnd.int(-900, 21)),
      status: rnd.weighted([
        ["completed", 70], ["scheduled", 14], ["in_progress", 6],
        ["dispatched", 6], ["cancelled", 4],
      ]),
      priority: rnd.weighted([["normal", 70], ["high", 18], ["low", 8], ["urgent", 4]]),
      created_at: isoAtOffsetDays(asOf, -rnd.int(1, 1000)),
    });
  }
  await insertChunked(client, "jobs", jobs, "jobs");

  // ---- invoices ------------------------------------------------------------
  //
  // Status mix is chosen so the dashboard's attention queues are non-empty:
  // overdue, unpaid-follow-up, unsent drafts and paid all appear at realistic
  // proportions. That matters — a benchmark against 10,000 rows that all fall
  // out of every filter measures nothing.
  const invoices = [];
  for (let i = 0; i < invoiceCount; i += 1) {
    const items = buildLineItems(rnd, rnd.int(1, 5));
    const { subtotal, tax, total } = totalsFromLineItems(items, 0.081);
    const status = rnd.weighted([
      ["paid", 58], ["sent", 14], ["overdue", 10], ["draft", 9],
      ["partially_paid", 5], ["viewed", 3], ["void", 1],
    ]);
    const issuedOffset = -rnd.int(1, 1000);
    const amountPaid =
      status === "paid"
        ? total
        : status === "partially_paid"
          ? Math.round(total * 0.4 * 100) / 100
          : 0;
    invoices.push({
      id: deterministicUuid(seedValue, "invoice", i),
      company_id: companyId,
      customer_id: rnd.pick(customerIds),
      job_id: rnd.next() < 0.8 ? rnd.pick(jobIds) : null,
      invoice_number: `INV-${900000 + i}`,
      job_type: rnd.pick(JOB_TYPES),
      status,
      line_items: items,
      subtotal,
      tax,
      total,
      amount_paid: amountPaid,
      balance_due: Math.round((total - amountPaid) * 100) / 100,
      issued_at: isoAtOffsetDays(asOf, issuedOffset),
      // Overdue rows get a due date safely in the past so they satisfy the
      // dashboard's overdue predicate without depending on run date.
      due_date: dateOnlyAtOffsetDays(
        asOf,
        status === "overdue" ? issuedOffset + 15 : issuedOffset + rnd.int(15, 60),
      ),
      created_at: isoAtOffsetDays(asOf, issuedOffset),
    });
  }
  await insertChunked(client, "invoices", invoices, "invoices");

  // ---- estimates -----------------------------------------------------------
  const estimates = [];
  for (let i = 0; i < estimateCount; i += 1) {
    const items = buildLineItems(rnd, rnd.int(1, 4));
    const { subtotal, tax, total } = totalsFromLineItems(items, 0.081);
    estimates.push({
      id: deterministicUuid(seedValue, "estimate", i),
      company_id: companyId,
      customer_id: rnd.pick(customerIds),
      job_id: rnd.next() < 0.5 ? rnd.pick(jobIds) : null,
      estimate_number: `EST-${900000 + i}`,
      status: rnd.weighted([
        ["approved", 34], ["sent", 26], ["draft", 18],
        ["declined", 10], ["converted", 8], ["expired", 4],
      ]),
      line_items: items,
      subtotal,
      tax,
      total,
      created_at: isoAtOffsetDays(asOf, -rnd.int(1, 900)),
    });
  }
  await insertChunked(client, "estimates", estimates, "estimates");

  // ---- expenses ------------------------------------------------------------
  const expenses = [];
  for (let i = 0; i < expenseCount; i += 1) {
    expenses.push({
      id: deterministicUuid(seedValue, "expense", i),
      company_id: companyId,
      technician_id: ownerUserId,
      job_id: rnd.next() < 0.7 ? rnd.pick(jobIds) : null,
      expense_number: `EXP-${900000 + i}`,
      amount: Math.round(rnd.int(850, 48_000)) / 100,
      purchase_date: dateOnlyAtOffsetDays(asOf, -rnd.int(1, 700)),
      merchant: rnd.pick(MERCHANTS),
      category: rnd.pick(EXPENSE_CATEGORIES),
      receipt_status: rnd.weighted([["attached", 72], ["missing", 22], ["pending", 6]]),
      status: rnd.weighted([
        ["approved", 46], ["submitted", 24], ["reimbursed", 20],
        ["draft", 8], ["rejected", 2],
      ]),
      created_at: isoAtOffsetDays(asOf, -rnd.int(1, 700)),
    });
  }
  await insertChunked(client, "expenses", expenses, "expenses");

  // ---- leads ---------------------------------------------------------------
  const leads = [];
  for (let i = 0; i < leadCount; i += 1) {
    const first = rnd.pick(FIRST_NAMES);
    const last = rnd.pick(LAST_NAMES);
    leads.push({
      id: deterministicUuid(seedValue, "lead", i),
      company_id: companyId,
      first_name: `${CUSTOMER_NAME_PREFIX} ${first}`,
      last_name: `${last} ${i}`,
      email: `loadtest+l${i}@example.invalid`,
      phone: `520444${String(1000 + (i % 9000)).padStart(4, "0")}`,
      source: "other",
      status: rnd.weighted([
        ["new", 30], ["contacted", 26], ["qualified", 18],
        ["won", 14], ["lost", 12],
      ]),
      created_at: isoAtOffsetDays(asOf, -rnd.int(1, 120)),
    });
  }
  await insertChunked(client, "leads", leads, "leads");

  console.log(`\nSeed complete for ${slug}.`);
  console.log(`  company_id: ${companyId}`);
  console.log(`\nNext: node scripts/loadtest-benchmark.mjs --company ${companyId}\n`);
}

/**
 * Deterministic UUIDv4-shaped identifier.
 *
 * Ids are generated rather than left to the database so a run is reproducible
 * end to end and so relationships (invoice -> customer) can be wired without a
 * round trip per row.
 */
function deterministicUuid(seedValue, kind, index) {
  const kindCode = [...kind].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const next = mulberry32((seedValue ^ kindCode ^ (index * 2654435761)) >>> 0);
  const hex = [];
  for (let i = 0; i < 16; i += 1) {
    hex.push(Math.floor(next() * 256).toString(16).padStart(2, "0"));
  }
  const bytes = hex.join("");
  return [
    bytes.slice(0, 8),
    bytes.slice(8, 12),
    `4${bytes.slice(13, 16)}`,
    ((parseInt(bytes.slice(16, 17), 16) & 0x3) | 0x8).toString(16) + bytes.slice(17, 20),
    bytes.slice(20, 32),
  ].join("-");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Generates the dataset and reports it without connecting to anything.
 *
 * Exists so the generator itself can be exercised — determinism, id shape,
 * status mix, referential wiring — with no project, no credentials and no
 * network. `verify-loadtest-harness.mjs` runs this, which is what makes the
 * harness safe to trust before it is ever pointed at a real project.
 */
function runDryRun(args) {
  const seedValue = Number.parseInt(String(args["seed-value"] ?? DEFAULT_SEED_VALUE), 10);
  const asOf = new Date(String(args["as-of"] ?? DEFAULT_AS_OF));
  const customerCount = Number.parseInt(String(args.customers ?? 5000), 10);
  const invoiceCount = Number.parseInt(String(args.invoices ?? 10000), 10);
  const rnd = makeRandom(seedValue);

  const customerIds = [];
  for (let i = 0; i < customerCount; i += 1) {
    customerIds.push(deterministicUuid(seedValue, "customer", i));
  }

  const statusCounts = {};
  let totalBilled = 0;
  let unpaidBalance = 0;
  const invoiceIds = [];
  for (let i = 0; i < invoiceCount; i += 1) {
    const items = buildLineItems(rnd, rnd.int(1, 5));
    const { total } = totalsFromLineItems(items, 0.081);
    const status = rnd.weighted([
      ["paid", 58], ["sent", 14], ["overdue", 10], ["draft", 9],
      ["partially_paid", 5], ["viewed", 3], ["void", 1],
    ]);
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    totalBilled += total;
    if (status !== "paid" && status !== "void") unpaidBalance += total;
    invoiceIds.push(deterministicUuid(seedValue, "invoice", i));
  }

  return {
    seedValue,
    asOf: asOf.toISOString(),
    customerCount,
    invoiceCount,
    uniqueCustomerIds: new Set(customerIds).size,
    uniqueInvoiceIds: new Set(invoiceIds).size,
    firstCustomerId: customerIds[0],
    firstInvoiceId: invoiceIds[0],
    statusCounts,
    totalBilled: Math.round(totalBilled * 100) / 100,
    unpaidBalance: Math.round(unpaidBalance * 100) / 100,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // --dry-run bypasses every guard because it bypasses every connection: no
  // client is constructed and no credential is read.
  if (args["dry-run"]) {
    const report = runDryRun(args);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const target = resolveTarget(args);

  console.log(`\nTarget project: ${target.ref}  (${target.url})`);
  console.log("Containment: only companies named " +
    `"${COMPANY_NAME_PREFIX} …" with slug "${COMPANY_SLUG_PREFIX}…" are ever written or removed.`);

  const client = createClient(target.url, target.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (args.status) return runStatus(client);
  if (args.clean) return runClean(client);
  return runSeed(client, args);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
