/**
 * Supervised Facebook + Instagram distribution for ONE approved HVAC Short.
 *
 * ===================== WHAT THIS IS =====================
 * The Meta sibling of `youtube-canary.mjs`: a one-shot operator command that
 * publishes one already-approved Short to the Facebook Page and/or the
 * linked Instagram professional account THROUGH `dispatchPublish` — the
 * gate, the recorded approval, the claim, the adapter's identity/caption
 * readback, and the settled ledger row. It is not a cron, a queue runner,
 * or a publishing feature; it runs when a person types it, and exits.
 *
 * ===================== META PUBLISHES ARE PUBLIC =====================
 * Meta's Reel APIs have no private, draft or scheduled mode — the finish
 * phase is the moment the Reel is live on the real Page/account. That is
 * why FOUR keys stand between this script and a post, same as YouTube:
 *
 *   1. --apply            dry-run is the default
 *   2. --confirm          must match the Supabase project ref
 *   3. the kill switch    MARKETING_PUBLISH_MODE=live, checked by the gate
 *   4. the approval       a real marketing_publish_jobs row naming a real
 *                         owner/admin and a real instant, per provider
 *
 * ===================== ATTRIBUTION =====================
 * The media asset is stored under source_job_id `hvac-short-<shortId>`,
 * which is what `getRenderJobForMarketingPost` returns verbatim — so the
 * existing Reel insights collector attributes every metric row to the Short
 * with no changes to the collector.
 *
 * ===================== PER-PLATFORM INDEPENDENCE =====================
 * Facebook and Instagram are dispatched separately: their own posts, their
 * own approved jobs, their own delivery claims. One platform's failure
 * never rolls back or blocks the other; each writes its own
 * `distribution-<provider>.json` beside the MP4, and the exit code is
 * non-zero if any ATTEMPTED platform genuinely failed (the duplicate guard
 * refusing a re-run is success, not failure).
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/short-distribute.mjs \
 *        --confirm <project-ref> \
 *        --video ui-audit/shorts/<short>/<version>/<short>-<version>.mp4 \
 *        --approved-by you@example.com \
 *        [--platforms facebook,instagram] [--apply]
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { dispatchPublish } from "@/lib/publishing/dispatch";
import { createMediaReadGrant } from "@/lib/media/marketing-media-storage";
import { buildMediaObjectKey } from "@/shared/types/marketing-media";
import { deriveMarketingChannelState } from "@/shared/types/marketing-channel-connection";
import { capabilityFor } from "@/shared/types/integration-capability";
import { isFacebookOAuthConfigured, metaDataAccessWarning } from "@/lib/integrations/facebook/env";

const ROOT = path.resolve(import.meta.dirname, "..");
const ENV_PATH = path.join(ROOT, ".env.local");

/* ------------------------------------------------------------------ env */

function loadEnvLocal() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(ENV_PATH, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const i = line.indexOf("=");
        const key = line.slice(0, i).trim();
        let value = line.slice(i + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        return [key, value];
      }),
  );
}

for (const [key, value] of Object.entries(loadEnvLocal())) {
  if (process.env[key] === undefined) process.env[key] = value;
}

/* ----------------------------------------------------------------- args */

const argv = process.argv.slice(2);
const flag = (name) => {
  const withEquals = argv.find((a) => a.startsWith(`--${name}=`));
  if (withEquals) return withEquals.slice(name.length + 3).trim();
  const i = argv.indexOf(`--${name}`);
  if (i > -1 && argv[i + 1] && !argv[i + 1].startsWith("--")) {
    return argv[i + 1].trim();
  }
  return undefined;
};
const has = (name) => argv.includes(`--${name}`);

const APPLY = has("apply");
const CONFIRM = flag("confirm");
const VIDEO = flag("video");
const APPROVER = flag("approved-by");
const PUBLISHING_FILE = flag("publishing-file");
const PLATFORMS_FLAG = (flag("platforms") ?? "facebook,instagram")
  .split(",")
  .map((p) => p.trim().toLowerCase())
  .filter(Boolean);

