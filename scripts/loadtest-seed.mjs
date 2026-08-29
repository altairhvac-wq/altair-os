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
/**
 * Technician accounts this script creates.
 *
 * It creates auth users, which the owner path deliberately does not. The
 * difference is ownership: the owner is an account a person signs in with, so
 * the script refuses to invent one. These are fixtures — jobs.assigned_technician_id
 * and time_entries.technician_id are both foreign keys to profiles, profiles.id
 * is a foreign key to auth.users, so a labour fixture is impossible without
 * them. They carry the load-test label in the address, use an unroutable
 * .invalid domain, and --clean removes them.
 */
const TECHNICIAN_EMAIL_PREFIX = "loadtest-tech-";
const TECHNICIAN_EMAIL_DOMAIN = "@loadtest.invalid";
const DEFAULT_TECHNICIAN_COUNT = 6;

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
// Technicians, payments and labour
//
// ============================== WHY THESE WERE MISSING ==============================
// The first version of this seeder produced customers, jobs, invoices,
// estimates, expenses and leads -- every table the LIST pages read. It produced
// no invoice_payments and no time_entries, and left assigned_technician_id,
// completed_at and work_started_at null on every job.
//
// That is most of the money path. On the seeded tenant:
//
//   kpis.revenue                     sum of payments in period    -> $0
//   kpis.averageTicket               mean payment                 -> null
//   accountantSummary.*              collected, tax, method split -> $0 / empty
//   operationsSnapshot.topCustomers  grouped by payment           -> empty
//   technicianProfitability          assignment + labour + rate   -> empty
//   workCompleted.avgCompletion      workStartedAt + completedAt  -> null
//
// So the fixture that exists to prove the reports page could not exercise the
// figures the reports page is FOR. Every one of them returned the same value
// whether the code was right or wrong, which is the worst property a fixture
// can have: it is quiet either way.
//
// The generators below fill that in, and deliberately include the awkward cases
// rather than a clean sweep -- a technician with no labour rate, completed jobs
// with no completedAt, completed jobs with no workStartedAt, invoices settled
// across two payments -- because those are the branches that decide whether a
// figure is null, skipped, or counted twice.
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = [
  ["card", 44],
  ["check", 22],
  ["bank_transfer", 16],
  ["cash", 12],
  ["other", 6],
];

function technicianEmail(slug, index) {
  return `${TECHNICIAN_EMAIL_PREFIX}${slug}-${index}${TECHNICIAN_EMAIL_DOMAIN}`;
}

/**
 * Creates the technician auth users, profiles and memberships.
 *
 * One technician is left WITHOUT a labour cost rate on purpose. Technician
 * gross profit is null when the rate is missing and a number when it is
 * present, and the reports page adds a limitation line for the null case; a
 * fixture where every technician has a rate never renders that branch.
 */
