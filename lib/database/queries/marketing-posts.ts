import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import type {
  MarketingChannel,
  MarketingPost,
  MarketingPostCreateInput,
  MarketingPostSource,
  MarketingPostStatus,
  MarketingPostUpdateInput,
} from "@/shared/types/marketing-post";

type MarketingPostRow = {
  id: string;
  company_id: string;
  title: string;
  channel_target: MarketingChannel;
  post_text: string;
  suggested_hashtags: string[];
  call_to_action: string | null;
  status: MarketingPostStatus;
  source_type: MarketingPostSource;
  source_id: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type MarketingPostInsert = {
  company_id: string;
  created_by: string;
  title: string;
  channel_target?: MarketingChannel;
  post_text?: string;
  suggested_hashtags?: string[];
  call_to_action?: string | null;
  status?: MarketingPostStatus;
  source_type?: MarketingPostSource;
  source_id?: string | null;
  scheduled_at?: string | null;
};

type MarketingPostRowUpdate = {
  title?: string;
  channel_target?: MarketingChannel;
  post_text?: string;
  suggested_hashtags?: string[];
  call_to_action?: string | null;
  status?: MarketingPostStatus;
  source_type?: MarketingPostSource;
  source_id?: string | null;
  scheduled_at?: string | null;
  posted_at?: string | null;
  archived_at?: string | null;
};

type MarketingPostsClient = Awaited<ReturnType<typeof createClient>>;

function marketingPostsTable(client: MarketingPostsClient) {
  // marketing_posts: migration 087 — wire into Database types on next gen types run
  return (client as MarketingPostsClient & {
    from(table: "marketing_posts"): ReturnType<MarketingPostsClient["from"]>;
  }).from("marketing_posts");
}

function mapMarketingPostRow(row: MarketingPostRow): MarketingPost {
  return {
    id: row.id,
    companyId: row.company_id,
    title: row.title,
    channelTarget: row.channel_target,
    postText: row.post_text,
    suggestedHashtags: row.suggested_hashtags,
    callToAction: row.call_to_action ?? undefined,
    status: row.status,
    sourceType: row.source_type,
    sourceId: row.source_id ?? undefined,
    scheduledAt: row.scheduled_at ?? undefined,
    postedAt: row.posted_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? null,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMarketingPostCreateInputToInsert(
  companyId: string,
  userId: string,
  input: MarketingPostCreateInput,
): MarketingPostInsert {
  return {
    company_id: companyId,
    created_by: userId,
    title: input.title.trim(),
    channel_target: input.channelTarget ?? "general",
    post_text: input.postText ?? "",
    suggested_hashtags: input.suggestedHashtags ?? [],
    call_to_action: input.callToAction?.trim() || null,
    status: input.status ?? "draft",
    source_type: input.sourceType ?? "manual",
    source_id: input.sourceId ?? null,
    scheduled_at: input.scheduledAt ?? null,
  };
}

function mapMarketingPostUpdateInputToRow(
  input: MarketingPostUpdateInput,
): MarketingPostRowUpdate {
  const update: MarketingPostRowUpdate = {};

  if (input.title !== undefined) {
    update.title = input.title.trim();
  }
  if (input.channelTarget !== undefined) {
    update.channel_target = input.channelTarget;
  }
  if (input.postText !== undefined) {
    update.post_text = input.postText;
  }
  if (input.suggestedHashtags !== undefined) {
    update.suggested_hashtags = input.suggestedHashtags;
  }
  if (input.callToAction !== undefined) {
    update.call_to_action = input.callToAction?.trim() || null;
  }
  if (input.status !== undefined) {
    update.status = input.status;
  }
  if (input.sourceType !== undefined) {
    update.source_type = input.sourceType;
  }
  if (input.sourceId !== undefined) {
    update.source_id = input.sourceId;
  }
  if (input.scheduledAt !== undefined) {
    update.scheduled_at = input.scheduledAt;
  }

  return update;
}

export async function listMarketingPosts(
  companyId: string,
): Promise<MarketingPost[]> {
  const supabase = await createClient();

  const { data, error } = await marketingPostsTable(supabase)
    .select("*")
    .eq("company_id", companyId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[listMarketingPosts] query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as MarketingPostRow[]).map(mapMarketingPostRow);
}

export async function getMarketingPostById(
  companyId: string,
  postId: string,
): Promise<MarketingPost | null> {
  const supabase = await createClient();

  const { data, error } = await marketingPostsTable(supabase)
    .select("*")
    .eq("company_id", companyId)
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[getMarketingPostById] query failed:", {
      companyId,
      postId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data ? mapMarketingPostRow(data as MarketingPostRow) : null;
}

export async function createMarketingPost(
  companyId: string,
  userId: string,
  input: MarketingPostCreateInput,
): Promise<{ post: MarketingPost | null; error: string | null }> {
  const supabase = await createClient();
  const insert = mapMarketingPostCreateInputToInsert(companyId, userId, input);

  const { data, error } = await marketingPostsTable(supabase)
    .insert(insert)
    .select("*")
    .single();

  if (error || !data) {
    return {
      post: null,
      error: mapDatabaseError(error),
    };
  }

  return {
    post: mapMarketingPostRow(data as MarketingPostRow),
    error: null,
  };
}

export async function updateMarketingPost(
  companyId: string,
  postId: string,
  input: MarketingPostUpdateInput,
): Promise<{ post: MarketingPost | null; error: string | null }> {
  const existing = await getMarketingPostById(companyId, postId);
  if (!existing) {
    return { post: null, error: "Marketing post not found." };
  }

  if (existing.status === "archived") {
    return { post: null, error: "Archived posts cannot be edited." };
  }

  if (existing.status === "posted") {
    return {
      post: null,
      error: "Posted posts cannot be edited from this form.",
    };
  }

  const supabase = await createClient();
  const update = mapMarketingPostUpdateInputToRow(input);

  const { data, error } = await marketingPostsTable(supabase)
    .update(update)
    .eq("company_id", companyId)
    .eq("id", postId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error || !data) {
    return {
      post: null,
      error: mapDatabaseError(error),
    };
  }

  return {
    post: mapMarketingPostRow(data as MarketingPostRow),
    error: null,
  };
}

export async function markMarketingPostPosted(
  companyId: string,
  postId: string,
): Promise<{ post: MarketingPost | null; error: string | null }> {
  const existing = await getMarketingPostById(companyId, postId);
  if (!existing) {
    return { post: null, error: "Marketing post not found." };
  }

  if (existing.status === "archived") {
    return { post: null, error: "Archived posts cannot be marked posted." };
  }

  if (existing.status === "posted") {
    return { post: existing, error: null };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await marketingPostsTable(supabase)
    .update({
      status: "posted",
      posted_at: now,
    })
    .eq("company_id", companyId)
    .eq("id", postId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error || !data) {
    return {
      post: null,
      error: mapDatabaseError(error),
    };
  }

  return {
    post: mapMarketingPostRow(data as MarketingPostRow),
    error: null,
  };
}

const REUSABLE_MARKETING_POST_STATUSES = new Set<MarketingPostStatus>([
  "posted",
  "archived",
]);

export type DuplicateMarketingPostOptions = {
  titleSuffix?: string;
  allowedStatuses?: MarketingPostStatus[];
};

export async function duplicateMarketingPost(
  companyId: string,
  userId: string,
  postId: string,
  options?: DuplicateMarketingPostOptions,
): Promise<{ post: MarketingPost | null; error: string | null }> {
  const existing = await getMarketingPostById(companyId, postId);
  if (!existing) {
    return { post: null, error: "Marketing post not found." };
  }

  const allowedStatuses =
    options?.allowedStatuses ?? [...REUSABLE_MARKETING_POST_STATUSES];
  if (!allowedStatuses.includes(existing.status)) {
    return {
      post: null,
      error: "Only posted or archived posts can be reused.",
    };
  }

  const titleSuffix = options?.titleSuffix ?? " (copy)";
  const supabase = await createClient();
  const insert: MarketingPostInsert = {
    company_id: companyId,
    created_by: userId,
    title: `${existing.title}${titleSuffix}`.trim(),
    channel_target: existing.channelTarget,
    post_text: existing.postText,
    suggested_hashtags: existing.suggestedHashtags,
    call_to_action: existing.callToAction?.trim() || null,
    status: "draft",
    source_type: "manual",
    source_id: null,
    scheduled_at: null,
  };

  const { data, error } = await marketingPostsTable(supabase)
    .insert(insert)
    .select("*")
    .single();

  if (error || !data) {
    return {
      post: null,
      error: mapDatabaseError(error),
    };
  }

  return {
    post: mapMarketingPostRow(data as MarketingPostRow),
    error: null,
  };
}

export async function archiveMarketingPost(
  companyId: string,
  postId: string,
): Promise<{ post: MarketingPost | null; error: string | null }> {
  const existing = await getMarketingPostById(companyId, postId);
  if (!existing) {
    return { post: null, error: "Marketing post not found." };
  }

  if (existing.status === "archived") {
    return { post: existing, error: "This post is already archived." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await marketingPostsTable(supabase)
    .update({
      status: "archived",
      archived_at: now,
    })
    .eq("company_id", companyId)
    .eq("id", postId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error || !data) {
    return {
      post: null,
      error: mapDatabaseError(error),
    };
  }

  return {
    post: mapMarketingPostRow(data as MarketingPostRow),
    error: null,
  };
}

export async function softDeleteMarketingPost(
  companyId: string,
  postId: string,
): Promise<{ post: MarketingPost | null; error: string | null }> {
  const existing = await getMarketingPostById(companyId, postId);
  if (!existing) {
    return { post: null, error: "Marketing post not found." };
  }

  if (existing.status !== "archived") {
    return { post: null, error: "Only archived posts can be deleted." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await marketingPostsTable(supabase)
    .update({ deleted_at: now })
    .eq("company_id", companyId)
    .eq("id", postId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error || !data) {
    return {
      post: null,
      error: mapDatabaseError(error),
    };
  }

  return {
    post: mapMarketingPostRow(data as MarketingPostRow),
    error: null,
  };
}
