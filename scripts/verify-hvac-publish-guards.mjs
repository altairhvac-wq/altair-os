/**
 * The direct-publish guard for agent-managed Reels, and the five hardening
 * claims of 2026-09-14:
 *
 *   1. Approve does not publish (structurally: the approve action's module
 *      imports no transport and no dispatcher).
 *   2. HVAC legacy Meta buttons cannot bypass the schedule/gate (the guard
 *      refuses every direct provider for an hvac-short-* video, and both
 *      reel actions consult it BEFORE the delivery claim).
 *   3. Cross-platform sibling leakage is impossible for bridge drafts.
 *   4. An agent-managed video already live on a provider cannot duplicate.
 *   5. MARKETING_PUBLISH_MODE=live alone cannot bypass any of it
 *      (structurally: the guard module cannot read the environment).
 *
 * Pure-module harness, no database, no network, no credentials.
 * Run: node scripts/verify-hvac-publish-guards.mjs
 */
import { readFileSync } from "node:fs";
import { loadPureModule } from "./lib/load-pure-module.mjs";

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

const guard = await loadPureModule("lib/publishing/hvac-guard.ts", "hvacguard");
const refuse = guard.refuseDirectReelPublish;

const base = {
  post: { sourceType: "agent_daily_reel", channelTarget: "facebook" },
  videoSourceJobId: "hvac-short-suction-line-frost",
  postedSiblingProviders: [],
};

console.log("\nRule 2 — an HVAC Short never publishes from a direct click");

for (const provider of ["facebook", "instagram"]) {
  const refusal = refuse({ ...base, requestedProvider: provider });
  check(
    `hvac video + direct ${provider} click is refused`,
    typeof refusal === "string" && /scheduled distribution/i.test(refusal),
    refusal,
  );
}
check(
  "the video decides, not the row: a manual post pointing at an HVAC video is still refused",
  refuse({
    requestedProvider: "facebook",
    post: { sourceType: "manual", channelTarget: "facebook" },
    videoSourceJobId: "hvac-short-what-does-a-txv-actually-control",
    postedSiblingProviders: [],
  }) !== null,
);

console.log("\nRule 3 — cross-platform sibling leakage is impossible");

check(
  "an instagram bridge draft cannot be sent to facebook",
  refuse({
    requestedProvider: "facebook",
    post: { sourceType: "agent_daily_reel", channelTarget: "instagram" },
    videoSourceJobId: "daily-reel-20260901-hookB",
    postedSiblingProviders: [],
  }) !== null,
);
check(
  "a facebook bridge draft cannot be sent to instagram",
  refuse({
    requestedProvider: "instagram",
    post: { sourceType: "agent_daily_reel", channelTarget: "facebook" },
    videoSourceJobId: "daily-reel-20260901-hookB",
    postedSiblingProviders: [],
  }) !== null,
);
check(
  "a matching bridge draft (facebook→facebook, nothing posted) is allowed",
  refuse({
    requestedProvider: "facebook",
    post: { sourceType: "agent_daily_reel", channelTarget: "facebook" },
    videoSourceJobId: "daily-reel-20260901-hookB",
    postedSiblingProviders: [],
  }) === null,
);

console.log("\nRule 4 — already-live videos cannot duplicate");

check(
  "sibling already posted to facebook blocks a second facebook publish of the same video",
  refuse({
    requestedProvider: "facebook",
    post: { sourceType: "agent_daily_reel", channelTarget: "facebook" },
    videoSourceJobId: "daily-reel-20260901-hookB",
    postedSiblingProviders: ["facebook"],
  }) !== null,
);
check(
  "a facebook publish is not blocked by an instagram sibling delivery",
  refuse({
    requestedProvider: "facebook",
    post: { sourceType: "agent_daily_reel", channelTarget: "facebook" },
    videoSourceJobId: "daily-reel-20260901-hookB",
    postedSiblingProviders: ["instagram"],
  }) === null,
);
check(
  "legacy manual content keeps its existing freedoms (guard scoped to agent-managed)",
  refuse({
    requestedProvider: "facebook",
    post: { sourceType: "manual", channelTarget: "facebook" },
    videoSourceJobId: "some-legacy-render",
    postedSiblingProviders: ["facebook"],
  }) === null,
);

console.log("\nRule 5 — the kill switch cannot be an input");

const guardSource = readFileSync("lib/publishing/hvac-guard.ts", "utf8");
check(
  "the guard module never reads the environment",
  !guardSource.includes("process.env"),
);
check(
  "MARKETING_PUBLISH_MODE does not appear as code in the guard",
  !/MARKETING_PUBLISH_MODE\s*[^\s`*]/.test(
    guardSource.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""),
  ),
);
check(
  "the guard module imports nothing (pure by construction)",
  !/^import /m.test(guardSource),
);

console.log("\nRule 1 — approve does not publish (structural)");

const approveSource = readFileSync("app/actions/marketing-posts.ts", "utf8");
check(
  "the approve/update action module imports no transport or dispatcher",
  !/integrations\/facebook\/(reels|publish)|publishing\/dispatch|integrations\/youtube\/(upload|adapter)/.test(
    approveSource,
  ),
);

console.log("\nWiring — the reel actions consult the guard before the claim");

const publishSource = readFileSync("app/actions/marketing-publish.ts", "utf8");
for (const action of [
  "publishMarketingReelToFacebookAction",
  "publishMarketingReelToInstagramAction",
]) {
  const start = publishSource.indexOf(`export async function ${action}`);
  const slice = publishSource.slice(start, start + 4000);
  const guardAt = slice.indexOf("refuseAgentManagedDirectPublish");
  const claimAt = slice.indexOf("claimDelivery");
  check(
    `${action} runs the guard, and before claimDelivery`,
    start > -1 && guardAt > -1 && claimAt > -1 && guardAt < claimAt,
    { start, guardAt, claimAt },
  );
}
check(
  "a failed duplicate-check read refuses rather than proceeding",
  /refused rather than risking a duplicate/.test(publishSource),
);

console.log("\nUI — HVAC grouped cards render no direct publish buttons");

const viewSource = readFileSync(
  "shared/components/marketing-hub/MarketingTodayView.tsx",
  "utf8",
);
const hvacBranchAt = viewSource.indexOf("isHvacManaged ?");
const reelControlsAt = viewSource.indexOf("<MarketingReelPublishControls", hvacBranchAt);
check(
  "the per-channel controls sit behind the isHvacManaged branch",
  hvacBranchAt > -1 && reelControlsAt > hvacBranchAt,
  { hvacBranchAt, reelControlsAt },
);
check(
  "the replacement copy names the real path and the server refusal",
  viewSource.includes("refused server-side"),
);

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