async function seedTechnicians(client, { companyId, slug, count, rnd, asOf }) {
  const technicians = [];

  for (let i = 0; i < count; i += 1) {
    const email = technicianEmail(slug, i);
    const password = `Loadtest!tech-${slug}-${i}`;

    let userId = null;
    const { data: created, error: createError } =
      await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) {
      // Re-running against a project that still holds the accounts is not a
      // failure; find the existing one rather than aborting the seed.
      if (!/already been registered|already exists/i.test(createError.message)) {
        throw new Error(`create technician ${i}: ${createError.message}`);
      }
      const { data: existing } = await client
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();
      if (!existing) {
        throw new Error(`create technician ${i}: ${createError.message}`);
      }
      userId = existing.id;
    } else {
      userId = created.user.id;
    }

    const fullName = `${COMPANY_NAME_PREFIX} Tech ${rnd.pick(FIRST_NAMES)} ${i}`;
    const { error: profileError } = await client
      .from("profiles")
      .upsert({ id: userId, email, full_name: fullName });
    if (profileError) {
      throw new Error(`technician profile ${i}: ${profileError.message}`);
    }

    const { error: membershipError } = await client
      .from("company_memberships")
      .insert({
        company_id: companyId,
        user_id: userId,
        role: "technician",
        status: "active",
        joined_at: asOf.toISOString(),
        // The last technician has no rate. See the note above.
        labor_cost_rate_cents: i === count - 1 ? null : rnd.int(2800, 6500),
      });
    if (membershipError) {
      throw new Error(`technician membership ${i}: ${membershipError.message}`);
    }

    technicians.push({ id: userId, name: fullName });
  }

  // One more, whose membership is suspended rather than active. Jobs assigned
  // to them are what makes invalid_assigned_technician reachable at all --
  // is_active_company_member is false for a suspended row, and the rule tests
  // exactly that.
  const removedEmail = technicianEmail(slug, "removed");
  let removedId = null;
  const { data: removedCreated, error: removedError } =
    await client.auth.admin.createUser({
      email: removedEmail,
      password: `Loadtest!tech-${slug}-removed`,
      email_confirm: true,
    });
  if (removedError) {
    if (!/already been registered|already exists/i.test(removedError.message)) {
      throw new Error(`create removed technician: ${removedError.message}`);
    }
    const { data: existing } = await client
      .from("profiles")
      .select("id")
      .eq("email", removedEmail)
      .maybeSingle();
    removedId = existing?.id ?? null;
  } else {
    removedId = removedCreated.user.id;
  }

  let removedTechnician = null;
  if (removedId) {
    await client
      .from("profiles")
      .upsert({
        id: removedId,
        email: removedEmail,
        full_name: `${COMPANY_NAME_PREFIX} Tech Departed`,
      });
    const { error: removedMembershipError } = await client
      .from("company_memberships")
      .insert({
        company_id: companyId,
        user_id: removedId,
        role: "technician",
        status: "suspended",
        joined_at: asOf.toISOString(),
        labor_cost_rate_cents: 3900,
      });
    if (removedMembershipError) {
      throw new Error(
        `removed technician membership: ${removedMembershipError.message}`,
      );
    }
    removedTechnician = { id: removedId, name: "Departed" };
  }

  console.log(
    `    technicians: ${technicians.length} active` +
      (removedTechnician ? " + 1 suspended" : ""),
  );
  return { technicians, removedTechnician };
}

/** Removes only accounts whose address carries both load-test markers. */
async function cleanTechnicianAccounts(client, slug) {
  const prefix = `${TECHNICIAN_EMAIL_PREFIX}${slug}-`;
  const { data, error } = await client
    .from("profiles")
    .select("id, email")
    .like("email", `${prefix}%`);
  if (error) throw new Error(`technician lookup: ${error.message}`);

  let removed = 0;
  for (const row of data ?? []) {
    if (!row.email.startsWith(prefix)) continue;
    if (!row.email.endsWith(TECHNICIAN_EMAIL_DOMAIN)) continue;
    const { error: deleteError } = await client.auth.admin.deleteUser(row.id);
    if (deleteError && !/not found/i.test(deleteError.message)) {
      throw new Error(`delete technician ${row.email}: ${deleteError.message}`);
    }
    removed += 1;
  }
  if (removed > 0) {
    process.stdout.write(`    cleared ${removed} technician accounts\n`);
  }
}

/**
 * Payment rows that reconcile to the invoice they belong to.
 *
 * amount_paid was already being written on the invoice; the ledger that is
 * supposed to explain it did not exist. A reports fixture where
 * sum(invoice_payments.amount) does not equal sum(invoices.amount_paid) is
 * worse than no fixture at all, because collected revenue and cash health would
 * disagree for a reason that has nothing to do with the code under test.
 *
 * Paid invoices settle in one or two payments; the two-payment case is the one
 * that catches code counting invoices where it means payments.
 */
