import "server-only";

// Marketing AI HQ store — service-role reads/writes for the four HQ tables.
// Callers MUST have already passed founder gating (requirePlatformAdmin /
// canAccessPlatformAdmin) or CRON_SECRET authorization before calling in.
// Architecture: docs/product/MARKETING_AI_HQ.md

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type {
  MarketingDirective,
  MarketingDirectiveKind,
  MarketingItem,
  MarketingItemKind,
  MarketingItemStatus,
  MarketingRun,
  MarketingRunStatus,
  MarketingRunTrigger,
} from "@/shared/types/marketing-ai-hq";

const ERROR_SUMMARY_MAX_LENGTH = 500;
const REVIEW_NOTE_MAX_LENGTH = 1_000;

type HqServiceClient = ReturnType<typeof createServiceRoleClient>;

type HqTableName =
  | "marketing_directives"
  | "marketing_items"
  | "marketing_runs"
  | "marketing_metrics";

function hqTable(client: HqServiceClient, table: HqTableName) {
  // Marketing AI HQ tables: migration 133 — wire into Database types on next
  // gen types run. Until then, route through the untyped client shape the
  // same way marketing-posts does for its post-generation tables.
  return (client as unknown as SupabaseClient).from(table);
}

type MarketingDirectiveRow = {
  id: string;
  company_id: string;
  kind: MarketingDirectiveKind;
  content: Record<string, unknown> | null;
  created_at: string;
};

type MarketingItemRow = {
  id: string;
  company_id: string;
  kind: MarketingItemKind;
  status: MarketingItemStatus;
  role: string;
  title: string;
  body_text: string;
  content: Record<string, unknown> | null;
  channel_hint: string | null;
  run_id: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  converted_post_id: string | null;
  created_at: string;
  updated_at: string;
};

type MarketingRunRow = {
  id: string;
  company_id: string;
  run_key: string;
  status: MarketingRunStatus;
  trigger: MarketingRunTrigger;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  totals: Record<string, number> | null;
  report: Record<string, unknown> | null;
  error_summary: string | null;
};

export function sanitizeMarketingErrorSummary(error: unknown): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Marketing run failed";

  return (
    raw.trim().slice(0, ERROR_SUMMARY_MAX_LENGTH) || "Marketing run failed"
  );
}

function mapDirectiveRow(row: MarketingDirectiveRow): MarketingDirective {
  return {
    id: row.id,
    companyId: row.company_id,
    kind: row.kind,
    content:
      row.content && typeof row.content === "object" && !Array.isArray(row.content)
        ? row.content
        : {},
    createdAt: row.created_at,
  };
}

