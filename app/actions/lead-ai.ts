"use server";

import { mapAiErrorToMessage } from "@/lib/ai/errors";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { checkAiRateLimit } from "@/lib/ai/guardrails";
import {
  LEAD_FOLLOW_UP_AI_FEATURE,
  prepareLeadFollowUpDraft,
} from "@/lib/ai/lead-follow-up";
import { generateDraftText } from "@/lib/ai/provider";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getLeadById } from "@/lib/database/queries/leads";

export type GenerateLeadFollowUpResult = {
  error?: string;
  followUpText?: string;
};

export async function generateLeadFollowUpAction(
  leadId: string,
): Promise<GenerateLeadFollowUpResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!context.permissions.manageCustomers) {
    return { error: "You do not have permission to use lead follow-up AI." };
  }

  if (!isAiFeaturesEnabled()) {
    return { error: "AI features are not enabled for this workspace." };
  }

  const trimmedLeadId = leadId.trim();
  if (!trimmedLeadId) {
    return { error: "Lead not found." };
  }

  const lead = await getLeadById(context.company.id, trimmedLeadId);
  if (!lead) {
    return { error: "Lead not found." };
  }

  const rateLimit = checkAiRateLimit({
    companyId: context.company.id,
    userId: context.user.id,
    feature: LEAD_FOLLOW_UP_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const outcome = await generateDraftText({
    feature: LEAD_FOLLOW_UP_AI_FEATURE,
    prompt: prepareLeadFollowUpDraft(lead),
    companyId: context.company.id,
    userId: context.user.id,
  });

  if (!outcome.ok) {
    return {
      error: mapAiErrorToMessage(
        outcome.error.code,
        LEAD_FOLLOW_UP_AI_FEATURE,
      ),
    };
  }

  const followUpText = outcome.result.draftText.trim();
  if (!followUpText) {
    return {
      error: mapAiErrorToMessage(
        "empty_response",
        LEAD_FOLLOW_UP_AI_FEATURE,
      ),
    };
  }

  return { followUpText };
}
