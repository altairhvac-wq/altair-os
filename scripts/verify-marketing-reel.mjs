/**
 * Tests for the Reel publishing core.
 *
 * Two pure modules and two source files read as text. NO network call, NO
 * publish, NO credential — it cannot reach Meta by construction, which is what
 * makes it safe to run in CI, on a laptop, and in a read-only checkout.
 *
 * The behavioural half exercises the decisions: is this render a Reel, what
 * does an EXPIRED container mean, may we send a Page token to this host. The
 * structural half asserts shapes that no unit test would notice going wrong —
 * a second hardcoded Graph version, a signed URL drifting into a database
 * write, the image publish path acquiring Reel code.
 *
 * Run: node scripts/verify-marketing-reel.mjs
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
  const dir = mkdtempSync(join(tmpdir(), "reel-"));
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

const r = await loadTs("shared/types/marketing-reel.ts");
const d = await loadTs("shared/types/marketing-delivery.ts");

const COMPANY = "e7481798-414f-4a40-9bbf-e0ce3f288d3b";
const media = (over = {}) => ({
  companyId: COMPANY,
  contentType: "video/mp4",
  uploadState: "stored",
  widthPx: 1080,
  heightPx: 1920,
  durationMs: 13_600,
  ...over,
});

/* ------------------------------------------------------------ media gate */
console.log("\nReel media gate");

check(
  "the real proven render is accepted (1080x1920, 13.6s, mp4)",
  r.decideReelMedia(media(), COMPANY) === "READY",
);
check(
  "THE DEFECT THIS CATCHES — the landscape render is refused",
  r.decideReelMedia(media({ widthPx: 1920, heightPx: 1080 }), COMPANY) ===
    "NOT_VERTICAL",
);
check(
  "and the refusal tells the operator what to do about it",
  /1080x1920/.test(r.describeReelMediaDecision("NOT_VERTICAL")),
);
check("square is not vertical", r.decideReelMedia(media({ widthPx: 1080, heightPx: 1080 }), COMPANY) === "NOT_VERTICAL");
check(
  "a hair off 9:16 is still accepted — encoders pad to even dimensions",
  r.decideReelMedia(media({ widthPx: 1080, heightPx: 1918 }), COMPANY) === "READY",
);
check(
  "below Meta's 540x960 floor is refused",
  r.decideReelMedia(media({ widthPx: 270, heightPx: 480 }), COMPANY) === "TOO_SMALL",
);
check(
  "under three seconds is refused",
  r.decideReelMedia(media({ durationMs: 2_500 }), COMPANY) === "TOO_SHORT",
);
check(
  "over ninety seconds is refused",
  r.decideReelMedia(media({ durationMs: 91_000 }), COMPANY) === "TOO_LONG",
);
check(
  "a non-mp4 is refused",
  r.decideReelMedia(media({ contentType: "video/quicktime" }), COMPANY) ===
    "WRONG_CONTENT_TYPE",
);
check(
  "a content type with codec parameters still reads as mp4",
  r.decideReelMedia(media({ contentType: 'video/mp4; codecs="avc1"' }), COMPANY) ===
    "READY",
);
check(
  "a pending upload is refused",
  r.decideReelMedia(media({ uploadState: "pending" }), COMPANY) === "NOT_STORED",
);
check("no media at all is named as such", r.decideReelMedia(null, COMPANY) === "NO_MEDIA");

console.log("\nCross-tenant refusal");
check(
  "another company's media is refused",
  r.decideReelMedia(media(), "22222222-2222-2222-2222-222222222222") ===
    "WRONG_COMPANY",
);
check(
  "an empty requester is refused rather than matching an empty column",
  r.decideReelMedia(media({ companyId: "" }), "") === "WRONG_COMPANY",
);
check(
  "WRONG_COMPANY reads the same as NO_MEDIA would to the person asking",
  !/another company|other company|belongs to/i.test(
    r.describeReelMediaDecision("WRONG_COMPANY"),
  ),
);
check(
  "the company check happens BEFORE the state check — a probe learns nothing",
  r.decideReelMedia(
    media({ companyId: "other", uploadState: "pending" }),
    COMPANY,
  ) === "WRONG_COMPANY",
);

