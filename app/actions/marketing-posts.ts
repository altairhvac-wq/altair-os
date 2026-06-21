"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { canAccessPlatformAdmin } from "@/lib/database/platform-admin";
import {
  isCompletedJobAvailableForMarketing,
  listCompletedJobsForMarketing,
} from "@/lib/database/queries/marketing-completed-jobs";
import {
  archiveMarketingPost,
  createMarketingPost,
  createRecurringMarketingPostCopies,
  duplicateMarketingPost,
  getMarketingPostById,
  markMarketingPostPosted,
  softDeleteMarketingPost,
  updateMarketingPost,
  type MarketingRecurringScheduleOptions,
} from "@/lib/database/queries/marketing-posts";
import type { MarketingCompletedJobPickerItem } from "@/shared/types/marketing-completed-job";
import type {
  MarketingChannel,
  MarketingPost,
  MarketingPostCreateInput,
  MarketingPostSource,
  MarketingPostStatus,
  MarketingPostUpdateInput,
  MarketingRecurringFrequency,
  MarketingRecurringOccurrences,
} from "@/shared/types/marketing-post";
import {
  MARKETING_CHANNEL_OPTIONS,
  MARKETING_POST_SOURCE_OPTIONS,
  MARKETING_POST_STATUS_OPTIONS,
  MARKETING_RECURRING_FREQUENCY_OPTIONS,
  MARKETING_RECURRING_OCCURRENCE_OPTIONS,
} from "@/shared/types/marketing-post";

export type MarketingPostActionResult = {
  error?: string;
  post?: MarketingPost;
};

export type MarketingCompletedJobsListActionResult = {
  error?: string;
  jobs?: MarketingCompletedJobPickerItem[];
};

