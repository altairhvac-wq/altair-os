/**
 * The company deletion lifecycle, run end to end against a real tenant.
 *
 * ===================== WHY THIS RUNS A REAL DELETION =====================
 * Deletion is the one action with no undo. A test that checks the state machine
 * without ever destroying anything proves the easy half; what has to be proven
 * is that the destruction itself leaves nothing behind, takes nothing from
 * anyone else, and cannot start early.
 *
 * So this seeds two throwaway companies, deletes one for real, and asserts:
 *
 *   - a request needs the typed company name; a wrong one is refused
 *   - a request needs owner or admin; a technician cannot make one
 *   - a second request while one is live is refused
 *   - cancelling returns the workspace to normal, and a cancelled request
 *     cannot be claimed for purging
 *   - the grace period is enforced IN SQL: a request whose window has not
 *     elapsed cannot be claimed, even by the service role
 *   - after a purge, every one of the 65 tenant tables holds zero rows for the
 *     deleted company and the company row is gone
 *   - the OTHER company is completely untouched, row for row
 *   - progress is recorded per table, so a failure resumes rather than restarts
 *
 * Everything it creates is named "[LOADTEST] Deletion ..." and removed in a
 * finally block. It refuses to run against the application's own project.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-company-deletion-live.mjs --confirm <ref>
 */

import { randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";

import {
  TENANT_DELETE_ORDER,
  countTenantRows,
  deleteTenantRows,
} from "./lib/tenant-purge.mjs";
import { deleteTenantStorageObjects } from "./lib/storage-tenant-objects.mjs";

// The verifier counts and deletes through the SAME helpers the purge script
// uses. Counting a different way would let a purge that missed a table still
// pass — the verifier would simply not look where the purge did not go.
//
// That reasoning holds for the tables and it does NOT hold for Storage, where
// sharing a helper is exactly how implementation and verifier agree on the
// same blind spot. The storage assertions below therefore build their ground
// truth independently: they upload objects at the key layouts the SHIPPED path
// builders produce, and afterwards list the buckets with a walk written here,
// not with the walk the purge uses. The purge's own re-listing check is a
// second, separate safeguard, not the thing being trusted.

/** Key layouts from lib/storage/company-files.ts and marketing-media.ts. */
function tenantObjectFixtures(companyId, jobId, expenseId) {
  return [
    {
      bucket: "company-files",
      // buildJobAttachmentStoragePath
      path: `company/${companyId}/jobs/${jobId}/${expenseId}/attachment.pdf`,
      contentType: "application/pdf",
    },
    {
      bucket: "company-files",
      // buildExpenseReceiptStoragePath
      path: `company/${companyId}/expenses/${expenseId}/receipt.pdf`,
      contentType: "application/pdf",
    },
    {
      bucket: "marketing-media",
      // buildMarketingMediaObjectKey
      path: `${companyId}/video/reel.mp4`,
      contentType: "video/mp4",
    },
  ];
}

/** An independent recursive walk. Deliberately not the purge's. */
async function walkBucket(bucket, prefix) {
  const out = [];
  for (let offset = 0; ; offset += 1000) {
    const { data } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset });
    const entries = data ?? [];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null || entry.metadata == null) {
        out.push(...(await walkBucket(bucket, path)));
      } else {
        out.push(path);
      }
    }
    if (entries.length < 1000) break;
  }
  return out;
}

async function objectsForCompany(companyId) {
  return [
    ...(await walkBucket("company-files", `company/${companyId}`)).map(
      (path) => `company-files/${path}`,
    ),
    ...(await walkBucket("marketing-media", companyId)).map(
      (path) => `marketing-media/${path}`,
    ),
  ];
}
const DELETE_ORDER = TENANT_DELETE_ORDER;

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
const anonKey = process.env[ANON_ENV]?.trim();
if (!url || !key || !anonKey) {
  fail(`${URL_ENV}, ${KEY_ENV} and ${ANON_ENV} must all be set.`);
}

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

const suffix = Math.random().toString(36).slice(2, 8);