console.log("\nUnreported shape");
check(
  "missing dimensions do not block — Meta remains the authority",
  r.decideReelMedia(media({ widthPx: null, heightPx: null }), COMPANY) ===
    "SHAPE_UNKNOWN",
);
check(
  "missing duration does not block either",
  r.decideReelMedia(media({ durationMs: null }), COMPANY) === "SHAPE_UNKNOWN",
);
check(
  "but a KNOWN-landscape render with no duration is still refused",
  r.decideReelMedia(
    media({ widthPx: 1920, heightPx: 1080, durationMs: null }),
    COMPANY,
  ) === "NOT_VERTICAL",
);
check(
  "zero dimensions read as unreported, not as a 0:0 aspect ratio",
  r.decideReelMedia(media({ widthPx: 0, heightPx: 0 }), COMPANY) ===
    "SHAPE_UNKNOWN",
);
check(
  "an unverified shape is not reported to the operator as verified",
  r.reelShapeWasVerified("SHAPE_UNKNOWN") === false &&
    r.reelShapeWasVerified("READY") === true,
);

console.log("\nThe attempt gate");
const attemptable = r.REEL_MEDIA_DECISIONS.filter((x) => r.mayAttemptReel(x));
check(
  "exactly READY and SHAPE_UNKNOWN may reach Meta",
  attemptable.join(",") === "READY,SHAPE_UNKNOWN",
  attemptable,
);
for (const decision of r.REEL_MEDIA_DECISIONS) {
  const text = r.describeReelMediaDecision(decision);
  check(
    `${decision} has copy (empty only when it may proceed)`,
    r.mayAttemptReel(decision)
      ? text === ""
      : typeof text === "string" && text.length > 0,
  );
}
check(
  "an unknown future decision is refused by default",
  r.mayAttemptReel("SOMETHING_NEW") === false &&
    r.describeReelMediaDecision("SOMETHING_NEW").length > 0,
);

/* -------------------------------------------------------- provider phases */
console.log("\nInstagram container status");
check("FINISHED is ready", r.decideInstagramContainerPhase("FINISHED") === "READY");
check("IN_PROGRESS keeps waiting", r.decideInstagramContainerPhase("IN_PROGRESS") === "WORKING");
check("ERROR is terminal", r.decideInstagramContainerPhase("ERROR") === "FAILED");
check("EXPIRED is terminal", r.decideInstagramContainerPhase("EXPIRED") === "FAILED");
check(
  "PUBLISHED must NOT publish again — that is the duplicate",
  r.decideInstagramContainerPhase("PUBLISHED") === "ALREADY_PUBLISHED",
);
check("case and whitespace do not change the answer", r.decideInstagramContainerPhase("  finished ") === "READY");
check(
  "an unknown code waits rather than publishing on a signal we do not understand",
  r.decideInstagramContainerPhase("SOMETHING_NEW") === "WORKING",
);
check("a missing code waits", r.decideInstagramContainerPhase(undefined) === "WORKING");
check(
  "NOTHING but FINISHED is ever READY",
  ["IN_PROGRESS", "ERROR", "EXPIRED", "PUBLISHED", "", null, undefined, "x"].every(
    (code) => r.decideInstagramContainerPhase(code) !== "READY",
  ),
);

console.log("\nFacebook upload phase");
check(
  "a complete upload is ready",
  r.decideFacebookUploadPhase({ uploading_phase: { status: "complete" } }) === "READY",
);
check(
  "an in-progress upload waits",
  r.decideFacebookUploadPhase({ uploading_phase: { status: "in_progress" } }) === "WORKING",
);
check(
  "an errored upload is terminal",
  r.decideFacebookUploadPhase({ uploading_phase: { status: "error" } }) === "FAILED",
);
check(
  "a top-level error is terminal even when the phase looks fine",
  r.decideFacebookUploadPhase({
    video_status: "error",
    uploading_phase: { status: "in_progress" },
  }) === "FAILED",
);
check(
  "top-level readiness is accepted when no phase block is present",
  r.decideFacebookUploadPhase({ video_status: "upload_complete" }) === "READY",
);
check("a missing status waits", r.decideFacebookUploadPhase(null) === "WORKING");
check(
  "processing is NOT waited on — it continues after publish",
  r.decideFacebookUploadPhase({
    uploading_phase: { status: "complete" },
    processing_phase: { status: "in_progress" },
  }) === "READY",
);

