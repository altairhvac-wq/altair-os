/**
 * Storage authorization structure verification (Phase 4 / P1-11).
 *
 * ===================== WHAT IS PROVED HERE, AND WHAT IS NOT =====================
 * Migrations 153, 154 and 156 moved company-file authorization from "any member
 * of the company" to "whoever may read the owning row". Three separate things
 * have to stay in agreement for that to hold, and they live in files that
 * nothing otherwise ties together:
 *
 *   1. lib/storage/company-files.ts  — builds the object keys
 *   2. migration 153                 — parses those keys back into ids
 *   3. migrations 154 / 156          — decide who may read the object and the row
 *
 * If someone adds a third path family to the builder, or reorders a segment,
 * the parser in 153 silently misreads it and the policy denies (or worse,
 * allows) the wrong thing. That is the drift this script exists to catch, and
 * it is checkable offline.
 *
 * NOT PROVED HERE: that Postgres, executing these policies against real
 * signed-in users, actually allows and denies the right people. Structure
 * agreeing with itself is not evidence about behavior. That is
 * scripts/verify-storage-matrix-live.mjs, which needs a scratch project and
 * runs its assertions as seven real users.
 *
 * Offline and side-effect free.
 *
 * Run: node scripts/verify-storage-matrix.mjs
 */
import { readFileSync } from "node:fs";

const BUILDER = "lib/storage/company-files.ts";
const M153 = "supabase/migrations/153_company_files_row_authorization.sql";
const M154 = "supabase/migrations/154_drop_broad_company_files_read_policy.sql";
const M156 = "supabase/migrations/156_job_attachment_row_visibility.sql";
const LIVE = "scripts/verify-storage-matrix-live.mjs";

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

/**
 * Strip block comments FIRST, then line comments. Doing it in the other order
 * removes the lines that close a docblock, after which the block-comment
 * pattern runs past its terminator and swallows real code — which produces
 * confident, wrong PASSes and FAILs. This ordering bug has bitten these
 * verifiers before; keep it in this order.
 */
function stripComments(source, lineToken) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith(lineToken))
    .join("\n");
}

const builder = readFileSync(BUILDER, "utf8");
const m153 = readFileSync(M153, "utf8");
const m153Code = stripComments(m153, "--");
const m154Code = stripComments(readFileSync(M154, "utf8"), "--");
const m156Code = stripComments(readFileSync(M156, "utf8"), "--");
const live = readFileSync(LIVE, "utf8");

console.log("\nPath families are exhaustive and stable");

// The builders are the ONLY producers of keys in this bucket. If a third
// appears, 153's "unknown family -> deny" turns a working feature into a silent
// permission error, so it must be a deliberate, visible change.
const builderFamilies = [...builder.matchAll(/^\s*"(expenses|jobs)",$/gm)].map(
  (match) => match[1],
);
check(
  "lib/storage/company-files.ts builds exactly two path families",
  builderFamilies.length === 2 &&
    builderFamilies.includes("expenses") &&
    builderFamilies.includes("jobs"),
  `found: ${JSON.stringify(builderFamilies)}`,
);

check(
  "there are exactly two exported path builders",
  (builder.match(/^export function build\w+StoragePath/gm) ?? []).length === 2,
);

// Segment ORDER is the contract between the builder and 153's parser.
const expenseBuilder = builder.slice(
  builder.indexOf("export function buildExpenseReceiptStoragePath"),
);
check(
  "the expense key is company/{companyId}/expenses/{expenseId}/{file}",
  /"company",\s*input\.companyId,\s*"expenses",\s*input\.expenseId,\s*safeName,/s.test(
    expenseBuilder,
  ),
);

const jobBuilder = builder.slice(
  builder.indexOf("export function buildJobAttachmentStoragePath"),
  builder.indexOf("export function buildExpenseReceiptStoragePath"),
);
check(
  "the job key is company/{companyId}/jobs/{jobId}/{attachmentId}/{file}",
  /"company",\s*input\.companyId,\s*"jobs",\s*input\.jobId,\s*input\.attachmentId,\s*safeName,/s.test(
    jobBuilder,
  ),
);

console.log("\nMigration 153 parses those keys the way they are written");

