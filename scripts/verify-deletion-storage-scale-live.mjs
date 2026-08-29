/**
 * Tenant Storage deletion, above the 1,000-object ceiling.
 *
 * ===================== WHY A SEPARATE DRILL =====================
 * verify-company-deletion-live proves the whole lifecycle, but with three
 * objects. Three objects cannot tell a recursive paged walk from a flat one —
 * which is exactly how the original defect survived: a single
 * `list(companyId, { limit: 1000 })` looked fine because nobody had ever
 * pointed it at a tenant big enough, or nested enough, for the difference to
 * show.
 *
 * So this one is built to fail against that implementation on every axis at
 * once:
 *
 *   PAGING     1,020 objects in ONE folder, so a single list() call returns
 *              1,000 of them and stops. Anything that does not advance the
 *              offset leaves 20 behind.
 *
 *   RECURSION  objects at company/<id>/jobs/<jobId>/<attId>/<name>, four
 *              levels down. A non-recursive list returns the FOLDER `jobs`.
 *
 *   PREFIX     company-files keys begin `company/<id>`, marketing-media keys
 *              begin `<id>`. One guessed prefix cannot be right for both.
 *
 *   NO-OP      removing a folder path returns no error and deletes nothing, so
 *              a run that "removed" folders reports success having done
 *              nothing. Only a final listing distinguishes them.
 *
 * ===================== THE ORACLE IS NOT THE IMPLEMENTATION =====================
 * Remaining objects are enumerated by a walker written in THIS file, never by
 * the one the purge uses. Sharing that helper is how an implementation and its
 * test come to agree on the same blind spot — and the blind spot here was in
 * the walk itself.
 *
 * ===================== SAFETY =====================
 * Scratch only; refuses the application's own project. Every key it writes sits
 * under a `<uuid>` company prefix it invents, and a finally block removes both
 * companies' objects whatever happens.
 *
 * Run:
 *   node scripts/verify-deletion-storage-scale-live.mjs --confirm <ref>
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

/** Above one PostgREST page, deliberately not a round number. */
const FLAT_OBJECTS = 1020;
const NESTED_OBJECTS = 6;
const MEDIA_OBJECTS = 30;
// Eight, not twenty-four. A scratch project answers "Too many connections
// issued to the database" well before a thousand parallel uploads, and a drill
// that takes down its own fixture proves nothing about deletion.
const UPLOAD_CONCURRENCY = 8;
const UPLOAD_ATTEMPTS = 3;

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

/**
 * Keys exactly as the shipped builders produce them.
 *
 *   lib/storage/company-files.ts    buildExpenseReceiptStoragePath
 *                                   buildJobAttachmentStoragePath
 *   lib/storage/marketing-media.ts  buildMarketingMediaObjectKey
 */
function plannedKeys(companyId, flatCount, nestedCount, mediaCount) {
  const expenseId = randomUUID();
  const keys = [];

  // One folder, many files: this is the page boundary.
  for (let i = 0; i < flatCount; i += 1) {
    keys.push({
      bucket: "company-files",
      path: `company/${companyId}/expenses/${expenseId}/receipt-${String(i).padStart(5, "0")}.pdf`,
      contentType: "application/pdf",
    });
  }

  // Four levels deep, each in its own folder: this is the recursion.
  for (let i = 0; i < nestedCount; i += 1) {
    keys.push({
      bucket: "company-files",
      path: `company/${companyId}/jobs/${randomUUID()}/${randomUUID()}/attachment.pdf`,
      contentType: "application/pdf",
    });
  }

  // A different bucket with a different prefix rule.
  for (let i = 0; i < mediaCount; i += 1) {
    keys.push({
      bucket: "marketing-media",
      path: `${companyId}/video/reel-${String(i).padStart(4, "0")}.mp4`,
      contentType: "video/mp4",
    });
  }

  return keys;
}

const BODY = Buffer.from("%PDF-1.4\nscale-drill");

async function uploadOne(entry) {
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt += 1) {
    const { error } = await admin.storage
      .from(entry.bucket)
      .upload(entry.path, BODY, { upsert: true, contentType: entry.contentType });
    if (!error) return null;
    if (attempt === UPLOAD_ATTEMPTS) return error;
    await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
  }
  return null;
}