/** Same discipline as the canary: infrastructure language never ships. */
const INTERNAL_MARKERS = ["canary", "supervised private upload", "privacy upload", "upload test"];

/* ------------------------------------------------------------- reporting */

let failed = false;
const fail = (message, detail) => {
  failed = true;
  console.error(`\nREFUSED: ${message}`);
  if (detail !== undefined) console.error(detail);
};
const step = (message) => console.log(`  ${message}`);
const heading = (message) => console.log(`\n${message}`);

function die() {
  console.error("\nNothing was published and nothing was written.\n");
  process.exit(1);
}

/* ============================================================= PREFLIGHT */

heading("Preflight");

if (!CONFIRM) fail("--confirm <project-ref> is required.");
if (!VIDEO) fail("--video <path-to-mp4> is required.");
if (!APPROVER) {
  fail(
    "--approved-by <email> is required.",
    "The approval recorded on each job names a real person.",
  );
}
const UNKNOWN_PLATFORMS = PLATFORMS_FLAG.filter(
  (p) => p !== "facebook" && p !== "instagram",
);
if (UNKNOWN_PLATFORMS.length > 0 || PLATFORMS_FLAG.length === 0) {
  fail(
    `--platforms accepts facebook and/or instagram; got '${PLATFORMS_FLAG.join(",")}'.`,
    "YouTube goes through youtube-canary.mjs; TikTok is not configured on this deployment.",
  );
}
if (failed) die();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!SUPABASE_URL || !SERVICE_KEY) {
  fail("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.");
  die();
}

const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== CONFIRM) {
  fail(
    `--confirm ${CONFIRM} does not match the configured project.`,
    `The environment points at '${projectRef}'.`,
  );
  die();
}
step(`project           ${projectRef}`);

const publishMode = process.env.MARKETING_PUBLISH_MODE ?? "(unset)";
if (publishMode !== "live") {
  fail(
    `MARKETING_PUBLISH_MODE is '${publishMode}', not 'live'.`,
    "Publishing is disarmed. Arm it deliberately for this run, then disarm it immediately afterwards.",
  );
  die();
}
step(`publish mode      live`);

if (!isFacebookOAuthConfigured()) {
  fail("Facebook OAuth is not configured on this deployment.");
  die();
}

const accessWarning = metaDataAccessWarning(new Date().toISOString());
if (accessWarning) console.warn(`\n  WARNING: ${accessWarning}\n`);

/* ------------------------------------------------------------- the video */

const videoPath = path.resolve(VIDEO);
if (!fs.existsSync(videoPath)) {
  fail(`No file at ${videoPath}`);
  die();
}
const videoStat = fs.statSync(videoPath);
if (!videoStat.isFile() || videoStat.size === 0 || !videoPath.toLowerCase().endsWith(".mp4")) {
  fail(`${videoPath} must be a non-empty .mp4 file.`);
  die();
}
step(`video             ${path.basename(videoPath)} (${videoStat.size} bytes)`);

/* ----------------------------------------------- the publishing contract */

const sidecarPath = PUBLISHING_FILE
  ? path.resolve(PUBLISHING_FILE)
  : path.join(path.dirname(videoPath), "publishing.json");

if (!fs.existsSync(sidecarPath)) {
  fail(
    `No publishing sidecar at ${sidecarPath}.`,
    "Distribution copy comes from the render pipeline's publishing.json — there are no ad-hoc captions.",
  );
  die();
}

let sidecar;
try {
  sidecar = JSON.parse(fs.readFileSync(sidecarPath, "utf8"));
} catch (error) {
  fail(`Could not parse ${sidecarPath}.`, String(error));
  die();
}
step(`publishing        ${sidecarPath}`);

