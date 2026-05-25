"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import {
  createJob,
  getJobById,
  updateJobStatus,
} from "@/lib/database/queries/jobs";
import type { Job, JobFormData, JobStatus } from "@/shared/types/job";
import {
  getTargetStatusForAction,
  type JobWorkflowActionId,
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

  revalidatePath("/jobs");
  return { job };
}

export type UpdateJobStatusActionResult = {
  error?: string;
  job?: Job;
};

export async function updateJobStatusAction(
  jobId: string,
  actionId: JobWorkflowActionId,
  currentStatus: JobStatus,
): Promise<UpdateJobStatusActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return { error: "No active company workspace." };
  }

  const canDispatch = context.permissions.dispatchJobs;
  const canViewAssigned = context.permissions.viewAssignedJobs;
  const technicianAllowedActions: JobWorkflowActionId[] = [
    "dispatch",
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

    const assignedJob = await getJobById(context.company.id, jobId);

    if (!assignedJob) {
      return { error: "Job not found." };
    }

    if (assignedJob.assignedTechnicianId !== context.user.id) {
      return { error: "You can only update jobs assigned to you." };
    }
  }

  const nextStatus = getTargetStatusForAction(currentStatus, actionId);

  if (!nextStatus) {
    return { error: "This status change is not allowed." };
  }

  console.log("[updateJobStatusAction] status transition", {
    jobId,
    actionId,
    currentStatus,
    nextStatus,
  });

  const { job, error } = await updateJobStatus(
    context.company.id,
    jobId,
    currentStatus,
    nextStatus,
  );

  if (error || !job) {
    return { error: error ?? "Failed to update job status." };
  }

  revalidatePath("/jobs");
  revalidatePath("/dispatch");
  revalidatePath("/technician");
  revalidatePath(`/jobs/${jobId}`);

  return { job };
}