async function seedCompany(label) {
  const name = `[LOADTEST] Deletion ${label} ${suffix}`;
  const { data, error } = await admin
    .from("companies")
    .insert({ name, slug: `loadtest-deletion-${label}-${suffix}`, trade: "hvac" })
    .select("id, name")
    .single();
  if (error) throw new Error(`company ${label}: ${error.message}`);

  const companyId = data.id;

  // A row in each of several tables, including ones with RESTRICT edges, so
  // the delete order is genuinely exercised rather than trivially satisfied.
  const { data: customer, error: customerError } = await admin
    .from("customers")
    .insert({
      company_id: companyId,
      name: `[LOADTEST] Customer ${label} ${suffix}`,
      status: "active",
    })
    .select("id")
    .single();
  if (customerError) throw new Error(`customer ${label}: ${customerError.message}`);

  const { data: job, error: jobError } = await admin
    .from("jobs")
    .insert({
      company_id: companyId,
      customer_id: customer.id,
      job_number: `JOB-DEL-${label}-${suffix}`,
      service_address: "1 Test Way",
      city: "Testville",
      state: "TX",
      postal_code: "77001",
      job_type: "Repair",
      scheduled_at: new Date().toISOString(),
      status: "scheduled",
      priority: "normal",
    })
    .select("id")
    .single();
  if (jobError) throw new Error(`job ${label}: ${jobError.message}`);

  const { error: invoiceError } = await admin.from("invoices").insert({
    company_id: companyId,
    customer_id: customer.id,
    job_id: job.id,
    invoice_number: `INV-DEL-${label}-${suffix}`,
    status: "sent",
    subtotal: 100,
    tax_amount: 8.1,
    total: 108.1,
    amount_paid: 0,
    balance_due: 108.1,
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: new Date().toISOString().slice(0, 10),
  });
  if (invoiceError) throw new Error(`invoice ${label}: ${invoiceError.message}`);

  return { companyId, name: data.name, customerId: customer.id, jobId: job.id };
}

async function makeMember(companyId, role) {
  const email = `deletion-${role}-${Math.random().toString(36).slice(2, 8)}-${suffix}@deletion.invalid`;
  const password = `Deletion!${role}-${suffix}-Zq9`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`${role}: ${error.message}`);
  await admin
    .from("profiles")
    .upsert({ id: data.user.id, email, full_name: `Deletion ${role}` });
  const { error: membershipError } = await admin
    .from("company_memberships")
    .insert({
      company_id: companyId,
      user_id: data.user.id,
      role,
      status: "active",
      joined_at: new Date().toISOString(),
    });
  if (membershipError) throw new Error(`${role} membership: ${membershipError.message}`);
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) throw new Error(`${role} sign-in: ${signInError.message}`);
  return { client, userId: data.user.id };
}

async function countRows(companyId) {
  let total = 0;
  const nonEmpty = [];
  const uncountable = [];
  for (const entry of DELETE_ORDER) {
    const count = await countTenantRows(admin, entry, companyId);
    if (count === null) {
      // Never treated as zero. A table that cannot be counted is the one place
      // a purge could quietly leave data behind.
      uncountable.push(entry.table);
      continue;
    }
    if (count > 0) {
      nonEmpty.push({ table: entry.table, count });
      total += count;
    }
  }
  return { total, nonEmpty, uncountable };
}

