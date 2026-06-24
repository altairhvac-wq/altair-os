import { resolveDbClient, type DbClient } from "@/lib/database/db-client";
import { mapDatabaseError } from "@/lib/database/errors";
import {
  getEstimateById,
  linkEstimateToFollowUpJob,
  linkEstimateToJob,
} from "@/lib/database/queries/estimates";
import {
  createJobFromApprovedEstimate,
  getJobById,
} from "@/lib/database/queries/jobs";
import {
  findFollowUpJobForApprovedEstimate,
  jobHasActivityEvent,
  recordJobActivity,
} from "@/lib/database/queries/job-activities";
import { emitEstimateApprovedEvent } from "@/lib/database/services/operational-events";
import {
  DEFAULT_COMPANY_TIMEZONE,
  getDayBoundsInTimeZone,
  isSameCalendarDayInTimeZone,
  resolveCompanyTimeZone,
} from "@/shared/lib/datetime";
import type { EstimateDetail } from "@/shared/types/estimate";
import type { EstimateApprovalSource } from "@/shared/types/estimate-approval";
import type { JobStatus } from "@/shared/types/job";
import { isTerminalJobStatus } from "@/shared/types/job-workflow";

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
  /** Server-only privileged client for public-link routing after token RPC approval. */
  db?: DbClient;
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

async function getCompanyTimeZone(
  companyId: string,
  db: DbClient,
): Promise<string> {
  const { data, error } = await db
    .from("companies")
    .select("timezone")
    .eq("id", companyId)
    .maybeSingle();

  if (error || !data?.timezone?.trim()) {
    return DEFAULT_COMPANY_TIMEZONE;
  }

  return resolveCompanyTimeZone(data.timezone);
}

async function unassignJobForRemoteApproval(
  companyId: string,
  jobId: string,
  db: DbClient,
): Promise<{ error: string | null }> {
  const now = new Date().toISOString();

  const { data: jobRow, error: jobError } = await db
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

  const { error: assignmentError } = await db
    .from("dispatch_assignments")
    .update({ status: "unassigned", unassigned_at: now })
    .eq("company_id", companyId)
    .eq("job_id", jobId)
    .eq("status", "active");

  if (assignmentError) {
    return { error: mapDatabaseError(assignmentError) };
  }

  const { error: updateError } = await db
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
  db: DbClient;
}): Promise<void> {
  const job = await getJobById(input.companyId, input.jobId, input.db);

  if (!job || job.status !== "scheduled" || job.assignedTechnicianId) {
    return;
  }

  if (isSameCalendarDayInTimeZone(job.scheduledDate, new Date(), input.timeZone)) {
    return;
  }

  const { start: scheduledAt } = getDayBoundsInTimeZone(input.timeZone);

  const { error } = await input.db
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
  previousJobId?: string;
  previousJobNumber?: string;
  db: DbClient;
}): Promise<void> {
  const alreadyRecorded = await jobHasActivityEvent(
    input.companyId,
    input.jobId,
    "estimate_routed_to_dispatch",
    input.db,
  );

  if (alreadyRecorded) {
    return;
  }

  await recordJobActivity(
    {
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
        previous_job_id: input.previousJobId,
        previous_job_number: input.previousJobNumber,
      },
    },
    input.db,
  );
}

async function finalizeNewApprovedEstimateJob(input: {
  companyId: string;
  estimate: EstimateDetail;
  estimateNumber?: string;
  customerId: string;
  jobId: string;
  jobNumber: string;
  signerName?: string;
  previousJobId?: string;
  previousJobNumber?: string;
  linkMode: "new" | "follow_up";
  db: DbClient;
}): Promise<string> {
  const estimateNumber = input.estimateNumber ?? input.estimate.estimateNumber;

  const linkResult =
    input.linkMode === "follow_up" && input.previousJobId
      ? await linkEstimateToFollowUpJob(
          input.companyId,
          input.estimate.id,
          input.jobId,
          input.previousJobId,
          input.db,
        )
      : await linkEstimateToJob(
          input.companyId,
          input.estimate.id,
          input.jobId,
          input.db,
        );

  if (linkResult.error) {
    console.error("[finalizeNewApprovedEstimateJob] link estimate failed:", {
      estimateId: input.estimate.id,
      jobId: input.jobId,
      linkMode: input.linkMode,
      error: linkResult.error,
    });
  }

  const alreadyCreated = await jobHasActivityEvent(
    input.companyId,
    input.jobId,
    "job_created",
    input.db,
  );

  if (!alreadyCreated) {
    await recordJobActivity(
      {
        company_id: input.companyId,
        job_id: input.jobId,
        actor_id: null,
        event_type: "job_created",
        metadata: {
          customer_id: input.customerId,
          job_id: input.jobId,
          job_number: input.jobNumber,
          estimate_id: input.estimate.id,
          estimate_number: estimateNumber,
          approval_source: "public_link",
          source: "automatic",
          previous_job_id: input.previousJobId,
          previous_job_number: input.previousJobNumber,
        },
      },
      input.db,
    );
  }

  await recordEstimateRoutedToDispatch({
    companyId: input.companyId,
    estimateId: input.estimate.id,
    estimateNumber,
    customerId: input.customerId,
    jobId: input.jobId,
    jobNumber: input.jobNumber,
    signerName: input.signerName,
    previousJobId: input.previousJobId,
    previousJobNumber: input.previousJobNumber,
    db: input.db,
  });

  return input.jobId;
}

