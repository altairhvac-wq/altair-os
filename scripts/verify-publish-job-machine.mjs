/**
 * The publish queue's state machine, and the migration that persists it.
 *
 * ==================== WHAT THIS IS ACTUALLY GUARDING ====================
 * Two numbers and one key. `JOB_LEASE_MS` must outlast every `pollBudgetMs`
 * in the capability matrix, or a lease expires while a legitimate poll is
 * still running, a second worker reclaims the row, and the same content goes
 * out twice — the duplicate publish the delivery ledger exists to prevent,
 * reintroduced one layer above it. And the queue's unique key must be
 * character for character the ledger's, or the queue can enqueue a second job
 * for work the ledger has already claimed.
 *
 * Neither is checkable by TypeScript: one is a comparison between two
 * unrelated constants, the other is a comparison between TypeScript and SQL.
 * So they are checked here, against the REAL capability matrix and the REAL
 * migration text — not against a copy either could drift from.
 *
 * Purely static. It reads source and SQL from disk, stubs nothing external,
 * opens no socket, reads no credential, and cannot publish anything.
 *
 * Run: node scripts/verify-publish-job-machine.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { loadPureModule } from "./lib/load-pure-module.mjs";

const loadTs = (path) => loadPureModule(path, "job");

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail ?? "");
  }
}

const MIGRATION = "184_marketing_publish_jobs.sql";
const LEDGER_MIGRATION = "143_marketing_channel_publishing.sql";

/**
 * Comments stripped and lowercased, so prose can never satisfy a check.
 *
 * A missing migration throws out of `readFileSync` and takes the whole run
 * with it. That is deliberate: a verifier that degrades to an empty string
 * when its subject is gone still reports a number of passing checks, and the
 * one thing it must never do is look green with nothing under it.
 */
function readSql(file) {
  return readFileSync(join("supabase/migrations", file), "utf8")
    .replace(/--[^\n]*/g, "")
    .toLowerCase();
}

/**
 * The single statement beginning at `needle`, up to its terminating semicolon.
 *
 * Structural checks are scoped through this rather than run against the whole
 * migration. A `[\s\S]*?` regex over an entire file can be satisfied by the
 * front half of one statement and the back half of another — which is exactly
 * how a check keeps passing after the thing it was written to guard is
 * deleted. An absent statement yields "", so every regex against it fails.
 */
function statementWith(sqlText, needle) {
  const start = sqlText.indexOf(needle);
  if (start < 0) return "";
  const end = sqlText.indexOf(";", start);
  return end < 0 ? "" : sqlText.slice(start, end + 1);
}

/** Every `do $$ ... end $$;` block, so a guard is checked where it lives. */
function doBlocks(sqlText) {
  return sqlText.match(/do\s+\$\$[\s\S]*?end\s+\$\$;/g) ?? [];
}

const sql = readSql(MIGRATION);
const ledgerSql = readSql(LEDGER_MIGRATION);

// The column and constraint list only. The body carries no inner semicolon,
// so the first one after `create table` terminates it.
const tableBody = statementWith(
  sql,
  "create table if not exists public.marketing_publish_jobs (",
);
const guardedBlocks = doBlocks(sql);

const job = await loadTs("shared/types/publish-job.ts");
const delivery = await loadTs("shared/types/marketing-delivery.ts");
const capability = await loadTs("shared/types/integration-capability.ts");

const NOW = "2026-09-01T12:00:00.000Z";
const nowMs = Date.parse(NOW);
const at = (deltaMs) => new Date(nowMs + deltaMs).toISOString();

/* ------------------------------------------------------- state vocabulary */

console.log("\nState vocabulary");

const REQUIRED = [
  "draft",
  "ready_for_approval",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
];

check(
  "the eight required queue states are declared, in order",
  job.PUBLISH_JOB_STATES.join(",") === REQUIRED.join(","),
  job.PUBLISH_JOB_STATES,
);

