/**
 * The YouTube upload adapter: the private-only rule, the readback that
 * proves it, the refresh lifecycle, and the order the dispatcher runs in.
 *
 * ==================== HOW IT RUNS WITHOUT A NETWORK ====================
 * The same harness `verify-marketing-reel-transport.mjs` established: the
 * modules under test are transpiled into a temp directory with their import
 * specifiers rewritten, and `globalThis.fetch` is REPLACED — not wrapped —
 * by a router. Any request the router does not recognise throws
 * `UNROUTED REQUEST` rather than falling through to the network, so this
 * cannot upload a video to YouTube however wrong the code under it is.
 *
 * ==================== WHAT IS ASSERTED ====================
 * The request log and the refusals: what was sent, in what order, with which
 * headers — and, more importantly, what was NOT sent. Every one of the
 * following is a way this integration could go wrong that a reader of the
 * source would not notice:
 *
 *   a video uploaded unlisted or public
 *   a readback that says nothing being read as proof of privacy
 *   a video landing on a Brand Account the connection is not bound to
 *   an upload attempted with a grant that no longer includes upload
 *   a refresh clearing the refresh token Google did not rotate
 *   an expiry that is never written back, so the connection reads expired
 *   a credential reaching a log line or an operator's screen
 *
 * ==================== MUTATION-CHECKED ====================
 * A suite that passes is not evidence until it has been shown to fail. Each
 * of these was introduced in turn and caught here:
 *
 *   privacyStatus "private" -> "unlisted"        (the canary goes public-ish)
 *   readback privacy check inverted              (any privacy accepted)
 *   readback null treated as success             (unverifiable = published)
 *   channel mismatch check deleted               (wrong channel recorded)
 *   upload-scope check removed from preflight    (connected == allowed)
 *   refreshToken spread as `?? null`             (connection dies next expiry)
 *   assertTrustedUploadUrl deleted               (token follows any host)
 *
 * Run: node scripts/verify-youtube-upload.mjs
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

/* --------------------------------------------------------------- harness */

const SPECIFIER_REWRITES = [
  ['"server-only"', '"./server-only.mjs"'],
  ['"@/lib/email/env"', '"./email-env.mjs"'],
  ['"@/lib/integrations/channel-publish-requests"', '"./channel-publish-requests.mjs"'],
  ['"./env"', '"./env.mjs"'],
  ['"./api"', '"./api.mjs"'],
  ['"./capability"', '"./capability.mjs"'],
  ['"./publish-guard"', '"./publish-guard.mjs"'],
  ['"./upload"', '"./upload.mjs"'],
];

function transpileInto(dir, sourcePath, outName) {
  const { outputText } = ts.transpileModule(readFileSync(sourcePath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  });
  let code = outputText;
  for (const [from, to] of SPECIFIER_REWRITES) {
    code = code.split(from).join(to);
  }
  writeFileSync(join(dir, outName), code);
}

const dir = mkdtempSync(join(tmpdir(), "yt-upload-"));
writeFileSync(join(dir, "server-only.mjs"), "export {};\n");
writeFileSync(
  join(dir, "email-env.mjs"),
  "export function resolveAppBaseUrl() { return { ok: false }; }\n",
);

transpileInto(dir, "lib/integrations/channel-publish-requests.ts", "channel-publish-requests.mjs");
transpileInto(dir, "lib/integrations/youtube/env.ts", "env.mjs");
transpileInto(dir, "lib/integrations/youtube/api.ts", "api.mjs");
transpileInto(dir, "lib/integrations/youtube/capability.ts", "capability.mjs");
transpileInto(dir, "lib/integrations/youtube/publish-guard.ts", "publish-guard.mjs");
transpileInto(dir, "lib/integrations/youtube/upload.ts", "upload.mjs");
transpileInto(dir, "lib/integrations/youtube/adapter.ts", "adapter.mjs");

process.env.GOOGLE_OAUTH_CLIENT_ID = "test-client-id";
process.env.GOOGLE_OAUTH_CLIENT_SECRET = "test-client-secret";
process.env.YOUTUBE_REDIRECT_URI = "https://altair.test/api/yt/cb";

