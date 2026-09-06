"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { getMarketingConnectedAccountById } from "@/lib/database/queries/marketing-connected-accounts";
import { getMediaAssetById } from "@/lib/database/queries/marketing-media-assets";
import {
  getMarketingPostById,
  markMarketingPostPosted,
} from "@/lib/database/queries/marketing-posts";
import { recordApprovedPublishJob } from "@/lib/database/queries/marketing-publish-jobs";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import { isYouTubeOAuthConfigured } from "@/lib/integrations/youtube/env";
import { createMediaReadGrant } from "@/lib/media/marketing-media-storage";
import { dispatchPublish } from "@/lib/publishing/dispatch";
import {
  decideMediaRead,
  describeMediaReadDecision,
} from "@/shared/types/marketing-media";
import { buildMarketingPostBodyFromPost } from "@/shared/lib/marketing-post-body";
import { capabilityFor } from "@/shared/types/integration-capability";
import { toMarketingChannelAccountFacts } from "@/shared/types/marketing-channel-connection";
import { describeUnpublishableMarketingPostStatus } from "@/shared/types/marketing-post";

/**
 * Publish an approved marketing post to YouTube — as a PRIVATE video.
 *
 * ============ WHERE THIS SITS IN THE ARCHITECTURE ============
 * The Facebook and Instagram actions predate `dispatchPublish` and carry
 * their own claim/publish/settle sequence. This action does not: it is the
 * first authenticated caller of the authoritative path, so the kill switch,
 * the recorded approval, the credential refresh, the duplicate guard, the
 * channel-identity readback and the settlement all come from ONE place
 * (`lib/publishing/dispatch.ts`) rather than a second copy that can drift.
 * A separate file from `marketing-publish.ts` deliberately: that module is
 * under review on another branch, and this path shares no code with it that
 * would justify a merge conflict.
 *
 * ============ PRIVATE IS NOT A PARAMETER ============
 * Nothing here chooses visibility. The YouTube adapter uploads
 * `privacyStatus: "private"` as a literal at its transport boundary, asserts
 * it in preflight from the capability matrix, and verifies it by reading the
 * video back after upload. This action could not make a video public if it
 * tried, and it does not try. Making an upload public is a deliberate human
 * act on YouTube itself, after review.
 *
 * ============ THE AGREEMENT CHECKS (fail closed) ============
 * Four identities must agree before a byte moves, and a mismatch in any of
 * them is a refusal, never a fallback:
 *
 *   1. the POST's channel_target must be `youtube` — a post drafted for
 *      Facebook cannot be re-aimed here by a stray click;
 *   2. the SELECTED ACCOUNT row must be provider `youtube`, `connected`,
 *      and carry a channel id (`provider_resource_id`);
 *   3. the ADAPTER resolved by the registry for that provider is the
 *      YouTube publisher (dispatch checks kind);
 *   4. the UPLOADED video's channel, read back from YouTube after upload,
 *      must equal the account row's channel id (`verifyUploadReadback`) —
 *      the same protection pattern the Facebook/Instagram channel-routing
 *      incident produced.
 */

export type YouTubePublishActionResult = {
  error?: string;
  videoId?: string;
  permalink?: string;
  /** What YouTube reported back after the upload was verified. */
  privacyStatus?: string;
  channelId?: string;
};

const MARKETING_PATH = "/marketing";

