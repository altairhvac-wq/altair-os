"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { getMarketingConnectedAccountAccessToken } from "@/lib/database/queries/marketing-connected-account-secrets";
import { getMarketingConnectedAccountById } from "@/lib/database/queries/marketing-connected-accounts";
import {
  getMarketingPostById,
  markMarketingPostPosted,
} from "@/lib/database/queries/marketing-posts";
import {
  isFacebookOAuthConfigured,
  getMissingFacebookOAuthEnvVars,
} from "@/lib/integrations/facebook/env";
import {
  publishFacebookPageFeedPost,
  publishFacebookPagePhotoPost,
  publishInstagramImagePost,
  resolveFounderScreenshotPublicUrl,
} from "@/lib/integrations/facebook/publish";
import {
  publishFacebookPageReel,
  publishInstagramReel,
} from "@/lib/integrations/facebook/reels";
import { getMediaAssetById } from "@/lib/database/queries/marketing-media-assets";
import { createMediaReadGrant } from "@/lib/media/marketing-media-storage";
import {
  decideMediaRead,
  describeMediaReadDecision,
} from "@/shared/types/marketing-media";
import {
  decideReelMedia,
  describeReelMediaDecision,
  mayAttemptReel,
} from "@/shared/types/marketing-reel";
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import { getFacebookPageInstagramBusinessAccountId } from "@/shared/lib/marketing-facebook-metadata";
import { buildMarketingPostBodyFromPost } from "@/shared/lib/marketing-post-body";
import type { MarketingPost } from "@/shared/types/marketing-post";
import { describeUnpublishableMarketingPostStatus } from "@/shared/types/marketing-post";
import {
  claimDelivery,
  recordDeliveryProviderMedia,
  settleDelivery,
} from "@/lib/database/queries/marketing-channel-deliveries";
import {
  describeDeliveryDecision,
  mayPublish,
} from "@/shared/types/marketing-delivery";

export type MarketingPublishActionResult = {
  error?: string;
  post?: MarketingPost;
  providerPostId?: string;
  permalinkUrl?: string;
  platform?: "facebook" | "instagram";
  /** Set on Reel publishes: the Facebook video id / Instagram container id. */
  providerMediaId?: string;
};

const FOUNDER_MARKETING_SOURCES = new Set(["founder_milestone", "product_update"]);

function revalidateMarketingPaths() {
  revalidatePath("/marketing");
}

async function assertFounderPublishAccess() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (!canAccessPlatformAdmin(context.user)) {
    return {
      error: "Only platform admins can publish founder marketing drafts.",
    } as const;
  }

  if (!context.permissions.dispatchJobs) {
    return {
      error: "You do not have permission to manage marketing posts.",
    } as const;
  }

  return { context } as const;
}

function normalizeId(value: string): string {
  return value.trim();
}

function assertPublishPrerequisites(): string | null {
  if (!isIntegrationEncryptionConfigured()) {
    return "Integration encryption is not configured. Set INTEGRATIONS_ENCRYPTION_KEY, then reconnect Facebook.";
  }

  if (!isFacebookOAuthConfigured()) {
    const missing = getMissingFacebookOAuthEnvVars();
    return `Facebook is not configured. Missing: ${missing.join(", ")}.`;
  }

  return null;
}

async function loadFounderDraftForPublish(input: {
  companyId: string;
  postId: string;
}): Promise<{ post?: MarketingPost; error?: string }> {
  const post = await getMarketingPostById(input.companyId, input.postId);
  if (!post) {
    return { error: "Marketing post not found." };
  }

  if (!FOUNDER_MARKETING_SOURCES.has(post.sourceType)) {
    return {
      error: "Only founder marketing drafts can be published from Marketing Hub.",
    };
  }

  // Allow-list, not a deny-list. This previously rejected only `archived`,
  // which let an already-`posted` draft re-enter the Graph publish path and
  // create a second real post. See the note on
  // PUBLISHABLE_MARKETING_POST_STATUSES.
  //
  // This is a guard, NOT provider idempotency: it closes the reachable
  // double-submit path, and does not make the publish + mark sequence atomic.
  // The remaining race is documented in the build log.
  const statusError = describeUnpublishableMarketingPostStatus(post.status);
  if (statusError) {
    return { error: statusError };
  }

  const body = buildMarketingPostBodyFromPost(post);
  if (!body.trim()) {
    return { error: "Add post text before publishing." };
  }

  return { post };
}

