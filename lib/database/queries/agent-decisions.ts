import { selectInChunks } from "@/lib/database/queries/chunked-in";
import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/service";

/**
 * The durable decision queue between Altair OS and the Agent Platform.
 *
 * SERVICE-ROLE ONLY by table grant (migration 142) and by module posture.
 * Every caller must already have authorized the request: the Marketing page's
 * server action by company-context permission check, the pull route by bearer
 * secret.
 *
 * RECORDING A DECISION PUBLISHES NOTHING. It records that a human agreed to a
 * proposal. Whether anything external happens is decided by the Agent
 * Platform's own permission and effect machinery, which requires its own
 * approval binding regardless of what is stored here.
 */

const TABLE = "agent_marketing_decisions";

export const AGENT_DECISION_SUBJECT_KINDS = [
  "approval",
  "recommendation",
  "video_render",
] as const;
export type AgentDecisionSubjectKind =
  (typeof AGENT_DECISION_SUBJECT_KINDS)[number];

export const AGENT_DECISION_VALUES = [
  "APPROVED",
  "REJECTED",
  "REQUEST_EDIT",
] as const;
export type AgentDecisionValue = (typeof AGENT_DECISION_VALUES)[number];

export type AgentDecisionRecord = {
  seq: number;
  decisionKey: string;
  subjectKind: AgentDecisionSubjectKind;
  subjectId: string;
  decision: AgentDecisionValue;
  note: string | null;
  decidedByEmail: string | null;
  decidedAt: string;
  appliedAt: string | null;
};

type ServiceClient = ReturnType<typeof createServiceRoleClient>;

function decisionsTable(client: ServiceClient) {
  // agent_marketing_decisions: migration 142 — wire into Database types on the
  // next generated-types run, matching marketing_posts' own helper.
  return (
    client as ServiceClient & {
      from(
        table: "agent_marketing_decisions",
      ): ReturnType<ServiceClient["from"]>;
    }
  ).from(TABLE);
}

/**
 * Builds the idempotency key. One decision per subject per company: clicking
 * approve twice, or double-submitting a form, must produce one row and one
 * delivery — not two.
 */
export function buildDecisionKey(
  subjectKind: AgentDecisionSubjectKind,
  subjectId: string,
): string {
  return `${subjectKind}:${subjectId}`;
}

export type RecordDecisionInput = {
  companyId: string;
  subjectKind: AgentDecisionSubjectKind;
  subjectId: string;
  decision: AgentDecisionValue;
  note: string | null;
  decidedByUserId: string | null;
  decidedByEmail: string | null;
};

export type RecordDecisionResult =
  | { ok: true; duplicate: boolean; error: null }
  | { ok: false; duplicate: false; error: string };

/**
 * Records one decision.
 *
 * A repeated submission for the same subject is accepted and reported as a
 * duplicate rather than erroring or overwriting. Overwriting would let a
 * second click silently reverse a decision the platform may already have
 * applied; erroring would make a double-click look like a failure. Changing a
 * recorded decision is deliberately not possible here — that is a new
 * proposal's job, mirroring the platform's own rule that an APPROVED approval
 * can never become REJECTED.
 */
export async function recordAgentDecision(
  input: RecordDecisionInput,
): Promise<RecordDecisionResult> {
  const supabase = createServiceRoleClient();
  const decisionKey = buildDecisionKey(input.subjectKind, input.subjectId);

  const { data: existing, error: readError } = await decisionsTable(supabase)
    .select("decision")
    .eq("company_id", input.companyId)
    .eq("decision_key", decisionKey)
    .maybeSingle();

  if (readError) {
    console.error("[recordAgentDecision] read failed", {
      companyId: input.companyId,
      code: readError.code,
      message: readError.message,
    });
    return { ok: false, duplicate: false, error: "Could not record decision" };
  }

  if (existing) {
    return { ok: true, duplicate: true, error: null };
  }

  const { error: writeError } = await decisionsTable(supabase).insert({
    company_id: input.companyId,
    decision_key: decisionKey,
    subject_kind: input.subjectKind,
    subject_id: input.subjectId,
    decision: input.decision,
    note: input.note,
    decided_by_user_id: input.decidedByUserId,
    decided_by_email: input.decidedByEmail,
  });

  if (writeError) {
    // A unique-violation here means a concurrent submitter won the race; that
    // is the idempotent outcome, not a failure.
    if (writeError.code === "23505") {
      return { ok: true, duplicate: true, error: null };
    }
    console.error("[recordAgentDecision] write failed", {
      companyId: input.companyId,
      code: writeError.code,
      message: writeError.message,
    });
    return { ok: false, duplicate: false, error: "Could not record decision" };
  }

  return { ok: true, duplicate: false, error: null };
}

/** Decisions after a cursor, oldest first, bounded. */
export async function listAgentDecisionsSince(
  companyId: string,
  sinceSeq: number,
  limit = 100,
): Promise<AgentDecisionRecord[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await decisionsTable(supabase)
    .select(
      "seq, decision_key, subject_kind, subject_id, decision, note, decided_by_email, decided_at, applied_at",
    )
    .eq("company_id", companyId)
    .gt("seq", sinceSeq)
    .order("seq", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 500));

  if (error) {
    console.error("[listAgentDecisionsSince] read failed", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return [];
  }

  return ((data ?? []) as unknown[]).map((row) => {
    const record = row as {
      seq: number;
      decision_key: string;
      subject_kind: AgentDecisionSubjectKind;
      subject_id: string;
      decision: AgentDecisionValue;
      note: string | null;
      decided_by_email: string | null;
      decided_at: string;
      applied_at: string | null;
    };
    return {
      seq: record.seq,
      decisionKey: record.decision_key,
      subjectKind: record.subject_kind,
      subjectId: record.subject_id,
      decision: record.decision,
      note: record.note,
      decidedByEmail: record.decided_by_email,
      decidedAt: record.decided_at,
      appliedAt: record.applied_at,
    };
  });
}

/** Marks decisions the platform has durably applied. Idempotent. */
export async function markAgentDecisionsApplied(
  companyId: string,
  seqs: number[],
): Promise<number> {
  if (seqs.length === 0) return 0;
  const supabase = createServiceRoleClient();
  // Chunked rather than truncated. seq values are integers, so 500 of them fit
  // inside the PostgREST request line comfortably — the bug the slice caused was
  // not a request-size failure, it was that decision 501 onward was silently
  // never marked applied and would be re-applied on the next pass.
  const { error } = await selectInChunks<{ seq: number }, number>(seqs, (chunk) =>
    decisionsTable(supabase)
      .update({ applied_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .is("applied_at", null)
      .in("seq", chunk)
      .select("seq"),
  );

  if (error) {
    console.error("[markAgentDecisionsApplied] write failed", {
      companyId,
      code: error.code,
      message: error.message,
    });
    return 0;
  }
  return seqs.length;
}

/** Decisions recorded but not yet applied — surfaced so a click is not silent. */
export async function countUnappliedAgentDecisions(
  companyId: string,
): Promise<number> {
  const supabase = createServiceRoleClient();
  const { count, error } = await decisionsTable(supabase)
    .select("seq", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("applied_at", null);

  if (error) return 0;
  return count ?? 0;
}
