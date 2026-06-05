import type { Lead } from "@/shared/types/lead";
import type { LeadActivity } from "@/shared/types/lead-activity";
import type { EstimateStatus } from "@/shared/types/estimate";
import type { JobStatus } from "@/shared/types/job";

export type LeadFollowUpEstimateContext = {
  estimateNumber: string;
  status: EstimateStatus;
  total: number;
  createdAt: string;
  sentAt?: string;
  approvedAt?: string;
};

export type LeadFollowUpCustomerContext = {
  name: string;
  openJobsCount: number;
  recentJobStatus?: JobStatus;
  recentJobNumber?: string;
};

export type LeadFollowUpDraftInput = {
  lead: Lead;
  companyName: string;
  recentActivities: LeadActivity[];
  estimate?: LeadFollowUpEstimateContext;
  customer?: LeadFollowUpCustomerContext;
};
