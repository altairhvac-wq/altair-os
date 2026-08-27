/**
 * Live storage authorization matrix (P1-11).
 *
 * ===================== WHY THIS EXISTS =====================
 * Migrations 153 and 154 changed who can read a file in the company-files
 * bucket, and 154 is the one that actually narrows access. Every other check in
 * this repository for that change is static: it reads the SQL and asserts the
 * policy mirrors the owning row. None of them can answer the question that
 * matters — does a real technician holding another technician's exact object
 * key actually get refused, and does everyone who SHOULD still have access
 * still have it?
 *
 * A tightening that over-tightens is an outage: a technician who cannot open a
 * receipt in the field cannot do their job. So this drives the real function
 * through the real authentication path, as real signed-in users.
 *
 * ===================== HOW =====================
 * It builds a disposable fixture company in a SCRATCH project, creates one user
 * per role with a known password, signs each of them in to obtain a genuine
 * JWT, and calls public.can_read_company_file through PostgREST with that
 * session. That is the same path the application takes — not a superuser
 * impersonating a claim.
 *
 * It also uploads two real objects and attempts a real createSignedUrl as the
 * wrong technician, because the function returning false and Storage actually
 * refusing are two different claims.
 *
 * ===================== SAFETY =====================
 * Same guard model as scripts/loadtest-seed.mjs:
 *   1. Reads ALTAIR_LOADTEST_SUPABASE_URL / ALTAIR_LOADTEST_SERVICE_ROLE_KEY
 *      only — never the application's own credentials, and it does not load
 *      .env.local.
 *   2. Refuses if the target matches NEXT_PUBLIC_SUPABASE_URL in .env.local.
 *   3. --confirm <project-ref> must match the target. No default.
 *   4. Containment: every row it writes belongs to a company it creates, named
 *      "[MATRIX] …" with slug "loadtest-matrix-…". It always cleans up, and
 *      --clean removes any leftovers from an interrupted run.
 *
 * Run:
 *   node scripts/verify-storage-matrix-live.mjs --confirm <scratch-ref>
 *   node scripts/verify-storage-matrix-live.mjs --confirm <scratch-ref> --clean
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";

const COMPANY_NAME_PREFIX = "[MATRIX]";
const COMPANY_SLUG_PREFIX = "loadtest-matrix-";
const BUCKET = "company-files";
const FILE_NAME = "matrix.jpg";
/** Random per run so a crashed run cannot collide with the next. */
const RUN_ID = Math.random().toString(36).slice(2, 10);

/**
 * These mirror buildExpenseReceiptStoragePath and buildJobAttachmentStoragePath
 * in lib/storage/company-files.ts. They are duplicated rather than imported
 * because this is a plain .mjs script and that module is TypeScript; the shapes
 * are asserted against the source by scripts/verify-storage-matrix.mjs, so a
 * drift between the two is caught there rather than silently passing here.
 */
function expenseReceiptPath(companyId, expenseId) {
  return `company/${companyId}/expenses/${expenseId}/${FILE_NAME}`;
}

function jobAttachmentPath(companyId, jobId, attachmentId) {
  return `company/${companyId}/jobs/${jobId}/${attachmentId}/${FILE_NAME}`;
}

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
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const t = argv[i];
    if (!t.startsWith("--")) {
      args._.push(t);
      continue;
    }
    const key = t.slice(2);
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
  if (!url || !key) {
    fail(
      `${URL_ENV} and ${KEY_ENV} must both be set.\n\n` +
        `This never reads the application's own Supabase credentials. Point these\n` +
        `at a SCRATCH project restored from a backup.`,
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
    fail(
      `${URL_ENV} is the SAME project as NEXT_PUBLIC_SUPABASE_URL in .env.local.\n` +
        `This creates users and uploads objects. Use a scratch project.`,
    );
  }

  const confirm = typeof args.confirm === "string" ? args.confirm.trim() : "";
  if (!confirm) fail(`--confirm <project-ref> is required. Target ref is "${ref}".`);
  if (confirm !== ref) {
    fail(`--confirm "${confirm}" does not match the target project ref "${ref}".`);
  }

  // The anon key is required, not optional. Signing a user in with the service
  // key as the apikey header would still yield a user JWT, but it would not be
  // the header pair the browser actually sends — and a test that authorizes
  // through a different path than production is not evidence about production.
  const anonKey = process.env[ANON_ENV]?.trim();
  if (!anonKey) {
    fail(
      `${ANON_ENV} must be set.\n\n` +
        `Fixture users are signed in with the anon key, exactly as the browser\n` +
        `client does. Using the service key here would test a different path.`,
    );
  }

  return { url, key, ref, anonKey };
}

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const ROLES = [
  { key: "owner", role: "owner" },
  { key: "admin", role: "admin" },
  { key: "office", role: "office_staff" },
  { key: "dispatcher", role: "dispatcher" },
  { key: "techA", role: "technician" },
  { key: "techB", role: "technician" },
];

