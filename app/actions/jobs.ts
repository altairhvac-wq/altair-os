"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  createJob,
  getJobById,
  updateJob,
  updateJobWorkflowStatus,
} from "@/lib/database/queries/jobs";
import type { JobDetail } from "@/shared/types/job";
import {
  recordJobCreatedActivity,
  recordJobStatusChangedActivity,
} from "@/lib/database/services/job-activity";
import type { Job, JobFormData, JobStatus } from "@/shared/types/job";
import {
  getTargetStatusForAction,
  isIdempotentWorkflowAction,
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
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/customers/${job.customerId}`);

  return { job };
}
