/**
 * The Facebook and Instagram publisher adapters: scope fail-closed, transport
 * passthrough, the post-publish identity/caption readback, and the insights
 * kind mapping.
 *
 * ==================== HOW IT RUNS WITHOUT A NETWORK ====================
 * The harness `verify-youtube-upload.mjs` established: the modules under test
 * are transpiled into a temp directory with their import specifiers
 * rewritten, and `globalThis.fetch` is REPLACED by a router. Any request the
 * router does not recognise throws `UNROUTED REQUEST` rather than falling
 * through to the network, so this cannot post a Reel to Meta however wrong
 * the code under it is.
 *
 * ==================== WHAT IS ASSERTED ====================
 * Every way this adapter could go wrong that a reader of the source would
 * not notice:
 *
 *   a publish through a connection with NO recorded granted scopes
 *   a publish through a grant missing the one publishing scope
 *   a readback that finds the Reel on the WRONG Page / IG account
 *   a caption that reached Meta different from the caption approved
 *   an unverifiable readback read as a successful publish
 *   `onMediaCreated` not reaching the transport (the risky-window breadcrumb)
 *   an access token appearing in a thrown message
 *   a transport failure kind mislabelled at the port boundary
 *
 * Run: node scripts/verify-meta-adapter.mjs
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
  ['"@/shared/types/marketing-reel"', '"./marketing-reel.mjs"'],
  ['"@/shared/types/marketing-insights"', '"./marketing-insights.mjs"'],
  ['"@/lib/integrations/port"', '"./port.mjs"'],
  ['"./env"', '"./env.mjs"'],
  ['"./graph"', '"./graph.mjs"'],
  ['"./reels"', '"./reels.mjs"'],
  ['"./reel-insights"', '"./reel-insights.mjs"'],
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

const dir = mkdtempSync(join(tmpdir(), "meta-adapter-"));
writeFileSync(join(dir, "server-only.mjs"), "export {};\n");
writeFileSync(
  join(dir, "email-env.mjs"),
  "export function resolveAppBaseUrl() { return { ok: false }; }\n",
);
// The port is types-only; its transpiled output is empty either way.
writeFileSync(join(dir, "port.mjs"), "export {};\n");

transpileInto(dir, "shared/types/marketing-reel.ts", "marketing-reel.mjs");
transpileInto(dir, "shared/types/marketing-insights.ts", "marketing-insights.mjs");
transpileInto(dir, "lib/integrations/facebook/env.ts", "env.mjs");
transpileInto(dir, "lib/integrations/facebook/graph.ts", "graph.mjs");
transpileInto(dir, "lib/integrations/facebook/reels.ts", "reels.mjs");
transpileInto(dir, "lib/integrations/facebook/reel-insights.ts", "reel-insights.mjs");
transpileInto(dir, "lib/integrations/facebook/adapter.ts", "adapter.mjs");

process.env.FACEBOOK_APP_ID = "test-app-id";
process.env.FACEBOOK_APP_SECRET = "test-app-secret";
process.env.FACEBOOK_REDIRECT_URI = "https://altair.test/api/fb/cb";
// Processing-verification knobs: zero budget = exactly one status poll, so
// the stuck-in-processing case returns immediately instead of sleeping.
process.env.META_REEL_PROCESSING_BUDGET_MS = "0";
process.env.META_REEL_PROCESSING_INTERVAL_MS = "10";

const { facebookAdapter, instagramAdapter } = await import(
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
    body: init.body ? String(init.body) : null,
  };
  calls.push(record);
  if (!router) throw new Error(`UNROUTED REQUEST: ${record.method} ${record.url}`);
  const routed = router(record);
  if (!routed) throw new Error(`UNROUTED REQUEST: ${record.method} ${record.url}`);
  return new Response(JSON.stringify(routed.body ?? {}), {
    status: routed.status ?? 200,
    headers: { "content-type": "application/json" },
  });
};

/* ------------------------------------------------------------- fixtures */

const TOKEN = "EAAB-test-page-token-never-in-messages";
const PAGE = "1139900000000000";
const IGU = "17841400000000000";
const FBVID = "fb-video-777";
const CONT = "ig-container-888";
const IGMEDIA = "ig-media-999";
const DESC = "Why is your suction line frosting over?\n\n#HVAC #Superheat";