check(
  "segment 2 is read as the company id and segment 4 as the entity id",
  /v_company_id\s*:=\s*v_segments\[2\]::uuid/.test(m153Code) &&
    /v_entity_id\s*:=\s*v_segments\[4\]::uuid/.test(m153Code),
);

// For the jobs family, segment 4 is the JOB id, not the attachment id. Getting
// this backwards would gate byte access on the wrong row entirely.
const jobsBranch = m153Code.slice(m153Code.indexOf("if v_family = 'jobs'"));
check(
  "the jobs branch resolves the JOB row, so access follows job assignment",
  /from public\.jobs j/.test(jobsBranch) && /j\.id = v_entity_id/.test(jobsBranch),
);

check(
  "a failed uuid cast denies instead of raising",
  /when invalid_text_representation then[\s\S]{0,60}return false;/.test(m153Code),
);

check(
  "a key with fewer than four segments is denied",
  /array_length\(v_segments, 1\) < 4/.test(m153Code),
);

check(
  "anonymous callers are rejected before any lookup",
  m153Code.indexOf("auth.uid() is null") > -1 &&
    m153Code.indexOf("auth.uid() is null") < m153Code.indexOf("storage.foldername"),
);

console.log("\nThe two halves of an attachment agree");

// 153 gates the BYTES on can_view_operational_jobs OR assignment. 156 must gate
// the ROW on the same predicate, or the file name leaks where the file cannot.
const bytePredicate =
  /can_view_operational_jobs\([^)]*\)\s*or\s*j\.assigned_technician_id = auth\.uid\(\)/;
check(
  "migration 153 gates attachment BYTES on job visibility",
  bytePredicate.test(jobsBranch),
);
check(
  "migration 156 gates attachment ROWS on the same predicate",
  (m156Code.match(new RegExp(bytePredicate, "g")) ?? []).length === 2,
  "expected the predicate on both the SELECT and the INSERT policy",
);

check(
  "156 replaces the broad row policies rather than adding alongside them",
  /drop policy if exists "company members can read job attachments"/.test(m156Code) &&
    /drop policy if exists "company members can insert job attachments"/.test(
      m156Code,
    ),
);

// PERMISSIVE policies combine with OR, so a leftover broad policy would undo
// the entire narrowing. 154 exists solely to remove the read one.
check(
  "154 drops the broad company-files read policy",
  /drop policy[\s\S]{0,120}company members can read company files/i.test(m154Code),
);

console.log("\nNo new privileged surface (the migration 148 failure mode)");

check(
  "156 defines no new function at all",
  !/create\s+(or\s+replace\s+)?function/i.test(m156Code),
);
check("156 grants execute to nobody", !/\bgrant\s+execute\b/i.test(m156Code));
check(
  "153's helper is SECURITY DEFINER with a pinned search_path",
  /security definer/i.test(m153Code) &&
    /set search_path\s*=\s*public,\s*pg_temp/i.test(m153Code),
);

console.log("\nThe live matrix stays in step with the builders");

// verify-storage-matrix-live.mjs duplicates the two path shapes because it is
// plain .mjs and the builder is TypeScript. That duplication is only safe if it
// is checked, which is what this section is for.
check(
  "the live script builds the expense key the same way",
  /company\/\$\{companyId\}\/expenses\/\$\{expenseId\}\/\$\{FILE_NAME\}/.test(live),
);
check(
  "the live script builds the job key the same way",
  /company\/\$\{companyId\}\/jobs\/\$\{jobId\}\/\$\{attachmentId\}\/\$\{FILE_NAME\}/.test(
    live,
  ),
);
check(
  "the live script refuses to run against the application's own project",
  /NEXT_PUBLIC_SUPABASE_URL/.test(live) && /--confirm/.test(live),
);
check(
  "the live script signs users in with the anon key, not the service key",
  /ANON_ENV/.test(live) && !/anonKey \?\? target\.key/.test(live),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} storage authorization structure checks passed (${checks} total).`,
);
console.log(
  "\n  NOT proved here: that Postgres actually allows and denies the right people.\n" +
    "  That is scripts/verify-storage-matrix-live.mjs, which needs a scratch project.\n",
);
if (failures > 0) process.exit(1);