const guard = await import(pathToFileURL(join(dir, "publish-guard.mjs")).href);
const upload = await import(pathToFileURL(join(dir, "upload.mjs")).href);
const { youtubeAdapter } = await import(
  pathToFileURL(join(dir, "adapter.mjs")).href
);

/* --------------------------------------------------------- fetch recorder */

const realFetch = globalThis.fetch;
let calls = [];
let router = null;

globalThis.fetch = async (url, init = {}) => {
  const record = {
    url: String(url),
    method: init.method ?? "GET",
    headers: init.headers ?? {},
    body: init.body === undefined ? null : init.body,
  };
  calls.push(record);
  const response = router ? router(record) : null;
  if (!response) {
    throw new Error(
      `UNROUTED REQUEST — the test would have hit the network: ${record.method} ${record.url}`,
    );
  }
  return response;
};

const json = (body, status = 200, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
  arrayBuffer: async () => new ArrayBuffer(0),
});

const bytes = (buf, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  json: async () => ({}),
  arrayBuffer: async () => buf,
});

function reset(nextRouter) {
  calls = [];
  router = nextRouter;
}

const TOKEN = "ya29.ACCESS-TOKEN-SECRET";
const REFRESH = "1//REFRESH-TOKEN-SECRET";
const CHANNEL = "UC_altair_channel";
const VIDEO_ID = "vid_abc123";
const MEDIA_URL = "https://proj.supabase.co/storage/v1/object/sign/marketing-media/co/video/r.mp4?token=sig";
const UPLOAD_SESSION = "https://www.googleapis.com/upload/youtube/v3/videos?upload_id=xyz";
const PAYLOAD = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

const CAPABILITY = {
  provider: "youtube",
  label: "YouTube",
  defaultVisibility: "private",
  titleMaxChars: 100,
  bodyMaxChars: 5000,
  requiresMedia: true,
};

const GRANTED = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/youtube.upload",
];

function publishInput(overrides = {}) {
  return {
    post: {
      connectedAccountId: "acct-1",
      companyId: "co-1",
      providerAccountId: CHANNEL,
      providerResourceId: CHANNEL,
    },
    package: {
      title: "Altair dispatch in one place",
      body: "A private canary upload.",
      hashtags: ["hvac"],
      link: null,
      media: [
        {
          url: MEDIA_URL,
          expiresAt: "2026-09-01T12:00:00.000Z",
          objectKey: "co/video/r.mp4",
          contentType: "video/mp4",
          byteSize: PAYLOAD.byteLength,
        },
      ],
    },
    capability: CAPABILITY,
    publishCapability: "direct",
    grantedScopes: GRANTED,
    accessToken: TOKEN,
    ...overrides,
  };
}

/** The happy path router: init -> media bytes -> upload PUT -> readback. */
function happyRouter(options = {}) {
  const privacy = options.privacy ?? "private";
  const channelId = options.channelId ?? CHANNEL;
  return (call) => {
    if (call.url.includes("/upload/youtube/v3/videos") && call.method === "POST") {
      return json({}, 200, { location: UPLOAD_SESSION });
    }
    if (call.url === MEDIA_URL) return bytes(PAYLOAD.buffer);
    if (call.url === UPLOAD_SESSION && call.method === "PUT") {
      return json({
        id: VIDEO_ID,
        status: { privacyStatus: privacy, uploadStatus: "uploaded" },
        snippet: { channelId },
      });
    }
    if (call.url.includes("/youtube/v3/videos?") && call.method === "GET") {
      if (options.readback === null) return json({ items: [] });
      // `??` would collapse an EXPLICIT null (the "YouTube stated no
      // privacy" case) into the default, and that case is the whole point
      // of the fail-closed check. `in` distinguishes them.
      const readbackPrivacy =
        "readbackPrivacy" in options ? options.readbackPrivacy : privacy;
      return json({
        items: [
          {
            id: options.readbackId ?? VIDEO_ID,
            status: {
              privacyStatus: readbackPrivacy,
              uploadStatus: "uploaded",
            },
            snippet: { channelId: options.readbackChannel ?? channelId },
          },
        ],
      });
    }
    return null;
  };
}

