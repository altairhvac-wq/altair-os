/**
 * Executable transport tests for the Reel provider flows.
 *
 * ===================== WHY THIS EXISTS =====================
 * The independent audit was right about the gap (P2-3): the Reel decision
 * logic was tested thoroughly and the actual conversation with Meta was not.
 * Phase ordering, request bodies, headers, and how each provider response is
 * interpreted were covered only by reading the source. That is precisely the
 * part where a wrong parameter name or a swapped phase produces a plausible
 * diff, passes every structural check, and fails for the first time against a
 * live Page.
 *
 * ==================== HOW IT RUNS WITHOUT A NETWORK ====================
 * Altair OS has no test runner (AGENTS.md), so this follows the established
 * convention — a plain `.mjs` run with node, transpiling the modules under
 * test with the `typescript` devDependency that is already present. No new
 * dependency, no framework, no build step.
 *
 * The four modules involved are transpiled into a temp directory and their
 * import specifiers rewritten to resolve there, with `server-only` and the
 * app-URL helper replaced by stubs. `globalThis.fetch` is replaced by a
 * recorder, so:
 *
 *   - NO SOCKET IS OPENED. The real `fetch` is captured and restored, and any
 *     request the fake router does not recognise fails the test loudly rather
 *     than falling through to the network.
 *   - `globalThis.setTimeout` is replaced by an immediate call, so the
 *     30-attempt timeout paths run in milliseconds instead of 150 seconds.
 *
 * What is asserted is the REQUEST LOG: what was sent, to where, in what order,
 * with which headers — and, just as importantly, what was NOT sent after a
 * failure.
 *
 * ==================== THESE TESTS WERE MUTATION-CHECKED ====================
 * A test suite that passes is not evidence until it has been shown to fail.
 * Each of these defects was introduced into `reels.ts` in turn and this suite
 * caught every one:
 *
 *   video_state=PUBLISHED -> DRAFT              (the Reel would go out unpublished)
 *   media_type=REELS -> VIDEO                   (an Instagram video, not a Reel)
 *   the upload-host trust check removed         (the Page token follows any URL)
 *   onMediaCreated moved after the upload       (no breadcrumb during the risky window)
 *   ALREADY_PUBLISHED no longer refused         (the duplicate this all exists to prevent)
 *   Instagram read with permalink_url           (silently no permalink, forever)
 *
 * Run: node scripts/verify-marketing-reel-transport.mjs
 */
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/* ------------------------------------------------------------ harness */

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

