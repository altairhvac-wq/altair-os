/**
 * The Agent Platform's liveness signal — status derivation, the bridge route
 * and the query module, EXECUTED where it matters.
 *
 * ==================== WHAT IS ASSERTED ====================
 *   status derivation is pure, deterministic and correctly thresholded
 *   a fresh heartbeat naming a disabled queue is DEGRADED, not ONLINE
 *   the route is authenticated and company-bound server-side, like every
 *     other agent-bridge route — never from the payload
 *   a second heartbeat REPLACES the first (one row per company, not a log)
 *   a read failure never renders as falsely healthy
 *   nothing on this path can publish, approve or spend
 *
 * Run: node scripts/verify-agent-heartbeat.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { loadPureModule } from "./lib/load-pure-module.mjs";
import { createFakeSupabase } from "./lib/fake-supabase.mjs";
import { loadQueryModule } from "./lib/load-query-module.mjs";

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
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(new RegExp("//[^\\n]*", "g"), "");

const MIGRATION = "supabase/migrations/193_agent_platform_heartbeat.sql";
const ROUTE = "app/api/agent/heartbeat/route.ts";
const QUERIES = "lib/database/queries/agent-platform-heartbeat.ts";
const PAGE = "app/(admin)/marketing/page.tsx";

for (const path of [MIGRATION, ROUTE, QUERIES, PAGE]) {
  check(`${path} exists`, existsSync(path));
}
if (failures > 0) {
  console.error("\nMissing source; later checks would be vacuous.");
  process.exit(1);
}

const migration = read(MIGRATION)
  .split(/\r?\n/)
  .filter((line) => !line.trimStart().startsWith("--"))
  .join("\n")
  .toLowerCase();
const route = strip(read(ROUTE));
const page = strip(read(PAGE));

const heartbeatTypes = await loadPureModule(
  "shared/types/agent-heartbeat.ts",
  "heartbeat-types",
);

/* =================== status derivation is pure and correct =================== */

console.log("\nStatus derivation (pure, deterministic)");

check(
  "no heartbeat ever received is OFFLINE, not a comforting default",
  heartbeatTypes.deriveAgentPlatformStatus(null, "2026-09-02T12:00:00.000Z").status ===
    "offline",
);

{
  const fresh = heartbeatTypes.deriveAgentPlatformStatus(
    { reportedAt: "2026-09-02T11:59:50.000Z", queues: [] },
    "2026-09-02T12:00:00.000Z",
  );
  check("a heartbeat 10s old with no queue trouble is ONLINE", fresh.status === "online", fresh);
}

{
  const stale = heartbeatTypes.deriveAgentPlatformStatus(
    { reportedAt: "2026-09-02T11:55:00.000Z", queues: [] },
    "2026-09-02T12:00:00.000Z",
  );
  check(
    "a heartbeat 5 minutes old (past the 3-minute ONLINE window) is DEGRADED",
    stale.status === "degraded",
    stale,
  );
}

{
  const dead = heartbeatTypes.deriveAgentPlatformStatus(
    { reportedAt: "2026-09-02T11:40:00.000Z", queues: [] },
    "2026-09-02T12:00:00.000Z",
  );
  check(
    "a heartbeat 20 minutes old (past the 15-minute OFFLINE floor) is OFFLINE",
    dead.status === "offline",
    dead,
  );
}

{
  // The residual case a naive "is it stale" check would miss: FRESH but sick.
  const sick = heartbeatTypes.deriveAgentPlatformStatus(
    {
      reportedAt: "2026-09-02T11:59:55.000Z",
      queues: [
        { name: "work-requests", enabled: false, disabledReason: "RUN_CHIEF_WORK is not set", consecutiveFailures: 0 },
      ],
    },
    "2026-09-02T12:00:00.000Z",
  );
  check(
    "A FRESH HEARTBEAT NAMING A DISABLED QUEUE IS DEGRADED, NOT ONLINE",
    sick.status === "degraded" && sick.troubledQueues.length === 1,
    sick,
  );
}

check(
  "negative age from clock skew never reads as extra-fresh",
  heartbeatTypes
    .deriveAgentPlatformStatus(
      { reportedAt: "2026-09-02T12:00:05.000Z", queues: [] },
      "2026-09-02T12:00:00.000Z",
    )
    .ageMs === 0,
);

check(
  "an unparseable timestamp is treated as never-reported, not as fresh",
  heartbeatTypes.deriveAgentPlatformStatus(
    { reportedAt: "not-a-date", queues: [] },
    "2026-09-02T12:00:00.000Z",
  ).status === "offline",
);