/**
 * Refuses a post that carries a video from the text and image paths.
 *
 * ==================== WHY THIS IS NOT PEDANTRY ====================
 * `/feed` and `/photos` do not accept a video. A Reel post pushed through
 * either would publish successfully, as TEXT, silently dropping the video the
 * operator attached — and the post would then be `posted`, so the Reel could
 * never be published without duplicating it. A quiet success that produced the
 * wrong artefact is worse than a refusal.
 *
 * This cannot change the behaviour of any post that exists today: the column
 * it reads was added by migration 145 and is null everywhere until someone
 * deliberately attaches a video.
 */
function refuseVideoPostOnTextPath(post: MarketingPost): string | null {
  if (!post.videoMediaAssetId?.trim()) return null;
  return "This post has a video attached. Use Publish Reel — Facebook feed and photo posts cannot carry video.";
}

/**
 * Everything a Reel publish needs from local state, resolved BEFORE any
 * delivery is claimed.
 *
 * ============ WHY THE SIGNED URL IS MINTED HERE AND NOT LATER ============
 * Minting is a call to storage and it can fail. Doing it after the claim would
 * put a failure path inside the claimed span, which is precisely the defect the
 * delivery audit found in the screenshot branch: an early return between claim
 * and settle strands the row `in_flight`, and five minutes later the operator
 * is told to go reconcile an attempt that never reached Meta at all.
 *
 * The grant is returned, used once, and dropped. Nothing writes it anywhere —
 * not to the post, not to the delivery, not to a log.
 */
async function resolveReelMediaForPublish(input: {
  companyId: string;
  post: MarketingPost;
}): Promise<{ videoUrl?: string; error?: string }> {
  const assetId = input.post.videoMediaAssetId?.trim();
  if (!assetId) {
    return { error: describeReelMediaDecision("NO_MEDIA") };
  }

  const asset = await getMediaAssetById(input.companyId, assetId);

  // PRE-FLIGHT on the render's own reported shape. Not an authority — Meta is
  // — but it turns the common mistake of pointing a Reel at the landscape
  // render into an instant local refusal instead of a three-minute round trip.
  const reelDecision = decideReelMedia(asset, input.companyId);
  if (!mayAttemptReel(reelDecision)) {
    return { error: describeReelMediaDecision(reelDecision) };
  }

  // The authorization gate, re-derived rather than trusted: `object_key` is a
  // column, and a column is something a bad backfill can change.
  const readDecision = decideMediaRead(asset, input.companyId);
  if (readDecision !== "GRANT" || !asset) {
    return { error: describeMediaReadDecision(readDecision) };
  }

  const grant = await createMediaReadGrant({
    companyId: input.companyId,
    objectKey: asset.objectKey,
    contentType: asset.contentType,
    byteSize: asset.byteSize,
    nowMs: Date.now(),
  });

  if (grant.error || !grant.grant) {
    return { error: grant.error ?? "Could not open the video for publishing." };
  }

  return { videoUrl: grant.grant.url };
}

async function loadConnectedFacebookPage(input: {
  companyId: string;
  connectedAccountId: string;
}): Promise<{
  account?: Awaited<ReturnType<typeof getMarketingConnectedAccountById>>;
  error?: string;
}> {
  const account = await getMarketingConnectedAccountById(
    input.companyId,
    input.connectedAccountId,
  );

  if (!account) {
    return { error: "Connected Facebook Page not found." };
  }

  if (account.provider !== "facebook") {
    return { error: "Select a Facebook Page connection." };
  }

  if (account.status !== "connected") {
    return {
      error:
        "That Facebook Page is not connected. Reconnect Facebook, then try again.",
    };
  }

  if (!account.providerResourceId?.trim()) {
    return {
      error:
        "This Facebook connection has no Page id. Reconnect Facebook and choose a Page.",
    };
  }

  return { account };
}