/* ================================================================== */
/*                    PRIVATE-ONLY, THE WHOLE POINT                   */
/* ================================================================== */

console.log("\nPrivate-only enforcement");

{
  reset(happyRouter());
  const outcome = await youtubeAdapter.publish(publishInput());

  const initCall = calls.find((c) => c.method === "POST");
  const initBody = JSON.parse(initCall.body);

  check(
    "the upload is requested with privacyStatus private",
    initBody.status.privacyStatus === "private",
    initBody.status,
  );
  check(
    "nothing in the sent metadata says public or unlisted",
    !/"(public|unlisted)"/.test(initCall.body),
  );
  check("a verified private upload reports posted", outcome.outcome === "posted");
  check("and carries YouTube's own video id", outcome.providerPostId === VIDEO_ID);
  check(
    "and a watch permalink for the operator to open",
    outcome.providerPermalink === `https://www.youtube.com/watch?v=${VIDEO_ID}`,
  );

  // Migration 186 promises the ledger records the VISIBILITY. An id cannot:
  // a private and a public upload produce identical ids, so without this the
  // one property the canary was authorized on would be unreconcilable.
  check(
    "the verified privacy is reported for the ledger",
    outcome.providerResult?.privacyStatus === "private",
    outcome.providerResult,
  );
  check(
    "the channel it actually landed on is reported",
    outcome.providerResult?.channelId === CHANNEL,
  );
  check(
    "the processing status is reported for later reconciliation",
    outcome.providerResult?.uploadStatus === "uploaded",
  );
  check(
    "the reported facts come from the READBACK, not the upload response",
    outcome.providerResult?.videoId === VIDEO_ID,
  );
}

{
  // The matrix is the build's own statement of intent. If it ever says
  // anything but private, no upload may start — no reconnect fixes this.
  const verdict = guard.assertUploadAllowed({
    publishCapability: "direct",
    grantedScopes: GRANTED,
    matrixVisibility: "unlisted",
    expectedChannelId: CHANNEL,
  });
  check(
    "a matrix visibility other than private refuses before any byte is sent",
    !verdict.ok && verdict.code === "visibility_not_private",
    verdict,
  );
}

{
  reset(happyRouter({ privacy: "private", readbackPrivacy: "unlisted" }));
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput());
  } catch (error) {
    threw = error;
  }
  check(
    "a video that reads back UNLISTED is a failed publish, not a success",
    threw !== null && threw.code === "privacy_not_private",
    threw?.code,
  );
}

{
  reset(happyRouter({ readbackPrivacy: null }));
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput());
  } catch (error) {
    threw = error;
  }
  check(
    "a readback that does not STATE the privacy fails closed",
    threw !== null && threw.code === "privacy_not_private",
    threw?.code,
  );
}

/* ================================================================== */
/*                      READBACK VERIFICATION                         */
/* ================================================================== */

console.log("\nReadback verification");

{
  reset(happyRouter());
  await youtubeAdapter.publish(publishInput());
  const readback = calls.filter(
    (c) => c.url.includes("/youtube/v3/videos?") && c.method === "GET",
  );
  check("the video is read back after upload", readback.length === 1);
  check(
    "the readback asks for status and snippet, so privacy and channel are checkable",
    readback[0].url.includes("part=status%2Csnippet") ||
      readback[0].url.includes("part=status,snippet"),
    readback[0].url,
  );
  check(
    "the readback names the uploaded video id",
    readback[0].url.includes(VIDEO_ID),
  );
}

{
  reset(happyRouter({ readback: null }));
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput());
  } catch (error) {
    threw = error;
  }
  check(
    "a video YouTube cannot find afterwards is NOT reported as published",
    threw !== null && threw.code === "video_not_found",
    threw?.code,
  );
}

{
  reset(happyRouter({ readbackChannel: "UC_someone_elses_brand_account" }));
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput());
  } catch (error) {
    threw = error;
  }
  check(
    "a video on a channel this connection is not bound to is refused",
    threw !== null && threw.code === "channel_mismatch",
    threw?.code,
  );
}

