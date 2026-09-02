"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { canAccessAdminNavItem } from "@/lib/database/access-control";
import { enqueueWorkRequest } from "@/lib/database/queries/agent-work-requests";
import {
  isWorkRequestKind,
  WORK_REQUEST_NOTE_MAX,
} from "@/shared/types/agent-work-request";

export type RequestWorkResult = {
  error?: string;
  queued?: boolean;
  duplicate?: boolean;
};

/**
 * Queue one named piece of Agent Platform work.
 *
 * ============ WHAT THIS DOES NOT DO ============
 * It does not call the Agent Platform, and it does not run anything. It
 * cannot: the platform is behind NAT and Altair OS has no route to it. The
 * request is written to the queue (migration 189) and the platform pulls it
 * on its next cycle, exactly as it pulls human decisions and questions.
 *
 * It also cannot cause a spend on its own. Each runner on the platform keeps
 * its own consent gate, and this path can neither read nor set them — so a
 * request for work whose gate is off comes back `refused`, having spent
 * nothing. Two independent humans have to agree before a model is paid: one
 * here, one at the laptop.
 *
 * ============ ONE REQUEST, NOT A CATEGORY ============
 * `kind` is validated against the closed vocabulary before anything is
 * written. There is no free-text command and no argument, so this action can
 * queue exactly one named analysis run and nothing else — vague language
 * cannot become a broad instruction, because there is no field for it.
 *
 * ============ IDEMPOTENCY ============
 * The caller supplies a `requestKey`; a double-clicked button reuses it, the
 * unique index refuses the second insert, and the existing request comes
 * back. Pressing the button twice asks for the work once.
 */
export async function requestWorkAction(input: {
  kind: string;
  note?: string;
  requestKey: string;
}): Promise<RequestWorkResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };

  // A Server Action is a public boundary. The SAME check the /marketing page
  // makes gates requesting work from it.
  if (!canAccessAdminNavItem(context, "/marketing")) {
    return {
      error: "You do not have access to Marketing operations for this company.",
    };
  }

  if (!isWorkRequestKind(input.kind)) {
    // Refused rather than defaulted. Guessing which analysis someone meant is
    // exactly the vague-language failure this layer must not have.
    return { error: "That is not something the Chief can be asked to run." };
  }

  const requestKey = input.requestKey.trim();
  if (!requestKey || requestKey.length > 200) {
    return { error: "That request could not be queued." };
  }

  const note = input.note?.trim() ?? "";
  if (note.length > WORK_REQUEST_NOTE_MAX) {
    return { error: "That note is too long." };
  }

  const result = await enqueueWorkRequest({
    companyId: context.company.id,
    kind: input.kind,
    note: note || null,
    requestKey,
    requestedByUserId: context.user.id,
    requestedByEmail: context.user.email ?? null,
  });

  if (result.error) return { error: result.error };

  revalidatePath("/marketing");
  return { queued: true, duplicate: result.duplicate === true };
}