function password(key) {
  // Deterministic, disposable, scratch-only. These accounts exist for seconds.
  return `Matrix!${RUN_ID}-${key}-9xQ`;
}

function email(key, suffix = "") {
  return `altair-matrix+${RUN_ID}${suffix}-${key}@example.invalid`;
}

async function createUser(admin, key, suffix = "") {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(key, suffix),
    password: password(key),
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${key}: ${error.message}`);
  return data.user.id;
}

async function ensureProfile(admin, userId, key) {
  const { error } = await admin
    .from("profiles")
    .upsert({ id: userId, email: email(key), full_name: `Matrix ${key}` });
  if (error) throw new Error(`profile ${key}: ${error.message}`);
}

async function buildFixture(admin) {
  console.log("\nBuilding fixture...");

  const { data: company, error: companyError } = await admin
    .from("companies")
    .insert({
      name: `${COMPANY_NAME_PREFIX} Storage Matrix ${RUN_ID}`,
      slug: `${COMPANY_SLUG_PREFIX}${RUN_ID}`,
      trade: "hvac",
    })
    .select("id")
    .single();
  if (companyError) throw new Error(`company: ${companyError.message}`);

  const { data: outsiderCompany, error: outsiderError } = await admin
    .from("companies")
    .insert({
      name: `${COMPANY_NAME_PREFIX} Outsider ${RUN_ID}`,
      slug: `${COMPANY_SLUG_PREFIX}${RUN_ID}-out`,
      trade: "hvac",
    })
    .select("id")
    .single();
  if (outsiderError) throw new Error(`outsider company: ${outsiderError.message}`);

  const users = {};
  for (const { key, role } of ROLES) {
    const id = await createUser(admin, key);
    await ensureProfile(admin, id, key);
    const { error } = await admin.from("company_memberships").insert({
      company_id: company.id,
      user_id: id,
      role,
      status: "active",
      joined_at: new Date().toISOString(),
    });
    if (error) throw new Error(`membership ${key}: ${error.message}`);
    users[key] = id;
  }

  // A member of a DIFFERENT company — the cross-tenant control.
  const outsiderId = await createUser(admin, "outsider", "-out");
  await ensureProfile(admin, outsiderId, "outsider");
  {
    const { error } = await admin.from("company_memberships").insert({
      company_id: outsiderCompany.id,
      user_id: outsiderId,
      role: "owner",
      status: "active",
      joined_at: new Date().toISOString(),
    });
    if (error) throw new Error(`outsider membership: ${error.message}`);
  }
  users.outsider = outsiderId;

  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      company_id: company.id,
      name: `${COMPANY_NAME_PREFIX} Customer`,
      email: "matrix@example.invalid",
    })
    .select("id")
    .single();
  if (customerError) throw new Error(`customer: ${customerError.message}`);

  // Two jobs: one assigned to techA, one to techB.
  const jobs = {};
  for (const [key, tech] of [["A", users.techA], ["B", users.techB]]) {
    const { data, error } = await admin
      .from("jobs")
      .insert({
        company_id: company.id,
        customer_id: customer.id,
        job_number: `JOB-MATRIX-${RUN_ID}-${key}`,
        scheduled_at: new Date().toISOString(),
        status: "scheduled",
        assigned_technician_id: tech,
        job_type: "Matrix",
      })
      .select("id")
      .single();
    if (error) throw new Error(`job ${key}: ${error.message}`);
    jobs[key] = data.id;
  }

  // Two expenses: one submitted by techA, one by techB. The receipt path is
  // written back in buildExpenseReceiptStoragePath's exact shape — the point is
  // to exercise the real key format, not an approximation of it.
  const expenses = {};
  for (const [key, tech] of [["A", users.techA], ["B", users.techB]]) {
    const { data, error } = await admin
      .from("expenses")
      .insert({
        company_id: company.id,
        technician_id: tech,
        expense_number: `EXP-MATRIX-${RUN_ID}-${key}`,
        amount: 42.5,
        purchase_date: new Date().toISOString().slice(0, 10),
        merchant: "Matrix Supply",
        category: "materials",
        receipt_status: "attached",
        receipt_file_name: FILE_NAME,
      })
      .select("id")
      .single();
    if (error) throw new Error(`expense ${key}: ${error.message}`);
    expenses[key] = data.id;

    const { error: pathError } = await admin
      .from("expenses")
      .update({ receipt_storage_path: expenseReceiptPath(company.id, data.id) })
      .eq("id", data.id);
    if (pathError) throw new Error(`expense path ${key}: ${pathError.message}`);
  }

  // Two attachments, one per job. file_path is NOT NULL and the real path
  // embeds the attachment's own id, so it is filled in on a second pass.
  const attachments = {};
  for (const [key, jobId] of [["A", jobs.A], ["B", jobs.B]]) {
    const { data, error } = await admin
      .from("job_attachments")
      .insert({
        company_id: company.id,
        job_id: jobId,
        customer_id: customer.id,
        file_name: FILE_NAME,
        file_path: "pending",
        file_type: "image",
        mime_type: "image/jpeg",
        uploaded_by: users.owner,
      })
      .select("id")
      .single();
    if (error) throw new Error(`attachment ${key}: ${error.message}`);
    attachments[key] = data.id;

    const { error: pathError } = await admin
      .from("job_attachments")
      .update({ file_path: jobAttachmentPath(company.id, jobId, data.id) })
      .eq("id", data.id);
    if (pathError) throw new Error(`attachment path ${key}: ${pathError.message}`);
  }

  const paths = {
    receiptA: expenseReceiptPath(company.id, expenses.A),
    receiptB: expenseReceiptPath(company.id, expenses.B),
    attachA: jobAttachmentPath(company.id, jobs.A, attachments.A),
    attachB: jobAttachmentPath(company.id, jobs.B, attachments.B),
    // Segment 3 is the path "family". lib/storage/company-files.ts builds
    // exactly two; a third must be denied even for an owner.
    unknownFamily: `company/${company.id}/invoices/${expenses.A}/${FILE_NAME}`,
    // Segments 2 and 4 must cast to uuid. A failed cast must deny, not raise.
    malformed: `company/not-a-uuid/expenses/also-not-a-uuid/${FILE_NAME}`,
    // storage.foldername() yields fewer than 4 segments here.
    tooShort: `company/${company.id}/expenses`,
  };

  // Real bytes for the two receipts, so a real signed-URL attempt is possible.
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x01, 0x02, 0x03]);
  for (const key of ["receiptA", "receiptB"]) {
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(paths[key], bytes, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(`upload ${key}: ${error.message}`);
  }

  console.log(`  company ${company.id}`);
  console.log(`  ${Object.keys(users).length} users, 2 jobs, 2 expenses, 2 attachments, 2 objects`);

  return { company, outsiderCompany, users, jobs, paths };
}

async function cleanup(admin, fixture) {
  if (!fixture) return;
  const ids = [fixture.company.id, fixture.outsiderCompany.id];

  await admin.storage.from(BUCKET).remove(Object.values(fixture.paths));

  const order = [
    "job_attachments", "expenses", "jobs", "customers",
    "company_memberships",
  ];
  for (const companyId of ids) {
    for (const table of order) {
      await admin.from(table).delete().eq("company_id", companyId);
    }
    await admin.from("companies").delete().eq("id", companyId);
  }
  for (const userId of Object.values(fixture.users)) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
}

async function cleanLeftovers(admin) {
  const { data } = await admin
    .from("companies")
    .select("id, slug")
    .like("slug", `${COMPANY_SLUG_PREFIX}%`);
  if (!data || data.length === 0) {
    console.log("\nNo leftover matrix fixtures.\n");
    return;
  }
  const order = ["job_attachments", "expenses", "jobs", "customers", "company_memberships"];
  for (const row of data) {
    for (const table of order) {
      await admin.from(table).delete().eq("company_id", row.id);
    }
    await admin.from("companies").delete().eq("id", row.id);
    console.log(`  removed ${row.slug}`);
  }
  console.log("");
}

// ---------------------------------------------------------------------------
// The matrix
// ---------------------------------------------------------------------------

/** [actorKey, pathKey, expected, description] */
function buildExpectations() {
  return [
    ["owner", "receiptA", true, "owner reads any receipt"],
    ["admin", "receiptA", true, "admin reads any receipt"],
    ["office", "receiptA", true, "office staff reads any receipt"],
    ["dispatcher", "receiptA", true, "dispatcher reads any receipt"],
    ["techA", "receiptA", true, "technician reads THEIR OWN receipt"],
    ["techA", "receiptB", false, "technician DENIED another technician's receipt"],
    ["techB", "receiptB", true, "the other technician reads their own receipt"],
    ["techB", "receiptA", false, "and is denied the first technician's receipt"],

    ["owner", "attachA", true, "owner reads any job attachment"],
    ["dispatcher", "attachB", true, "dispatcher reads any job attachment"],
    ["office", "attachA", true, "office staff reads any job attachment"],
    ["techA", "attachA", true, "technician reads an attachment on THEIR assigned job"],
    ["techA", "attachB", false, "technician DENIED an attachment on an unassigned job"],
    ["techB", "attachB", true, "the other technician reads their assigned job's attachment"],

    ["outsider", "receiptA", false, "another company's owner is denied a receipt"],
    ["outsider", "attachA", false, "another company's owner is denied an attachment"],

    ["owner", "unknownFamily", false, "an unknown path family is denied even for an owner"],
    ["owner", "malformed", false, "a malformed uuid is denied, not an error"],
    ["owner", "tooShort", false, "a too-short path is denied"],
  ];
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = resolveTarget(args);

  console.log(`\nTarget project: ${target.ref}`);
  console.log(`Run id:         ${RUN_ID}`);

  const admin = createClient(target.url, target.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (args.clean) {
    await cleanLeftovers(admin);
    return;
  }

  const clientKey = target.anonKey;

  let fixture = null;
  try {
    fixture = await buildFixture(admin);

    // One signed-in client per actor, using a genuine password grant.
    const sessions = {};
    for (const key of [...ROLES.map((r) => r.key), "outsider"]) {
      const c = createClient(target.url, clientKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const suffix = key === "outsider" ? "-out" : "";
      const { error } = await c.auth.signInWithPassword({
        email: email(key, suffix),
        password: password(key),
      });
      if (error) throw new Error(`signIn ${key}: ${error.message}`);
      sessions[key] = c;
    }

    console.log("\nAuthorization matrix (real users, real JWTs, real RPC)");
    for (const [actor, pathKey, expected, description] of buildExpectations()) {
      const { data, error } = await sessions[actor].rpc("can_read_company_file", {
        p_object_name: fixture.paths[pathKey],
      });
      const allowed = error ? null : data === true;
      check(
        description,
        allowed === expected,
        error ? `rpc error: ${error.message}` : `got ${allowed}, expected ${expected}`,
      );
    }

    // The function saying false and Storage refusing are two claims.
    console.log("\nReal Storage enforcement, not just the predicate");
    {
      const own = await sessions.techA.storage
        .from(BUCKET)
        .createSignedUrl(fixture.paths.receiptA, 60);
      check(
        "technician CAN mint a signed URL for their own receipt",
        Boolean(own.data?.signedUrl) && !own.error,
        own.error?.message,
      );

      const other = await sessions.techA.storage
        .from(BUCKET)
        .createSignedUrl(fixture.paths.receiptB, 60);
      check(
        "technician CANNOT mint a signed URL for another technician's receipt, given the exact key",
        !other.data?.signedUrl,
        other.data?.signedUrl ? "a URL was returned — the policy did not deny" : "",
      );

      const outsider = await sessions.outsider.storage
        .from(BUCKET)
        .createSignedUrl(fixture.paths.receiptA, 60);
      check(
        "another company's owner CANNOT mint a signed URL",
        !outsider.data?.signedUrl,
      );

      const ownerUrl = await sessions.owner.storage
        .from(BUCKET)
        .createSignedUrl(fixture.paths.receiptB, 60);
      check(
        "owner CAN still mint a signed URL (no over-tightening)",
        Boolean(ownerUrl.data?.signedUrl) && !ownerUrl.error,
        ownerUrl.error?.message,
      );
    }

    // Migration 156. The bytes of an attachment and the ROW describing it must
    // agree — a technician who cannot open the photo should not be able to read
    // its file name and caption either. Every assertion here is paired with the
    // byte-level result above for the same object.
    console.log("\nAttachment row metadata agrees with byte access (156)");
    {
      const rowVisibility = [
        ["owner", "A", true, "owner sees any attachment row"],
        ["dispatcher", "B", true, "dispatcher sees any attachment row"],
        ["office", "A", true, "office staff sees any attachment row"],
        ["admin", "B", true, "admin sees any attachment row"],
        ["techA", "A", true, "technician sees the row for THEIR assigned job"],
        ["techA", "B", false, "technician does NOT see a row for an unassigned job"],
        ["techB", "B", true, "the other technician sees their assigned job's row"],
        ["techB", "A", false, "and not the first technician's job"],
        ["outsider", "A", false, "another company sees no attachment rows"],
      ];

      for (const [actor, jobKey, expected, description] of rowVisibility) {
        const { data, error } = await sessions[actor]
          .from("job_attachments")
          .select("id, file_name")
          .eq("job_id", fixture.jobs[jobKey]);
        const visible = !error && (data?.length ?? 0) > 0;
        check(
          description,
          visible === expected,
          error ? `query error: ${error.message}` : `got ${visible}, expected ${expected}`,
        );
      }

      // A technician must not be able to plant a row on someone else's job.
      const planted = await sessions.techA.from("job_attachments").insert({
        company_id: fixture.company.id,
        job_id: fixture.jobs.B,
        file_name: "planted.jpg",
        file_path: `company/${fixture.company.id}/jobs/${fixture.jobs.B}/planted/planted.jpg`,
      });
      check(
        "technician CANNOT attach a row to an unassigned job",
        Boolean(planted.error),
        "the insert succeeded — the INSERT policy did not narrow",
      );

      // ...but must still be able to attach to their own.
      const ownAttach = await sessions.techA.from("job_attachments").insert({
        company_id: fixture.company.id,
        job_id: fixture.jobs.A,
        file_name: "own.jpg",
        file_path: `company/${fixture.company.id}/jobs/${fixture.jobs.A}/own/own.jpg`,
      });
      check(
        "technician CAN still attach a row to their assigned job",
        !ownAttach.error,
        ownAttach.error?.message,
      );
    }

    // 154 dropped a SELECT policy. It must not have touched the write path:
    // a technician who cannot upload a receipt cannot close out a job.
    console.log("\nWrite path unchanged by 154");
    {
      const bytes = new Uint8Array([1, 2, 3, 4]);
      const uploadPath = `company/${fixture.company.id}/expenses/${crypto.randomUUID()}/${FILE_NAME}`;

      // upsert:false matches all three real call sites (ReceiptUploadBox,
      // JobAttachmentUploadBox, submit-expense-with-receipt).
      const { error } = await sessions.techA.storage
        .from(BUCKET)
        .upload(uploadPath, bytes, { contentType: "image/jpeg", upsert: false });
      check("a technician can still upload a receipt", !error, error?.message);

      // Overwrite-in-place is NOT granted: company-files has INSERT, SELECT and
      // DELETE policies but no UPDATE policy, so upsert:true is refused. That is
      // the current intended shape — an uploaded receipt is immutable. This is
      // asserted so that flipping a call site to upsert:true fails here, with
      // the reason attached, rather than failing in a technician's hands.
      const upsertAttempt = await sessions.techA.storage
        .from(BUCKET)
        .upload(uploadPath, bytes, { contentType: "image/jpeg", upsert: true });
      check(
        "overwrite-in-place stays refused (no UPDATE policy on company-files)",
        Boolean(upsertAttempt.error),
        "upsert succeeded — an UPDATE policy was added; confirm that was intended",
      );

      await admin.storage.from(BUCKET).remove([uploadPath]);
    }
  } finally {
    console.log("\nCleaning up fixture...");
    await cleanup(admin, fixture);
    console.log("  done");
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} storage matrix checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
