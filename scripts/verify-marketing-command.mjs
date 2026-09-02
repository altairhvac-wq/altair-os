/**
 * The Marketing Command surface and the Chief of Staff bridge.
 *
 * Static and offline: the pure projections are loaded and driven, and the
 * route, action, migration and UI are read as source.
 *
 * ==================== WHAT IS ASSERTED ====================
 * The claims an operations screen must not get wrong:
 *
 *   a platform that is not reporting shows as unknown, never as a quiet day
 *   successful automation never appears as something needing attention
 *   a queued question is described as queued, never as a live conversation
 *   the bridge is authenticated and the company comes from the server
 *   asking twice asks the Chief once
 *
 * Run: node scripts/verify-marketing-command.mjs
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

const MIGRATION = "supabase/migrations/188_agent_chief_messages.sql";
const ROUTE = "app/api/agent/chief-messages/route.ts";
const ACTION = "app/actions/marketing-chief.ts";
const QUERIES = "lib/database/queries/agent-chief-messages.ts";
const STATE = "lib/database/queries/marketing-operating-state.ts";
const VIEW = "shared/components/marketing-hub/MarketingCommandView.tsx";

for (const path of [MIGRATION, ROUTE, ACTION, QUERIES, STATE, VIEW]) {
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
const action = strip(read(ACTION));
const queries = strip(read(QUERIES));
const stateQuery = strip(read(STATE));
const view = strip(read(VIEW));

const cmd = await loadPureModule("shared/types/marketing-command.ts", "cmd");

const NOW = "2026-09-02T12:00:00.000Z";
const FRESH = "2026-09-02T11:00:00.000Z";
const STALE = "2026-09-01T00:00:00.000Z";

const baseState = (over = {}) => ({
  nowIso: NOW,
  snapshotStaleAfterMs: 6 * 60 * 60 * 1000,
  snapshot: {
    generatedAt: FRESH,
    tasksQueued: 0,
    tasksRunning: 0,
    tasksFailed: 0,
    approvalsPending: 0,
    schedulesFailed: 0,
    rendersInProgress: 0,
    rendersFailed: 0,
    latestResearchAt: null,
    latestDirectorPlanAt: null,
    approvals: [],
    ...over.snapshot,
  },
  sitePages: over.sitePages ?? [],
  deliveries: over.deliveries ?? [],
  connections: over.connections ?? [],
  ...(over.top ?? {}),
});

const lane = (lanes, key) => lanes.find((l) => l.key === key);

/* ============================ freshness ============================ */

console.log("\nA platform that is not reporting is not a quiet day");

check("a fresh snapshot is fresh", cmd.isSnapshotFresh(baseState()) === true);
check(
  "a stale snapshot is not",
  cmd.isSnapshotFresh(baseState({ snapshot: { generatedAt: STALE } })) ===
    false,
);
check(
  "an absent snapshot is not",
  cmd.isSnapshotFresh({ ...baseState(), snapshot: null }) === false,
);

{
  const lanes = cmd.buildTodayPlan({ ...baseState(), snapshot: null });
  check(
    "RESEARCH READS UNKNOWN, NOT IDLE, WHEN THE PLATFORM IS SILENT",
    lane(lanes, "research").state === "unknown",
    lane(lanes, "research"),
  );
  check("and so does Director", lane(lanes, "director").state === "unknown");
  check(
    "and YouTube, whose renders the platform owns",
    lane(lanes, "youtube").state === "unknown",
  );
  check(
    "the website lane still answers — it reads our own table",
    lane(lanes, "website").state !== "unknown",
  );
}

{
  const lanes = cmd.buildTodayPlan(
    baseState({ snapshot: { latestResearchAt: FRESH } }),
  );
  check(
    "research completed today reports done",
    lane(lanes, "research").state === "done",
  );
}
{
  const lanes = cmd.buildTodayPlan(
    baseState({ snapshot: { latestResearchAt: "2026-08-01T00:00:00.000Z" } }),
  );
  check(
    "research from last month is idle, not done",
    lane(lanes, "research").state === "idle",
  );
}

/* ======================= lanes reflect real rows ======================= */

console.log("\nLanes come from rows, not from a hardcoded workflow");

