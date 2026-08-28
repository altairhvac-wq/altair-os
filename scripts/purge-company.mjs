/**
 * Destroy one company's data, after its grace period.
 *
 * ===================== THIS IS THE MOST DESTRUCTIVE THING HERE =====================
 * It deletes every row belonging to one tenant across 65 tables, its storage
 * objects, and the company itself. There is no undo. Everything below is
 * arranged around that.
 *
 * ===================== WHAT HAS TO BE TRUE BEFORE IT RUNS =====================
 *   1. A deletion request exists for the company and is pending, purging or
 *      failed. A company nobody asked to delete cannot be deleted.
 *   2. Its scheduled_purge_at has passed. The grace period is enforced by
 *      claim_company_deletion in SQL, not by this script, so it holds even if
 *      this script is wrong.
 *   3. --confirm <project-ref> matches the target.
 *   4. --company <uuid> is given explicitly. There is no "find the next due
 *      one" mode: a loop that picks its own target is a loop that can pick the
 *      wrong one.
 *   5. --apply is given. Without it this is a dry run and writes nothing.
 *
 * ===================== RESUMABLE, IDEMPOTENT =====================
 * Tables are deleted in a frozen dependency order and progress is recorded
 * after each one. A run that dies half way leaves the request in 'purging'
 * with a progress map; running again resumes rather than restarting, and a
 * table already emptied deletes zero rows rather than erroring.
 *
 * ===================== ORDER =====================
 * scripts/lib/tenant-delete-order.json is a topological order of the tenant
 * tables derived from the live foreign-key graph — children before parents, so
 * the six ON DELETE RESTRICT edges (estimates/invoices/jobs -> customers, and
 * payment_reconciliations -> three parents) are never violated. The order is
 * frozen rather than computed at runtime because information_schema is not
 * reachable over the data API; verify-company-deletion-live proves it still
 * works by actually running a purge and asserting every table is empty.
 *
 * ===================== STORAGE =====================
 * Database backups do not include Storage. Objects are removed per bucket by
 * the company-id prefix. A bucket whose layout does not start with the company
 * id is reported and NOT guessed at, because deleting by a wrong prefix would
 * take another tenant's files.
 *
 * Run:
 *   node scripts/purge-company.mjs --confirm <ref> --company <uuid>            # dry run
 *   node scripts/purge-company.mjs --confirm <ref> --company <uuid> --apply
 */

import { createClient } from "@supabase/supabase-js";

import {
  TENANT_DELETE_ORDER,
  countTenantRows,
  deleteTenantRows,
} from "./lib/tenant-purge.mjs";

const URL_ENV = "SUPABASE_PURGE_URL";
const KEY_ENV = "SUPABASE_PURGE_SERVICE_ROLE_KEY";

/**
 * Buckets whose object paths begin with the company id.
 *
 * Anything not listed is reported rather than swept: an unknown layout means
 * an unknown prefix, and a wrong prefix deletes another tenant's files.
 */
const COMPANY_PREFIXED_BUCKETS = ["company-files", "marketing-media"];

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

const args = parseArgs(process.argv.slice(2));
const url = process.env[URL_ENV]?.trim();
const key = process.env[KEY_ENV]?.trim();
const apply = args.apply === true;
const companyId = typeof args.company === "string" ? args.company.trim() : "";