const FB_SCOPES = ["pages_show_list", "pages_manage_posts", "pages_read_engagement"];
const IG_SCOPES = ["instagram_basic", "instagram_content_publish"];

function publishInput(overrides = {}) {
  return {
    post: {
      connectedAccountId: "acct-1",
      companyId: "co-1",
      providerAccountId: "user-1",
      providerResourceId: PAGE,
      ...(overrides.post ?? {}),
    },
    package: {
      title: null,
      body: DESC,
      hashtags: ["#HVAC"],
      link: null,
      media: [
        {
          url: "https://signed.test/video.mp4",
          expiresAt: new Date(Date.now() + 600000).toISOString(),
          contentType: "video/mp4",
        },
      ],
      ...(overrides.package ?? {}),
    },
    capability: { provider: "facebook" },
    publishCapability: "direct",
    grantedScopes: overrides.grantedScopes ?? FB_SCOPES,
    accessToken: TOKEN,
    ...(overrides.extra ?? {}),
  };
}

/** A fully-finished status payload — every phase terminal and published. */
const STATUS_DONE = {
  status: {
    video_status: "ready",
    uploading_phase: { status: "complete" },
    processing_phase: { status: "complete" },
    publishing_phase: { status: "complete", publish_status: "published", publish_time: 1789400000 },
  },
};

/**
 * The full Facebook happy-path router: 4-phase transport, permalink, the
 * adapter's identity readback, then the post-finish processing poll.
 * `readback` corrupts the identity read; `postFinishStatus` is what the
 * status poll sees AFTER upload_phase=finish (before finish, the router
 * always answers with upload-complete so the transport's own wait passes).
 */
function facebookRouter({ readback, postFinishStatus } = {}) {
  let finishCalled = false;
  return (req) => {
    const u = new URL(req.url);
    if (req.method === "POST" && u.pathname === `/v22.0/${PAGE}/video_reels`) {
      const body = new URLSearchParams(req.body);
      if (body.get("upload_phase") === "start") {
        return { body: { video_id: FBVID, upload_url: `https://rupload.facebook.com/video-upload/v22.0/${FBVID}` } };
      }
      if (body.get("upload_phase") === "finish") finishCalled = true;
      return { body: { success: true } };
    }
    if (req.method === "POST" && u.hostname === "rupload.facebook.com") {
      return { body: { success: true } };
    }
    if (req.method === "GET" && u.pathname === `/v22.0/${FBVID}`) {
      const fields = u.searchParams.get("fields") ?? "";
      if (fields === "status") {
        if (!finishCalled) {
          return { body: { status: { uploading_phase: { status: "complete" } } } };
        }
        return { body: postFinishStatus ?? STATUS_DONE };
      }
      if (fields === "permalink_url") {
        return { body: { permalink_url: `/reel/${FBVID}` } };
      }
      if (fields.includes("from")) {
        return {
          body: readback ?? {
            id: FBVID,
            description: DESC,
            permalink_url: `https://www.facebook.com/reel/${FBVID}`,
            from: { id: PAGE, name: "Altair" },
          },
        };
      }
    }
    return null;
  };
}

function instagramRouter({ readback } = {}) {
  return (req) => {
    const u = new URL(req.url);
    if (req.method === "POST" && u.pathname === `/v22.0/${IGU}/media`) {
      return { body: { id: CONT } };
    }
    if (req.method === "GET" && u.pathname === `/v22.0/${CONT}`) {
      return { body: { status_code: "FINISHED" } };
    }
    if (req.method === "POST" && u.pathname === `/v22.0/${IGU}/media_publish`) {
      return { body: { id: IGMEDIA } };
    }
    if (req.method === "GET" && u.pathname === `/v22.0/${IGMEDIA}`) {
      const fields = u.searchParams.get("fields") ?? "";
      if (fields === "permalink") {
        return { body: { permalink: "https://www.instagram.com/reel/abc/" } };
      }
      if (fields.includes("owner")) {
        return {
          body: readback ?? {
            id: IGMEDIA,
            caption: DESC,
            permalink: "https://www.instagram.com/reel/abc/",
            media_product_type: "REELS",
            owner: { id: IGU },
          },
        };
      }
    }
    return null;
  };
}