/**
 * Publishes a saved founder draft to a connected Facebook Page.
 * Text/link via /feed, or /photos when a founder screenshot is attached.
 * Deliberate human click only — no scheduling or auto-trigger.
 */
export async function publishMarketingPostToFacebookAction(
  postId: string,
  connectedAccountId: string,
): Promise<MarketingPublishActionResult> {
  const permission = await assertFounderPublishAccess();
  if ("error" in permission) {
    return { error: permission.error };
  }

  const configError = assertPublishPrerequisites();
  if (configError) {
    return { error: configError };
  }

  const normalizedPostId = normalizeId(postId);
  const normalizedAccountId = normalizeId(connectedAccountId);

  if (!normalizedPostId) {
    return { error: "A valid marketing post is required." };
  }
  if (!normalizedAccountId) {
    return { error: "Select a Facebook Page to publish to." };
  }

  const draft = await loadFounderDraftForPublish({
    companyId: permission.context.company.id,
    postId: normalizedPostId,
  });
  if (draft.error || !draft.post) {
    return { error: draft.error ?? "Marketing post not found." };
  }

  const videoBlocked = refuseVideoPostOnTextPath(draft.post);
  if (videoBlocked) {
    return { error: videoBlocked };
  }

  const pageLoad = await loadConnectedFacebookPage({
    companyId: permission.context.company.id,
    connectedAccountId: normalizedAccountId,
  });
  if (pageLoad.error || !pageLoad.account) {
    return { error: pageLoad.error ?? "Connected Facebook Page not found." };
  }

  const tokenResult = await getMarketingConnectedAccountAccessToken(
    pageLoad.account.id,
  );
  if (tokenResult.error || !tokenResult.accessToken) {
    return {
      error:
        tokenResult.error ??
        "Could not load the Page access token. Reconnect Facebook.",
    };
  }

  const message = buildMarketingPostBodyFromPost(draft.post);
  const pageId = pageLoad.account.providerResourceId!;
  const screenshotRef = draft.post.founderScreenshotReference?.trim();

  // ---------------------------------------------------------------------
  // RESOLVE EVERYTHING LOCAL *BEFORE* CLAIMING (independent audit P2-1).
  //
  // Screenshot resolution is a pure local operation — it reads a reference
  // and app config, and touches nothing external. Doing it after the claim
  // meant its early `return` on a bad reference or missing NEXT_PUBLIC_APP_URL
  // escaped the `catch`, so the claim was never settled: the row stranded
  // `in_flight` and became a NEEDS_RECONCILIATION case for an attempt that
  // never reached Facebook at all. The operator would then be told to go
  // check Meta for a post that could not exist.
  //
  // Ordering fixes that structurally rather than by adding a second settle
  // call. THE CLAIM NOW COVERS EXACTLY THE EXTERNAL CALL AND NOTHING ELSE,
  // so any future pre-flight validation added here cannot reintroduce the
  // same defect.
  // ---------------------------------------------------------------------
  let imageUrl: string | null = null;
  if (screenshotRef) {
    const image = resolveFounderScreenshotPublicUrl(screenshotRef);
    if (image.error || !image.url) {
      return { error: image.error ?? "Could not resolve screenshot URL." };
    }
    imageUrl = image.url;
  }

  // ---------------------------------------------------------------------
  // CLAIM BEFORE THE EXTERNAL CALL.
  //
  // The unique (company_id, marketing_post_id, provider) constraint makes
  // this insert the duplicate guard: a second attempt cannot claim, so it
  // cannot reach the Graph API. Checking first and inserting after would
  // leave a window where two requests both see nothing and both publish.
  //
  // A stale unsettled claim is NOT taken over automatically — it may have
  // published, and only Meta knows. That surfaces to the operator instead.
  // ---------------------------------------------------------------------
  const claimedAt = new Date().toISOString();
  const claim = await claimDelivery({
    companyId: permission.context.company.id,
    marketingPostId: normalizedPostId,
    provider: "facebook",
    connectedAccountId: pageLoad.account.id,
    nowIso: claimedAt,
  });

  if (!mayPublish(claim.decision)) {
    return {
      error:
        claim.error ??
        describeDeliveryDecision(claim.decision, "Facebook", claim.delivery),
    };
  }
  const deliveryId = claim.delivery!.id;

  let publishResult: {
    providerPostId: string;
    permalinkUrl?: string;
  };

  try {
    // No early return is permitted inside this block: everything between the
    // claim and the settle must either reach a settle or throw into `catch`.
    if (imageUrl) {
      publishResult = await publishFacebookPagePhotoPost({
        pageId,
        accessToken: tokenResult.accessToken,
        imageUrl,
        caption: message,
      });
    } else {
      publishResult = await publishFacebookPageFeedPost({
        pageId,
        accessToken: tokenResult.accessToken,
        message,
      });
    }
  } catch (error) {
    console.error("[publishMarketingPostToFacebookAction] Graph publish failed:", {
      companyId: permission.context.company.id,
      postId: normalizedPostId,
      pageId,
      error,
    });
    const messageText =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Facebook publish failed. Check Page permissions and try again.";
    // Settle as FAILED so the claim is released and a retry is permitted.
    // Leaving it in_flight would strand a genuinely failed attempt as a
    // reconciliation case the operator has to resolve by hand.
    await settleDelivery({
      deliveryId,
      settlement: { outcome: "failed", failureDetail: messageText },
      nowIso: new Date().toISOString(),
    });
    return { error: messageText };
  }

  // Settle POSTED immediately, before anything else can fail. This is where
  // the provider's own id is finally persisted — previously it was returned,
  // shown once, and discarded, leaving nothing able to prove the post
  // existed.
  await settleDelivery({
    deliveryId,
    settlement: {
      outcome: "posted",
      providerPostId: publishResult.providerPostId,
      providerPermalink: publishResult.permalinkUrl ?? null,
    },
    nowIso: new Date().toISOString(),
  });

  const marked = await markMarketingPostPosted(
    permission.context.company.id,
    normalizedPostId,
  );

  if (marked.error || !marked.post) {
    return {
      error:
        marked.error ??
        "Published to Facebook, but marking the draft posted failed. Refresh and check the Page.",
      providerPostId: publishResult.providerPostId,
      permalinkUrl: publishResult.permalinkUrl,
      platform: "facebook",
    };
  }

  revalidateMarketingPaths();

  return {
    post: marked.post,
    providerPostId: publishResult.providerPostId,
    permalinkUrl: publishResult.permalinkUrl,
    platform: "facebook",
  };
}