{
  const lanes = cmd.buildTodayPlan(
    baseState({
      sitePages: [
        {
          slug: "a-post",
          title: "A Post",
          state: "published",
          publishedAt: FRESH,
          updatedAt: FRESH,
        },
      ],
    }),
  );
  check(
    "a page published today reports done",
    lane(lanes, "website").state === "done",
  );
  check("and names it", lane(lanes, "website").detail.includes("A Post"));
}
{
  const lanes = cmd.buildTodayPlan(
    baseState({
      deliveries: [
        {
          provider: "youtube",
          state: "failed",
          settledAt: FRESH,
          failureDetail: "It broke.",
          permalink: null,
          createdAt: FRESH,
        },
      ],
    }),
  );
  check(
    "a failed delivery blocks its lane",
    lane(lanes, "youtube").state === "blocked",
  );
  check(
    "and shows the stored reason",
    lane(lanes, "youtube").detail === "It broke.",
  );
}
{
  const lanes = cmd.buildTodayPlan(
    baseState({
      snapshot: { rendersInProgress: 2 },
      connections: [
        {
          provider: "youtube",
          label: "YouTube",
          channelState: "DIRECT_PUBLISH_READY",
        },
      ],
    }),
  );
  check(
    "a render in progress makes YouTube waiting, not active-forever",
    lane(lanes, "youtube").state === "waiting",
  );
}
{
  const lanes = cmd.buildTodayPlan(
    baseState({
      connections: [
        {
          provider: "facebook",
          label: "Facebook",
          channelState: "REAUTH_REQUIRED",
        },
      ],
    }),
  );
  check(
    "an unhealthy connection blocks its lane",
    lane(lanes, "facebook").state === "blocked",
  );
}

/* ========================= needs your attention ========================= */

console.log("\nOnly things a person must act on");

{
  const items = cmd.buildAttentionItems(
    baseState({
      sitePages: [
        {
          slug: "ok",
          title: "Fine",
          state: "published",
          publishedAt: FRESH,
          updatedAt: FRESH,
        },
      ],
      deliveries: [
        {
          provider: "youtube",
          state: "posted",
          settledAt: FRESH,
          failureDetail: null,
          permalink: "https://x.test",
          createdAt: FRESH,
        },
      ],
      connections: [
        {
          provider: "youtube",
          label: "YouTube",
          channelState: "DIRECT_PUBLISH_READY",
        },
      ],
    }),
  );
  check(
    "SUCCESSFUL AUTOMATION NEVER APPEARS AS SOMETHING NEEDING ATTENTION",
    items.length === 0,
    items,
  );
}
{
  const items = cmd.buildAttentionItems(
    baseState({
      snapshot: {
        approvals: [
          {
            approvalId: "a1",
            humanSummary: "Publish the reel",
            requestedAt: FRESH,
            isExpired: false,
            decision: "PENDING",
          },
        ],
      },
    }),
  );
  check(
    "a pending approval is surfaced",
    items.some((i) => i.kind === "approval"),
  );
  check("with the stored summary", items[0].detail === "Publish the reel");
}
{
  const items = cmd.buildAttentionItems(
    baseState({
      snapshot: {
        approvals: [
          {
            approvalId: "a1",
            humanSummary: "Old",
            requestedAt: FRESH,
            isExpired: true,
            decision: "PENDING",
          },
          {
            approvalId: "a2",
            humanSummary: "Done",
            requestedAt: FRESH,
            isExpired: false,
            decision: "APPROVED",
          },
        ],
      },
    }),
  );
  check(
    "an expired or already-decided approval is history, not work",
    items.filter((i) => i.kind === "approval").length === 0,
    items,
  );
}
{
  const items = cmd.buildAttentionItems(
    baseState({
      deliveries: [
        {
          provider: "facebook",
          state: "failed",
          settledAt: FRESH,
          failureDetail: "Publish failed.",
          permalink: null,
          createdAt: FRESH,
        },
      ],
    }),
  );
  check(
    "a failed publish is surfaced",
    items.some((i) => i.kind === "failed_publish"),
  );
}
{
  const items = cmd.buildAttentionItems(
    baseState({
      connections: [
        {
          provider: "youtube",
          label: "YouTube",
          channelState: "TOKEN_EXPIRED",
        },
        {
          provider: "facebook",
          label: "Facebook",
          channelState: "NOT_CONFIGURED",
        },
      ],
    }),
  );
  check(
    "a self-healing expiry is not a human task",
    items.filter((i) => i.kind === "connection").length === 0,
    items,
  );
}
{
  const items = cmd.buildAttentionItems(
    baseState({
      connections: [
        {
          provider: "youtube",
          label: "YouTube",
          channelState: "REAUTH_REQUIRED",
        },
      ],
    }),
  );
  check(
    "a connection needing a human is surfaced",
    items.some((i) => i.kind === "connection"),
  );
  check("and points at Settings", items[0].href === "/settings/integrations");
}
{
  const items = cmd.buildAttentionItems({
    ...baseState({
      snapshot: {
        approvals: [
          {
            approvalId: "a",
            humanSummary: "x",
            requestedAt: FRESH,
            isExpired: false,
            decision: "PENDING",
          },
        ],
      },
    }),
    snapshot: null,
  });
  check(
    "a silent platform contributes no approvals — absence is not evidence",
    items.filter((i) => i.kind === "approval").length === 0,
  );
}

