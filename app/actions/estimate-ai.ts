"use server";

import {
  isInsufficientEstimateDescriptionResponse,
  prepareEstimateDescriptionDraft,
} from "@/lib/ai/estimate-description";
import { generateDraftText } from "@/lib/ai/provider";
import type { GenerateDraftTextErrorCode } from "@/lib/ai/types";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getJobById } from "@/lib/database/queries/jobs";
import type { EstimateDescriptionDraftInput } from "@/shared/types/estimate-ai";

export type GenerateEstimateDescriptionDraftResult = {
  error?: string;
  draftText?: string;
};

function mapAiError(code: GenerateDraftTextErrorCode): string {
  switch (code) {
    case "ai_disabled":
    case "missing_api_key":
      return "AI drafting is not configured yet.";
    case "empty_response":
    case "provider_error":
    default:
      return "Could not rewrite the notes. Try again.";
  }
}

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

  const preparation = prepareEstimateDescriptionDraft(
    input,
    permission.context.company.id,
    permission.context.user.id,
  );

  if (preparation.kind === "static") {
    return { error: preparation.draftText };
  }

  const outcome = await generateDraftText(preparation.request);

  if (!outcome.ok) {
    return { error: mapAiError(outcome.error.code) };
  }

  const draftText = outcome.result.draftText.trim();
  if (!draftText) {
    return { error: mapAiError("empty_response") };
  }

  if (isInsufficientEstimateDescriptionResponse(draftText)) {
    return { error: draftText };
  }

  return { draftText };
}