async function createApprovedEstimateJob(input: {
  companyId: string;
  estimate: EstimateDetail;
  estimateNumber?: string;
  customerId: string;
  signerName?: string;
  timeZone: string;
  previousJobId?: string;
  previousJobNumber?: string;
  linkMode: "new" | "follow_up";
  db: DbClient;
}): Promise<string | null> {
  const estimateNumber = input.estimateNumber ?? input.estimate.estimateNumber;
  const noteLines = [input.estimate.notes?.trim()];

  if (input.previousJobNumber) {
    noteLines.push(
      `Follow-up from completed job ${input.previousJobNumber}.`,
    );
  }

  const { jobId, jobNumber, error } = await createJobFromApprovedEstimate(
    {
      companyId: input.companyId,
      estimateId: input.estimate.id,
      customerId: input.customerId,
      estimateNumber,
      notes: noteLines.filter(Boolean).join("\n\n"),
      lineItems: input.estimate.lineItems,
      timeZone: input.timeZone,
    },
    input.db,
  );

  if (error || !jobId || !jobNumber) {
    console.error("[createApprovedEstimateJob] job creation failed:", {
      estimateId: input.estimate.id,
      error: error ?? "missing job id",
    });
    return null;
  }

  return finalizeNewApprovedEstimateJob({
    companyId: input.companyId,
    estimate: input.estimate,
    estimateNumber,
    customerId: input.customerId,
    jobId,
    jobNumber,
    signerName: input.signerName,
    previousJobId: input.previousJobId,
    previousJobNumber: input.previousJobNumber,
    linkMode: input.linkMode,
    db: input.db,
  });
}

async function ensureFollowUpJobForTerminalLink(input: {
  companyId: string;
  estimate: EstimateDetail;
  estimateNumber?: string;
  customerId?: string;
  terminalJobId: string;
  signerName?: string;
  timeZone: string;
  db: DbClient;
}): Promise<string | null> {
  const terminalJob = await getJobById(
    input.companyId,
    input.terminalJobId,
    input.db,
  );

  if (!terminalJob || !isTerminalJobStatus(terminalJob.status)) {
    return null;
  }

  const existingFollowUp = await findFollowUpJobForApprovedEstimate(
    {
      companyId: input.companyId,
      estimateId: input.estimate.id,
      terminalJobId: input.terminalJobId,
    },
    input.db,
  );

  if (existingFollowUp) {
    await linkEstimateToFollowUpJob(
      input.companyId,
      input.estimate.id,
      existingFollowUp.jobId,
      input.terminalJobId,
      input.db,
    );

    return existingFollowUp.jobId;
  }

  const customerId = input.customerId ?? input.estimate.customerId;
  if (!customerId) {
    console.error("[ensureFollowUpJobForTerminalLink] missing customer:", {
      estimateId: input.estimate.id,
    });
    return null;
  }

  return createApprovedEstimateJob({
    companyId: input.companyId,
    estimate: input.estimate,
    estimateNumber: input.estimateNumber,
    customerId,
    signerName: input.signerName,
    timeZone: input.timeZone,
    previousJobId: terminalJob.id,
    previousJobNumber: terminalJob.jobNumber,
    linkMode: "follow_up",
    db: input.db,
  });
}