/* ============================ conversation ============================ */

console.log("\nThe conversation never claims to be live");

check(
  "waiting copy names the platform cycle, not a typing indicator",
  cmd
    .describeChiefConversation({
      messages: [],
      awaitingReply: true,
      platformUnavailableReason: null,
    })
    .includes("next cycle"),
);
check(
  "an unavailable platform says so instead",
  cmd.describeChiefConversation({
    messages: [],
    awaitingReply: true,
    platformUnavailableReason: "Not reporting.",
  }) === "Not reporting.",
);
check(
  "an empty question is refused before it queues",
  cmd.validateChiefQuestion("   ").ok === false,
);
check(
  "an over-long question is refused",
  cmd.validateChiefQuestion("x".repeat(cmd.CHIEF_MESSAGE_MAX + 1)).ok === false,
);
check(
  "a real question is accepted and trimmed",
  cmd.validateChiefQuestion("  what is blocked?  ").body === "what is blocked?",
);
check(
  "the view shows no typing indicator",
  !/typing|is thinking|\.\.\./i.test(view),
);
check(
  "a queued question is labelled as waiting for the platform",
  view.includes("Waiting for the Agent Platform"),
);
check(
  "a failed question is not dressed up as an answer",
  view.includes("could not answer this"),
);

/* ============================== the bridge ============================== */

console.log("\nThe bridge is authenticated and server-scoped");

check(
  "the route requires the agent bearer secret",
  route.includes("isAuthorizedAgentRequest(request)"),
);
check(
  "and refuses when the bridge is not configured",
  route.includes("isAgentBridgeConfigured()"),
);
check(
  "THE COMPANY COMES FROM THE SERVER, NEVER THE REQUEST",
  route.includes("getAgentIngestCompanyId()") &&
    !/companyId\s*=\s*(payload|params|body)\./.test(route),
);
check(
  "pulled questions are filtered to the configured company",
  route.includes("q.companyId === companyId"),
);
check(
  "answers are company-scoped at the query layer too",
  queries.includes('.eq("company_id", input.companyId)'),
);
check(
  "the route executes nothing — it moves text only",
  !/dispatchPublish|publishSitePage|claimDelivery/.test(route),
);
check(
  "a reported failure is stored as a failure, not as the Chief's words",
  route.includes("recordChiefFailure"),
);

console.log("\nAsking twice asks once");
check(
  "the queue is keyed for idempotency in SQL",
  migration.includes("unique (company_id, request_key)"),
);
check(
  "the writer inserts first and interprets 23505",
  queries.includes('insert.error.code === "23505"'),
);
check(
  "a duplicate returns the existing question rather than a second one",
  queries.includes("duplicate: true"),
);

