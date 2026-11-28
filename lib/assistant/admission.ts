import "server-only";

import { checkAiRateLimit, type AiRateLimitCheck, type AiRequestWindow } from "@/lib/ai/guardrails";
import type { ActiveCompanyContext } from "@/lib/database/types/core-tables";

/** The feature name the assistant's requests and usage are recorded under. */
export const ASSISTANT_AI_FEATURE = "assistant";

/**
 * A conversation's rhythm, not a drafting button's: a short pause between
 * questions, and a daily allowance for each person. The existing limiter
 * counts per company, person and feature inside one window, so a one-day
 * window is a per-person daily cap with no new table.
 *
 * The company's monthly token ceiling is checked in the same call and is
 * shared with the drafting features for now. A separate allowance for the
 * assistant needs a migration and is not built yet.
 */
export const ASSISTANT_REQUEST_WINDOW: AiRequestWindow = {
  cooldownSeconds: 2,
  windowSeconds: 24 * 60 * 60,
  windowLimit: 40,
};

/**
 * May this person ask the assistant something right now? Runs under their own
 * session (the database takes the actor from it), fails closed when the
 * ceiling cannot be read, and records the request it admits.
 */
export async function checkAssistantAdmission(
  context: ActiveCompanyContext,
): Promise<AiRateLimitCheck> {
  return checkAiRateLimit({
    companyId: context.company.id,
    userId: context.user.id,
    feature: ASSISTANT_AI_FEATURE,
    window: ASSISTANT_REQUEST_WINDOW,
  });
}