const SHORT_ID = typeof sidecar.shortId === "string" ? sidecar.shortId.trim() : "";
if (!SHORT_ID) {
  fail(`${sidecarPath} names no shortId — attribution would be impossible.`);
  die();
}

/**
 * Per-platform captions are REQUIRED sidecar fields, not fallbacks quietly
 * derived here. The render pipeline writes them (facebookCaption,
 * instagramCaption); a sidecar without them predates that contract and the
 * fix is to regenerate the sidecar, not to improvise copy at publish time.
 */
const CAPTIONS = {
  facebook: typeof sidecar.facebookCaption === "string" ? sidecar.facebookCaption.trim() : "",
  instagram: typeof sidecar.instagramCaption === "string" ? sidecar.instagramCaption.trim() : "",
};
const HASHTAGS = Array.isArray(sidecar.hashtags)
  ? sidecar.hashtags.filter((h) => typeof h === "string")
  : [];

for (const platform of PLATFORMS_FLAG) {
  const caption = CAPTIONS[platform];
  if (!caption) {
    fail(
      `${sidecarPath} lacks a ${platform}Caption string.`,
      "Regenerate the sidecar with the current render pipeline; captions are part of the approved contract.",
    );
    die();
  }
  const lower = caption.toLowerCase();
  const marker = INTERNAL_MARKERS.find((m) => lower.includes(m));
  if (marker !== undefined) {
    fail(`The ${platform} caption contains internal language ("${marker}").`);
    die();
  }
  const cap = capabilityFor(platform);
  if (caption.length > cap.bodyMaxChars) {
    fail(
      `The ${platform} caption is ${caption.length} chars; ${cap.label} allows ${cap.bodyMaxChars}.`,
    );
    die();
  }
  step(`${platform.padEnd(10)}        ${caption.length} chars — "${caption.split(/\s+/).slice(0, 8).join(" ")}…"`);
}

/* --------------------------------------------------------------- client */

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ------------------------------------------------ the connected account */

// ONE Facebook Page connection carries both platforms: Instagram publishes
// through the linked professional account using the same Page token.
const accountsQuery = await supabase
  .from("marketing_connected_accounts")
  .select(
    "id, company_id, provider, provider_account_id, provider_account_name, provider_resource_id, provider_resource_name, status, integration_kind, granted_scopes, publish_capability, capability_detail, token_expires_at, last_error, metadata",
  )
  .eq("provider", "facebook")
  .eq("status", "connected");

if (accountsQuery.error) {
  fail("Could not read connected accounts.", accountsQuery.error.message);
  die();
}
const accounts = (accountsQuery.data ?? []).filter((a) => a.provider_resource_id);
if (accounts.length === 0) {
  fail("No connected Facebook Page exists.", "Connect one at Settings → Integrations first.");
  die();
}
if (accounts.length > 1) {
  fail(
    `${accounts.length} connected Facebook Pages exist, so the destination is ambiguous.`,
    accounts.map((a) => `  ${a.id}  ${a.provider_resource_name}`).join("\n"),
  );
  die();
}
const account = accounts[0];
const IG_USER_ID = (account.metadata?.instagramBusinessAccountId ?? "").toString().trim();

step(`company           ${account.company_id}`);
step(`page              ${account.provider_resource_id} (${account.provider_resource_name})`);
if (PLATFORMS_FLAG.includes("instagram")) {
  if (!IG_USER_ID) {
    fail(
      "This Page has no linked Instagram professional account recorded.",
      "Reconnect Facebook so the link is discovered, or drop instagram from --platforms.",
    );
    die();
  }
  step(`instagram         ${IG_USER_ID}`);
}

