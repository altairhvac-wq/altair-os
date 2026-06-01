"use server";

import { mapAiErrorToMessage } from "@/lib/ai/errors";
import { checkAiRateLimit } from "@/lib/ai/guardrails";
import { JOB_SUMMARY_ACTIVITY_LIMIT } from "@/lib/ai/limits";
import {
  JOB_SUMMARY_AI_FEATURE,
  prepareJobSummaryDraft,
} from "@/lib/ai/job-summary";
import { generateDraftText } from "@/lib/ai/provider";
import {
  canViewBilling,
  canViewJob,
} from "@/lib/database/access-control";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { listJobBillingSummariesForJob } from "@/lib/database/queries/job-billing-summaries";
import { listOperationalActivitiesForJob } from "@/lib/database/queries/operational-activities";
import { getJobById } from "@/lib/database/queries/jobs";

export type GenerateJobSummaryResult = {
  error?: string;
  summaryText?: string;
};

async function assertJobSummaryPermission(jobId: string) {
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

  if (!canViewJob(context, job)) {
    return {
      error: "You do not have access to summarize this job.",
    } as const;
  }

  return { context, job } as const;
}

export async function generateJobSummaryAction(
  jobId: string,
): Promise<GenerateJobSummaryResult> {
  const permission = await assertJobSummaryPermission(jobId);

  if (permission.error || !permission.context || !permission.job) {
    return { error: permission.error };
  }

  const { context, job } = permission;
  const rateLimit = checkAiRateLimit({
    companyId: context.company.id,
    userId: context.user.id,
    feature: JOB_SUMMARY_AI_FEATURE,
  });

  if (!rateLimit.ok) {
    return { error: mapAiErrorToMessage(rateLimit.code) };
  }

  const canViewBillingData = canViewBilling(context);
  const includeBillingActivities =
    canViewBillingData || context.permissions.createFieldEstimates;

  const [activities, billingContext] = await Promise.all([
    listOperationalActivitiesForJob(context.company.id, job.id, {
      includeBillingActivities,
    }),
    listJobBillingSummariesForJob(context.company.id, job.id, {
      includeInvoices: canViewBillingData,
    }),
  ]);

  const preparation = prepareJobSummaryDraft(
    {
      job,
      recentActivities: activities.slice(0, JOB_SUMMARY_ACTIVITY_LIMIT),
      estimates: billingContext.estimates,
      invoices: billingContext.invoices,
      includeBillingDetails: canViewBillingData,
    },
    context.company.id,
    context.user.id,
  );

  if (preparation.kind === "static") {
    return { error: preparation.draftText };
  }

  const outcome = await generateDraftText(preparation.request);

  if (!outcome.ok) {
    return {
      error: mapAiErrorToMessage(outcome.error.code, JOB_SUMMARY_AI_FEATURE),
    };
  }

  const summaryText = outcome.result.draftText.trim();
  if (!summaryText) {
    return {
      error: mapAiErrorToMessage("empty_response", JOB_SUMMARY_AI_FEATURE),
    };
  }

  return { summaryText };
}
