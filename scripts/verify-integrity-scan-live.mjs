/**
 * The data-integrity scan, held to the shipped detector over every row.
 *
 * ===================== WHAT THIS PROVES =====================
 * Migration 172 counts nine structural rules in SQL. The rules already exist in
 * TypeScript, in detectOperationalInconsistencies, so the counting now lives in
 * two places -- which is the cost this test has to earn back.
 *
 * It earns it by:
 *
 *   1. Reading EVERY job, invoice, dispatch assignment and labour entry the
 *      company has, paged to completion, and asserting the read actually went
 *      past PostgREST's 1,000-row ceiling. The old scan stopped at 1,000 and
 *      reported the other 11,000 as clean, so a ground truth that did the same
 *      would prove nothing.
 *   2. Running the SHIPPED detector over all of it. That result is the oracle.
 *   3. Calling the RPC as a real signed-in member and asserting every count
 *      matches the oracle exactly -- total, critical, warning, each of the nine
 *      kinds, and the three job-level counts the dashboard reads.
 *   4. Asserting the bounded preview is the first N jobs of the oracle's own
 *      severity ordering, and that the entries for those jobs are identical --
 *      same kinds, same details, same severities, same recovery guidance.
 *   5. Privileges: anon, a member of another company, and a technician inside
 *      the company.
 *
 * ===================== THE RULE THAT CANNOT BE TESTED =====================
 * detectOperationalInconsistencies has a branch for two concurrent active
 * dispatch assignments on one job. dispatch_assignments carries a unique index
 * on job_id WHERE status = 'active', so the database rejects the second row --
 * found by seeding one and watching the insert fail with 23505. The branch is a
 * guard against data loaded around the index; no fixture that respects the
 * schema can reach it, and this says so rather than quietly skipping it.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/verify-integrity-scan-live.mjs --confirm <ref> [--company <uuid>]
 */

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

import { readAll } from "./lib/reports-oracle.mjs";
import { mapJobRowToJob } from "@/lib/database/mappers/job";
import { mapInvoiceRowToInvoice } from "@/lib/database/mappers/invoice";
import {
  detectOperationalInconsistencies,
  compareOperationalInconsistencyEntries,
} from "@/shared/types/operational-inconsistencies";
import { INTEGRITY_SCAN_PREVIEW_LIMIT } from "@/lib/database/queries/operational-inconsistency-counts";

const URL_ENV = "ALTAIR_LOADTEST_SUPABASE_URL";
const KEY_ENV = "ALTAIR_LOADTEST_SERVICE_ROLE_KEY";
const ANON_ENV = "ALTAIR_LOADTEST_ANON_KEY";

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

