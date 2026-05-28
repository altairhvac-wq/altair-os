"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  correctJobWorkflowStatus,
  createJob,
  getJobById,
  reopenCompletedJob,
  updateJob,
  updateJobWorkflowStatus,
} from "@/lib/database/queries/jobs";
import { listInvoicesForJob } from "@/lib/database/queries/invoices";
import type { JobDetail } from "@/shared/types/job";
import {
  recordJobCreatedActivity,
  recordJobReopenedActivity,
  recordJobStatusChangedActivity,
  recordJobStatusCorrectedActivity,
} from "@/lib/database/services/job-activity";
import { finalizeOpenJobLaborForTerminalJob } from "@/lib/database/services/time-tracking";
import type { Job, JobFormData, JobStatus } from "@/shared/types/job";
import { getReopenCompletedJobBlockReason } from "@/shared/types/invoice";
import {
  getTargetStatusForAction,
  isAllowedStatusCorrection,
  isIdempotentWorkflowAction,
  isTerminalJobStatus,
  resolveReopenTargetStatus,
  type JobWorkflowActionId,
  type JobWorkflowCompletionPayload,
} from "@/shared/types/job-workflow";

export type CreateJobActionResult = {
  error?: string;
  job?: Job;
};

export async function createJobAction(
  data: JobFormData,
): Promise<CreateJobActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to create jobs." };
  }

  const { job, error } = await createJob(context.company.id, data);

  if (error || !job) {
    return { error: error ?? "Failed to create job." };
  }

  await recordJobCreatedActivity({
    companyId: context.company.id,
    jobId: job.id,
    actorId: context.user.id,
    jobNumber: job.jobNumber,
    customerId: job.customerId,
  });

  revalidatePath("/jobs");
  return { job };
}

export type UpdateJobActionResult = {
  error?: string;
  job?: JobDetail;
};

export async function updateJobAction(
  jobId: string,
  data: JobFormData,
): Promise<UpdateJobActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to edit jobs." };
  }

  const { job, error } = await updateJob(context.company.id, jobId, data);

  if (error || !job) {
    return { error: error ?? "Failed to update job." };
  }

  revalidatePath("/jobs");
  revalidatePath("/dispatch");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/customers/${job.customerId}`);

  return { job };
}

export type UpdateJobStatusActionResult = {
  error?: string;
  job?: Job;
};

export async function updateJobStatusAction(
  jobId: string,
  actionId: JobWorkflowActionId,
  _currentStatus: JobStatus,
  payload?: JobWorkflowCompletionPayload,
): Promise<UpdateJobStatusActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const existingJob = await getJobById(context.company.id, jobId);

  if (!existingJob) {
    return { error: "Job not found." };
  }

  const canDispatch = context.permissions.dispatchJobs;
  const canViewAssigned = context.permissions.viewAssignedJobs;
  const technicianAllowedActions: JobWorkflowActionId[] = [
    "dispatch",
    "arrive",
    "start_work",
    "complete",
  ];

  if (!canDispatch) {
    if (!canViewAssigned) {
      return { error: "You do not have permission to update job status." };
    }

    if (!technicianAllowedActions.includes(actionId)) {
      return { error: "You do not have permission for this action." };
    }

    if (existingJob.assignedTechnicianId !== context.user.id) {
      return { error: "You can only update jobs assigned to you." };
    }
  }

  if (isIdempotentWorkflowAction(existingJob.status, actionId)) {
    return { job: existingJob };
  }

  const nextStatus = getTargetStatusForAction(existingJob.status, actionId);

  if (!nextStatus) {
    return { error: "This status change is not allowed." };
  }

  if (actionId === "complete" || actionId === "cancel") {
    const { error: laborError } = await finalizeOpenJobLaborForTerminalJob({
      companyId: context.company.id,
      jobId,
      terminalReason: actionId === "complete" ? "completed" : "cancelled",
      actorId: context.user.id,
    });

    if (laborError) {
      return { error: laborError };
    }
  }

  const { job, error } = await updateJobWorkflowStatus(
    context.company.id,
    jobId,
    existingJob.status,
    nextStatus,
    actionId,
    payload,
  );

  if (error || !job) {
    return { error: error ?? "Failed to update job status." };
  }

  await recordJobStatusChangedActivity({
    companyId: context.company.id,
    jobId,
    actorId: context.user.id,
    actionId,
    fromStatus: existingJob.status,
    toStatus: nextStatus,
    customerId: job.customerId,
    jobNumber: job.jobNumber,
    completionNotes: payload?.completionNotes,
    followUpNotes: payload?.followUpNotes,
  });

  revalidatePath("/jobs");
  revalidatePath("/dispatch");
  revalidatePath("/technician");
  revalidatePath("/tech/time");
  revalidatePath("/time");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/customers/${job.customerId}`);

  return { job };
}

