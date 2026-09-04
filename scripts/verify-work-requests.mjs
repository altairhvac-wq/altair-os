/**
 * Delegating work to the Agent Platform.
 *
 * Static and offline: the pure vocabulary is loaded and driven, and the
 * migration, route, action, query layer and UI are read as source.
 *
 * ==================== WHAT IS ASSERTED ====================
 * The claims that make delegation safe rather than convenient:
 *
 *   a request names ONE kind from a closed set — never a command
 *   asking twice asks for the work once
 *   the bridge is authenticated and the company comes from the server
 *   the browser cannot read, set or bypass a runner's consent gate
 *   an outcome can never be rewritten
 *   nothing on this path publishes, approves or spends
 *
 * ==================== THE SCHEMA IS READ ACROSS MIGRATIONS, NOT ONE FILE ====================
 * `agent_work_requests_kind_check` is not fixed at 189, the migration that
 * created the table — it is legitimately WIDENED later, by design: 191
 * restates it, and 194 adds 'schedule_mutation' via the same
 * drop-constraint-then-add-constraint pattern 194's own header calls out.
 * Comparing the TypeScript vocabulary against 189 alone reads a stale
 * snapshot from before that widening and reports a false mismatch the moment
 * a later migration legitimately does what this table's own comments say it
 * is designed to do. `resolveFinalKindCheck` below resolves the constraint
 * the way Postgres actually would: across every migration that redefines it,
 * in order, with the LAST redefinition governing — never just the first.
 *
 * Run: node scripts/verify-work-requests.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { loadPureModule } from "./lib/load-pure-module.mjs";

let failures = 0;
let checks = 0;
function check(name, condition, detail) {
  checks += 1;
  if (condition) console.log(`  PASS  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}`, detail === undefined ? "" : detail);
  }
}

const read = (p) => readFileSync(p, "utf8");
const strip = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(new RegExp("//[^\\n]*", "g"), "");

// SQL comments stripped: prose forbidding a thing has read as evidence of it
// before, and a migration is mostly prose here.
const stripSql = (src) =>
  src
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("--"))
    .join("\n")
    .toLowerCase();

const MIGRATIONS_DIR = "supabase/migrations";
const BASE_MIGRATION = "supabase/migrations/189_agent_work_requests.sql";
const ROUTE = "app/api/agent/work-requests/route.ts";
const ACTION = "app/actions/marketing-work-request.ts";
const QUERIES = "lib/database/queries/agent-work-requests.ts";
const VIEW = "shared/components/marketing-hub/MarketingCommandView.tsx";

for (const path of [BASE_MIGRATION, ROUTE, ACTION, QUERIES, VIEW]) {
  check(`${path} exists`, existsSync(path));
}
if (failures > 0) {
  console.error("\nMissing source; later checks would be vacuous.");
  process.exit(1);
}

/** The migration's own leading number, e.g. "194" from "194_....sql". Sorts numerically, not lexically — "9" must not land after "10". */
function migrationNumber(filename) {
  const match = /^(\d+)_/.exec(filename);
  return match ? Number.parseInt(match[1], 10) : Number.POSITIVE_INFINITY;
}

/**
 * Every migration touching `table`, in the order Postgres would actually
 * apply them. `table` is matched as plain text (not a table-name-aware SQL
 * parse) — sufficient here because every migration in this repo names the
 * tables it touches directly, and deliberately broad so a migration not yet
 * written today is picked up automatically rather than requiring this
 * script to be edited again the next time this table legitimately evolves.
 */
function loadOrderedMigrations(dir, table) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort((a, b) => migrationNumber(a) - migrationNumber(b))
    .map((name) => ({ name, content: stripSql(read(`${dir}/${name}`)) }))
    .filter(({ content }) => content.includes(table));
}

