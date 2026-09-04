import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  isWorkRequestKind,
  validateWorkRequestParams,
  type WorkRequest,
  type WorkRequestKind,
  type WorkRequestOutcome,
} from "@/shared/types/agent-work-request";
import type { SettlementOutcome } from "@/shared/types/agent-settlement";

/**
 * Operator requests for Agent Platform work (migration 189).
 *
 * ============ THE QUEUE IS THE TRANSPORT ============
 * Nothing in this module contacts the Agent Platform, because nothing can —
 * it is behind NAT. A request is written here and PULLED, exactly as
 * decisions (142) and questions (188) are. Nothing here runs, publishes or
 * spends: the platform decides that, honouring each runner's own consent gate.
 */

type WorkRequestRow = {
  id: string;
  seq: number;
  company_id: string;
  request_key: string;
  kind: string;
  params: unknown;
  note: string | null;
  requested_by_email: string | null;
  requested_at: string;
  applied_at: string | null;
  outcome: string | null;
  outcome_detail: string | null;
};

const REQUEST_SELECT =
  "id, seq, company_id, request_key, kind, params, note, requested_by_email, requested_at, applied_at, outcome, outcome_detail";

/** Params are display/transport data here; only their SHAPE is trusted. */
function toParamsObject(value: unknown): Readonly<Record<string, unknown>> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

type AnyClient = ReturnType<typeof createServiceRoleClient>;

function workRequestsTable(client: AnyClient) {
  // agent_work_requests: migration 189 — wire into Database types on next gen
  return (
    client as AnyClient & {
      from(table: "agent_work_requests"): ReturnType<AnyClient["from"]>;
    }
  ).from("agent_work_requests");
}

/**
 * A row becomes a `WorkRequest` only if its kind is one this build knows.
 *
 * Returns null otherwise rather than casting. A kind added by a newer
 * migration, or an older row whose kind has since been retired, must not be
 * rendered as if this build understood it — the descriptor lookup that powers
 * the label would be undefined and the surface would show a blank action.
 */
function toWorkRequest(row: WorkRequestRow): WorkRequest | null {
  if (!isWorkRequestKind(row.kind)) return null;
  const outcome =
    row.outcome === "completed" ||
    row.outcome === "refused" ||
    row.outcome === "failed"
      ? (row.outcome as WorkRequestOutcome)
      : null;

  return {
    id: row.id,
    kind: row.kind,
    requestKey: row.request_key,
    params: toParamsObject(row.params),
    note: row.note,
    requestedByEmail: row.requested_by_email,
    requestedAt: row.requested_at,
    appliedAt: row.applied_at,
    outcome,
    outcomeDetail: row.outcome_detail,
  };
}

/** What the operator asked for recently, newest first. */
export async function listWorkRequests(input: {
  companyId: string;
  limit?: number;
}): Promise<WorkRequest[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await workRequestsTable(supabase)
    .select(REQUEST_SELECT)
    .eq("company_id", input.companyId)
    .order("requested_at", { ascending: false })
    .limit(input.limit ?? 20);

  if (error) {
    console.error("[listWorkRequests] read failed:", {
      companyId: input.companyId,
      code: error.code,
    });
    return [];
  }

  const mapped = (data ?? []).map((row: unknown) =>
    toWorkRequest(row as WorkRequestRow),
  );
  return mapped.filter(
    (request: WorkRequest | null): request is WorkRequest => request !== null,
  );
}

/**
 * Queue one request.
 *
 * `requestKey` is the idempotency guard: a double-clicked button reuses the
 * key, the unique index refuses the second insert, and the caller gets the
 * request that already exists rather than queueing the same work twice.
 */
export async function enqueueWorkRequest(input: {
  companyId: string;
  kind: WorkRequestKind;
  note: string | null;
  requestKey: string;
  requestedByUserId: string;
  requestedByEmail: string | null;
}): Promise<{ request?: WorkRequest; duplicate?: boolean; error?: string }> {
  const supabase = createServiceRoleClient();

  const insert = await workRequestsTable(supabase)
    .insert({
      company_id: input.companyId,
      request_key: input.requestKey,
      kind: input.kind,
      note: input.note,
      requested_by_user_id: input.requestedByUserId,
      requested_by_email: input.requestedByEmail,
    })
    .select(REQUEST_SELECT)
    .single();

  if (!insert.error) {
    const request = toWorkRequest(insert.data as WorkRequestRow);
    return request
      ? { request }
      : { error: "That request could not be queued." };
  }

  // 23505: the key already exists. Insert-first then interpret, the
  // convention `claimDelivery` established — never read-then-write, which a
  // concurrent submit runs alongside rather than against.
  if (insert.error.code === "23505") {
    const existing = await workRequestsTable(supabase)
      .select(REQUEST_SELECT)
      .eq("company_id", input.companyId)
      .eq("request_key", input.requestKey)
      .maybeSingle();

    const request = existing.data
      ? toWorkRequest(existing.data as WorkRequestRow)
      : null;
    return request
      ? { request, duplicate: true }
      : { error: "That request could not be queued." };
  }

  console.error("[enqueueWorkRequest] insert failed:", {
    companyId: input.companyId,
    code: insert.error.code,
  });
  return {
    error:
      mapDatabaseError(insert.error) ?? "That request could not be queued.",
  };
}

