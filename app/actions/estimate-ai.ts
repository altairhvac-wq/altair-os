"use server";

import { mapAiErrorToMessage } from "@/lib/ai/errors";
import {
  ESTIMATE_DESCRIPTION_AI_FEATURE,
  isInsufficientEstimateDescriptionResponse,
  prepareEstimateDescriptionDraft,
} from "@/lib/ai/estimate-description";
import { checkAiRateLimit } from "@/lib/ai/guardrails";
import { generateDraftText } from "@/lib/ai/provider";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getJobById } from "@/lib/database/queries/jobs";
import type { EstimateDescriptionDraftInput } from "@/shared/types/estimate-ai";

export type GenerateEstimateDescriptionDraftResult = {
  error?: string;
  draftText?: string;
};

async function assertEstimateDescriptionDraftPermission(jobId?: string) {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  const canDraft =
    context.permissions.manageBilling ||
    context.permissions.createFieldEstimates;

  if (!canDraft) {
    return {
      error: "You do not have permission to draft estimate descriptions.",
    } as const;
  }

  if (jobId?.trim()) {
    const job = await getJobById(context.company.id, jobId.trim());

    if (!job) {
      return { error: "Linked job not found." } as const;
    }

    if (
      !context.permissions.manageBilling &&
      job.assignedTechnicianId !== context.user.id
    ) {
      return {
        error: "You can only draft descriptions for jobs assigned to you.",
      } as const;
    }
  }

  return { context } as const;
}

export async function generateEstimateDescriptionDraftAction(
  input: EstimateDescriptionDraftInput,
): Promise<GenerateEstimateDescriptionDraftResult> {
  const permission = await assertEstimateDescriptionDraftPermission(input.jobId);

  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const { context } = permission;
  const rateLimit = checkAiRateLimit({
    companyId: context.company.id,
    userId: context.user.id,
    feature: ESTIMATE_DESCRIPTION_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const preparation = prepareEstimateDescriptionDraft(
    input,
    context.company.id,
    context.user.id,
  );

  if (preparation.kind === "static") {
    return { error: preparation.draftText };
  }

  const outcome = await generateDraftText(preparation.request);

  if (!outcome.ok) {
    return {
      error: mapAiErrorToMessage(
        outcome.error.code,
        ESTIMATE_DESCRIPTION_AI_FEATURE,
      ),
    };
  }

  const draftText = outcome.result.draftText.trim();
  if (!draftText) {
    return {
      error: mapAiErrorToMessage(
        "empty_response",
        ESTIMATE_DESCRIPTION_AI_FEATURE,
      ),
    };
  }

  if (isInsufficientEstimateDescriptionResponse(draftText)) {
    return { error: draftText };
  }

  return { draftText };
}
