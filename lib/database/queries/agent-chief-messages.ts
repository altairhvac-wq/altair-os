import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { ChiefMessage } from "@/shared/types/marketing-command";
import type { SettlementOutcome } from "@/shared/types/agent-settlement";

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

/**
 * The most recent messages of a company's conversation, oldest first.
 *
 * ============ A LIMIT TRUNCATES THE END YOU ORDER AWAY FROM ============
 * This used to order ASCENDING and limit, which returns the OLDEST n rows —
 * so the surface showed the first n messages forever. An answered question is
 * two rows (the user's turn and the Chief's reply), so at the page's limit of
 * 50 the window filled after about 25 exchanges and then never moved: every
 * later question and every answer was stored, settled and invisible. Nothing
 * errored, because nothing was wrong except which end of the conversation was
 * being read. `awaitingReply` is derived from this same slice, so the "queued"
 * indicator went permanently quiet too — the operator asked and saw nothing
 * happen, while the platform answered normally.
 *
 * The read is now newest-first and reversed here, so the caller still receives
 * chronological order and the window is anchored to the present.
 */
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
    // Newest first so the LIMIT keeps the latest turns...
    .order("created_at", { ascending: false })
    .limit(input.limit ?? 100);

  if (error) {
    console.error("[listChiefMessages] read failed:", {
      companyId: input.companyId,
      code: error.code,
    });
    return [];
  }

  // ...then reversed, because the surface renders a conversation, and a
  // conversation reads downwards.
  return (data ?? [])
    .map((row: unknown) => toMessage(row as ChiefMessageRow))
    .reverse();
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
      ? {
          message: toMessage(existing.data as ChiefMessageRow),
          duplicate: true,
        }
      : { error: "That question could not be queued." };
  }

  console.error("[enqueueChiefQuestion] insert failed:", {
    companyId: input.companyId,
    code: insert.error.code,
  });
  return {
    error:
      mapDatabaseError(insert.error) ?? "That question could not be queued.",
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
 * The platform's work list: one company's queued questions after a cursor.
 *
 * Cursor semantics are migration 142's — "everything after the highest seq I
 * handled" — so a re-poll is a no-op and a lost response costs nothing.
 *
 * ============ THE COMPANY PREDICATE IS THE FAIRNESS GUARANTEE ============
 * `company_id` is filtered in SQL, BEFORE ordering and limiting. It used to be
 * applied by the route to an already-limited global page, which reads as
 * equivalent and is not: with `limit` older queued rows belonging to another
 * company, every returned slot was foreign, the route filtered them all away,
 * and this company received zero of its own questions on every poll — forever,
 * because nothing ever drained the foreign rows and `after` is always 0.
 *
 * The fairness invariant this restores, stated so a test can hold it:
 *   A company's oldest queued question is delivered on its next poll,
 *   in bounded work, regardless of how large any other company's backlog is.
 *
 * The queue is partitioned by tenant rather than shared: each platform
 * instance polls with its own server-resolved company, so no cross-tenant
 * round-robin is needed and no scan is unbounded — the partial index
 * (company_id, seq) WHERE role='user' AND status='queued' (migration 192)
 * serves exactly this predicate.
 */
export async function listQueuedChiefQuestions(input: {
  companyId: string;
  afterSeq: number;
  limit: number;
}): Promise<QueuedChiefQuestion[] | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await chiefMessagesTable(supabase)
    .select(MESSAGE_SELECT)
    .eq("company_id", input.companyId)
    .eq("role", "user")
    .eq("status", "queued")
    .gt("seq", input.afterSeq)
    .order("seq", { ascending: true })
    .limit(Math.min(Math.max(input.limit, 1), 50));

  if (error) {
    console.error("[listQueuedChiefQuestions] read failed:", {
      code: error.code,
    });
    // Null, never an empty list: this is the platform's work list, and a
    // read failure reported as "no work" is how a broken table spent a night
    // masquerading as a quiet queue (the 42501 sequence-grant incident,
    // 2026-09-01). The route turns null into a 503 the puller can see.
    return null;
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
 * The answer row's idempotency key, derived from the question it answers.
 *
 * ============ THE KEY IS THE SERVER'S, NEVER THE CALLER'S ============
 * This used to accept whatever `requestKey` the bridge caller sent. The unique
 * index is `(company_id, request_key)`, and the insert treats 23505 as "the
 * answer is already stored" — so a caller sending a key that already existed
 * for ANY other row had its answer silently dropped while the question was
 * still marked answered. The question would then read as handled with no
 * answer under it, and no error anywhere.
 *
 * Deriving the key from `questionId` removes the input entirely: one question
 * has exactly one answer key, a genuine replay collides with its OWN prior
 * answer (which is the intended no-op), and a collision with anything else is
 * impossible rather than merely discouraged. The platform already sends this
 * exact string; it is now ignored in favour of computing it here.
 */
export function chiefAnswerRequestKey(questionId: string): string {
  return `chief-answer:${questionId}`;
}

/**
 * Record the Chief's answer, and mark the question handled.
 *
 * ============ CLAIM THE TRANSITION, THEN — ONLY THEN — WRITE THE REPLY ============
 * This used to insert the chief reply FIRST and run the guarded settle UPDATE
 * second. That let the reply land even when the settle step went on to find
 * the question already terminal: a late answer arriving after
 * `recordChiefFailure` had already moved the question to `failed` still wrote
 * a chief reply row, because nothing before the insert asked whether the
 * question was still answerable. The result was a question and a reply that
 * disagreed — `failed` sitting above an answer no failure message explains.
 *
 * The order is now: (1) attempt the guarded UPDATE — `queued` → `answered` —
 * and let the AFFECTED-ROW COUNT decide everything; (2) insert the reply only
 * if that UPDATE actually matched a row, which is the platform's proof that
 * THIS call is the one making the question answerable. A single guarded
 * UPDATE is one atomic statement, so two concurrent callers can never both
 * win it — whichever the database serializes first claims the transition,
 * and the other observes zero rows matched and writes no reply at all. That
 * is what makes "queued→answered" and "failed vs. late answer" and
 * "concurrent answer/failure" all resolve to a single row deciding the
 * outcome rather than a race between two independent writes.
 *
 * The one gap a single-statement CAS cannot close by itself is the reply
 * INSERT failing *after* the claim succeeds (a transient error, not a
 * conflict). Left alone that would strand the question `answered` with no
 * reply beneath it — silently unrecoverable, since nothing else may touch an
 * `answered` row. So that path explicitly REVERTS the claim back to `queued`
 * before returning an error: an audited, narrowly-scoped recovery transition,
 * safe specifically because a transition into `answered` can only be
 * performed once per question and only by this function, so nothing else can
 * have touched the row in between.
 */
export async function recordChiefAnswer(input: {
  questionId: string;
  companyId: string;
  body: string;
  nowIso: string;
}): Promise<{ outcome?: SettlementOutcome; error?: string }> {
  const supabase = createServiceRoleClient();
  const requestKey = chiefAnswerRequestKey(input.questionId);

  // The claim. One-way: only a row still `queued` can transition, and the
  // returned rows are the only proof that THIS call performed it.
  const claim = await chiefMessagesTable(supabase)
    .update({ status: "answered", answered_at: input.nowIso })
    .eq("id", input.questionId)
    .eq("company_id", input.companyId)
    .eq("role", "user")
    .eq("status", "queued")
    .select("id, conversation_id");

  if (claim.error) {
    console.error("[recordChiefAnswer] claim update failed:", {
      questionId: input.questionId,
      code: claim.error.code,
    });
    return { error: "The question could not be settled." };
  }

  const claimed = Array.isArray(claim.data) ? (claim.data[0] as
    | { id: string; conversation_id: string }
    | undefined) : undefined;

  if (!claimed) {
    // Zero rows: the question is already terminal (answered or failed — a
    // late answer, a duplicate answer, or the loser of a concurrent race
    // against `recordChiefFailure`) or does not exist for this company. NO
    // REPLY IS WRITTEN in either case — that is the guarantee this reorder
    // exists to provide.
    const existing = await chiefMessagesTable(supabase)
      .select("id")
      .eq("id", input.questionId)
      .eq("company_id", input.companyId)
      .eq("role", "user")
      .maybeSingle();
    return { outcome: existing.data ? "already_settled" : "not_found" };
  }

  const answer = await chiefMessagesTable(supabase).insert({
    company_id: input.companyId,
    conversation_id: claimed.conversation_id,
    role: "chief",
    body: input.body,
    status: "answered",
    request_key: requestKey,
    in_reply_to: input.questionId,
    answered_at: input.nowIso,
  });

  if (!answer.error) {
    return { outcome: "settled" };
  }

  // ============ ANY INSERT FAILURE HERE IS UNEXPECTED, NOT A REPLAY ============
  // A 23505 on the derived key looks, at first glance, like the benign replay
  // the old code accepted unconditionally. It is not reachable that way under
  // this ordering: the claim above can transition a question at most once
  // (it is a one-way, guarded UPDATE), so a legitimate retry after this exact
  // call already succeeded would find the question no longer `queued` and
  // return via the `already_settled` branch above WITHOUT ever reaching this
  // insert. So a 23505 here can only mean some OTHER row already occupies
  // this question's derived key — a foreign or squatted row, not our own
  // reply — and settling on top of it would report an answer nobody wrote.
  // Every insert failure at this point, 23505 included, is therefore
  // treated the same way: the claim is reverted rather than trusted.
  console.error("[recordChiefAnswer] reply insert failed after claiming the question:", {
    questionId: input.questionId,
    code: answer.error.code,
  });
  const revert = await chiefMessagesTable(supabase)
    .update({ status: "queued", answered_at: null })
    .eq("id", input.questionId)
    .eq("company_id", input.companyId)
    .eq("role", "user")
    .eq("status", "answered");

  if (revert.error) {
    console.error("[recordChiefAnswer] could not revert an orphaned claim:", {
      questionId: input.questionId,
      code: revert.error.code,
    });
  }

  return { error: "The answer could not be stored." };
}

/**
 * Record that the Chief could not answer. The question is not retried.
 *
 * ============ ANSWERED IS TERMINAL, AND STAYS TERMINAL ============
 * `status = 'queued'` in the filter is the whole point. Without it a late or
 * duplicated failure callback — a timeout that fires after the answer landed,
 * a retried error post — rewrote an ANSWERED question to `failed`, so the
 * operator saw "the Chief could not answer this" sitting above the answer it
 * had already given. The transition is one-way in SQL, and the affected-row
 * count is what tells the caller which of the two things happened.
 */
export async function recordChiefFailure(input: {
  questionId: string;
  companyId: string;
  errorDetail: string;
}): Promise<{ outcome?: SettlementOutcome; error?: string }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await chiefMessagesTable(supabase)
    .update({
      status: "failed",
      error_detail: input.errorDetail.slice(0, 1000),
    })
    .eq("id", input.questionId)
    .eq("company_id", input.companyId)
    .eq("role", "user")
    .eq("status", "queued")
    .select("id");

  if (error) {
    console.error("[recordChiefFailure] update failed:", {
      questionId: input.questionId,
      code: error.code,
    });
    return { error: "Could not record the failure." };
  }

  if (Array.isArray(data) && data.length > 0) {
    return { outcome: "settled" };
  }

  // Zero rows matched. Either the question is already terminal (a late
  // failure for work that finished) or it does not exist for this company —
  // and those are different facts, so they are distinguished rather than
  // collapsed into one comfortable "ok".
  const existing = await chiefMessagesTable(supabase)
    .select("id")
    .eq("id", input.questionId)
    .eq("company_id", input.companyId)
    .eq("role", "user")
    .maybeSingle();

  return { outcome: existing.data ? "already_settled" : "not_found" };
}
