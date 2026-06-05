"use server";

import { mapAiErrorToMessage } from "@/lib/ai/errors";
import { isAiFeaturesEnabled } from "@/lib/ai/env";
import { checkAiRateLimit } from "@/lib/ai/guardrails";
import { LEAD_FOLLOW_UP_ACTIVITY_LIMIT } from "@/lib/ai/limits";
import {
  LEAD_FOLLOW_UP_AI_FEATURE,
  prepareLeadFollowUpDraft,
} from "@/lib/ai/lead-follow-up";
import { generateDraftText } from "@/lib/ai/provider";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getCustomerById } from "@/lib/database/queries/customers";
import {
  getEstimateById,
  listEstimatesByCustomer,
} from "@/lib/database/queries/estimates";
import { listLeadActivitiesForLead } from "@/lib/database/queries/lead-activities";
import { getLeadById } from "@/lib/database/queries/leads";
import { listJobsByCustomer } from "@/lib/database/queries/jobs";
import type {
  LeadFollowUpCustomerContext,
  LeadFollowUpDraftInput,
  LeadFollowUpEstimateContext,
} from "@/shared/types/lead-ai";
import type { Lead } from "@/shared/types/lead";
import type { JobStatus } from "@/shared/types/job";

export type GenerateLeadFollowUpResult = {
  error?: string;
  followUpText?: string;
};

const CLOSED_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  "completed",
  "cancelled",
]);

async function resolveLeadEstimateContext(
  companyId: string,
  lead: Lead,
  activities: Awaited<ReturnType<typeof listLeadActivitiesForLead>>,
): Promise<LeadFollowUpEstimateContext | undefined> {
  const estimateActivity = activities.find(
    (activity) =>
      activity.activityType === "estimate_created" &&
      activity.metadata.estimateId?.trim(),
  );

  if (estimateActivity?.metadata.estimateId) {
    const estimate = await getEstimateById(
      companyId,
      estimateActivity.metadata.estimateId,
    );

    if (estimate) {
      return {
        estimateNumber: estimate.estimateNumber,
        status: estimate.status,
        total: estimate.total,
        createdAt: estimate.createdAt,
        sentAt: estimate.sentAt,
        approvedAt: estimate.approvedAt,
      };
    }
  }

  if (!lead.convertedCustomerId) {
    return undefined;
  }

  const estimates = await listEstimatesByCustomer(
    companyId,
    lead.convertedCustomerId,
    1,
  );
  const estimate = estimates[0];

  if (!estimate) {
    return undefined;
  }

  return {
    estimateNumber: estimate.estimateNumber,
    status: estimate.status,
    total: estimate.total,
    createdAt: estimate.createdAt,
    sentAt: estimate.sentAt,
    approvedAt: estimate.approvedAt,
  };
}

async function resolveLeadCustomerContext(
  companyId: string,
  customerId: string,
): Promise<LeadFollowUpCustomerContext | undefined> {
  const [customer, jobs] = await Promise.all([
    getCustomerById(companyId, customerId),
    listJobsByCustomer(companyId, customerId, 5),
  ]);

  if (!customer) {
    return undefined;
  }

  const openJobsCount = jobs.filter(
    (job) => !CLOSED_JOB_STATUSES.has(job.status),
  ).length;
  const recentJob = jobs[0];

  return {
    name: customer.name,
    openJobsCount,
    recentJobStatus: recentJob?.status,
    recentJobNumber: recentJob?.jobNumber,
  };
}

async function buildLeadFollowUpDraftInput(
  companyId: string,
  companyName: string,
  lead: Lead,
): Promise<LeadFollowUpDraftInput> {
  const activities = await listLeadActivitiesForLead(companyId, lead.id);
  const recentActivities = activities.slice(0, LEAD_FOLLOW_UP_ACTIVITY_LIMIT);

  const [estimate, customer] = await Promise.all([
    resolveLeadEstimateContext(companyId, lead, activities),
    lead.convertedCustomerId
      ? resolveLeadCustomerContext(companyId, lead.convertedCustomerId)
      : Promise.resolve(undefined),
  ]);

  return {
    lead,
    companyName,
    recentActivities,
    estimate,
    customer,
  };
}

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

  const draftInput = await buildLeadFollowUpDraftInput(
    context.company.id,
    context.company.name,
    lead,
  );

  const preparation = prepareLeadFollowUpDraft(
    draftInput,
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