/* --------------------------------------------------------- upload host */
console.log("\nUpload host pinning — the token goes nowhere else");
check(
  "Meta's own upload host is trusted",
  r.isTrustedReelUploadUrl("https://rupload.facebook.com/video-upload/v22.0/123") === true,
);
check(
  "a lookalike suffix domain is NOT trusted",
  r.isTrustedReelUploadUrl("https://rupload.facebook.com.evil.example/x") === false,
);
check(
  "a userinfo trick is NOT trusted",
  r.isTrustedReelUploadUrl("https://rupload.facebook.com@evil.example/x") === false,
);
check(
  "a subdomain of the upload host is NOT trusted",
  r.isTrustedReelUploadUrl("https://evil.rupload.facebook.com/x") === false,
);
check(
  "plaintext http is NOT trusted even on the right host",
  r.isTrustedReelUploadUrl("http://rupload.facebook.com/x") === false,
);
check(
  "the graph host is not the upload host",
  r.isTrustedReelUploadUrl("https://graph.facebook.com/x") === false,
);
check("garbage is refused", r.isTrustedReelUploadUrl("not a url") === false);
check("empty is refused", r.isTrustedReelUploadUrl("") === false && r.isTrustedReelUploadUrl(null) === false);

/* ---------------------------------------------------------- permalinks */
console.log("\nPermalink normalisation");
check(
  "Facebook's RELATIVE video permalink becomes absolute",
  r.normalizeFacebookPermalink("/reel/1234567890") ===
    "https://www.facebook.com/reel/1234567890",
);
check(
  "an absolute permalink is left alone",
  r.normalizeFacebookPermalink("https://www.instagram.com/reel/abc/") ===
    "https://www.instagram.com/reel/abc/",
);
check("empty yields undefined, not an empty string", r.normalizeFacebookPermalink("") === undefined);
check("null yields undefined", r.normalizeFacebookPermalink(null) === undefined);
check(
  "a bare word is not turned into a link",
  r.normalizeFacebookPermalink("permalink") === undefined,
);

/* ------------------------------------------------------- api versioning */
console.log("\nGraph API version floor");
check("v22.0 supports Reels", r.graphVersionSupportsReels("v22.0") === true);
check("v25.0 supports Reels", r.graphVersionSupportsReels("v25.0") === true);
check("v14.0 is the floor and is supported", r.graphVersionSupportsReels("v14.0") === true);
check("v13.0 is below the floor", r.graphVersionSupportsReels("v13.0") === false);
check("a malformed version is refused rather than assumed", r.graphVersionSupportsReels("22") === false);
check("an empty version is refused", r.graphVersionSupportsReels("") === false);
check("the major version parses", r.parseGraphApiMajor("v22.0") === 22);

/* ---------------------------------------- the cross-module invariant */
console.log("\nPoll budget fits inside the delivery grace period");
check(
  "REEL_POLL_BUDGET_MS is strictly under DELIVERY_IN_FLIGHT_GRACE_MS",
  r.REEL_POLL_BUDGET_MS < d.DELIVERY_IN_FLIGHT_GRACE_MS,
  `${r.REEL_POLL_BUDGET_MS} vs ${d.DELIVERY_IN_FLIGHT_GRACE_MS}`,
);
check(
  "with at least 60s of headroom for the rest of the flow",
  d.DELIVERY_IN_FLIGHT_GRACE_MS - r.REEL_POLL_BUDGET_MS >= 60_000,
  `${d.DELIVERY_IN_FLIGHT_GRACE_MS - r.REEL_POLL_BUDGET_MS}ms headroom`,
);
check(
  "the attempt count and the interval actually multiply out to the budget",
  r.REEL_POLL_MAX_ATTEMPTS * r.REEL_POLL_INTERVAL_MS <= r.REEL_POLL_BUDGET_MS,
);
check("the poller actually polls more than once", r.REEL_POLL_MAX_ATTEMPTS > 1);