console.log("\nThe action is authenticated and carries no authority");
check(
  "it resolves the active company server-side",
  action.includes("getActiveCompanyContext()"),
);
check(
  "it checks the same permission the Marketing page checks",
  action.includes('canAccessAdminNavItem(context, "/marketing")'),
);
check(
  "it never calls the Agent Platform — it cannot",
  !/fetch\(|dispatchPublish/.test(action),
);
check(
  "the company is taken from the session, not from the caller",
  action.includes("context.company.id") && !/companyId:\s*input\./.test(action),
);

console.log("\nMigration posture");
check(
  "the conversation table is company-scoped with a cascading FK",
  /company_id\s+uuid\s+not\s+null\s+references\s+public\.companies\s*\(\s*id\s*\)\s+on\s+delete\s+cascade/.test(
    migration,
  ),
);
check(
  "row level security is enabled",
  migration.includes("enable row level security"),
);
check(
  "operators read, the server writes",
  migration.includes(
    "revoke insert, update, delete on table public.agent_chief_messages from authenticated",
  ),
);
check(
  "anon can never read a conversation",
  migration.includes(
    "revoke all on table public.agent_chief_messages from anon",
  ),
);
check(
  "an answer must reference the question it answers",
  migration.includes("agent_chief_messages_reply_shape"),
);

console.log("\nNo secrets reach the browser");
check(
  "the client view imports no server module",
  !/lib\/(supabase|agent-bridge|integrations)\//.test(view),
);
check(
  "and names no secret variable",
  !/AGENT_INGEST_SECRET|SERVICE_ROLE|ANTHROPIC/.test(view),
);

/* ================= delegation: deciding, and only deciding ================= */

console.log("\nThe only delegable item is a human approval decision");

{
  const items = cmd.buildAttentionItems(
    baseState({
      snapshot: {
        approvals: [
          {
            approvalId: "a-decide",
            humanSummary: "Publish the reel",
            requestedAt: FRESH,
            isExpired: false,
            decision: "PENDING",
          },
        ],
      },
      deliveries: [
        {
          provider: "youtube",
          state: "failed",
          settledAt: FRESH,
          failureDetail: "quota",
          permalink: null,
          createdAt: FRESH,
        },
      ],
      connections: [
        {
          provider: "facebook",
          label: "Facebook",
          channelState: "NEEDS_RECONNECT",
        },
      ],
    }),
  );

  const approval = items.find((item) => item.kind === "approval");
  check(
    "an open approval carries the platform approval id to decide",
    approval?.decidableApprovalId === "a-decide",
    approval,
  );
  check(
    "NOTHING ELSE IS DECIDABLE — a failed delivery is a repair, not a decision",
    items
      .filter((item) => item.kind !== "approval")
      .every((item) => item.decidableApprovalId === null),
    items
      .filter((item) => item.decidableApprovalId !== null)
      .map((i) => i.kind),
  );
}
{
  // The two exclusions that must survive: an approval that can no longer be
  // decided must not reach the surface at all, or it would be offered buttons.
  const decided = cmd.buildAttentionItems(
    baseState({
      snapshot: {
        approvals: [
          {
            approvalId: "a-done",
            humanSummary: "Already handled",
            requestedAt: FRESH,
            isExpired: false,
            decision: "APPROVED",
          },
        ],
      },
    }),
  );
  check(
    "AN ALREADY-DECIDED APPROVAL IS NEVER OFFERED AGAIN",
    decided.every((item) => item.decidableApprovalId === null),
    decided,
  );

  const expired = cmd.buildAttentionItems(
    baseState({
      snapshot: {
        approvals: [
          {
            approvalId: "a-old",
            humanSummary: "Too late",
            requestedAt: FRESH,
            isExpired: true,
            decision: "PENDING",
          },
        ],
      },
    }),
  );
  check(
    "AN EXPIRED APPROVAL IS NEVER OFFERED",
    expired.every((item) => item.decidableApprovalId === null),
    expired,
  );
}

console.log("\nDeciding reuses the one approval path, and adds no authority");
check(
  "the command surface renders the EXISTING decision control",
  view.includes('from "./AgentDecisionControls"') &&
    view.includes("<AgentDecisionControls"),
);
check(
  "it is rendered only for a decidable approval",
  /item\.decidableApprovalId \?\s*\(\s*<AgentDecisionControls/.test(view),
);
check(
  'it declares subjectKind="approval" and nothing else',
  view.includes('subjectKind="approval"') &&
    !/subjectKind="(?!approval)/.test(view),
);
check(
  "a decision already recorded here suppresses the buttons",
  view.includes("existingDecision={") && view.includes("decisionBySubject"),
);
check(
  "THE COMMAND SURFACE OPENS NO SECOND APPROVAL PATH",
  !/agent_marketing_decisions|recordAgentDecision\b|createServiceRoleClient/.test(
    view,
  ),
);
check(
  "and still executes nothing itself",
  !/dispatchPublish|assertPublishAllowed|claimDelivery/.test(
    view.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""),
  ),
);

console.log("\nThe operating state is company-scoped and derived");
check(
  "every read filters on the company",
  stateQuery
    .split(".select(")
    .slice(1)
    .every(
      (chunk) =>
        chunk.includes('.eq("company_id", input.companyId)') ||
        chunk.includes("input.companyId"),
    ),
);
check(
  "connection health reuses the existing state machine",
  stateQuery.includes("deriveMarketingChannelState"),
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
