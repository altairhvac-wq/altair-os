"use server";

// Marketing AI HQ server actions — founder-gated end to end.
// Architecture: docs/product/MARKETING_AI_HQ.md

import { revalidatePath } from "next/cache";
import { mapAiErrorToMessage } from "@/lib/ai/errors";
import { checkAiRateLimit } from "@/lib/ai/guardrails";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import { createMarketingPost } from "@/lib/database/queries/marketing-posts";
import { publishMarketingPostToFacebookAction } from "@/app/actions/marketing-publish";
import { listMarketingConnectedAccounts } from "@/lib/database/queries/marketing-connected-accounts";
import {
  runMarketingCopywriterBatch,
  runMarketingSeoBatch,
  runMarketingStrategist,
  runMarketingVideoBrief,
} from "@/lib/marketing/engine";
import { MARKETING_HQ_COPYWRITER_AI_FEATURE } from "@/lib/marketing/roles/copywriter";
import { MARKETING_HQ_SEO_AI_FEATURE } from "@/lib/marketing/roles/seo";
import { MARKETING_HQ_STRATEGIST_AI_FEATURE } from "@/lib/marketing/roles/strategist";
import { MARKETING_HQ_VIDEO_AI_FEATURE } from "@/lib/marketing/roles/video";
import {
  getMarketingItemById,
  markMarketingItemConverted,
  reviewMarketingItem,
  saveMarketingDirective,
  updateMarketingItemDraft,
} from "@/lib/marketing/store";
import {
  clampMarketingPlatformFields,
  getMarketingPlatformPrimaryText,
  resolveMarketingPlatform,
} from "@/shared/types/marketing-channels";
import type { MarketingChannel } from "@/shared/types/marketing-post";
import type {
  MarketingBrandKit,
  MarketingHqConfig,
  MarketingItem,
  MarketingSocialPostContent,
} from "@/shared/types/marketing-ai-hq";
import {
  isMarketingHqConfigComplete,
  normalizeMarketingBrandKit,
  normalizeMarketingHqConfig,
} from "@/shared/types/marketing-ai-hq";

const HQ_PATH = "/marketing/hq";

export type MarketingHqActionResult = {
  error?: string;
};

export type MarketingHqRunActionResult = {
  error?: string;
  itemsCreated?: number;
};

export type MarketingHqReviewActionResult = {
  error?: string;
  item?: MarketingItem;
};

function revalidateHqPaths() {
  revalidatePath(HQ_PATH);
  revalidatePath("/marketing");
}

async function assertFounderHqPermission() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (!canAccessPlatformAdmin(context.user)) {
    return {
      error: "Marketing AI HQ is limited to platform admins.",
    } as const;
  }

  return { context } as const;
}