/**
 * Publishes a saved founder draft to the Instagram Business account linked
 * to a connected Facebook Page (container → media_publish). Requires a
 * founder screenshot — Instagram has no text-only posts.
 */
export async function publishMarketingPostToInstagramAction(
  postId: string,
  connectedAccountId: string,
): Promise<MarketingPublishActionResult> {
  const permission = await assertFounderPublishAccess();
  if ("error" in permission) {
    return { error: permission.error };
  }

  const configError = assertPublishPrerequisites();
  if (configError) {
    return { error: configError };
  }

  const normalizedPostId = normalizeId(postId);
  const normalizedAccountId = normalizeId(connectedAccountId);

  if (!normalizedPostId) {
    return { error: "A valid marketing post is required." };
  }
  if (!normalizedAccountId) {
    return { error: "Select a Facebook Page with a linked Instagram account." };
  }

  const draft = await loadFounderDraftForPublish({
    companyId: permission.context.company.id,
    postId: normalizedPostId,
  });
  if (draft.error || !draft.post) {
    return { error: draft.error ?? "Marketing post not found." };
  }

  const videoBlockedForInstagram = refuseVideoPostOnTextPath(draft.post);
  if (videoBlockedForInstagram) {
    return { error: videoBlockedForInstagram };
  }

  const screenshotRef = draft.post.founderScreenshotReference?.trim();
  if (!screenshotRef) {
    return {
      error:
        "Instagram requires an image. Attach a founder screenshot, save the draft, then try again.",
    };
  }

  const image = resolveFounderScreenshotPublicUrl(screenshotRef);
  if (image.error || !image.url) {
    return { error: image.error ?? "Could not resolve screenshot URL." };
  }

  const pageLoad = await loadConnectedFacebookPage({
    companyId: permission.context.company.id,
    connectedAccountId: normalizedAccountId,
  });
  if (pageLoad.error || !pageLoad.account) {
    return { error: pageLoad.error ?? "Connected Facebook Page not found." };
  }

  const igUserId = getFacebookPageInstagramBusinessAccountId(
    pageLoad.account.metadata,
  );
  if (!igUserId) {
    return {
      error:
        "This Facebook Page has no linked Instagram Business account. Link one in Meta Business Suite, then reconnect Facebook.",
    };
  }

  const tokenResult = await getMarketingConnectedAccountAccessToken(
    pageLoad.account.id,
  );
  if (tokenResult.error || !tokenResult.accessToken) {
    return {
      error:
        tokenResult.error ??
        "Could not load the Page access token. Reconnect Facebook.",
    };
  }

  const caption = buildMarketingPostBodyFromPost(draft.post);

  // Claimed under the INSTAGRAM provider, not Facebook. They are separate
  // rows for the same post on purpose: publishing to the Page and to the
  // linked IG account are two distinct external objects, and a post may
  // legitimately go to one and not the other. Sharing a row would make the
  // second delivery look like a duplicate of the first.
  const igClaim = await claimDelivery({
    companyId: permission.context.company.id,
    marketingPostId: normalizedPostId,
    provider: "instagram",
    connectedAccountId: pageLoad.account.id,
    nowIso: new Date().toISOString(),
  });

  if (!mayPublish(igClaim.decision)) {
    return {
      error:
        igClaim.error ??
        describeDeliveryDecision(igClaim.decision, "Instagram", igClaim.delivery),
    };
  }
  const igDeliveryId = igClaim.delivery!.id;

  let publishResult: {
    providerPostId: string;
    permalinkUrl?: string;
  };

  try {
    publishResult = await publishInstagramImagePost({
      igUserId,
      accessToken: tokenResult.accessToken,
      imageUrl: image.url,
      caption,
    });
  } catch (error) {
    console.error(
      "[publishMarketingPostToInstagramAction] Graph publish failed:",
      {
        companyId: permission.context.company.id,
        postId: normalizedPostId,
        igUserId,
        error,
      },
    );
    const messageText =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Instagram publish failed. Check permissions and try again.";
    await settleDelivery({
      deliveryId: igDeliveryId,
      settlement: { outcome: "failed", failureDetail: messageText },
      nowIso: new Date().toISOString(),
    });
    return { error: messageText };
  }

  // Settle POSTED before anything else can fail, so the Instagram media id
  // is durable even if the mark-posted write below does not land.
  await settleDelivery({
    deliveryId: igDeliveryId,
    settlement: {
      outcome: "posted",
      providerPostId: publishResult.providerPostId,
      providerPermalink: publishResult.permalinkUrl ?? null,
    },
    nowIso: new Date().toISOString(),
  });

  const marked = await markMarketingPostPosted(
    permission.context.company.id,
    normalizedPostId,
  );

  if (marked.error || !marked.post) {
    return {
      error:
        marked.error ??
        "Published to Instagram, but marking the draft posted failed. Refresh and check Instagram.",
      providerPostId: publishResult.providerPostId,
      permalinkUrl: publishResult.permalinkUrl,
      platform: "instagram",
    };
  }

  revalidateMarketingPaths();

  return {
    post: marked.post,
    providerPostId: publishResult.providerPostId,
    permalinkUrl: publishResult.permalinkUrl,
    platform: "instagram",
  };
}