function buildInvoicePayments({
  invoices,
  companyId,
  ownerUserId,
  seedValue,
  rnd,
  asOf,
}) {
  const payments = [];

  for (const invoice of invoices) {
    if (!(invoice.amount_paid > 0)) continue;
    if (invoice.status === "void" || invoice.status === "cancelled") continue;

    const issuedOffset = Math.round(
      (new Date(invoice.issue_date).getTime() - asOf.getTime()) / 86_400_000,
    );
    const split = invoice.status === "paid" && rnd.next() < 0.25;
    const first = split
      ? Math.round(invoice.amount_paid * 0.55 * 100) / 100
      : invoice.amount_paid;
    const rest = Math.round((invoice.amount_paid - first) * 100) / 100;
    const parts = rest > 0 ? [first, rest] : [first];

    parts.forEach((amount, index) => {
      const offset = Math.min(0, issuedOffset + rnd.int(1, 40) + index * 7);
      payments.push({
        id: deterministicUuid(seedValue, "payment", payments.length),
        company_id: companyId,
        invoice_id: invoice.id,
        amount,
        payment_method: rnd.weighted(PAYMENT_METHODS),
        payment_date: dateOnlyAtOffsetDays(asOf, offset),
        recorded_by: ownerUserId,
        source: "manual",
        status: "succeeded",
        created_at: isoAtOffsetDays(asOf, offset),
      });
    });
  }

  return payments;
}

/**
 * Completion timestamps and technician assignment, applied to the job rows
 * before they are inserted.
 *
 * Roughly one completed job in six gets no completedAt, which sends
 * jobCompletedInBounds down its scheduledDate fallback, and one in five no
 * workStartedAt, which is the branch deciding whether a job contributes to
 * average completion time. Both fallbacks are shipped behaviour; neither was
 * reachable while the timestamps were null everywhere.
 */
function applyJobCompletion(jobs, { technicians, rnd, asOf }) {
  for (const job of jobs) {
    if (technicians.length > 0 && rnd.next() < 0.92) {
      job.assigned_technician_id = rnd.pick(technicians).id;
    }

    if (job.status !== "completed") continue;

    const scheduled = new Date(job.scheduled_at).getTime();
    if (!Number.isFinite(scheduled) || scheduled > asOf.getTime()) continue;

    if (rnd.next() >= 0.84) continue;

    const workHours = rnd.int(1, 9);
    const started = scheduled + rnd.int(0, 180) * 60_000;
    if (rnd.next() < 0.8) {
      job.work_started_at = new Date(started).toISOString();
    }
    job.completed_at = new Date(started + workHours * 3_600_000).toISOString();
  }
}

/** job_labor entries for completed, assigned jobs. */
function buildTimeEntries({ jobs, companyId, seedValue, rnd, asOf }) {
  const entries = [];

  for (const job of jobs) {
    if (job.status !== "completed" || !job.assigned_technician_id) continue;
    if (rnd.next() > 0.75) continue;

    const ended = new Date(job.completed_at ?? job.scheduled_at).getTime();
    if (!Number.isFinite(ended) || ended > asOf.getTime()) continue;

    const minutes = rnd.int(45, 480);
    const started = ended - minutes * 60_000;

    entries.push({
      id: deterministicUuid(seedValue, "labor", entries.length),
      company_id: companyId,
      technician_id: job.assigned_technician_id,
      job_id: job.id,
      entry_type: "job_labor",
      started_at: new Date(started).toISOString(),
      ended_at: new Date(ended).toISOString(),
      duration_minutes: minutes,
      created_at: new Date(started).toISOString(),
      updated_at: new Date(ended).toISOString(),
    });
  }

  return entries;
}