// The GRANT is the evidence, and empty fails closed — the adapter refuses
// too; this preflight just says it legibly before any row is written.
const grantedScopes = account.granted_scopes ?? [];
const REQUIRED_SCOPES = { facebook: "pages_manage_posts", instagram: "instagram_content_publish" };
for (const platform of PLATFORMS_FLAG) {
  if (!grantedScopes.includes(REQUIRED_SCOPES[platform])) {
    fail(
      `The connection's recorded grant does not include ${REQUIRED_SCOPES[platform]}.`,
      grantedScopes.length === 0
        ? "granted_scopes is EMPTY on this row. Backfill it from a live debug_token read, or reconnect the Page."
        : `recorded: ${grantedScopes.join(", ")}`,
    );
    die();
  }
}
step(`grants            ${PLATFORMS_FLAG.map((p) => REQUIRED_SCOPES[p]).join(", ")} recorded`);

const secretQuery = await supabase
  .from("marketing_connected_account_secrets")
  .select("refresh_token_encrypted")
  .eq("connected_account_id", account.id)
  .maybeSingle();
if (secretQuery.error || !secretQuery.data) {
  fail("This connection has no stored credential.", secretQuery.error?.message ?? "Reconnect Facebook.");
  die();
}

const nowIso = new Date().toISOString();
const facts = {
  status: account.status,
  publishCapability: account.publish_capability,
  tokenExpiresAt: account.token_expires_at,
  hasRefreshToken: Boolean(secretQuery.data.refresh_token_encrypted),
  lastError: account.last_error,
  capabilityDetail: account.capability_detail,
  accountName: account.provider_account_name,
  resourceName: account.provider_resource_name,
};
const channelState = deriveMarketingChannelState({ configured: true, account: facts, nowIso });
step(`connection state  ${channelState}`);
if (!["DIRECT_PUBLISH_READY", "TOKEN_EXPIRED"].includes(channelState)) {
  fail(`The connection is ${channelState}.`, "Fix it on Settings → Integrations, then re-run.");
  die();
}

/* ------------------------------------------------------------ the human */

const approverQuery = await supabase
  .from("profiles")
  .select("id, email")
  .eq("email", APPROVER.toLowerCase())
  .maybeSingle();
if (approverQuery.error || !approverQuery.data) {
  fail(`No profile exists for ${APPROVER}.`, approverQuery.error?.message);
  die();
}
const approver = approverQuery.data;

const membershipQuery = await supabase
  .from("company_memberships")
  .select("role, status")
  .eq("company_id", account.company_id)
  .eq("user_id", approver.id)
  .maybeSingle();
const membership = membershipQuery.data;
if (
  membershipQuery.error ||
  !membership ||
  !["owner", "admin"].includes(membership.role) ||
  membership.status !== "active"
) {
  fail(`${APPROVER} is not an active owner or admin of this company, so cannot approve a publish.`);
  die();
}
step(`approver          ${approver.email} (${membership.role})`);

/* ------------------------------------------------------------- dry run */

// The attribution identity. `getRenderJobForMarketingPost` returns this
// string verbatim, which is how the insights collector links every metric
// row back to the Short without being modified.
const SOURCE_JOB_ID = `hvac-short-${SHORT_ID}`;
const objectKey = buildMediaObjectKey({
  companyId: account.company_id,
  sourceJobId: SOURCE_JOB_ID,
});

heading("Plan");
step(`short             ${SHORT_ID}`);
step(`source job id     ${SOURCE_JOB_ID}`);
step(`platforms         ${PLATFORMS_FLAG.join(", ")}`);
step(`visibility        PUBLIC ON PUBLISH — Meta has no private mode`);

if (!APPLY) {
  console.log(
    "\nDRY RUN — nothing was published and nothing was written.\n" +
      "Re-run with --apply to publish. Meta Reels are PUBLIC the moment they publish.\n",
  );
  process.exit(0);
}

/* ============================================================== APPLY */

heading("Applying");

const videoBytes = fs.readFileSync(videoPath);
const videoSha256 = crypto.createHash("sha256").update(videoBytes).digest("hex");
const upload = await supabase.storage
  .from("marketing-media")
  .upload(objectKey, videoBytes, { contentType: "video/mp4", upsert: true });
