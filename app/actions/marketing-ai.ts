"use server";

import {
  MARKETING_POST_REWRITE_AI_FEATURE,
  prepareMarketingPostRewrite,
} from "@/lib/ai/marketing-post";
import { mapAiErrorToMessage } from "@/lib/ai/errors";
import { checkAiRateLimit } from "@/lib/ai/guardrails";
import { generateDraftText } from "@/lib/ai/provider";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getCompletedJobContextForMarketing } from "@/lib/database/queries/marketing-completed-jobs";
import type {
  MarketingPostRewriteInput,
  MarketingPostRewriteResult,
} from "@/shared/types/marketing-ai";

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

  let completedJobContext = null;

  if (input.sourceType === "completed_job" && input.sourceId?.trim()) {
    const job = await getCompletedJobContextForMarketing(
      context.company.id,
      input.sourceId,
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
    input,
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
