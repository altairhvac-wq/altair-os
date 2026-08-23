/**
 * Executable tests for the Reel performance evidence the strategist reads.
 *
 * ===================== WHY THIS EXISTS =====================
 * Three failures here would be silent and would look like insight:
 *
 *  1. These are LIFETIME counters. Summing days instead of taking the latest
 *     reading multiplies a Reel's views by the number of times the collector
 *     ran — and the number stays plausible while doing it.
 *  2. A model shown two Reels will rank them with equal fluency whether they
 *     differ by 4,000 views or by four. The sufficiency rules are computed here
 *     so "don't over-read a small sample" is a rule and not a suggestion.
 *  3. A Facebook play and an Instagram view are different measurements, and
 *     Instagram reports no watch time at all. A missing watch number must read
 *     as "the API does not report this", never as a Reel nobody watched.
 *
 * The last block is the one that matters most: it builds the REAL strategist
 * request and asserts the numbers are in the prompt the model receives. Without
 * it, everything above could be correct and still never reach the agent.
 *
 * NO DATABASE, NO NETWORK, NO MODEL CALL.
 *
 * ==================== THESE TESTS WERE MUTATION-CHECKED ====================
 * Summing metrics instead of taking the latest, dropping the view floor from
 * `sufficiencyFor`, or removing the evidence section from `formatStrategistInput`
 * each fail this suite.
 *
 * Run: node scripts/verify-marketing-reel-evidence.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

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

const dir = mkdtempSync(join(tmpdir(), "reel-evidence-"));
function transpile(src, out, rewrites = []) {
  const { outputText } = ts.transpileModule(readFileSync(src, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  let code = outputText;
  for (const [from, to] of rewrites) code = code.split(from).join(to);
  writeFileSync(join(dir, out), code);
}

transpile("shared/types/marketing-reel-evidence.ts", "evidence.mjs");
const E = await import(pathToFileURL(join(dir, "evidence.mjs")).href);

/* ------------------------------------------------------- folding */

const fbRows = [
  { metric: "blue_reels_play_count", value: 100, observedOn: "2026-08-22" },
  { metric: "blue_reels_play_count", value: 180, observedOn: "2026-08-23" },
  { metric: "post_impressions_unique", value: 140, observedOn: "2026-08-23" },
  { metric: "post_video_social_actions", value: 9, observedOn: "2026-08-23" },
  { metric: "post_video_avg_time_watched", value: 4200, observedOn: "2026-08-23" },
  { metric: "post_video_view_time", value: 756000, observedOn: "2026-08-23" },
];
const fb = E.foldMetricsForProvider("facebook", fbRows);

check(
  "a lifetime counter takes the LATEST reading, never the sum of days",
  fb.metrics.views === 180,
  `${fb.metrics.views} (100 + 180 = 280 would be the bug)`,
);
check("days observed counts distinct days", fb.daysObserved === 2, fb.daysObserved);
check("latest observed day is the newest", fb.latestObservedOn === "2026-08-23");
check(
  "Facebook aliases land on the shared vocabulary",
  fb.metrics.reach === 140 && fb.metrics.engagement === 9 &&
    fb.metrics.avgWatchMs === 4200 && fb.metrics.totalWatchMs === 756000,
  fb.metrics,
);

const ig = E.foldMetricsForProvider("instagram", [
  { metric: "views", value: 900, observedOn: "2026-08-23" },
  { metric: "reach", value: 700, observedOn: "2026-08-23" },
  { metric: "total_interactions", value: 55, observedOn: "2026-08-23" },
]);
check(
  "Instagram aliases land on the same vocabulary",
  ig.metrics.views === 900 && ig.metrics.reach === 700 && ig.metrics.engagement === 55,
  ig.metrics,
);
check(
  "Instagram watch metrics are null — the API does not report them, so they are NOT zero",
  ig.metrics.avgWatchMs === null && ig.metrics.totalWatchMs === null,
  ig.metrics,
);
check(
  "an unknown provider yields nulls rather than throwing",
  E.foldMetricsForProvider("tiktok", [{ metric: "views", value: 5, observedOn: "2026-08-23" }])
    .metrics.views === null,
);

/* --------------------------------------------------- sufficiency */

const reel = (views, provider = "facebook", story = "s") => ({
  sourceJobId: `job-${views}-${provider}`, story, hook: "h", provider,
  publishedAt: "2026-08-20T10:00:00.000Z", daysObserved: 1, latestObservedOn: "2026-08-23",
  metrics: { views, reach: null, engagement: null, avgWatchMs: null, totalWatchMs: null, replays: null },
});

check("no Reels at all is insufficient", E.sufficiencyFor([]) === "insufficient");
check(
  "two measured Reels is still insufficient — nothing gets ranked",
  E.sufficiencyFor([reel(500), reel(600)]) === "insufficient",
);
check(
  "three measured Reels is directional, not a finding",
  E.sufficiencyFor([reel(500), reel(600), reel(700)]) === "directional",
);
check(
  "six measured Reels supports naming a pattern",
  E.sufficiencyFor([500, 600, 700, 800, 900, 1000].map((v) => reel(v))) === "comparable",
);
check(
  `Reels under the ${E.MIN_VIEWS_FOR_COMPARISON}-view floor do not count toward the sample`,
  E.sufficiencyFor([reel(3), reel(4), reel(5), reel(6)]) === "insufficient",
  "four tiny Reels must not become a comparable sample",
);
check(
  "a Reel with no views recorded does not count as measured",
  E.sufficiencyFor([reel(null), reel(null), reel(null)]) === "insufficient",
);
check(
  "the per-provider summary counts published and measured separately",
  (() => {
    const s = E.summarizeByProvider([reel(900, "facebook"), reel(2, "facebook"), reel(900, "instagram")]);
    return s.facebook.count === 2 && s.facebook.measured === 1 && s.instagram.count === 1;
  })(),
);