/* ========================================================================
 *                              REEL PUBLISHING
 *
 * Two more actions rather than a flag on the existing two.
 *
 * The text and image paths are a single POST. A Reel is a multi-phase
 * conversation with an asynchronous provider, with a bounded wait and a point
 * of no return near the end. Threading that through the existing actions would
 * put a timeout loop inside paths that have none, and would make the audited
 * claim/settle span — the thing that keeps publishing replay-safe — harder to
 * read in exactly the place it most needs to be obvious.
 *
 * WHAT IS SHARED, DELIBERATELY: the founder access gate, the publishable-status
 * allow-list, the connected-Page load, the token load, and the
 * claim/`mayPublish`/settle discipline. None of that is reimplemented here.
 *
 * WHAT IS NOT SHARED: nothing in `publish.ts` is called, and the image
 * container poller in particular is not reused — its twelve-second budget is
 * right for a photo and hopeless for video.
 *
 * A REEL IS ITS OWN MARKETING POST. Migration 143's duplicate guard is
 * `unique (company_id, marketing_post_id, provider)`; a Reel sharing a post
 * with a text publish could never claim its own row. That is why the delivery
 * provider below is plain `facebook` / `instagram` and no migration to the
 * delivery table's key was needed.
 * ====================================================================== */

/**
 * Publishes the video attached to a founder draft as a Facebook Page Reel.
 * Deliberate human click only — no scheduling and no auto-trigger.
 */