if (upload.error) {
  fail("Could not upload the video to storage.", upload.error.message);
  die();
}
step(`uploaded          ${objectKey}`);

// ONE media asset per Short, shared by both platform posts — its
// source_job_id is the attribution every collector walks back to.
const assetUpsert = await supabase
  .from("marketing_media_assets")
  .upsert(
    {
      company_id: account.company_id,
      source_job_id: SOURCE_JOB_ID,
      bucket: "marketing-media",
      object_key: objectKey,
      content_type: "video/mp4",
      byte_size: videoStat.size,
      client_reported_sha256: videoSha256,
      upload_state: "stored",
      stored_at: nowIso,
    },
    { onConflict: "company_id,source_job_id" },
  )
  .select("id")
  .single();
if (assetUpsert.error) {
  fail("Could not record the media asset.", assetUpsert.error.message);
  die();
}
const mediaAssetId = assetUpsert.data.id;
step(`media asset       ${mediaAssetId}`);

/* ------------------------------------------- one platform, independently */

async function distributeTo(platform) {
  const summary = { platform, ok: false };
  const caption = CAPTIONS[platform];
  const providerResourceId = platform === "facebook" ? account.provider_resource_id : IG_USER_ID;

  heading(`${platform}: post, approval, dispatch`);

  const existingPost = await supabase
    .from("marketing_posts")
    .select("id")
    .eq("company_id", account.company_id)
    .eq("video_media_asset_id", mediaAssetId)
    .eq("channel_target", platform)
    .is("deleted_at", null)
    .maybeSingle();
  if (existingPost.error) {
    summary.error = `post lookup: ${existingPost.error.message}`;
    return summary;
  }

  let postId = existingPost.data?.id;
  if (!postId) {
    const postInsert = await supabase
      .from("marketing_posts")
      .insert({
        company_id: account.company_id,
        title: typeof sidecar.youtubeTitle === "string" ? sidecar.youtubeTitle : SHORT_ID,
        channel_target: platform,
        post_text: caption,
        status: "ready",
        source_type: "other",
        video_media_asset_id: mediaAssetId,
        created_by: approver.id,
      })
      .select("id")
      .single();
    if (postInsert.error) {
      summary.error = `post insert: ${postInsert.error.message}`;
      return summary;
    }
    postId = postInsert.data.id;
  }
  summary.marketingPostId = postId;
  step(`post              ${postId}`);

  const jobUpsert = await supabase
    .from("marketing_publish_jobs")
    .upsert(
      {
        company_id: account.company_id,
        marketing_post_id: postId,
        provider: platform,
        connected_account_id: account.id,
        job_state: "approved",
        requires_approval: true,
        approved_by: approver.id,
        approved_at: nowIso,
        max_attempts: capabilityFor(platform).maxAttempts,
      },
      { onConflict: "company_id,marketing_post_id,provider" },
    )
    .select("id, approved_at")
    .single();
  if (jobUpsert.error) {
    summary.error = `job upsert: ${jobUpsert.error.message}`;
    return summary;
  }
  step(`job               ${jobUpsert.data.id} approved ${jobUpsert.data.approved_at}`);

  const grant = await createMediaReadGrant({
    companyId: account.company_id,
    objectKey,
    contentType: "video/mp4",
    byteSize: videoStat.size,
    expectedSha256: videoSha256,
    nowMs: Date.now(),
  });
  if (grant.error || !grant.grant) {
    summary.error = `read grant: ${grant.error}`;
    return summary;
  }

  const result = await dispatchPublish({
    account: {
      connectedAccountId: account.id,
      companyId: account.company_id,
      provider: platform,
      integrationKind: account.integration_kind ?? "publisher",
      providerAccountId: account.provider_account_id,
      providerResourceId,
      grantedScopes,
      facts,
    },
    marketingPostId: postId,
    jobApprovedAt: jobUpsert.data.approved_at,
    title: null,
    body: caption,
    hashtags: HASHTAGS,
    link: null,
    media: [grant.grant],
    nowIso: new Date().toISOString(),
    configured: true,
    // No `env` — the gate reads the real environment.
  });

  if (!result.ok) {
    summary.refusal = result.refusal;
    summary.detail = result.detail;
    // The duplicate guard refusing a re-run means the Reel already exists —
    // report it as standing history, not as a failure to retry.
    summary.ok = result.refusal === "NOT_CLAIMED";
    console.error(`  outcome           REFUSED (${result.refusal})`);
    console.error(`  detail            ${result.detail}`);
    return summary;
  }

  summary.ok = true;
  summary.deliveryId = result.deliveryId;
  summary.providerPostId = result.outcome.providerPostId;
  summary.providerMediaId = result.outcome.providerMediaId;
  summary.permalink = result.outcome.providerPermalink ?? null;
  summary.providerResult = result.outcome.providerResult ?? {};
  console.log(`  outcome           ${result.outcome.outcome}`);
  console.log(`  provider post id  ${result.outcome.providerPostId}`);
  console.log(`  permalink         ${result.outcome.providerPermalink ?? "(not yet available)"}`);
  console.log(`  caption verified  ${summary.providerResult.captionVerified === true}`);
  return summary;
}

