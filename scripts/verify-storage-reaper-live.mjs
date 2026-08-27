/**
 * Orphan reaper classification verification (Phase 4 / P1-12).
 *
 * ===================== WHY THIS EXISTS =====================
 * scripts/reap-orphaned-storage.mjs deletes customer files. Running it in
 * dry-run mode against a corpus that happens to contain no orphans proves only
 * that it does not crash — it says nothing about whether it can tell an orphan
 * from a live file. And the failure that matters is not "missed an orphan", it
 * is "deleted a receipt whose expense still exists".
 *
 * That failure has a specific, plausible cause worth naming: the reaper decides
 * a file is an orphan when it cannot find the owning row. Migrations 154 and 156
 * narrowed who can SEE those rows. A reaper holding anything other than a
 * service-role key would find no rows at all and classify the ENTIRE bucket as
 * orphaned. The consequence of that mistake is total, so it is asserted here
 * rather than assumed from reading the code.
 *
 * ===================== HOW =====================
 * It seeds a corpus in a scratch project where the correct answer is known for
 * every object — live, orphaned-and-old, orphaned-but-recent, and unparseable —
 * backdating storage.objects.created_at to exercise the grace period, then runs
 * the REAL reaper as a child process and asserts its summary counts moved by
 * exactly the expected amounts.
 *
 * Baselines are measured before seeding and compared as deltas, so a scratch
 * project that already contains orphans does not invalidate the result.
 *
 * The final phase runs the reaper for real, with deletion enabled, and confirms
 * that the seeded orphans are gone and every seeded live file survived.
 *
 * ===================== SAFETY =====================
 *   1. Reads ALTAIR_STORAGE_REAPER_SUPABASE_URL /
 *      ALTAIR_STORAGE_REAPER_SERVICE_ROLE_KEY only, plus a direct connection
 *      string in ALTAIR_SCRATCH_DB_URL for the one thing PostgREST cannot do
 *      (backdating storage.objects.created_at).
 *   2. Refuses if the target matches NEXT_PUBLIC_SUPABASE_URL in .env.local.
 *   3. --confirm <project-ref> must match the target.
 *   4. --destructive is required before the deletion phase runs at all. Without
 *      it the script stops after the dry-run assertions.
 *
 * The deletion phase deletes every orphan in the target bucket, not only the
 * seeded ones — that is what the reaper does. Only point it at scratch.
 *
 * Run:
 *   node scripts/verify-storage-reaper-live.mjs --confirm <ref>
 *   node scripts/verify-storage-reaper-live.mjs --confirm <ref> --destructive
 */

import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_STORAGE_REAPER_SUPABASE_URL";
const KEY_ENV = "ALTAIR_STORAGE_REAPER_SERVICE_ROLE_KEY";
const DB_ENV = "ALTAIR_SCRATCH_DB_URL";

const BUCKET = "company-files";
const COMPANY_SLUG_PREFIX = "loadtest-reaper-";
const RUN_ID = Math.random().toString(36).slice(2, 10);
const FILE_NAME = "receipt.jpg";

let failures = 0;
let checks = 0;

function check(name, condition, detail = "") {
  checks += 1;
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
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
  const dbUrl = process.env[DB_ENV]?.trim();

  if (!url || !key) fail(`${URL_ENV} and ${KEY_ENV} must both be set.`);
  if (!dbUrl) {
    fail(
      `${DB_ENV} must be set.\n\n` +
        `Backdating storage.objects.created_at is the only way to exercise the\n` +
        `grace period, and PostgREST does not expose the storage schema.`,
    );
  }

  let ref;
  try {
    ref = new URL(url).host.split(".")[0];
  } catch {
    fail(`${URL_ENV} is not a valid URL.`);
  }

  const appUrl = readEnvLocalSupabaseUrl();
  if (appUrl && appUrl === url) {
    fail(`${URL_ENV} is the same project as NEXT_PUBLIC_SUPABASE_URL. Use scratch.`);
  }
  if (!dbUrl.includes(ref)) {
    fail(`${DB_ENV} does not point at the same project as ${URL_ENV}.`);
  }

  const confirm = typeof args.confirm === "string" ? args.confirm.trim() : "";
  if (!confirm) fail(`--confirm <project-ref> is required. Target ref is "${ref}".`);
  if (confirm !== ref) {
    fail(`--confirm "${confirm}" does not match the target ref "${ref}".`);
  }

  return { url, key, ref, dbUrl };
}