export async function publishMarketingReelToFacebookAction(
  postId: string,
  connectedAccountId: string,
): Promise<MarketingPublishActionResult> {
  const permission = await assertFounderPublishAccess();
  if ("error" in permission) {
    return { error: permission.error };
  }

  const configError = assertPublishPrerequisites();
  if (configError) {
    return { error: configError };
  }

  const normalizedPostId = normalizeId(postId);
  const normalizedAccountId = normalizeId(connectedAccountId);

  if (!normalizedPostId) {
    return { error: "A valid marketing post is required." };
  }
  if (!normalizedAccountId) {
    return { error: "Select a Facebook Page to publish to." };
  }

  const draft = await loadFounderDraftForPublish({
    companyId: permission.context.company.id,
    postId: normalizedPostId,
  });
  if (draft.error || !draft.post) {
    return { error: draft.error ?? "Marketing post not found." };
  }

  const pageLoad = await loadConnectedFacebookPage({
    companyId: permission.context.company.id,
    connectedAccountId: normalizedAccountId,
  });
  if (pageLoad.error || !pageLoad.account) {
    return { error: pageLoad.error ?? "Connected Facebook Page not found." };
  }

  const tokenResult = await getMarketingConnectedAccountAccessToken(
    pageLoad.account.id,
  );
  if (tokenResult.error || !tokenResult.accessToken) {
    return {
      error:
        tokenResult.error ??
        "Could not load the Page access token. Reconnect Facebook.",
    };
  }

  // EVERYTHING LOCAL, AND EVERY FALLIBLE PRE-FLIGHT, RESOLVES HERE — before a
  // delivery is claimed. Minting the signed media URL is a call to storage and
  // it can fail; doing it after the claim would strand the row `in_flight` on
  // failure, which is the exact defect the delivery audit found on the
  // screenshot branch. The claim below therefore spans the Meta calls and
  // nothing else.
  const media = await resolveReelMediaForPublish({
    companyId: permission.context.company.id,
    post: draft.post,
  });
  if (media.error || !media.videoUrl) {
    return { error: media.error ?? "Could not open the video for publishing." };
  }

  const description = buildMarketingPostBodyFromPost(draft.post);
  const pageId = pageLoad.account.providerResourceId!;

  const claim = await claimDelivery({
    companyId: permission.context.company.id,
    marketingPostId: normalizedPostId,
    provider: "facebook",
    connectedAccountId: pageLoad.account.id,
    nowIso: new Date().toISOString(),
  });

  if (!mayPublish(claim.decision)) {
    return {
      error:
        claim.error ??
        describeDeliveryDecision(claim.decision, "Facebook", claim.delivery),
    };
  }
  const deliveryId = claim.delivery!.id;

  let publishResult: {
    providerPostId: string;
    providerMediaId: string;
    permalinkUrl?: string;
  };

  try {
    // No early return is permitted inside this block: everything between the
    // claim and the settle must either reach a settle or throw into `catch`.
    publishResult = await publishFacebookPageReel({
      pageId,
      accessToken: tokenResult.accessToken,
      videoUrl: media.videoUrl,
      description,
      // Fires the moment Meta reserves a video id, BEFORE any byte moves and
      // long before anything is published. If this process dies mid-upload the
      // row still names the object an operator has to go look at.
      onMediaCreated: async (providerMediaId) => {
        await recordDeliveryProviderMedia({ deliveryId, providerMediaId });
      },
    });
  } catch (error) {
    console.error("[publishMarketingReelToFacebookAction] Reel publish failed:", {
      companyId: permission.context.company.id,
      postId: normalizedPostId,
      pageId,
      error,
    });
    const messageText =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Facebook Reel publish failed. Check Page permissions and try again.";
    // Safe to settle FAILED and permit a retry: a Reel is not public until the
    // `finish` phase, so every failure before it leaves an unpublished video
    // object at Meta and nothing on the Page.
    await settleDelivery({
      deliveryId,
      settlement: { outcome: "failed", failureDetail: messageText },
      nowIso: new Date().toISOString(),
    });
    return { error: messageText };
  }

  await settleDelivery({
    deliveryId,
    settlement: {
      outcome: "posted",
      providerPostId: publishResult.providerPostId,
      providerPermalink: publishResult.permalinkUrl ?? null,
    },
    nowIso: new Date().toISOString(),
  });

  const marked = await markMarketingPostPosted(
    permission.context.company.id,
    normalizedPostId,
  );

  if (marked.error || !marked.post) {
    return {
      error:
        marked.error ??
        "Published the Reel, but marking the draft posted failed. Refresh and check the Page.",
      providerPostId: publishResult.providerPostId,
      providerMediaId: publishResult.providerMediaId,
      permalinkUrl: publishResult.permalinkUrl,
      platform: "facebook",
    };
  }

  revalidateMarketingPaths();

  return {
    post: marked.post,
    providerPostId: publishResult.providerPostId,
    providerMediaId: publishResult.providerMediaId,
    permalinkUrl: publishResult.permalinkUrl,
    platform: "facebook",
  };
}

