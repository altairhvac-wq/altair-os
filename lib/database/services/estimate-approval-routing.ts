import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import { getEstimateById } from "@/lib/database/queries/estimates";
import { getJobById } from "@/lib/database/queries/jobs";
import { recordJobActivity } from "@/lib/database/queries/job-activities";
import { emitEstimateApprovedEvent } from "@/lib/database/services/operational-events";
import type { EstimateApprovalSource } from "@/shared/types/estimate-approval";
import type { JobStatus } from "@/shared/types/job";

const ACTIVE_FIELD_JOB_STATUSES = new Set<JobStatus>([
  "dispatched",
  "arrived",
  "in_progress",
]);

export type ApplyEstimateApprovalRoutingInput = {
  companyId: string;
  estimateId: string;
  approvalSource: EstimateApprovalSource;
  actorId?: string | null;
  estimateNumber?: string;
  customerId?: string;
  jobId?: string | null;
  signerName?: string;
};

function isSafeToUnassignForRemoteApproval(job: {
  status: JobStatus;
  assignedTechnicianId?: string | null;
}): boolean {
  if (!job.assignedTechnicianId) {
    return false;
  }

  if (ACTIVE_FIELD_JOB_STATUSES.has(job.status)) {
    return false;
  }

  if (job.status === "completed" || job.status === "cancelled") {
    return false;
  }

  return true;
}

async function unassignJobForRemoteApproval(
  companyId: string,
  jobId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: jobRow, error: jobError } = await supabase
    .from("jobs")
    .select("id, status, assigned_technician_id")
    .eq("company_id", companyId)
    .eq("id", jobId)
    .maybeSingle();

  if (jobError) {
    return { error: mapDatabaseError(jobError) };
  }

  if (!jobRow?.assigned_technician_id) {
    return { error: null };
  }

  const { error: assignmentError } = await supabase
    .from("dispatch_assignments")
    .update({ status: "unassigned", unassigned_at: now })
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .eq("status", "active");

  if (assignmentError) {
    return { error: mapDatabaseError(assignmentError) };
  }

  const { error: updateError } = await supabase
    .from("jobs")
    .update({ assigned_technician_id: null })
    .eq("company_id", companyId)
    .eq("id", jobId);

  if (updateError) {
    return { error: mapDatabaseError(updateError) };
  }

  return { error: null };
}

async function routePublicLinkApproval(input: {
  companyId: string;
  estimateId: string;
  estimateNumber?: string;
  customerId?: string;
  jobId: string;
  signerName?: string;
}): Promise<void> {
  const job = await getJobById(input.companyId, input.jobId);

  if (!job) {
    return;
  }

  const wasUnassigned = !job.assignedTechnicianId;

  if (isSafeToUnassignForRemoteApproval(job)) {
    const { error } = await unassignJobForRemoteApproval(
      input.companyId,
      input.jobId,
    );

    if (error) {
      console.error("[routePublicLinkApproval] unassign failed:", {
        jobId: input.jobId,
        error,
      });
      return;
    }
  }

  const showOnDispatch =
    wasUnassigned || isSafeToUnassignForRemoteApproval(job);

  if (showOnDispatch) {
    await recordJobActivity({
      company_id: input.companyId,
      job_id: input.jobId,
      actor_id: null,
      event_type: "estimate_routed_to_dispatch",
      metadata: {
        estimate_id: input.estimateId,
        estimate_number: input.estimateNumber,
        customer_id: input.customerId,
        job_number: job.jobNumber,
        approval_source: "public_link",
        signer_name: input.signerName,
      },
    });
  }
}

async function routeTechnicianDeviceApproval(input: {
  companyId: string;
  estimateId: string;
  actorId: string;
  estimateNumber?: string;
  customerId?: string;
  jobId: string;
  signerName?: string;
}): Promise<void> {
  const job = await getJobById(input.companyId, input.jobId);

  if (!job) {
    return;
  }

  await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: input.actorId,
    event_type: "estimate_authorized_on_site",
    metadata: {
      estimate_id: input.estimateId,
      estimate_number: input.estimateNumber,
      customer_id: input.customerId,
      job_number: job.jobNumber,
      approval_source: "technician_device",
      signer_name: input.signerName,
      technician_id: job.assignedTechnicianId ?? undefined,
    },
  });

}

/**
 * Post-approval routing by source. Safe to call after status is already approved.
 * Never throws — failures are logged only.
 */
export async function applyEstimateApprovalRouting(
  input: ApplyEstimateApprovalRoutingInput,
): Promise<void> {
  try {
    const estimate =
      (await getEstimateById(input.companyId, input.estimateId)) ?? null;

    const estimateNumber =
      input.estimateNumber ?? estimate?.estimateNumber ?? undefined;
    const customerId = input.customerId ?? estimate?.customerId ?? undefined;
    const jobId = input.jobId ?? estimate?.jobId ?? null;

    if (input.approvalSource === "public_link") {
      if (jobId) {
        await routePublicLinkApproval({
          companyId: input.companyId,
          estimateId: input.estimateId,
          estimateNumber,
          customerId,
          jobId,
          signerName: input.signerName,
        });
      }

      await emitEstimateApprovedEvent({
        companyId: input.companyId,
        estimateId: input.estimateId,
        actorId: input.actorId,
        estimateNumber,
        customerId,
        jobId: jobId ?? undefined,
        approvalSource: "public_link",
      });
      return;
    }

    if (input.approvalSource === "technician_device" && jobId && input.actorId) {
      await routeTechnicianDeviceApproval({
        companyId: input.companyId,
        estimateId: input.estimateId,
        actorId: input.actorId,
        estimateNumber,
        customerId,
        jobId,
        signerName: input.signerName,
      });

      await emitEstimateApprovedEvent({
        companyId: input.companyId,
        estimateId: input.estimateId,
        actorId: input.actorId,
        estimateNumber,
        customerId,
        jobId,
        approvalSource: "technician_device",
      });
      return;
    }

    if (input.approvalSource === "admin_manual") {
      await emitEstimateApprovedEvent({
        companyId: input.companyId,
        estimateId: input.estimateId,
        actorId: input.actorId,
        estimateNumber,
        customerId,
        jobId: jobId ?? undefined,
        approvalSource: "admin_manual",
      });
    }
  } catch (error) {
    console.error("[applyEstimateApprovalRouting] failed:", {
      estimateId: input.estimateId,
      approvalSource: input.approvalSource,
      error,
    });
  }
}
