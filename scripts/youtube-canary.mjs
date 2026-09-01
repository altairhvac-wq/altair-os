/**
 * The supervised YouTube private-upload canary.
 *
 * ===================== WHAT THIS IS =====================
 * A one-shot operator command that performs ONE private YouTube upload
 * through the ordinary publishing path, so the first real upload happens
 * with a human watching it rather than as a side effect of a scheduler.
 *
 * It is NOT a cron, a queue runner, a worker, or a publishing feature. It
 * runs once, in a terminal, when a person types it, and exits.
 *
 * ===================== WHAT IT DOES NOT BYPASS =====================
 * Every control stays exactly where it was. This script assembles real rows
 * and then calls `dispatchPublish`, which is the same function any future
 * caller would use:
 *
 *   the kill switch      `MARKETING_PUBLISH_MODE=live`, checked by the gate
 *                        from the environment on every call. This script
 *                        also refuses early, so the operator gets a clear
 *                        message instead of a gate refusal buried in output.
 *   the approval         a real `marketing_publish_jobs` row with
 *                        `approved_by` pointing at a REAL profile that is an
 *                        owner or admin of the company, and a real
 *                        `approved_at` instant. Not a synthesised id, not a
 *                        boolean, not a gate parameter.
 *   the duplicate guard  `claimDelivery` and 143's unique constraint. Run
 *                        this twice and the second run cannot reach YouTube.
 *   privacy              the adapter's, unchanged: uploaded private, and
 *                        then READ BACK to prove it is private. A failed
 *                        readback is a failed publish.
 *
 * Nothing here passes `env` into the gate, so the gate resolves the publish
 * mode from the real environment and this script cannot assert its way past
 * it.
 *
 * ===================== SAFETY =====================
 *   --dry-run is the default. --apply is required to write or upload.
 *   --confirm <project-ref> must match the Supabase project the environment
 *     points at, so the wrong project cannot be hit by accident.
 *   Provider is hardcoded to `youtube`. There is no provider argument.
 *   Every refusal happens BEFORE any row is written or any byte uploaded.
 *
 * Run:
 *   node --experimental-strip-types \
 *        --import ./scripts/lib/ts-alias-loader-register.mjs \
 *        scripts/youtube-canary.mjs \
 *        --confirm <project-ref> \
 *        --video ./tmp/canary.mp4 \
 *        --approved-by you@example.com \
 *        [--apply]
 */

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { dispatchPublish } from "@/lib/publishing/dispatch";
import { createMediaReadGrant } from "@/lib/media/marketing-media-storage";
import { buildMediaObjectKey } from "@/shared/types/marketing-media";
import { deriveMarketingChannelState } from "@/shared/types/marketing-channel-connection";
import { capabilityFor } from "@/shared/types/integration-capability";
import { isYouTubeOAuthConfigured } from "@/lib/integrations/youtube/env";
import { REQUIRED_UPLOAD_SCOPE } from "@/lib/integrations/youtube/publish-guard";

const PROVIDER = "youtube";
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

// Loaded into process.env because the modules under test read it there —
// `createServiceRoleClient`, the gate's publish mode, the YouTube config.
// Existing values win: an operator who exported something on the command
// line meant it.
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
const TITLE = flag("title") ?? "Altair canary — private upload test";

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
  console.error("\nNothing was uploaded and nothing was written.\n");
  process.exit(1);
}

/* ============================================================= PREFLIGHT */

heading("Preflight");

if (!CONFIRM) {
  fail(
    "--confirm <project-ref> is required.",
    "It must match the Supabase project this environment points at, so the wrong project cannot be reached by accident.",
  );
}
if (!VIDEO) {
  fail("--video <path-to-mp4> is required.");
}
if (!APPROVER) {
  fail(
    "--approved-by <email> is required.",
    "The approval recorded on the job names a real person. There is no way to run this without one.",
  );
}
if (failed) die();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

if (!SUPABASE_URL || !SERVICE_KEY) {
  fail(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.",
    "Put them in .env.local, or export them for this command.",
  );
  die();
}

// The project this run would actually touch, taken from the URL rather than
// from anything the operator typed twice.
const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
if (projectRef !== CONFIRM) {
  fail(
    `--confirm ${CONFIRM} does not match the configured project.`,
    `The environment points at '${projectRef}'. Re-run with --confirm ${projectRef} if that is genuinely the target.`,
  );
  die();
}
step(`project           ${projectRef}`);

// The kill switch. The gate checks this too, from the environment, on every
// call — this is the early, legible refusal, not a substitute for it.
const publishMode = process.env.MARKETING_PUBLISH_MODE ?? "(unset)";
if (publishMode !== "live") {
  fail(
    `MARKETING_PUBLISH_MODE is '${publishMode}', not 'live'.`,
    "Publishing is disarmed. Arm it deliberately for this run, then disarm it immediately afterwards.",
  );
  die();
}
step(`publish mode      live`);

