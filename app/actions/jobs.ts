"use server";

import { revalidatePath } from "next/cache";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { createJob, updateJobStatus } from "@/lib/database/queries/jobs";
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

  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to update job status." };
  }

  const nextStatus = getTargetStatusForAction(currentStatus, actionId);

  if (!nextStatus) {
    return { error: "This status change is not allowed." };
  }

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
  revalidatePath(`/jobs/${jobId}`);

  return { job };
}