if (!url || !key) {
  fail(
    `${URL_ENV} and ${KEY_ENV} must be set.\n\n` +
      "Deliberately separate variable names, so this cannot inherit whatever " +
      "credentials the shell already had.",
  );
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
if (!/^[0-9a-f-]{36}$/i.test(companyId)) {
  fail("--company <uuid> is required. There is no automatic target selection.");
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Company:        ${companyId}`);
  console.log(apply ? "Mode: APPLY — THIS DESTROYS DATA\n" : "Mode: DRY RUN\n");

  const { data: company } = await admin
    .from("companies")
    .select("id, name, slug")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) {
    fail("No such company. Nothing was touched.");
  }
  console.log(`  ${company.name}  (${company.slug})\n`);

  const { data: request, error: requestError } = await admin
    .from("company_deletion_requests")
    .select("id, status, scheduled_purge_at, progress")
    .eq("company_id", companyId)
    .in("status", ["pending", "purging", "failed"])
    .maybeSingle();

  if (requestError) fail(`reading the deletion request: ${requestError.message}`);
  if (!request) {
    fail(
      "No live deletion request for this company.\n\n" +
        "A company nobody asked to delete is not deleted. Request it through " +
        "the application first.",
    );
  }

  const due = new Date(request.scheduled_purge_at).getTime() <= Date.now();
  console.log(`  request ${request.status}, scheduled ${request.scheduled_purge_at}`);
  if (!due) {
    fail(
      `The grace period has not elapsed (${request.scheduled_purge_at}).\n\n` +
        "This is the window in which the customer can change their mind.",
    );
  }

  // ------------------------------------------------------------------ counts
  const counts = [];
  let total = 0;
  for (const entry of TENANT_DELETE_ORDER) {
    // null means "could not look", which is reported and never treated as
    // zero: only one of those two answers makes it safe to finish.
    const count = await countTenantRows(admin, entry, companyId);
    counts.push({ table: entry.table, count });
    total += count ?? 0;
  }

  const nonEmpty = counts.filter((entry) => (entry.count ?? 0) > 0);
  console.log(`\n  ${total} rows across ${nonEmpty.length} tables\n`);
  for (const entry of nonEmpty) {
    console.log(`    ${entry.table.padEnd(38)} ${entry.count}`);
  }

  const unreadable = counts.filter((entry) => entry.count === null);
  if (unreadable.length > 0) {
    console.log("\n  NOT COUNTABLE — reported, never assumed empty:");
    for (const entry of unreadable) {
      console.log(`    ${entry.table}`);
    }
  }

  // ----------------------------------------------------------------- storage
  console.log("\n  storage");
  const storagePlan = [];
  for (const bucket of COMPANY_PREFIXED_BUCKETS) {
    const { data: objects, error } = await admin.storage
      .from(bucket)
      .list(companyId, { limit: 1000 });
    if (error) {
      console.log(`    ${bucket.padEnd(38)} unreadable: ${error.message}`);
      continue;
    }
    console.log(`    ${bucket.padEnd(38)} ${objects?.length ?? 0} objects`);
    storagePlan.push({ bucket, objects: objects ?? [] });
  }
  console.log(
    "    NOTE: buckets whose paths are not company-prefixed are not swept.\n" +
      "          Deleting by a guessed prefix would take another tenant's files.",
  );

  if (!apply) {
    console.log(
      "\nDry run complete. Nothing was written. Re-run with --apply to destroy.\n",
    );
    return;
  }

  // ------------------------------------------------------------------ purge
  const { data: claim, error: claimError } = await admin.rpc(
    "claim_company_deletion",
    { p_company_id: companyId },
  );
  if (claimError) fail(`claiming: ${claimError.message}`);
  if (claim?.claimed !== true) {
    fail(
      "The database refused to hand over this request. Its grace period may " +
        "not have elapsed, or it may have been cancelled between the check " +
        "above and now.",
    );
  }

  const progress = { ...(claim.progress ?? {}) };

  try {
    for (const entry of TENANT_DELETE_ORDER) {
      const table = entry.table;
      if (typeof progress[table] === "number") {
        console.log(`    ${table.padEnd(38)} already done (${progress[table]})`);
        continue;
      }

      const before = counts.find((row) => row.table === table);
      if (before?.count === null) {
        // Refused rather than skipped. Finishing a purge while a table could
        // not even be read would report "purged" over data still present.
        throw new Error(
          `${table} could not be counted, so it cannot be confirmed empty`,
        );
      }

      await deleteTenantRows(admin, entry, companyId);

      progress[table] = before?.count ?? 0;
      console.log(`    ${table.padEnd(38)} deleted ${progress[table]}`);

      await admin.rpc("record_company_deletion_progress", {
        p_company_id: companyId,
        p_progress: progress,
      });
    }

    for (const plan of storagePlan) {
      if (plan.objects.length === 0) continue;
      const paths = plan.objects.map((object) => `${companyId}/${object.name}`);
      const { error } = await admin.storage.from(plan.bucket).remove(paths);
      if (error) throw new Error(`storage ${plan.bucket}: ${error.message}`);
      console.log(`    storage:${plan.bucket.padEnd(29)} removed ${paths.length}`);
    }

    // The company row LAST. Everything referencing it is gone, and its own
    // deletion cascades the request row.
    const { error: companyError } = await admin
      .from("companies")
      .delete()
      .eq("id", companyId);
    if (companyError) throw new Error(`companies: ${companyError.message}`);

    console.log("\n  purged.\n");
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown";
    await admin.rpc("record_company_deletion_progress", {
      p_company_id: companyId,
      p_progress: progress,
    });
    await admin.rpc("finish_company_deletion", {
      p_company_id: companyId,
      p_status: "failed",
      p_failure_reason: reason.slice(0, 500),
    });
    console.error(
      `\nFAILED: ${reason}\n\n` +
        "The request is marked failed and the progress map records how far it " +
        "got. Re-running resumes from there rather than starting over.\n",
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