async function ensureJobForPublicLinkApproval(input: {
  companyId: string;
  estimateId: string;
  estimateNumber?: string;
  customerId?: string;
  signerName?: string;
  timeZone: string;
  db: DbClient;
}): Promise<string | null> {
  const estimate = await getEstimateById(
    input.companyId,
    input.estimateId,
    input.db,
  );

  if (!estimate || estimate.status !== "approved") {
    return null;
  }

  if (estimate.jobId) {
    const linkedJob = await getJobById(
      input.companyId,
      estimate.jobId,
      input.db,
    );

    if (linkedJob && !isTerminalJobStatus(linkedJob.status)) {
      return linkedJob.id;
    }

    if (linkedJob && isTerminalJobStatus(linkedJob.status)) {
      return ensureFollowUpJobForTerminalLink({
        companyId: input.companyId,
        estimate,
        estimateNumber: input.estimateNumber,
        customerId: input.customerId,
        terminalJobId: linkedJob.id,
        signerName: input.signerName,
        timeZone: input.timeZone,
        db: input.db,
      });
    }
  }

  const customerId = input.customerId ?? estimate.customerId;
  if (!customerId) {
    console.error("[ensureJobForPublicLinkApproval] missing customer:", {
      estimateId: input.estimateId,
    });
    return null;
  }

  return createApprovedEstimateJob({
    companyId: input.companyId,
    estimate,
    estimateNumber: input.estimateNumber,
    customerId,
    signerName: input.signerName,
    timeZone: input.timeZone,
    linkMode: "new",
    db: input.db,
  });
}

async function resolveOperationalJobForPublicLinkApproval(input: {
  companyId: string;
  estimateId: string;
  estimateNumber?: string;
  customerId?: string;
  signerName?: string;
  timeZone: string;
  db: DbClient;
}): Promise<string | null> {
  return ensureJobForPublicLinkApproval(input);
}

async function routePublicLinkApproval(input: {
  companyId: string;
  estimateId: string;
  estimateNumber?: string;
  customerId?: string;
  jobId: string;
  signerName?: string;
  timeZone: string;
  db: DbClient;
}): Promise<void> {
  const job = await getJobById(input.companyId, input.jobId, input.db);

  if (!job) {
    return;
  }

  const wasUnassigned = !job.assignedTechnicianId;

  if (isSafeToUnassignForRemoteApproval(job)) {
    const { error } = await unassignJobForRemoteApproval(
      input.companyId,
      input.jobId,
      input.db,
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
      db: input.db,
    });

    await recordEstimateRoutedToDispatch({
      companyId: input.companyId,
      estimateId: input.estimateId,
      estimateNumber: input.estimateNumber,
      customerId: input.customerId,
      jobId: input.jobId,
      jobNumber: job.jobNumber,
      signerName: input.signerName,
      db: input.db,
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
  db: DbClient;
}): Promise<void> {
  const job = await getJobById(input.companyId, input.jobId, input.db);

  if (!job) {
    return;
  }

  const alreadyRecorded = await jobHasActivityEvent(
    input.companyId,
    input.jobId,
    "estimate_authorized_on_site",
    input.db,
  );

  if (alreadyRecorded) {
    return;
  }

  await recordJobActivity(
    {
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
    },
    input.db,
  );
}

/**
 * Post-approval routing by source. Safe to call after status is already approved.
 * Never throws — failures are logged only.
 */
export async function applyEstimateApprovalRouting(
  input: ApplyEstimateApprovalRoutingInput,
): Promise<void> {
  try {
    const db = await resolveDbClient(input.db);

    const estimate =
      (await getEstimateById(input.companyId, input.estimateId, db)) ?? null;

    const estimateNumber =
      input.estimateNumber ?? estimate?.estimateNumber ?? undefined;
    const customerId = input.customerId ?? estimate?.customerId ?? undefined;
    const timeZone =
      input.timeZone?.trim() || (await getCompanyTimeZone(input.companyId, db));

    if (input.approvalSource === "public_link") {
      const jobId = await resolveOperationalJobForPublicLinkApproval({
        companyId: input.companyId,
        estimateId: input.estimateId,
        estimateNumber,
        customerId,
        signerName: input.signerName,
        timeZone,
        db,
      });

      if (jobId) {
        await routePublicLinkApproval({
          companyId: input.companyId,
          estimateId: input.estimateId,
          estimateNumber,
          customerId,
          jobId,
          signerName: input.signerName,
          timeZone,
          db,
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
        db,
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