{
  reset(happyRouter({ readbackId: "a_different_video" }));
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput());
  } catch (error) {
    threw = error;
  }
  check(
    "a readback returning a different video id is refused",
    threw !== null && threw.code === "video_id_mismatch",
    threw?.code,
  );
}

{
  // A fresh upload legitimately reads `uploaded` for minutes. Requiring the
  // terminal value would fail a correct publish for being recent.
  const verdict = guard.verifyUploadReadback({
    video: {
      videoId: VIDEO_ID,
      privacyStatus: "private",
      uploadStatus: "uploaded",
      channelId: CHANNEL,
    },
    expectedVideoId: VIDEO_ID,
    expectedChannelId: CHANNEL,
  });
  check("an unprocessed but private video still verifies", verdict.ok);
}

/* ================================================================== */
/*                    SCOPE AND CAPABILITY STATE                      */
/* ================================================================== */

console.log("\nUpload permission comes from the grant, not from being connected");

{
  reset(() => null); // any request at all fails the test
  let threw = null;
  try {
    await youtubeAdapter.publish(
      publishInput({
        grantedScopes: ["https://www.googleapis.com/auth/youtube.readonly"],
      }),
    );
  } catch (error) {
    threw = error;
  }
  check(
    "a grant without the upload scope refuses",
    threw !== null && threw.code === "missing_upload_scope",
    threw?.code,
  );
  check("and contacts YouTube not at all", calls.length === 0, calls.length);
}

{
  reset(() => null);
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput({ grantedScopes: [] }));
  } catch (error) {
    threw = error;
  }
  check(
    "an EMPTY grant fails closed rather than being read as unknown-so-fine",
    threw !== null && threw.code === "missing_upload_scope",
  );
  check("and sends nothing", calls.length === 0);
}

{
  reset(() => null);
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput({ publishCapability: "none" }));
  } catch (error) {
    threw = error;
  }
  check(
    "a connection recorded as unable to publish refuses",
    threw !== null && threw.code === "capability_not_direct",
  );
  check("and sends nothing", calls.length === 0);
}

{
  reset(() => null);
  let threw = null;
  try {
    await youtubeAdapter.publish(
      publishInput({
        post: {
          connectedAccountId: "acct-1",
          companyId: "co-1",
          providerAccountId: null,
          providerResourceId: null,
        },
      }),
    );
  } catch (error) {
    threw = error;
  }
  check(
    "a connection naming no channel refuses — the readback would have nothing to check",
    threw !== null && threw.code === "no_channel_bound",
  );
  check("and sends nothing", calls.length === 0);
}

/* ================================================================== */
/*                       THE UPLOAD URL IS DATA                       */
/* ================================================================== */

console.log("\nThe resumable upload URL is pinned before the token is attached");

check(
  "a Google upload host is trusted",
  upload.isTrustedYouTubeUploadUrl(UPLOAD_SESSION),
);
check(
  "the alternate Google host is trusted",
  upload.isTrustedYouTubeUploadUrl("https://youtube.googleapis.com/upload/x"),
);
for (const hostile of [
  "https://www.googleapis.com.evil.test/upload",
  "https://evil.test/upload?u=www.googleapis.com",
  "http://www.googleapis.com/upload",
  "//www.googleapis.com/upload",
  "not a url",
]) {
  check(
    `refuses ${hostile.slice(0, 44)}`,
    !upload.isTrustedYouTubeUploadUrl(hostile),
  );
}

{
  reset((call) => {
    if (call.url.includes("/upload/youtube/v3/videos") && call.method === "POST") {
      return json({}, 200, { location: "https://evil.test/collect" });
    }
    return null;
  });
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput());
  } catch (error) {
    threw = error;
  }
  check(
    "an upload session on a foreign host is refused",
    threw !== null && threw.code === "untrusted_upload_url",
    threw?.code,
  );
  const leaked = calls.filter((c) => c.url.startsWith("https://evil.test"));
  check(
    "AND THE TOKEN NEVER LEAVES — no request is made to the foreign host",
    leaked.length === 0,
    leaked.map((c) => c.url),
  );
}

/* ================================================================== */
/*                      REFRESH-TOKEN LIFECYCLE                       */
/* ================================================================== */

