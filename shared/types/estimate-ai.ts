import type { EstimateLineItemFormData } from "@/shared/types/estimate";

export type EstimateDescriptionDraftInput = {
  notes?: string;
  customerName?: string;
  jobType?: string;
  jobTitle?: string;
  jobNumber?: string;
  tradeContext?: string;
  lineItems?: EstimateLineItemFormData[];
  /** When set, field technicians must be assigned to this job. */
  jobId?: string;
};

export type EstimateDescriptionAiContext = EstimateDescriptionDraftInput & {
  lineItems: EstimateLineItemFormData[];
};