/** Runs the real reaper and parses its summary block. */
function runReaper(ref, extraArgs = []) {
  const output = execFileSync(
    process.execPath,
    ["scripts/reap-orphaned-storage.mjs", "--confirm", ref, ...extraArgs],
    { encoding: "utf8", env: process.env },
  );

  const number = (label) => {
    const match = output.match(new RegExp(`${label}\\s*(\\d+)`));
    return match ? Number.parseInt(match[1], 10) : null;
  };

  return {
    output,
    live: number("live \\(owning row present\\):"),
    orphans: number("ORPHAN CANDIDATES:"),
    tooRecent: number("orphaned but within grace period:"),
    unknown: number("unrecognized path shape \\(skipped\\):"),
    errors: number("lookup errors \\(skipped\\):"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = resolveTarget(args);

  console.log(`\nTarget project: ${target.ref}`);
  console.log(`Run id:         ${RUN_ID}`);

  const admin = createClient(target.url, target.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // pg is a devDependency-free direct install in this checkout; import lazily so
  // the guard failures above happen before any connection is attempted.
  const { default: pg } = await import("pg");
  const db = new pg.Client({
    connectionString: target.dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  let fixture = null;
  try {
    console.log("\nMeasuring baseline before seeding...");
    const baseline = runReaper(target.ref);
    console.log(
      `  live=${baseline.live} orphans=${baseline.orphans} ` +
        `recent=${baseline.tooRecent} unknown=${baseline.unknown}`,
    );
    check(
      "the reaper reports no lookup errors on a clean corpus",
      baseline.errors === 0,
      `got ${baseline.errors} — a lookup error means rows are invisible to it`,
    );

    // ---------------------------------------------------------------------
    // Seed a corpus where the right answer is known for every object.
    // ---------------------------------------------------------------------
    console.log("\nSeeding corpus...");

    const { data: company, error: companyError } = await admin
      .from("companies")
      .insert({
        name: `[REAPER] Classification ${RUN_ID}`,
        slug: `${COMPANY_SLUG_PREFIX}${RUN_ID}`,
        trade: "hvac",
      })
      .select("id")
      .single();
    if (companyError) throw new Error(`company: ${companyError.message}`);

    const { data: customer, error: customerError } = await admin
      .from("customers")
      .insert({ company_id: company.id, name: "[REAPER] Customer" })
      .select("id")
      .single();
    if (customerError) throw new Error(`customer: ${customerError.message}`);

    const { data: job, error: jobError } = await admin
      .from("jobs")
      .insert({
        company_id: company.id,
        customer_id: customer.id,
        job_number: `JOB-REAPER-${RUN_ID}`,
        scheduled_at: new Date().toISOString(),
        job_type: "Reaper",
      })
      .select("id")
      .single();
    if (jobError) throw new Error(`job: ${jobError.message}`);

    // expenses.technician_id is NOT NULL and references a real account, so the
    // fixture needs one member. It is deleted again in the finally block.
    const fixtureEmail = `altair-reaper+${RUN_ID}@example.invalid`;
    const { data: created, error: userError } = await admin.auth.admin.createUser({
      email: fixtureEmail,
      password: `Reaper!${RUN_ID}-7kV`,
      email_confirm: true,
    });
    if (userError) throw new Error(`createUser: ${userError.message}`);
    const technicianId = created.user.id;

    await admin.from("profiles").upsert({ id: technicianId, email: fixtureEmail });
    {
      const { error } = await admin.from("company_memberships").insert({
        company_id: company.id,
        user_id: technicianId,
        role: "technician",
        status: "active",
        joined_at: new Date().toISOString(),
      });
      if (error) throw new Error(`membership: ${error.message}`);
    }

    // A live expense: its receipt must survive.
    const { data: expense, error: expenseError } = await admin
      .from("expenses")
      .insert({
        company_id: company.id,
        technician_id: technicianId,
        expense_number: `EXP-REAPER-${RUN_ID}`,
        amount: 10,
        purchase_date: new Date().toISOString().slice(0, 10),
        merchant: "Reaper Supply",
        category: "materials",
      })
      .select("id")
      .single();
    if (expenseError) throw new Error(`expense: ${expenseError.message}`);

    // A live attachment: its file must survive.
    const { data: attachment, error: attachmentError } = await admin
      .from("job_attachments")
      .insert({
        company_id: company.id,
        job_id: job.id,
        file_name: FILE_NAME,
        file_path: "pending",
      })
      .select("id")
      .single();
    if (attachmentError) throw new Error(`attachment: ${attachmentError.message}`);

    // Ids that deliberately have NO owning row.
    const ghostExpenseOld = crypto.randomUUID();
    const ghostExpenseNew = crypto.randomUUID();
    const ghostAttachment = crypto.randomUUID();
    const ghostJob = crypto.randomUUID();

    const corpus = {
      liveExpense: {
        path: `company/${company.id}/expenses/${expense.id}/${FILE_NAME}`,
        expect: "live",
      },
      liveAttachment: {
        path: `company/${company.id}/jobs/${job.id}/${attachment.id}/${FILE_NAME}`,
        expect: "live",
      },
      orphanExpenseOld: {
        path: `company/${company.id}/expenses/${ghostExpenseOld}/${FILE_NAME}`,
        expect: "orphan",
        backdateDays: 60,
      },
      orphanAttachmentOld: {
        path: `company/${company.id}/jobs/${ghostJob}/${ghostAttachment}/${FILE_NAME}`,
        expect: "orphan",
        backdateDays: 60,
      },
      orphanExpenseRecent: {
        path: `company/${company.id}/expenses/${ghostExpenseNew}/${FILE_NAME}`,
        expect: "tooRecent",
      },
      unknownFamily: {
        path: `company/${company.id}/invoices/${crypto.randomUUID()}/${FILE_NAME}`,
        expect: "unknown",
      },
      unknownShallow: {
        path: `company/${company.id}/${FILE_NAME}`,
        expect: "unknown",
      },
    };

    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xdb]);
    for (const [key, entry] of Object.entries(corpus)) {
      const { error } = await admin.storage
        .from(BUCKET)
        .upload(entry.path, bytes, { contentType: "image/jpeg", upsert: true });
      if (error) throw new Error(`upload ${key}: ${error.message}`);
    }

    await admin
      .from("job_attachments")
      .update({ file_path: corpus.liveAttachment.path })
      .eq("id", attachment.id);
    await admin
      .from("expenses")
      .update({ receipt_storage_path: corpus.liveExpense.path })
      .eq("id", expense.id);

    // Backdate the two that must clear the grace period.
    for (const entry of Object.values(corpus)) {
      if (!entry.backdateDays) continue;
      const result = await db.query(
        `update storage.objects
            set created_at = now() - ($1 || ' days')::interval,
                updated_at = now() - ($1 || ' days')::interval
          where bucket_id = $2 and name = $3`,
        [String(entry.backdateDays), BUCKET, entry.path],
      );
      if (result.rowCount !== 1) {
        throw new Error(`backdate did not match exactly one row: ${entry.path}`);
      }
    }

    fixture = { company, corpus, technicianId };
    console.log(`  ${Object.keys(corpus).length} objects seeded, 2 backdated`);

    // ---------------------------------------------------------------------
    // The classification assertions.
    // ---------------------------------------------------------------------
    console.log("\nClassification (deltas against the pre-seed baseline)");
    const seeded = runReaper(target.ref);

    check(
      "both live files are recognized as live",
      seeded.live - baseline.live === 2,
      `live moved by ${seeded.live - baseline.live}, expected 2`,
    );
    check(
      "both aged orphans are flagged as candidates",
      seeded.orphans - baseline.orphans === 2,
      `orphans moved by ${seeded.orphans - baseline.orphans}, expected 2`,
    );
    check(
      "a fresh orphan is held back by the grace period",
      seeded.tooRecent - baseline.tooRecent === 1,
      `tooRecent moved by ${seeded.tooRecent - baseline.tooRecent}, expected 1`,
    );
    check(
      "unparseable paths are skipped, never deleted",
      seeded.unknown - baseline.unknown === 2,
      `unknown moved by ${seeded.unknown - baseline.unknown}, expected 2`,
    );
    check(
      "seeding introduced no lookup errors",
      seeded.errors === 0,
      `got ${seeded.errors}`,
    );

    // The whole-bucket catastrophe: if rows were invisible, everything would
    // read as orphaned. This is the assertion that would catch a reaper running
    // without service-role credentials after migrations 154 and 156.
    check(
      "live files are never mass-classified as orphans",
      seeded.live >= 2 && seeded.orphans < seeded.live + seeded.orphans,
      `live=${seeded.live} orphans=${seeded.orphans} — if rows were invisible, live would be 0`,
    );

    check(
      "the dry run states plainly that nothing was deleted",
      /Dry run\. Nothing was deleted\./.test(seeded.output),
    );

    // ---------------------------------------------------------------------
    // Deletion, only when explicitly asked for.
    // ---------------------------------------------------------------------
    if (!args.destructive) {
      console.log(
        "\n  Deletion phase skipped. Re-run with --destructive to prove that the\n" +
          "  aged orphans are actually removed and the live files survive.",
      );
    } else {
      console.log("\nDeletion phase (--destructive)");
      runReaper(target.ref, [
        "--delete",
        "--i-understand-this-deletes-customer-files",
      ]);

      const survived = async (path) => {
        const { data } = await admin.storage
          .from(BUCKET)
          .list(path.slice(0, path.lastIndexOf("/")), { limit: 100 });
        return (data ?? []).some((e) => path.endsWith(`/${e.name}`));
      };

      check(
        "the live expense receipt SURVIVED deletion",
        await survived(corpus.liveExpense.path),
      );
      check(
        "the live job attachment SURVIVED deletion",
        await survived(corpus.liveAttachment.path),
      );
      check(
        "the file held back by the grace period SURVIVED deletion",
        await survived(corpus.orphanExpenseRecent.path),
      );
      check(
        "the unparseable objects SURVIVED deletion",
        (await survived(corpus.unknownFamily.path)) &&
          (await survived(corpus.unknownShallow.path)),
      );
      check(
        "the aged expense orphan was deleted",
        !(await survived(corpus.orphanExpenseOld.path)),
      );
      check(
        "the aged attachment orphan was deleted",
        !(await survived(corpus.orphanAttachmentOld.path)),
      );

      const after = runReaper(target.ref);
      check(
        "a second pass finds nothing left to reap",
        after.orphans === 0,
        `still reports ${after.orphans}`,
      );
    }
  } finally {
    console.log("\nCleaning up fixture...");
    if (fixture) {
      await admin.storage
        .from(BUCKET)
        .remove(Object.values(fixture.corpus).map((entry) => entry.path));
      for (const table of ["job_attachments", "expenses", "jobs", "customers", "company_memberships"]) {
        await admin.from(table).delete().eq("company_id", fixture.company.id);
      }
      await admin.from("companies").delete().eq("id", fixture.company.id);
      if (fixture.technicianId) {
        await admin.auth.admin.deleteUser(fixture.technicianId).catch(() => {});
      }
    }
    await db.end();
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} reaper classification checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