if (!isYouTubeOAuthConfigured()) {
  fail("YouTube OAuth is not configured on this deployment.");
  die();
}

// The static matrix. If this build does not say private, no upload may start
// and no reconnect would fix it.
const capability = capabilityFor(PROVIDER);
if (capability.defaultVisibility !== "private") {
  fail(
    `The capability matrix says YouTube uploads are '${capability.defaultVisibility}', not 'private'.`,
    "This canary uploads privately only.",
  );
  die();
}
step(`visibility        private (matrix)`);

/* ------------------------------------------------------------- the video */

const videoPath = path.resolve(VIDEO);
if (!fs.existsSync(videoPath)) {
  fail(`No file at ${videoPath}`);
  die();
}
const videoStat = fs.statSync(videoPath);
if (!videoStat.isFile() || videoStat.size === 0) {
  fail(`${videoPath} is not a non-empty file.`);
  die();
}
if (!videoPath.toLowerCase().endsWith(".mp4")) {
  fail("The canary uploads video/mp4 only.", `Got ${path.extname(videoPath)}`);
  die();
}
// The media table's own ceiling (migration 144). Refused here so an operator
// learns before a multi-gigabyte upload starts.
if (videoStat.size > 2_147_483_648) {
  fail("That file is larger than the 2 GB media ceiling.");
  die();
}
step(`video             ${path.basename(videoPath)} (${videoStat.size} bytes)`);

/* --------------------------------------------------------------- client */

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ------------------------------------------------ the connected account */

const accountsQuery = await supabase
  .from("marketing_connected_accounts")
  .select(
    "id, company_id, provider, provider_account_id, provider_account_name, provider_resource_id, provider_resource_name, status, integration_kind, granted_scopes, publish_capability, capability_detail, token_expires_at, last_error",
  )
  .eq("provider", PROVIDER)
  .eq("status", "connected");

if (accountsQuery.error) {
  fail("Could not read connected accounts.", accountsQuery.error.message);
  die();
}

const accounts = accountsQuery.data ?? [];
if (accounts.length === 0) {
  fail("No connected YouTube account exists.", "Connect one at Settings → Integrations first.");
  die();
}
if (accounts.length > 1) {
  // Deliberately refuses rather than picking. A canary that chose a channel
  // on the operator's behalf would upload to a channel nobody named.
  fail(
    `${accounts.length} connected YouTube accounts exist, so the destination is ambiguous.`,
    accounts
      .map((a) => `  ${a.id}  ${a.provider_resource_name ?? a.provider_account_name}`)
      .join("\n"),
  );
  die();
}

const account = accounts[0];
step(`company           ${account.company_id}`);
step(`channel           ${account.provider_resource_id} (${account.provider_account_name})`);

// Upload permission comes from the GRANT, not from being connected.
const grantedScopes = account.granted_scopes ?? [];
if (!grantedScopes.includes(REQUIRED_UPLOAD_SCOPE)) {
  fail(
    "This YouTube connection does not hold upload permission.",
    "Reconnect YouTube and leave the upload permission ticked on Google's consent screen.",
  );
  die();
}
step(`upload scope      granted`);

if (account.publish_capability !== "direct") {
  fail(
    `This connection's publish capability is '${account.publish_capability}', not 'direct'.`,
    account.capability_detail ?? "Re-check the connection on Settings → Integrations.",
  );
  die();
}

// Whether a refresh is possible at all, read rather than assumed.
const secretQuery = await supabase
  .from("marketing_connected_account_secrets")
  .select("refresh_token_encrypted")
  .eq("connected_account_id", account.id)
  .maybeSingle();

if (secretQuery.error) {
  fail("Could not read the stored credential.", secretQuery.error.message);
  die();
}
if (!secretQuery.data) {
  fail("This connection has no stored credential.", "Reconnect YouTube.");
  die();
}
const hasRefreshToken = Boolean(secretQuery.data.refresh_token_encrypted);

const nowIso = new Date().toISOString();
const facts = {
  status: account.status,
  publishCapability: account.publish_capability,
  tokenExpiresAt: account.token_expires_at,
  hasRefreshToken,
  lastError: account.last_error,
  capabilityDetail: account.capability_detail,
  accountName: account.provider_account_name,
  resourceName: account.provider_resource_name,
};

const channelState = deriveMarketingChannelState({
  configured: true,
  account: facts,
  nowIso,
});
step(`connection state  ${channelState}`);

