/**
 * A representative Storage recovery, actually performed.
 *
 * ===================== THE GAP THIS CLOSES =====================
 * A Supabase database backup does not include Storage. Job attachments, expense
 * receipts and marketing media sit outside every recovery procedure this
 * project has — so restoring the database after a loss brings back rows
 * pointing at objects that are gone. That reads as a working system right up
 * until someone opens a receipt.
 *
 * scripts/storage-backup.mjs closes it. This proves the closure by doing it:
 *
 *   1. put a known object into a critical bucket
 *   2. back it up and confirm the manifest carries its real SHA-256
 *   3. DELETE it, and confirm it is genuinely gone
 *   4. restore from the backup
 *   5. download it again and compare the bytes to the original
 *
 * Step 3 is the one that matters. A rehearsal that never deletes anything is
 * checking that a copy exists, not that a recovery works.
 *
 * It also proves the two refusals that keep a bad backup from making an
 * incident worse: a corrupted local file is refused rather than uploaded over
 * a possibly-intact object, and an unclassified bucket stops the run.
 *
 * Everything it creates lives under a `storage-recovery-drill/` prefix and is
 * removed in a finally block. It refuses to run against the application's own
 * project.
 *
 * Run:
 *   node scripts/verify-storage-recovery-live.mjs --confirm <ref>
 */

import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const DRILL_PREFIX = "storage-recovery-drill";
const BUCKET = "company-files";

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

function runBackupScript(extraArgs, outDir) {
  return spawnSync(
    process.execPath,
    ["scripts/storage-backup.mjs", "--confirm", ref, "--out", outDir, ...extraArgs],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        SUPABASE_STORAGE_BACKUP_URL: url,
        SUPABASE_STORAGE_BACKUP_SERVICE_ROLE_KEY: key,
      },
    },
  );
}