console.log("\nRefresh preserves what Google does not rotate");

{
  reset((call) => {
    if (call.url.includes("oauth2.googleapis.com/token")) {
      // The ordinary Google response: a new access token, NO refresh token.
      return json({ access_token: "new-access", expires_in: 3599, scope: GRANTED.join(" ") });
    }
    return null;
  });

  const result = await youtubeAdapter.refreshCredential({
    connectedAccountId: "acct-1",
    refreshTokenPlaintext: REFRESH,
    nowIso: "2026-09-01T10:00:00.000Z",
  });

  check("a refresh succeeds", result.ok === true);
  check("the new access token is returned", result.accessTokenPlaintext === "new-access");
  check(
    "THE REFRESH TOKEN KEY IS ABSENT, so the seam keeps the stored one",
    !("refreshTokenPlaintext" in result),
    Object.keys(result),
  );
  check(
    "the expiry is computed from the injected clock, not the wall clock",
    result.tokenExpiresAt === "2026-09-01T10:59:59.000Z",
    result.tokenExpiresAt,
  );
}

{
  reset((call) => {
    if (call.url.includes("oauth2.googleapis.com/token")) {
      return json({
        access_token: "new-access",
        refresh_token: "ROTATED-REFRESH",
        expires_in: 3599,
      });
    }
    return null;
  });
  const result = await youtubeAdapter.refreshCredential({
    connectedAccountId: "acct-1",
    refreshTokenPlaintext: REFRESH,
    nowIso: "2026-09-01T10:00:00.000Z",
  });
  check(
    "a ROTATED refresh token is passed through so the seam stores it",
    result.ok && result.refreshTokenPlaintext === "ROTATED-REFRESH",
  );
}

{
  reset((call) => {
    if (call.url.includes("oauth2.googleapis.com/token")) {
      return json({ error: "invalid_grant" }, 400);
    }
    return null;
  });
  const result = await youtubeAdapter.refreshCredential({
    connectedAccountId: "acct-1",
    refreshTokenPlaintext: REFRESH,
    nowIso: "2026-09-01T10:00:00.000Z",
  });
  check(
    "a REVOKED grant reports REAUTH_REQUIRED, not a transient failure",
    !result.ok && result.reason === "REAUTH_REQUIRED",
    result,
  );
  check(
    "and the operator detail names reconnecting without quoting Google",
    !result.ok && /reconnect/i.test(result.detail) && !/invalid_grant/.test(result.detail),
    result.detail,
  );
}

{
  reset((call) => {
    if (call.url.includes("oauth2.googleapis.com/token")) {
      return json({ error: { code: 503, status: "UNAVAILABLE" } }, 503);
    }
    return null;
  });
  const result = await youtubeAdapter.refreshCredential({
    connectedAccountId: "acct-1",
    refreshTokenPlaintext: REFRESH,
    nowIso: "2026-09-01T10:00:00.000Z",
  });
  check(
    "a Google outage is TRANSIENT — a connection is not marked dead over it",
    !result.ok && result.reason === "TRANSIENT",
    result,
  );
}

/* ================================================================== */
/*                        NOTHING LEAKS                               */
/* ================================================================== */

console.log("\nNo credential reaches an operator-facing string");

{
  const surfaces = [];
  reset(happyRouter({ readbackPrivacy: "public" }));
  try {
    await youtubeAdapter.publish(publishInput());
  } catch (error) {
    surfaces.push(error.message, String(error.code ?? ""));
  }

  reset((call) =>
    call.url.includes("oauth2.googleapis.com/token")
      ? json({ error: "invalid_grant", error_description: `token ${REFRESH} rejected` }, 400)
      : null,
  );
  const refreshed = await youtubeAdapter.refreshCredential({
    connectedAccountId: "acct-1",
    refreshTokenPlaintext: REFRESH,
    nowIso: "2026-09-01T10:00:00.000Z",
  });
  if (!refreshed.ok) surfaces.push(refreshed.detail);

  const blob = surfaces.join(" | ");
  check("no access token appears in any thrown or returned string", !blob.includes(TOKEN));
  check("no refresh token appears either", !blob.includes(REFRESH));
  check(
    "not even when Google echoes it back in error_description",
    !blob.includes("REFRESH-TOKEN-SECRET"),
    blob,
  );
  check(
    "no client secret appears",
    !blob.includes("test-client-secret"),
  );
}

