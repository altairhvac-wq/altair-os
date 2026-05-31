import {
  recordEstimateActivity,
  resolveEstimateStatusEventType,
} from "@/lib/database/queries/estimate-activities";
import { applyEstimateApprovalRouting } from "@/lib/database/services/estimate-approval-routing";
import type { EstimateApprovalSource } from "@/shared/types/estimate-approval";
import type { EstimateStatus } from "@/shared/types/estimate";

export async function recordEstimateCreatedActivity(input: {
  companyId: string;
  estimateId: string;
  actorId: string;
  estimateNumber: string;
  customerId?: string;
  jobId?: string;
  jobNumber?: string;
  creationSource?: "field" | "office";
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
      creation_source: input.creationSource,
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
  approvalSource?: EstimateApprovalSource;
  signerName?: string;
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
      approval_source: input.approvalSource,
      signer_name: input.signerName,
    },
  });

  if (error) {
    console.error("[recordEstimateStatusChangedActivity] failed:", {
      estimateId: input.estimateId,
      toStatus: input.toStatus,
      error,
    });
    return;
  }

  if (input.toStatus === "approved") {
    const approvalSource = input.approvalSource ?? "admin_manual";

    await applyEstimateApprovalRouting({
      companyId: input.companyId,
      estimateId: input.estimateId,
      approvalSource,
      actorId: input.actorId,
      estimateNumber: input.estimateNumber,
      customerId: input.customerId,
      jobId: input.jobId,
      signerName: input.signerName,
    });
  }
}

export async function recordEstimateEmailResentActivity(input: {
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
    event_type: "estimate_email_resent",
    metadata: {
      estimate_number: input.estimateNumber,
      customer_id: input.customerId,
      job_id: input.jobId,
      job_number: input.jobNumber,
    },
  });

  if (error) {
    console.error("[recordEstimateEmailResentActivity] failed:", {
      estimateId: input.estimateId,
      error,
    });
  }
}