if (channelState !== "DIRECT_PUBLISH_READY") {
  // DRAFT_UPLOAD_ONLY would pass `canAcceptContent`, but YouTube has no
  // draft mode this platform can reach, so for this canary it is a refusal.
  fail(
    `The connection is ${channelState}, not DIRECT_PUBLISH_READY.`,
    "Fix the connection on Settings → Integrations, then re-run.",
  );
  die();
}

/* ------------------------------------------------------------ the human */

const approverQuery = await supabase
  .from("profiles")
  .select("id, email")
  .eq("email", APPROVER.toLowerCase())
  .maybeSingle();

if (approverQuery.error) {
  fail("Could not look up the approver.", approverQuery.error.message);
  die();
}
if (!approverQuery.data) {
  fail(`No profile exists for ${APPROVER}.`);
  die();
}
const approver = approverQuery.data;

// The approval must come from someone who could actually approve. This
// mirrors the write side of `marketing_connected_accounts` RLS: owner/admin.
const membershipQuery = await supabase
  .from("company_memberships")
  .select("role, status")
  .eq("company_id", account.company_id)
  .eq("user_id", approver.id)
  .maybeSingle();

if (membershipQuery.error) {
  fail("Could not verify the approver's membership.", membershipQuery.error.message);
  die();
}
const membership = membershipQuery.data;
// Both the role AND the membership status matter: an invited-but-not-active
// owner has the title and not the standing, and `is_active_company_member`
// — the helper every RLS policy on this data uses — checks status too.
if (
  !membership ||
  !["owner", "admin"].includes(membership.role) ||
  membership.status !== "active"
) {
  fail(
    `${APPROVER} is not an active owner or admin of this company, so cannot approve a publish.`,
    membership
      ? `role: ${membership.role}, status: ${membership.status}`
      : "no membership row",
  );
  die();
}
step(`approver          ${approver.email} (${membership.role})`);

/* ------------------------------------------------------------- dry run */

// One deterministic identity for the whole canary, so every row this creates
// is found rather than duplicated on a second run.
const SOURCE_JOB_ID = `canary-youtube-${account.company_id.slice(0, 8)}`;
const objectKey = buildMediaObjectKey({
  companyId: account.company_id,
  sourceJobId: SOURCE_JOB_ID,
});

heading("Plan");
step(`media object      ${objectKey}`);
step(`source job id     ${SOURCE_JOB_ID}`);
step(`post title        ${TITLE}`);
step(`privacy           private`);
step(`destination       ${account.provider_resource_id}`);

if (!APPLY) {
  console.log(
    "\nDRY RUN — nothing was uploaded and nothing was written.\n" +
      "Re-run with --apply to perform the upload.\n",
  );
  process.exit(0);
}

/* ============================================================== APPLY */

heading("Applying");

// -------------------------------------------------------- storage upload
const videoBytes = fs.readFileSync(videoPath);
const upload = await supabase.storage
  .from("marketing-media")
  .upload(objectKey, videoBytes, {
    contentType: "video/mp4",
    // Idempotent: a second run replaces the same object rather than
    // creating a second one under a new name.
    upsert: true,
  });

if (upload.error) {
  fail("Could not upload the video to storage.", upload.error.message);
  die();
}
step(`uploaded          ${objectKey}`);

// ---------------------------------------------------------- media asset
// unique (company_id, source_job_id) makes this idempotent in the database.
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

// ----------------------------------------------------------------- post
// No natural unique key, so it is looked up by the asset it publishes.
const existingPost = await supabase
  .from("marketing_posts")
  .select("id")
  .eq("company_id", account.company_id)
  .eq("video_media_asset_id", mediaAssetId)
  .eq("channel_target", PROVIDER)
  .is("deleted_at", null)
  .maybeSingle();

if (existingPost.error) {
  fail("Could not look up an existing canary post.", existingPost.error.message);
  die();
}

let postId = existingPost.data?.id;
if (!postId) {
  const postInsert = await supabase
    .from("marketing_posts")
    .insert({
      company_id: account.company_id,
      title: TITLE,
      channel_target: PROVIDER,
      post_text: "Supervised private upload canary.",
      status: "ready",
      source_type: "other",
      video_media_asset_id: mediaAssetId,
      created_by: approver.id,
    })
    .select("id")
    .single();

  if (postInsert.error) {
    fail("Could not create the canary post.", postInsert.error.message);
    die();
  }
  postId = postInsert.data.id;
}
step(`post              ${postId}`);