// Literal-for-literal against the CHECK. A TypeScript union that drifts from
// the constraint produces a row Postgres refuses to write, discovered in
// production by whoever first tried to enqueue the missing state.
const checkLiterals = (tableBody.match(/job_state\s+in\s*\(([^)]*)\)/)?.[1] ?? "")
  .split(",")
  .map((v) => v.trim().replace(/^'|'$/g, ""))
  .filter(Boolean);

check(
  "PUBLISH_JOB_STATES matches the SQL CHECK literal-for-literal",
  checkLiterals.length === job.PUBLISH_JOB_STATES.length &&
    checkLiterals.every((v, i) => v === job.PUBLISH_JOB_STATES[i]),
  { sql: checkLiterals, ts: job.PUBLISH_JOB_STATES },
);

check(
  "every state has operator-facing copy",
  job.PUBLISH_JOB_STATES.every((s) => {
    const text = job.describeJobState(s);
    return typeof text === "string" && text.length > 0;
  }),
);

// The vocabulary has no word for "the provider took it as an unpublished
// draft", so `published` must not be worded as a claim that anything is live.
check(
  "the copy for `published` points at the delivery record rather than claiming the content is live",
  /deliver/.test(job.describeJobState("published")),
  job.describeJobState("published"),
);

/* ---------------------------------------------- the lease outlives the poll */

console.log("\nThe lease outlives every poll");

const budgets = Object.values(capability.INTEGRATION_CAPABILITIES).map((c) => ({
  provider: c.provider,
  pollBudgetMs: c.pollBudgetMs,
}));
// A per-provider loop over an empty matrix asserts nothing while printing
// nothing, so the matrix is proved non-empty before its contents are trusted.
check(
  "the capability matrix has providers to compare the lease against",
  budgets.length > 0,
  budgets.length,
);
const worst = budgets.length
  ? budgets.reduce((a, b) => (b.pollBudgetMs > a.pollBudgetMs ? b : a))
  : { provider: "(none)", pollBudgetMs: Infinity };

for (const { provider, pollBudgetMs } of budgets) {
  check(
    `JOB_LEASE_MS outlasts ${provider}'s poll budget (${pollBudgetMs}ms)`,
    job.JOB_LEASE_MS > pollBudgetMs,
    { lease: job.JOB_LEASE_MS, pollBudgetMs },
  );
}

check(
  `the longest poll budget in the matrix is ${worst.provider}'s ${worst.pollBudgetMs}ms and the lease still exceeds it`,
  job.JOB_LEASE_MS > worst.pollBudgetMs,
);

// The ledger must be the first to call an attempt abandoned, because the
// ledger is the only thing that can refuse a second external write.
check(
  "JOB_LEASE_MS exceeds DELIVERY_IN_FLIGHT_GRACE_MS, so the queue never gives up before the ledger does",
  job.JOB_LEASE_MS > delivery.DELIVERY_IN_FLIGHT_GRACE_MS,
  { lease: job.JOB_LEASE_MS, grace: delivery.DELIVERY_IN_FLIGHT_GRACE_MS },
);

check(
  "leaseExpiryFor places the boundary exactly one lease ahead",
  Date.parse(job.leaseExpiryFor(NOW)) - nowMs === job.JOB_LEASE_MS,
);

/* --------------------------------------------------- leasing fails to SKIP */

console.log("\nLeasing, and what it refuses");

const scheduled = (over = {}) => ({
  jobState: "scheduled",
  runAfter: at(-1000),
  leaseExpiresAt: null,
  ...over,
});
const publishing = (over = {}) => ({
  jobState: "publishing",
  runAfter: at(-60_000),
  leaseExpiresAt: at(-1000),
  ...over,
});

