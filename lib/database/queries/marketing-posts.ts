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
  const supabase = await createClient();
  const update = mapMarketingPostUpdateInputToRow(input);

  const { data, error } = await marketingPostsTable(supabase)
    .update(update)
    .eq("company_id", companyId)
    .eq("id", postId)
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
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await marketingPostsTable(supabase)
    .update({
      status: "posted",
      posted_at: now,
      archived_at: null,
    })
    .eq("company_id", companyId)
    .eq("id", postId)
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
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data, error } = await marketingPostsTable(supabase)
    .update({
      status: "archived",
      archived_at: now,
    })
    .eq("company_id", companyId)
    .eq("id", postId)
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
