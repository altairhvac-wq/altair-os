import "server-only";

import { mapDatabaseError } from "@/lib/database/errors";
import { createServiceRoleClient } from "@/lib/supabase/service";
import {
  isWorkRequestKind,
  type WorkRequest,
  type WorkRequestKind,
  type WorkRequestOutcome,
} from "@/shared/types/agent-work-request";

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
  note: string | null;
  requested_by_email: string | null;
  requested_at: string;
  applied_at: string | null;
  outcome: string | null;
  outcome_detail: string | null;
};

const REQUEST_SELECT =
  "id, seq, company_id, request_key, kind, note, requested_by_email, requested_at, applied_at, outcome, outcome_detail";

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

export type PulledWorkRequest = {
  readonly seq: number;
  readonly id: string;
  readonly companyId: string;
  readonly kind: WorkRequestKind;
  readonly note: string | null;
  readonly requestedByEmail: string | null;
  readonly requestedAt: string;
};

/**
 * The platform's work list: requests it has not yet decided.
 *
 * `applied_at is null` is the filter, so a request the platform has already
 * completed OR refused never comes back. That, not a cursor the two sides
 * have to keep in step, is what makes a re-pull a no-op.
 */
export async function listUnappliedWorkRequests(input: {
  afterSeq: number;
  limit: number;
}): Promise<PulledWorkRequest[] | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await workRequestsTable(supabase)
    .select(REQUEST_SELECT)
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
 */
export async function markWorkRequestApplied(input: {
  requestId: string;
  companyId: string;
  outcome: WorkRequestOutcome;
  detail: string | null;
  nowIso: string;
}): Promise<{ error?: string }> {
  const supabase = createServiceRoleClient();
  const { error } = await workRequestsTable(supabase)
    .update({
      applied_at: input.nowIso,
      outcome: input.outcome,
      outcome_detail: input.detail?.slice(0, 2000) ?? null,
    })
    .eq("id", input.requestId)
    .eq("company_id", input.companyId)
    .is("applied_at", null);

  if (error) {
    console.error("[markWorkRequestApplied] update failed:", {
      requestId: input.requestId,
      code: error.code,
    });
    return { error: "The outcome could not be recorded." };
  }
  return {};
}
