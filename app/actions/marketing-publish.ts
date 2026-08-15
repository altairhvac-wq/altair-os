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
import { isIntegrationEncryptionConfigured } from "@/lib/integrations/env";
import { getFacebookPageInstagramBusinessAccountId } from "@/shared/lib/marketing-facebook-metadata";
import { buildMarketingPostBodyFromPost } from "@/shared/lib/marketing-post-body";
import type { MarketingPost } from "@/shared/types/marketing-post";
import { describeUnpublishableMarketingPostStatus } from "@/shared/types/marketing-post";
import {
  claimDelivery,
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
    if (screenshotRef) {
      const image = resolveFounderScreenshotPublicUrl(screenshotRef);
      if (image.error || !image.url) {
        return { error: image.error ?? "Could not resolve screenshot URL." };
      }

      publishResult = await publishFacebookPagePhotoPost({
        pageId,
        accessToken: tokenResult.accessToken,
        imageUrl: image.url,
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