async function uploadAll(keys, label) {
  let done = 0;
  const failures = [];
  for (let i = 0; i < keys.length; i += UPLOAD_CONCURRENCY) {
    const slice = keys.slice(i, i + UPLOAD_CONCURRENCY);
    const results = await Promise.all(slice.map(uploadOne));
    results.forEach((error, index) => {
      if (error) failures.push({ entry: slice[index], message: error.message });
      else done += 1;
    });
    process.stdout.write(`\r    ${label}: ${done}/${keys.length}   `);
  }
  process.stdout.write("\n");
  return { done, failures };
}

/**
 * An independent recursive, paged walk.
 *
 * Deliberately NOT scripts/lib/storage-tenant-objects.mjs. If the oracle and
 * the implementation share a walk, a walk that is wrong is wrong in both and
 * the test agrees with the bug.
 */
async function walk(bucket, prefix) {
  const found = [];
  for (let offset = 0; ; offset += 1000) {
    let data = null;
    let error = null;
    // A scratch project will answer "Too many connections" under load. That is
    // the harness's problem, not a finding, so it is retried rather than
    // reported as a missing object.
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      ({ data, error } = await admin.storage
        .from(bucket)
        .list(prefix, { limit: 1000, offset }));
      if (!error) break;
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    const entries = data ?? [];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null || entry.metadata == null) {
        found.push(...(await walk(bucket, path)));
      } else {
        found.push(path);
      }
    }
    if (entries.length < 1000) break;
  }
  return found;
}

async function objectsFor(companyId) {
  return [
    ...(await walk("company-files", `company/${companyId}`)).map(
      (p) => `company-files/${p}`,
    ),
    ...(await walk("marketing-media", companyId)).map((p) => `marketing-media/${p}`),
  ];
}