/* ------------------------------------------------- the platform's side */

/**
 * Queue requests ON THE OPERATOR'S BEHALF — the Chief converting a chat
 * message into typed work. Batch, because a compound ask queues several.
 *
 * Kind and params are validated PER ITEM against the same closed contract
 * the browser path uses; an invalid item is refused (reported by key), never
 * repaired and never inserted. `requested_by_user_id` is null — the asking
 * human is carried in `requestedByEmail` from the conversation row, and the
 * request key (`chief-cmd:<questionId>:<n>-<kind>`) makes re-posts collapse
 * on the unique index instead of double-queueing.
 *
 * ============ EVERY ITEM GETS AN ANSWER ============
 * A mid-batch database error used to abandon the loop and return one error
 * for the whole call, leaving the already-inserted prefix queued while the
 * operator was told the batch failed. Nothing is atomic here — PostgREST
 * gives no transaction across separate inserts — so instead of pretending,
 * every item is attempted and accounted for by name. The deterministic keys
 * make a retry of the whole batch safe: the prefix collides and is counted as
 * a duplicate rather than queued twice.
 *
 * Four outcomes, deliberately distinct, because they mean different things to
 * the person reading the Chief's reply:
 *   queued      accepted and newly created
 *   duplicates  accepted earlier under the same key (a safe replay)
 *   rejected    refused by validation — never written, and it says why
 *   failed      the database refused it — not written, and worth alerting on
 */
export async function enqueueWorkRequestsFromAgent(input: {
  companyId: string;
  requests: ReadonlyArray<{
    requestKey: string;
    kind: string;
    params: unknown;
    note?: string | null;
    requestedByEmail?: string | null;
  }>;
}): Promise<{
  received: number;
  queued: number;
  duplicates: number;
  rejected: { requestKey: string; error: string }[];
  failed: { requestKey: string; error: string }[];
}> {
  const supabase = createServiceRoleClient();
  let queued = 0;
  let duplicates = 0;
  const rejected: { requestKey: string; error: string }[] = [];
  const failed: { requestKey: string; error: string }[] = [];

  for (const request of input.requests) {
    const key = typeof request.requestKey === "string" ? request.requestKey.trim() : "";
    if (!key || key.length > 200) {
      rejected.push({ requestKey: key || "(missing)", error: "requestKey is invalid" });
      continue;
    }
    if (!isWorkRequestKind(request.kind)) {
      rejected.push({ requestKey: key, error: "unknown kind" });
      continue;
    }
    const params = validateWorkRequestParams(request.kind, request.params ?? null);
    if (!params.ok) {
      rejected.push({ requestKey: key, error: params.error });
      continue;
    }

    const note =
      typeof request.note === "string" && request.note.trim()
        ? request.note.trim().slice(0, 1000)
        : null;
    const email =
      typeof request.requestedByEmail === "string" && request.requestedByEmail.trim()
        ? request.requestedByEmail.trim().slice(0, 320)
        : null;

    const insert = await workRequestsTable(supabase)
      .insert({
        company_id: input.companyId,
        request_key: key,
        kind: request.kind,
        params: params.params,
        note,
        requested_by_user_id: null,
        requested_by_email: email,
      })
      .select("id")
      .single();

    if (!insert.error) {
      queued += 1;
      continue;
    }
    // Insert-first-then-interpret: the unique index is the idempotency.
    if (insert.error.code === "23505") {
      duplicates += 1;
      continue;
    }
    console.error("[enqueueWorkRequestsFromAgent] insert failed:", {
      companyId: input.companyId,
      code: insert.error.code,
    });
    // Recorded against ITS OWN key and the loop continues: abandoning here
    // left a queued prefix behind an error that claimed nothing was queued.
    failed.push({
      requestKey: key,
      error: mapDatabaseError(insert.error) ?? "A request could not be queued.",
    });
  }

  return {
    received: input.requests.length,
    queued,
    duplicates,
    rejected,
    failed,
  };
}

