/**
 * The publishing safety spine, exercised: destinations, the per-channel
 * pause, and the auto-approval policy.
 *
 * ==================== WHAT THIS IS GUARDING ====================
 * Three rules whose failure would be silent and expensive:
 *
 *   1. An approval NEVER infers its destination. One eligible account is the
 *      destination; several with none named is a refusal; a named one must be
 *      eligible. Nothing reads a title or a caption to guess a channel.
 *   2. The per-channel pause is honoured for the ROW and for Instagram alone
 *      on a shared Facebook Page row — and the gate refuses a paused channel
 *      even when it is otherwise ready.
 *   3. The auto-approval policy is OFF by default, accepts only known source
 *      names, and approves only a draft with a stored video and a measured
 *      render QA of PASS.
 *
 * Every module under test is pure (relative imports only), so this runs with
 * no database, no network and no credential, and cannot publish anything.
 * The last section reads three source files as text to pin the wiring.
 *
 * Run: node scripts/verify-publish-approval.mjs
 */
import { readFileSync } from "node:fs";
import { loadPureModule } from "./lib/load-pure-module.mjs";

let failures = 0;
function check(label, condition, extra) {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}${extra !== undefined ? `  -> ${String(extra)}` : ""}`);
  }
}

const dest = await loadPureModule("shared/lib/marketing-publish-destination.ts", "dest");
const chan = await loadPureModule("shared/types/marketing-channel-connection.ts", "chan");
const gate = await loadPureModule("lib/publishing/gate.ts", "gate");
const policy = await loadPureModule("lib/publishing/auto-approve.ts", "policy");

const account = (over = {}) => ({
  id: "acct-1",
  companyId: "co-1",
  provider: "youtube",
  providerResourceId: "UC_altair",
  status: "connected",
  integrationKind: "publisher",
  scopes: [],
  grantedScopes: [],
  publishCapability: "direct",
  publishingPaused: false,
  metadata: {},
  createdAt: "2026-10-25T00:00:00.000Z",
  updatedAt: "2026-10-25T00:00:00.000Z",
  ...over,
});

/* ----------------------------------------------------------- destinations */
console.log("\nDestinations");

check("website publishes to altair_site", dest.providerForChannelTarget("website") === "altair_site");
check("general names no provider", dest.providerForChannelTarget("general") === null);
check("youtube is youtube", dest.providerForChannelTarget("youtube") === "youtube");

{
  const rows = [
    account(),
    account({ id: "acct-2", providerResourceId: "UC_other" }),
    account({ id: "acct-dc", status: "disconnected" }),
    account({ id: "acct-placeholder", providerResourceId: undefined }),
    account({ id: "acct-asset", provider: "higgsfield", integrationKind: "asset_source" }),
  ];
  const yt = dest.listDestinationCandidates(rows, "youtube");
  check(
    "only connected publisher rows with a resource id are YouTube candidates",
    yt.map((a) => a.id).join(",") === "acct-1,acct-2",
    yt.map((a) => a.id).join(","),
  );
  check("an asset source is never a destination", dest.listDestinationCandidates(rows, "higgsfield").length === 0);
}
{
  const fbWithIg = account({ id: "fb-ig", provider: "facebook", providerResourceId: "page-1", metadata: { instagramBusinessAccountId: "ig-9" } });
  const fbNoIg = account({ id: "fb-only", provider: "facebook", providerResourceId: "page-2" });
  const ig = dest.listDestinationCandidates([fbWithIg, fbNoIg], "instagram");
  check("Instagram candidates are Facebook Page rows WITH a linked Business account", ig.length === 1 && ig[0].id === "fb-ig");
  check("Facebook candidates include both Pages", dest.listDestinationCandidates([fbWithIg, fbNoIg], "facebook").length === 2);
  check("the Instagram publish identity is the Business account id, not the Page id", dest.providerResourceIdFor(fbWithIg, "instagram") === "ig-9");
  check("the Facebook publish identity is the Page id", dest.providerResourceIdFor(fbWithIg, "facebook") === "page-1");
}
{
  const one = dest.decideDestination({ provider: "youtube", candidates: [account()], explicitAccountId: null });
  check("exactly one eligible account is the destination", one.ok && one.account.id === "acct-1");

  const none = dest.decideDestination({ provider: "youtube", candidates: [], explicitAccountId: null });
  check("no eligible account refuses and says to connect one", !none.ok && /Connect one/.test(none.error), none.error);

  const two = dest.decideDestination({
    provider: "youtube",
    candidates: [account(), account({ id: "acct-2" })],
    explicitAccountId: null,
  });
  check("two eligible accounts with none named REFUSE — never a guess", !two.ok && /needs a destination/.test(two.error), two.error);

  const named = dest.decideDestination({
    provider: "youtube",
    candidates: [account(), account({ id: "acct-2" })],
    explicitAccountId: "acct-2",
  });
  check("a named eligible account is chosen", named.ok && named.account.id === "acct-2");

  const stranger = dest.decideDestination({
    provider: "youtube",
    candidates: [account()],
    explicitAccountId: "acct-stranger",
  });
  check("a named account that is NOT eligible is refused, not substituted", !stranger.ok, stranger.error);
}

/* ---------------------------------------------------------------- pauses */
console.log("\nThe per-channel pause");

{
  const row = { publishingPaused: true, publishingPausedReason: "  rotating keys  ", metadata: {} };
  const v = chan.decidePublishingPause(row, "facebook");
  check("a row-level pause pauses every provider through the row", v.paused && v.reason === "rotating keys");
  check("a row-level pause also pauses Instagram through that Page", chan.decidePublishingPause(row, "instagram").paused);
}
{
  const row = { publishingPaused: false, metadata: { publishingPausedProviders: { instagram: "IG review" } } };
  check("an Instagram-only pause pauses Instagram", chan.decidePublishingPause(row, "instagram").paused);
  check("…and leaves Facebook running on the same Page row", !chan.decidePublishingPause(row, "facebook").paused);
  check("…and the row-only judgement (null provider) is not paused", !chan.decidePublishingPause(row, null).paused);
  check("the reason travels", chan.decidePublishingPause(row, "instagram").reason === "IG review");
}
check(
  "garbage in the metadata key reads as not paused",
  !chan.decidePublishingPause({ publishingPaused: false, metadata: { publishingPausedProviders: ["instagram"] } }, "instagram").paused,
);
{
  const facts = chan.toMarketingChannelAccountFacts(
    { status: "connected", publishCapability: "direct", publishingPaused: false, metadata: { publishingPausedProviders: { instagram: "" } } },
    "instagram",
  );
  check("facts built FOR instagram carry the pause", facts.publishingPaused === true);
  const fbFacts = chan.toMarketingChannelAccountFacts(
    { status: "connected", publishCapability: "direct", publishingPaused: false, metadata: { publishingPausedProviders: { instagram: "" } } },
    "facebook",
  );
  check("facts built FOR facebook on the same row do not", fbFacts.publishingPaused === false);

  const refusal = gate.assertConnectionReady({
    provider: "instagram",
    integrationKind: "publisher",
    channelState: "DIRECT_PUBLISH_READY",
    jobApprovedAt: "2026-10-25T10:00:00.000Z",
    account: facts,
    env: { MARKETING_PUBLISH_MODE: "live" },
  });
  check("the gate refuses a paused Instagram that is otherwise ready", typeof refusal === "string" && /paused/.test(refusal), refusal);
  check(
    "the gate passes the same Page for Facebook",
    gate.assertConnectionReady({
      provider: "facebook",
      integrationKind: "publisher",
      channelState: "DIRECT_PUBLISH_READY",
      jobApprovedAt: "2026-10-25T10:00:00.000Z",
      account: fbFacts,
      env: { MARKETING_PUBLISH_MODE: "live" },
    }) === null,
  );
}

/* ---------------------------------------------------------- auto-approve */
console.log("\nThe auto-approval policy");

check("unset is OFF", policy.parseAutoApproveSources({}).sources.length === 0);
check("empty is OFF", policy.parseAutoApproveSources({ MARKETING_AUTO_APPROVE_SOURCES: "  " }).sources.length === 0);
check("isAutoApproveEnabled is false by default", policy.isAutoApproveEnabled({}) === false);
{
  const parsed = policy.parseAutoApproveSources({ MARKETING_AUTO_APPROVE_SOURCES: "agent_daily_reel, agent_daily_reel ,bogus,Manual" });
  check("known names are accepted once", parsed.sources.join(",") === "agent_daily_reel", parsed.sources.join(","));
  check("unknown and wrong-case names are rejected, not dropped silently", parsed.rejected.join(",") === "bogus,Manual", parsed.rejected.join(","));
}
{
  const ok = { status: "draft", sourceType: "agent_daily_reel", videoMediaAssetId: "m1", renderQa: { state: "PASS" } };
  const on = ["agent_daily_reel"];
  check("a draft reel with a video and PASS QA is eligible", policy.decideAutoApprove(ok, on).eligible === true);
  check("policy off => nothing is eligible", policy.decideAutoApprove(ok, []).eligible === false);
  check("a source not in the list is refused", policy.decideAutoApprove({ ...ok, sourceType: "manual" }, on).eligible === false);
  check("a post a human already moved out of draft is left alone", policy.decideAutoApprove({ ...ok, status: "ready" }, on).eligible === false);
  check("no stored video => refused", policy.decideAutoApprove({ ...ok, videoMediaAssetId: null }, on).eligible === false);
  check("QA FAIL => refused", policy.decideAutoApprove({ ...ok, renderQa: { state: "FAIL" } }, on).eligible === false);
  check("QA never measured => refused", policy.decideAutoApprove({ ...ok, renderQa: undefined }, on).eligible === false);
}
check("the policy literal is namespaced", policy.AUTO_APPROVE_POLICY === "policy:auto-approve");
check(
  "the next slot before today's run is today's run",
  policy.nextPublishSlot("2026-10-25T09:00:00.000Z") === "2026-10-25T18:00:00.000Z",
  policy.nextPublishSlot("2026-10-25T09:00:00.000Z"),
);
check(
  "the next slot AT the run is tomorrow's run (a promoted draft waits a day)",
  policy.nextPublishSlot("2026-10-25T18:00:00.000Z") === "2026-10-26T18:00:00.000Z",
  policy.nextPublishSlot("2026-10-25T18:00:00.000Z"),
);

/* ------------------------------------------------------------ the wiring */
console.log("\nThe wiring (source read as text)");

const legacy = readFileSync("app/actions/marketing-publish.ts", "utf8");
check(
  "the legacy Meta actions check the kill switch first in assertPublishPrerequisites",
  /function assertPublishPrerequisites\([^)]*\)[^{]*\{\s*const modeRefusal = assertPublishModeLive\(/.test(legacy),
);
check(
  "every legacy action names its provider to the prerequisite check",
  (legacy.match(/assertPublishPrerequisites\("(Facebook|Instagram)"\)/g) ?? []).length === 4 &&
    !/assertPublishPrerequisites\(\)/.test(legacy),
);
check("the legacy Page loader honours the pause", /decidePublishingPause\(account, input\.publishingAs\)/.test(legacy));

const hq = readFileSync("app/actions/marketing-ai-hq.ts", "utf8");
check(
  "the HQ Facebook action checks the switch BEFORE converting the item",
  hq.indexOf("assertPublishModeLive(") > 0 && hq.indexOf("assertPublishModeLive(") < hq.indexOf("convertMarketingItemToPostAction(item.id)"),
);

const cron = readFileSync("app/api/cron/marketing-publish/route.ts", "utf8");
check("the publisher leases nothing unless the mode is live", /if \(mode === "live"\) \{\s*const jobs = await listLeasablePublishJobs/.test(cron));
check("the publisher refuses a job with no destination", /if \(!job\.connectedAccountId\)/.test(cron));
check("the publisher publishes only through dispatchPublish", (cron.match(/dispatchPublish\(/g) ?? []).length === 1 && !/publishFacebookPageReel|publishInstagramReel|youtubeAdapter/.test(cron));
check("the publisher settles through decideJobOutcome", /decideJobOutcome\(/.test(cron));
check("a policy approval is written as a policy, never as a person", /approver: \{ kind: "policy", policy: AUTO_APPROVE_POLICY \}/.test(cron) && /decidedByUserId: null/.test(cron));

const today = readFileSync("shared/components/marketing-hub/MarketingTodayView.tsx", "utf8");
check("Today approves through the destination-carrying action", /approveMarketingPostForDistributionAction\(/.test(today) && !/updateMarketingPostAction/.test(today));

const approval = readFileSync("app/actions/marketing-publish-approval.ts", "utf8");
check("approval requires owner/admin", /hasCompanyRole\(context\.role, \["owner", "admin"\]\)/.test(approval));
check("approval records the APPROVED decision", /decision: "APPROVED"/.test(approval));

const vercel = JSON.parse(readFileSync("vercel.json", "utf8"));
check("the publisher cron is scheduled daily at 18:00 UTC", vercel.crons.some((c) => c.path === "/api/cron/marketing-publish" && c.schedule === "0 18 * * *"));

console.log(failures === 0 ? "\nAll publish-approval checks passed." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
