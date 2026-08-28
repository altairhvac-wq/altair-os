/**
 * Supabase Storage inventory, backup, integrity check and restore.
 *
 * ===================== WHY THIS EXISTS =====================
 * A Supabase database backup does not include Storage. Everything in these
 * buckets — job attachments, expense receipts, marketing media — sits outside
 * every recovery procedure this project has. Restoring the database after a
 * loss would bring back rows pointing at objects that are gone, which reads as
 * a working system right up until someone opens a receipt.
 *
 * That is not a gap in a backup schedule. It is a category of data with no
 * backup at all.
 *
 * ===================== CLASSIFICATION =====================
 * Not every bucket is worth the same effort, and treating them alike is how a
 * backup becomes too slow to run:
 *
 *   critical         customer data that exists nowhere else. Losing an object
 *                    loses a record permanently.
 *   reconstructible  can be regenerated or re-uploaded. Worth listing, not
 *                    worth carrying.
 *
 * ===================== INTEGRITY =====================
 * A backup nobody has verified is a hypothesis. Every object is hashed with
 * SHA-256 on the way down and the digest is written to the manifest;
 * --verify re-reads the local copies and re-hashes them. A truncated download
 * has the wrong length and a corrupted one the wrong digest, and both are
 * silent without this.
 *
 * ===================== OBJECTS THAT ARE LISTED BUT NOT THERE =====================
 * storage.objects can hold a row whose underlying object is gone. Running this
 * against a scratch project restored from a production database backup found
 * 22 of 22 objects in that state -- which is not a corruption, it is the exact
 * shape of the gap this tool exists to close: the database restore brought
 * every storage ROW across and not one byte of the objects.
 *
 * Such an object is reported, counted, and recorded in the manifest. It does
 * not stop the run: backing up eighteen of nineteen objects and naming the one
 * that cannot be saved is far better than backing up none of them.
 *
 * ===================== MODES =====================
 *   (default)   inventory: what exists, how much, how classified
 *   --backup    download every critical object plus a manifest
 *   --verify    re-hash the local copies against the manifest
 *   --restore   upload a backup back into the target project
 *
 * Restore requires --i-understand-this-overwrites, because it does.
 *
 * Run:
 *   node scripts/storage-backup.mjs --confirm <ref>
 *   node scripts/storage-backup.mjs --confirm <ref> --backup --out ./storage-backup
 *   node scripts/storage-backup.mjs --confirm <ref> --verify --out ./storage-backup
 *   node scripts/storage-backup.mjs --confirm <ref> --restore --out ./storage-backup \
 *        --i-understand-this-overwrites
 */

import { createHash } from "node:crypto";
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "SUPABASE_STORAGE_BACKUP_URL";
const KEY_ENV = "SUPABASE_STORAGE_BACKUP_SERVICE_ROLE_KEY";

/**
 * Every bucket, classified.
 *
 * A bucket that exists and is not listed here fails the run rather than being
 * skipped: an unclassified bucket is one nobody has decided about, and the
 * default must not be "assume it does not matter".
 */
const BUCKETS = [
  {
    name: "company-files",
    classification: "critical",
    why:
      "job attachments and expense receipts. Uploaded once by a person who no " +
      "longer has the original; the row that references one is worthless " +
      "without it",
  },
  {
    name: "marketing-media",
    classification: "critical",
    why:
      "generated and uploaded marketing media. Some could in principle be " +
      "regenerated, but the prompt and the model version that made it are not " +
      "kept, so in practice it cannot",
  },
  {
    name: "avatars",
    classification: "reconstructible",
    why: "profile pictures. A person can upload another one",
  },
  {
    name: "founder-marketing-screenshots",
    classification: "reconstructible",
    why:
      "produced by npm run capture:founder-screenshots against a running " +
      "instance, so they can be made again",
  },
];

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
    } else args[key] = true;
  }
  return args;
}

function fail(message) {
  console.error(`\nREFUSED: ${message}\n`);
  process.exit(1);
}

function humanBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const key = process.env[KEY_ENV]?.trim();

if (!url || !key) {
  fail(`${URL_ENV} and ${KEY_ENV} must be set.`);
}

let ref;
try {
  ref = new URL(url).host.split(".")[0];
} catch {
  fail(`${URL_ENV} is not a valid URL.`);
}
if (args.confirm !== ref) {
  fail(`--confirm must match the target project ref "${ref}".`);
}

const outDir = typeof args.out === "string" ? args.out : "./storage-backup";
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Every object in a bucket, walking folders.
 *
 * Storage.list is one directory at a time and caps at 1,000 entries, so this
 * recurses and pages. An object with no metadata is a folder placeholder.
 */