const SPECIFIER_REWRITES = [
  ['"server-only"', '"./server-only.mjs"'],
  ['"@/shared/types/marketing-reel"', '"./marketing-reel.mjs"'],
  ['"@/lib/email/env"', '"./email-env.mjs"'],
  ['"./env"', '"./env.mjs"'],
  ['"./graph"', '"./graph.mjs"'],
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

const dir = mkdtempSync(join(tmpdir(), "reel-transport-"));
writeFileSync(join(dir, "server-only.mjs"), "export {};\n");
writeFileSync(
  join(dir, "email-env.mjs"),
  // Never reached: FACEBOOK_REDIRECT_URI is set explicitly below. Present only
  // so the import resolves.
  'export function resolveAppBaseUrl() { return { ok: false }; }\n' +
    'export function getAppBaseUrl() { return ""; }\n',
);
transpileInto(dir, "shared/types/marketing-reel.ts", "marketing-reel.mjs");
transpileInto(dir, "lib/integrations/facebook/env.ts", "env.mjs");
transpileInto(dir, "lib/integrations/facebook/graph.ts", "graph.mjs");
transpileInto(dir, "lib/integrations/facebook/reels.ts", "reels.mjs");

process.env.FACEBOOK_APP_ID = "test-app-id";
process.env.FACEBOOK_APP_SECRET = "test-app-secret";
process.env.FACEBOOK_REDIRECT_URI = "https://altair.test/api/cb";
delete process.env.FACEBOOK_GRAPH_API_VERSION;

const reels = await import(pathToFileURL(join(dir, "reels.mjs")).href);
const pure = await import(pathToFileURL(join(dir, "marketing-reel.mjs")).href);

/* ------------------------------------------------------- fetch recorder */

const realFetch = globalThis.fetch;
const realSetTimeout = globalThis.setTimeout;

let calls = [];
let router = null;

globalThis.fetch = async (url, init = {}) => {
  const record = {
    url: String(url),
    method: init.method ?? "GET",
    headers: init.headers ?? {},
    body: init.body === undefined ? null : String(init.body),
  };
  calls.push(record);
  const response = router ? router(record) : null;
  if (!response) {
    throw new Error(`UNROUTED REQUEST — the test would have hit the network: ${record.method} ${record.url}`);
  }
  return response;
};

// Immediate, so a 30-attempt poll costs microseconds. The module reads the
// global inside `sleep`, so replacing it here is enough.
globalThis.setTimeout = (fn) => {
  fn();
  return 0;
};

const ok = (body) => ({ ok: true, status: 200, json: async () => body });
const bad = (body, status = 400) => ({ ok: false, status, json: async () => body });

function reset(nextRouter) {
  calls = [];
  router = nextRouter;
}

const TOKEN = "PAGE-TOKEN-abc123";
const PAGE_ID = "111222333";
const IG_ID = "17841400000000000";
const SIGNED =
  "https://proj.supabase.co/storage/v1/object/sign/marketing-media/company/video/render-1.mp4?token=eyJhbGciOi";

const bodyOf = (call) => new URLSearchParams(call.body ?? "");
const find = (predicate) => calls.filter(predicate);
const graphCalls = () => calls.filter((c) => c.url.startsWith("https://graph.facebook.com/"));

/* ================================================================= */
/*                         FACEBOOK REEL                             */
/* ================================================================= */

console.log("\nFacebook Reel — the happy path");
{
  const seen = [];
  let statusPolls = 0;
  reset((call) => {
    const body = bodyOf(call);
    if (call.url.includes("/video_reels") && body.get("upload_phase") === "start") {
      return ok({
        video_id: "FBVID1",
        upload_url: "https://rupload.facebook.com/video-upload/v22.0/FBVID1",
      });
    }
    if (call.url.startsWith("https://rupload.facebook.com/")) return ok({ success: true });
    if (call.url.includes("FBVID1") && call.url.includes("fields=status")) {
      statusPolls += 1;
      return ok({
        status:
          statusPolls === 1
            ? { uploading_phase: { status: "in_progress" } }
            : { uploading_phase: { status: "complete" } },
      });
    }
    if (call.url.includes("/video_reels") && body.get("upload_phase") === "finish") {
      return ok({ success: true });
    }
    if (call.url.includes("fields=permalink_url")) return ok({ permalink_url: "/reel/FBVID1" });
    return null;
  });

  const result = await reels.publishFacebookPageReel({
    pageId: PAGE_ID,
    accessToken: TOKEN,
    videoUrl: SIGNED,
    description: "Altair OS milestone",
    onMediaCreated: async (id) => {
      seen.push({ marker: "onMediaCreated", id, afterCalls: calls.length });
    },
  });

  const start = calls[0];
  check("phase 1 posts to the Page's video_reels edge", /\/video_reels$/.test(start.url.split("?")[0]));
  check("phase 1 uses the pinned Graph version", start.url.startsWith("https://graph.facebook.com/v22.0/"));
  check("phase 1 is a POST", start.method === "POST");
  check("phase 1 declares upload_phase=start", bodyOf(start).get("upload_phase") === "start");
  check("phase 1 carries the Page token", bodyOf(start).get("access_token") === TOKEN);
  check(
    "phase 1 does NOT leak the token into the query string",
    !start.url.includes(TOKEN),
  );

  check("the media id is reported to the caller", seen[0]?.id === "FBVID1");
  check(
    "and reported BEFORE a single byte is uploaded",
    seen[0]?.afterCalls === 1,
    `${seen[0]?.afterCalls} calls had happened`,
  );

  const upload = calls[1];
  check(
    "phase 2 uses the upload_url Meta returned",
    upload.url === "https://rupload.facebook.com/video-upload/v22.0/FBVID1",
    upload.url,
  );
  check("phase 2 is a POST", upload.method === "POST");
  check(
    "phase 2 authenticates with the OAuth scheme, not Bearer",
    upload.headers.Authorization === `OAuth ${TOKEN}`,
    upload.headers.Authorization,
  );
  check(
    "phase 2 hands Meta the media URL in the file_url HEADER",
    upload.headers.file_url === SIGNED,
    upload.headers.file_url,
  );
  check("phase 2 streams no bytes through this server", upload.body === null);
  check(
    "the signed URL never appears in a URL, only in that header",
    calls.every((c) => !c.url.includes("supabase.co")),
  );

  const polls = find((c) => c.url.includes("fields=status") && c.url.includes("FBVID1"));
  check("phase 3 polls the upload status", polls.length === 2, polls.length);
  check("phase 3 polls with GET", polls.every((c) => c.method === "GET"));

  const finish = calls[calls.length - 2];
  check("phase 4 posts to video_reels again", finish.url.includes("/video_reels"));
  check("phase 4 declares upload_phase=finish", bodyOf(finish).get("upload_phase") === "finish");
  check("phase 4 names the video id", bodyOf(finish).get("video_id") === "FBVID1");
  check(
    "phase 4 publishes rather than drafting",
    bodyOf(finish).get("video_state") === "PUBLISHED",
  );
  check(
    "phase 4 carries the post text as the description",
    bodyOf(finish).get("description") === "Altair OS milestone",
  );

  check("the video id is returned as the post id", result.providerPostId === "FBVID1");
  check("and as the media id — they are the same object on Facebook", result.providerMediaId === "FBVID1");
  check(
    "the RELATIVE permalink Facebook returns is made absolute",
    result.permalinkUrl === "https://www.facebook.com/reel/FBVID1",
    result.permalinkUrl,
  );
  check(
    "every Graph call used the same version",
    graphCalls().every((c) => c.url.startsWith("https://graph.facebook.com/v22.0/")),
  );
}

console.log("\nFacebook Reel — an upload host Meta did not vouch for");
{
  reset((call) => {
    const body = bodyOf(call);
    if (call.url.includes("/video_reels") && body.get("upload_phase") === "start") {
      // The response body claims the bytes should go somewhere else.
      return ok({ video_id: "FBVID2", upload_url: "https://rupload.facebook.com.evil.example/x" });
    }
    if (call.url.startsWith("https://rupload.facebook.com/")) return ok({ success: true });
    if (call.url.includes("fields=status")) {
      return ok({ status: { uploading_phase: { status: "complete" } } });
    }
    if (call.url.includes("/video_reels") && body.get("upload_phase") === "finish") {
      return ok({ success: true });
    }
    if (call.url.includes("fields=permalink_url")) return ok({});
    return null;
  });

  // Wrapped, because a regression here makes the module POST to a host the
  // router does not know — which throws out of the harness. Catching it turns
  // that into a readable FAIL rather than a stack trace.
  let reachedEnd = true;
  try {
    await reels.publishFacebookPageReel({
      pageId: PAGE_ID,
      accessToken: TOKEN,
      videoUrl: SIGNED,
      description: "d",
    });
  } catch {
    reachedEnd = false;
  }
  check("the publish still completes on the pinned host", reachedEnd);

  check(
    "THE TOKEN IS NEVER SENT to a host Meta did not name",
    calls.every((c) => !c.url.includes("evil.example")),
    calls.map((c) => c.url),
  );
  check(
    "no credential was attached to any request off graph/rupload",
    calls.every(
      (c) =>
        !c.headers?.Authorization ||
        c.url.startsWith("https://rupload.facebook.com/"),
    ),
    calls.filter((c) => c.headers?.Authorization).map((c) => c.url),
  );
  check(
    "the upload URL is reconstructed on the pinned host instead",
    calls[1].url === "https://rupload.facebook.com/video-upload/v22.0/FBVID2",
    calls[1].url,
  );
  check("and it still carries the credential, to the right place", calls[1].headers.Authorization === `OAuth ${TOKEN}`);
}

console.log("\nFacebook Reel — failures publish nothing");
{
  // The upload itself is rejected.
  reset((call) => {
    const body = bodyOf(call);
    if (call.url.includes("/video_reels") && body.get("upload_phase") === "start") {
      return ok({ video_id: "FBVID3" });
    }
    if (call.url.startsWith("https://rupload.facebook.com/")) {
      return bad({ debug_info: { message: "file_url could not be fetched" } });
    }
    return null;
  });
  let message = "";
  try {
    await reels.publishFacebookPageReel({
      pageId: PAGE_ID, accessToken: TOKEN, videoUrl: SIGNED, description: "d",
    });
  } catch (error) {
    message = error.message;
  }
  check("a rejected upload throws Meta's own reason", message === "file_url could not be fetched", message);
  check(
    "and NO finish phase was reached, so nothing is public",
    find((c) => bodyOf(c).get("upload_phase") === "finish").length === 0,
  );

  // The upload lands but Meta reports an error processing it.
  reset((call) => {
    const body = bodyOf(call);
    if (call.url.includes("/video_reels") && body.get("upload_phase") === "start") {
      return ok({ video_id: "FBVID4" });
    }
    if (call.url.startsWith("https://rupload.facebook.com/")) return ok({ success: true });
    if (call.url.includes("fields=status")) {
      return ok({ status: { uploading_phase: { status: "error" } } });
    }
    return null;
  });
  message = "";
  try {
    await reels.publishFacebookPageReel({
      pageId: PAGE_ID, accessToken: TOKEN, videoUrl: SIGNED, description: "d",
    });
  } catch (error) {
    message = error.message;
  }
  check("an errored upload phase throws", /could not fetch the video/i.test(message), message);
  check(
    "and still no finish phase",
    find((c) => bodyOf(c).get("upload_phase") === "finish").length === 0,
  );

  // Meta never finishes fetching.
  reset((call) => {
    const body = bodyOf(call);
    if (call.url.includes("/video_reels") && body.get("upload_phase") === "start") {
      return ok({ video_id: "FBVID5" });
    }
    if (call.url.startsWith("https://rupload.facebook.com/")) return ok({ success: true });
    if (call.url.includes("fields=status")) {
      return ok({ status: { uploading_phase: { status: "in_progress" } } });
    }
    return null;
  });
  message = "";
  try {
    await reels.publishFacebookPageReel({
      pageId: PAGE_ID, accessToken: TOKEN, videoUrl: SIGNED, description: "d",
    });
  } catch (error) {
    message = error.message;
  }
  check("a stuck upload gives up rather than polling forever", /in time/i.test(message), message);
  check(
    "it gives up after exactly the budgeted number of attempts",
    find((c) => c.url.includes("fields=status")).length === pure.REEL_POLL_MAX_ATTEMPTS,
    find((c) => c.url.includes("fields=status")).length,
  );
  check(
    "and publishes nothing",
    find((c) => bodyOf(c).get("upload_phase") === "finish").length === 0,
  );
}

console.log("\nFacebook Reel — a caller that cannot record the media id stops the publish");
{
  reset((call) => {
    const body = bodyOf(call);
    if (call.url.includes("/video_reels") && body.get("upload_phase") === "start") {
      return ok({ video_id: "FBVID6", upload_url: "https://rupload.facebook.com/video-upload/v22.0/FBVID6" });
    }
    if (call.url.startsWith("https://rupload.facebook.com/")) return ok({ success: true });
    return null;
  });
  let message = "";
  try {
    await reels.publishFacebookPageReel({
      pageId: PAGE_ID,
      accessToken: TOKEN,
      videoUrl: SIGNED,
      description: "d",
      onMediaCreated: async () => {
        throw new Error("Could not record the provider media reference");
      },
    });
  } catch (error) {
    message = error.message;
  }
  check("the callback's failure propagates", /record the provider media/.test(message), message);
  check(
    "and it aborts BEFORE any byte upload — the object at Meta is untouched",
    calls.length === 1,
    calls.map((c) => c.url),
  );
}

/* ================================================================= */
/*                        INSTAGRAM REEL                             */
/* ================================================================= */

console.log("\nInstagram Reel — the happy path");
{
  const seen = [];
  let polls = 0;
  reset((call) => {
    if (call.url.includes(`/${IG_ID}/media`) && !call.url.includes("media_publish")) {
      return ok({ id: "IGC1" });
    }
    if (call.url.includes("IGC1") && call.url.includes("status_code")) {
      polls += 1;
      return ok({ status_code: polls === 1 ? "IN_PROGRESS" : "FINISHED" });
    }
    if (call.url.includes("media_publish")) return ok({ id: "IGM1" });
    if (call.url.includes("fields=permalink")) {
      return ok({ permalink: "https://www.instagram.com/reel/XYZ/" });
    }
    return null;
  });

  const result = await reels.publishInstagramReel({
    igUserId: IG_ID,
    accessToken: TOKEN,
    videoUrl: SIGNED,
    caption: "Altair OS milestone",
    onMediaCreated: async (id) => {
      seen.push({
        id,
        afterCalls: calls.length,
        publishesSoFar: find((c) => c.url.includes("media_publish")).length,
      });
    },
  });

  const create = calls[0];
  check("phase 1 posts to the IG user's media edge", create.url.endsWith(`/${IG_ID}/media`));
  check("phase 1 uses the pinned Graph version", create.url.startsWith("https://graph.facebook.com/v22.0/"));
  check("phase 1 declares media_type=REELS", bodyOf(create).get("media_type") === "REELS");
  check(
    "phase 1 hands Meta the media URL as video_url — there is no byte upload",
    bodyOf(create).get("video_url") === SIGNED,
  );
  check("phase 1 carries the caption", bodyOf(create).get("caption") === "Altair OS milestone");
  check("phase 1 shares to the feed by default", bodyOf(create).get("share_to_feed") === "true");
  check("phase 1 does not leak the token into the query string", !create.url.includes(TOKEN));

  check("the container id is reported to the caller", seen[0]?.id === "IGC1");
  check(
    "reported right after the container is created and before anything else",
    seen[0]?.afterCalls === 1,
    seen[0]?.afterCalls,
  );
  check(
    "and strictly BEFORE any media_publish call",
    seen[0]?.publishesSoFar === 0,
    seen[0]?.publishesSoFar,
  );

  const statusCalls = find((c) => c.url.includes("status_code"));
  check("phase 2 polls the container", statusCalls.length === 2, statusCalls.length);
  check("phase 2 asks for status_code", statusCalls.every((c) => c.url.includes("fields=status_code")));

  const publish = find((c) => c.url.includes("media_publish"))[0];
  check("phase 3 posts to media_publish", publish !== undefined);
  check("phase 3 is a POST", publish?.method === "POST");
  check("phase 3 names the container as creation_id", bodyOf(publish).get("creation_id") === "IGC1");

  check("the published media id is the post id", result.providerPostId === "IGM1");
  check("the container id is kept as the media id — they DIFFER on Instagram", result.providerMediaId === "IGC1");
  check(
    "Instagram's permalink field is read, not Facebook's",
    result.permalinkUrl === "https://www.instagram.com/reel/XYZ/",
    result.permalinkUrl,
  );
  check(
    "the media URL is never placed in a query string",
    calls.every((c) => !c.url.includes("supabase.co")),
  );
}

console.log("\nInstagram Reel — share_to_feed is honoured when turned off");
{
  reset((call) => {
    if (call.url.endsWith(`/${IG_ID}/media`)) return ok({ id: "IGC2" });
    if (call.url.includes("status_code")) return ok({ status_code: "FINISHED" });
    if (call.url.includes("media_publish")) return ok({ id: "IGM2" });
    if (call.url.includes("fields=permalink")) return ok({});
    return null;
  });
  await reels.publishInstagramReel({
    igUserId: IG_ID, accessToken: TOKEN, videoUrl: SIGNED, caption: "c", shareToFeed: false,
  });
  check("share_to_feed=false is sent through", bodyOf(calls[0]).get("share_to_feed") === "false");
}

console.log("\nInstagram Reel — failures publish nothing");
{
  // Meta says the container is already published.
  reset((call) => {
    if (call.url.endsWith(`/${IG_ID}/media`)) return ok({ id: "IGC3" });
    if (call.url.includes("status_code")) return ok({ status_code: "PUBLISHED" });
    if (call.url.includes("media_publish")) return ok({ id: "SHOULD-NEVER-HAPPEN" });
    return null;
  });
  let message = "";
  try {
    await reels.publishInstagramReel({
      igUserId: IG_ID, accessToken: TOKEN, videoUrl: SIGNED, caption: "c",
    });
  } catch (error) {
    message = error.message;
  }
  check("an ALREADY-PUBLISHED container is refused", /already been published/i.test(message), message);
  check(
    "THE DUPLICATE IS PREVENTED — media_publish is never called",
    find((c) => c.url.includes("media_publish")).length === 0,
  );
  check("and the refusal warns about posting twice", /post twice/i.test(message), message);

  // Meta reports an error.
  reset((call) => {
    if (call.url.endsWith(`/${IG_ID}/media`)) return ok({ id: "IGC4" });
    if (call.url.includes("status_code")) {
      return ok({ status_code: "ERROR", status: "Media download failed" });
    }
    if (call.url.includes("media_publish")) return ok({ id: "SHOULD-NEVER-HAPPEN" });
    return null;
  });
  message = "";
  try {
    await reels.publishInstagramReel({
      igUserId: IG_ID, accessToken: TOKEN, videoUrl: SIGNED, caption: "c",
    });
  } catch (error) {
    message = error.message;
  }
  check("an ERROR container surfaces Meta's own status text", message === "Media download failed", message);
  check(
    "and nothing is published",
    find((c) => c.url.includes("media_publish")).length === 0,
  );

  // An EXPIRED container.
  reset((call) => {
    if (call.url.endsWith(`/${IG_ID}/media`)) return ok({ id: "IGC5" });
    if (call.url.includes("status_code")) return ok({ status_code: "EXPIRED" });
    if (call.url.includes("media_publish")) return ok({ id: "SHOULD-NEVER-HAPPEN" });
    return null;
  });
  message = "";
  try {
    await reels.publishInstagramReel({
      igUserId: IG_ID, accessToken: TOKEN, videoUrl: SIGNED, caption: "c",
    });
  } catch (error) {
    message = error.message;
  }
  check("an EXPIRED container is terminal", message.length > 0);
  check("and nothing is published", find((c) => c.url.includes("media_publish")).length === 0);

  // Never finishes.
  reset((call) => {
    if (call.url.endsWith(`/${IG_ID}/media`)) return ok({ id: "IGC6" });
    if (call.url.includes("status_code")) return ok({ status_code: "IN_PROGRESS" });
    if (call.url.includes("media_publish")) return ok({ id: "SHOULD-NEVER-HAPPEN" });
    return null;
  });
  message = "";
  try {
    await reels.publishInstagramReel({
      igUserId: IG_ID, accessToken: TOKEN, videoUrl: SIGNED, caption: "c",
    });
  } catch (error) {
    message = error.message;
  }
  check("a container that never finishes gives up", /in time/i.test(message), message);
  check(
    "after exactly the budgeted number of polls",
    find((c) => c.url.includes("status_code")).length === pure.REEL_POLL_MAX_ATTEMPTS,
    find((c) => c.url.includes("status_code")).length,
  );
  check("and publishes nothing", find((c) => c.url.includes("media_publish")).length === 0);

  // The caller cannot record the container id.
  reset((call) => {
    if (call.url.endsWith(`/${IG_ID}/media`)) return ok({ id: "IGC7" });
    return null;
  });
  message = "";
  try {
    await reels.publishInstagramReel({
      igUserId: IG_ID,
      accessToken: TOKEN,
      videoUrl: SIGNED,
      caption: "c",
      onMediaCreated: async () => {
        throw new Error("Could not record the provider media reference");
      },
    });
  } catch (error) {
    message = error.message;
  }
  check("an unrecordable container aborts the publish", /record the provider media/.test(message));
  check(
    "before any polling or publishing — the container is simply abandoned",
    calls.length === 1,
    calls.map((c) => c.url),
  );
}

/* ================================================================= */
/*                   REFUSALS BEFORE ANY REQUEST                     */
/* ================================================================= */

console.log("\nRefused before a request is made at all");
{
  for (const [name, videoUrl] of [
    ["plaintext http", "http://example.com/v.mp4"],
    ["a local path", ""],
  ]) {
    reset(() => null);
    let threw = false;
    try {
      await reels.publishFacebookPageReel({
        pageId: PAGE_ID, accessToken: TOKEN, videoUrl, description: "d",
      });
    } catch {
      threw = true;
    }
    check(`${name} is refused`, threw);
    check(`${name} reaches no network call`, calls.length === 0, calls.length);
  }

  reset(() => null);
  let threw = false;
  try {
    await reels.publishInstagramReel({
      igUserId: "", accessToken: TOKEN, videoUrl: SIGNED, caption: "c",
    });
  } catch {
    threw = true;
  }
  check("a missing Instagram account id is refused before any request", threw && calls.length === 0);

  // A Graph version too old to have the endpoints.
  process.env.FACEBOOK_GRAPH_API_VERSION = "v13.0";
  reset(() => null);
  let message = "";
  try {
    await reels.publishFacebookPageReel({
      pageId: PAGE_ID, accessToken: TOKEN, videoUrl: SIGNED, description: "d",
    });
  } catch (error) {
    message = error.message;
  }
  check("a Graph version below the Reel floor is refused", /too old/i.test(message), message);
  check("with an explanation, not an opaque Graph error", /v14\.0 or later/.test(message), message);
  check("and no request is made", calls.length === 0);

  // And an override is actually honoured end to end.
  process.env.FACEBOOK_GRAPH_API_VERSION = "v25.0";
  reset((call) => {
    const body = bodyOf(call);
    if (call.url.includes("/video_reels") && body.get("upload_phase") === "start") {
      return ok({ video_id: "FBVID9" });
    }
    if (call.url.startsWith("https://rupload.facebook.com/")) return ok({ success: true });
    if (call.url.includes("fields=status")) {
      return ok({ status: { uploading_phase: { status: "complete" } } });
    }
    if (call.url.includes("/video_reels") && body.get("upload_phase") === "finish") {
      return ok({ success: true });
    }
    if (call.url.includes("fields=permalink_url")) return ok({});
    return null;
  });
  await reels.publishFacebookPageReel({
    pageId: PAGE_ID, accessToken: TOKEN, videoUrl: SIGNED, description: "d",
  });
  check(
    "the env override moves EVERY Graph call to the new version",
    graphCalls().every((c) => c.url.startsWith("https://graph.facebook.com/v25.0/")),
    graphCalls().map((c) => c.url.slice(0, 40)),
  );
  check(
    "INCLUDING the upload host — the place a second pin would hide",
    calls[1].url === "https://rupload.facebook.com/video-upload/v25.0/FBVID9",
    calls[1].url,
  );
  delete process.env.FACEBOOK_GRAPH_API_VERSION;
}

/* ================================================================= */
/*                        HARNESS SELF-CHECK                         */
/* ================================================================= */

console.log("\nThe harness itself");
{
  // If the router ever returned a default instead of null, every assertion
  // above would still pass while the code did something else entirely. This
  // proves an unrecognised request is a loud failure, not a silent one.
  reset(() => null);
  let threw = false;
  try {
    await globalThis.fetch("https://graph.facebook.com/v22.0/anything", { method: "GET" });
  } catch (error) {
    threw = /UNROUTED REQUEST/.test(error.message);
  }
  check("an unrouted request fails loudly rather than reaching the network", threw);
  check("real fetch was replaced, not wrapped", globalThis.fetch !== realFetch);
}

/* ------------------------------------------------------------ teardown */

globalThis.fetch = realFetch;
globalThis.setTimeout = realSetTimeout;

console.log(
  `\n${failures === 0 ? "All" : `${checks - failures}/${checks}`} Reel transport checks passed.`,
);
if (failures > 0) process.exit(1);