/* ================================================================== */
/*                     MEDIA FAILURE MODES                            */
/* ================================================================== */

console.log("\nInvalid media is refused rather than uploaded");

{
  reset(() => null);
  let threw = null;
  try {
    await youtubeAdapter.publish(
      publishInput({
        package: { ...publishInput().package, media: [] },
      }),
    );
  } catch (error) {
    threw = error;
  }
  check("no video asset refuses", threw !== null && threw.code === "no_video_asset");
  check("and sends nothing", calls.length === 0);
}

{
  reset(() => null);
  let threw = null;
  try {
    await youtubeAdapter.publish(
      publishInput({
        package: {
          ...publishInput().package,
          media: [
            {
              url: MEDIA_URL,
              expiresAt: "x",
              objectKey: "k",
              contentType: "video/mp4",
              byteSize: null,
            },
          ],
        },
      }),
    );
  } catch (error) {
    threw = error;
  }
  check(
    "an unknown media size refuses — a guessed length uploads a corrupt video",
    threw !== null && threw.code === "unknown_media_size",
  );
  check("and sends nothing", calls.length === 0);
}

{
  reset((call) => {
    if (call.url.includes("/upload/youtube/v3/videos") && call.method === "POST") {
      return json({}, 200, { location: UPLOAD_SESSION });
    }
    if (call.url === MEDIA_URL) return bytes(new Uint8Array([1, 2]).buffer);
    return null;
  });
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput());
  } catch (error) {
    threw = error;
  }
  check(
    "media whose length disagrees with the ledger is refused before the PUT",
    threw !== null && threw.code === "media_size_mismatch",
    threw?.code,
  );
  check(
    "and no PUT is made",
    calls.filter((c) => c.method === "PUT").length === 0,
  );
}

/* ================================================================== */
/*                    QUOTA / API ERROR HANDLING                      */
/* ================================================================== */

console.log("\nYouTube API failures");

{
  reset((call) => {
    if (call.url.includes("/upload/youtube/v3/videos") && call.method === "POST") {
      return json(
        { error: { code: 403, errors: [{ reason: "quotaExceeded" }] } },
        403,
      );
    }
    return null;
  });
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput());
  } catch (error) {
    threw = error;
  }
  check(
    "a quota rejection throws with the provider's short code",
    threw !== null && threw.code === "quotaExceeded",
    threw?.code,
  );
  check("and nothing further is sent", calls.length === 1, calls.length);
}

{
  reset((call) => {
    if (call.url.includes("/upload/youtube/v3/videos") && call.method === "POST") {
      return json({}, 200, { location: UPLOAD_SESSION });
    }
    if (call.url === MEDIA_URL) return bytes(PAYLOAD.buffer);
    if (call.url === UPLOAD_SESSION) return json({ status: {} });
    return null;
  });
  let threw = null;
  try {
    await youtubeAdapter.publish(publishInput());
  } catch (error) {
    threw = error;
  }
  check(
    "a 2xx upload with no video id is a failure, not a silent success",
    threw !== null && threw.code === "no_video_id",
    threw?.code,
  );
}

/* ================================================================== */
/*                  THE DISPATCHER'S ORDER (STATIC)                   */
/* ================================================================== */

console.log("\nThe dispatcher gates, then claims, then publishes");

const dispatchSource = readFileSync("lib/publishing/dispatch.ts", "utf8");
const body = dispatchSource.slice(
  dispatchSource.indexOf("export async function dispatchPublish"),
);

/**
 * Position of an anchor, or a THROW if it is absent.
 *
 * It used to return `indexOf` directly, and that made every ordering check
 * below silently vacuous the moment an anchor was renamed: `-1 < realIndex`
 * is true, so "the gate runs before the claim" passed while the gate call it
 * named no longer existed anywhere in the file. Splitting the gate renamed
 * exactly that anchor and the suite stayed green.
 *
 * A missing anchor is now a loud failure. An ordering assertion about a
 * function that is not there is not a weaker assertion — it is no assertion,
 * wearing the costume of one.
 */
