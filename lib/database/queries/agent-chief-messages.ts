import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { ChiefMessage } from "@/shared/types/marketing-command";

/**
 * The Chief of Staff conversation (migration 188).
 *
 * ============ THE QUEUE IS THE TRANSPORT ============
 * A user turn is written here and PULLED by the Agent Platform, which is
 * behind NAT and cannot be called. Nothing in this module contacts the
 * platform, because nothing can.
 */

type ChiefMessageRow = {
  id: string;
  seq: number;
  company_id: string;
  conversation_id: string;
  role: "user" | "chief";
  body: string;
  status: "queued" | "answered" | "failed";
  request_key: string;
  asked_by_email: string | null;
  in_reply_to: string | null;
  answered_at: string | null;
  error_detail: string | null;
  created_at: string;
};

const MESSAGE_SELECT =
  "id, seq, company_id, conversation_id, role, body, status, request_key, asked_by_email, in_reply_to, answered_at, error_detail, created_at";

type AnyClient = ReturnType<typeof createServiceRoleClient>;

function chiefMessagesTable(client: AnyClient) {
  // agent_chief_messages: migration 188 — wire into Database types on next gen types run
  return (
    client as AnyClient & {
      from(table: "agent_chief_messages"): ReturnType<AnyClient["from"]>;
    }
  ).from("agent_chief_messages");
}

function toMessage(row: ChiefMessageRow): ChiefMessage {
  return {
    id: row.id,
    role: row.role,
    body: row.body,
    status: row.status,
    createdAt: row.created_at,
    answeredAt: row.answered_at,
    errorDetail: row.error_detail,
  };
}

/** The whole conversation for a company, oldest first. */
export async function listChiefMessages(input: {
  companyId: string;
  conversationId?: string;
  limit?: number;
}): Promise<ChiefMessage[]> {
  const supabase = createServiceRoleClient();
  let query = chiefMessagesTable(supabase)
    .select(MESSAGE_SELECT)
    .eq("company_id", input.companyId);

  if (input.conversationId) {
    query = query.eq("conversation_id", input.conversationId);
  }

  const { data, error } = await query
    .order("created_at", { ascending: true })
    .limit(input.limit ?? 100);

  if (error) {
    console.error("[listChiefMessages] read failed:", {
      companyId: input.companyId,
      code: error.code,
    });
    return [];
  }

  return (data ?? []).map((row: unknown) => toMessage(row as ChiefMessageRow));
}

/** The most recent conversation id for a company, or null. */
export async function getLatestChiefConversationId(
  companyId: string,
): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data } = await chiefMessagesTable(supabase)
    .select("conversation_id")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as { conversation_id: string } | null)?.conversation_id ?? null;
}

/**
 * Queue one question.
 *
 * `requestKey` is the idempotency guard: a double-submitted form reuses the
 * key, the unique index refuses the second insert, and the caller gets the
 * question that already exists rather than asking the Chief twice.
 */
