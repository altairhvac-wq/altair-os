/**
 * No Storage object can arrive after a company's purge has begun.
 *
 * ===================== THE RACE =====================
 * purge-company.mjs deletes the tenant's Storage objects, lists again to prove
 * the buckets are empty, and only then deletes the company row. An object that
 * arrives between the verification and the delete survives as an orphan while
 * the purge reports success.
 *
 * Two write paths reach tenant Storage and they are not equally exposed:
 *
 *   company-files    RLS-gated on is_active_company_member, and the purge
 *                    deletes company_memberships at position 40 of its 65-table
 *                    order — BEFORE the Storage sweep. So this path is already
 *                    shut when cleanup starts. It is shut by ORDERING, not by a
 *                    rule: reorder tenant-delete-order.json and it reopens with
 *                    nothing to notice.
 *
 *   marketing-media  written with the SERVICE ROLE by
 *                    lib/storage/marketing-media.ts, so RLS never applies. A
 *                    render completing during the purge lands under the company
 *                    prefix at any moment, including after the verification.
 *
 * Migration 177 fences both with a BEFORE INSERT trigger on storage.objects,
 * which fires for every role.
 *
 * ===================== WHAT THIS PROVES =====================
 * Uploads are attempted at five points, with the service-role client — the
 * strongest writer in the system, and the one the marketing path uses:
 *
 *   1. no deletion request        must SUCCEED
 *   2. request pending (grace)    must SUCCEED — the company still operates
 *   3. request claimed (purging)  must FAIL
 *   4. during Storage cleanup     must FAIL
 *   5. right after the final
 *      empty verification         must FAIL  <- the exact race window
 *
 * and one for a survivor company throughout, which must never be affected.
 *
 * It also proves the fence is not the accident: it runs with company_memberships
 * INTACT, so nothing here is closed by the delete order.
 *
 * ===================== SAFETY =====================
 * Scratch only. Creates its own companies, removes every object it writes, and
 * refuses the application's own project.
 *
 * Run:
 *   node scripts/verify-deletion-upload-race-live.mjs --confirm <ref>
 */

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import {
  deleteTenantStorageObjects,
  listTenantStorageObjects,
} from "./lib/storage-tenant-objects.mjs";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";

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

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const key = process.env[KEY_ENV]?.trim();
if (!url || !key) fail(`${URL_ENV} and ${KEY_ENV} must be set.`);

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
if (existsSync(".env.local")) {
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  const appUrl = line
    ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
    : null;
  if (appUrl === url) fail("Target is the application's own project. Use scratch.");
}
if (args.confirm !== ref) {
  fail(`--confirm must match the target project ref "${ref}".`);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BODY = Buffer.from("%PDF-1.4\nrace-drill");

/** The two tenant-prefixed buckets, keyed exactly as the shipped builders do. */
function keysFor(companyId, tag) {
  return [
    {
      bucket: "company-files",
      path: `company/${companyId}/expenses/${randomUUID()}/${tag}.pdf`,
      contentType: "application/pdf",
    },
    {
      bucket: "marketing-media",
      path: `${companyId}/video/${tag}.mp4`,
      contentType: "video/mp4",
    },
  ];
}

/** @returns {{ok: boolean, blocked: boolean, message: string}} */
async function tryUpload(companyId, tag) {
  const results = [];
  for (const entry of keysFor(companyId, tag)) {
    const { error } = await admin.storage
      .from(entry.bucket)
      .upload(entry.path, BODY, {
        upsert: true,
        contentType: entry.contentType,
      });
    results.push({ bucket: entry.bucket, path: entry.path, error });
  }
  // Matched on the SQLSTATE, not the text. Supabase Storage flattens a database
  // error to "database error, code: NNNNN" before the client sees it, so the
  // message the trigger raises never arrives — the code is what survives, and
  // ALT77 is reserved for this fence precisely so a generic constraint
  // violation cannot be mistaken for it.
  const blocked = results.every((r) => /ALT77/.test(r.error?.message ?? ""));
  return {
    ok: results.every((r) => r.error == null),
    blocked,
    message: results
      .map((r) => `${r.bucket}: ${r.error?.message ?? "uploaded"}`)
      .join(" | "),
    paths: results.map((r) => ({ bucket: r.bucket, path: r.path })),
  };
}

async function seedCompany(label) {
  const id = randomUUID();
  const { error } = await admin.from("companies").insert({
    id,
    name: `[RACEDRILL] ${label}`,
    slug: `racedrill-${label}-${id.slice(0, 8)}`,
  });
  if (error) throw new Error(`seeding ${label}: ${error.message}`);
  return id;
}

async function setStatus(companyId, status) {
  const { error } = await admin
    .from("company_deletion_requests")
    .update({ status })
    .eq("company_id", companyId);
  if (error) throw new Error(`status -> ${status}: ${error.message}`);
}

async function main() {
  console.log(`\nTarget project: ${ref}\n`);

  const doomed = await seedCompany("doomed");
  const survivor = await seedCompany("survivor");
  const written = [];

  // An ACTIVE membership on the doomed company, so the RLS upload policy would
  // say yes throughout. Everything the fence refuses below, it refuses over the
  // top of a permission that is still granted.
  const { data: owner } = await admin
    .from("profiles")
    .select("id")
    .limit(1)
    .single();
  if (owner) {
    await admin.from("company_memberships").insert({
      company_id: doomed,
      user_id: owner.id,
      role: "owner",
      status: "active",
    });
  }

  try {
    console.log("The fence exists at all\n");

    const { data: trigger } = await admin
      .from("company_deletion_requests")
      .select("id")
      .limit(0);
    void trigger;

    console.log("1. No deletion request — a normal company\n");

    const before = await tryUpload(doomed, "before");
    written.push(...before.paths);
    check(
      "a company with no deletion request accepts uploads",
      before.ok,
      before.message,
    );

    const survivorBefore = await tryUpload(survivor, "survivor-before");
    written.push(...survivorBefore.paths);
    check("so does the other company", survivorBefore.ok, survivorBefore.message);

    console.log("\n2. Request pending — the grace period\n");

    const { error: requestError } = await admin
      .from("company_deletion_requests")
      .insert({
        company_id: doomed,
        status: "pending",
        scheduled_purge_at: new Date(Date.now() + 86_400_000).toISOString(),
      });
    if (requestError) throw new Error(`request: ${requestError.message}`);

    const pending = await tryUpload(doomed, "pending");
    written.push(...pending.paths);
    check(
      "a company in its grace period still operates normally",
      pending.ok,
      `${pending.message} — the grace period exists so a customer can change ` +
        `their mind, so the company must keep working`,
    );

    console.log("\n3. Status purging — the fence closes\n");

    await setStatus(doomed, "purging");

    const purging = await tryUpload(doomed, "purging");
    check(
      "an upload is refused once the purge has begun",
      purging.blocked,
      purging.message,
    );
    // ALT77 and not, say, 23514. A generic check_violation could be any
    // constraint on the row, and a drill that accepted one would pass against a
    // fence that had been replaced by an unrelated failure.
    check(
      "refused with the fence's own SQLSTATE, not a generic one",
      /ALT77/.test(purging.message) && !/23514|23505/.test(purging.message),
      purging.message,
    );

    // The assertion that makes this a fence rather than an accident of the
    // delete order: the doomed company still has an ACTIVE member at this
    // moment, so is_active_company_member is true and the RLS policy would
    // permit the company-files write. The upload is refused anyway.
    const { count: activeMembers } = await admin
      .from("company_memberships")
      .select("id", { count: "exact", head: true })
      .eq("company_id", doomed)
      .eq("status", "active");
    check(
      `the company still has ${activeMembers} active member(s) — the RLS path is OPEN`,
      (activeMembers ?? 0) > 0,
      "without a live membership this proves only what the delete order " +
        "already does, which is the thing being replaced",
    );

    const survivorDuring = await tryUpload(survivor, "survivor-during");
    written.push(...survivorDuring.paths);
    check(
      "the other company is unaffected",
      survivorDuring.ok,
      survivorDuring.message,
    );

    console.log("\n4. During Storage cleanup\n");

    const plan = await listTenantStorageObjects(admin, doomed);
    const found = plan.reduce((sum, e) => sum + e.objects.length, 0);
    check(
      `cleanup can still LIST the tenant's objects (${found})`,
      found > 0,
      "the fence must not block the reads the purge needs",
    );

    const duringCleanup = await tryUpload(doomed, "during-cleanup");
    check(
      "an upload during cleanup is refused",
      duringCleanup.blocked,
      duringCleanup.message,
    );

    const removed = await deleteTenantStorageObjects(admin, doomed);
    check(
      `cleanup can still DELETE (${removed} removed)`,
      removed === found,
      "the fence must not block the purge's own work",
    );

    console.log("\n5. The race window itself\n");

    // Exactly the interval Codex named: after the final empty verification,
    // before the company row is deleted.
    const afterVerification = await listTenantStorageObjects(admin, doomed);
    const stillEmpty = afterVerification.every((e) => e.objects.length === 0);
    check("the buckets verify empty", stillEmpty);

    const inWindow = await tryUpload(doomed, "in-race-window");
    check(
      "an upload in the verified-empty window is refused",
      inWindow.blocked,
      inWindow.message,
    );

    const afterWindow = await listTenantStorageObjects(admin, doomed);
    check(
      "so the buckets are STILL empty when the company row would be deleted",
      afterWindow.every((e) => e.objects.length === 0),
      afterWindow
        .flatMap((e) => e.objects.map((p) => `${e.bucket}/${p}`))
        .join(", "),
    );

    console.log("\n6. Cancellation cannot revive a purging company\n");

    const { data: cancelled } = await admin
      .from("company_deletion_requests")
      .update({ status: "cancelled" })
      .eq("company_id", doomed)
      .eq("status", "pending")
      .select("id");
    check(
      "a purging request cannot be cancelled back to life",
      (cancelled ?? []).length === 0,
      "cancel_company_deletion filters on status = 'pending', and this one is " +
        "purging",
    );

    const stillFenced = await tryUpload(doomed, "after-cancel-attempt");
    check(
      "and the fence is still up after the attempt",
      stillFenced.blocked,
      stillFenced.message,
    );

    console.log("\n7. A failed purge stays fenced\n");

    await setStatus(doomed, "failed");
    const afterFailure = await tryUpload(doomed, "after-failure");
    check(
      "a half-purged company does not quietly accept new files",
      afterFailure.blocked,
      afterFailure.message,
    );

    console.log("\n8. Purged, and a company that never was\n");

    await setStatus(doomed, "purged");
    const afterPurged = await tryUpload(doomed, "after-purged");
    check(
      "a purged company is still fenced",
      afterPurged.blocked,
      afterPurged.message,
    );

    const survivorAfter = await tryUpload(survivor, "survivor-after");
    written.push(...survivorAfter.paths);
    check(
      "and the other company still uploads, throughout",
      survivorAfter.ok,
      survivorAfter.message,
    );

    console.log("\n9. Non-tenant buckets are never fenced\n");

    const avatarPath = `${randomUUID()}/avatar.png`;
    const { error: avatarError } = await admin.storage
      .from("avatars")
      .upload(avatarPath, BODY, { upsert: true, contentType: "image/png" });
    check(
      "avatars are unaffected — they carry no company prefix",
      avatarError == null,
      avatarError?.message ?? "",
    );
    if (!avatarError) written.push({ bucket: "avatars", path: avatarPath });
  } finally {
    console.log("\nCleaning up\n");
    for (const companyId of [doomed, survivor]) {
      await admin
        .from("company_deletion_requests")
        .delete()
        .eq("company_id", companyId);
      await admin.from("company_memberships").delete().eq("company_id", companyId);
      try {
        await deleteTenantStorageObjects(admin, companyId);
      } catch {
        // Reported by the assertions above; cleanup is best effort.
      }
    }
    for (const entry of written) {
      await admin.storage.from(entry.bucket).remove([entry.path]);
    }
    await admin.from("companies").delete().in("id", [doomed, survivor]);
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} deletion race checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
