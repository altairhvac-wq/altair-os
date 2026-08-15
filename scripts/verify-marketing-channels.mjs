/**
 * Focused tests for the direct-publishing channel foundation.
 *
 * Covers the two pure modules that decide (a) what state a channel is in and
 * (b) exactly what bytes we would send a provider. Both are pure, so this
 * runs with no database, no network, no credentials — and **cannot publish
 * anything**, which is the property that makes it safe to run in a loop.
 *
 * Run: node scripts/verify-marketing-channels.mjs
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
  const dir = mkdtempSync(join(tmpdir(), "chan-"));
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

const conn = await loadTs("shared/types/marketing-channel-connection.ts");
const req = await loadTs("lib/integrations/channel-publish-requests.ts");

const NOW = "2026-08-15T12:00:00.000Z";
const base = {
  status: "connected",
  publishCapability: "direct",
  tokenExpiresAt: "2026-09-01T00:00:00.000Z",
  hasRefreshToken: true,
  lastError: null,
  capabilityDetail: null,
  accountName: "Altair HVAC",
  resourceName: null,
};
const derive = (over = {}, extra = {}) =>
  conn.deriveMarketingChannelState({
    configured: true,
    account: { ...base, ...over },
    nowIso: NOW,
    ...extra,
  });

console.log("\nChannel state machine");

check("unconfigured deployment reports NOT_CONFIGURED",
  conn.deriveMarketingChannelState({ configured: false, account: null, nowIso: NOW }) === "NOT_CONFIGURED");
check("configured but no account reports NOT_CONNECTED",
  conn.deriveMarketingChannelState({ configured: true, account: null, nowIso: NOW }) === "NOT_CONNECTED");
check("authorize in flight reports CONNECTING",
  conn.deriveMarketingChannelState({ configured: true, account: null, nowIso: NOW, authorizeInFlight: true }) === "CONNECTING");
check("healthy direct connection reports DIRECT_PUBLISH_READY",
  derive() === "DIRECT_PUBLISH_READY");
check("draft-only capability reports DRAFT_UPLOAD_ONLY (TikTok pre-review)",
  derive({ publishCapability: "draft_only" }) === "DRAFT_UPLOAD_ONLY");
check("no capability reports API_ACCESS_REQUIRED (Google Business without quota)",
  derive({ publishCapability: "none" }) === "API_ACCESS_REQUIRED");
check("provider error reports ERROR", derive({ status: "error" }) === "ERROR");
check("disconnected account reports NOT_CONNECTED",
  derive({ status: "disconnected" }) === "NOT_CONNECTED");

// Expiry is derived from time, not from a status someone remembered to write.
check("a token past expiry reports TOKEN_EXPIRED even while status says connected",
  derive({ tokenExpiresAt: "2026-08-15T11:59:00.000Z" }) === "TOKEN_EXPIRED");
check("expired WITHOUT a refresh token escalates to REAUTH_REQUIRED",
  derive({ tokenExpiresAt: "2026-08-15T11:59:00.000Z", hasRefreshToken: false }) === "REAUTH_REQUIRED");
check("an unknown expiry is NOT treated as expired",
  derive({ tokenExpiresAt: null }) === "DIRECT_PUBLISH_READY");

// Ordering: a dead token must not be reported as a missing API grant, or the
// operator is sent to a developer console to fix something that isn't broken.
check("expiry is evaluated BEFORE capability",
  derive({ tokenExpiresAt: "2026-08-15T11:00:00.000Z", publishCapability: "none" }) === "TOKEN_EXPIRED");

console.log("\nThe content gate");
const accepted = conn.MARKETING_CHANNEL_STATES.filter((s) => conn.canAcceptContent(s));
check("exactly two states may receive content",
  accepted.join(",") === "DRAFT_UPLOAD_ONLY,DIRECT_PUBLISH_READY", accepted);
check("ERROR cannot receive content", !conn.canAcceptContent("ERROR"));
check("TOKEN_EXPIRED cannot receive content", !conn.canAcceptContent("TOKEN_EXPIRED"));
check("API_ACCESS_REQUIRED cannot receive content", !conn.canAcceptContent("API_ACCESS_REQUIRED"));
check("only DIRECT_PUBLISH_READY publishes immediately",
  conn.publishesImmediately("DIRECT_PUBLISH_READY") && !conn.publishesImmediately("DRAFT_UPLOAD_ONLY"));
check("every state has operator copy",
  conn.MARKETING_CHANNEL_STATES.every((s) => {
    const text = conn.describeMarketingChannelState(s, conn.MARKETING_CHANNEL_DESCRIPTORS.youtube, null);
    return typeof text === "string" && text.length > 0;
  }));
check("descriptors list env var NAMES only — no values",
  Object.values(conn.MARKETING_CHANNEL_DESCRIPTORS).every((d) =>
    d.requiredEnvVars.every((v) => /^[A-Z0-9_]+$/.test(v))));

console.log("\nYouTube upload request");
const yt = req.buildYouTubeUploadInitRequest({
  accessToken: "TOKEN-SECRET", title: "T".repeat(200),
  description: "D", tags: ["hvac", "furnace"], contentLengthBytes: 1234,
});
check("targets the resumable upload endpoint", yt.url.includes("uploadType=resumable"));
check("requests snippet and status parts", yt.url.includes("part=snippet%2Cstatus"));
check("declares upload length for the resumable preamble",
  yt.headers["x-upload-content-length"] === "1234");
check("clamps the title to 100 chars", yt.body.snippet.title.length === 100);
check("DEFAULTS TO PRIVATE — a caller bug must not become a public video",
  yt.body.status.privacyStatus === "private");
check("honours an explicit privacy status",
  req.buildYouTubeUploadInitRequest({ accessToken: "x", title: "t", description: "d", contentLengthBytes: 1, privacyStatus: "public" }).body.status.privacyStatus === "public");
check("carries the credential in the Authorization header only",
  yt.headers.authorization === "Bearer TOKEN-SECRET" &&
  !JSON.stringify(yt.body).includes("TOKEN-SECRET") &&
  !yt.url.includes("TOKEN-SECRET"));
check("drops whole tags to stay under the character budget, never truncates one",
  req.clampTagsToBudget(["a".repeat(400), "b".repeat(200)], 500).length === 1);

console.log("\nGoogle Business post request");
const gb = req.buildGoogleBusinessLocalPostRequest({
  accessToken: "GB-SECRET",
  locationResourceName: "accounts/1/locations/2",
  summary: "S".repeat(2000),
  cta: { type: "CALL", url: "https://example.com" },
});
check("posts to the location's localPosts collection",
  gb.url === "https://mybusiness.googleapis.com/v4/accounts/1/locations/2/localPosts");
check("clamps summary to 1500 chars", gb.body.summary.length === 1500);
check("creates a STANDARD post only — never OFFER/EVENT/PRODUCT",
  gb.body.topicType === "STANDARD");
check("includes the call to action", gb.body.callToAction.actionType === "CALL");
check("omits media when none is supplied", gb.body.media === undefined);
check("no credential outside the header", !JSON.stringify(gb.body).includes("GB-SECRET"));

console.log("\nTikTok request");
const direct = req.buildTikTokPublishInitRequest({
  accessToken: "TT", title: "hello", mode: "DIRECT_POST", videoUrl: "https://x/v.mp4",
});
const draft = req.buildTikTokPublishInitRequest({
  accessToken: "TT", title: "hello", mode: "MEDIA_UPLOAD", videoUrl: "https://x/v.mp4",
});
check("direct post uses the publish endpoint", direct.url.endsWith("/post/publish/video/init/"));
check("draft upload uses the INBOX endpoint", draft.url.endsWith("/post/publish/inbox/video/init/"));
check("the two modes are different endpoints, not a flag", direct.url !== draft.url);
check("direct post carries post_info", Boolean(direct.body.post_info));
check("draft upload OMITS post_info — no privacy decision on unpublished content",
  draft.body.post_info === undefined);
check("direct post defaults to the most private setting",
  direct.body.post_info.privacy_level === "SELF_ONLY");
check("pull-from-url source is used when a url is given",
  direct.body.source_info.source === "PULL_FROM_URL");
check("file-upload source is used when only a size is given",
  req.buildTikTokPublishInitRequest({ accessToken: "t", title: "x", mode: "MEDIA_UPLOAD", contentLengthBytes: 99 })
    .body.source_info.source === "FILE_UPLOAD");

console.log("\nLog safety");
const logged = req.describeRequestForLog(yt);
check("the Authorization header is redacted for logs",
  logged.headers.authorization === "[redacted]");
check("no request builder leaks a token into its summary",
  [yt, gb, direct, draft].every((r) => !r.summary.includes("SECRET") && !r.summary.includes("TT")));

console.log(`\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} channel checks passed.`);
if (failures > 0) process.exit(1);