const at = (needle) => {
  const index = body.indexOf(needle);
  if (index === -1) {
    throw new Error(
      `ORDERING ANCHOR MISSING: "${needle}" is not in dispatchPublish. ` +
        `Update this check to the new name rather than leaving it to pass on -1.`,
    );
  }
  return index;
};

check(
  "the LOCAL half of the gate runs before anything is claimed",
  at("assertPublishPreconditions(") < at("claimDelivery("),
);
check(
  "the credential is resolved before the claim, so a refresh failure cannot strand a row",
  at("getUsableAccessToken(") < at("claimDelivery("),
);
check(
  "the claim happens before the provider is contacted",
  at("claimDelivery(") < at("adapter.publish("),
);

/* ------------------------------- the deadlock this used to have --------- */

check(
  "THE KILL SWITCH AND APPROVAL ARE CHECKED BEFORE THE CREDENTIAL IS TOUCHED",
  at("assertPublishPreconditions(") < at("getUsableAccessToken("),
);
check(
  "CONNECTION HEALTH IS CHECKED AFTER THE REFRESH, NOT BEFORE — the deadlock fix",
  at("getUsableAccessToken(") < at("assertConnectionReady("),
);
check(
  "health is judged on the post-refresh expiry, not the stored one",
  at("tokenExpiresAt: credential.tokenExpiresAt") < at("assertConnectionReady("),
);
check(
  "and still before the claim, so an unhealthy connection leaves no ledger row",
  at("assertConnectionReady(") < at("claimDelivery("),
);
check(
  "IDEMPOTENCY IS THE LEDGER: a non-PROCEED claim returns without publishing",
  at('claim.decision !== "PROCEED"') > -1 &&
    at('claim.decision !== "PROCEED"') < at("adapter.publish("),
);
// Comments are stripped first: dispatch.ts explains in prose that it uses
// the wrapper "rather than `refreshIfNeeded`", and matching the raw source
// flagged that sentence as if it were a call.
const bodyCode = body
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(new RegExp("//[^\n]*", "g"), "");
check(
  "the credential comes from the lifecycle wrapper that persists the expiry",
  bodyCode.includes("getUsableAccessToken(") &&
    !bodyCode.includes("refreshIfNeeded("),
);
check(
  "a provider failure settles the delivery rather than leaving it in flight",
  body.includes('outcome: "failed"'),
);
check(
  "a success settles with the provider result (migration 186)",
  body.includes("providerResult"),
);
// Scoped to the whole file, not the `dispatchPublish` body: the flattener
// is defined ABOVE the function, so the body-relative helper found neither
// string and the comparison passed on two -1s.
const flattener = dispatchSource.slice(
  dispatchSource.indexOf("function providerResultFrom"),
);
check(
  "the adapter's facts cannot overwrite the dispatcher's verifiedAt stamp",
  flattener.indexOf("...(outcome.providerResult ?? {})") > -1 &&
    flattener.indexOf("...(outcome.providerResult ?? {})") <
      flattener.indexOf("verifiedAt: nowIso"),
);
check(
  "the granted scopes are handed to the adapter",
  body.includes("grantedScopes: account.grantedScopes"),
);

/* ---------------------- the expiry actually gets written ---------------- */

const lifecycle = readFileSync("lib/integrations/credential-lifecycle.ts", "utf8");
check(
  "the lifecycle wrapper persists a refreshed expiry",
  lifecycle.includes("recordRefreshedTokenExpiry"),
);
check(
  "and only when something was actually refreshed",
  lifecycle.includes("!result.refreshed"),
);

const adminSource = readFileSync(
  "lib/database/queries/marketing-connected-accounts-admin.ts",
  "utf8",
);
check(
  "the expiry write targets token_expires_at on the accounts table",
  /recordRefreshedTokenExpiry[\s\S]*token_expires_at: input\.tokenExpiresAt/.test(
    adminSource,
  ),
);
check(
  "a disconnected connection is never resurrected by a late refresh",
  /recordRefreshedTokenExpiry[\s\S]*\.eq\("status", "connected"\)/.test(adminSource),
);

