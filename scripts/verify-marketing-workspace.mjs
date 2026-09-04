/**
 * Proof for the founder-facing Marketing workspace.
 *
 * ==================== WHAT IS ACTUALLY AT RISK HERE ====================
 * Two sentences on `/marketing` describe a system that runs in a different
 * process, on a different machine, in a repository this one is never merged
 * with: "Daily content: On" and "Today's video is being prepared". Both are
 * easy to get subtly wrong, and both are wrong in a way a founder cannot
 * detect — the page looks equally calm whether or not the claim is true.
 *
 * `shared/types/marketing-workspace-state.ts` is where those claims are
 * decided, and it is pure, so it can be checked exhaustively with no
 * database, no network, no credentials and no rendering. That is what the
 * first half of this file does.
 *
 * The second half checks the CONSOLIDATION itself: that the primary view
 * has not quietly reacquired the control room, that a capability has exactly
 * one home, and that the settings view contains no action wired to nothing.
 * Those are source assertions because they are properties of the composition,
 * not of any function's return value.
 *
 * Run: node scripts/verify-marketing-workspace.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

function loadTs(path) {
  const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const dir = mkdtempSync(join(tmpdir(), "mkt-ws-"));
  const file = join(dir, "m.mjs");
  writeFileSync(file, outputText);
  return import(pathToFileURL(file).href);
}

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

const state = await loadTs("shared/types/marketing-workspace-state.ts");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = "2026-08-18T14:00:00.000Z";
const RECENT = "2026-08-18T09:00:00.000Z";
const OLD = "2026-08-10T09:00:00.000Z";

const listSection = (items, support) => ({
  support:
    support ?? (items.length > 0 ? "SUPPORTED_WITH_DATA" : "SUPPORTED_EMPTY"),
  unsupportedReason: null,
  items,
});

const schedule = (over = {}) => ({
  companyId: "c1",
  scheduleId: "s1",
  name: "Daily reel pilot",
  agentId: "a1",
  jobName: "content.daily-pilot",
  scheduleState: "ACTIVE",
  intervalMs: 86_400_000,
  nextRunAt: "2026-08-19T13:00:00.000Z",
  lastRunAt: RECENT,
  missedRunPolicy: "SKIP",
  isDue: false,
  ...over,
});

const automationStatus = (over = {}) => ({
  support: "SUPPORTED_WITH_DATA",
  unsupportedReason: null,
  data: {
    companyId: "c1",
    observedAt: RECENT,
    schedulesActive: 1,
    schedulesPaused: 0,
    schedulesFailed: 0,
    nextScheduledRunAt: "2026-08-19T13:00:00.000Z",
    lastScheduleRunAt: RECENT,
    lastCompletedRunAt: RECENT,
    lastFailedRunAt: null,
    hoursSinceLastCompletedRun: 5,
    tasksPending: 0,
    tasksRunning: 0,
    tasksAwaitingApproval: 0,
    tasksFailed: 0,
    approvalsPending: 0,
    dataProvenance: "LIVE",
    modelProvenance: "LIVE",
    ...over,
  },
});

const render = (over = {}) => ({
  companyId: "c1",
  jobId: "job-1",
  contentArtifactId: null,
  attempt: 1,
  renderState: "PENDING",
  stage: null,
  editorVersion: null,
  hasRenderedMaster: false,
  failureName: null,
  failureMessage: null,
  durationMs: null,
  widthPx: null,
  heightPx: null,
  outputBytes: null,
  videoCodec: null,
  hasAudio: null,
  previewAvailability: "NONE",
  submittedAt: RECENT,
  recordedAt: RECENT,
  renderJobArtifactId: null,
  renderResultArtifactId: null,
  ...over,
});

const stored = ({
  schedules = [schedule()],
  status,
  renders = [],
  producedAt = RECENT,
  upcomingSupport,
} = {}) => ({
  producedAt,
  snapshot: {
    contractVersion: 1,
    companyId: "c1",
    producedAt,
    sections: {
      automationStatus: status ?? automationStatus(),
      recentActivity: listSection([]),
      agentStatus: listSection([]),
      upcomingWork: upcomingSupport
        ? {
            support: upcomingSupport,
            unsupportedReason: "The platform cannot enumerate schedules.",
            items: [],
          }
        : listSection(schedules),
      campaign: listSection([]),
      recommendations: listSection([]),
      approvals: listSection([]),
      videoRenders: listSection(renders),
    },
    knownGaps: [],
  },
});

const health = (input) =>
  state.deriveMarketingAutomationHealth({ nowIso: NOW, ...input });

// ---------------------------------------------------------------------------
console.log("\nMirrored platform constants");
// ---------------------------------------------------------------------------

// A silent edit to either of these turns a true statement into a false one,
// so they are asserted literally rather than merely used.
check(
  "daily pilot job name matches the Agent Platform's DAILY_PILOT_JOB_NAME",
  state.DAILY_PILOT_JOB_NAME === "content.daily-pilot",
  state.DAILY_PILOT_JOB_NAME,
);
check(
  "upcoming-work limit matches DEFAULT_SNAPSHOT_LIMITS.upcomingWork",
  state.SNAPSHOT_UPCOMING_WORK_LIMIT === 25,
  state.SNAPSHOT_UPCOMING_WORK_LIMIT,
);
check(
  "staleness threshold matches MarketingAutomationSection's STALE_AFTER_HOURS",
  state.AUTOMATION_STALE_AFTER_HOURS === 36,
  state.AUTOMATION_STALE_AFTER_HOURS,
);

// ---------------------------------------------------------------------------
console.log("\nAutomation health — absence is never rendered as Off");
// ---------------------------------------------------------------------------

const never = health({ snapshot: null });
check(
  "no snapshot reports UNKNOWN, not Off",
  never.state === "UNKNOWN",
  never.state,
);
check("no snapshot never claims a next run", never.nextRunAtIso === null);
check("no snapshot raises no attention items", never.attention.length === 0);
check("no snapshot still explains itself", never.detail.length > 20);

const unsupported = health({
  snapshot: stored({ upcomingSupport: "NOT_SUPPORTED" }),
});
check(
  "NOT_SUPPORTED schedules report UNKNOWN, not Off",
  unsupported.state === "UNKNOWN",
  unsupported.state,
);
check(
  "NOT_SUPPORTED quotes the platform's own reason rather than inventing one",
  unsupported.detail === "The platform cannot enumerate schedules.",
  unsupported.detail,
);

const truncated = health({
  snapshot: stored({
    schedules: Array.from({ length: 25 }, (_, i) =>
      schedule({ scheduleId: `s${i}`, jobName: "marketing.performance-sweep" }),
    ),
  }),
});
check(
  "a possibly-truncated list reports UNKNOWN rather than Off",
  truncated.state === "UNKNOWN",
  truncated.state,
);

const shortList = health({
  snapshot: stored({
    schedules: [schedule({ jobName: "marketing.performance-sweep" })],
  }),
});
check(
  "a short list with no daily job reports Off",
  shortList.state === "OFF",
  shortList.state,
);

// ---------------------------------------------------------------------------
console.log("\nAutomation health — schedule states");
// ---------------------------------------------------------------------------

const on = health({ snapshot: stored() });
check("an active daily schedule reports On", on.state === "ON", on.state);
check(
  "On carries the next run",
  on.nextRunAtIso === "2026-08-19T13:00:00.000Z",
  on.nextRunAtIso,
);
check("On states the cadence", on.detail.includes("once a day"), on.detail);
check(
  "a healthy workspace raises no attention",
  on.attention.length === 0,
  on.attention,
);

const once = health({
  snapshot: stored({ schedules: [schedule({ intervalMs: null })] }),
});
check(
  "a one-time schedule is neither On nor Off",
  once.state === "ONCE",
  once.state,
);
check(
  "a one-time schedule still shows its run time",
  once.nextRunAtIso !== null,
);
check(
  "a one-time schedule says there is no recurring one",
  once.detail.includes("no recurring daily schedule"),
  once.detail,
);

const paused = health({
  snapshot: stored({ schedules: [schedule({ scheduleState: "PAUSED" })] }),
});
check("a paused schedule reports Off", paused.state === "OFF", paused.state);
check(
  "a paused schedule needs attention",
  paused.attention.some((r) => r.includes("paused")),
  paused.attention,
);
check("a paused schedule advertises no next run", paused.nextRunAtIso === null);

const failedSchedule = health({
  snapshot: stored({ schedules: [schedule({ scheduleState: "FAILED" })] }),
});
check(
  "a failed schedule reports Off",
  failedSchedule.state === "OFF",
  failedSchedule.state,
);
check(
  "a failed schedule needs attention",
  failedSchedule.attention.some((r) => r.includes("failed state")),
  failedSchedule.attention,
);

const renamed = health({
  snapshot: stored({
    schedules: [schedule({ jobName: "content.daily_pilot" })],
  }),
});
check(
  "a job name that does not match the mirror is not treated as the daily pilot",
  renamed.state === "OFF",
  renamed.state,
);

// ---------------------------------------------------------------------------
console.log("\nAutomation health — attention is named, never counted");
// ---------------------------------------------------------------------------

const withFailures = health({
  snapshot: stored({
    status: automationStatus({ schedulesFailed: 2, tasksFailed: 1 }),
  }),
});
check(
  "failed schedules are named",
  withFailures.attention.some((r) => r.startsWith("2 schedules are")),
  withFailures.attention,
);
check(
  "failed tasks are named",
  withFailures.attention.some((r) => r === "1 task failed."),
  withFailures.attention,
);
check(
  "a failure does not flip On to Off",
  withFailures.state === "ON",
  withFailures.state,
);

const singular = health({
  snapshot: stored({ status: automationStatus({ schedulesFailed: 1 }) }),
});
check(
  "one failed schedule reads as singular",
  singular.attention.some((r) => r.startsWith("1 schedule is")),
  singular.attention,
);

const stale = health({ snapshot: stored({ producedAt: OLD }) });
check(
  "a stale report is itself an attention item",
  stale.attention.some((r) => r.includes("last reported")),
  stale.attention,
);
const fresh = health({ snapshot: stored({ producedAt: RECENT }) });
check(
  "a fresh report is not called stale",
  !fresh.attention.some((r) => r.includes("last reported")),
  fresh.attention,
);

const badRender = health({
  snapshot: stored({ renders: [render({ renderState: "FAILED" })] }),
});
check(
  "a failed render raises attention on the front page",
  badRender.attention.some((r) => r.includes("video render failed")),
  badRender.attention,
);

// ---------------------------------------------------------------------------
console.log("\nToday — which posts qualify");
// ---------------------------------------------------------------------------

const post = (over = {}) => ({
  id: "p1",
  title: "Hook",
  channelTarget: "facebook",
  postText: "text",
  suggestedHashtags: [],
  status: "draft",
  videoMediaAssetId: "asset-1",
  createdAt: "2026-08-18T08:00:00.000Z",
  ...over,
});

check(
  "a draft with a video is today's candidate",
  state.selectTodayCandidates([post()]).length === 1,
);
check(
  "a draft with NO video is not a candidate",
  state.selectTodayCandidates([post({ videoMediaAssetId: undefined })])
    .length === 0,
);
check(
  "a published post is not a candidate",
  state.selectTodayCandidates([post({ status: "posted" })]).length === 0,
);
check(
  "an archived post is not a candidate",
  state.selectTodayCandidates([post({ status: "archived" })]).length === 0,
);
check(
  "candidates are newest first",
  state
    .selectTodayCandidates([
      post({ id: "old", createdAt: "2026-08-17T08:00:00.000Z" }),
      post({ id: "new", createdAt: "2026-08-18T08:00:00.000Z" }),
    ])
    .map((p) => p.id)
    .join(",") === "new,old",
);

// SEO work reaches marketing_posts only through
// `convertMarketingItemToPostAction`, which refuses any kind but
// `social_post` — and an SEO page has no rendered Reel, so even if that guard
// were relaxed the post could not satisfy this filter. Both facts are why an
// SEO approval cannot appear in the daily social queue.
const seoShaped = post({
  id: "seo",
  videoMediaAssetId: undefined,
  title: "How to size a heat pump",
});
check(
  "an SEO-shaped draft (no video) never enters the daily social queue",
  state.selectTodayCandidates([seoShaped]).length === 0,
);

// ---------------------------------------------------------------------------
console.log("\nToday — the empty states are told apart");
// ---------------------------------------------------------------------------

const today = (input) =>
  state.deriveMarketingTodayState({
    posts: [],
    renders: null,
    nowIso: NOW,
    ...input,
  });

check(
  "a waiting candidate short-circuits every other state",
  today({
    posts: [post()],
    renders: {
      support: "SUPPORTED_WITH_DATA",
      items: [render({ renderState: "FAILED" })],
    },
  }).kind === "AWAITING_DECISION",
);
check(
  "nothing reported reads as nothing waiting",
  today({}).kind === "NOTHING",
);
check(
  "NOT_SUPPORTED renders read as nothing waiting, not as a failure",
  today({
    renders: {
      support: "NOT_SUPPORTED",
      items: [render({ renderState: "FAILED" })],
    },
  }).kind === "NOTHING",
);

const preparing = today({
  renders: {
    support: "SUPPORTED_WITH_DATA",
    items: [render({ renderState: "PENDING" })],
  },
});
check(
  "a pending render reads as being prepared",
  preparing.kind === "PREPARING",
  preparing.kind,
);
check(
  "being prepared uses the required wording",
  preparing.headline === "Today's video is being prepared",
  preparing.headline,
);

const withStage = today({
  renders: {
    support: "SUPPORTED_WITH_DATA",
    items: [render({ renderState: "PENDING", stage: "compose" })],
  },
});
check(
  "a reported stage is shown",
  withStage.detail.includes("compose"),
  withStage.detail,
);

const failed = today({
  renders: {
    support: "SUPPORTED_WITH_DATA",
    items: [
      render({
        renderState: "FAILED",
        failureName: "FfmpegExit",
        failureMessage: "code 234",
      }),
    ],
  },
});
check(
  "a failed render reads as could not be prepared",
  failed.kind === "FAILED",
  failed.kind,
);
check(
  "failure uses the required wording",
  failed.headline === "Today's video could not be prepared",
  failed.headline,
);
check(
  "the platform's own failure text is quoted, not paraphrased",
  failed.detail.includes("FfmpegExit: code 234"),
  failed.detail,
);

const failedSilently = today({
  renders: {
    support: "SUPPORTED_WITH_DATA",
    items: [render({ renderState: "FAILED" })],
  },
});
check(
  "a failure with no reason says so instead of inventing one",
  failedSilently.detail.includes("without a reason"),
  failedSilently.detail,
);

const unknown = today({
  renders: {
    support: "SUPPORTED_WITH_DATA",
    items: [render({ renderState: "UNKNOWN" })],
  },
});
check(
  "UNKNOWN is not rendered as a failure",
  unknown.kind === "UNRESOLVED",
  unknown.kind,
);

const cancelled = today({
  renders: {
    support: "SUPPORTED_WITH_DATA",
    items: [render({ renderState: "CANCELLED" })],
  },
});
check(
  "a cancelled render says it was cancelled",
  cancelled.headline.includes("cancelled"),
  cancelled.headline,
);

const completed = today({
  renders: {
    support: "SUPPORTED_WITH_DATA",
    items: [render({ renderState: "COMPLETED" })],
  },
});
check(
  "a completed render with no post says exactly that",
  completed.kind === "RENDERED_NOT_QUEUED",
  completed.kind,
);

const staleRender = today({
  renders: {
    support: "SUPPORTED_WITH_DATA",
    items: [
      render({ renderState: "FAILED", recordedAt: OLD, submittedAt: OLD }),
    ],
  },
});
check(
  "a week-old failure is not narrated as today's",
  staleRender.kind === "NOTHING",
  staleRender.kind,
);

const twoRenders = today({
  renders: {
    support: "SUPPORTED_WITH_DATA",
    items: [
      render({
        jobId: "older",
        renderState: "FAILED",
        recordedAt: "2026-08-18T06:00:00.000Z",
      }),
      render({
        jobId: "newer",
        renderState: "PENDING",
        recordedAt: "2026-08-18T11:00:00.000Z",
      }),
    ],
  },
});
check(
  "the newest render decides the state",
  twoRenders.kind === "PREPARING",
  twoRenders.kind,
);

const noStamps = today({
  renders: {
    support: "SUPPORTED_WITH_DATA",
    items: [
      render({ renderState: "PENDING", recordedAt: null, submittedAt: null }),
    ],
  },
});
check(
  "an undateable render is not narrated as today's",
  noStamps.kind === "NOTHING",
  noStamps.kind,
);

// ---------------------------------------------------------------------------
console.log("\nConsolidation — one home per capability");
// ---------------------------------------------------------------------------

const src = (path) => readFileSync(path, "utf8");
const today_ = src("shared/components/marketing-hub/MarketingTodayView.tsx");
const workspace = src("shared/components/marketing-hub/MarketingWorkspace.tsx");
const settings = src(
  "shared/components/marketing-hub/MarketingSettingsView.tsx",
);
const hub = src("shared/components/marketing-hub/MarketingHubPageView.tsx");

check(
  "the primary view does not render the diagnostics section",
  !today_.includes("MarketingAutomationSection"),
);
check(
  "the primary view does not render the manual-posts view",
  !today_.includes("MarketingHubPageView"),
);
check(
  "the primary view does not render connected accounts",
  !today_.includes("MarketingConnectedAccountsCard"),
);
check(
  "the primary view derives its states rather than hand-writing them",
  today_.includes("deriveMarketingTodayState") &&
    today_.includes("selectTodayCandidates"),
);
check(
  // Was "Today is the default tab", then "Command is offered before Today".
  // Today has since become Publishing, so the sibling it was compared against
  // no longer exists. The invariant worth keeping is unchanged: SOME tab is
  // the default and it is the FIRST one offered.
  "Command is the workspace's default tab, and is offered first",
  /useState<TabId>\("command"\)/.test(workspace) &&
    workspace.indexOf('{ id: "command"') < workspace.indexOf('{ id: "content"'),
);
check(
  // Was "Today is still reachable as its own tab". The daily go-out view was
  // not deleted in the reorganisation — it is what Publishing renders — and
  // that, not the label it used to carry, is what must stay true.
  "the daily go-out view is still reachable, now under Publishing",
  workspace.includes('{ id: "publishing"') &&
    workspace.indexOf('tab === "publishing"') <
      workspace.indexOf("<MarketingTodayView"),
);
check(
  "every destination in the hierarchy is offered",
  [
    "command",
    "content",
    "publishing",
    "performance",
    "website",
    "history",
    "settings",
  ].every(
    (id) =>
      workspace.includes(`{ id: "${id}"`) &&
      workspace.includes(`tab === "${id}"`),
  ),
);
check(
  // Was "mounted exactly once, under Advanced". The dashboard is now mounted
  // three times ON PURPOSE, each asking for a different slice — so counting
  // mounts is the wrong invariant. What must hold is that the slices are
  // DISJOINT, or a section would render twice in one workspace.
  "NO AUTOMATION SECTION IS RENDERED BY TWO TABS",
  (() => {
    const asked = [...workspace.matchAll(/only=\{\[([^\]]*)\]\}/g)].flatMap(
      (m) => [...m[1].matchAll(/"([a-zA-Z]+)"/g)].map((k) => k[1]),
    );
    return asked.length > 0 && new Set(asked).size === asked.length;
  })(),
);
check(
  // The other half of splitting a dashboard: nothing may be lost in the move.
  "AND NO SECTION WAS LOST IN THE REORGANISATION",
  (() => {
    const automation = src(
      "shared/components/marketing-hub/MarketingAutomationSection.tsx",
    );
    const declared = [
      ...((automation.match(
        /AUTOMATION_SECTION_KEYS = \[([\s\S]*?)\] as const/,
      ) ?? [])[1]?.matchAll(/"([a-zA-Z]+)"/g) ?? []),
    ].map((m) => m[1]);
    const asked = new Set(
      [...workspace.matchAll(/only=\{\[([^\]]*)\]\}/g)].flatMap((m) =>
        [...m[1].matchAll(/"([a-zA-Z]+)"/g)].map((k) => k[1]),
      ),
    );
    return declared.length > 0 && declared.every((key) => asked.has(key));
  })(),
);
check(
  "every automation mount asks for an explicit slice",
  workspace.split("<MarketingAutomationSection").length - 1 ===
    workspace.split("only={[").length - 1,
);
check(
  // Was "under Advanced". The post editor moved to Content and must still be
  // mounted exactly once — two mounts would be two editors over one store.
  "the manual-posts view is mounted exactly once, under Content",
  workspace.split("<MarketingHubPageView").length === 2 &&
    workspace.indexOf('tab === "content"') <
      workspace.indexOf("<MarketingHubPageView"),
);
check(
  "the Website tab reads pages and cannot edit them",
  (() => {
    const site = src(
      "shared/components/marketing-hub/MarketingWebsiteView.tsx",
    );
    return (
      workspace.includes("<MarketingWebsiteView") &&
      !/use client/.test(site) &&
      !/Action\(|<form|<input|<textarea/.test(site)
    );
  })(),
);
check(
  "settings owns the only connected-accounts card in the workspace",
  settings.includes("MarketingConnectedAccountsCard") &&
    !workspace.includes("MarketingConnectedAccountsCard"),
);
check(
  "the manual-posts view no longer renders its own connected-accounts card",
  !hub.includes("<MarketingConnectedAccountsCard"),
);
check(
  "the manual-posts view no longer renders its own Marketing HQ banner",
  !hub.includes('href="/marketing/hq"'),
);
check(
  "the Marketing HQ link has exactly one home in the workspace",
  settings.split('href="/marketing/hq"').length === 2 &&
    !workspace.includes("/marketing/hq") &&
    !today_.includes("/marketing/hq"),
);
check(
  "the manual-posts view declares no page shell of its own",
  !hub.includes("MasterListPageLayout") && !hub.includes('title="Marketing"'),
);
check(
  "the manual-posts view still owns New post draft and the status tabs",
  hub.includes("New post draft") && hub.includes("LIST_TABS"),
);

// ---------------------------------------------------------------------------
console.log("\nConsolidation — no control that is wired to nothing");
// ---------------------------------------------------------------------------

// This milestone is a UI consolidation. A settings view that imported a
// server action would mean new behaviour had been added under cover of a
// layout change; a <form> or a mutating handler would mean a switch had been
// drawn for a schedule this repository cannot reach.
check(
  "settings imports no server action",
  !/from "@\/app\/actions/.test(settings),
);
check("settings renders no form", !settings.includes("<form"), "form found");
check(
  "settings renders no button",
  !settings.includes("<button"),
  "button found",
);
check(
  "settings says where the schedule is actually changed",
  settings.includes("it does not set it"),
);
check(
  "settings offers the brand link only to those who can open it",
  settings.includes("canOpenMarketingHq ?"),
);

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