check(
  "formatRelativeAge never renders zero",
  heartbeatTypes.formatRelativeAge(0) !== "0s" && heartbeatTypes.formatRelativeAge(0) === "1s",
);

/* =================== authority and boundaries (static) =================== */

console.log("\nThe bridge route is authenticated and company-bound, like every other");

check(
  "the route is authenticated",
  route.includes("isAuthorizedAgentRequest(request)"),
);
check(
  "the company comes from the server, never the request",
  route.includes("getAgentIngestCompanyId()") &&
    !/companyId.*(searchParams|payload\.|body\.)/.test(route),
);
check(
  "NO CONSENT GATE IS READABLE OR SETTABLE FROM ALTAIR OS",
  !/process\.env\.RUN_/.test(route + read(QUERIES)),
);
check(
  "the payload is size- and shape-bounded before it reaches the database",
  /MAX_QUEUES/.test(route) && /MAX_REASON_LEN/.test(route),
);
check(
  "operators cannot write to the table directly",
  /revoke insert, update, delete on table public\.agent_platform_heartbeats from authenticated/.test(
    migration,
  ),
);
check("and anon can never read it", /revoke all on table public\.agent_platform_heartbeats from anon/.test(migration));
check(
  "row level security is enabled",
  /alter table public\.agent_platform_heartbeats enable row level security/.test(migration),
);
check(
  "nothing on this path publishes, approves or spends",
  !/dispatchPublish|assertPublishAllowed|claimDelivery|recordAgentDecision|gateway\.complete/.test(
    route + read(QUERIES),
  ),
);
check(
  "the Command page derives platform status from the HEARTBEAT, not the (24h-tolerant) snapshot",
  /deriveAgentPlatformStatus/.test(page) && page.indexOf("deriveAgentPlatformStatus") <
    page.indexOf("platformUnavailableReason:"),
);

/* =================== behavioural: the real query module, executed =================== */

console.log("\nOne row per company — a second heartbeat replaces the first (behavioural)");

const { client, store } = createFakeSupabase();
const heartbeat = await loadQueryModule(QUERIES, client, "heartbeat-q");

{
  store.reset();
  const missing = await heartbeat.getLatestAgentPlatformHeartbeat("company-a");
  check("no row yet reads as null, not as a fabricated healthy state", missing === null, missing);
}

{
  store.reset();
  await heartbeat.recordAgentPlatformHeartbeat({
    companyId: "company-a",
    reportedAt: "2026-09-02T12:00:00.000Z",
    queues: [
      { name: "questions", enabled: true, disabledReason: null, consecutiveFailures: 0 },
    ],
  });
  await heartbeat.recordAgentPlatformHeartbeat({
    companyId: "company-a",
    reportedAt: "2026-09-02T12:00:30.000Z",
    queues: [
      { name: "questions", enabled: true, disabledReason: null, consecutiveFailures: 0 },
      { name: "work-requests", enabled: false, disabledReason: "RUN_CHIEF_WORK is not set", consecutiveFailures: 0 },
    ],
  });

  const latest = await heartbeat.getLatestAgentPlatformHeartbeat("company-a");
  check(
    "THE LATEST HEARTBEAT WINS — this is a status, not a log",
    latest?.reportedAt === "2026-09-02T12:00:30.000Z" && latest?.queues.length === 2,
    latest,
  );
  check(
    "exactly one row exists for the company",
    store.rows("agent_platform_heartbeats").filter((row) => row.company_id === "company-a").length === 1,
  );
}

{
  store.reset();
  await heartbeat.recordAgentPlatformHeartbeat({
    companyId: "company-a",
    reportedAt: "2026-09-02T12:00:00.000Z",
    queues: [],
  });
  await heartbeat.recordAgentPlatformHeartbeat({
    companyId: "company-b",
    reportedAt: "2026-09-02T12:00:00.000Z",
    queues: [],
  });
  const a = await heartbeat.getLatestAgentPlatformHeartbeat("company-a");
  const b = await heartbeat.getLatestAgentPlatformHeartbeat("company-b");
  check(
    "TWO COMPANIES NEVER SHARE A ROW",
    a !== null && b !== null && store.rows("agent_platform_heartbeats").length === 2,
    { a, b },
  );
}

{
  store.reset();
  store.failNext("agent_platform_heartbeats", "select", {
    code: "42501",
    message: "permission denied",
  });
  const broken = await heartbeat.getLatestAgentPlatformHeartbeat("company-a");
  check(
    "A READ FAILURE RENDERS AS NULL (-> OFFLINE), NEVER AS FALSELY HEALTHY",
    broken === null,
    broken,
  );
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