/**
 * The FINAL body of a `check (<column> in (...))` constraint, resolved
 * across an ORDERED list of migrations. Each migration that redefines the
 * named constraint — the original `CREATE TABLE`, or a later
 * `drop constraint ... add constraint ...` — replaces the one before it,
 * exactly as Postgres applies them in sequence; this walks the same list
 * and keeps only the LAST match. Returns null if no migration in the list
 * defines the constraint at all.
 *
 * Scoped to the constraint's own name first (`content.indexOf(marker)`) and
 * only THEN pattern-matched for `check (kind in (...))` — this codebase has
 * more than one `kind` column with its own CHECK enum in an unrelated table
 * (workflow reminders, marketing AI HQ, agent decisions, media formats), so
 * matching the bare pattern across a whole file without first anchoring on
 * the constraint name would silently pick up the wrong table's vocabulary.
 */
function resolveFinalCheckConstraint(orderedMigrations, constraintName) {
  const marker = constraintName.toLowerCase();
  let latest = null;
  for (const { name, content } of orderedMigrations) {
    const at = content.indexOf(marker);
    if (at === -1) continue;
    const match = content.slice(at).match(/check\s*\(\s*kind\s+in\s*\(([^)]*)\)\)/);
    if (match) latest = { name, clause: match[0], values: match[1] };
  }
  return latest;
}

const orderedMigrations = loadOrderedMigrations(MIGRATIONS_DIR, "agent_work_requests");
check(
  "at least one migration defines agent_work_requests",
  orderedMigrations.length > 0,
  orderedMigrations.map((m) => m.name),
);

// The concatenated, ORDERED corpus. Every other check below asks "was this
// fact ever established for this table" (RLS enabled, a grant, the unique
// key, the outcome vocabulary) rather than "what does the constraint say
// AS OF RIGHT NOW" — those are monotonic and safe to check against the
// union of every relevant migration. Only the `kind` vocabulary is governed
// by replace-semantics (a later migration can DROP the exact fact an
// earlier one established), which is why it gets its own resolver above
// instead of a substring search over this corpus.
const migration = orderedMigrations.map((m) => m.content).join("\n");
const route = strip(read(ROUTE));
const action = strip(read(ACTION));
const queries = strip(read(QUERIES));
const view = strip(read(VIEW));

const work = await loadPureModule("shared/types/agent-work-request.ts", "work");

/* ===================== a closed vocabulary, not a command ===================== */

console.log("\nA request names one known thing, and cannot carry a command");

check(
  "the vocabulary is a closed set",
  Array.isArray(work.WORK_REQUEST_KINDS) && work.WORK_REQUEST_KINDS.length > 0,
  work.WORK_REQUEST_KINDS,
);
check(
  "every kind has a descriptor, so none can render blank",
  work.WORK_REQUEST_KINDS.every(
    (kind) => work.WORK_REQUEST_DESCRIPTORS[kind]?.label,
  ),
);
check(
  "every kind names the platform gate that must allow it",
  work.WORK_REQUEST_KINDS.every((kind) =>
    /^RUN_[A-Z_]+$/.test(
      work.WORK_REQUEST_DESCRIPTORS[kind]?.platformGate ?? "",
    ),
  ),
  work.WORK_REQUEST_KINDS.map(
    (k) => work.WORK_REQUEST_DESCRIPTORS[k]?.platformGate,
  ),
);
check(
  "AN UNKNOWN KIND IS NOT A KIND",
  !work.isWorkRequestKind("publish_everything") &&
    !work.isWorkRequestKind("") &&
    !work.isWorkRequestKind(null),
);
const kindConstraint = resolveFinalCheckConstraint(
  orderedMigrations,
  "agent_work_requests_kind_check",
);
check(
  "the database agrees with the code about the vocabulary (resolved across every migration that redefines the constraint, not just the one that created the table)",
  kindConstraint !== null &&
    work.WORK_REQUEST_KINDS.every((kind) => kindConstraint.values.includes(`'${kind}'`)),
  kindConstraint,
);

/* ========== regression: a later migration may legitimately evolve a constraint ========== */

console.log("\nA later forward migration can legitimately evolve the constraint");