// ------------------------------------------------------------------ job
// THE APPROVAL. A real row, a real approver, a real instant. `unique
// (company_id, marketing_post_id, provider)` makes a second run reuse it.
const jobUpsert = await supabase
  .from("marketing_publish_jobs")
  .upsert(
    {
      company_id: account.company_id,
      marketing_post_id: postId,
      provider: PROVIDER,
      connected_account_id: account.id,
      job_state: "approved",
      requires_approval: true,
      approved_by: approver.id,
      approved_at: nowIso,
      max_attempts: capability.maxAttempts,
    },
    { onConflict: "company_id,marketing_post_id,provider" },
  )
  .select("id, approved_at, approved_by")
  .single();

if (jobUpsert.error) {
  fail("Could not create the approved publish job.", jobUpsert.error.message);
  die();
}
const job = jobUpsert.data;
step(`job               ${job.id}`);
step(`approved_at       ${job.approved_at}`);

// ----------------------------------------------------------- read grant
const grant = await createMediaReadGrant({
  companyId: account.company_id,
  objectKey,
  contentType: "video/mp4",
  byteSize: videoStat.size,
  nowMs: Date.now(),
});

if (grant.error || !grant.grant) {
  fail("Could not mint a read grant for the video.", grant.error);
  die();
}
step(`read grant        minted, expires ${grant.grant.expiresAt}`);

/* --------------------------------------------------------- the dispatch */

heading("Dispatching through the ordinary publish path");

const result = await dispatchPublish({
  account: {
    connectedAccountId: account.id,
    companyId: account.company_id,
    provider: PROVIDER,
    integrationKind: account.integration_kind ?? "publisher",
    providerAccountId: account.provider_account_id,
    providerResourceId: account.provider_resource_id,
    grantedScopes,
    facts,
  },
  marketingPostId: postId,
  // Read back from the row that was just written, not from a local variable:
  // what the gate sees is what the database holds.
  jobApprovedAt: job.approved_at,
  title: TITLE,
  body: "Supervised private upload canary.",
  hashtags: [],
  link: null,
  media: [grant.grant],
  nowIso: new Date().toISOString(),
  configured: true,
  // No `env` — the gate resolves the publish mode from the real environment
  // and this script cannot assert its way past it.
});

/* ------------------------------------------------------------- results */

heading("Result");

if (!result.ok) {
  console.error(`  outcome           REFUSED (${result.refusal})`);
  console.error(`  detail            ${result.detail}`);
  console.error(`  safe to retry     ${result.safeToRetry}`);

  if (result.refusal === "NOT_CLAIMED") {
    console.log(
      "\nThis is the duplicate guard doing its job: this post has already been\n" +
        "delivered to YouTube, or a delivery is in flight. Nothing was sent again.\n",
    );
  }
} else {
  console.log(`  outcome           ${result.outcome.outcome}`);
  console.log(`  youtube video id  ${result.outcome.providerPostId}`);
  console.log(`  permalink         ${result.outcome.providerPermalink}`);
  console.log(`  delivery id       ${result.deliveryId}`);
  const verified = result.outcome.providerResult ?? {};
  console.log(`  privacy (readback)${" "}${verified.privacyStatus}`);
  console.log(`  channel (readback) ${verified.channelId}`);
  console.log(`  upload status      ${verified.uploadStatus}`);
}

// The ledger is the record, so it is read back and printed rather than
// inferred from the return value.
const deliveryRow = await supabase
  .from("marketing_channel_deliveries")
  .select(
    "id, delivery_state, provider_post_id, provider_permalink, provider_result, settled_at, failure_detail",
  )
  .eq("company_id", account.company_id)
  .eq("marketing_post_id", postId)
  .eq("provider", PROVIDER)
  .maybeSingle();

heading("Delivery ledger row");
if (deliveryRow.error || !deliveryRow.data) {
  console.error("  could not read the delivery row", deliveryRow.error?.message);
} else {
  const row = deliveryRow.data;
  console.log(`  delivery_state    ${row.delivery_state}`);
  console.log(`  provider_post_id  ${row.provider_post_id}`);
  console.log(`  provider_permalink ${row.provider_permalink}`);
  console.log(`  settled_at        ${row.settled_at}`);
  if (row.failure_detail) console.log(`  failure_detail    ${row.failure_detail}`);
  console.log(`  provider_result   ${JSON.stringify(row.provider_result)}`);

  const privacy = row.provider_result?.privacyStatus;
  if (row.delivery_state === "posted" && privacy !== "private") {
    // The adapter should have refused before reaching here. If this prints,
    // something is wrong that is worth stopping on.
    console.error(
      "\n  *** WARNING: a posted delivery does not read back as private. ***\n" +
        "  Open the video on YouTube and set it private or delete it, then stop\n" +
        "  and investigate before running anything else.\n",
    );
  }
}

console.log(
  "\nDisarm publishing now: set MARKETING_PUBLISH_MODE=off (or remove it) and redeploy.\n",
);

process.exit(result.ok ? 0 : 1);