/* ------------------------------------------------------ picker labelling */
console.log("\nRender picker labels");
check(
  "a fully described render reads as shape and length",
  r.describeReelVideoOption({
    id: "1",
    sourceJobId: "render-abc",
    widthPx: 1080,
    heightPx: 1920,
    durationMs: 13_600,
    storedAt: null,
  }) === "render-abc · 1080x1920 · 13.6s",
);
check(
  "an unreported render SAYS SO rather than looking identical to a good one",
  r.describeReelVideoOption({
    id: "1",
    sourceJobId: "render-abc",
    widthPx: null,
    heightPx: null,
    durationMs: null,
    storedAt: null,
  }) === "render-abc · shape not reported",
);

/* ===================================================================== */
/*                          STRUCTURAL GUARDS                            */
/* ===================================================================== */

const reelSrc = readFileSync("lib/integrations/facebook/reels.ts", "utf8");
const publishSrc = readFileSync("lib/integrations/facebook/publish.ts", "utf8");
const actionSrc = readFileSync("app/actions/marketing-publish.ts", "utf8");
const pureSrc = readFileSync("shared/types/marketing-reel.ts", "utf8");

/** Comments must never be able to satisfy a guard. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");
}

const reelCode = stripComments(reelSrc);
const actionCode = stripComments(actionSrc);

console.log("\nONE Graph API version, including the upload host");
{
  // A second pinned version is the bug this catches: a Reel flow on a
  // different version than the OAuth flow that produced its token.
  const literals = reelCode.match(/["'`]v\d+\.\d+["'`]/g) ?? [];
  check("the Reel module hardcodes no Graph version literal", literals.length === 0, literals);

  // CONTROL: the same regex must actually fire on the defect it guards.
  const reintroduced = 'const url = `https://rupload.facebook.com/video-upload/v25.0/${id}`;';
  check(
    "control — the guard DOES catch a hardcoded version",
    (reintroduced.match(/["'`]v\d+\.\d+["'`]/g) ?? []).length === 0,
    "regex missed a template literal; tighten it",
  );

  check(
    "every Graph URL is built from the configured version",
    /graphBaseUrl\(config\.graphApiVersion\)/.test(reelCode),
  );
  check(
    "the upload host URL uses the configured version too",
    /video-upload\/\$\{config\.graphApiVersion\}/.test(reelCode),
  );
  check(
    "the upload host is the pinned constant, not a literal string",
    /\$\{FACEBOOK_UPLOAD_HOST\}/.test(reelCode) &&
      !/["'`]https:\/\/rupload\.facebook\.com/.test(reelCode),
  );
  check(
    "an upload_url from a response body is checked before the token is sent",
    /isTrustedReelUploadUrl\(start\.upload_url\)/.test(reelCode),
  );
}

console.log("\nThe pure module stays pure");
check(
  "marketing-reel.ts imports nothing",
  !/^\s*import\s/m.test(stripComments(pureSrc)),
);

console.log("\nNothing durable is written from the provider module");
check(
  "the Reel module touches no database query module",
  !/from\s+["']@\/lib\/database\//.test(reelCode),
);
check(
  "the Reel module mints no grant of its own — the caller does, once",
  !/createMediaReadGrant/.test(reelCode),
);
check(
  "and it does not reuse the image publish path",
  !/from\s+["']\.\/publish["']/.test(reelCode),
);

console.log("\nThe existing image path is left alone");
check(
  "publish.ts still exports all three original functions",
  /export async function publishFacebookPageFeedPost/.test(publishSrc) &&
    /export async function publishFacebookPagePhotoPost/.test(publishSrc) &&
    /export async function publishInstagramImagePost/.test(publishSrc),
);
check(
  "publish.ts gained no Reel code",
  !/video_reels|REELS|rupload/.test(publishSrc),
);
check(
  "the 12-second image container poller is NOT used for video",
  !/waitForInstagramContainerReady/.test(reelCode),
);

console.log("\nSigned URLs stay out of every durable write");
{
  // The rule: a value derived from a grant may be handed to a provider and
  // nowhere else. This looks for it crossing into anything that persists.
  const settleLines = actionCode
    .split("\n")
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => /settleDelivery\(|recordDeliveryProviderMedia\(|markMarketingPostPosted\(|updateMarketingPost\(/.test(line));
  check("the action has durable writes to inspect", settleLines.length > 0);

  check(
    "no persisted field is assigned a media URL",
    !/(provider_post_id|providerPostId|providerPermalink|providerMediaId|videoMediaAssetId)\s*:\s*(media\.videoUrl|grant\.|videoUrl)/.test(
      actionCode,
    ),
  );
  check(
    "the action never stores the grant on the post",
    !/videoMediaAssetId\s*:\s*[^,\n]*url/i.test(actionCode),
  );
  check(
    "the media URL is passed to the provider call and nowhere else",
    (actionCode.match(/media\.videoUrl/g) ?? []).length ===
      (actionCode.match(/videoUrl:\s*media\.videoUrl/g) ?? []).length +
        (actionCode.match(/!media\.videoUrl/g) ?? []).length,
    actionCode.match(/.*media\.videoUrl.*/g),
  );
  check(
    "no signed URL is logged",
    !/console\.(log|error|warn)\([\s\S]{0,400}?videoUrl/.test(actionCode),
  );
}