/**
 * Publishes the video attached to a founder draft as an Instagram Reel, to the
 * Instagram Professional account linked to the selected Facebook Page.
 */
export async function publishMarketingReelToInstagramAction(
  postId: string,
  connectedAccountId: string,
): Promise<MarketingPublishActionResult> {
  const permission = await assertFounderPublishAccess();
  if ("error" in permission) {
    return { error: permission.error };
  }

  const configError = assertPublishPrerequisites();
  if (configError) {
    return { error: configError };
  }

  const normalizedPostId = normalizeId(postId);
  const normalizedAccountId = normalizeId(connectedAccountId);

  if (!normalizedPostId) {
    return { error: "A valid marketing post is required." };
  }
  if (!normalizedAccountId) {
    return { error: "Select a Facebook Page with a linked Instagram account." };
  }

  const draft = await loadFounderDraftForPublish({
    companyId: permission.context.company.id,
    postId: normalizedPostId,
  });
  if (draft.error || !draft.post) {
    return { error: draft.error ?? "Marketing post not found." };
  }

  const pageLoad = await loadConnectedFacebookPage({
    companyId: permission.context.company.id,
    connectedAccountId: normalizedAccountId,
  });
  if (pageLoad.error || !pageLoad.account) {
    return { error: pageLoad.error ?? "Connected Facebook Page not found." };
  }

  const igUserId = getFacebookPageInstagramBusinessAccountId(
    pageLoad.account.metadata,
  );
  if (!igUserId) {
    return {
      error:
        "This Facebook Page has no linked Instagram Business account. Link one in Meta Business Suite, then reconnect Facebook.",
    };
  }

  const tokenResult = await getMarketingConnectedAccountAccessToken(
    pageLoad.account.id,
  );
  if (tokenResult.error || !tokenResult.accessToken) {
    return {
      error:
        tokenResult.error ??
        "Could not load the Page access token. Reconnect Facebook.",
    };
  }

  // Resolved before the claim, for the reason documented on the Facebook Reel
  // action above.
  const media = await resolveReelMediaForPublish({
    companyId: permission.context.company.id,
    post: draft.post,
  });
  if (media.error || !media.videoUrl) {
    return { error: media.error ?? "Could not open the video for publishing." };
  }

  const caption = buildMarketingPostBodyFromPost(draft.post);

  const claim = await claimDelivery({
    companyId: permission.context.company.id,
    marketingPostId: normalizedPostId,
    provider: "instagram",
    connectedAccountId: pageLoad.account.id,
    nowIso: new Date().toISOString(),
  });

  if (!mayPublish(claim.decision)) {
    return {
      error:
        claim.error ??
        describeDeliveryDecision(claim.decision, "Instagram", claim.delivery),
    };
  }
  const deliveryId = claim.delivery!.id;

  let publishResult: {
    providerPostId: string;
    providerMediaId: string;
    permalinkUrl?: string;
  };

  try {
    publishResult = await publishInstagramReel({
      igUserId,
      accessToken: tokenResult.accessToken,
      videoUrl: media.videoUrl,
      caption,
      onMediaCreated: async (providerMediaId) => {
        await recordDeliveryProviderMedia({ deliveryId, providerMediaId });
      },
    });
  } catch (error) {
    console.error("[publishMarketingReelToInstagramAction] Reel publish failed:", {
      companyId: permission.context.company.id,
      postId: normalizedPostId,
      igUserId,
      error,
    });
    const messageText =
      error instanceof Error && error.message.trim()
        ? error.message.trim()
        : "Instagram Reel publish failed. Check permissions and try again.";
    // Safe to settle FAILED: an Instagram container is not public until
    // `media_publish`, and an unused container is discarded by Meta.
    await settleDelivery({
      deliveryId,
      settlement: { outcome: "failed", failureDetail: messageText },
      nowIso: new Date().toISOString(),
    });
    return { error: messageText };
  }

  await settleDelivery({
    deliveryId,
    settlement: {
      outcome: "posted",
      providerPostId: publishResult.providerPostId,
      providerPermalink: publishResult.permalinkUrl ?? null,
    },
    nowIso: new Date().toISOString(),
  });

  const marked = await markMarketingPostPosted(
    permission.context.company.id,
    normalizedPostId,
  );

  if (marked.error || !marked.post) {
    return {
      error:
        marked.error ??
        "Published the Reel, but marking the draft posted failed. Refresh and check Instagram.",
      providerPostId: publishResult.providerPostId,
      providerMediaId: publishResult.providerMediaId,
      permalinkUrl: publishResult.permalinkUrl,
      platform: "instagram",
    };
  }

  revalidateMarketingPaths();

  return {
    post: marked.post,
    providerPostId: publishResult.providerPostId,
    providerMediaId: publishResult.providerMediaId,
    permalinkUrl: publishResult.permalinkUrl,
    platform: "instagram",
  };
}