async function listAllObjects(bucket, prefix = "") {
  const found = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);
    const entries = data ?? [];

    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null || entry.metadata == null) {
        found.push(...(await listAllObjects(bucket, path)));
      } else {
        found.push({
          path,
          size: entry.metadata.size ?? 0,
          // Carried through to the manifest and back on restore. Every bucket
          // here restricts allowed_mime_types, so an upload without the right
          // content type is rejected with a 415 -- which would make a restore
          // fail at the worst possible moment.
          contentType: entry.metadata.mimetype ?? "application/octet-stream",
        });
      }
    }

    if (entries.length < 1000) break;
  }
  return found;
}

async function inventory() {
  const { data: liveBuckets, error } = await admin.storage.listBuckets();
  if (error) fail(`listing buckets: ${error.message}`);

  const named = new Set(BUCKETS.map((entry) => entry.name));
  const unclassified = (liveBuckets ?? [])
    .map((bucket) => bucket.name)
    .filter((name) => !named.has(name));

  const report = [];
  for (const bucket of BUCKETS) {
    if (!(liveBuckets ?? []).some((live) => live.name === bucket.name)) {
      report.push({ ...bucket, missing: true, objects: [], bytes: 0 });
      continue;
    }
    const objects = await listAllObjects(bucket.name);
    report.push({
      ...bucket,
      objects,
      bytes: objects.reduce((total, object) => total + object.size, 0),
    });
  }

  return { report, unclassified };
}

