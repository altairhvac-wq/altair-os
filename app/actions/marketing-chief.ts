"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import {
  enqueueChiefQuestion,
  getLatestChiefConversationId,
} from "@/lib/database/queries/agent-chief-messages";
import { validateChiefQuestion } from "@/shared/types/marketing-command";

export type AskChiefResult = {
  error?: string;
  queued?: boolean;
  duplicate?: boolean;
};

/**
 * Queue a question for the Chief of Staff.
 *
 * ============ WHAT THIS DOES NOT DO ============
 * It does not call the Agent Platform. It cannot: the platform runs behind
 * NAT and Altair OS has no route to it. The question is written to the queue
 * (migration 188) and the platform pulls it on its next cycle, exactly as it
 * pulls human decisions. The UI says "queued" because that is what happened.
 *
 * It also carries no authority. A question is text; every action the Chief
 * may take in response is still gated by the platform's permission engine,
 * approval binding and publish gate, none of which are reachable from here.
 *
 * ============ IDEMPOTENCY ============
 * The caller supplies a `requestKey` and a double submit reuses it, so the
 * unique index refuses the second insert and the existing question comes
 * back. A user pressing send twice asks the Chief once.
 */
export async function askChiefAction(input: {
  body: string;
  requestKey: string;
  conversationId?: string;
}): Promise<AskChiefResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };

  // A Server Action is a public boundary. The SAME check the /marketing page
  // makes gates asking about it — a user who cannot open Marketing cannot
  // question the Chief about it either.
  if (!canAccessAdminNavItem(context, "/marketing")) {
    return {
      error: "You do not have access to Marketing operations for this company.",
    };
  }

  const validated = validateChiefQuestion(input.body);
  if (!validated.ok) return { error: validated.error };

  const requestKey = input.requestKey.trim();
  if (!requestKey || requestKey.length > 200) {
    return { error: "That question could not be queued." };
  }

  // A conversation continues by default; a caller may start a new one by
  // passing an id. Never taken from the client without a fallback, so a
  // missing id cannot orphan a message.
  const conversationId =
    input.conversationId?.trim() ||
    (await getLatestChiefConversationId(context.company.id)) ||
    randomUUID();

  const result = await enqueueChiefQuestion({
    companyId: context.company.id,
    conversationId,
    body: validated.body,
    requestKey,
    askedByUserId: context.user.id,
    askedByEmail: context.user.email ?? null,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/marketing");
  return { queued: true, duplicate: result.duplicate === true };
}
