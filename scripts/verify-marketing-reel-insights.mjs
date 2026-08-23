/**
 * Executable tests for the organic Reel insights collector.
 *
 * ===================== WHY THIS EXISTS =====================
 * Three decisions in this collector are the kind that read correctly and behave
 * wrongly, and each would be silent:
 *
 *  1. A metric whose Graph value is neither a number nor an object of numbers
 *     must be SKIPPED, never coerced to 0. A fabricated zero is indistinguishable
 *     from a real one and would be stored with the same confidence.
 *  2. A Reel too fresh to have insights must classify as `not_ready`, not as a
 *     failure. Meta reports both with the same generic code 100.
 *  3. Every row must carry the render jobId in `dimensions`. That is the entire
 *     point of the collector; a row without it is a number attached to nothing.
 *
 * NO DATABASE, NO NETWORK. The pure module is transpiled and driven directly.
 *
 * ==================== THESE TESTS WERE MUTATION-CHECKED ====================
 * Making `toFiniteTotal` return 0 instead of null, mapping code 100 to
 * "unknown", or dropping sourceJobId from `dimensions` each fail this suite.
 *
 * Run: node scripts/verify-marketing-reel-insights.mjs
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

const dir = mkdtempSync(join(tmpdir(), "reel-insights-"));
const { outputText } = ts.transpileModule(
  readFileSync("shared/types/marketing-insights.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
);
writeFileSync(join(dir, "insights.mjs"), outputText);
const M = await import(pathToFileURL(join(dir, "insights.mjs")).href);

/* ------------------------------------------------- the metric catalogue */

check(
  "Facebook Reels are asked for Reels metrics, on the video_insights vocabulary",
  M.FACEBOOK_REEL_METRICS.includes("blue_reels_play_count") &&
    M.FACEBOOK_REEL_METRICS.includes("post_impressions_unique"),
  M.FACEBOOK_REEL_METRICS,
);

check(
  "Instagram asks for `views` and never the three metrics Meta removed on 2025-04-10",
  M.INSTAGRAM_REEL_METRICS.includes("views") &&
    !M.INSTAGRAM_REEL_METRICS.includes("impressions") &&
    !M.INSTAGRAM_REEL_METRICS.includes("plays") &&
    !M.INSTAGRAM_REEL_METRICS.includes("video_views"),
  M.INSTAGRAM_REEL_METRICS,
);

check(
  "the two providers get different metric lists",
  M.metricsFor("facebook") !== M.metricsFor("instagram") &&
    M.metricsFor("instagram").includes("views"),
);

check(
  "organic rows are stamped with a source that no paid collector shares",
  M.METRIC_SOURCE === "meta_organic_reel",
  M.METRIC_SOURCE,
);

/* ------------------------------------------------------ the normalizer */

const igPayload = {
  data: [
    { name: "views", period: "lifetime", values: [{ value: 1234 }] },
    { name: "reach", period: "lifetime", values: [{ value: 900 }] },
    { name: "likes", period: "lifetime", values: [{ value: 42 }] },
  ],
};
const normalized = M.normalizeInsightsPayload(igPayload);
check(
  "a normal payload yields one entry per metric with its value",
  normalized.length === 3 &&
    normalized.find((m) => m.metric === "views")?.value === 1234 &&
    normalized.find((m) => m.metric === "reach")?.value === 900,
  normalized,
);

check(
  "a breakdown object is summed rather than dropped",
  M.normalizeInsightsPayload({
    data: [{ name: "post_video_likes_by_reaction_type", values: [{ value: { like: 5, love: 3, wow: 2 } }] }],
  })[0]?.value === 10,
);

check(
  "a value of an unknown shape is SKIPPED, never recorded as zero",
  M.normalizeInsightsPayload({
    data: [{ name: "weird", values: [{ value: "not a number" }] }],
  }).length === 0,
);

check(
  "a breakdown containing a non-number is skipped whole, not partially summed",
  M.normalizeInsightsPayload({
    data: [{ name: "mixed", values: [{ value: { a: 1, b: "x" } }] }],
  }).length === 0,
);

check(
  "a real zero survives",
  M.normalizeInsightsPayload({ data: [{ name: "shares", values: [{ value: 0 }] }] })[0]?.value === 0,
);

check("an empty payload yields nothing rather than throwing", M.normalizeInsightsPayload({}).length === 0);
check("a null payload yields nothing rather than throwing", M.normalizeInsightsPayload(null).length === 0);

/* ------------------------------------------------ failure classification */

check(
  "code 100 — the code Meta uses for a too-fresh Reel — is not_ready, not a failure",
  M.classifyInsightsFailure({ code: 100 }) === "not_ready",
);
check("a bad token is auth, so it can be reported once and not per post",
  M.classifyInsightsFailure({ code: 190 }) === "auth");
check("throttling is its own kind", M.classifyInsightsFailure({ code: 4 }) === "rate_limited");
check(
  "a 'does not exist yet' message is not_ready even without a code",
  M.classifyInsightsFailure({ message: "Object with ID '123' does not exist" }) === "not_ready",
);
check(
  "anything unrecognised stays unknown rather than being quietly excused",
  M.classifyInsightsFailure({ code: 999999, message: "brand new failure" }) === "unknown",
);

/* --------------------------------------------------------- the trace */

const subject = {
  companyId: "co-1",
  deliveryId: "del-9",
  provider: "instagram",
  providerPostId: "ig-media-77",
  marketingPostId: "post-5",
  sourceJobId: "reel-altair-overview-20260823T025029Z-4af6c6a7",
};
const rows = M.buildMetricRows(subject, normalized, "2026-08-23");

check("one row per collected metric", rows.length === normalized.length);
check(
  "EVERY row carries the render jobId — the whole reason this collector exists",
  rows.length > 0 && rows.every((r) => r.dimensions.sourceJobId === subject.sourceJobId),
  rows[0]?.dimensions,
);
check(
  "every row also carries the delivery, the post and the provider post id",
  rows.every(
    (r) =>
      r.dimensions.deliveryId === "del-9" &&
      r.dimensions.marketingPostId === "post-5" &&
      r.dimensions.providerPostId === "ig-media-77" &&
      r.dimensions.provider === "instagram",
  ),
);
check("every row is stamped organic", rows.every((r) => r.source === M.METRIC_SOURCE));
check("every row shares the observed day the run was given", rows.every((r) => r.observedOn === "2026-08-23"));

check(
  "the identity of a row is stable across runs, so the unique index makes collection idempotent",
  JSON.stringify(M.buildMetricRows(subject, normalized, "2026-08-23")) === JSON.stringify(rows),
);

check(
  "a different day is a different row, so history accumulates instead of overwriting",
  M.buildMetricRows(subject, normalized, "2026-08-24")[0].observedOn !== rows[0].observedOn,
);

check(
  "the day stamp is UTC, matching a date column",
  M.observedOnFor(new Date("2026-08-23T23:30:00.000Z")) === "2026-08-23",
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} reel insights checks passed.`,
);
if (failures > 0) process.exit(1);