export type MarketingRecurringPostsActionResult = {
  error?: string;
  posts?: MarketingPost[];
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

const MARKETING_RECURRING_FREQUENCIES = new Set<MarketingRecurringFrequency>(
  MARKETING_RECURRING_FREQUENCY_OPTIONS,
);

const MARKETING_RECURRING_OCCURRENCES = new Set<MarketingRecurringOccurrences>(
  MARKETING_RECURRING_OCCURRENCE_OPTIONS,
);

const RECURRING_START_TOLERANCE_MS = 60_000;

const FOUNDER_MARKETING_SOURCES = new Set<MarketingPostSource>([
  "founder_milestone",
  "product_update",
]);

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

function validateFounderSourcePermission(
  sourceType: MarketingPostSource | undefined,
  user: { email: string | undefined },
): string | null {
  if (sourceType === undefined || sourceType === null) {
    return null;
  }

  if (!FOUNDER_MARKETING_SOURCES.has(sourceType)) {
    return null;
  }

  if (!canAccessPlatformAdmin(user)) {
    return "You do not have permission to save this type of marketing post.";
  }

  return null;
}

function isFounderMarketingSource(
  sourceType: MarketingPostSource | undefined,
): boolean {
  return (
    sourceType !== undefined &&
    sourceType !== null &&
    FOUNDER_MARKETING_SOURCES.has(sourceType)
  );
}

function normalizeFounderScreenshotReference(
  value: string | null | undefined,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateFounderScreenshotReferencePermission(
  founderScreenshotReference: string | null | undefined,
  sourceType: MarketingPostSource | undefined,
  user: { email: string | undefined },
): string | null {
  const normalized = normalizeFounderScreenshotReference(
    founderScreenshotReference,
  );
  if (!normalized) {
    return null;
  }

  if (!canAccessPlatformAdmin(user)) {
    return "You do not have permission to attach founder screenshots.";
  }

  if (!isFounderMarketingSource(sourceType)) {
    return "Founder screenshots are only allowed on founder marketing drafts.";
  }

  return null;
}

function stripUnauthorizedFounderScreenshotReference(
  input: MarketingPostCreateInput | MarketingPostUpdateInput,
  user: { email: string | undefined },
  sourceType: MarketingPostSource | undefined,
): void {
  if (input.founderScreenshotReference === undefined) {
    return;
  }

  const permissionError = validateFounderScreenshotReferencePermission(
    input.founderScreenshotReference,
    sourceType,
    user,
  );

  if (permissionError) {
    delete input.founderScreenshotReference;
  }
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
    input.scheduledAt !== undefined ||
    input.founderScreenshotReference !== undefined;

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

function applyScheduleStatusCouplingForCreate(
  normalized: MarketingPostCreateInput,
): void {
  if (normalized.scheduledAt) {
    normalized.status = "scheduled";
    return;
  }

  if (normalized.status === "scheduled") {
    normalized.status = "draft";
  }
}

function applyScheduleStatusCouplingForUpdate(
  normalized: MarketingPostUpdateInput,
  existing: MarketingPost,
): void {
  if (normalized.scheduledAt === "") {
    normalized.scheduledAt = null;
  }

  if (normalized.scheduledAt !== undefined) {
    if (normalized.scheduledAt) {
      normalized.status = "scheduled";
    } else if (existing.status === "scheduled") {
      normalized.status = "draft";
    }
  }

  const effectiveScheduledAt =
    normalized.scheduledAt !== undefined
      ? normalized.scheduledAt
      : existing.scheduledAt ?? null;
  const effectiveStatus =
    normalized.status !== undefined ? normalized.status : existing.status;

  if (effectiveStatus === "scheduled" && !effectiveScheduledAt) {
    normalized.status = "draft";
  }
}

function normalizeCreateMarketingPostInput(
  input: MarketingPostCreateInput,
): MarketingPostCreateInput {
  const sourceType = input.sourceType ?? "manual";

  const normalized: MarketingPostCreateInput = {
    title: input.title.trim(),
    channelTarget: input.channelTarget,
    postText: input.postText?.trim() ?? "",
    suggestedHashtags: normalizeSuggestedHashtags(input.suggestedHashtags),
    callToAction: input.callToAction?.trim() || null,
    status: input.status,
    sourceType,
    sourceId:
      sourceType === "completed_job" ? input.sourceId?.trim() || null : null,
    scheduledAt: input.scheduledAt ?? null,
    founderScreenshotReference: normalizeFounderScreenshotReference(
      input.founderScreenshotReference,
    ),
  };

  applyScheduleStatusCouplingForCreate(normalized);

  return normalized;
}

function normalizeUpdateMarketingPostInput(
  input: MarketingPostUpdateInput,
  existing: MarketingPost,
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
  if (normalized.founderScreenshotReference !== undefined) {
    normalized.founderScreenshotReference = normalizeFounderScreenshotReference(
      normalized.founderScreenshotReference,
    );
  }

  applyScheduleStatusCouplingForUpdate(normalized, existing);

  return normalized;
}

export async function listCompletedJobsForMarketingAction(): Promise<MarketingCompletedJobsListActionResult> {
  const permission = await assertMarketingPostManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  try {
    const jobs = await listCompletedJobsForMarketing(
      permission.context.company.id,
    );
    return { jobs };
  } catch (error) {
    console.error("[listCompletedJobsForMarketingAction] failed:", error);
    return {
      error: "We couldn't load completed jobs for marketing. Try again.",
    };
  }
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

  const founderSourceError = validateFounderSourcePermission(
    normalized.sourceType,
    permission.context.user,
  );
  if (founderSourceError) {
    return { error: founderSourceError };
  }

  const founderScreenshotError = validateFounderScreenshotReferencePermission(
    input.founderScreenshotReference,
    normalized.sourceType,
    permission.context.user,
  );
  if (founderScreenshotError) {
    return { error: founderScreenshotError };
  }

  stripUnauthorizedFounderScreenshotReference(
    normalized,
    permission.context.user,
    normalized.sourceType,
  );

  if (normalized.sourceType === "completed_job") {
    const sourceId = normalized.sourceId?.trim() ?? "";
    if (!sourceId) {
      return { error: "A completed job is required for this draft source." };
    }

    const isValidJob = await isCompletedJobAvailableForMarketing(
      permission.context.company.id,
      sourceId,
    );
    if (!isValidJob) {
      return {
        error: "The selected completed job is no longer available.",
      };
    }
  }

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

  const founderSourceError = validateFounderSourcePermission(
    input.sourceType,
    permission.context.user,
  );
  if (founderSourceError) {
    return { error: founderSourceError };
  }

  const existing = await getMarketingPostById(
    permission.context.company.id,
    normalizedPostId,
  );
  if (!existing) {
    return { error: "Marketing post not found." };
  }

  const founderScreenshotError = validateFounderScreenshotReferencePermission(
    input.founderScreenshotReference,
    existing.sourceType,
    permission.context.user,
  );
  if (founderScreenshotError) {
    return { error: founderScreenshotError };
  }

  if (existing.status === "archived") {
    return { error: "Archived posts cannot be edited." };
  }

  if (existing.status === "posted") {
    return { error: "Posted posts cannot be edited from this form." };
  }

  const normalized = normalizeUpdateMarketingPostInput(input, existing);
  // Source tracking is set at create time and must not be changed afterward.
  delete normalized.sourceType;
  delete normalized.sourceId;

  stripUnauthorizedFounderScreenshotReference(
    normalized,
    permission.context.user,
    existing.sourceType,
  );

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

  if (existing.status === "archived") {
    return { error: "Archived posts cannot be marked posted." };
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

  if (existing.status === "archived") {
    return { error: "This post is already archived." };
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

export async function duplicateMarketingPostAction(
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

  if (existing.status !== "posted" && existing.status !== "archived") {
    return {
      error: "Only posted or archived posts can be reused.",
    };
  }

  const { post, error } = await duplicateMarketingPost(
    permission.context.company.id,
    permission.context.user.id,
    normalizedPostId,
  );

  if (error || !post) {
    return {
      error: error ?? "We couldn't create a copy of this post. Try again.",
    };
  }

  revalidateMarketingPaths();
  return { post };
}

function validateRecurringMarketingPostOptions(
  options: MarketingRecurringScheduleOptions,
): string | null {
  const startAt = options.startAt?.trim() ?? "";
  if (!startAt) {
    return "Choose a valid recurring schedule.";
  }

  const parsedStart = Date.parse(startAt);
  if (Number.isNaN(parsedStart)) {
    return "Choose a valid recurring schedule.";
  }

  if (!MARKETING_RECURRING_FREQUENCIES.has(options.frequency)) {
    return "Choose a valid recurring schedule.";
  }

  if (!MARKETING_RECURRING_OCCURRENCES.has(options.occurrences)) {
    return "Choose a valid recurring schedule.";
  }

  if (parsedStart < Date.now() - RECURRING_START_TOLERANCE_MS) {
    return "Choose a future start date.";
  }

  return null;
}

export async function createRecurringMarketingPostsAction(
  sourcePostId: string,
  options: MarketingRecurringScheduleOptions,
): Promise<MarketingRecurringPostsActionResult> {
  const permission = await assertMarketingPostManager();
  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const normalizedSourcePostId = normalizePostId(sourcePostId);
  if (!normalizedSourcePostId) {
    return { error: "A valid marketing post is required." };
  }

  const validationError = validateRecurringMarketingPostOptions(options);
  if (validationError) {
    return { error: validationError };
  }

  const { posts, error } = await createRecurringMarketingPostCopies(
    permission.context.company.id,
    permission.context.user.id,
    normalizedSourcePostId,
    {
      startAt: options.startAt.trim(),
      frequency: options.frequency,
      occurrences: options.occurrences,
    },
  );

  if (error || !posts) {
    return {
      error:
        error ?? "We couldn't schedule recurring copies of this post. Try again.",
    };
  }

  revalidateMarketingPaths();
  return { posts };
}

export async function deleteMarketingPostAction(
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

  if (existing.status !== "archived") {
    return { error: "Only archived posts can be deleted." };
  }

  const { post, error } = await softDeleteMarketingPost(
    permission.context.company.id,
    normalizedPostId,
  );

  if (error || !post) {
    return {
      error: error ?? "We couldn't delete this marketing post. Try again.",
    };
  }

  revalidateMarketingPaths();
  return { post };
}