// ---------------------------------------------------------------------------
// Dispatch, and the data-integrity signals
//
// ============================== WHY THIS IS HERE ==============================
// getCompanyOperationalInconsistenciesReport applies nine rules. On the fixture
// as it stood, exactly TWO of them could ever fire:
//
//   completed_missing_completed_at        1,498   (seeded deliberately)
//   job_assigned_without_active_dispatch  2,953   (every assigned open job,
//                                                  because dispatch_assignments
//                                                  was empty)
//   the other seven                           0
//
// Both numbers are artefacts of an absent table rather than a plausible tenant.
// A company that uses dispatch has assignment rows for its open work, so the
// second rule should be rare, not universal -- and the seven rules with no data
// at all returned the same answer whether the code was right or wrong.
//
// So dispatch is seeded normally, and each rule gets a small, deliberate
// population of genuine violations. The counts are small on purpose: this is a
// fixture for an INTEGRITY scan, and a tenant where a third of the jobs are
// broken would let a wrong implementation look right by sheer volume.
// ---------------------------------------------------------------------------

const INTEGRITY_TARGETS = {
  /** status not completed/cancelled, completed_at set. */
  completedAtStatusMismatch: 12,
  /** terminal job carrying an active assignment. */
  staleDispatchOnTerminal: 9,
  /** active assignment, job has no assigned technician. */
  dispatchWithoutAssignment: 7,
  /** active assignment for a different technician than the job. */
  technicianMismatch: 6,
  // NO concurrent-dispatch target. dispatch_assignments carries
  // dispatch_assignments_one_active_per_job_idx -- a unique index on job_id
  // WHERE status = 'active' -- so a second active assignment on the same job is
  // rejected by the database. Seeding one fails the insert outright, which is
  // how this was found.
  //
  // That makes detectOperationalInconsistencies' `activeAssignments.length > 1`
  // branch unreachable through any normal write path, and it also means
  // `activeAssignments[0]` is never ambiguous: there is at most one. The rule
  // stays in the detector as a guard against data loaded around the index, and
  // the aggregate reproduces it, but neither can be exercised by a fixture that
  // respects the schema.
  /** cancelled job with an open (never ended) labour entry. */
  openLaborOnCancelled: 5,
  /** amount_paid + balance_due != total. */
  invoiceBalanceMismatch: 8,
  /** assigned to a technician whose membership is not active. */
  invalidAssignedTechnician: 10,
};

/**
 * Dispatch rows for open assigned work, plus the deliberate violations.
 *
 * Mutates the in-memory job rows, so it runs BEFORE the jobs insert. Returns
 * the assignment rows to insert afterwards, because they carry a job_id foreign
 * key.
 */
