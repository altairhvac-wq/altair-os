"use server";

import { revalidatePath } from "next/cache";
import { assignJobAction } from "@/app/actions/dispatch";
import { updateJobStatusAction } from "@/app/actions/jobs";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getJobById } from "@/lib/database/queries/jobs";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  getBulkAssignJobBlockReason,
  getBulkStatusActionBlockReason,
} from "@/shared/lib/jobs-bulk-actions";
import type { Job } from "@/shared/types/job";
import type { JobWorkflowActionId } from "@/shared/types/job-workflow";

export type BulkJobActionResultItem = {
  jobId: string;
  jobNumber: string;
  success: boolean;
  error?: string;
  job?: Job;
};

export type BulkJobsActionResult = {
  error?: string;
  results: BulkJobActionResultItem[];
  successCount: number;
  failureCount: number;
};

function normalizeJobIds(jobIds: string[]): string[] {
  return [...new Set(jobIds.map((id) => id.trim()).filter(Boolean))];
}

export async function bulkAssignJobsAction(
  jobIds: string[],
  technicianId: string,
): Promise<BulkJobsActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return {
      error: NO_ACTIVE_COMPANY_MESSAGE,
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  if (!context.permissions.dispatchJobs) {
    return {
      error: "You do not have permission to assign jobs.",
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const uniqueIds = normalizeJobIds(jobIds);
  const trimmedTechnicianId = technicianId.trim();

  if (uniqueIds.length === 0) {
    return {
      error: "Select at least one job.",
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  if (!trimmedTechnicianId) {
    return {
      error: "Select a technician to assign.",
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const results: BulkJobActionResultItem[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const jobId of uniqueIds) {
    const existingJob = await getJobById(context.company.id, jobId);

    if (!existingJob) {
      results.push({
        jobId,
        jobNumber: jobId,
        success: false,
        error: "Job not found.",
      });
      failureCount += 1;
      continue;
    }

    const blockReason = getBulkAssignJobBlockReason(existingJob);
    if (blockReason) {
      results.push({
        jobId,
        jobNumber: existingJob.jobNumber,
        success: false,
        error: blockReason,
      });
      failureCount += 1;
      continue;
    }

    const assignResult = await assignJobAction(jobId, trimmedTechnicianId);

    if (assignResult.error || !assignResult.job) {
      results.push({
        jobId,
        jobNumber: existingJob.jobNumber,
        success: false,
        error: formatActionError(assignResult.error, "Failed to assign job."),
      });
      failureCount += 1;
      continue;
    }

    results.push({
      jobId,
      jobNumber: existingJob.jobNumber,
      success: true,
    });
    successCount += 1;
  }

  if (successCount > 0) {
    revalidatePath("/jobs");
    revalidatePath("/dispatch");
    revalidatePath("/technician");
  }

  return {
    results,
    successCount,
    failureCount,
  };
}

export async function bulkUpdateJobStatusAction(
  jobIds: string[],
  actionId: JobWorkflowActionId,
): Promise<BulkJobsActionResult> {
  const context = await getActiveCompanyContext();

  if (!context) {
    return {
      error: NO_ACTIVE_COMPANY_MESSAGE,
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const canDispatch = context.permissions.dispatchJobs;
  const canViewAssigned = context.permissions.viewAssignedJobs;
  const technicianAllowedActions: JobWorkflowActionId[] = [
    "dispatch",
    "arrive",
    "start_work",
    "complete",
  ];

  if (!canDispatch && !canViewAssigned) {
    return {
      error: "You do not have permission to update job status.",
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  if (!canDispatch && !technicianAllowedActions.includes(actionId)) {
    return {
      error: "You do not have permission for this action.",
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const uniqueIds = normalizeJobIds(jobIds);

  if (uniqueIds.length === 0) {
    return {
      error: "Select at least one job.",
      results: [],
      successCount: 0,
      failureCount: 0,
    };
  }

  const results: BulkJobActionResultItem[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const jobId of uniqueIds) {
    const existingJob = await getJobById(context.company.id, jobId);

    if (!existingJob) {
      results.push({
        jobId,
        jobNumber: jobId,
        success: false,
        error: "Job not found.",
      });
      failureCount += 1;
      continue;
    }

    if (!canDispatch) {
      if (existingJob.assignedTechnicianId !== context.user.id) {
        results.push({
          jobId,
          jobNumber: existingJob.jobNumber,
          success: false,
          error: "You can only update jobs assigned to you.",
        });
        failureCount += 1;
        continue;
      }
    }

    const blockReason = getBulkStatusActionBlockReason(existingJob, actionId);
    if (blockReason) {
      results.push({
        jobId,
        jobNumber: existingJob.jobNumber,
        success: false,
        error: blockReason,
      });
      failureCount += 1;
      continue;
    }

    const statusResult = await updateJobStatusAction(
      jobId,
      actionId,
      existingJob.status,
    );

    if (statusResult.error || !statusResult.job) {
      results.push({
        jobId,
        jobNumber: existingJob.jobNumber,
        success: false,
        error: formatActionError(
          statusResult.error,
          "We couldn't update this job's status.",
        ),
      });
      failureCount += 1;
      continue;
    }

    results.push({
      jobId,
      jobNumber: existingJob.jobNumber,
      success: true,
      job: statusResult.job,
    });
    successCount += 1;
  }

  if (successCount > 0) {
    revalidatePath("/jobs");
    revalidatePath("/dispatch");
    revalidatePath("/technician");
  }

  return {
    results,
    successCount,
    failureCount,
  };
}