function readEnvLocalSupabaseUrl() {
  if (!existsSync(".env.local")) return null;
  const line = readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .find((l) => l.trim().startsWith("NEXT_PUBLIC_SUPABASE_URL="));
  return line
    ? line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")
    : null;
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
const appUrl = readEnvLocalSupabaseUrl();
if (appUrl && appUrl === url) {
  fail("Target is the application's own project. Use scratch.");
}
if (args.confirm !== ref) {
  fail(`--confirm must match the target project ref "${ref}".`);
}

const companyId = args.company ?? "78868ecd-25d1-4928-9b99-9bfeb5453cbc";
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const LIVE = (query) => query.is("deleted_at", null).is("archived_at", null);

async function loadGroundTruth() {
  const [jobRows, invoiceRows, assignmentRows, laborRows, memberRows] =
    await Promise.all([
      readAll(
        admin,
        "jobs",
        "*, customers(name), assigned_technician:profiles!jobs_assigned_technician_id_fkey(full_name, email)",
        (q) => LIVE(q.eq("company_id", companyId)),
      ),
      readAll(
        admin,
        "invoices",
        "*, customers(name, email), jobs(job_number), estimates(estimate_number), invoice_line_items(id)",
        (q) => LIVE(q.eq("company_id", companyId)),
      ),
      readAll(admin, "dispatch_assignments", "id, job_id, technician_id, status", (q) =>
        q.eq("company_id", companyId),
      ),
      readAll(admin, "time_entries", "id, job_id, ended_at, entry_type, started_at", (q) =>
        q.eq("company_id", companyId).is("ended_at", null),
      ),
      readAll(admin, "company_memberships", "user_id", (q) =>
        q.eq("company_id", companyId).eq("status", "active").not("user_id", "is", null),
      ),
    ]);

  return {
    jobRows,
    invoiceRows,
    input: {
      jobs: jobRows.map(mapJobRowToJob),
      invoices: invoiceRows.map(mapInvoiceRowToInvoice),
      assignments: assignmentRows.map((row) => ({
        id: row.id,
        jobId: row.job_id,
        technicianId: row.technician_id,
        status: row.status,
      })),
      laborEntries: laborRows.map((row) => ({
        id: row.id,
        jobId: row.job_id ?? undefined,
        endedAt: row.ended_at ?? undefined,
        entryType: row.entry_type,
        startedAt: row.started_at,
      })),
      activeMemberUserIds: new Set(
        memberRows.map((row) => row.user_id).filter(Boolean),
      ),
    },
  };
}

/** Entry identity for a set/order comparison: everything a reader would see. */
function entryKey(entry) {
  return [
    entry.jobId,
    entry.kind,
    entry.severity,
    entry.jobNumber,
    entry.customerName,
    entry.jobStatus,
    entry.detail,
    entry.invoiceId ?? "",
    entry.invoiceNumber ?? "",
    entry.recoveryGuidance,
  ].join("|");
}

async function main() {
  console.log(`\nTarget project: ${ref}`);
  console.log(`Company:        ${companyId}\n`);

  const suffix = Math.random().toString(36).slice(2, 8);
  const created = [];
  let isolationCompanyId = null;
  let memberSeq = 0;

  async function makeMember(role, targetCompanyId) {
    memberSeq += 1;
    const email = `integrity-${role}-${memberSeq}-${suffix}@integrity.invalid`;
    const password = `Integrity!${role}-${memberSeq}-${suffix}-Zq9`;
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw new Error(`${role}: ${error.message}`);
    created.push(data.user.id);
    await admin
      .from("profiles")
      .upsert({ id: data.user.id, email, full_name: `Integrity ${role}` });
    const { error: membershipError } = await admin
      .from("company_memberships")
      .insert({
        company_id: targetCompanyId,
        user_id: data.user.id,
        role,
        status: "active",
        joined_at: new Date().toISOString(),
      });
    if (membershipError) {
      throw new Error(`${role} membership: ${membershipError.message}`);
    }
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw new Error(`${role} sign-in: ${signInError.message}`);
    return client;
  }

  try {
    console.log("Reading every row (the oracle)\n");
    const truth = await loadGroundTruth();
    console.log(`  jobs         ${truth.input.jobs.length}`);
    console.log(`  invoices     ${truth.input.invoices.length}`);
    console.log(`  assignments  ${truth.input.assignments.length}`);
    console.log(`  open labour  ${truth.input.laborEntries.length}`);
    console.log(`  members      ${truth.input.activeMemberUserIds.size}\n`);

    // ============================== THE READ MUST HAVE GONE PAST THE CEILING ==============================
    // The scan being replaced stopped at 1,000 rows per table. A ground truth
    // that also stopped there would agree with the defect.
    check(
      "the oracle read past PostgREST's 1,000-row ceiling",
      truth.input.jobs.length > 1000,
      `jobs came back at ${truth.input.jobs.length}; this fixture cannot ` +
        "distinguish a paged read from a truncated one",
    );

    const oracle = detectOperationalInconsistencies(truth.input);
    console.log(
      `\nOracle: ${oracle.totalCount} entries across ${oracle.jobCount} jobs ` +
        `(${oracle.criticalCount} critical)\n`,
    );

    // A membership row is created for the check below, which changes
    // activeMemberUserIds — so the RPC is called AFTER, and the oracle is
    // recomputed on the same basis.
    const owner = await makeMember("owner", companyId);
    const truthAfter = await loadGroundTruth();
    const expected = detectOperationalInconsistencies(truthAfter.input);

    const { data: scan, error: scanError } = await owner.rpc(
      "get_company_operational_inconsistencies",
      {
        p_company_id: companyId,
        p_limit: INTEGRITY_SCAN_PREVIEW_LIMIT,
        p_offset: 0,
      },
    );
    if (scanError) throw new Error(`rpc: ${scanError.message}`);
    check("scan authorized", scan?.authorized === true);

    // ---------------- counts ----------------
    const counts = scan.counts;
    check(
      "totalCount matches the shipped detector over every row",
      Number(counts.total) === expected.totalCount,
      `rpc ${counts.total} vs oracle ${expected.totalCount}`,
    );
    check(
      "criticalCount matches",
      Number(counts.critical) === expected.criticalCount,
      `rpc ${counts.critical} vs oracle ${expected.criticalCount}`,
    );
    check(
      "warningCount matches",
      Number(counts.warning) === expected.warningCount,
      `rpc ${counts.warning} vs oracle ${expected.warningCount}`,
    );

    const kinds = new Set([
      ...Object.keys(counts.byKind ?? {}),
      ...Object.keys(expected.byKind ?? {}),
    ]);
    for (const kind of [...kinds].sort()) {
      check(
        `byKind.${kind} matches`,
        Number(counts.byKind?.[kind] ?? 0) === (expected.byKind?.[kind] ?? 0),
        `rpc ${counts.byKind?.[kind] ?? 0} vs oracle ${expected.byKind?.[kind] ?? 0}`,
      );
    }

    check(
      "jobCount (distinct offending jobs) matches",
      Number(counts.jobCount) === expected.jobCount,
      `rpc ${counts.jobCount} vs oracle ${expected.jobCount}`,
    );
    check(
      "criticalJobCount matches",
      Number(counts.criticalJobCount) === expected.criticalJobCount,
      `rpc ${counts.criticalJobCount} vs oracle ${expected.criticalJobCount}`,
    );
    check(
      "multiKindJobCount (readiness 50 or below) matches",
      Number(counts.multiKindJobCount) === expected.multiKindJobCount,
      `rpc ${counts.multiKindJobCount} vs oracle ${expected.multiKindJobCount}`,
    );

    // ---------------- the preview ----------------
    //
    // The oracle's own ordering, projected onto jobs: the first job of each
    // entry in sorted order, deduplicated, keeps first appearance.
    const oracleJobOrder = [];
    const seen = new Set();
    for (const entry of [...expected.entries].sort(
      compareOperationalInconsistencyEntries,
    )) {
      if (seen.has(entry.jobId)) continue;
      seen.add(entry.jobId);
      oracleJobOrder.push(entry.jobId);
    }

    const previewJobIds = (scan.jobs ?? []).map((job) => job.jobId);
    check(
      "the preview is bounded",
      previewJobIds.length <= INTEGRITY_SCAN_PREVIEW_LIMIT,
      `${previewJobIds.length} jobs returned for a limit of ${INTEGRITY_SCAN_PREVIEW_LIMIT}`,
    );
    check(
      "hasMore is set when the tenant has more offending jobs than the preview",
      scan.hasMore === expected.jobCount > previewJobIds.length,
      `hasMore=${scan.hasMore}, jobCount=${expected.jobCount}, preview=${previewJobIds.length}`,
    );

    const expectedPrefix = oracleJobOrder.slice(0, previewJobIds.length);
    check(
      "the preview is the first N jobs of the shipped severity ordering",
      previewJobIds.length === expectedPrefix.length &&
        previewJobIds.every((id, index) => id === expectedPrefix[index]),
      `\n        rpc:    ${JSON.stringify(previewJobIds.slice(0, 6))}\n` +
        `        oracle: ${JSON.stringify(expectedPrefix.slice(0, 6))}`,
    );

    // Every critical job must be reachable before any warning-only job.
    const criticalIds = new Set(
      expected.entries
        .filter((entry) => entry.severity === "critical")
        .map((entry) => entry.jobId),
    );
    const firstWarningIndex = previewJobIds.findIndex(
      (id) => !criticalIds.has(id),
    );
    check(
      "critical jobs come before warning-only jobs in the preview",
      firstWarningIndex === -1 ||
        previewJobIds.slice(firstWarningIndex).every((id) => !criticalIds.has(id)),
      `first warning at ${firstWarningIndex} in ${JSON.stringify(previewJobIds.slice(0, 8))}`,
    );

    // ---------------- the reconstructed entries ----------------
    const { getCompanyInconsistencyScan } = await import(
      "@/lib/database/queries/operational-inconsistency-counts"
    );
    void getCompanyInconsistencyScan;

    const previewSet = new Set(previewJobIds);
    const oracleEntriesForPreview = expected.entries
      .filter((entry) => previewSet.has(entry.jobId))
      .map(entryKey)
      .sort();

    // Rebuild the entries the shipped way, from the RPC's facts, exactly as
    // getCompanyInconsistencyScan does.
    const rebuilt = detectOperationalInconsistencies(
      buildDetectorInput(scan.jobs ?? []),
    );
    const rebuiltKeys = rebuilt.entries.map(entryKey).sort();

    check(
      "the rebuilt entries are identical to the oracle's, for the previewed jobs",
      rebuiltKeys.length === oracleEntriesForPreview.length &&
        rebuiltKeys.every((key, index) => key === oracleEntriesForPreview[index]),
      `\n        rebuilt ${rebuiltKeys.length} vs oracle ${oracleEntriesForPreview.length}` +
        (rebuiltKeys.length && oracleEntriesForPreview.length
          ? `\n        first rebuilt: ${rebuiltKeys[0]}\n        first oracle:  ${oracleEntriesForPreview[0]}`
          : ""),
    );

    // ---------------- paging ----------------
    const { data: page2, error: page2Error } = await owner.rpc(
      "get_company_operational_inconsistencies",
      {
        p_company_id: companyId,
        p_limit: INTEGRITY_SCAN_PREVIEW_LIMIT,
        p_offset: INTEGRITY_SCAN_PREVIEW_LIMIT,
      },
    );
    if (page2Error) throw new Error(`rpc page 2: ${page2Error.message}`);

    const page2Ids = (page2.jobs ?? []).map((job) => job.jobId);
    check(
      "page two continues the same ordering with no overlap",
      page2Ids.every((id) => !previewSet.has(id)) &&
        page2Ids.every(
          (id, index) => id === oracleJobOrder[INTEGRITY_SCAN_PREVIEW_LIMIT + index],
        ),
      `\n        page2:  ${JSON.stringify(page2Ids.slice(0, 6))}\n` +
        `        oracle: ${JSON.stringify(oracleJobOrder.slice(INTEGRITY_SCAN_PREVIEW_LIMIT, INTEGRITY_SCAN_PREVIEW_LIMIT + 6))}`,
    );
    check(
      "page two reports the same whole-tenant counts as page one",
      Number(page2.counts.total) === Number(counts.total) &&
        Number(page2.counts.jobCount) === Number(counts.jobCount),
      `page2 ${page2.counts.total}/${page2.counts.jobCount} vs ${counts.total}/${counts.jobCount}`,
    );

    // ---------------- the unreachable rule ----------------
    const { error: concurrentError } = await admin
      .from("dispatch_assignments")
      .insert({
        company_id: companyId,
        job_id: truth.input.assignments[0]?.jobId ?? null,
        technician_id: truth.input.assignments[0]?.technicianId ?? null,
        status: "active",
        scheduled_start: new Date().toISOString(),
      });
    check(
      "a second active dispatch assignment is rejected by the database",
      concurrentError != null && /23505|duplicate key/i.test(
        `${concurrentError.code} ${concurrentError.message}`,
      ),
      concurrentError
        ? `got ${concurrentError.code}: ${concurrentError.message}`
        : "the insert succeeded — the concurrent-dispatch branch may now be " +
          "reachable and the aggregate does not reproduce it",
    );

    // ---------------- privileges ----------------
    console.log("\n=== privileges ===\n");
    const rpcArgs = { p_company_id: companyId, p_limit: 5, p_offset: 0 };

    const anon = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: anonError } = await anon.rpc(
      "get_company_operational_inconsistencies",
      rpcArgs,
    );
    check("anon cannot execute the scan", anonError != null);

    const { data: otherCompany, error: otherCompanyError } = await admin
      .from("companies")
      .insert({
        name: `[LOADTEST] Integrity Isolation ${suffix}`,
        slug: `loadtest-integrity-isolation-${suffix}`,
        trade: "hvac",
      })
      .select("id")
      .single();
    if (otherCompanyError) throw new Error(otherCompanyError.message);
    isolationCompanyId = otherCompany.id;

    const outsider = await makeMember("owner", otherCompany.id);
    const { error: outsiderError } = await outsider.rpc(
      "get_company_operational_inconsistencies",
      rpcArgs,
    );
    check(
      "a member of another company cannot read the scan",
      outsiderError != null &&
        /insufficient_permission/.test(outsiderError.message),
      outsiderError ? `got: ${outsiderError.message}` : "outsider got a result",
    );

    const technician = await makeMember("technician", companyId);
    const { data: techData, error: techError } = await technician.rpc(
      "get_company_operational_inconsistencies",
      rpcArgs,
    );
    check(
      "a technician in the same company is refused",
      techError == null && techData?.authorized === false,
      techError ? `raised: ${techError.message}` : `authorized=${techData?.authorized}`,
    );

    const { data: serviceData, error: serviceError } = await admin.rpc(
      "get_company_operational_inconsistencies",
      rpcArgs,
    );
    check(
      "service_role gets the unauthorized shape rather than a bypass",
      serviceError == null && serviceData?.authorized === false,
      serviceError
        ? `raised: ${serviceError.message}`
        : `authorized=${serviceData?.authorized} — auth.uid() is null for the ` +
          "service role, and the function returns zeros rather than every row",
    );
  } finally {
    for (const userId of created) {
      await admin.from("company_memberships").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    if (isolationCompanyId) {
      await admin
        .from("company_memberships")
        .delete()
        .eq("company_id", isolationCompanyId);
      await admin
        .from("companies")
        .delete()
        .eq("id", isolationCompanyId)
        .like("slug", "loadtest-integrity-isolation-%");
    }
  }

  console.log(
    `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} integrity scan checks passed (${checks} total).`,
  );
  if (failures > 0) process.exit(1);
}

/**
 * The same reconstruction getCompanyInconsistencyScan performs.
 *
 * Duplicated here on purpose: importing it would test the RPC against the code
 * that consumes the RPC. This mirrors it, and the assertion above compares the
 * result to the oracle rather than to the application.
 */
function buildDetectorInput(jobs) {
  const detectorJobs = [];
  const assignments = [];
  const laborEntries = [];
  const invoices = [];
  const activeMemberUserIds = new Set();

  for (const row of jobs) {
    detectorJobs.push({
      id: row.jobId,
      jobNumber: row.jobNumber ?? "",
      customerName: row.customerName ?? "Unknown customer",
      status: row.jobStatus,
      completedAt: row.completedAt ?? undefined,
      assignedTechnicianId: row.assignedTechnicianId ?? undefined,
    });
    if (row.activeAssignmentId && row.activeAssignmentTechnicianId) {
      assignments.push({
        id: row.activeAssignmentId,
        jobId: row.jobId,
        technicianId: row.activeAssignmentTechnicianId,
        status: "active",
      });
    }
    for (let i = 0; i < Number(row.openLaborCount ?? 0); i += 1) {
      laborEntries.push({ id: `${row.jobId}-${i}`, jobId: row.jobId, endedAt: undefined });
    }
    for (const invoice of row.badInvoices ?? []) {
      invoices.push({
        id: invoice.id,
        jobId: row.jobId,
        invoiceNumber: invoice.invoiceNumber ?? "",
        status: invoice.status,
        total: Number(invoice.total),
        amountPaid: Number(invoice.amountPaid),
        balanceDue: Number(invoice.balanceDue),
      });
    }
    if (row.assignedTechnicianId && row.assignedIsActiveMember) {
      activeMemberUserIds.add(row.assignedTechnicianId);
    }
  }

  return { jobs: detectorJobs, assignments, laborEntries, invoices, activeMemberUserIds };
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}\n`);
  process.exit(1);
});
