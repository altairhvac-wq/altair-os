"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/database/auth";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  AGENT_DECISION_SUBJECT_KINDS,
  AGENT_DECISION_VALUES,
  recordAgentDecision,
  type AgentDecisionSubjectKind,
  type AgentDecisionValue,
} from "@/lib/database/queries/agent-decisions";

/**
 * Records a human decision on an Agent Platform proposal.
 *
 * THIS IS A SECURITY BOUNDARY, not a UI helper: it resolves the company
 * context and re-checks the permission itself, because hiding a button is not
 * authorization (AGENTS.md). It is company-scoped from the session, never
 * from the caller's arguments.
 *
 * APPROVING HERE PUBLISHES NOTHING. It records that a human agreed. The Agent
 * Platform decides independently whether anything external may happen, and
 * its own permission engine and effect ledger still gate every external
 * action. There is deliberately no code path from this action to a Meta
 * write, an ad budget, or any spend.
 *
 * IDEMPOTENT. A repeated submission for the same subject is reported as
 * already recorded rather than erroring or overwriting: overwriting would let
 * a second click silently reverse a decision the platform may already have
 * applied.
 */

export type AgentDecisionActionResult = {
  error?: string;
  recorded?: boolean;
  duplicate?: boolean;
};

const MAX_NOTE_LENGTH = 1000;

export async function recordAgentDecisionAction(
  subjectKind: string,
  subjectId: string,
  decision: string,
  note?: string,
): Promise<AgentDecisionActionResult> {
  const [companyContext, user] = await Promise.all([
    getActiveCompanyContext(),
    getCurrentUser(),
  ]);

  if (!companyContext) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }
  if (!canAccessAdminNavItem(companyContext, "/marketing")) {
    return {
      error:
        "Marketing decisions are limited to company owners, admins, and dispatchers.",
    };
  }

  if (
    !(AGENT_DECISION_SUBJECT_KINDS as readonly string[]).includes(subjectKind)
  ) {
    return { error: "Unknown decision subject." };
  }
  if (!(AGENT_DECISION_VALUES as readonly string[]).includes(decision)) {
    return { error: "Unknown decision." };
  }
  const trimmedSubject = subjectId.trim();
  if (!trimmedSubject) {
    return { error: "A decision needs a subject." };
  }
  const trimmedNote = note?.trim() ?? "";
  if (trimmedNote.length > MAX_NOTE_LENGTH) {
    return { error: `Note must be ${MAX_NOTE_LENGTH} characters or fewer.` };
  }

  const result = await recordAgentDecision({
    companyId: companyContext.company.id,
    subjectKind: subjectKind as AgentDecisionSubjectKind,
    subjectId: trimmedSubject,
    decision: decision as AgentDecisionValue,
    note: trimmedNote === "" ? null : trimmedNote,
    decidedByUserId: user?.id ?? null,
    decidedByEmail: user?.email ?? null,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/marketing");
  return { recorded: true, duplicate: result.duplicate };
}
