"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { revalidateJobOperationalPages } from "@/lib/database/revalidation/operational-pages";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  archiveJob,
  cancelJob,
  getJobById,
  getJobDeleteDependencies,
  moveJobToTrash,
  permanentlyDeleteJob,
  restoreJob,
  restoreJobFromTrash,
} from "@/lib/database/queries/jobs";
import {
  canArchiveJob,
  canCancelJob,
  canMoveJobToTrash,
  canPermanentlyDeleteJob,
  canRestoreJob,
  canRestoreJobFromTrash,
  getArchiveJobBlockReason,
  getCancelJobBlockReason,
  getMoveJobToTrashBlockReason,
  getPermanentDeleteJobBlockReason,
  getRestoreJobBlockReason,
  getRestoreJobFromTrashBlockReason,
} from "@/shared/lib/job-lifecycle";
import type { Job } from "@/shared/types/job";

export type JobLifecycleActionResult = {
  error?: string;
  job?: Job;
  deleted?: boolean;
};

function revalidateJobPaths(jobId?: string) {
  revalidateJobOperationalPages(jobId);
}

export async function archiveJobAction(
  jobId: string,
): Promise<JobLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to manage jobs." };
  }

  const existing = await getJobById(context.company.id, jobId);
  if (!existing) return { error: "Job not found." };

  const blockReason = getArchiveJobBlockReason(existing);
  if (blockReason || !canArchiveJob(existing)) {
    return { error: blockReason ?? "This job cannot be archived." };
  }

  const { job, error } = await archiveJob(context.company.id, jobId);
  if (error || !job) {
    return { error: error ?? "We couldn't archive this job." };
  }

  revalidateJobPaths(jobId);
  return { job };
}

export async function restoreJobAction(
  jobId: string,
): Promise<JobLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to manage jobs." };
  }

  const existing = await getJobById(context.company.id, jobId);
  if (!existing) return { error: "Job not found." };

  const blockReason = getRestoreJobBlockReason(existing);
  if (blockReason || !canRestoreJob(existing)) {
    return { error: blockReason ?? "This job cannot be restored." };
  }

  const { job, error } = await restoreJob(context.company.id, jobId);
  if (error || !job) {
    return { error: error ?? "We couldn't restore this job." };
  }

  revalidateJobPaths(jobId);
  return { job };
}

export async function cancelJobAction(
  jobId: string,
): Promise<JobLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to manage jobs." };
  }

  const existing = await getJobById(context.company.id, jobId);
  if (!existing) return { error: "Job not found." };

  const blockReason = getCancelJobBlockReason(existing);
  if (blockReason || !canCancelJob(existing)) {
    return { error: blockReason ?? "This job cannot be cancelled." };
  }

  const { job, error } = await cancelJob(context.company.id, jobId);
  if (error || !job) {
    return { error: error ?? "We couldn't cancel this job." };
  }

  revalidateJobPaths(jobId);
  return { job };
}

export async function moveJobToTrashAction(
  jobId: string,
): Promise<JobLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to manage jobs." };
  }

  const existing = await getJobById(context.company.id, jobId);
  if (!existing) return { error: "Job not found." };

  const dependencies = await getJobDeleteDependencies(context.company.id, jobId);
  const blockReason = getMoveJobToTrashBlockReason(existing, dependencies);
  if (blockReason || !canMoveJobToTrash(existing, dependencies)) {
    return { error: blockReason ?? "This job cannot be moved to Recently Deleted." };
  }

  const { job, error } = await moveJobToTrash(context.company.id, jobId);
  if (error || !job) {
    return { error: error ?? "We couldn't move this job to Recently Deleted." };
  }

  revalidateJobPaths(jobId);
  return { job };
}

export async function restoreJobFromTrashAction(
  jobId: string,
): Promise<JobLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to manage jobs." };
  }

  const existing = await getJobById(context.company.id, jobId);
  if (!existing) return { error: "Job not found." };

  const blockReason = getRestoreJobFromTrashBlockReason(existing);
  if (blockReason || !canRestoreJobFromTrash(existing)) {
    return { error: blockReason ?? "This job cannot be restored." };
  }

  const { job, error } = await restoreJobFromTrash(context.company.id, jobId);
  if (error || !job) {
    return { error: error ?? "We couldn't restore this job." };
  }

  revalidateJobPaths(jobId);
  return { job };
}

export async function permanentlyDeleteJobAction(
  jobId: string,
): Promise<JobLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.dispatchJobs) {
    return { error: "You do not have permission to manage jobs." };
  }

  const existing = await getJobById(context.company.id, jobId);
  if (!existing) return { error: "Job not found." };

  const dependencies = await getJobDeleteDependencies(context.company.id, jobId);
  const blockReason = getPermanentDeleteJobBlockReason(existing, dependencies);
  if (blockReason || !canPermanentlyDeleteJob(existing, dependencies)) {
    return { error: blockReason ?? "This job cannot be permanently deleted." };
  }

  const { success, error } = await permanentlyDeleteJob(context.company.id, jobId);
  if (!success || error) {
    return { error: error ?? "We couldn't permanently delete this job." };
  }

  revalidateJobPaths();
  return { deleted: true };
}
