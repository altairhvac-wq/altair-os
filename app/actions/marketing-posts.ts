"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  archiveMarketingPost,
  createMarketingPost,
  getMarketingPostById,
  markMarketingPostPosted,
  updateMarketingPost,
} from "@/lib/database/queries/marketing-posts";
import type {
  MarketingChannel,
  MarketingPost,
  MarketingPostCreateInput,
  MarketingPostSource,
  MarketingPostStatus,
  MarketingPostUpdateInput,
} from "@/shared/types/marketing-post";
import {
  MARKETING_CHANNEL_OPTIONS,
  MARKETING_POST_SOURCE_OPTIONS,
  MARKETING_POST_STATUS_OPTIONS,
} from "@/shared/types/marketing-post";

export type MarketingPostActionResult = {
  error?: string;
  post?: MarketingPost;
};

const MARKETING_CHANNELS = new Set<MarketingChannel>(
  MARKETING_CHANNEL_OPTIONS.map((option) => option.value),
);

const MARKETING_STATUSES = new Set<MarketingPostStatus>(
  MARKETING_POST_STATUS_OPTIONS.map((option) => option.value),
);

const MARKETING_SOURCES = new Set<MarketingPostSource>(
  MARKETING_POST_SOURCE_OPTIONS.map((option) => option.value),
);

const LIFECYCLE_STATUSES = new Set<MarketingPostStatus>(["posted", "archived"]);

function revalidateMarketingPaths() {
  revalidatePath("/marketing");
}

async function assertMarketingPostManager() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (!context.permissions.dispatchJobs) {
    return {
      error: "You do not have permission to manage marketing posts.",
    } as const;
  }

  return { context } as const;
}

function normalizePostId(postId: string): string {
  return postId.trim();
}