function mapItemRow(row: MarketingItemRow): MarketingItem {
  return {
    id: row.id,
    companyId: row.company_id,
    kind: row.kind,
    status: row.status,
    role: row.role,
    title: row.title,
    bodyText: row.body_text,
    content:
      row.content && typeof row.content === "object" && !Array.isArray(row.content)
        ? row.content
        : {},
    channelHint: row.channel_hint,
    runId: row.run_id,
    reviewNote: row.review_note,
    reviewedAt: row.reviewed_at,
    convertedPostId: row.converted_post_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRunRow(row: MarketingRunRow): MarketingRun {
  return {
    id: row.id,
    companyId: row.company_id,
    runKey: row.run_key,
    status: row.status,
    trigger: row.trigger,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
    totals:
      row.totals && typeof row.totals === "object" && !Array.isArray(row.totals)
        ? row.totals
        : {},
    report:
      row.report && typeof row.report === "object" && !Array.isArray(row.report)
        ? row.report
        : null,
    errorSummary: row.error_summary,
  };
}

export async function getActiveMarketingDirective(
  companyId: string,
  kind: MarketingDirectiveKind,
): Promise<MarketingDirective | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await hqTable(supabase, "marketing_directives")
    .select("id, company_id, kind, content, created_at")
    .eq("company_id", companyId)
    .eq("kind", kind)
    .is("superseded_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[marketing-store] active directive query failed:", {
      companyId,
      kind,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data ? mapDirectiveRow(data as MarketingDirectiveRow) : null;
}

/**
 * Save a directive by superseding the active row and inserting a new one.
 * Never destructive — history stays queryable.
 */
export async function saveMarketingDirective(
  companyId: string,
  kind: MarketingDirectiveKind,
  content: Record<string, unknown>,
  createdBy: string | null,
): Promise<{ directive: MarketingDirective | null; error: string | null }> {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { error: supersedeError } = await hqTable(supabase, "marketing_directives")
    .update({ superseded_at: now })
    .eq("company_id", companyId)
    .eq("kind", kind)
    .is("superseded_at", null);

  if (supersedeError) {
    console.error("[marketing-store] directive supersede failed:", {
      companyId,
      kind,
      code: supersedeError.code,
      message: supersedeError.message,
    });
    return { directive: null, error: "Could not save the update." };
  }

  const { data, error } = await hqTable(supabase, "marketing_directives")
    .insert({
      company_id: companyId,
      kind,
      content,
      created_by: createdBy,
    })
    .select("id, company_id, kind, content, created_at")
    .single();

  if (error || !data) {
    console.error("[marketing-store] directive insert failed:", {
      companyId,
      kind,
      code: error?.code,
      message: error?.message,
    });
    return { directive: null, error: "Could not save the update." };
  }

  return {
    directive: mapDirectiveRow(data as MarketingDirectiveRow),
    error: null,
  };
}

export async function listMarketingItems(
  companyId: string,
  options?: { statuses?: MarketingItemStatus[]; limit?: number },
): Promise<MarketingItem[]> {
  const supabase = createServiceRoleClient();

  let query = hqTable(supabase, "marketing_items")
    .select(
      "id, company_id, kind, status, role, title, body_text, content, channel_hint, run_id, review_note, reviewed_at, converted_post_id, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 100);

  if (options?.statuses && options.statuses.length > 0) {
    query = query.in("status", options.statuses);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[marketing-store] items query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as MarketingItemRow[]).map(mapItemRow);
}

export async function getMarketingItemById(
  companyId: string,
  itemId: string,
): Promise<MarketingItem | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await hqTable(supabase, "marketing_items")
    .select(
      "id, company_id, kind, status, role, title, body_text, content, channel_hint, run_id, review_note, reviewed_at, converted_post_id, created_at, updated_at",
    )
    .eq("company_id", companyId)
    .eq("id", itemId)
    .maybeSingle();

  if (error) {
    console.error("[marketing-store] item query failed:", {
      companyId,
      itemId,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data ? mapItemRow(data as MarketingItemRow) : null;
}

export type MarketingItemInsert = {
  kind: MarketingItemKind;
  role: string;
  title: string;
  bodyText: string;
  content: Record<string, unknown>;
  channelHint?: string | null;
};

export async function insertMarketingItems(
  companyId: string,
  runId: string | null,
  items: MarketingItemInsert[],
): Promise<{ inserted: number; error: string | null }> {
  if (items.length === 0) {
    return { inserted: 0, error: null };
  }

  const supabase = createServiceRoleClient();

  const { error } = await hqTable(supabase, "marketing_items").insert(
    items.map((item) => ({
      company_id: companyId,
      kind: item.kind,
      role: item.role,
      title: item.title,
      body_text: item.bodyText,
      content: item.content,
      channel_hint: item.channelHint ?? null,
      run_id: runId,
    })),
  );

  if (error) {
    console.error("[marketing-store] items insert failed:", {
      companyId,
      runId,
      count: items.length,
      code: error.code,
      message: error.message,
    });
    return { inserted: 0, error: "Could not save generated items." };
  }

  return { inserted: items.length, error: null };
}

/**
 * Update a DRAFT item's content (per-platform fields editing). Approved,
 * rejected, and converted items are immutable from this path.
 */
export async function updateMarketingItemDraft(
  companyId: string,
  itemId: string,
  input: {
    bodyText: string;
    content: Record<string, unknown>;
  },
): Promise<{ item: MarketingItem | null; error: string | null }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await hqTable(supabase, "marketing_items")
    .update({
      body_text: input.bodyText,
      content: input.content,
    })
    .eq("company_id", companyId)
    .eq("id", itemId)
    .eq("status", "draft")
    .select(
      "id, company_id, kind, status, role, title, body_text, content, channel_hint, run_id, review_note, reviewed_at, converted_post_id, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    console.error("[marketing-store] item draft update failed:", {
      companyId,
      itemId,
      code: error?.code,
      message: error?.message,
    });
    return {
      item: null,
      error: "Could not save the edit. Only unreviewed drafts can be edited.",
    };
  }

  return { item: mapItemRow(data as MarketingItemRow), error: null };
}

export async function reviewMarketingItem(
  companyId: string,
  itemId: string,
  decision: Extract<MarketingItemStatus, "approved" | "rejected">,
  reviewNote?: string,
): Promise<{ item: MarketingItem | null; error: string | null }> {
  const existing = await getMarketingItemById(companyId, itemId);
  if (!existing) {
    return { item: null, error: "Item not found." };
  }

  if (existing.status === "converted") {
    return {
      item: null,
      error: "This item was already sent to the Marketing Hub.",
    };
  }

  const supabase = createServiceRoleClient();

  const { data, error } = await hqTable(supabase, "marketing_items")
    .update({
      status: decision,
      review_note: reviewNote?.trim().slice(0, REVIEW_NOTE_MAX_LENGTH) || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("company_id", companyId)
    .eq("id", itemId)
    .select(
      "id, company_id, kind, status, role, title, body_text, content, channel_hint, run_id, review_note, reviewed_at, converted_post_id, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    console.error("[marketing-store] item review failed:", {
      companyId,
      itemId,
      code: error?.code,
      message: error?.message,
    });
    return { item: null, error: "Could not save the review." };
  }

  return { item: mapItemRow(data as MarketingItemRow), error: null };
}

export async function markMarketingItemConverted(
  companyId: string,
  itemId: string,
  convertedPostId: string,
): Promise<{ item: MarketingItem | null; error: string | null }> {
  const supabase = createServiceRoleClient();

  const { data, error } = await hqTable(supabase, "marketing_items")
    .update({
      status: "converted",
      converted_post_id: convertedPostId,
    })
    .eq("company_id", companyId)
    .eq("id", itemId)
    .eq("status", "approved")
    .select(
      "id, company_id, kind, status, role, title, body_text, content, channel_hint, run_id, review_note, reviewed_at, converted_post_id, created_at, updated_at",
    )
    .single();

  if (error || !data) {
    console.error("[marketing-store] item convert-mark failed:", {
      companyId,
      itemId,
      code: error?.code,
      message: error?.message,
    });
    return { item: null, error: "Could not mark the item converted." };
  }

  return { item: mapItemRow(data as MarketingItemRow), error: null };
}

export async function recordMarketingRunStarted(
  companyId: string,
  runKey: string,
  trigger: MarketingRunTrigger,
): Promise<{ runId: string | null; startedAt: string }> {
  const supabase = createServiceRoleClient();
  const startedAt = new Date().toISOString();

  const { data, error } = await hqTable(supabase, "marketing_runs")
    .insert({
      company_id: companyId,
      run_key: runKey,
      status: "started",
      trigger,
      started_at: startedAt,
      totals: {},
    })
    .select("id")
    .single();

  if (error) {
    console.error("[marketing-store] run start record failed:", {
      companyId,
      runKey,
      code: error.code,
      message: error.message,
    });
    return { runId: null, startedAt };
  }

  return { runId: (data as { id: string }).id, startedAt };
}

export async function recordMarketingRunFinished(
  runId: string | null,
  input: {
    companyId: string;
    runKey: string;
    trigger: MarketingRunTrigger;
    startedAt: string;
    status: Extract<MarketingRunStatus, "succeeded" | "failed">;
    totals?: Record<string, number>;
    report?: Record<string, unknown> | null;
    errorSummary?: string | null;
  },
): Promise<void> {
  const finishedAt = new Date();
  const startedAtMs = Date.parse(input.startedAt);
  const durationMs = Number.isNaN(startedAtMs)
    ? null
    : Math.max(0, finishedAt.getTime() - startedAtMs);

  const payload = {
    company_id: input.companyId,
    run_key: input.runKey,
    status: input.status,
    trigger: input.trigger,
    started_at: input.startedAt,
    finished_at: finishedAt.toISOString(),
    duration_ms: durationMs,
    totals: input.totals ?? {},
    report: input.report ?? null,
    error_summary:
      input.errorSummary?.trim().slice(0, ERROR_SUMMARY_MAX_LENGTH) ?? null,
  };

  const supabase = createServiceRoleClient();

  if (runId) {
    const { error } = await hqTable(supabase, "marketing_runs")
      .update(payload)
      .eq("id", runId);

    if (error) {
      console.error("[marketing-store] run finish update failed:", {
        runId,
        runKey: input.runKey,
        code: error.code,
        message: error.message,
      });
    }

    return;
  }

  const { error } = await hqTable(supabase, "marketing_runs").insert(payload);

  if (error) {
    console.error("[marketing-store] run finish insert failed:", {
      runKey: input.runKey,
      code: error.code,
      message: error.message,
    });
  }
}

export async function listMarketingRuns(
  companyId: string,
  limit = 20,
): Promise<MarketingRun[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await hqTable(supabase, "marketing_runs")
    .select(
      "id, company_id, run_key, status, trigger, started_at, finished_at, duration_ms, totals, report, error_summary",
    )
    .eq("company_id", companyId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[marketing-store] runs query failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as MarketingRunRow[]).map(mapRunRow);
}

export async function getLatestSuccessfulMarketingRun(
  companyId: string,
  runKey: string,
): Promise<MarketingRun | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await hqTable(supabase, "marketing_runs")
    .select(
      "id, company_id, run_key, status, trigger, started_at, finished_at, duration_ms, totals, report, error_summary",
    )
    .eq("company_id", companyId)
    .eq("run_key", runKey)
    .eq("status", "succeeded")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[marketing-store] latest run query failed:", {
      companyId,
      runKey,
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data ? mapRunRow(data as MarketingRunRow) : null;
}

/** Companies with an initialized HQ (active hq_config) — the cron work list. */
export async function listCompaniesWithActiveMarketingHq(): Promise<string[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await hqTable(supabase, "marketing_directives")
    .select("company_id")
    .eq("kind", "hq_config")
    .is("superseded_at", null);

  if (error) {
    console.error("[marketing-store] HQ companies query failed:", {
      code: error.code,
      message: error.message,
    });
    return [];
  }

  const ids = new Set<string>(
    ((data ?? []) as { company_id: string }[]).map((row) => row.company_id),
  );
  return [...ids];
}

export type MarketingItemFlowStats = {
  sinceDays: number;
  drafted: number;
  approved: number;
  rejected: number;
  converted: number;
  byKind: Record<string, number>;
};

/**
 * Pure-code math layer: item flow counts for the strategist context.
 * The model narrates these numbers; it never computes them.
 */
export async function getMarketingItemFlowStats(
  companyId: string,
  sinceDays = 7,
): Promise<MarketingItemFlowStats> {
  const supabase = createServiceRoleClient();
  const since = new Date(
    Date.now() - sinceDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await hqTable(supabase, "marketing_items")
    .select("kind, status, created_at, reviewed_at")
    .eq("company_id", companyId)
    .gte("created_at", since)
    .limit(1_000);

  const stats: MarketingItemFlowStats = {
    sinceDays,
    drafted: 0,
    approved: 0,
    rejected: 0,
    converted: 0,
    byKind: {},
  };

  if (error) {
    console.error("[marketing-store] item flow stats failed:", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return stats;
  }

  for (const row of (data ?? []) as {
    kind: string;
    status: MarketingItemStatus;
  }[]) {
    stats.drafted += 1;
    stats.byKind[row.kind] = (stats.byKind[row.kind] ?? 0) + 1;

    if (row.status === "approved") {
      stats.approved += 1;
    } else if (row.status === "rejected") {
      stats.rejected += 1;
    } else if (row.status === "converted") {
      stats.approved += 1;
      stats.converted += 1;
    }
  }

  return stats;
}