check(
  "due scheduled work is leased",
  job.decideJobLease(scheduled(), NOW) === "LEASE",
);
check(
  "work whose run_after has not passed is skipped",
  job.decideJobLease(scheduled({ runAfter: at(1000) }), NOW) === "SKIP",
);
check(
  "an unparseable run_after fails safe to SKIP, never LEASE",
  job.decideJobLease(scheduled({ runAfter: "whenever" }), NOW) === "SKIP",
);
check(
  "an unparseable clock reading fails safe to SKIP, never LEASE",
  job.decideJobLease(scheduled(), "not-a-timestamp") === "SKIP",
);
check(
  "an expired lease is reclaimed",
  job.decideJobLease(publishing(), NOW) === "RECLAIM",
);
check(
  "a live lease is left alone",
  job.decideJobLease(publishing({ leaseExpiresAt: at(60_000) }), NOW) === "SKIP",
);
check(
  "a publishing row with NO lease is skipped — an unknown expiry is not an expired one",
  job.decideJobLease(publishing({ leaseExpiresAt: null }), NOW) === "SKIP",
);
check(
  "an unparseable lease expiry fails safe to SKIP, never RECLAIM",
  job.decideJobLease(publishing({ leaseExpiresAt: "soon" }), NOW) === "SKIP",
);

// The whole point of the decision: nothing outside `scheduled` may reach a
// provider, however overdue its timestamps look.
const leakers = job.PUBLISH_JOB_STATES.filter(
  (s) =>
    s !== "scheduled" &&
    job.decideJobLease(
      { jobState: s, runAfter: at(-86_400_000), leaseExpiresAt: at(-86_400_000) },
      NOW,
    ) === "LEASE",
);
check("no state other than `scheduled` can ever be LEASEd", leakers.length === 0, leakers);

// `filter(...).every(...)` is a claim only while the filter leaves something
// behind: shrink the vocabulary to `["LEASE"]` and the old form passed over an
// empty list. The vocabulary is pinned first, and the remainder counted.
check(
  "the three lease decisions are declared, in order",
  job.JOB_LEASE_DECISIONS.join(",") === "LEASE,SKIP,RECLAIM",
  job.JOB_LEASE_DECISIONS,
);
const nonLeasing = job.JOB_LEASE_DECISIONS.filter((d) => d !== "LEASE");
check(
  "mayLease is true for LEASE and false for everything else",
  job.mayLease("LEASE") &&
    nonLeasing.length === job.JOB_LEASE_DECISIONS.length - 1 &&
    nonLeasing.length > 0 &&
    nonLeasing.every((d) => !job.mayLease(d)),
  nonLeasing,
);
check(
  "RECLAIM is not permission to publish",
  !job.mayLease("RECLAIM"),
);

/* ----------------------------------------------------------------- backoff */

console.log("\nBackoff strictly increases");

const delays = [1, 2, 3, 4, 5, 6].map(
  (attempt) => Date.parse(job.nextRunAfter(attempt, NOW)) - nowMs,
);
check(
  "each attempt waits strictly longer than the last",
  delays.every((d, i) => i === 0 || d > delays[i - 1]),
  delays,
);
check("the first retry is in the future", delays[0] > 0, delays[0]);
check(
  "the first retry waits JOB_BACKOFF_MS",
  delays[0] === job.JOB_BACKOFF_MS,
  delays,
);

// No clamp is needed because the CHECK bounds `max_attempts`; this asserts the
// largest delay a real row can reach stays sane.
check(
  `the delay at the schema's ceiling (${job.JOB_MAX_ATTEMPTS_CEILING} attempts) stays under an hour`,
  delays[job.JOB_MAX_ATTEMPTS_CEILING - 1] < 60 * 60_000,
  delays[job.JOB_MAX_ATTEMPTS_CEILING - 1],
);

let threw = false;
try {
  job.nextRunAfter(1, "not-a-timestamp");
} catch {
  threw = true;
}
check(
  "an unparseable clock throws rather than producing an Invalid Date",
  threw,
);

/* ---------------------------------------------------------------- outcomes */

console.log("\nAttempt outcomes");

const outcome = (over) =>
  job.decideJobOutcome({
    outcome: "failed",
    attempt: 1,
    maxAttempts: 3,
    nowIso: NOW,
    ...over,
  });

const requeued = outcome({ attempt: 1, errorDetail: "provider timed out" });
check("a failure below the ceiling returns to the queue", requeued.jobState === "scheduled");
check(
  "the requeue is pushed into the future",
  Date.parse(requeued.runAfter) > nowMs,
  requeued.runAfter,
);
check(
  "the requeue drops the lease — a queued job is owned by nobody",
  requeued.leaseExpiresAt === null && requeued.leasedBy === null,
);