function normalizeSuggestedHashtags(value: unknown): string[] {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,]+/)
      : [];

  const normalized = rawItems
    .map((item) => String(item).trim().replace(/^#+/, ""))
    .filter((item) => item.length > 0);

  return [...new Set(normalized)];
}

function validateMarketingChannel(
  channelTarget: MarketingChannel | undefined,
  required: boolean,
): string | null {
  if (channelTarget === undefined || channelTarget === null) {
    return required ? "Choose a marketing channel." : null;
  }

  if (!MARKETING_CHANNELS.has(channelTarget)) {
    return "Choose a valid marketing channel.";
  }

  return null;
}

function validateMarketingPostStatus(
  status: MarketingPostStatus | undefined,
  allowLifecycleStatus: boolean,
): string | null {
  if (status === undefined || status === null) {
    return null;
  }

  if (!MARKETING_STATUSES.has(status)) {
    return "Choose a valid post status.";
  }

  if (!allowLifecycleStatus && LIFECYCLE_STATUSES.has(status)) {
    return "Use the dedicated action to mark a post as posted or archived.";
  }

  return null;
}

function validateMarketingPostSource(
  sourceType: MarketingPostSource | undefined,
): string | null {
  if (sourceType === undefined || sourceType === null) {
    return null;
  }

  if (!MARKETING_SOURCES.has(sourceType)) {
    return "Choose a valid post source.";
  }

  return null;
}

function validateScheduledAt(scheduledAt: string | null | undefined): string | null {
  if (scheduledAt === undefined || scheduledAt === null || scheduledAt === "") {
    return null;
  }

  const parsed = Date.parse(scheduledAt);
  if (Number.isNaN(parsed)) {
    return "Enter a valid schedule date and time.";
  }

  return null;
}

function validateCreateMarketingPostInput(
  input: MarketingPostCreateInput,
): string | null {
  const title = input.title?.trim() ?? "";
  if (!title) {
    return "Add a post title.";
  }

  const postText = input.postText?.trim() ?? "";
  if (!postText) {
    return "Add post text.";
  }

  const channelError = validateMarketingChannel(input.channelTarget, true);
  if (channelError) {
    return channelError;
  }

  const statusError = validateMarketingPostStatus(input.status, false);
  if (statusError) {
    return statusError;
  }

  const sourceError = validateMarketingPostSource(input.sourceType);
  if (sourceError) {
    return sourceError;
  }

  const scheduledError = validateScheduledAt(input.scheduledAt);
  if (scheduledError) {
    return scheduledError;
  }

  return null;
}

function validateUpdateMarketingPostInput(
  input: MarketingPostUpdateInput,
): string | null {
  const hasEditableField =
    input.title !== undefined ||
    input.channelTarget !== undefined ||
    input.postText !== undefined ||
    input.suggestedHashtags !== undefined ||
    input.callToAction !== undefined ||
    input.status !== undefined ||
    input.sourceType !== undefined ||
    input.sourceId !== undefined ||
    input.scheduledAt !== undefined;

  if (!hasEditableField) {
    return "No changes were provided.";
  }

  if (input.title !== undefined && !input.title.trim()) {
    return "Post title cannot be empty.";
  }

  if (input.postText !== undefined && !input.postText.trim()) {
    return "Post text cannot be empty.";
  }

  const channelError = validateMarketingChannel(input.channelTarget, false);
  if (channelError) {
    return channelError;
  }

  const statusError = validateMarketingPostStatus(input.status, false);
  if (statusError) {
    return statusError;
  }

  const sourceError = validateMarketingPostSource(input.sourceType);
  if (sourceError) {
    return sourceError;
  }

  const scheduledError = validateScheduledAt(input.scheduledAt);
  if (scheduledError) {
    return scheduledError;
  }

  return null;
}

function normalizeCreateMarketingPostInput(
  input: MarketingPostCreateInput,
): MarketingPostCreateInput {
  return {
    title: input.title.trim(),
    channelTarget: input.channelTarget,
    postText: input.postText?.trim() ?? "",
    suggestedHashtags: normalizeSuggestedHashtags(input.suggestedHashtags),
    callToAction: input.callToAction?.trim() || null,
    status: input.status,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    scheduledAt: input.scheduledAt ?? null,
  };
}

function normalizeUpdateMarketingPostInput(
  input: MarketingPostUpdateInput,
): MarketingPostUpdateInput {
  const normalized: MarketingPostUpdateInput = { ...input };

  if (normalized.title !== undefined) {
    normalized.title = normalized.title.trim();
  }
  if (normalized.postText !== undefined) {
    normalized.postText = normalized.postText.trim();
  }
  if (normalized.suggestedHashtags !== undefined) {
    normalized.suggestedHashtags = normalizeSuggestedHashtags(
      normalized.suggestedHashtags,
    );
  }
  if (normalized.callToAction !== undefined) {
    normalized.callToAction = normalized.callToAction?.trim() || null;
  }
  if (normalized.scheduledAt === "") {
    normalized.scheduledAt = null;
  }

  return normalized;
}

export async function createMarketingPostAction(
  input: MarketingPostCreateInput,
): Promise<MarketingPostActionResult> {
  const permission = await assertMarketingPostManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const validationError = validateCreateMarketingPostInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const normalized = normalizeCreateMarketingPostInput(input);
  const { post, error } = await createMarketingPost(
    permission.context.company.id,
    permission.context.user.id,
    normalized,
  );

  if (error || !post) {
    return {
      error: error ?? "We couldn't create this marketing post. Try again.",
    };
  }

  revalidateMarketingPaths();
  return { post };
}

export async function updateMarketingPostAction(
  postId: string,
  input: MarketingPostUpdateInput,
): Promise<MarketingPostActionResult> {
  const permission = await assertMarketingPostManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalizedPostId = normalizePostId(postId);
  if (!normalizedPostId) {
    return { error: "A valid marketing post is required." };
  }

  const validationError = validateUpdateMarketingPostInput(input);
  if (validationError) {
    return { error: validationError };
  }

  const existing = await getMarketingPostById(
    permission.context.company.id,
    normalizedPostId,
  );
  if (!existing) {
    return { error: "Marketing post not found." };
  }

  const normalized = normalizeUpdateMarketingPostInput(input);
  const { post, error } = await updateMarketingPost(
    permission.context.company.id,
    normalizedPostId,
    normalized,
  );

  if (error || !post) {
    return {
      error: error ?? "We couldn't save marketing post changes. Try again.",
    };
  }

  revalidateMarketingPaths();
  return { post };
}

export async function markMarketingPostPostedAction(
  postId: string,
): Promise<MarketingPostActionResult> {
  const permission = await assertMarketingPostManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalizedPostId = normalizePostId(postId);
  if (!normalizedPostId) {
    return { error: "A valid marketing post is required." };
  }

  const existing = await getMarketingPostById(
    permission.context.company.id,
    normalizedPostId,
  );
  if (!existing) {
    return { error: "Marketing post not found." };
  }

  const { post, error } = await markMarketingPostPosted(
    permission.context.company.id,
    normalizedPostId,
  );

  if (error || !post) {
    return {
      error: error ?? "We couldn't mark this marketing post as posted. Try again.",
    };
  }

  revalidateMarketingPaths();
  return { post };
}

export async function archiveMarketingPostAction(
  postId: string,
): Promise<MarketingPostActionResult> {
  const permission = await assertMarketingPostManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalizedPostId = normalizePostId(postId);
  if (!normalizedPostId) {
    return { error: "A valid marketing post is required." };
  }

  const existing = await getMarketingPostById(
    permission.context.company.id,
    normalizedPostId,
  );
  if (!existing) {
    return { error: "Marketing post not found." };
  }

  const { post, error } = await archiveMarketingPost(
    permission.context.company.id,
    normalizedPostId,
  );

  if (error || !post) {
    return {
      error: error ?? "We couldn't archive this marketing post. Try again.",
    };
  }

  revalidateMarketingPaths();
  return { post };
}