const results = [];
for (const platform of PLATFORMS_FLAG) {
  // Sequential on purpose (they share one token and one quota bucket), but
  // INDEPENDENT: a throw from one platform is caught here so the next one
  // still runs, and nothing ever rolls back a Reel that already published.
  try {
    results.push(await distributeTo(platform));
  } catch (error) {
    results.push({
      platform,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
    console.error(`  ${platform} distribution threw:`, error instanceof Error ? error.message : error);
  }
}

/* ------------------------------------------------------------- results */

heading("Distribution results");

for (const r of results) {
  const resultPath = path.join(
    path.dirname(videoPath),
    `distribution-${r.platform}.json`,
  );
  // The per-Reel debugging record (structured-logging brief, 2026-09-14):
  // enough identity, provenance and state history that a future failure can
  // be diagnosed from this file alone — and never a token.
  const record = {
    shortId: SHORT_ID,
    platform: r.platform,
    sourceJobId: SOURCE_JOB_ID,
    ok: r.ok,
    sourceFile: path.basename(videoPath),
    sourceSha256: videoSha256,
    sourceBytes: videoStat.size,
    marketingPostId: r.marketingPostId ?? null,
    deliveryId: r.deliveryId ?? null,
    providerPostId: r.providerPostId ?? null,
    providerMediaId: r.providerMediaId ?? null,
    permalink: r.permalink ?? null,
    captionVerified: r.providerResult?.captionVerified === true,
    captionSha256: crypto.createHash("sha256").update(CAPTIONS[r.platform] ?? "").digest("hex"),
    // Honest bound, carried into the record the platform reads back:
    // Meta exposes no visibility field, and a published Reel is public.
    visibilityVerified: false,
    // The asynchronous tail, from the adapter's post-finish verification.
    processingState: r.providerResult?.processingState ?? null,
    publishStatus: r.providerResult?.publishStatus ?? null,
    publishTime: r.providerResult?.publishTime ?? null,
    processingHistory: r.providerResult?.processingHistory ?? null,
    // Flipped only by a human looking from a normal account — never here.
    externalPlayback: "AWAITING_HUMAN_CHECK",
    publishedAt: r.ok && r.providerPostId ? new Date().toISOString() : null,
    refusal: r.refusal ?? null,
    detail: r.detail ?? r.error ?? null,
    recordedAt: new Date().toISOString(),
  };
  fs.writeFileSync(resultPath, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`  ${r.platform.padEnd(10)} ${r.ok ? "OK" : "FAILED"}  → ${resultPath}`);
}

console.log(
  "\nDisarm publishing now: set MARKETING_PUBLISH_MODE=off (or remove it).\n",
);

process.exit(results.every((r) => r.ok) ? 0 : 1);