function buildDispatchAndIntegritySignals(
  jobs,
  { technicians, removedTechnician, companyId, seedValue, rnd, asOf },
) {
  const assignments = [];
  if (technicians.length === 0) return assignments;

  const OPEN = (job) => job.status !== "completed" && job.status !== "cancelled";
  const openAssigned = jobs.filter((job) => OPEN(job) && job.assigned_technician_id);
  const terminal = jobs.filter((job) => !OPEN(job));
  const cancelled = jobs.filter((job) => job.status === "cancelled");

  let cursor = 0;
  const take = (list, n) => list.slice(cursor, cursor + n);

  function pushAssignment(job, technicianId, status) {
    assignments.push({
      id: deterministicUuid(seedValue, "dispatch", assignments.length),
      company_id: companyId,
      job_id: job.id,
      technician_id: technicianId,
      status,
      scheduled_start: job.scheduled_at,
      assigned_at: job.scheduled_at,
      sort_order: 0,
    });
  }

  // ---- the normal case: open assigned work has an active assignment --------
  // A handful are left without one on purpose, so
  // job_assigned_without_active_dispatch has a realistic population rather than
  // being either universal or empty.
  const missingDispatch = new Set(
    openAssigned.slice(0, 11).map((job) => job.id),
  );
  for (const job of openAssigned) {
    if (missingDispatch.has(job.id)) continue;
    pushAssignment(job, job.assigned_technician_id, "active");
  }

  // ---- completed_at on a job that is neither completed nor cancelled -------
  const openForMismatch = jobs.filter(
    (job) => OPEN(job) && job.completed_at == null,
  );
  for (const job of openForMismatch.slice(0, INTEGRITY_TARGETS.completedAtStatusMismatch)) {
    const scheduled = new Date(job.scheduled_at).getTime();
    if (scheduled > asOf.getTime()) continue;
    job.completed_at = new Date(scheduled + 3 * 3_600_000).toISOString();
  }

  // ---- active assignment left on a terminal job ---------------------------
  for (const job of take(terminal, INTEGRITY_TARGETS.staleDispatchOnTerminal)) {
    pushAssignment(job, rnd.pick(technicians).id, "active");
  }
  cursor += INTEGRITY_TARGETS.staleDispatchOnTerminal;

  // ---- active assignment, no technician on the job ------------------------
  const openUnassigned = jobs.filter((job) => OPEN(job) && !job.assigned_technician_id);
  for (const job of openUnassigned.slice(0, INTEGRITY_TARGETS.dispatchWithoutAssignment)) {
    pushAssignment(job, rnd.pick(technicians).id, "active");
  }

  // ---- assignment names a different technician than the job ---------------
  // Skips the ones already left without a dispatch row, or the job would be
  // counted by two rules and the fixture would stop isolating them.
  const mismatchCandidates = openAssigned.filter(
    (job) => !missingDispatch.has(job.id),
  );
  for (const job of mismatchCandidates.slice(0, INTEGRITY_TARGETS.technicianMismatch)) {
    const other = technicians.find((tech) => tech.id !== job.assigned_technician_id);
    if (!other) continue;
    const existing = assignments.find(
      (row) => row.job_id === job.id && row.status === "active",
    );
    if (existing) existing.technician_id = other.id;
  }

  // ---- assigned to a member who is no longer active -----------------------
  if (removedTechnician) {
    const from = INTEGRITY_TARGETS.technicianMismatch;
    for (const job of mismatchCandidates.slice(
      from,
      from + INTEGRITY_TARGETS.invalidAssignedTechnician,
    )) {
      job.assigned_technician_id = removedTechnician.id;
      const existing = assignments.find(
        (row) => row.job_id === job.id && row.status === "active",
      );
      if (existing) existing.technician_id = removedTechnician.id;
    }
  }

  void cancelled;
  return assignments;
}

/** Open (never-ended) labour entries on cancelled jobs. */
function buildOpenLaborOnCancelledJobs(
  jobs,
  { technicians, companyId, seedValue, startIndex },
) {
  const entries = [];
  if (technicians.length === 0) return entries;

  const cancelled = jobs
    .filter((job) => job.status === "cancelled")
    .slice(0, INTEGRITY_TARGETS.openLaborOnCancelled);

  for (const job of cancelled) {
    entries.push({
      id: deterministicUuid(seedValue, "labor", startIndex + entries.length),
      company_id: companyId,
      technician_id: technicians[entries.length % technicians.length].id,
      job_id: job.id,
      entry_type: "job_labor",
      started_at: job.scheduled_at,
      ended_at: null,
      duration_minutes: null,
      created_at: job.scheduled_at,
      updated_at: job.scheduled_at,
    });
  }

  return entries;
}

/**
 * Breaks the balance identity on a few invoices.
 *
 * isInvoiceBalanceConsistent is amount_paid + balance_due === total, so this
 * moves balance_due without touching total. It runs before the insert, and the
 * payment ledger is built from amount_paid, which is left alone -- so the
 * ledger still reconciles and only the identity this rule tests is broken.
 */