export type CorrectJobStatusActionResult = {
  error?: string;
  job?: Job;
};

export async function correctJobStatusAction(
  jobId: string,
  targetStatus: JobStatus,
): Promise<CorrectJobStatusActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to correct job status." };
  }

  const existingJob = await getJobById(context.company.id, jobId);

  if (!existingJob) {
    return { error: "Job not found." };
  }

  if (isTerminalJobStatus(existingJob.status)) {
    return {
      error: "Completed and cancelled jobs cannot be reopened with status correction.",
    };
  }

  if (!isAllowedStatusCorrection(existingJob.status, targetStatus)) {
    return { error: "This status correction is not allowed." };
  }

  const { job, error } = await correctJobWorkflowStatus(
    context.company.id,
    jobId,
    existingJob.status,
    targetStatus,
  );

  if (error || !job) {
    return { error: error ?? "Failed to correct job status." };
  }

  await recordJobStatusCorrectedActivity({
    companyId: context.company.id,
    jobId,
    actorId: context.user.id,
    fromStatus: existingJob.status,
    toStatus: targetStatus,
    customerId: job.customerId,
    jobNumber: job.jobNumber,
  });

  revalidatePath("/jobs");
  revalidatePath("/dispatch");
  revalidatePath("/technician");
  revalidatePath("/tech/time");
  revalidatePath("/time");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/customers/${job.customerId}`);

  return { job };
}

export type ReopenCompletedJobActionResult = {
  error?: string;
  job?: Job;
};

export async function reopenCompletedJobAction(
  jobId: string,
): Promise<ReopenCompletedJobActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to reopen jobs." };
  }

  const existingJob = await getJobById(context.company.id, jobId);

  if (!existingJob) {
    return { error: "Job not found." };
  }

  if (existingJob.status === "cancelled") {
    return { error: "Cancelled jobs cannot be reopened." };
  }

  if (existingJob.status !== "completed") {
    return { error: "Only completed jobs can be reopened." };
  }

  const invoices = await listInvoicesForJob(context.company.id, jobId);
  const blockReason = getReopenCompletedJobBlockReason(invoices);

  if (blockReason) {
    return { error: blockReason };
  }

  const targetStatus = resolveReopenTargetStatus(existingJob);

  const { job, error } = await reopenCompletedJob(
    context.company.id,
    jobId,
    targetStatus,
    context.user.id,
  );

  if (error || !job) {
    return { error: error ?? "Failed to reopen job." };
  }

  await recordJobReopenedActivity({
    companyId: context.company.id,
    jobId,
    actorId: context.user.id,
    fromStatus: "completed",
    toStatus: targetStatus,
    customerId: job.customerId,
    jobNumber: job.jobNumber,
    technicianId: job.assignedTechnicianId,
    dispatchReactivated: Boolean(existingJob.assignedTechnicianId),
  });

  revalidatePath("/jobs");
  revalidatePath("/dispatch");
  revalidatePath("/technician");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/customers/${job.customerId}`);

  return { job };
}