{
  // Synthetic, in-memory migration history — not real files. Proves
  // resolveFinalCheckConstraint reads the LAST migration that redefines a
  // constraint rather than caching whichever one first created the table,
  // which is exactly the shape of bug that made 194's real 'schedule_mutation'
  // addition read as a false mismatch above.
  const syntheticHistory = [
    {
      name: "100_fake_base.sql",
      content: stripSql(
        "create table public.fake (\n" +
          "  kind text not null,\n" +
          "  constraint fake_kind_check check (kind in ('a', 'b'))\n" +
          ");",
      ),
    },
    {
      // An intervening migration that touches the same table but never
      // mentions the constraint — must not reset or hide the resolution.
      name: "101_fake_unrelated_column.sql",
      content: stripSql("alter table public.fake add column note text;"),
    },
    {
      // The later, LEGITIMATE widening — this repo's own established
      // pattern (191, 194): drop the constraint, add it back wider.
      name: "102_fake_widens_kind.sql",
      content: stripSql(
        "alter table public.fake drop constraint if exists fake_kind_check;\n" +
          "alter table public.fake add constraint fake_kind_check check (kind in ('a', 'b', 'c'));",
      ),
    },
  ];

  const resolved = resolveFinalCheckConstraint(syntheticHistory, "fake_kind_check");
  check(
    "the resolver follows the LAST migration that redefines the constraint, not the first",
    resolved !== null && resolved.name === "102_fake_widens_kind.sql",
    resolved,
  );
  check(
    "a value only the later migration added is recognised as legitimate",
    resolved !== null && resolved.values.includes("'c'"),
    resolved,
  );
  check(
    "an unrelated intervening migration neither resets nor hides the resolution",
    resolved !== null && resolved.values.includes("'a'") && resolved.values.includes("'b'"),
    resolved,
  );

  // The negative case, so this cannot pass by accident: reading ONLY the
  // base migration — the exact bug being fixed here — must NOT see the
  // later kind. If it did, the checks above would be tautological.
  const baseOnly = resolveFinalCheckConstraint([syntheticHistory[0]], "fake_kind_check");
  check(
    "the base migration alone (the old, buggy comparison) does NOT show the later kind — confirms this is a real regression check, not a tautology",
    baseOnly !== null && !baseOnly.values.includes("'c'"),
    baseOnly,
  );
}

// The CALL SITE, not the import. Comparing against `enqueueWorkRequest` as a
// bare name compares against the import line at the top of the file, which
// every guard trivially precedes — a vacuous check that passed until the
// sibling below failed and exposed it.
const enqueueCall = action.indexOf("enqueueWorkRequest({");
check(
  "the enqueue call is found, so the ordering checks mean something",
  enqueueCall > 0,
);
check(
  "THE ACTION REFUSES A KIND OUTSIDE THE SET BEFORE WRITING ANYTHING",
  /isWorkRequestKind\(input\.kind\)/.test(action) &&
    action.indexOf("isWorkRequestKind(input.kind)") < enqueueCall,
);
check(
  "there is no free-text command field anywhere on the path",
  !/\bcommand\b/i.test(action) &&
    !/\bcommand\b/i.test(route) &&
    !/\bargv?\b|spawn|exec/i.test(action + route + queries),
);

/* ============================== idempotency ============================== */

console.log("\nAsking twice asks for the work once");

check(
  "the key is unique per company in the schema",
  /unique \(company_id, request_key\)/.test(migration),
);
check(
  "a duplicate insert is INTERPRETED, not pre-checked",
  queries.includes('=== "23505"') &&
    queries.indexOf(".insert(") < queries.indexOf('=== "23505"'),
);
check(
  "and the caller is told it was a duplicate rather than an error",
  /duplicate: true/.test(queries) && /duplicate:/.test(action),
);
check(
  "THE BUTTON HOLDS ITS KEY, so a double click is one request",
  // Minting a fresh key inside the handler would make a double-click two rows.
  /keys\[kind\] \?\?/.test(view),
);

/* ========================= authority and boundaries ========================= */

console.log("\nThe browser can ask; only the platform can agree");