function applyInvoiceBalanceMismatches(invoices) {
  const eligible = invoices.filter(
    (invoice) =>
      ["sent", "partially_paid", "paid", "overdue"].includes(invoice.status) &&
      invoice.job_id != null,
  );

  for (const invoice of eligible.slice(0, INTEGRITY_TARGETS.invoiceBalanceMismatch)) {
    invoice.balance_due = Math.round((invoice.balance_due + 12.34) * 100) / 100;
  }
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
  "company_subscriptions",
  "dispatch_assignments",
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

/**
 * Remove load-test tenants.
 *
 * `--seed-value` scopes it to one. Without it, every load-test tenant goes.
 *
 * That distinction was missing and cost a fixture: --clean accepted
 * --seed-value, ignored it, and removed both seeded tenants when the operator
 * had named one. Containment held — nothing outside the load-test name AND slug
 * prefix is ever touched — but an argument that is accepted and ignored is
 * worse than one that is rejected, because the operator has no way to tell.
 */
async function runClean(client, seedValue = null) {
  let query = client
    .from("companies")
    .select("id, name, slug")
    .like("slug", `${COMPANY_SLUG_PREFIX}%`)
    .like("name", `${COMPANY_NAME_PREFIX}%`);

  if (seedValue != null) {
    query = query.eq("slug", `${COMPANY_SLUG_PREFIX}${seedValue}`);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    console.log(
      seedValue != null
        ? `\nNothing to clean: no load-test company with slug ` +
            `"${COMPANY_SLUG_PREFIX}${seedValue}".\n`
        : "\nNothing to clean: no company matches both the load-test name and slug prefix.\n",
    );
    return;
  }

  if (seedValue == null && data.length > 1) {
    console.log(
      `\n${data.length} load-test tenants match. All of them will be removed.\n` +
        `  Pass --seed-value <n> to remove only one.`,
    );
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
    // Technician auth users are removed after the memberships that referenced
    // them, and only ones whose address carries both load-test markers.
    await cleanTechnicianAccounts(client, company.slug);

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
  const technicianCount = Number.parseInt(
    String(args.technicians ?? DEFAULT_TECHNICIAN_COUNT),
    10,
  );
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
      `estimates=${estimateCount} expenses=${expenseCount} leads=${leadCount} ` +
      `technicians=${technicianCount}`,
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

  // ---- app access -----------------------------------------------------------
  //
  // Without this row the whole application redirects to /activate-subscription
  // and the tenant cannot be benchmarked or viewed at all. The first seeded
  // tenant needed the row added by hand afterwards, and nothing recorded that
  // it had been -- so the second one redirected on every request and the
  // benchmark reported an 8-second 307 as if it were a page.
  //
  // beta_comped is the grant the shipped policy already treats as full access
  // (companyHasFullApplicationAccess); no Stripe object is created or
  // referenced, so this touches nothing outside the database.
  const { error: subscriptionError } = await client
    .from("company_subscriptions")
    .insert({
      company_id: companyId,
      plan_key: "beta",
      status: "active",
      access_grant: "beta_comped",
    });
  if (subscriptionError) {
    throw new Error(`create subscription: ${subscriptionError.message}`);
  }
  console.log("    app access: beta_comped");

  const { technicians, removedTechnician } = await seedTechnicians(client, {
    companyId,
    slug,
    count: technicianCount,
    rnd,
    asOf,
  });

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
  // Assignment and completion timestamps are applied to the in-memory rows
  // before the insert, so the seed stays a single write per table.
  applyJobCompletion(jobs, { technicians, rnd, asOf });
  // Mutates the job rows (completed_at, assigned_technician_id) and returns the
  // dispatch rows, which are inserted after the jobs they reference.
  const dispatchAssignments = buildDispatchAndIntegritySignals(jobs, {
    technicians,
    removedTechnician,
    companyId,
    seedValue,
    rnd,
    asOf,
  });
  await insertChunked(client, "jobs", jobs, "jobs");
  await insertChunked(
    client,
    "dispatch_assignments",
    dispatchAssignments,
    "dispatch assignments",
  );

  // ---- invoices ------------------------------------------------------------
  //
  // Status mix is chosen so the dashboard's attention queues are non-empty:
  // overdue, unpaid-follow-up, unsent drafts and paid all appear at realistic
  // proportions. That matters — a benchmark against 10,000 rows that all fall
  // out of every filter measures nothing.
  const invoices = [];
  const invoiceLineItems = [];
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
      status,
      subtotal,
      tax_amount: tax,
      total,
      amount_paid: amountPaid,
      balance_due: Math.round((total - amountPaid) * 100) / 100,
      issue_date: dateOnlyAtOffsetDays(asOf, issuedOffset),
      // Overdue rows get a due date safely in the past so they satisfy the
      // dashboard's overdue predicate without depending on run date.
      due_date: dateOnlyAtOffsetDays(
        asOf,
        status === "overdue" ? issuedOffset + 15 : issuedOffset + rnd.int(15, 60),
      ),
      created_at: isoAtOffsetDays(asOf, issuedOffset),
    });
    // Line items live in their own table, not a jsonb column on the invoice.
    invoiceLineItems.push(
      ...items.map((item, index) => ({
        company_id: companyId,
        invoice_id: deterministicUuid(seedValue, "invoice", i),
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.total,
        taxable: true,
        sort_order: index,
      })),
    );
  }
  applyInvoiceBalanceMismatches(invoices);
  await insertChunked(client, "invoices", invoices, "invoices");
  await insertChunked(
    client,
    "invoice_line_items",
    invoiceLineItems,
    "invoice line items",
  );

  const invoicePayments = buildInvoicePayments({
    invoices,
    companyId,
    ownerUserId,
    seedValue,
    rnd,
    asOf,
  });
  await insertChunked(
    client,
    "invoice_payments",
    invoicePayments,
    "invoice payments",
  );

  // ---- estimates -----------------------------------------------------------
  const estimates = [];
  const estimateLineItems = [];
  for (let i = 0; i < estimateCount; i += 1) {
    const items = buildLineItems(rnd, rnd.int(1, 4));
    const { subtotal, tax, total } = totalsFromLineItems(items, 0.081);
    estimates.push({
      id: deterministicUuid(seedValue, "estimate", i),
      company_id: companyId,
      customer_id: rnd.pick(customerIds),
      job_id: rnd.next() < 0.5 ? rnd.pick(jobIds) : null,
      estimate_number: `EST-${900000 + i}`,
      // Every label here must exist in public.estimate_status: draft, sent,
      // approved, declined, cancelled, converted. There is no "expired".
      status: rnd.weighted([
        ["approved", 34], ["sent", 26], ["draft", 18],
        ["declined", 10], ["converted", 8], ["cancelled", 4],
      ]),
      subtotal,
      tax,
      total,
      created_at: isoAtOffsetDays(asOf, -rnd.int(1, 900)),
    });
    estimateLineItems.push(
      ...items.map((item, index) => ({
        company_id: companyId,
        estimate_id: deterministicUuid(seedValue, "estimate", i),
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        taxable: true,
        sort_order: index,
      })),
    );
  }
  await insertChunked(client, "estimates", estimates, "estimates");
  await insertChunked(
    client,
    "estimate_line_items",
    estimateLineItems,
    "estimate line items",
  );

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

  const timeEntries = buildTimeEntries({
    jobs,
    companyId,
    seedValue,
    rnd,
    asOf,
  });
  timeEntries.push(
    ...buildOpenLaborOnCancelledJobs(jobs, {
      technicians,
      companyId,
      seedValue,
      startIndex: timeEntries.length,
    }),
  );
  await insertChunked(client, "time_entries", timeEntries, "labour entries");

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
      // public.lead_status is new, contacted, scheduled, estimate_sent, won,
      // lost. There is no "qualified".
      status: rnd.weighted([
        ["new", 30], ["contacted", 26], ["scheduled", 10],
        ["estimate_sent", 8], ["won", 14], ["lost", 12],
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
  if (args.clean) {
    // Only when the operator actually passed it — the seeding default must not
    // silently narrow a clean that was meant to be a sweep.
    const cleanSeed =
      args["seed-value"] != null ? String(args["seed-value"]) : null;
    return runClean(client, cleanSeed);
  }
  return runSeed(client, args);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