async function expectThrow(fn) {
  try {
    await fn();
    return null;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

/* ---------------------------------------------- scope discipline (both) */

console.log("\nScope discipline fails closed, before any provider contact");

for (const [label, adapter, goodScopes, required] of [
  ["facebook", facebookAdapter, FB_SCOPES, "pages_manage_posts"],
  ["instagram", instagramAdapter, IG_SCOPES, "instagram_content_publish"],
]) {
  calls = [];
  router = null; // any fetch would throw UNROUTED
  const emptyErr = await expectThrow(() =>
    adapter.publish(publishInput({ grantedScopes: [], post: { providerResourceId: label === "facebook" ? PAGE : IGU } })),
  );
  check(
    `${label}: empty grantedScopes refuses with zero provider traffic`,
    emptyErr !== null && calls.length === 0 && /granted scopes/i.test(emptyErr.message),
    emptyErr?.message,
  );

  calls = [];
  const missingErr = await expectThrow(() =>
    adapter.publish(
      publishInput({
        grantedScopes: goodScopes.filter((s) => s !== required),
        post: { providerResourceId: label === "facebook" ? PAGE : IGU },
      }),
    ),
  );
  check(
    `${label}: a grant without ${required} refuses with zero provider traffic`,
    missingErr !== null && calls.length === 0 && missingErr.message.includes(required),
    missingErr?.message,
  );

  calls = [];
  const noTarget = await expectThrow(() =>
    adapter.publish(
      publishInput({
        grantedScopes: goodScopes,
        post: { providerResourceId: null },
      }),
    ),
  );
  check(
    `${label}: a connection naming no target resource refuses before any traffic`,
    noTarget !== null && calls.length === 0,
    noTarget?.message,
  );

  calls = [];
  const noVideo = await expectThrow(() =>
    adapter.publish(
      publishInput({
        grantedScopes: goodScopes,
        post: { providerResourceId: label === "facebook" ? PAGE : IGU },
        package: { media: [] },
      }),
    ),
  );
  check(
    `${label}: no video attachment refuses before any traffic`,
    noVideo !== null && calls.length === 0,
    noVideo?.message,
  );
}

/* --------------------------------------------------- facebook happy path */

console.log("\nFacebook publish: proven transport + strict readback");

calls = [];
router = facebookRouter();
const mediaSeen = [];
const fbOutcome = await facebookAdapter.publish(
  publishInput({
    extra: {
      onMediaCreated: async (id) => {
        mediaSeen.push(id);
      },
    },
  }),
);

check(
  "outcome is posted with the video id as the provider post id",
  fbOutcome.outcome === "posted" && fbOutcome.providerPostId === FBVID,
  fbOutcome,
);
check(
  "onMediaCreated fired with the video id BEFORE the finish phase",
  mediaSeen.length === 1 &&
    mediaSeen[0] === FBVID &&
    calls.findIndex((c) => c.body?.includes("upload_phase=finish")) > 0,
  { mediaSeen },
);
check(
  "the description sent to finish is the package body, verbatim",
  calls.some(
    (c) =>
      c.body?.includes("upload_phase=finish") &&
      new URLSearchParams(c.body).get("description") === DESC,
  ),
);
check(
  "the identity readback was actually made (id,description,permalink_url,from)",
  calls.some(
    (c) =>
      c.method === "GET" &&
      c.url.includes(`/${FBVID}?`) &&
      decodeURIComponent(c.url).includes("fields=id,description,permalink_url,from"),
  ),
  calls.map((c) => c.url),
);
check(
  "providerResult records what was verified — and what cannot be",
  fbOutcome.providerResult?.captionVerified === true &&
    fbOutcome.providerResult?.pageId === PAGE &&
    fbOutcome.providerResult?.visibilityVerified === false,
  fbOutcome.providerResult,
);
check(
  "the asynchronous tail is VERIFIED, not assumed: ready + published recorded",
  fbOutcome.providerResult?.processingState === "ready" &&
    fbOutcome.providerResult?.publishStatus === "published" &&
    typeof fbOutcome.providerResult?.processingHistory === "string",
  fbOutcome.providerResult,
);
check(
  "public playback stays UNVERIFIED — no API result may ever claim it",
  fbOutcome.providerResult?.publicPlayback === "UNVERIFIED",
  fbOutcome.providerResult,
);
check(
  "the processing poll happened AFTER finish (status asked again post-finish)",
  (() => {
    const finishAt = calls.findIndex((c) => c.body?.includes("upload_phase=finish"));
    return calls.some(
      (c, i) => i > finishAt && c.method === "GET" && decodeURIComponent(c.url).includes("fields=status"),
    );
  })(),
  calls.map((c) => `${c.method} ${c.url.slice(0, 80)}`),
);
check(
  "permalink comes from the readback",
  fbOutcome.providerPermalink === `https://www.facebook.com/reel/${FBVID}`,
  fbOutcome.providerPermalink,
);

/* ------------------------------------------------ facebook readback rows */

console.log("\nFacebook readback failures are publish failures");

calls = [];
router = facebookRouter({
  readback: { id: FBVID, description: DESC, from: { id: "9999" } },
});
const wrongPage = await expectThrow(() => facebookAdapter.publish(publishInput()));
check(
  "a Reel on the wrong Page throws instead of settling posted",
  wrongPage !== null && wrongPage.message.includes("9999"),
  wrongPage?.message,
);

calls = [];
router = facebookRouter({
  readback: { id: FBVID, description: "something else entirely", from: { id: PAGE } },
});
const wrongCaption = await expectThrow(() => facebookAdapter.publish(publishInput()));
check(
  "a caption that read back different throws (the canary posture)",
  wrongCaption !== null && /caption/i.test(wrongCaption.message),
  wrongCaption?.message,
);

calls = [];
router = facebookRouter({ readback: { id: "different-id" } });
const wrongEcho = await expectThrow(() => facebookAdapter.publish(publishInput()));
check(
  "a readback that returns a different object id throws",
  wrongEcho !== null,
  wrongEcho?.message,
);

console.log("\nThe asynchronous tail: processing failures are publish failures");

calls = [];
router = facebookRouter({
  postFinishStatus: {
    status: {
      video_status: "processing",
      processing_phase: { status: "error", error: { message: "transcode failed" } },
      publishing_phase: { status: "not_started" },
    },
  },
});
const processingError = await expectThrow(() => facebookAdapter.publish(publishInput()));
check(
  "a post-finish processing ERROR throws — never settled as a healthy publish",
  processingError !== null && /FAILED after publish/i.test(processingError.message),
  processingError?.message,
);

calls = [];
router = facebookRouter({
  postFinishStatus: {
    status: {
      video_status: "processing",
      processing_phase: { status: "in_progress" },
      publishing_phase: { status: "not_started" },
    },
  },
});
const stillProcessing = await facebookAdapter.publish(publishInput());
check(
  "still-in-progress at budget: the publish stands but is marked processing, never complete",
  stillProcessing.outcome === "posted" &&
    stillProcessing.providerResult?.processingState === "processing" &&
    stillProcessing.providerResult?.publicPlayback === "UNVERIFIED",
  stillProcessing.providerResult,
);

calls = [];
router = facebookRouter({
  postFinishStatus: {
    status: { video_status: "expired", processing_phase: { status: "complete" } },
  },
});
const expired = await expectThrow(() => facebookAdapter.publish(publishInput()));
check(
  "an EXPIRED object (the historical death mode) throws instead of standing as posted",
  expired !== null,
  expired?.message,
);

check(
  "no thrown message ever contains the access token",
  [wrongPage, wrongCaption, wrongEcho].every(
    (e) => e === null || !e.message.includes(TOKEN),
  ),
);

/* -------------------------------------------------- instagram happy path */

console.log("\nInstagram publish: proven transport + strict readback");

calls = [];
router = instagramRouter();
const igMediaSeen = [];
const igOutcome = await instagramAdapter.publish(
  publishInput({
    grantedScopes: IG_SCOPES,
    post: { providerResourceId: IGU },
    extra: {
      onMediaCreated: async (id) => {
        igMediaSeen.push(id);
      },
    },
  }),
);

check(
  "outcome is posted with the published media id, container as media id",
  igOutcome.outcome === "posted" &&
    igOutcome.providerPostId === IGMEDIA &&
    igOutcome.providerMediaId === CONT,
  igOutcome,
);
check(
  "onMediaCreated fired with the CONTAINER id before media_publish",
  igMediaSeen.length === 1 && igMediaSeen[0] === CONT,
  { igMediaSeen },
);
check(
  "the caption on the container is the package body, verbatim",
  calls.some(
    (c) =>
      c.url.includes(`/${IGU}/media`) &&
      !c.url.includes("media_publish") &&
      new URLSearchParams(c.body ?? "").get("caption") === DESC,
  ),
);
check(
  "the identity readback was made against the published media",
  calls.some(
    (c) =>
      c.method === "GET" &&
      c.url.includes(`/${IGMEDIA}?`) &&
      decodeURIComponent(c.url).includes("owner"),
  ),
);
check(
  "providerResult records the verified facts and the honest bound",
  igOutcome.providerResult?.captionVerified === true &&
    igOutcome.providerResult?.igUserId === IGU &&
    igOutcome.providerResult?.mediaProductType === "REELS" &&
    igOutcome.providerResult?.visibilityVerified === false,
  igOutcome.providerResult,
);

calls = [];
router = instagramRouter({
  readback: { id: IGMEDIA, caption: DESC, owner: { id: "other-account" } },
});
const wrongOwner = await expectThrow(() =>
  instagramAdapter.publish(
    publishInput({ grantedScopes: IG_SCOPES, post: { providerResourceId: IGU } }),
  ),
);
check(
  "media owned by a different account throws instead of settling posted",
  wrongOwner !== null && wrongOwner.message.includes("other-account"),
  wrongOwner?.message,
);

/* ---------------------------------------------------- insights mapping */

console.log("\nfetchInsights maps transport kinds to the port's vocabulary");

router = (req) => {
  const u = new URL(req.url);
  if (u.pathname.endsWith("/video_insights")) {
    return {
      body: {
        data: [
          { name: "fb_reels_total_plays", values: [{ value: 12 }] },
          { name: "post_impressions_unique", values: [{ value: 9 }] },
        ],
      },
    };
  }
  return null;
};
const okInsights = await facebookAdapter.fetchInsights({
  accessToken: TOKEN,
  providerPostId: FBVID,
});
check(
  "a successful read returns ok with the known metrics",
  okInsights.ok === true && okInsights.metrics.length === 2,
  okInsights,
);

router = () => ({
  status: 400,
  body: { error: { message: "Error validating access token", code: 190 } },
});
const authInsights = await instagramAdapter.fetchInsights({
  accessToken: TOKEN,
  providerPostId: IGMEDIA,
});
check(
  "a dead token maps to the port's 'unauthorized'",
  authInsights.ok === false && authInsights.kind === "unauthorized",
  authInsights,
);

router = () => ({
  status: 400,
  body: { error: { message: "(#4) Application request limit reached", code: 4 } },
});
const throttled = await facebookAdapter.fetchInsights({
  accessToken: TOKEN,
  providerPostId: FBVID,
});
check(
  "throttling maps to 'not_ready' — retry later, never an alarm",
  throttled.ok === false && throttled.kind === "not_ready",
  throttled,
);

router = () => ({ body: { data: [] } });
const fresh = await instagramAdapter.fetchInsights({
  accessToken: TOKEN,
  providerPostId: IGMEDIA,
});
check(
  "a too-fresh post (HTTP 200, empty data) maps to 'not_ready'",
  fresh.ok === false && fresh.kind === "not_ready",
  fresh,
);

/* ------------------------------------------------------------- identity */

console.log("\nAdapter identity");

check(
  "facebookAdapter names its provider and kind",
  facebookAdapter.provider === "facebook" && facebookAdapter.kind === "publisher",
);
check(
  "instagramAdapter names its provider and kind",
  instagramAdapter.provider === "instagram" && instagramAdapter.kind === "publisher",
);
check(
  "neither adapter implements a refresh hop — Page tokens do not refresh",
  facebookAdapter.refreshCredential === undefined &&
    instagramAdapter.refreshCredential === undefined,
);

globalThis.fetch = realFetch;

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