check(
  "the bridge route is authenticated",
  route.includes("isAuthorizedAgentRequest(request)"),
);
check(
  "the company comes from the server, never the request",
  route.includes("getAgentIngestCompanyId()") &&
    !/companyId.*(searchParams|payload\.|body\.)/.test(route),
);
check(
  "and the handed-over list is filtered to that company",
  /\.filter\(\(entry\) => entry\.companyId === companyId\)/.test(route),
);
check(
  "the action checks Marketing access before queueing",
  action.includes('canAccessAdminNavItem(context, "/marketing")') &&
    action.indexOf('canAccessAdminNavItem(context, "/marketing")') <
      enqueueCall,
);
check(
  "NO CONSENT GATE IS READABLE OR SETTABLE FROM ALTAIR OS",
  // The gate lives in the platform's environment. If this side could read it,
  // it would be a label rather than a second consent.
  !/process\.env\.RUN_/.test(action + route + queries + view),
);
check(
  "the client view imports no server module",
  !/from "@\/lib\/(supabase|agent-bridge)\//.test(view),
);
check(
  "and names no secret variable",
  !/AGENT_INGEST_SECRET|SERVICE_ROLE|ANTHROPIC/.test(view),
);

/* ============================ honest outcomes ============================ */

console.log("\nAn outcome is recorded once, and reported honestly");

check(
  "refused and failed are distinct outcomes",
  migration.includes("'refused'") && migration.includes("'failed'"),
);
check(
  "AN OUTCOME CANNOT BE REWRITTEN",
  // `applied_at is null` in the filter is what makes settlement one-way.
  /\.is\("applied_at", null\)/.test(
    queries.slice(queries.indexOf("markWorkRequestApplied")),
  ),
);
check(
  "an applied timestamp and an outcome arrive together",
  /applied_at is null and outcome is null/.test(migration),
);
check(
  "the platform is only handed requests it has not decided",
  /\.is\("applied_at", null\)/.test(
    queries.slice(
      queries.indexOf("listUnappliedWorkRequests"),
      queries.indexOf("markWorkRequestApplied"),
    ),
  ),
);

{
  const queued = {
    id: "r1",
    kind: work.WORK_REQUEST_KINDS[0],
    note: null,
    requestedByEmail: null,
    requestedAt: "2026-09-02T12:00:00.000Z",
    appliedAt: null,
    outcome: null,
    outcomeDetail: null,
  };
  const described = work.describeWorkRequest(queued);
  check(
    "A QUEUED REQUEST IS NEVER DESCRIBED AS DONE",
    /queued/i.test(described) && !/\bdone\b/i.test(described),
    described,
  );
  check(
    "and it names the real mechanism rather than implying it is instant",
    /next time the Agent Platform is run/i.test(described),
    described,
  );

  const refused = work.describeWorkRequest({
    ...queued,
    appliedAt: "2026-09-02T12:05:00.000Z",
    outcome: "refused",
    outcomeDetail: "RUN_FINANCE_REPORT is not enabled.",
  });
  check(
    "A REFUSAL SAYS IT DID NOT RUN, AND WHY",
    /not run/i.test(refused) && refused.includes("RUN_FINANCE_REPORT"),
    refused,
  );

  const failed = work.describeWorkRequest({
    ...queued,
    appliedAt: "2026-09-02T12:05:00.000Z",
    outcome: "failed",
    outcomeDetail: "the source threw",
  });
  check(
    "a failure is not dressed up as a refusal",
    /failed/i.test(failed) && !/not run/i.test(failed),
    failed,
  );
}

/* ========================= nothing here publishes ========================= */

console.log("\nNothing on this path publishes, approves or spends");

check(
  "no publish machinery is reachable from the request path",
  !/dispatchPublish|assertPublishAllowed|claimDelivery|marketing_publish_jobs/.test(
    action + route + queries,
  ),
);
check(
  "and no approval is decided by it",
  !/recordAgentDecision|agent_marketing_decisions/.test(
    action + route + queries,
  ),
);
check(
  "operators cannot write to the queue directly",
  /revoke insert, update, delete on table public\.agent_work_requests from authenticated/.test(
    migration,
  ),
);
check(
  "and anon can never read it",
  /revoke all on table public\.agent_work_requests from anon/.test(migration),
);
check(
  "row level security is enabled",
  /alter table public\.agent_work_requests enable row level security/.test(
    migration,
  ),
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