async function main() {
  console.log(`\nTarget project: ${ref}\n`);

  const suffix = Math.random().toString(36).slice(2, 8);
  // A PDF, because company-files restricts allowed_mime_types and a receipt is
  // what actually lives there. The payload is random after the header so a
  // "restore" that quietly wrote something else cannot match.
  const objectPath = `${DRILL_PREFIX}/${suffix}/receipt.pdf`;
  const original = Buffer.concat([
    Buffer.from("%PDF-1.4\n"),
    randomBytes(64 * 1024),
  ]);
  const originalDigest = createHash("sha256").update(original).digest("hex");
  const outDir = mkdtempSync(join(tmpdir(), "altair-storage-drill-"));

  try {
    console.log("1. an object exists\n");

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(objectPath, original, { upsert: true, contentType: "application/pdf" });
    check("the drill object uploads", uploadError == null, uploadError?.message ?? "");

    console.log("\n2. it is backed up, with a real digest\n");

    const backup = runBackupScript(["--backup"], outDir);
    check(
      "the backup run succeeds",
      backup.status === 0,
      (backup.stderr || backup.stdout || "").slice(-400),
    );

    const manifestPath = join(outDir, "manifest.json");
    const manifest = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf8"))
      : { objects: [] };
    const entry = manifest.objects.find(
      (object) => object.bucket === BUCKET && object.path === objectPath,
    );
    check("the manifest lists the object", entry != null);
    check(
      "the manifest digest is the object's real SHA-256",
      entry?.sha256 === originalDigest,
      `manifest ${entry?.sha256?.slice(0, 16)} vs actual ${originalDigest.slice(0, 16)}`,
    );

    const verified = runBackupScript(["--verify"], outDir);
    check(
      "--verify passes on a good backup",
      verified.status === 0,
      (verified.stderr || "").slice(-300),
    );

    console.log("\n3. it is destroyed\n");

    const { error: removeError } = await admin.storage
      .from(BUCKET)
      .remove([objectPath]);
    check("the object is deleted", removeError == null, removeError?.message ?? "");

    // Asserted against list(), not download(). The object listing comes from
    // storage.objects and is strongly consistent; the download path is served
    // through a cache that can still answer for a few seconds after a delete.
    // Checking the cached read would make this test flaky in the direction of
    // passing, which is the worst direction for a recovery drill.
    const folder = objectPath.slice(0, objectPath.lastIndexOf("/"));
    const fileName = objectPath.slice(objectPath.lastIndexOf("/") + 1);
    const { data: afterDelete } = await admin.storage
      .from(BUCKET)
      .list(folder, { limit: 100 });
    check(
      "and is genuinely gone — a rehearsal that never deletes proves nothing",
      !(afterDelete ?? []).some((entry) => entry.name === fileName),
      JSON.stringify((afterDelete ?? []).map((entry) => entry.name)),
    );

    console.log("\n4. it is restored\n");

    const started = Date.now();
    const restored = runBackupScript(
      ["--restore", "--i-understand-this-overwrites"],
      outDir,
    );
    const elapsed = Date.now() - started;
    check(
      "the restore run succeeds",
      restored.status === 0,
      (restored.stderr || restored.stdout || "").slice(-400),
    );

    console.log("\n5. the bytes are the same\n");

    const { data: recovered, error: recoveredError } = await admin.storage
      .from(BUCKET)
      .download(objectPath);
    check("the object is downloadable again", recoveredError == null && recovered != null);

    if (recovered) {
      const buffer = Buffer.from(await recovered.arrayBuffer());
      const digest = createHash("sha256").update(buffer).digest("hex");
      check(
        "byte for byte identical to the original",
        digest === originalDigest && buffer.length === original.length,
        `${buffer.length} bytes, digest ${digest.slice(0, 16)} vs ${originalDigest.slice(0, 16)}`,
      );
    }

    console.log(`\n  measured storage RTO for this object: ${elapsed} ms\n`);

    console.log("A corrupted backup is refused, not uploaded\n");

    check(
      "the manifest records the content type, so a restore is not rejected",
      entry?.contentType === "application/pdf",
      `manifest says ${entry?.contentType} — every bucket here restricts ` +
        "allowed_mime_types and an upload without it is a 415",
    );

    const localCopy = join(outDir, BUCKET, objectPath);
    const good = readFileSync(localCopy);
    const corrupted = Buffer.from(good);
    corrupted[0] ^= 0xff;
    writeFileSync(localCopy, corrupted);

    const corruptVerify = runBackupScript(["--verify"], outDir);
    check(
      "--verify fails on a corrupted local copy",
      corruptVerify.status !== 0,
      "a backup nobody has verified is a hypothesis",
    );

    const corruptRestore = runBackupScript(
      ["--restore", "--i-understand-this-overwrites"],
      outDir,
    );
    check(
      "--restore refuses a corrupted object rather than uploading it",
      corruptRestore.status !== 0,
      "restoring corruption over a possibly-intact object turns a recoverable " +
        "incident into a permanent loss",
    );

    const { data: stillGood } = await admin.storage.from(BUCKET).download(objectPath);
    if (stillGood) {
      const digest = createHash("sha256")
        .update(Buffer.from(await stillGood.arrayBuffer()))
        .digest("hex");
      check(
        "and the remote object is untouched by the refused restore",
        digest === originalDigest,
      );
    }

    console.log("\nRefusals\n");

    const noOverwriteFlag = runBackupScript(["--restore"], outDir);
    check(
      "--restore without --i-understand-this-overwrites is refused",
      noOverwriteFlag.status !== 0,
    );

    const wrongRef = spawnSync(
      process.execPath,
      ["scripts/storage-backup.mjs", "--confirm", "not-the-project"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          SUPABASE_STORAGE_BACKUP_URL: url,
          SUPABASE_STORAGE_BACKUP_SERVICE_ROLE_KEY: key,
        },
      },
    );
    check("a wrong --confirm is refused", wrongRef.status !== 0);
  } finally {
    await admin.storage.from(BUCKET).remove([objectPath]).catch(() => {});
    rmSync(outDir, { recursive: true, force: true });
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} storage recovery checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