async function main() {
  console.log(`\nTarget project: ${ref}\n`);
  const createdUsers = [];
  let doomed = null;
  let survivor = null;

  try {
    doomed = await seedCompany("doomed");
    survivor = await seedCompany("survivor");
    console.log(`  doomed:   ${doomed.companyId}`);
    console.log(`  survivor: ${survivor.companyId}\n`);

    const owner = await makeMember(doomed.companyId, "owner");
    const technician = await makeMember(doomed.companyId, "technician");
    createdUsers.push(owner.userId, technician.userId);

    console.log("Requesting\n");

    const { data: wrongName } = await owner.client.rpc("request_company_deletion", {
      p_company_id: doomed.companyId,
      p_confirmation: "not the workspace name",
      p_grace_days: 30,
    });
    check(
      "a request with the wrong confirmation is refused",
      wrongName?.error === "confirmation_mismatch",
      JSON.stringify(wrongName),
    );

    const { data: byTechnician } = await technician.client.rpc(
      "request_company_deletion",
      {
        p_company_id: doomed.companyId,
        p_confirmation: doomed.name,
        p_grace_days: 30,
      },
    );
    check(
      "a technician cannot request deletion",
      byTechnician?.error === "insufficient_permission",
      JSON.stringify(byTechnician),
    );

    const { data: requested } = await owner.client.rpc("request_company_deletion", {
      p_company_id: doomed.companyId,
      p_confirmation: doomed.name,
      p_grace_days: 30,
    });
    check(
      "an owner with the exact name can request it",
      requested?.status === "pending" && Boolean(requested?.scheduledPurgeAt),
      JSON.stringify(requested),
    );

    const { data: second } = await owner.client.rpc("request_company_deletion", {
      p_company_id: doomed.companyId,
      p_confirmation: doomed.name,
      p_grace_days: 30,
    });
    check(
      "a second live request is refused",
      second?.error === "already_requested",
      JSON.stringify(second),
    );

    console.log("\nThe grace period is enforced in SQL\n");

    const { data: earlyClaim } = await admin.rpc("claim_company_deletion", {
      p_company_id: doomed.companyId,
    });
    check(
      "not even service_role can claim a request before its grace period",
      earlyClaim?.claimed === false,
      "the window in which the customer can change their mind is not advisory",
    );

    console.log("\nCancelling\n");

    const { data: cancelled } = await owner.client.rpc("cancel_company_deletion", {
      p_company_id: doomed.companyId,
    });
    check("an owner can cancel", cancelled?.status === "cancelled");

    const { data: cancelAgain } = await owner.client.rpc(
      "cancel_company_deletion",
      { p_company_id: doomed.companyId },
    );
    check(
      "cancelling twice is refused rather than silently succeeding",
      cancelAgain?.error === "nothing_to_cancel",
    );

    // Re-request, then move the schedule into the past to simulate the grace
    // period elapsing. Done with the service role, which is what an operator
    // waiting 30 days would otherwise have to do.
    await owner.client.rpc("request_company_deletion", {
      p_company_id: doomed.companyId,
      p_confirmation: doomed.name,
      p_grace_days: 30,
    });
    await admin
      .from("company_deletion_requests")
      .update({ scheduled_purge_at: new Date(Date.now() - 60_000).toISOString() })
      .eq("company_id", doomed.companyId)
      .eq("status", "pending");

    console.log("\nPurging\n");

    // Files at the real key layouts, for the doomed company AND the survivor.
    // The survivor's copies are the cross-tenant assertion: a sweep that
    // deleted by a broader prefix would take them too.
    const doomedFixtures = tenantObjectFixtures(
      doomed.companyId,
      randomUUID(),
      randomUUID(),
    );
    const survivorFixtures = tenantObjectFixtures(
      survivor.companyId,
      randomUUID(),
      randomUUID(),
    );
    for (const fixture of [...doomedFixtures, ...survivorFixtures]) {
      const { error } = await admin.storage
        .from(fixture.bucket)
        .upload(fixture.path, Buffer.from("%PDF-1.4\ndeletion-drill"), {
          upsert: true,
          contentType: fixture.contentType,
        });
      if (error) throw new Error(`seeding ${fixture.bucket}: ${error.message}`);
    }

    const storageBefore = await objectsForCompany(doomed.companyId);
    check(
      "the doomed company has Storage objects to destroy",
      storageBefore.length === doomedFixtures.length,
      `found ${storageBefore.length}, expected ${doomedFixtures.length} — ` +
        `a deletion test with no files proves nothing about files`,
    );

    const before = await countRows(doomed.companyId);
    const survivorBefore = await countRows(survivor.companyId);
    console.log(`  doomed holds ${before.total} rows across ${before.nonEmpty.length} tables`);
    check(
      "the doomed company actually has data to destroy",
      before.total > 0,
      "a purge test against an empty company proves nothing",
    );

    const { data: claim } = await admin.rpc("claim_company_deletion", {
      p_company_id: doomed.companyId,
    });
    check(
      "the request can be claimed once its grace period has elapsed",
      claim?.claimed === true,
    );

    check(
      "every tenant table can be counted for this company",
      before.uncountable.length === 0,
      before.uncountable
        .map((table) => `        ${table} could not be counted`)
        .join("\n"),
    );

    const progress = {};
    let deleteFailure = null;
    for (const entry of DELETE_ORDER) {
      try {
        await deleteTenantRows(admin, entry, doomed.companyId);
      } catch (error) {
        deleteFailure = `${entry.table}: ${error.message}`;
        break;
      }
      progress[entry.table] = 0;
      await admin.rpc("record_company_deletion_progress", {
        p_company_id: doomed.companyId,
        p_progress: progress,
      });
    }
    check(
      "every table in the delete order can actually be deleted",
      deleteFailure === null,
      deleteFailure ?? "",
    );

    let storageFailure = null;
    let storageRemoved = 0;
    try {
      storageRemoved = await deleteTenantStorageObjects(admin, doomed.companyId);
    } catch (error) {
      storageFailure = error.message;
    }
    check(
      "the tenant's Storage objects are deleted",
      storageFailure === null,
      storageFailure ?? "",
    );
    check(
      `every seeded object was removed (${storageRemoved} of ${doomedFixtures.length})`,
      storageRemoved === doomedFixtures.length,
      "a flat, unpaged list() of the company id found none of these: " +
        "company-files keys begin `company/<id>` and marketing-media keys " +
        "nest under `<id>/video`",
    );

    // Verified with this file's own walk, not the purge's.
    const storageAfter = await objectsForCompany(doomed.companyId);
    check(
      "and the buckets are independently confirmed empty for that company",
      storageAfter.length === 0,
      storageAfter.slice(0, 5).join(", "),
    );

    const survivorObjects = await objectsForCompany(survivor.companyId);
    check(
      "the other company's files are untouched",
      survivorObjects.length === survivorFixtures.length,
      `survivor has ${survivorObjects.length}, expected ${survivorFixtures.length}`,
    );

    // Filtered by status AND the error is read. There are two rows for this
    // company by now — the cancelled one and the live one — and maybeSingle()
    // returns an error plus null data when more than one matches. Ignoring
    // that error is what made this check report "0 of 65" while the progress
    // was being written correctly all along.
    const { data: midProgress, error: midProgressError } = await admin
      .from("company_deletion_requests")
      .select("progress, status")
      .eq("company_id", doomed.companyId)
      .eq("status", "purging")
      .maybeSingle();
    check(
      "the live deletion request is readable",
      midProgressError == null && midProgress != null,
      midProgressError?.message ?? "no purging request found",
    );
    check(
      "progress is recorded per table, so a failure resumes rather than restarts",
      Object.keys(midProgress?.progress ?? {}).length === DELETE_ORDER.length,
      `${Object.keys(midProgress?.progress ?? {}).length} of ${DELETE_ORDER.length} tables recorded`,
    );

    const after = await countRows(doomed.companyId);
    check(
      "every tenant table holds zero rows for the deleted company",
      after.total === 0,
      after.nonEmpty.map((e) => `        ${e.table} still has ${e.count}`).join("\n"),
    );

    const survivorAfter = await countRows(survivor.companyId);
    check(
      "the other company is untouched, row for row",
      survivorAfter.total === survivorBefore.total &&
        survivorBefore.total > 0,
      `before ${survivorBefore.total}, after ${survivorAfter.total}`,
    );

    await admin.rpc("finish_company_deletion", {
      p_company_id: doomed.companyId,
      p_status: "purged",
      p_failure_reason: null,
    });

    const { error: companyDeleteError } = await admin
      .from("companies")
      .delete()
      .eq("id", doomed.companyId);
    check(
      "the company row deletes cleanly once its tables are empty",
      companyDeleteError == null,
      companyDeleteError?.message ?? "",
    );

    const { data: gone } = await admin
      .from("companies")
      .select("id")
      .eq("id", doomed.companyId)
      .maybeSingle();
    check("the company is gone", gone == null);

    const { data: survivorStill } = await admin
      .from("companies")
      .select("id")
      .eq("id", survivor.companyId)
      .maybeSingle();
    check("the other company still exists", survivorStill != null);

    doomed = null;
  } finally {
    for (const userId of createdUsers) {
      await admin.from("company_memberships").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    for (const target of [doomed, survivor]) {
      if (!target) continue;
      for (const entry of DELETE_ORDER) {
        // Entries carry their scope; a bare table name would be an object here
        // and the client would reject the relation.
        await deleteTenantRows(admin, entry, target.companyId).catch(() => {});
      }
      await admin
        .from("companies")
        .delete()
        .eq("id", target.companyId)
        .like("slug", "loadtest-deletion-%");
    }
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} company deletion checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