check(
  "attempt === max_attempts is terminal",
  outcome({ attempt: 3, maxAttempts: 3 }).jobState === "failed",
);
// Absence, not `=== null`. Null was the weaker contract, and it was also an
// illegal one: `run_after` is `not null` in 184, so a decision that offered
// null offered a value the column would refuse. See the run_after section.
check(
  "a terminal failure schedules nothing — the key is absent, not null",
  !("runAfter" in outcome({ attempt: 3, maxAttempts: 3 })),
);
// A counter past its ceiling can only come from a corrupted row, and a queue
// that requeues one loops forever against a provider that already said no.
check(
  "an attempt count past the ceiling still terminates",
  outcome({ attempt: 9, maxAttempts: 3 }).jobState === "failed",
);
check(
  "Reddit's single attempt is terminal on the first failure",
  outcome({ attempt: 1, maxAttempts: 1 }).jobState === "failed",
);

const published = outcome({ outcome: "published", attempt: 1 });
check("a published attempt settles to `published`", published.jobState === "published");
check("a published attempt records no error", published.lastError === null);
check(
  "a published attempt schedules nothing — the key is absent, not null",
  !("runAfter" in published),
);

// The honest mapping: the queue is done, but nothing is live.
check(
  "a draft-only delivery settles the QUEUE to `published` through an explicit `drafted` outcome",
  outcome({ outcome: "drafted", attempt: 1 }).jobState === "published",
);

const long = outcome({ attempt: 1, errorDetail: "x".repeat(5000) });
// Typed before it is measured: a null `lastError` would throw here and abort
// every check below it, turning one failure into an unread report.
check(
  "error text is clamped to the ledger's bound rather than reforked",
  typeof long.lastError === "string" &&
    long.lastError.length > 0 &&
    long.lastError.length <= delivery.DELIVERY_FAILURE_DETAIL_MAX,
  long.lastError,
);
check(
  "PUBLISH_JOB_ERROR_MAX is the ledger's bound, not a second number",
  job.PUBLISH_JOB_ERROR_MAX === delivery.DELIVERY_FAILURE_DETAIL_MAX,
);

/* ------------------------------------- no decision can write a null run_after */

console.log("\nrun_after is NOT NULL, and no decision offers null");

// Read out of the create-table body, not the file: the migration's prose and
// its `comment on column` string both contain the words, and neither is the
// constraint. `[^,\n]*` stops at the column's own trailing comma.
const runAfterColumn = tableBody.match(/\brun_after\s+timestamptz([^,\n]*),/)?.[1];
const runAfterIsNotNull =
  typeof runAfterColumn === "string" && /\bnot\s+null\b/.test(runAfterColumn);
check(
  "run_after is declared NOT NULL in migration 184",
  runAfterIsNotNull,
  runAfterColumn ?? "(no run_after column found in the create table body)",
);

// Every decision `decideJobOutcome` can produce, across the outcome space and
// on both sides of the retry boundary. The pairing is the whole point: because
// the column above refuses null, a decision that carried `runAfter: null`
// would be an instruction to violate it — spread into an update by a caller
// with no reason to suspect the value, and rejected on the write that records
// an external call that already went out. So the key must be ABSENT on a
// terminal settle, present and a real timestamp on a requeue, and null never.
const everyDecision = ["published", "drafted", "failed"].flatMap((o) =>
  [1, 2, 3, 6, 9].map((attempt) => ({
    label: `${o} at attempt ${attempt} of 3`,
    decision: outcome({ outcome: o, attempt, maxAttempts: 3 }),
  })),
);
check(
  "the decision space actually enumerated something",
  everyDecision.length === 15,
  everyDecision.length,
);

const nullRunAfter = everyDecision.filter(
  ({ decision }) => "runAfter" in decision && decision.runAfter === null,
);
check(
  "no decision offers a null run_after, which the column would refuse",
  runAfterIsNotNull && nullRunAfter.length === 0,
  nullRunAfter.map((d) => d.label),
);