export async function enqueueChiefQuestion(input: {
  companyId: string;
  conversationId: string;
  body: string;
  requestKey: string;
  askedByUserId: string;
  askedByEmail: string | null;
}): Promise<{ message?: ChiefMessage; duplicate?: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const insert = await chiefMessagesTable(supabase)
    .insert({
      company_id: input.companyId,
      conversation_id: input.conversationId,
      role: "user",
      body: input.body,
      status: "queued",
      request_key: input.requestKey,
      asked_by_user_id: input.askedByUserId,
      asked_by_email: input.askedByEmail,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (!insert.error) {
    return { message: toMessage(insert.data as ChiefMessageRow) };
  }

  // 23505: the idempotency key already exists. Insert-first then interpret,
  // the convention `claimDelivery` established — never read-then-write, which
  // a concurrent submit runs alongside rather than against.
  if (insert.error.code === "23505") {
    const existing = await chiefMessagesTable(supabase)
      .select(MESSAGE_SELECT)
      .eq("company_id", input.companyId)
      .eq("request_key", input.requestKey)
      .maybeSingle();

    return existing.data
      ? { message: toMessage(existing.data as ChiefMessageRow), duplicate: true }
      : { error: "That question could not be queued." };
  }

  console.error("[enqueueChiefQuestion] insert failed:", {
    companyId: input.companyId,
    code: insert.error.code,
  });
  return {
    error: mapDatabaseError(insert.error) ?? "That question could not be queued.",
  };
}

/* ------------------------------------------------- the platform's side */

export type QueuedChiefQuestion = {
  readonly seq: number;
  readonly id: string;
  readonly companyId: string;
  readonly conversationId: string;
  readonly body: string;
  readonly askedByEmail: string | null;
  readonly createdAt: string;
};

/**
 * The platform's work list: queued questions after a cursor.
 *
 * Cursor semantics are migration 142's — "everything after the highest seq I
 * handled" — so a re-poll is a no-op and a lost response costs nothing.
 */
export async function listQueuedChiefQuestions(input: {
  afterSeq: number;
  limit: number;
}): Promise<QueuedChiefQuestion[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await chiefMessagesTable(supabase)
    .select(MESSAGE_SELECT)
    .eq("role", "user")
    .eq("status", "queued")
    .gt("seq", input.afterSeq)
    .order("seq", { ascending: true })
    .limit(Math.min(Math.max(input.limit, 1), 50));

  if (error) {
    console.error("[listQueuedChiefQuestions] read failed:", {
      code: error.code,
    });
    return [];
  }

  return (data ?? []).map((raw: unknown) => {
    const row = raw as ChiefMessageRow;
    return {
      seq: row.seq,
      id: row.id,
      companyId: row.company_id,
      conversationId: row.conversation_id,
      body: row.body,
      askedByEmail: row.asked_by_email,
      createdAt: row.created_at,
    };
  });
}

/**
 * Record the Chief's answer, and mark the question handled.
 *
 * Two writes, answer first: if the second fails the question stays `queued`
 * and is pulled again, which produces a duplicate ANSWER — recoverable and
 * visible. The other order loses the answer entirely and reports the question
 * as handled, which is not.
 */
export async function recordChiefAnswer(input: {
  questionId: string;
  companyId: string;
  body: string;
  requestKey: string;
  nowIso: string;
}): Promise<{ error?: string }> {
  const supabase = createServiceRoleClient();

  const question = await chiefMessagesTable(supabase)
    .select("id, conversation_id, company_id, role")
    .eq("id", input.questionId)
    // Company-scoped: an answer can only ever be attached to a question the
    // same company asked, whatever the caller claims.
    .eq("company_id", input.companyId)
    .eq("role", "user")
    .maybeSingle();

  if (!question.data) {
    return { error: "No such question for this company." };
  }

  const row = question.data as { conversation_id: string };

  const answer = await chiefMessagesTable(supabase).insert({
    company_id: input.companyId,
    conversation_id: row.conversation_id,
    role: "chief",
    body: input.body,
    status: "answered",
    request_key: input.requestKey,
    in_reply_to: input.questionId,
    answered_at: input.nowIso,
  });

  // A repeated answer for the same key is the pull protocol working, not a
  // failure: the platform re-pulled a question whose answer never landed.
  if (answer.error && answer.error.code !== "23505") {
    console.error("[recordChiefAnswer] answer insert failed:", {
      code: answer.error.code,
    });
    return { error: "The answer could not be stored." };
  }

  const settle = await chiefMessagesTable(supabase)
    .update({ status: "answered", answered_at: input.nowIso })
    .eq("id", input.questionId)
    .eq("company_id", input.companyId);

  if (settle.error) {
    console.error("[recordChiefAnswer] question not settled:", {
      questionId: input.questionId,
      code: settle.error.code,
    });
  }

  return {};
}

/** Record that the Chief could not answer. The question is not retried. */
export async function recordChiefFailure(input: {
  questionId: string;
  companyId: string;
  errorDetail: string;
}): Promise<{ error?: string }> {
  const supabase = createServiceRoleClient();
  const { error } = await chiefMessagesTable(supabase)
    .update({ status: "failed", error_detail: input.errorDetail.slice(0, 1000) })
    .eq("id", input.questionId)
    .eq("company_id", input.companyId)
    .eq("role", "user");

  return error ? { error: "Could not record the failure." } : {};
}
