/**
 * Smoke test for the Agent Platform snapshot contract mirror.
 *
 * Altair OS has no test runner (AGENTS.md), so this follows the repository's
 * existing convention: a focused `.mjs` script run with plain node. It
 * transpiles the one TypeScript module under test with the `typescript`
 * devDependency already present — no new dependency, no build step, no
 * framework.
 *
 * It asserts the security-relevant behaviour of the ingest parser:
 *   - a wrong contractVersion is refused outright
 *   - a malformed envelope is refused, never partially accepted
 *   - the NOT_SUPPORTED/reason invariant is enforced on the receiving side
 *     too, not merely trusted from the producer
 *   - malformed ITEMS are dropped AND counted, never silently kept
 *   - a real, full snapshot round-trips
 *
 * Run: node scripts/verify-agent-snapshot-contract.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const SOURCE = "shared/types/agent-snapshot.ts";

function loadModule() {
  const source = readFileSync(SOURCE, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const dir = mkdtempSync(join(tmpdir(), "agent-snapshot-"));
  const file = join(dir, "agent-snapshot.mjs");
  writeFileSync(file, outputText);
  return import(pathToFileURL(file).href);
}

let failures = 0;
function check(name, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function listSection(items = []) {
  return { support: items.length ? "SUPPORTED_WITH_DATA" : "SUPPORTED_EMPTY", unsupportedReason: null, items };
}

function validSnapshot(overrides = {}) {
  return {
    contractVersion: 1,
    companyId: "altair",
    producedAt: "2026-08-15T12:00:00.000Z",
    sections: {
      automationStatus: {
        support: "SUPPORTED_WITH_DATA",
        unsupportedReason: null,
        data: {
          companyId: "altair",
          observedAt: "2026-08-15T12:00:00.000Z",
          schedulesActive: 1,
          schedulesPaused: 0,
          schedulesFailed: 0,
          nextScheduledRunAt: "2026-08-16T02:24:49.989Z",
          lastScheduleRunAt: null,
          lastCompletedRunAt: null,
          lastFailedRunAt: null,
          hoursSinceLastCompletedRun: null,
          tasksPending: 0,
          tasksRunning: 0,
          tasksAwaitingApproval: 0,
          tasksFailed: 0,
          approvalsPending: 0,
          dataProvenance: "UNKNOWN",
          modelProvenance: "UNKNOWN",
        },
      },
      recentActivity: listSection(),
      agentStatus: listSection([
        {
          companyId: "altair",
          agentId: "marketing-agent",
          name: "Marketing Agent",
          enabled: true,
          grantedToolCount: 4,
          allowedRiskClasses: ["READ"],
          canActExternally: false,
          lastRunAt: null,
          lastRunState: null,
          runsCompleted: 0,
          runsFailed: 0,
          openTaskCount: 0,
        },
      ]),
      upcomingWork: listSection([
        {
          companyId: "altair",
          scheduleId: "sch-1",
          name: "marketing.performance-sweep",
          agentId: "marketing-agent",
          jobName: "marketing.performance-sweep",
          scheduleState: "ACTIVE",
          intervalMs: 86400000,
          nextRunAt: "2026-08-16T02:24:49.989Z",
          lastRunAt: null,
          missedRunPolicy: "RUN_ONCE",
          isDue: false,
        },
      ]),
      campaign: {
        support: "NOT_SUPPORTED",
        unsupportedReason: "Campaign metrics are only available from a completed marketing review.",
        items: [],
      },
      recommendations: listSection(),
      approvals: listSection(),
      videoRenders: listSection(),
    },
    knownGaps: [{ capability: "video.playableMediaReference", reason: "No shareable media reference exists yet." }],
    ...overrides,
  };
}

const mod = await loadModule();
const { parseAgentMarketingSnapshot, AGENT_SNAPSHOT_CONTRACT_VERSION } = mod;

console.log("Agent snapshot contract mirror");

const good = parseAgentMarketingSnapshot(validSnapshot());
check("accepts a full valid snapshot", good.ok, good.ok ? "" : good.error);
check("contract version is 1", AGENT_SNAPSHOT_CONTRACT_VERSION === 1);
check("drops nothing from a clean payload", good.ok && good.droppedItems === 0);
check(
  "preserves the NOT_SUPPORTED reason",
  good.ok && good.snapshot.sections.campaign.support === "NOT_SUPPORTED" &&
    typeof good.snapshot.sections.campaign.unsupportedReason === "string",
);
check("keeps agent status rows", good.ok && good.snapshot.sections.agentStatus.items.length === 1);

const wrongVersion = parseAgentMarketingSnapshot(validSnapshot({ contractVersion: 2 }));
check("refuses a future contractVersion", !wrongVersion.ok);
const noVersion = parseAgentMarketingSnapshot(validSnapshot({ contractVersion: undefined }));
check("refuses a missing contractVersion", !noVersion.ok);

check("refuses a non-object payload", !parseAgentMarketingSnapshot("nope").ok);
check("refuses null", !parseAgentMarketingSnapshot(null).ok);
check("refuses an array", !parseAgentMarketingSnapshot([]).ok);
check("refuses an empty companyId", !parseAgentMarketingSnapshot(validSnapshot({ companyId: "" })).ok);
check(
  "refuses a non-timestamp producedAt",
  !parseAgentMarketingSnapshot(validSnapshot({ producedAt: "whenever" })).ok,
);

const missingSection = validSnapshot();
delete missingSection.sections.approvals;
check("refuses a missing section", !parseAgentMarketingSnapshot(missingSection).ok);

const badSupport = validSnapshot();
badSupport.sections.recentActivity.support = "PROBABLY_FINE";
check("refuses an unknown support level", !parseAgentMarketingSnapshot(badSupport).ok);

const unexplained = validSnapshot();
unexplained.sections.recentActivity.support = "NOT_SUPPORTED";
check(
  "refuses NOT_SUPPORTED with no reason",
  !parseAgentMarketingSnapshot(unexplained).ok,
);

const reasonOnSupported = validSnapshot();
reasonOnSupported.sections.recentActivity.unsupportedReason = "should not be here";
check(
  "refuses a reason on a supported section",
  !parseAgentMarketingSnapshot(reasonOnSupported).ok,
);

const notAnArray = validSnapshot();
notAnArray.sections.recentActivity.items = { nope: true };
check("refuses non-array items", !parseAgentMarketingSnapshot(notAnArray).ok);

const junkItems = validSnapshot();
junkItems.sections.agentStatus.items.push({ garbage: true }, null, 42);
const dropped = parseAgentMarketingSnapshot(junkItems);
check("accepts a section with some unreadable rows", dropped.ok);
check(
  "counts every dropped row instead of hiding it",
  dropped.ok && dropped.droppedItems === 3,
  dropped.ok ? `droppedItems=${dropped.droppedItems}` : "",
);
check(
  "keeps the readable rows",
  dropped.ok && dropped.snapshot.sections.agentStatus.items.length === 1,
);

// ---------------------------------------------------------------------------
// The check that actually proves the two repositories agree: a REAL snapshot,
// produced by the Agent Platform's own `snapshot:proof --json` against its
// real database, parsed by this mirror. A non-zero droppedItems here means the
// contracts have drifted — which a hand-written fixture would never reveal.
// ---------------------------------------------------------------------------
console.log("\nReal Agent Platform snapshot fixture");
const fixture = JSON.parse(readFileSync("scripts/fixtures/agent-snapshot-v1.sample.json", "utf8"));
const real = parseAgentMarketingSnapshot(fixture);
check("parses a real platform snapshot", real.ok, real.ok ? "" : real.error);
check(
  "drops nothing from it (the mirrors agree field for field)",
  real.ok && real.droppedItems === 0,
  real.ok ? `droppedItems=${real.droppedItems}` : "",
);
if (real.ok) {
  const serialized = JSON.stringify(real.snapshot);
  for (const forbidden of ["masterPath", "reportPath", "accessToken", "apiKey", "proposedInput", "inputData", ".mp4"]) {
    check(`carries no ${forbidden}`, !serialized.includes(forbidden));
  }
}

console.log(failures === 0 ? "\nAll contract mirror checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