const wrongShape = everyDecision.filter(({ decision }) =>
  decision.jobState === "scheduled"
    ? typeof decision.runAfter !== "string" ||
      Number.isNaN(Date.parse(decision.runAfter))
    : "runAfter" in decision,
);
check(
  "run_after is present as a real timestamp exactly when the job requeues, and absent otherwise",
  wrongShape.length === 0,
  wrongShape.map((d) => ({ case: d.label, decision: d.decision })),
);

// The failure the absence prevents, written out: a caller spreading the
// decision into a column patch must not produce a run_after key at all.
const patchKeys = (decision) => Object.keys({ ...decision });
check(
  "spreading a terminal decision into a patch names no run_after column",
  everyDecision
    .filter(({ decision }) => decision.jobState !== "scheduled")
    .every(({ decision }) => !patchKeys(decision).includes("runAfter")),
);

/* ------------------------------------------------------------- transitions */

console.log("\nIllegal transitions are refused");

check(
  "PUBLISHED to PUBLISHING is refused",
  !job.canTransitionJobState("published", "publishing"),
);
check(
  "PUBLISHED is terminal — no target at all",
  job.PUBLISH_JOB_STATES.every((to) => !job.canTransitionJobState("published", to)),
);
check(
  "CANCELLED is terminal — no target at all",
  job.PUBLISH_JOB_STATES.every((to) => !job.canTransitionJobState("cancelled", to)),
);
check(
  "no state may transition to itself",
  job.PUBLISH_JOB_STATES.every((s) => !job.canTransitionJobState(s, s)),
);
// Approval is recordable nowhere else, so it cannot be an optional stop.
check(
  "draft cannot skip approval and reach scheduled",
  !job.canTransitionJobState("draft", "scheduled"),
);
check(
  "approved cannot skip scheduling and reach publishing",
  !job.canTransitionJobState("approved", "publishing"),
);
// Once the call may already be out, "cancelled" would be a claim we stopped it.
check(
  "a job that is publishing cannot be cancelled",
  !job.canTransitionJobState("publishing", "cancelled"),
);

check(
  "the approval path is walkable end to end",
  job.canTransitionJobState("draft", "ready_for_approval") &&
    job.canTransitionJobState("ready_for_approval", "approved") &&
    job.canTransitionJobState("approved", "scheduled") &&
    job.canTransitionJobState("scheduled", "publishing") &&
    job.canTransitionJobState("publishing", "published"),
);
check(
  "a leased job can settle either way, or be requeued",
  job.canTransitionJobState("publishing", "published") &&
    job.canTransitionJobState("publishing", "failed") &&
    job.canTransitionJobState("publishing", "scheduled"),
);
// The unique key allows one job per (company, post, provider) forever, so
// "send it back for edits" has to be a transition, not cancel-and-recreate.
check(
  "scheduled work can be withdrawn for edits without burning the row",
  job.canTransitionJobState("scheduled", "draft"),
);
check(
  "a failed job can be reopened, matching the ledger's retake of a failed delivery",
  job.canTransitionJobState("failed", "draft"),
);

const unknownTargets = job.PUBLISH_JOB_STATES.flatMap((from) =>
  job.allowedJobTransitions(from).filter((to) => !job.PUBLISH_JOB_STATES.includes(to)),
);
check(
  "every transition target is a declared state",
  unknownTargets.length === 0,
  unknownTargets,
);

const terminal = job.PUBLISH_JOB_STATES.filter((s) => job.isTerminalJobState(s));
check(
  "exactly `published` and `cancelled` are terminal",
  terminal.join(",") === "published,cancelled",
  terminal,
);

/* -------------------------------------------------------------- the table */

console.log("\nMigration 184");

// Named first, so gutting or renaming the table reads as one legible failure
// instead of a wall of unrelated ones from checks scoped to an empty string.
check(
  "the queue's create table statement was found and scoped",
  tableBody.startsWith("create table if not exists public.marketing_publish_jobs (") &&
    tableBody.endsWith(";"),
  tableBody.slice(0, 80),
);

