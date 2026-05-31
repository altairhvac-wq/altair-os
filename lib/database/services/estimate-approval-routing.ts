import { createClient } from "@/lib/supabase/server";
import { mapDatabaseError } from "@/lib/database/errors";
import {
  getEstimateById,
  linkEstimateToJob,
} from "@/lib/database/queries/estimates";
import {
  createJobFromApprovedEstimate,
  getJobById,
} from "@/lib/database/queries/jobs";
import {
  jobHasActivityEvent,
  recordJobActivity,
} from "@/lib/database/queries/job-activities";
import { emitEstimateApprovedEvent } from "@/lib/database/services/operational-events";
import {
  getDayBoundsInTimeZone,
  isSameCalendarDayInTimeZone,
} from "@/shared/lib/datetime";
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
  timeZone?: string;
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

async function getCompanyTimeZone(companyId: string): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("companies")
    .select("timezone")
    .eq("id", companyId)
    .maybeSingle();

  if (error || !data?.timezone?.trim()) {
    return "America/New_York";
  }

  return data.timezone.trim();
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

async function alignJobToTodaysDispatchBoard(input: {
  companyId: string;
  jobId: string;
  timeZone: string;
}): Promise<void> {
  const job = await getJobById(input.companyId, input.jobId);

  if (!job || job.status !== "scheduled" || job.assignedTechnicianId) {
    return;
  }

  if (isSameCalendarDayInTimeZone(job.scheduledDate, new Date(), input.timeZone)) {
    return;
  }

  const { start: scheduledAt } = getDayBoundsInTimeZone(input.timeZone);
  const supabase = await createClient();

  const { error } = await supabase
    .from("jobs")
    .update({ scheduled_at: scheduledAt })
    .eq("company_id", input.companyId)
    .eq("id", input.jobId)
    .eq("status", "scheduled")
    .is("assigned_technician_id", null);

  if (error) {
    console.error("[alignJobToTodaysDispatchBoard] update failed:", {
      jobId: input.jobId,
      error: mapDatabaseError(error),
    });
  }
}

async function recordEstimateRoutedToDispatch(input: {
  companyId: string;
  estimateId: string;
  estimateNumber?: string;
  customerId?: string;
  jobId: string;
  jobNumber: string;
  signerName?: string;
}): Promise<void> {
  const alreadyRecorded = await jobHasActivityEvent(
    input.companyId,
    input.jobId,
    "estimate_routed_to_dispatch",
  );

  if (alreadyRecorded) {
    return;
  }

  await recordJobActivity({
    company_id: input.companyId,
    job_id: input.jobId,
    actor_id: null,
    event_type: "estimate_routed_to_dispatch",
    metadata: {
      estimate_id: input.estimateId,
      estimate_number: input.estimateNumber,
      customer_id: input.customerId,
      job_number: input.jobNumber,
      approval_source: "public_link",
      signer_name: input.signerName,
    },
  });
}

async function ensureJobForPublicLinkApproval(input: {
  companyId: string;
  estimateId: string;
  estimateNumber?: string;
  customerId?: string;
  signerName?: string;
  timeZone: string;
}): Promise<string | null> {
  const estimate = await getEstimateById(input.companyId, input.estimateId);

  if (!estimate || estimate.status !== "approved") {
    return null;
  }

  if (estimate.jobId) {
    return estimate.jobId;
  }

  const customerId = input.customerId ?? estimate.customerId;
  if (!customerId) {
    console.error("[ensureJobForPublicLinkApproval] missing customer:", {
      estimateId: input.estimateId,
    });
    return null;
  }

  const { jobId, jobNumber, error } = await createJobFromApprovedEstimate({
    companyId: input.companyId,
    estimateId: input.estimateId,
    customerId,
    estimateNumber: input.estimateNumber ?? estimate.estimateNumber,
    notes: estimate.notes,
    lineItems: estimate.lineItems,
    timeZone: input.timeZone,
  });

  if (error || !jobId || !jobNumber) {
    console.error("[ensureJobForPublicLinkApproval] job creation failed:", {
      estimateId: input.estimateId,
      error: error ?? "missing job id",
    });
    return null;
  }

  const linkResult = await linkEstimateToJob(
    input.companyId,
    input.estimateId,
    jobId,
  );

  if (linkResult.error) {
    console.error("[ensureJobForPublicLinkApproval] link estimate failed:", {
      estimateId: input.estimateId,
      jobId,
      error: linkResult.error,
    });
  }

  await recordJobActivity({
    company_id: input.companyId,
    job_id: jobId,
    actor_id: null,
    event_type: "job_created",
    metadata: {
      customer_id: customerId,
      job_id: jobId,
      job_number: jobNumber,
      estimate_id: input.estimateId,
      estimate_number: input.estimateNumber ?? estimate.estimateNumber,
      approval_source: "public_link",
      source: "automatic",
    },
  });

  await recordEstimateRoutedToDispatch({
    companyId: input.companyId,
    estimateId: input.estimateId,
    estimateNumber: input.estimateNumber ?? estimate.estimateNumber,
    customerId,
    jobId,
    jobNumber,
    signerName: input.signerName,
  });

  return jobId;
}

async function routePublicLinkApproval(input: {
  companyId: string;
  estimateId: string;
  estimateNumber?: string;
  customerId?: string;
  jobId: string;
  signerName?: string;
  timeZone: string;
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
    await alignJobToTodaysDispatchBoard({
      companyId: input.companyId,
      jobId: input.jobId,
      timeZone: input.timeZone,
    });

    await recordEstimateRoutedToDispatch({
      companyId: input.companyId,
      estimateId: input.estimateId,
      estimateNumber: input.estimateNumber,
      customerId: input.customerId,
      jobId: input.jobId,
      jobNumber: job.jobNumber,
      signerName: input.signerName,
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

  const alreadyRecorded = await jobHasActivityEvent(
    input.companyId,
    input.jobId,
    "estimate_authorized_on_site",
  );

  if (alreadyRecorded) {
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
    const timeZone =
      input.timeZone?.trim() || (await getCompanyTimeZone(input.companyId));

    if (input.approvalSource === "public_link") {
      let jobId = input.jobId ?? estimate?.jobId ?? null;

      if (!jobId) {
        jobId = await ensureJobForPublicLinkApproval({
          companyId: input.companyId,
          estimateId: input.estimateId,
          estimateNumber,
          customerId,
          signerName: input.signerName,
          timeZone,
        });
      }

      if (jobId) {
        await routePublicLinkApproval({
          companyId: input.companyId,
          estimateId: input.estimateId,
          estimateNumber,
          customerId,
          jobId,
          signerName: input.signerName,
          timeZone,
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

    const jobId = input.jobId ?? estimate?.jobId ?? null;

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
