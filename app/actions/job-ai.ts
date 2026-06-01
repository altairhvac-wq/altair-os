"use server";

import { prepareJobSummaryDraft } from "@/lib/ai/job-summary";
import { generateDraftText } from "@/lib/ai/provider";
import type { GenerateDraftTextErrorCode } from "@/lib/ai/types";
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

function mapAiError(code: GenerateDraftTextErrorCode): string {
  switch (code) {
    case "ai_disabled":
    case "missing_api_key":
      return "AI job summaries are not configured yet.";
    case "empty_response":
    case "provider_error":
    default:
      return "Could not summarize this job. Try again.";
  }
}

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
      recentActivities: activities.slice(0, 8),
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
    return { error: mapAiError(outcome.error.code) };
  }

  const summaryText = outcome.result.draftText.trim();
  if (!summaryText) {
    return { error: mapAiError("empty_response") };
  }

  return { summaryText };
}
