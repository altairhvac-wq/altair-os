/**
 * Orphaned company-files object reaper.
 *
 * ============================ THE PROBLEM ============================
 * No code path in this repository deletes a Storage object. `grep -r ".remove("
 * lib app` returns nothing. permanentlyDeleteExpense removes the expenses row
 * and leaves the receipt in company-files forever, which means:
 *
 *   * storage grows without bound and is never reclaimed;
 *   * a record the product calls "permanently deleted" still has its
 *     attachment retrievable by object key — a data-retention problem
 *     independent of storage cost;
 *   * after migration 153/154 those objects become unreadable by anyone, which
 *     is the safe outcome, but they still exist and still cost money.
 *
 * ============================ WHY THIS IS A SCRIPT, NOT A CRON ============================
 * It deletes customer files. A scheduled job that decides on its own which
 * customer documents no longer matter is not something to switch on because a
 * dashboard looked untidy. This is deliberately manual, dry-run by default, and
 * requires typing the project ref and an explicit deletion token.
 *
 * DO NOT wire this into vercel.json.
 *
 * ============================ HOW IT DECIDES ============================
 * An object is a candidate ONLY when all of the following hold:
 *
 *   1. Its path matches a known family from lib/storage/company-files.ts:
 *        company/{companyId}/expenses/{expenseId}/{file}
 *        company/{companyId}/jobs/{jobId}/{attachmentId}/{file}
 *      An unrecognized shape is reported as UNKNOWN and never deleted. It might
 *      be a path family added after this script was written.
 *
 *   2. The owning row is absent — no expenses row with that id in that company,
 *      or no job_attachments row with that attachment id.
 *
 *   3. The object is older than the grace period (default 30 days). A file
 *      uploaded seconds ago whose row is committed in the next statement would
 *      otherwise look exactly like an orphan.
 *
 * Anything failing any test is reported and skipped. The script never guesses
 * ownership: if it cannot parse a path or cannot reach the database, it reports
 * and moves on rather than deleting.
 *
 * ============================ SAFETY ============================
 * Same four-guard model as scripts/loadtest-seed.mjs, plus a deletion token:
 *
 *   1. Reads ALTAIR_STORAGE_REAPER_SUPABASE_URL and
 *      ALTAIR_STORAGE_REAPER_SERVICE_ROLE_KEY only — never the application's own
 *      credentials, and it does not load .env.local.
 *   2. Refuses if the target matches NEXT_PUBLIC_SUPABASE_URL in .env.local.
 *   3. --confirm <project-ref> must match the target's ref. No default.
 *   4. Dry-run unless --delete AND --i-understand-this-deletes-customer-files
 *      are BOTH present.
 *
 * ============================ USAGE ============================
 *   export ALTAIR_STORAGE_REAPER_SUPABASE_URL="https://<ref>.supabase.co"
 *   export ALTAIR_STORAGE_REAPER_SERVICE_ROLE_KEY="<service role key>"
 *
 *   # report only — no deletion is possible in this mode
 *   node scripts/reap-orphaned-storage.mjs --confirm <ref>
 *
 *   # after reviewing the report
 *   node scripts/reap-orphaned-storage.mjs --confirm <ref> \
 *     --delete --i-understand-this-deletes-customer-files
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "company-files";
const URL_ENV = "ALTAIR_STORAGE_REAPER_SUPABASE_URL";
const KEY_ENV = "ALTAIR_STORAGE_REAPER_SERVICE_ROLE_KEY";
const DELETE_ACK_FLAG = "i-understand-this-deletes-customer-files";
const DEFAULT_GRACE_DAYS = 30;
const PAGE_SIZE = 100;
const REPORT_DIR = ".tmp/storage-reaper";

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
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

function projectRefFromUrl(url) {
  try {
    return new URL(url).host.split(".")[0] || null;
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

  if (!url || !key) {
    fail(
      `${URL_ENV} and ${KEY_ENV} must both be set.\n\n` +
        `This script deliberately does NOT read NEXT_PUBLIC_SUPABASE_URL or\n` +
        `SUPABASE_SERVICE_ROLE_KEY, so it cannot pick up the application's own\n` +
        `credentials by accident. It deletes customer files; point it somewhere\n` +
        `you have consciously chosen.`,
    );
  }

  const ref = projectRefFromUrl(url);
  if (!ref) fail(`${URL_ENV} is not a valid URL.`);

  const appUrl = readEnvLocalSupabaseUrl();
  if (appUrl && appUrl === url) {
    fail(
      `${URL_ENV} is the SAME project as NEXT_PUBLIC_SUPABASE_URL in .env.local.\n\n` +
        `Run the report against a restored copy first. If you genuinely intend to\n` +
        `reap production storage, do it from an environment where the application\n` +
        `is not configured, so the two cannot be confused.`,
    );
  }

  const confirm = typeof args.confirm === "string" ? args.confirm.trim() : "";
  if (!confirm) {
    fail(`--confirm <project-ref> is required. The target ref is "${ref}".`);
  }
  if (confirm !== ref) {
    fail(`--confirm "${confirm}" does not match the target project ref "${ref}".`);
  }

  return { url, key, ref };
}

/**
 * Parses an object key into the row it should belong to.
 * Returns null for any shape this script was not written for.
 */