const ledgerKey = ledgerSql.match(
  /unique\s*\(\s*company_id,\s*marketing_post_id,\s*provider\s*\)/,
);
const queueKey = tableBody.match(
  /unique\s*\(\s*company_id,\s*marketing_post_id,\s*provider\s*\)/,
);
check(
  "the queue is keyed identically to the delivery ledger, so it cannot outrun it",
  Boolean(ledgerKey) && Boolean(queueKey),
  { ledger: ledgerKey?.[0], queue: queueKey?.[0] },
);

check(
  "company-scoped with a cascading foreign key",
  /company_id\s+uuid\s+not\s+null\s+references\s+public\.companies\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/.test(
    tableBody,
  ),
);

/**
 * The one `do $$ ... end $$;` block that adds `name`, and only if that block
 * is the only place the constraint is added and carries its own pg_constraint
 * guard.
 *
 * The earlier form of the idempotency check — `pg_constraint[\s\S]*?<name>`
 * over the whole file — was satisfied by the OTHER constraint's guard: delete
 * this one's `do` block entirely, leave a bare `alter table ... add
 * constraint`, and the check stayed green while a re-run of the migration
 * would abort on "constraint already exists".
 */
function guardedAdd(name) {
  const adds = new RegExp(`add\\s+constraint\\s+${name}\\b`, "g");
  const total = (sql.match(adds) ?? []).length;
  const blocks = guardedBlocks.filter(
    (b) =>
      /if\s+not\s+exists\s*\(\s*select\s+1\s+from\s+pg_constraint/.test(b) &&
      new RegExp(`add\\s+constraint\\s+${name}\\b`).test(b),
  );
  return { ok: total === 1 && blocks.length === 1, total, block: blocks[0] ?? "" };
}

const postFkey = guardedAdd("marketing_publish_jobs_post_fkey");
const packageFkey = guardedAdd("marketing_publish_jobs_content_package_fkey");

// Tenancy as a composite foreign key, not an application check.
check(
  "the post reference is a composite foreign key over (id, company_id)",
  /foreign\s+key\s*\(\s*marketing_post_id,\s*company_id\s*\)\s*references\s+public\.marketing_posts\s*\(\s*id,\s*company_id\s*\)/.test(
    postFkey.block,
  ),
  postFkey.block,
);
check(
  "the parent carries the matching unique index the composite key needs",
  /create\s+unique\s+index\s+if\s+not\s+exists\s+marketing_posts_id_company_key\s+on\s+public\.marketing_posts\s*\(\s*id,\s*company_id\s*\)/.test(
    statementWith(sql, "create unique index if not exists marketing_posts_id_company_key"),
  ),
);
check(
  "the post foreign key is added exactly once, inside its own pg_constraint guard",
  postFkey.ok,
  { addStatements: postFkey.total },
);
check(
  "the content-package reference is a composite foreign key over (id, company_id)",
  /foreign\s+key\s*\(\s*content_package_id,\s*company_id\s*\)\s*references\s+public\.marketing_content_packages\s*\(\s*id,\s*company_id\s*\)/.test(
    packageFkey.block,
  ),
  packageFkey.block,
);
check(
  "the content-package foreign key is added exactly once, inside its own pg_constraint guard",
  packageFkey.ok,
  { addStatements: packageFkey.total },
);
// 182 declares marketing_content_packages_id_company_key. If that migration
// ever stopped covering the pair, this foreign key would fail at apply time
// on a fresh database — so the dependency is asserted rather than assumed.
check(
  "migration 182 still covers the pair this foreign key references",
  /create\s+unique\s+index\s+if\s+not\s+exists\s+marketing_content_packages_id_company_key\s+on\s+public\.marketing_content_packages\s*\(\s*id,\s*company_id\s*\)/.test(
    readSql("182_marketing_content_packages.sql"),
  ),
);

check(
  "row level security is enabled",
  /alter\s+table\s+public\.marketing_publish_jobs\s+enable\s+row\s+level\s+security/.test(
    sql,
  ),
);
// Scoped to the policy statement: both helper calls appear elsewhere in a
// large migration often enough that a file-wide match would survive a policy
// that dropped one of them.
const readPolicy = statementWith(
  sql,
  'create policy "dispatchers can read marketing publish jobs"',
);
check(
  "the dispatcher read policy checks membership AND dispatch permission",
  /for\s+select/.test(readPolicy) &&
    /public\.is_active_company_member\s*\(\s*company_id\s*\)/.test(readPolicy) &&
    /public\.can_dispatch_jobs\s*\(\s*company_id\s*\)/.test(readPolicy),
  readPolicy,
);
check(
  "the policy is re-runnable",
  /drop\s+policy\s+if\s+exists\s+"dispatchers can read marketing publish jobs"/.test(
    sql,
  ),
);

// RLS narrows an existing privilege; it does not create one. A SELECT policy
// without the GRANT is silently inert (143 lines 147-151).
const GRANTS = [
  "grant select on table public.marketing_publish_jobs to authenticated;",
  "revoke insert, update, delete on table public.marketing_publish_jobs from authenticated;",
  "revoke all on table public.marketing_publish_jobs from anon;",
  "grant all on table public.marketing_publish_jobs to service_role;",
];
for (const line of GRANTS) {
  check(`grants: ${line}`, sql.includes(line));
}

const trigger = statementWith(
  sql,
  "create trigger marketing_publish_jobs_set_updated_at",
);
check(
  "the updated_at trigger is attached, with a preceding drop",
  /drop\s+trigger\s+if\s+exists\s+marketing_publish_jobs_set_updated_at/.test(sql) &&
    /before\s+update\s+on\s+public\.marketing_publish_jobs/.test(trigger) &&
    /execute\s+function\s+public\.set_updated_at\s*\(\s*\)/.test(trigger),
  trigger,
);

// The runner's actual query, and the reclaim sweep. Partial on purpose: the
// terminal states accumulate forever and must not be in the work-list index.
// Each is matched inside its OWN statement — a `[\s\S]*?` reaching from one
// `create index` into the next would let an index that lost its WHERE clause
// borrow the predicate of the index below it.
const runnableIdx = statementWith(
  sql,
  "create index if not exists marketing_publish_jobs_runnable_idx",
);
check(
  "a partial index covers queued work whose run_after has passed",
  /on\s+public\.marketing_publish_jobs\s*\(\s*run_after/.test(runnableIdx) &&
    /where\s+job_state\s*=\s*'scheduled'/.test(runnableIdx),
  runnableIdx,
);
const expiredLeaseIdx = statementWith(
  sql,
  "create index if not exists marketing_publish_jobs_expired_lease_idx",
);
check(
  "a partial index covers leases to reclaim",
  /on\s+public\.marketing_publish_jobs\s*\(\s*lease_expires_at\s*\)/.test(
    expiredLeaseIdx,
  ) && /where\s+job_state\s*=\s*'publishing'/.test(expiredLeaseIdx),
  expiredLeaseIdx,
);

// Constraints are read out of the create-table body. Against the whole file a
// `comment on column` string can carry the same words as a CHECK.
check(
  "last_error is length-bounded at the ledger's number",
  tableBody.includes(
    `char_length(last_error) <= ${job.PUBLISH_JOB_ERROR_MAX}`,
  ),
);
check(
  "the max_attempts ceiling in SQL matches JOB_MAX_ATTEMPTS_CEILING",
  new RegExp(
    `max_attempts\\s+between\\s+1\\s+and\\s+${job.JOB_MAX_ATTEMPTS_CEILING}`,
  ).test(tableBody),
);
// Half a lease is a row that can never be reclaimed, or one that is reclaimed
// while somebody still owns it.
check(
  "a lease cannot exist half-written",
  /\(\s*lease_expires_at\s+is\s+null\s*\)\s*=\s*\(\s*leased_by\s+is\s+null\s*\)/.test(
    tableBody,
  ),
);
check(
  "an approval cannot exist without an approver",
  /\(\s*approved_by\s+is\s+null\s*\)\s*=\s*\(\s*approved_at\s+is\s+null\s*\)/.test(
    tableBody,
  ),
);

check(
  "introduces no new public function (keeps verify-function-grants' contract simple)",
  !/create\s+(?:or\s+replace\s+)?function\s+public\./.test(sql),
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
