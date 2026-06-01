"use server";

import {
  COMPLETION_NOTES_AI_FEATURE,
  prepareCompletionNotesDraft,
} from "@/lib/ai/completion-notes";
import { mapAiErrorToMessage } from "@/lib/ai/errors";
import { checkAiRateLimit } from "@/lib/ai/guardrails";
import { generateDraftText } from "@/lib/ai/provider";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getJobById } from "@/lib/database/queries/jobs";
import type { CompletionNotesDraftInput } from "@/shared/types/completion-notes-ai";

export type GenerateCompletionNotesDraftResult = {
  error?: string;
  draftText?: string;
};

async function assertCompletionNotesDraftPermission(jobId: string) {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  const trimmedJobId = jobId.trim();
  if (!trimmedJobId) {
    return { error: "Job not found." } as const;
  }

  const job = await getJobById(context.company.id, trimmedJobId);

  if (!job) {
    return { error: "Job not found." } as const;
  }

  const canDispatch = context.permissions.dispatchJobs;
  const canViewAssigned = context.permissions.viewAssignedJobs;

  if (!canDispatch) {
    if (!canViewAssigned) {
      return {
        error: "You do not have permission to polish completion notes.",
      } as const;
    }

    if (job.assignedTechnicianId !== context.user.id) {
      return {
        error: "You can only polish completion notes for jobs assigned to you.",
      } as const;
    }
  }

  return { context, job } as const;
}

export async function generateCompletionNotesDraftAction(
  input: CompletionNotesDraftInput,
): Promise<GenerateCompletionNotesDraftResult> {
  const permission = await assertCompletionNotesDraftPermission(input.jobId);

  if (permission.error || !permission.context || !permission.job) {
    return { error: permission.error };
  }

  const { context, job } = permission;
  const rateLimit = checkAiRateLimit({
    companyId: context.company.id,
    userId: context.user.id,
    feature: COMPLETION_NOTES_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const preparation = prepareCompletionNotesDraft(
    input,
    context.company.id,
    context.user.id,
    job,
  );

  if (preparation.kind === "static") {
    return { error: preparation.draftText };
  }

  const outcome = await generateDraftText(preparation.request);

  if (!outcome.ok) {
    return {
      error: mapAiErrorToMessage(
        outcome.error.code,
        COMPLETION_NOTES_AI_FEATURE,
      ),
    };
  }

  const draftText = outcome.result.draftText.trim();
  if (!draftText) {
    return {
      error: mapAiErrorToMessage(
        "empty_response",
        COMPLETION_NOTES_AI_FEATURE,
      ),
    };
  }

  return { draftText };
}
