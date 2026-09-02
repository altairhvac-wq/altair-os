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
 * Run: node scripts/verify-work-requests.mjs
 */
import { readFileSync, existsSync } from "node:fs";
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

const MIGRATION = "supabase/migrations/189_agent_work_requests.sql";
const ROUTE = "app/api/agent/work-requests/route.ts";
const ACTION = "app/actions/marketing-work-request.ts";
const QUERIES = "lib/database/queries/agent-work-requests.ts";
const VIEW = "shared/components/marketing-hub/MarketingCommandView.tsx";

for (const path of [MIGRATION, ROUTE, ACTION, QUERIES, VIEW]) {
  check(`${path} exists`, existsSync(path));
}
if (failures > 0) {
  console.error("\nMissing source; later checks would be vacuous.");
  process.exit(1);
}

// SQL comments stripped: prose forbidding a thing has read as evidence of it
// before, and a migration is mostly prose here.
const migration = read(MIGRATION)
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")
  .toLowerCase();
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
check(
  "the database agrees with the code about the vocabulary",
  work.WORK_REQUEST_KINDS.every((kind) => migration.includes(`'${kind}'`)),
  migration.match(/check \(kind in \([^)]*\)\)/),
);
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