export async function saveMarketingHqConfigAction(
  input: MarketingHqConfig,
): Promise<MarketingHqActionResult> {
  const permission = await assertFounderHqPermission();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalized = normalizeMarketingHqConfig(
    input as unknown as Record<string, unknown>,
  );

  if (!isMarketingHqConfigComplete(normalized)) {
    return {
      error: "Mission, audience, and goals are required before saving.",
    };
  }

  const result = await saveMarketingDirective(
    permission.context.company.id,
    "hq_config",
    normalized as unknown as Record<string, unknown>,
    permission.context.user.id,
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidateHqPaths();
  return {};
}

export async function saveMarketingBrandKitAction(
  input: MarketingBrandKit,
): Promise<MarketingHqActionResult> {
  const permission = await assertFounderHqPermission();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalized = normalizeMarketingBrandKit(
    input as unknown as Record<string, unknown>,
  );

  const result = await saveMarketingDirective(
    permission.context.company.id,
    "brand_kit",
    normalized as unknown as Record<string, unknown>,
    permission.context.user.id,
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidateHqPaths();
  return {};
}

export async function runMarketingCopywriterBatchAction(): Promise<MarketingHqRunActionResult> {
  const permission = await assertFounderHqPermission();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const rateLimit = checkAiRateLimit({
    companyId: permission.context.company.id,
    userId: permission.context.user.id,
    feature: MARKETING_HQ_COPYWRITER_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const result = await runMarketingCopywriterBatch(
    permission.context.company.id,
    "manual",
  );

  if (!result.ok) {
    return { error: result.error ?? "Copywriter run failed." };
  }

  revalidateHqPaths();
  return { itemsCreated: result.itemsCreated };
}

export async function runMarketingSeoBatchAction(): Promise<MarketingHqRunActionResult> {
  const permission = await assertFounderHqPermission();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const rateLimit = checkAiRateLimit({
    companyId: permission.context.company.id,
    userId: permission.context.user.id,
    feature: MARKETING_HQ_SEO_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const result = await runMarketingSeoBatch(
    permission.context.company.id,
    "manual",
  );

  if (!result.ok) {
    return { error: result.error ?? "SEO run failed." };
  }

  revalidateHqPaths();
  return { itemsCreated: result.itemsCreated };
}

export async function runMarketingVideoBriefAction(): Promise<MarketingHqRunActionResult> {
  const permission = await assertFounderHqPermission();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const rateLimit = checkAiRateLimit({
    companyId: permission.context.company.id,
    userId: permission.context.user.id,
    feature: MARKETING_HQ_VIDEO_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const result = await runMarketingVideoBrief(
    permission.context.company.id,
    "manual",
  );

  if (!result.ok) {
    return { error: result.error ?? "Video brief run failed." };
  }

  revalidateHqPaths();
  return { itemsCreated: result.itemsCreated };
}

export async function runMarketingStrategistAction(): Promise<MarketingHqRunActionResult> {
  const permission = await assertFounderHqPermission();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const rateLimit = checkAiRateLimit({
    companyId: permission.context.company.id,
    userId: permission.context.user.id,
    feature: MARKETING_HQ_STRATEGIST_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const result = await runMarketingStrategist(
    permission.context.company.id,
    "manual",
  );

  if (!result.ok) {
    return { error: result.error ?? "Strategist run failed." };
  }

  revalidateHqPaths();
  return { itemsCreated: result.itemsCreated };
}

export async function reviewMarketingItemAction(
  itemId: string,
  decision: "approved" | "rejected",
  reviewNote?: string,
): Promise<MarketingHqReviewActionResult> {
  const permission = await assertFounderHqPermission();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalizedItemId = itemId?.trim();
  if (!normalizedItemId) {
    return { error: "A valid item is required." };
  }

  if (decision !== "approved" && decision !== "rejected") {
    return { error: "Choose approve or reject." };
  }

  const result = await reviewMarketingItem(
    permission.context.company.id,
    normalizedItemId,
    decision,
    reviewNote,
  );

  if (result.error || !result.item) {
    return { error: result.error ?? "Could not save the review." };
  }

  revalidateHqPaths();
  return { item: result.item };
}

function resolvePostChannel(channelHint: string | null): MarketingChannel {
  return resolveMarketingPlatform(channelHint).hubChannel;
}

/**
 * Edit a draft item's platform fields before review. Fields are clamped to
 * the channel's registry limits server-side — the client is never trusted.
 */
export async function updateMarketingItemFieldsAction(
  itemId: string,
  fields: Record<string, string>,
): Promise<MarketingHqReviewActionResult> {
  const permission = await assertFounderHqPermission();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalizedItemId = itemId?.trim();
  if (!normalizedItemId) {
    return { error: "A valid item is required." };
  }

  const item = await getMarketingItemById(
    permission.context.company.id,
    normalizedItemId,
  );

  if (!item) {
    return { error: "Item not found." };
  }

  if (item.status !== "draft") {
    return { error: "Only unreviewed drafts can be edited." };
  }

  if (item.kind !== "social_post") {
    return { error: "Only social posts support field editing right now." };
  }

  const spec = resolveMarketingPlatform(item.channelHint);
  const clamped = clampMarketingPlatformFields(spec, fields);
  const primaryText = getMarketingPlatformPrimaryText(spec, clamped);

  if (!primaryText) {
    return { error: `${spec.label} needs its main text before saving.` };
  }

  const nextContent: Record<string, unknown> = {
    ...item.content,
    fields: clamped,
    postText: primaryText,
  };

  const result = await updateMarketingItemDraft(
    permission.context.company.id,
    item.id,
    {
      bodyText: primaryText,
      content: nextContent,
    },
  );

  if (result.error || !result.item) {
    return { error: result.error ?? "Could not save the edit." };
  }

  revalidateHqPaths();
  return { item: result.item };
}

/**
 * Push an approved social post into the existing Marketing Hub as a draft.
 * From there the proven pipeline applies (manual posting, founder FB/IG
 * publish). This is the ONLY bridge out of the approval queue.
 */
export async function convertMarketingItemToPostAction(
  itemId: string,
): Promise<MarketingHqReviewActionResult> {
  const permission = await assertFounderHqPermission();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalizedItemId = itemId?.trim();
  if (!normalizedItemId) {
    return { error: "A valid item is required." };
  }

  const item = await getMarketingItemById(
    permission.context.company.id,
    normalizedItemId,
  );

  if (!item) {
    return { error: "Item not found." };
  }

  if (item.kind !== "social_post") {
    return { error: "Only social posts can be sent to the Marketing Hub." };
  }

  if (item.status !== "approved") {
    return { error: "Approve the item before sending it to the Marketing Hub." };
  }

  const content = item.content as Partial<MarketingSocialPostContent>;
  const postText =
    typeof content.postText === "string" && content.postText.trim()
      ? content.postText
      : item.bodyText;

  if (!postText.trim()) {
    return { error: "This item has no post text." };
  }

  const hashtags = Array.isArray(content.hashtags)
    ? content.hashtags.filter(
        (tag): tag is string => typeof tag === "string" && tag.trim().length > 0,
      )
    : [];

  const created = await createMarketingPost(
    permission.context.company.id,
    permission.context.user.id,
    {
      title: item.title,
      channelTarget: resolvePostChannel(item.channelHint),
      postText,
      suggestedHashtags: hashtags,
      callToAction:
        typeof content.callToAction === "string" && content.callToAction.trim()
          ? content.callToAction
          : null,
      status: "draft",
      sourceType: "product_update",
      sourceId: item.id,
    },
  );

  if (created.error || !created.post) {
    return { error: created.error ?? "Could not create the Marketing Hub draft." };
  }

  const marked = await markMarketingItemConverted(
    permission.context.company.id,
    item.id,
    created.post.id,
  );

  if (marked.error || !marked.item) {
    return {
      error:
        "The Marketing Hub draft was created, but marking the item converted failed. Refresh and check the queue.",
    };
  }

  revalidateHqPaths();
  return { item: marked.item };
}

export type MarketingHqPublishActionResult = {
  error?: string;
  permalinkUrl?: string;
};

/**
 * One-click distribution for an approved Facebook social post: convert into
 * the Marketing Hub, then publish through the existing proven Facebook
 * pipeline (connected Page + encrypted token). Human-triggered only.
 */
export async function publishMarketingItemToFacebookAction(
  itemId: string,
): Promise<MarketingHqPublishActionResult> {
  const permission = await assertFounderHqPermission();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalizedItemId = itemId?.trim();
  if (!normalizedItemId) {
    return { error: "A valid item is required." };
  }

  const item = await getMarketingItemById(
    permission.context.company.id,
    normalizedItemId,
  );

  if (!item) {
    return { error: "Item not found." };
  }

  if (item.kind !== "social_post") {
    return { error: "Only social posts can be published." };
  }

  if (resolveMarketingPlatform(item.channelHint).id !== "facebook") {
    return { error: "This item is not a Facebook post." };
  }

  if (item.status !== "approved") {
    return { error: "Approve the post before publishing." };
  }

  const accounts = await listMarketingConnectedAccounts(
    permission.context.company.id,
  );
  const page = accounts.find(
    (account) =>
      account.provider === "facebook" &&
      account.status === "connected" &&
      Boolean(account.providerResourceId?.trim()),
  );

  if (!page) {
    return {
      error:
        "No connected Facebook Page. Connect one from the Marketing Hub first.",
    };
  }

  const converted = await convertMarketingItemToPostAction(item.id);
  if (converted.error || !converted.item?.convertedPostId) {
    return { error: converted.error ?? "Could not stage the post for publish." };
  }

  const published = await publishMarketingPostToFacebookAction(
    converted.item.convertedPostId,
    page.id,
  );

  if (published.error) {
    return {
      error: `Staged in Marketing Hub, but Facebook publish failed: ${published.error}`,
    };
  }

  revalidateHqPaths();
  return { permalinkUrl: published.permalinkUrl };
}
