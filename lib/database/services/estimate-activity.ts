import {
  recordEstimateActivity,
  resolveEstimateStatusEventType,
} from "@/lib/database/queries/estimate-activities";
import type { EstimateStatus } from "@/shared/types/estimate";

export async function recordEstimateCreatedActivity(input: {
  companyId: string;
  estimateId: string;
  actorId: string;
  estimateNumber: string;
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
}): Promise<void> {
  const { error } = await recordEstimateActivity({
    company_id: input.companyId,
    estimate_id: input.estimateId,
    actor_id: input.actorId,
    event_type: "estimate_created",
    metadata: {
      estimate_number: input.estimateNumber,
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
    },
  });

  if (error) {
    console.error("[recordEstimateCreatedActivity] failed:", {
      estimateId: input.estimateId,
      error,
    });
  }
}

export async function recordEstimateStatusChangedActivity(input: {
  companyId: string;
  estimateId: string;
  actorId: string;
  fromStatus: EstimateStatus;
  toStatus: EstimateStatus;
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  estimateNumber?: string;
}): Promise<void> {
  const { error } = await recordEstimateActivity({
    company_id: input.companyId,
    estimate_id: input.estimateId,
    actor_id: input.actorId,
    event_type: resolveEstimateStatusEventType(input.toStatus),
    metadata: {
      from_status: input.fromStatus,
      to_status: input.toStatus,
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
      invoice_id: input.invoiceId,
      invoice_number: input.invoiceNumber,
      estimate_number: input.estimateNumber,
    },
  });

  if (error) {
    console.error("[recordEstimateStatusChangedActivity] failed:", {
      estimateId: input.estimateId,
      toStatus: input.toStatus,
      error,
    });
  }
}
