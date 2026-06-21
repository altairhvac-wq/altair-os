"use server";

import {
  MARKETING_COMPLETED_JOB_DRAFT_AI_FEATURE,
  MARKETING_POST_REWRITE_AI_FEATURE,
  parseMarketingCompletedJobDraftResponse,
  prepareMarketingCompletedJobDraft,
  prepareMarketingPostRewrite,
} from "@/lib/ai/marketing-post";
import { mapAiErrorToMessage } from "@/lib/ai/errors";
import { checkAiRateLimit } from "@/lib/ai/guardrails";
import { generateDraftText } from "@/lib/ai/provider";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getCompletedJobContextForMarketing } from "@/lib/database/queries/marketing-completed-jobs";
import type {
  MarketingCompletedJobDraftGenerateInput,
  MarketingCompletedJobDraftGenerateResult,
  MarketingPostRewriteInput,
  MarketingPostRewriteMode,
  MarketingPostRewriteResult,
} from "@/shared/types/marketing-ai";
import { MARKETING_POST_REWRITE_MODES } from "@/shared/types/marketing-ai";

const VALID_MARKETING_POST_REWRITE_MODES = new Set<MarketingPostRewriteMode>(
  MARKETING_POST_REWRITE_MODES,
);

function normalizeMarketingPostRewriteMode(
  mode: MarketingPostRewriteMode | undefined,
): MarketingPostRewriteMode {
  if (mode && VALID_MARKETING_POST_REWRITE_MODES.has(mode)) {
    return mode;
  }

  return "polish";
}

function normalizeMarketingPostRewriteInput(
  input: MarketingPostRewriteInput,
): MarketingPostRewriteInput {
  return {
    ...input,
    mode: normalizeMarketingPostRewriteMode(input.mode),
  };
}

async function assertMarketingPostRewritePermission() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (!context.permissions.dispatchJobs) {
    return {
      error: "You do not have permission to rewrite marketing posts.",
    } as const;
  }

  return { context } as const;
}

async function assertMarketingAiPermission() {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE } as const;
  }

  if (!context.permissions.dispatchJobs) {
    return {
      error: "You do not have permission to use marketing AI features.",
    } as const;
  }

  return { context } as const;
}

export async function generateMarketingPostRewriteAction(
  input: MarketingPostRewriteInput,
): Promise<MarketingPostRewriteResult> {
  const permission = await assertMarketingPostRewritePermission();

  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const { context } = permission;

  const rateLimit = checkAiRateLimit({
    companyId: context.company.id,
    userId: context.user.id,
    feature: MARKETING_POST_REWRITE_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const normalizedInput = normalizeMarketingPostRewriteInput(input);

  let completedJobContext = null;

  if (
    normalizedInput.sourceType === "completed_job" &&
    normalizedInput.sourceId?.trim()
  ) {
    const job = await getCompletedJobContextForMarketing(
      context.company.id,
      normalizedInput.sourceId,
    );

    if (!job) {
      return {
        error: "The linked completed job is no longer available for context.",
      };
    }

    completedJobContext = {
      jobType: job.jobType,
      city: job.city,
      state: job.state,
      completedAt: job.completedAt,
    };
  }

  const preparation = prepareMarketingPostRewrite(
    normalizedInput,
    context.company.id,
    context.user.id,
    {
      companyName: context.company.name,
      completedJob: completedJobContext,
    },
  );

  if (preparation.kind === "static") {
    return { error: preparation.draftText };
  }

  const outcome = await generateDraftText(preparation.request);

  if (!outcome.ok) {
    return {
      error: mapAiErrorToMessage(
        outcome.error.code,
        MARKETING_POST_REWRITE_AI_FEATURE,
      ),
    };
  }

  const draftText = outcome.result.draftText.trim();
  if (!draftText) {
    return {
      error: mapAiErrorToMessage(
        "empty_response",
        MARKETING_POST_REWRITE_AI_FEATURE,
      ),
    };
  }

  return { draftText };
}

export async function generateMarketingCompletedJobDraftAction(
  input: MarketingCompletedJobDraftGenerateInput,
): Promise<MarketingCompletedJobDraftGenerateResult> {
  const permission = await assertMarketingAiPermission();

  if (permission.error || !permission.context) {
    return { error: permission.error };
  }

  const { context } = permission;

  const sourceId = input.sourceId?.trim();
  if (!sourceId) {
    return { error: "Choose a completed job before generating a draft." };
  }

  const rateLimit = checkAiRateLimit({
    companyId: context.company.id,
    userId: context.user.id,
    feature: MARKETING_COMPLETED_JOB_DRAFT_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const job = await getCompletedJobContextForMarketing(
    context.company.id,
    sourceId,
  );

  if (!job) {
    return {
      error: "The linked completed job is no longer available for context.",
    };
  }

  const preparation = prepareMarketingCompletedJobDraft(
    {
      companyName: context.company.name,
      channelTarget: input.channelTarget,
      completedJob: {
        jobType: job.jobType,
        city: job.city,
        state: job.state,
        completedAt: job.completedAt,
      },
    },
    context.company.id,
    context.user.id,
  );

  if (preparation.kind === "static") {
    return { error: preparation.message };
  }

  const outcome = await generateDraftText(preparation.request);

  if (!outcome.ok) {
    return {
      error: mapAiErrorToMessage(
        outcome.error.code,
        MARKETING_COMPLETED_JOB_DRAFT_AI_FEATURE,
      ),
    };
  }

  const draft = parseMarketingCompletedJobDraftResponse(
    outcome.result.draftText,
    input.channelTarget,
  );

  if (!draft) {
    return {
      error: mapAiErrorToMessage(
        "empty_response",
        MARKETING_COMPLETED_JOB_DRAFT_AI_FEATURE,
      ),
    };
  }

  return { draft };
}