/* ---------------------------------------------------- formatting */

const noData = E.formatReelEvidence({ sinceDays: 30, reels: [], byProvider: {} });
check("with no data the block says so explicitly", /NO DATA/.test(noData));
check(
  "with no data the model is told not to infer anything from the absence",
  /Do not infer anything about hooks/i.test(noData),
);

const evidence = {
  sinceDays: 30,
  reels: [
    {
      sourceJobId: "reel-altair-overview-20260823T025029Z-4af6c6a7",
      story: "altair-overview",
      hook: "Running an HVAC business gets messy fast.",
      provider: "facebook",
      publishedAt: "2026-08-22T18:00:00.000Z",
      daysObserved: 2,
      latestObservedOn: "2026-08-23",
      metrics: { views: 180, reach: 140, engagement: 9, avgWatchMs: 4200, totalWatchMs: 756000, replays: 12 },
    },
  ],
  byProvider: { facebook: { count: 1, measured: 1, sufficiency: "insufficient" } },
};
const block = E.formatReelEvidence(evidence);

check("the hook as published is in the block", block.includes("Running an HVAC business gets messy fast."));
check("the story is in the block", block.includes("altair-overview"));
check(
  "the render job id is in the block — the trace the next plan cites",
  block.includes("reel-altair-overview-20260823T025029Z-4af6c6a7"),
);
check("views, reach and engagement are all present", /views 180/.test(block) && /reach 140/.test(block) && /engagement 9/.test(block));
check("watch metrics are rendered in seconds where available", /avg watch 4\.2s/.test(block));
check("the sufficiency label is stated for the provider", /INSUFFICIENT/.test(block));
check(
  "the block forbids comparing Facebook numbers against Instagram ones",
  /NEVER compare a Facebook number against an Instagram one/i.test(block),
);
check(
  "the block never asserts a winner on its own",
  !/best performing|top performer|outperformed/i.test(block),
);

check("a missing metric reads as 'not reported', never as 0", (() => {
  const b = E.formatReelEvidence({
    sinceDays: 30,
    reels: [{ ...evidence.reels[0], metrics: { ...evidence.reels[0].metrics, reach: null } }],
    byProvider: evidence.byProvider,
  });
  return /reach not reported/.test(b);
})());

check("the hook is the published caption's first block", E.hookFromPostText("Line one.\n\nLine two.") === "Line one.");
check("an empty caption is named, not blank", E.hookFromPostText("") === "(no caption recorded)");
check("a very long hook is truncated rather than flooding the prompt", E.hookFromPostText("x".repeat(400)).length <= 200);
check("the channel suffix is stripped from the story", E.storyFromTitle("altair-overview — Facebook Reel") === "altair-overview");
check("a title with no suffix survives intact", E.storyFromTitle("Spring tune-up push") === "Spring tune-up push");

/* ------------------- the part that proves it REACHES the agent ------------- */

writeFileSync(join(dir, "brand.mjs"), 'export function buildMarketingHqContextBlock(){ return "FOUNDATION"; }\n');
writeFileSync(join(dir, "hq.mjs"), 'export const MARKETING_AI_ROLES = ["strategist","copywriter"];\n');
writeFileSync(join(dir, "server-only.mjs"), "export {};\n");
transpile("lib/marketing/roles/strategist.ts", "strategist.mjs", [
  ['"server-only"', '"./server-only.mjs"'],
  ['"@/lib/marketing/brand"', '"./brand.mjs"'],
  ['"@/shared/types/marketing-ai-hq"', '"./hq.mjs"'],
  ['"@/shared/types/marketing-reel-evidence"', '"./evidence.mjs"'],
]);
const S = await import(pathToFileURL(join(dir, "strategist.mjs")).href);

const request = S.buildStrategistRequest({
  context: {},
  itemFlowStats: { sinceDays: 7, drafted: 4, approved: 2, rejected: 1, converted: 1, byKind: {} },
  previousReport: null,
  recentRejectedTitles: [],
  reelEvidence: evidence,
});

check(
  "yesterday's Reel numbers are in the prompt the strategist actually receives",
  request.inputText.includes("views 180") && request.inputText.includes("reach 140"),
);
check(
  "so is the hook that earned them",
  request.inputText.includes("Running an HVAC business gets messy fast."),
);
check(
  "so is the render job id, so a recommendation can cite it",
  request.inputText.includes("reel-altair-overview-20260823T025029Z-4af6c6a7"),
);
check(
  "the prompt tells the strategist to obey the sufficiency labels",
  /INSUFFICIENT means report the numbers and draw no comparison/i.test(request.prompt),
);
check(
  "the prompt separates what the AUDIENCE did from what the FOUNDER approved",
  /only tell you what the FOUNDER accepted/i.test(request.prompt),
);
check(
  "the prompt asks for the job id to be cited when performance drives a recommendation",
  /cite the render job id/i.test(request.prompt),
);
check(
  "a caller that passes no evidence still gets an explicit NO DATA section, not silence",
  S.buildStrategistRequest({
    context: {}, itemFlowStats: { sinceDays: 7, drafted: 0, approved: 0, rejected: 0, converted: 0, byKind: {} },
    previousReport: null, recentRejectedTitles: [],
  }).inputText.includes("NO DATA"),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} reel evidence checks passed.`,
);
if (failures > 0) process.exit(1);
