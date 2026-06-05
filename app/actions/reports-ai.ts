"use server";

import { mapAiErrorToMessage } from "@/lib/ai/errors";
import {
  getCachedBusinessSummary,
  setCachedBusinessSummary,
} from "@/lib/ai/business-summary-cache";
import {
  BUSINESS_SUMMARY_AI_FEATURE,
  parseBusinessSummaryDraft,
  prepareBusinessSummaryDraft,
} from "@/lib/ai/business-summary";
import { checkAiRateLimit } from "@/lib/ai/guardrails";
import { generateDraftText } from "@/lib/ai/provider";
import { canViewOperationalReports } from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getReportsPageData } from "@/lib/database/queries/reports";
import type { GenerateBusinessSummaryResult } from "@/shared/types/reports-page";
import {
  parseReportsPageDateRange,
  type ReportsPageDateRange,
} from "@/shared/types/reports-page";

export async function generateBusinessSummaryAction(
  dateRangeInput: string,
  options: { refresh?: boolean } = {},
): Promise<GenerateBusinessSummaryResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: NO_ACTIVE_COMPANY_MESSAGE };
  }

  if (!canViewOperationalReports(context)) {
    return { error: "You do not have permission to generate business summaries." };
  }

  const dateRange: ReportsPageDateRange = parseReportsPageDateRange(dateRangeInput);

  if (!options.refresh) {
    const cached = getCachedBusinessSummary(context.company.id, dateRange);
    if (cached) {
      return { summary: cached };
    }
  }

  const rateLimit = checkAiRateLimit({
    companyId: context.company.id,
    userId: context.user.id,
    feature: BUSINESS_SUMMARY_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const reports = await getReportsPageData(
    context.company.id,
    context.company.name,
    dateRange,
    { showTechnicianPerformance: true },
  );

  const draftRequest = prepareBusinessSummaryDraft({ reports });
  const outcome = await generateDraftText({
    ...draftRequest,
    companyId: context.company.id,
    userId: context.user.id,
  });

  if (!outcome.ok) {
    return { error: mapAiErrorToMessage(outcome.error.code) };
  }

  const parsed = parseBusinessSummaryDraft(outcome.result.draftText);
  const summary = {
    bullets: parsed.bullets,
    recommendedAction: parsed.recommendedAction,
    generatedAt: new Date().toISOString(),
    fromCache: false,
  };

  setCachedBusinessSummary(context.company.id, dateRange, summary);

  return { summary };
}
