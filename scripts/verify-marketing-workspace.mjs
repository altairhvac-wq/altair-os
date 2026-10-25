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
  "staleness threshold is 36 hours",
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

check(
  "a website draft with its brief is an article candidate",
  state.selectArticleCandidates([
    post({ channelTarget: "website", videoMediaAssetId: undefined, contentPackageId: "pkg" }),
  ]).length === 1,
);
check(
  "a website draft with NO brief is not an article candidate",
  state.selectArticleCandidates([
    post({ channelTarget: "website", videoMediaAssetId: undefined, contentPackageId: undefined }),
  ]).length === 0,
);
check(
  "a text-only Facebook draft is a text-post candidate",
  state.selectTextPostCandidates([
    post({ channelTarget: "facebook", videoMediaAssetId: undefined, postText: "Hello" }),
  ]).length === 1,
);
check(
  "a text-only Instagram draft is never offered (Instagram needs media)",
  state.selectTextPostCandidates([
    post({ channelTarget: "instagram", videoMediaAssetId: undefined, postText: "Hello" }),
  ]).length === 0,
);
check(
  "a video draft is never a text-post candidate",
  state.selectTextPostCandidates([post({ channelTarget: "facebook" })]).length === 0,
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
const library = src("shared/components/marketing-hub/MarketingLibraryView.tsx");
const extras = src("shared/components/marketing-hub/MarketingQueueExtras.tsx");
const exists = (path) => {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
};

// 2026-10-25: three tabs — Today, Library, Settings. See MarketingWorkspace.tsx.
check(
  "the workspace offers exactly Today, Library and Settings, in that order",
  [...workspace.matchAll(/\{ id: "([a-z]+)", label:/g)].map((m) => m[1]).join(",") ===
    "today,library,settings",
);
check(
  "Today is the default tab",
  workspace.includes('useState<TabId>("today")'),
);
check(
  "Today holds the one queue (videos, then articles, posts and ideas) above the Chief",
  workspace.indexOf('tab === "today"') < workspace.indexOf("<MarketingTodayView") &&
    workspace.indexOf("<MarketingTodayView") < workspace.indexOf("<MarketingQueueExtras") &&
    workspace.indexOf("<MarketingQueueExtras") < workspace.indexOf("<MarketingCommandView"),
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
  "no direct publish control is rendered anywhere in the workspace",
  [today_, extras, library, workspace, settings].every(
    (text) =>
      !text.includes("PublishControls") &&
      !text.includes("publishMarketingItemToFacebookAction"),
  ),
);
check(
  "every Approve in the queue goes through the destination-bound approval action",
  extras.includes("approveMarketingPostForDistributionAction(") &&
    today_.includes("approveMarketingPostForDistributionAction("),
);
check(
  "the retired screens are gone",
  [
    "shared/components/marketing-hub/MarketingHubPageView.tsx",
    "shared/components/marketing-hub/MarketingPostDraftForm.tsx",
    "shared/components/marketing-hub/MarketingAutomationSection.tsx",
    "shared/components/marketing-hub/MarketingWebsiteView.tsx",
    "shared/components/marketing-hq/MarketingAiHqPageView.tsx",
  ].every((path) => !exists(path)),
);
check(
  "the old Marketing HQ address redirects to the workspace",
  src("app/(admin)/marketing/hq/page.tsx").includes('redirect("/marketing")'),
);
check(
  "Library reads live website pages and edits only non-website posts",
  library.includes("/insights/") &&
    library.includes('post.channelTarget !== "website"') &&
    library.includes("updateMarketingPostAction("),
);
check(
  "Library offers no way to create or publish a post",
  !library.includes("createMarketingPostAction") &&
    !library.includes("markMarketingPostPostedAction") &&
    !library.includes("createRecurringMarketingPostsAction"),
);
check(
  "settings owns the only connected-accounts card in the workspace",
  settings.includes("MarketingConnectedAccountsCard") &&
    !workspace.includes("MarketingConnectedAccountsCard"),
);
check(
  "settings lists every connection and points at Integrations",
  settings.includes('href="/settings/integrations"'),
);
check(
  "brand & goals lives in Settings, and nothing links to the retired HQ page",
  settings.includes("<MarketingBrandGoalsCard") &&
    ![today_, workspace, settings, library, extras].some((text) =>
      text.includes('href="/marketing/hq"'),
    ),
);

// ---------------------------------------------------------------------------
console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