function classifyObject(name) {
  const segments = name.split("/");
  if (segments.length < 4) return null;
  if (segments[0] !== "company") return null;

  const companyId = segments[1];
  const family = segments[2];
  const entityId = segments[3];

  if (family === "expenses") {
    return { family: "expenses", companyId, table: "expenses", entityId };
  }
  if (family === "jobs" && segments.length >= 5) {
    // company/{companyId}/jobs/{jobId}/{attachmentId}/{file}
    return {
      family: "jobs",
      companyId,
      table: "job_attachments",
      entityId: segments[4],
      jobId: entityId,
    };
  }
  return null;
}

/** Depth-first listing — Supabase storage list() is per-prefix. */
async function listAllObjects(client, prefix, collected = []) {
  let offset = 0;
  for (;;) {
    const { data, error } = await client.storage
      .from(BUCKET)
      .list(prefix, { limit: PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(`list "${prefix}": ${error.message}`);
    if (!data || data.length === 0) break;

    for (const entry of data) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      // A folder placeholder has no id; a real object always does.
      if (entry.id === null || entry.id === undefined) {
        await listAllObjects(client, path, collected);
      } else {
        collected.push({
          path,
          createdAt: entry.created_at ?? entry.updated_at ?? null,
          size: entry.metadata?.size ?? null,
        });
      }
    }

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return collected;
}

async function rowExists(client, table, id, companyId) {
  const { data, error } = await client
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (error) {
    // Unreachable database is NOT evidence of an orphan.
    throw new Error(`lookup ${table}.${id}: ${error.message}`);
  }
  return Boolean(data);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const target = resolveTarget(args);

  const graceDays = Number.parseInt(String(args["grace-days"] ?? DEFAULT_GRACE_DAYS), 10);
  if (!Number.isFinite(graceDays) || graceDays < 1) {
    fail("--grace-days must be a positive integer.");
  }

  const deleteRequested = args.delete === true;
  const acknowledged = args[DELETE_ACK_FLAG] === true;
  const willDelete = deleteRequested && acknowledged;

  if (deleteRequested && !acknowledged) {
    fail(
      `--delete requires --${DELETE_ACK_FLAG} as well.\n\n` +
        `Two flags, deliberately. This removes customer files — expense receipts\n` +
        `are tax records — and a single mistyped flag should not be able to do that.`,
    );
  }

  console.log(`\nTarget project: ${target.ref}`);
  console.log(`Bucket:         ${BUCKET}`);
  console.log(`Grace period:   ${graceDays} days`);
  console.log(`Mode:           ${willDelete ? "DELETE" : "REPORT ONLY (dry run)"}\n`);

  const client = createClient(target.url, target.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Listing objects...");
  const objects = await listAllObjects(client, "company");
  console.log(`  ${objects.length} objects found\n`);

  const cutoff = Date.now() - graceDays * 86_400_000;
  const orphans = [];
  const tooRecent = [];
  const unknownShape = [];
  const lookupErrors = [];
  let live = 0;

  for (const object of objects) {
    const classified = classifyObject(object.path);

    if (!classified) {
      unknownShape.push(object);
      continue;
    }

    let exists;
    try {
      exists = await rowExists(
        client,
        classified.table,
        classified.entityId,
        classified.companyId,
      );
    } catch (error) {
      lookupErrors.push({ ...object, message: error.message });
      continue;
    }

    if (exists) {
      live += 1;
      continue;
    }

    // Row is gone. Age is the last gate: a freshly uploaded object whose row
    // lands a moment later is indistinguishable from an orphan without it.
    const createdMs = object.createdAt ? new Date(object.createdAt).getTime() : NaN;
    if (!Number.isFinite(createdMs)) {
      // No timestamp means we cannot apply the grace period. Never delete.
      tooRecent.push({ ...object, reason: "no timestamp" });
      continue;
    }
    if (createdMs > cutoff) {
      tooRecent.push({ ...object, reason: "within grace period" });
      continue;
    }

    orphans.push({ ...object, family: classified.family });
  }

  console.log("=== SUMMARY ===");
  console.log(`  live (owning row present):        ${live}`);
  console.log(`  ORPHAN CANDIDATES:                ${orphans.length}`);
  console.log(`  orphaned but within grace period: ${tooRecent.length}`);
  console.log(`  unrecognized path shape (skipped):${unknownShape.length}`);
  console.log(`  lookup errors (skipped):          ${lookupErrors.length}`);

  if (unknownShape.length > 0) {
    console.log("\n=== UNRECOGNIZED SHAPES — never deleted ===");
    console.log("  These do not match a path family in lib/storage/company-files.ts.");
    console.log("  Either a new family was added, or something else wrote here.");
    unknownShape.slice(0, 20).forEach((o) => console.log(`    ${o.path}`));
    if (unknownShape.length > 20) console.log(`    ... and ${unknownShape.length - 20} more`);
  }

  if (lookupErrors.length > 0) {
    console.log("\n=== LOOKUP ERRORS — never deleted ===");
    lookupErrors.slice(0, 10).forEach((o) => console.log(`    ${o.path}  ${o.message}`));
  }

  if (orphans.length > 0) {
    console.log("\n=== ORPHAN CANDIDATES ===");
    orphans.slice(0, 50).forEach((o) =>
      console.log(`    [${o.family}] ${o.path}  created=${o.createdAt} size=${o.size}`),
    );
    if (orphans.length > 50) console.log(`    ... and ${orphans.length - 50} more`);
  }

  // The full candidate list always goes to disk, whether or not anything is
  // deleted, so a deletion can be audited afterwards.
  if (!existsSync(REPORT_DIR)) mkdirSync(REPORT_DIR, { recursive: true });
  const reportPath = join(REPORT_DIR, `orphans-${target.ref}-${Date.now()}.json`);
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        project: target.ref,
        bucket: BUCKET,
        graceDays,
        mode: willDelete ? "delete" : "report",
        counts: {
          total: objects.length,
          live,
          orphans: orphans.length,
          withinGrace: tooRecent.length,
          unknownShape: unknownShape.length,
          lookupErrors: lookupErrors.length,
        },
        orphans,
        unknownShape,
        lookupErrors,
      },
      null,
      2,
    ),
  );
  console.log(`\n  report written: ${reportPath}`);

  if (!willDelete) {
    console.log(
      `\nDry run. Nothing was deleted.\n` +
        `Review the report, then re-run with:\n` +
        `  --delete --${DELETE_ACK_FLAG}\n`,
    );
    return;
  }

  if (orphans.length === 0) {
    console.log("\nNothing to delete.\n");
    return;
  }

  console.log(`\nDeleting ${orphans.length} orphaned objects...`);
  let deleted = 0;
  for (let i = 0; i < orphans.length; i += 50) {
    const batch = orphans.slice(i, i + 50).map((o) => o.path);
    const { error } = await client.storage.from(BUCKET).remove(batch);
    if (error) {
      console.error(`  batch at ${i} failed: ${error.message}`);
      continue;
    }
    deleted += batch.length;
    process.stdout.write(`\r  ${deleted}/${orphans.length}   `);
  }
  console.log(`\n\nDeleted ${deleted} objects. Report: ${reportPath}\n`);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}\n`);
  process.exit(1);
});