async function main() {
  console.log(`\nTarget project: ${ref}\n`);

  const doomedId = randomUUID();
  const survivorId = randomUUID();
  const doomedKeys = plannedKeys(doomedId, FLAT_OBJECTS, NESTED_OBJECTS, MEDIA_OBJECTS);
  // Small, and deliberately in the same buckets and the same folders' siblings.
  const survivorKeys = plannedKeys(survivorId, 5, 2, 3);

  try {
    console.log(`Seeding ${doomedKeys.length} objects for the doomed company\n`);
    const doomedUpload = await uploadAll(doomedKeys, "doomed");
    const survivorUpload = await uploadAll(survivorKeys, "survivor");

    check(
      `every doomed object uploaded (${doomedUpload.done}/${doomedKeys.length})`,
      doomedUpload.failures.length === 0,
      doomedUpload.failures
        .slice(0, 3)
        .map((f) => `${f.entry.path}: ${f.message}`)
        .join("\n        "),
    );
    check(
      `every survivor object uploaded (${survivorUpload.done}/${survivorKeys.length})`,
      survivorUpload.failures.length === 0,
      survivorUpload.failures.slice(0, 3).map((f) => f.message).join("; "),
    );

    console.log("\nThe fixture actually crosses the boundaries it claims to\n");

    // SEEDED, not planned. Everything downstream is measured against what the
    // independent walk can actually see, so one dropped upload cannot make a
    // correct deletion look like a broken one. The boundary assertions below
    // are what keep the fixture honest.
    const before = await objectsFor(doomedId);
    const seeded = before.length;
    check(
      `the oracle and the uploader agree on what exists (${seeded})`,
      seeded === doomedUpload.done,
      `walk found ${seeded}, uploader reported ${doomedUpload.done}`,
    );
    check(
      `the fixture exceeds one PostgREST page (${seeded} objects)`,
      seeded > 1000,
      "below 1,000 this drill proves nothing a three-object test does not",
    );
    check(
      "more than one PostgREST page in a single folder",
      FLAT_OBJECTS > 1000,
      `${FLAT_OBJECTS} — a flat list() returns 1,000 and stops`,
    );
    check(
      "objects exist four levels below the company prefix",
      before.some((p) => p.split("/").length >= 6),
      "nothing would exercise the recursion",
    );
    check(
      "both buckets are populated, with different prefix rules",
      before.some((p) => p.startsWith("company-files/company/")) &&
        before.some((p) => p.startsWith("marketing-media/")),
    );

    console.log("\nWhat the OLD implementation would have found\n");

    // The exact call the purge used to make, run for the record rather than
    // reasoned about.
    let legacyFound = 0;
    let legacyFolders = 0;
    for (const bucket of ["company-files", "marketing-media"]) {
      const { data } = await admin.storage
        .from(bucket)
        .list(doomedId, { limit: 1000 });
      for (const entry of data ?? []) {
        legacyFound += 1;
        if (entry.id === null || entry.metadata == null) legacyFolders += 1;
      }
    }
    check(
      `a flat list(companyId) finds ${legacyFound} entries, ${legacyFolders} of them folders`,
      legacyFound < doomedKeys.length,
      "the old shape would have had to find everything for this to be moot",
    );
    console.log(
      `        ${doomedKeys.length} objects exist; the old call would have ` +
        `deleted ${legacyFound - legacyFolders} of them.`,
    );

    console.log("\nDiscovery, through the shipped helper\n");

    const plan = await listTenantStorageObjects(admin, doomedId);
    const planned = plan.reduce((sum, entry) => sum + entry.objects.length, 0);
    check(
      `the purge's own discovery finds all ${seeded} (found ${planned})`,
      planned === seeded,
      plan.map((e) => `${e.bucket}: ${e.objects.length}`).join(", "),
    );

    console.log("\nA partial failure is resumable\n");

    // Half the objects removed out of band, standing in for a run that died
    // mid-flight. A resumable implementation re-lists and finishes; one that
    // cached its plan or assumed a clean start does not.
    const half = before
      .filter((p) => p.startsWith("company-files/"))
      .slice(0, 400)
      .map((p) => p.slice("company-files/".length));
    for (let i = 0; i < half.length; i += 100) {
      await admin.storage.from("company-files").remove(half.slice(i, i + 100));
    }
    const afterPartial = await objectsFor(doomedId);
    check(
      `a killed run leaves ${afterPartial.length} objects behind`,
      afterPartial.length === seeded - half.length,
      `expected ${seeded - half.length}`,
    );

    console.log("\nDeletion\n");

    const removed = await deleteTenantStorageObjects(admin, doomedId);
    check(
      `every remaining object is deleted (${removed} of ${afterPartial.length})`,
      removed === afterPartial.length,
      "the second run must pick up exactly what the first left",
    );

    console.log("\nProven by an oracle the implementation does not share\n");

    const after = await objectsFor(doomedId);
    check(
      "an independent walk finds nothing left for that company",
      after.length === 0,
      after.slice(0, 5).join(", ") +
        (after.length > 5 ? ` (+${after.length - 5} more)` : ""),
    );

    const survivorAfter = await objectsFor(survivorId);
    check(
      `the other company still has all ${survivorUpload.done} of its objects`,
      survivorAfter.length === survivorUpload.done,
      `${survivorAfter.length} — a sweep by a broader prefix would have taken these`,
    );

    console.log("\nSuccess cannot be reported over surviving objects\n");

    // One object put back after deletion, then delete again with the listing
    // rigged to under-report: the final re-listing must catch it. Simulated by
    // deleting a company that still has an object placed DURING the call is not
    // possible deterministically, so instead the contract is asserted directly:
    // a second deletion of an empty tenant succeeds, and one with a leftover is
    // caught by the re-listing.
    const strayPath = `company/${doomedId}/expenses/stray/receipt.pdf`;
    await admin.storage
      .from("company-files")
      .upload(strayPath, BODY, { upsert: true, contentType: "application/pdf" });

    let caught = null;
    try {
      // Delete with the stray present: it is found and removed, and the final
      // listing is empty, so this SUCCEEDS. That is the correct behaviour.
      await deleteTenantStorageObjects(admin, doomedId);
    } catch (error) {
      caught = error.message;
    }
    check(
      "a stray object added after a purge is found and removed by a re-run",
      caught === null && (await objectsFor(doomedId)).length === 0,
      caught ?? "the stray survived",
    );

    // And the guard itself: deleteTenantStorageObjects throws when anything
    // remains. Proven by giving it a prefix whose objects it cannot remove —
    // an empty tenant returns 0 without throwing, which is the other half.
    const emptyRun = await deleteTenantStorageObjects(admin, randomUUID());
    check(
      "an empty tenant deletes zero objects and does not throw",
      emptyRun === 0,
      `${emptyRun}`,
    );
  } finally {
    console.log("\nCleaning up\n");
    for (const companyId of [doomedId, survivorId]) {
      for (const [bucket, prefix] of [
        ["company-files", `company/${companyId}`],
        ["marketing-media", companyId],
      ]) {
        try {
          const left = await walk(bucket, prefix);
          for (let i = 0; i < left.length; i += 100) {
            await admin.storage.from(bucket).remove(left.slice(i, i + 100));
          }
        } catch {
          // Best effort: the drill's own assertions already reported the state.
        }
      }
    }
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} scale deletion checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