export async function publishMarketingPostToYouTubeAction(
  postId: string,
  connectedAccountId: string,
): Promise<YouTubePublishActionResult> {
  // ------------------------------------------------------------ the caller
  const context = await getActiveCompanyContext();
  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }
  if (!canAccessPlatformAdmin(context.user)) {
    return { error: "Only platform admins can publish founder marketing drafts." };
  }
  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to manage marketing posts." };
  }

  // ------------------------------------------------------ the deployment
  if (!isIntegrationEncryptionConfigured()) {
    return {
      error:
        "Integration encryption is not configured. Set INTEGRATIONS_ENCRYPTION_KEY, then reconnect YouTube.",
    };
  }
  if (!isYouTubeOAuthConfigured()) {
    return { error: "YouTube is not configured on this deployment." };
  }

  const normalizedPostId = postId.trim();
  const normalizedAccountId = connectedAccountId.trim();
  if (!normalizedPostId) {
    return { error: "A valid marketing post is required." };
  }
  if (!normalizedAccountId) {
    return { error: "Select a connected YouTube channel." };
  }

  const companyId = context.company.id;

  // ---------------------------------------------------------- the post
  const post = await getMarketingPostById(companyId, normalizedPostId);
  if (!post) {
    return { error: "Marketing post not found." };
  }

  // AGREEMENT CHECK 1. The post must have been aimed at YouTube when it was
  // drafted. Re-aiming happens by editing the draft, on purpose, not here.
  if (post.channelTarget !== "youtube") {
    return {
      error: `This post targets ${post.channelTarget}, not YouTube. Nothing was sent.`,
    };
  }

  const statusError = describeUnpublishableMarketingPostStatus(post.status);
  if (statusError) {
    return { error: statusError };
  }

  // ---------------------------------------------------------- the media
  const videoAssetId = post.videoMediaAssetId?.trim();
  if (!videoAssetId) {
    return { error: "Attach a stored video to this post before publishing to YouTube." };
  }

  const asset = await getMediaAssetById(companyId, videoAssetId);

  // The same pure decision every other media reader runs — company scoping,
  // stored state, and the object-key re-derivation defense — rather than a
  // hand-rolled subset that would drift from it.
  const mediaDecision = decideMediaRead(asset, companyId);
  if (mediaDecision !== "GRANT") {
    return { error: describeMediaReadDecision(mediaDecision) };
  }
  // Non-null after READABLE; the decision refuses a missing asset.
  const media = asset as NonNullable<typeof asset>;

  if (!media.contentType.startsWith("video/")) {
    return { error: "The attached media is not a video." };
  }
  if (!media.byteSize || media.byteSize <= 0) {
    // YouTube's resumable upload needs a declared length; a guessed one
    // produces a corrupt video rather than an error.
    return { error: "The attached video has no recorded size, so it cannot be uploaded." };
  }

  // -------------------------------------------------------- the channel
  const account = await getMarketingConnectedAccountById(
    companyId,
    normalizedAccountId,
  );
  if (!account) {
    return { error: "Connected YouTube channel not found." };
  }

  // AGREEMENT CHECK 2. Provider, liveness, and a real channel identity.
  if (account.provider !== "youtube") {
    return { error: "Select a YouTube channel connection." };
  }
  if (account.status !== "connected") {
    return {
      error: "That YouTube channel is not connected. Reconnect YouTube, then try again.",
    };
  }
  const channelId = account.providerResourceId?.trim();
  if (!channelId) {
    return {
      error: "This YouTube connection has no channel id. Reconnect YouTube and pick a channel.",
    };
  }

  const nowIso = new Date().toISOString();

  // -------------------------------------------------------- the approval
  // The click IS the approval, and it is RECORDED before the gate is asked:
  // a real job row naming this person, this post, this provider, this
  // instant. The gate reads the timestamp back from that row.
  const capability = capabilityFor("youtube");
  const approval = await recordApprovedPublishJob({
    companyId,
    marketingPostId: normalizedPostId,
    provider: "youtube",
    connectedAccountId: account.id,
    approvedBy: context.user.id,
    nowIso,
    maxAttempts: capability.maxAttempts,
  });
  if (approval.error || !approval.approvedAt) {
    return { error: approval.error ?? "Failed to record the approval." };
  }

  // ------------------------------------------------------- the read grant
  // Minted after every local check has passed, so a refused publish leaves
  // no live signed URL behind.
  const grant = await createMediaReadGrant({
    companyId,
    objectKey: media.objectKey,
    contentType: media.contentType,
    byteSize: media.byteSize,
    nowMs: Date.now(),
  });
  if (grant.error || !grant.grant) {
    return { error: grant.error ?? "Could not mint a read link for the video." };
  }

  // ------------------------------------------------------- the dispatch
  // The shared projection the Integrations page and the Command surface use
  // — one mapping, so a publish can never judge health on different facts
  // than the page that told the operator it was healthy.
  const facts = toMarketingChannelAccountFacts(account);

  const result = await dispatchPublish({
    account: {
      connectedAccountId: account.id,
      companyId,
      provider: "youtube",
      integrationKind: account.integrationKind,
      providerAccountId: account.providerAccountId ?? null,
      providerResourceId: channelId,
      grantedScopes: account.grantedScopes,
      facts,
    },
    marketingPostId: normalizedPostId,
    jobApprovedAt: approval.approvedAt,
    title: post.title,
    body: buildMarketingPostBodyFromPost(post),
    hashtags: post.suggestedHashtags,
    link: null,
    media: [grant.grant],
    nowIso,
    configured: true,
  });

  if (!result.ok) {
    return { error: result.detail };
  }

  // The post is marked AFTER the delivery is settled, mirroring the
  // Facebook actions: the ledger row is the durable record, the post status
  // is the workflow convenience.
  const marked = await markMarketingPostPosted(companyId, normalizedPostId);
  if (marked.error) {
    console.error("[publishMarketingPostToYouTubeAction] post not marked:", {
      companyId,
      postId: normalizedPostId,
    });
  }

  revalidatePath(MARKETING_PATH);

  const verified = result.outcome.providerResult ?? {};
  return {
    videoId: result.outcome.providerPostId,
    permalink: result.outcome.providerPermalink,
    privacyStatus:
      typeof verified.privacyStatus === "string" ? verified.privacyStatus : undefined,
    channelId:
      typeof verified.channelId === "string" ? verified.channelId : undefined,
  };
}