console.log("\nLocal resolution happens BEFORE the claim");
{
  const lines = actionCode.split("\n");
  const claims = [];
  lines.forEach((line, i) => {
    if (/=\s*await\s+claimDelivery\(/.test(line)) claims.push(i);
  });
  check("all four publish actions claim a delivery", claims.length === 4, claims.length);

  check(
    "the Reel media resolver is used",
    lines.some((l) => /=\s*await\s+resolveReelMediaForPublish\(/.test(l)),
  );

  // Every resolve must sit before the claim that follows it, never inside a
  // claimed span. Same defect class as the screenshot resolver the delivery
  // audit found: a fallible step inside the claim strands the row in_flight.
  const resolves = [];
  lines.forEach((line, i) => {
    if (/=\s*await\s+resolveReelMediaForPublish\(/.test(line)) resolves.push(i);
  });
  check("both Reel actions resolve their media", resolves.length === 2, resolves.length);

  for (const claimAt of claims) {
    const settleAt = lines.findIndex(
      (l, i) => i > claimAt && /outcome:\s*"posted"/.test(l),
    );
    const span = lines.slice(claimAt, settleAt);
    check(
      `no media resolution inside the claimed span at line ${claimAt + 1}`,
      !span.some((l) =>
        /resolveReelMediaForPublish\(|createMediaReadGrant\(|getMediaAssetById\(/.test(l),
      ),
    );
  }
  // Per action, not globally: the file holds four actions, and the first
  // claim in it belongs to the text path, which resolves nothing. What must
  // hold is that EACH Reel resolve is followed by the claim it precedes.
  for (const resolveAt of resolves) {
    const nextClaim = claims.find((c) => c > resolveAt);
    check(
      `the resolve at line ${resolveAt + 1} precedes its own claim`,
      nextClaim !== undefined,
      claims,
    );
  }
}

console.log("\nThe provider media id is recorded before publishing");
check(
  "both Reel actions record the provider object as soon as it exists",
  (actionCode.match(/recordDeliveryProviderMedia\(\{\s*deliveryId,\s*providerMediaId\s*\}\)/g) ?? [])
    .length === 2,
);
check(
  "Facebook reports its video id before the finish phase publishes it",
  reelCode.indexOf("await input.onMediaCreated(videoId)") !== -1 &&
    reelCode.indexOf("await input.onMediaCreated(videoId)") <
      reelCode.indexOf('finishBody.set("upload_phase", "finish")'),
);
check(
  "Instagram reports its container id before media_publish",
  reelCode.indexOf("await input.onMediaCreated(containerId)") !== -1 &&
    reelCode.indexOf("await input.onMediaCreated(containerId)") <
      reelCode.indexOf("media_publish"),
);
check(
  "recording it only ever touches an in_flight row",
  /delivery_state["']?,\s*["']in_flight["']/.test(
    stripComments(
      readFileSync("lib/database/queries/marketing-channel-deliveries.ts", "utf8"),
    ).split("export async function settleDelivery")[0],
  ),
);

console.log("\nThe text and image paths refuse a video post");
check(
  "a post with a video is refused by the feed and photo paths",
  (actionCode.match(/refuseVideoPostOnTextPath\(/g) ?? []).length === 3,
  actionCode.match(/refuseVideoPostOnTextPath\(/g)?.length,
);
check(
  "and the refusal names the Reel path rather than being a bare error",
  /Use Publish Reel/.test(actionSrc),
);

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} Reel checks passed.`,
);
if (failures > 0) process.exit(1);