export type PulledWorkRequest = {
  readonly seq: number;
  readonly id: string;
  readonly companyId: string;
  readonly kind: WorkRequestKind;
  readonly params: Readonly<Record<string, unknown>> | null;
  readonly note: string | null;
  readonly requestedByEmail: string | null;
  readonly requestedAt: string;
};

/**
 * The platform's work list: one company's requests it has not yet decided.
 *
 * `applied_at is null` is the filter, so a request the platform has already
 * completed OR refused never comes back. That, not a cursor the two sides
 * have to keep in step, is what makes a re-pull a no-op.
 *
 * ============ THE COMPANY PREDICATE IS THE FAIRNESS GUARANTEE ============
 * Filtered in SQL, BEFORE ordering and limiting — see the same note on
 * `listQueuedChiefQuestions`. Applying it afterwards in the route let another
 * company's unapplied backlog occupy every slot of the limited page, so this
 * company's requests were never returned and never expired: permanent
 * starvation from a query that looked correctly scoped at the route.
 *
 * Invariant a test can hold: a company's oldest unapplied request is returned
 * on its next poll in bounded work, whatever any other company's backlog is.
 */
export async function listUnappliedWorkRequests(input: {
  companyId: string;
  afterSeq: number;
  limit: number;
}): Promise<PulledWorkRequest[] | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await workRequestsTable(supabase)
    .select(REQUEST_SELECT)
    .eq("company_id", input.companyId)
    .is("applied_at", null)
    .gt("seq", input.afterSeq)
    .order("seq", { ascending: true })
    .limit(Math.min(Math.max(input.limit, 1), 25));

  if (error) {
    console.error("[listUnappliedWorkRequests] read failed:", {
      code: error.code,
    });
    // Null, never an empty list — a read failure reported as "no work" is
    // how a broken table masquerades as a quiet queue. The route 503s.
    return null;
  }

  const requests: PulledWorkRequest[] = [];
  for (const raw of data ?? []) {
    const row = raw as WorkRequestRow;
    // An unknown kind is skipped rather than handed over: the platform would
    // have no runner for it, and passing it on would produce a refusal that
    // blames the operator for a schema drift.
    if (!isWorkRequestKind(row.kind)) continue;
    requests.push({
      seq: row.seq,
      id: row.id,
      companyId: row.company_id,
      kind: row.kind,
      params: toParamsObject(row.params),
      note: row.note,
      requestedByEmail: row.requested_by_email,
      requestedAt: row.requested_at,
    });
  }
  return requests;
}

/**
 * Record what the platform did with a request.
 *
 * Company-scoped and one-way: `applied_at is null` in the filter means an
 * outcome can never be overwritten, so a re-post of the same outcome is a
 * no-op rather than a rewrite of history.
 *
 * ============ A GUARDED UPDATE THAT MATCHES NOTHING IS NOT SUCCESS ============
 * This returned `{}` — read by the route as ok — whenever the database did not
 * error. A guarded UPDATE matching zero rows does not error: it succeeds
 * having changed nothing. So posting an outcome for a wrong id, a foreign
 * company's id, or a request already settled all answered "recorded", and the
 * platform stopped tracking work that was still queued (or never existed).
 *
 * The affected-row count is now the evidence, and the three cases are told
 * apart: `settled` (this call moved it), `already_settled` (a replay, which
 * is the pull protocol working), `not_found` (a correlation break the
 * operator has to see, because no retry can fix it).
 */
export async function markWorkRequestApplied(input: {
  requestId: string;
  companyId: string;
  outcome: WorkRequestOutcome;
  detail: string | null;
  nowIso: string;
}): Promise<{ outcome?: SettlementOutcome; error?: string }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await workRequestsTable(supabase)
    .update({
      applied_at: input.nowIso,
      outcome: input.outcome,
      outcome_detail: input.detail?.slice(0, 2000) ?? null,
    })
    .eq("id", input.requestId)
    .eq("company_id", input.companyId)
    .is("applied_at", null)
    .select("id");

  if (error) {
    console.error("[markWorkRequestApplied] update failed:", {
      requestId: input.requestId,
      code: error.code,
    });
    return { error: "The outcome could not be recorded." };
  }

  if (Array.isArray(data) && data.length > 0) {
    return { outcome: "settled" };
  }

  // Zero rows. Distinguish "already decided" from "no such request for this
  // company" — the first is a benign replay, the second means the two sides
  // disagree about what exists.
  const existing = await workRequestsTable(supabase)
    .select("id")
    .eq("id", input.requestId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  return { outcome: existing.data ? "already_settled" : "not_found" };
}