async function main() {
  console.log(`\nTarget project: ${ref}\n`);

  const { report, unclassified } = await inventory();

  console.log("Buckets\n");
  for (const bucket of report) {
    const label = bucket.missing
      ? "MISSING FROM THIS PROJECT"
      : `${bucket.objects.length} objects, ${humanBytes(bucket.bytes)}`;
    console.log(`  ${bucket.name.padEnd(32)} ${bucket.classification.padEnd(16)} ${label}`);
    console.log(`      ${bucket.why}`);
  }

  if (unclassified.length > 0) {
    console.error(
      "\n  UNCLASSIFIED BUCKETS — refusing to continue:\n" +
        unclassified.map((name) => `    ${name}`).join("\n") +
        "\n\n  A bucket nobody has classified must not default to " +
        '"probably does not matter". Add it to BUCKETS with a reason.\n',
    );
    process.exit(1);
  }

  const critical = report.filter((bucket) => bucket.classification === "critical");
  const criticalBytes = critical.reduce((total, bucket) => total + bucket.bytes, 0);
  const criticalObjects = critical.reduce(
    (total, bucket) => total + bucket.objects.length,
    0,
  );

  console.log(
    `\n  critical: ${criticalObjects} objects, ${humanBytes(criticalBytes)}\n`,
  );

  // ------------------------------------------------------------------ backup
  if (args.backup) {
    const started = Date.now();
    mkdirSync(outDir, { recursive: true });
    const manifest = {
      project: ref,
      takenAt: new Date().toISOString(),
      objects: [],
      // Listed in Storage, but the object itself is gone. Recorded rather than
      // dropped: a backup that quietly omits them looks complete.
      unreadable: [],
    };
    let copied = 0;
    let bytes = 0;

    for (const bucket of critical) {
      for (const object of bucket.objects) {
        const { data, error } = await admin.storage
          .from(bucket.name)
          .download(object.path);
        if (error || !data) {
          manifest.unreadable.push({
            bucket: bucket.name,
            path: object.path,
            reason: error?.message ?? "no data returned",
          });
          continue;
        }
        const buffer = Buffer.from(await data.arrayBuffer());
        const digest = createHash("sha256").update(buffer).digest("hex");
        const target = join(outDir, bucket.name, object.path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, buffer);

        manifest.objects.push({
          bucket: bucket.name,
          path: object.path,
          bytes: buffer.length,
          sha256: digest,
          contentType: object.contentType ?? "application/octet-stream",
        });
        copied += 1;
        bytes += buffer.length;
      }
    }

    writeFileSync(
      join(outDir, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `  backed up ${copied} objects (${humanBytes(bytes)}) to ${outDir} in ${elapsed}s`,
    );
    console.log(
      "  Manifest carries a SHA-256 per object. Run --verify before trusting it.",
    );

    if (manifest.unreadable.length > 0) {
      console.error(
        `\n  ${manifest.unreadable.length} object(s) are LISTED in Storage but ` +
          "could not be downloaded.\n" +
          "  They are recorded in the manifest and are NOT in this backup,\n" +
          "  because they no longer exist to back up. A restore cannot bring\n" +
          "  them back, and the rows that reference them will stay broken:",
      );
      for (const object of manifest.unreadable.slice(0, 20)) {
        console.error(`    ${object.bucket}/${object.path}`);
      }
      if (manifest.unreadable.length > 20) {
        console.error(`    ...and ${manifest.unreadable.length - 20} more`);
      }
    }
    console.log("");
    return;
  }

  // ------------------------------------------------------------------ verify
  if (args.verify) {
    const manifestPath = join(outDir, "manifest.json");
    if (!existsSync(manifestPath)) fail(`No manifest at ${manifestPath}`);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    let ok = 0;
    const problems = [];

    for (const object of manifest.objects) {
      const local = join(outDir, object.bucket, object.path);
      if (!existsSync(local)) {
        problems.push(`${object.bucket}/${object.path}: missing locally`);
        continue;
      }
      const size = statSync(local).size;
      if (size !== object.bytes) {
        problems.push(
          `${object.bucket}/${object.path}: ${size} bytes, manifest says ${object.bytes}`,
        );
        continue;
      }
      const digest = createHash("sha256")
        .update(readFileSync(local))
        .digest("hex");
      if (digest !== object.sha256) {
        problems.push(`${object.bucket}/${object.path}: digest mismatch`);
        continue;
      }
      ok += 1;
    }

    // The other direction: an object that exists now and is NOT in the backup.
    const backedUp = new Set(
      manifest.objects.map((object) => `${object.bucket}/${object.path}`),
    );
    const missingFromBackup = [];
    for (const bucket of critical) {
      for (const object of bucket.objects) {
        if (!backedUp.has(`${bucket.name}/${object.path}`)) {
          missingFromBackup.push(`${bucket.name}/${object.path}`);
        }
      }
    }

    console.log(`  ${ok} of ${manifest.objects.length} objects verified`);
    if ((manifest.unreadable ?? []).length > 0) {
      // Reported, not failed. These were already gone when the backup ran, so
      // the backup is as complete as it could be — that is a different fact
      // from a local copy having rotted, which is what this mode tests.
      console.log(
        `  ${manifest.unreadable.length} object(s) were unreadable at backup time ` +
          "and are not part of this archive",
      );
    }
    if (problems.length > 0) {
      console.error("\n  CORRUPT OR MISSING:");
      for (const problem of problems.slice(0, 20)) console.error(`    ${problem}`);
      if (problems.length > 20) {
        console.error(`    ...and ${problems.length - 20} more`);
      }
    }
    if (missingFromBackup.length > 0) {
      console.error(
        `\n  ${missingFromBackup.length} object(s) exist now and are NOT in this backup.\n` +
          "  That is the backup's age, not a corruption — but it is the data\n" +
          "  that would be lost if the backup were restored today:",
      );
      for (const path of missingFromBackup.slice(0, 20)) {
        console.error(`    ${path}`);
      }
    }
    console.log("");
    if (problems.length > 0) process.exit(1);
    return;
  }

  // ----------------------------------------------------------------- restore
  if (args.restore) {
    if (args["i-understand-this-overwrites"] !== true) {
      fail(
        "--restore replaces objects at their existing paths.\n\n" +
          "Pass --i-understand-this-overwrites once you have confirmed the " +
          "target project is the one you mean.",
      );
    }

    const manifestPath = join(outDir, "manifest.json");
    if (!existsSync(manifestPath)) fail(`No manifest at ${manifestPath}`);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

    const started = Date.now();
    let restored = 0;
    let bytes = 0;

    for (const object of manifest.objects) {
      const local = join(outDir, object.bucket, object.path);
      if (!existsSync(local)) fail(`missing locally: ${object.bucket}/${object.path}`);
      const buffer = readFileSync(local);
      const digest = createHash("sha256").update(buffer).digest("hex");
      if (digest !== object.sha256) {
        // Refused rather than uploaded. Restoring a corrupted object over a
        // possibly-intact one turns a recoverable incident into a permanent
        // loss.
        fail(
          `${object.bucket}/${object.path} does not match its manifest digest. ` +
            "Nothing further was uploaded.",
        );
      }

      const { error } = await admin.storage
        .from(object.bucket)
        .upload(object.path, buffer, {
          upsert: true,
          // Without this the client sends text/plain and every one of these
          // buckets rejects it with a 415. The recovery drill found that by
          // restoring into a bucket that restricts mime types, which is all of
          // them.
          contentType: object.contentType ?? "application/octet-stream",
        });
      if (error) fail(`uploading ${object.bucket}/${object.path}: ${error.message}`);
      restored += 1;
      bytes += buffer.length;
    }

    const elapsed = ((Date.now() - started) / 1000).toFixed(1);
    console.log(
      `  restored ${restored} objects (${humanBytes(bytes)}) in ${elapsed}s\n` +
        `  Storage RTO for this volume, measured: ${elapsed}s\n`,
    );
    return;
  }

  console.log(
    "  Inventory only. Add --backup, --verify or --restore.\n\n" +
      "  A database backup does not include any of the above. Restoring the\n" +
      "  database alone brings back rows pointing at objects that are gone.\n",
  );
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