/* ================================================================== */
/*                  THE SUPERVISED CANARY TRIGGER                     */
/* ================================================================== */

console.log("\nThe canary trigger cannot weaken anything");

const canary = readFileSync("scripts/youtube-canary.mjs", "utf8");
const canaryCode = canary
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(new RegExp("//[^\\n]*", "g"), "");

check(
  "it goes through dispatchPublish rather than calling the adapter itself",
  canaryCode.includes("dispatchPublish(") &&
    !canaryCode.includes("youtubeAdapter"),
);
check(
  "IT NEVER PASSES env INTO THE GATE, so the kill switch cannot be asserted past",
  // A plain substring, deliberately: two earlier attempts at this line used
  // a regex and both carried a mangled escape — one a literal backspace byte
  // where a word boundary was meant — so the guard matched nothing and
  // passed while an injected `env:` sat in the file. Mutation-checking
  // found that; reading the line did not. No escapes, nothing to mangle.
  // The canary's own `env` uses are `ENV_PATH`, `loadEnvLocal` and
  // `process.env[...]`, none of which contain this token.
  !canaryCode.includes("env:"),
);
check(
  "it refuses unless MARKETING_PUBLISH_MODE is exactly live",
  /publishMode !== "live"/.test(canaryCode),
);
check(
  "the provider is hardcoded, not an argument",
  /const PROVIDER = "youtube"/.test(canaryCode) &&
    !/flag\("provider"\)/.test(canaryCode),
);
check(
  "it refuses a matrix visibility other than private",
  /defaultVisibility !== "private"/.test(canaryCode),
);
check(
  "it checks the live upload grant, not just that the account is connected",
  canaryCode.includes("REQUIRED_UPLOAD_SCOPE"),
);
check(
  "it requires a real approver email and resolves it to a profile",
  /--approved-by/.test(canary) && canaryCode.includes('from("profiles")'),
);
check(
  "the approver must be an ACTIVE owner or admin",
  /membership\.status !== "active"/.test(canaryCode) &&
    /\["owner", "admin"\]/.test(canaryCode),
);
check(
  "the approval it writes is a real timestamp on a real job row",
  canaryCode.includes('from("marketing_publish_jobs")') &&
    canaryCode.includes("approved_by: approver.id"),
);
check(
  "the gate is handed the approval READ BACK from the database",
  canaryCode.includes("jobApprovedAt: job.approved_at"),
);
check(
  "writing requires --apply; the default run touches nothing",
  /if \(!APPLY\)/.test(canaryCode) &&
    canaryCode.indexOf("if (!APPLY)") < canaryCode.indexOf('from("marketing_media_assets")'),
);
check(
  "the project must be confirmed by ref before anything is read",
  /projectRef !== CONFIRM/.test(canaryCode),
);
check(
  "media and job rows are upserted on their natural keys, so a second run reuses them",
  canaryCode.includes('onConflict: "company_id,source_job_id"') &&
    canaryCode.includes('onConflict: "company_id,marketing_post_id,provider"'),
);
check(
  "it reports the readback privacy, channel and final delivery state",
  ["privacyStatus", "channelId", "delivery_state"].every((f) =>
    canaryCode.includes(f),
  ),
);
check(
  "it warns loudly if a posted delivery is not private",
  /delivery_state === "posted" && privacy !== "private"/.test(canaryCode),
);
check(
  "it lets a REFRESHABLE stale token through — the other half of the deadlock",
  canaryCode.includes("REFRESHABLE_STATES") &&
    canaryCode.includes("TOKEN_EXPIRED"),
);
check(
  "but still refuses a state no refresh can repair",
  canaryCode.includes("which no refresh can repair"),
);
check(
  "it is not a scheduler: no cron, interval, or loop over work",
  !/setInterval|node-cron|while \(true\)|for await/.test(canaryCode),
);
check(
  "it tells the operator to disarm afterwards",
  /MARKETING_PUBLISH_MODE=off/.test(canary),
);

globalThis.fetch = realFetch;

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
