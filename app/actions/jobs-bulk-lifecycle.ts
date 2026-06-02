"use server";

import { revalidatePath } from "next/cache";
import {
  archiveJobAction,
  cancelJobAction,
  moveJobToTrashAction,
  permanentlyDeleteJobAction,
  restoreJobAction,
  restoreJobFromTrashAction,
} from "@/app/actions/job-lifecycle";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  getJobById,
  getJobDeleteDependencies,
} from "@/lib/database/queries/jobs";
import { runBulkLifecycleAction, type BulkLifecycleActionResult } from "@/shared/lib/bulk-lifecycle-runner";
import {
  getArchiveJobBlockReason,
  getCancelJobBlockReason,
  getMoveJobToTrashBlockReason,
  getPermanentDeleteJobBlockReason,
  getRestoreJobBlockReason,
  getRestoreJobFromTrashBlockReason,
} from "@/shared/lib/job-lifecycle";

async function runJobsBulk(
  jobIds: string[],
  action: (jobId: string) => Promise<{ error?: string }>,
  getBlockReason?: (
    job: NonNullable<Awaited<ReturnType<typeof getJobById>>>,
    dependencies?: Awaited<ReturnType<typeof getJobDeleteDependencies>>,
  ) => string | null,
  needsDependencies = false,
): Promise<BulkLifecycleActionResult> {
  const context = await getActiveCompanyContext();

  return runBulkLifecycleAction({
    ids: jobIds,
    permissionError: !context
      ? NO_ACTIVE_COMPANY_MESSAGE
      : !context.permissions.dispatchJobs
        ? "You do not have permission to manage jobs."
        : undefined,
    emptySelectionError: "Select at least one job.",
    loadEntity: async (id) => getJobById(context!.company.id, id),
    getLabel: (job) => job.jobNumber,
    getBlockReason: async (job) => {
      const dependencies = needsDependencies
        ? await getJobDeleteDependencies(context!.company.id, job.id)
        : undefined;
      return getBlockReason?.(job, dependencies) ?? null;
    },
    runAction: action,
  });
}

export async function bulkArchiveJobsAction(
  jobIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runJobsBulk(
    jobIds,
    archiveJobAction,
    (job) => getArchiveJobBlockReason(job),
  );

  if (result.successCount > 0) {
    revalidatePath("/jobs");
  }

  return result;
}

export async function bulkRestoreJobsAction(
  jobIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runJobsBulk(
    jobIds,
    restoreJobAction,
    (job) => getRestoreJobBlockReason(job),
  );

  if (result.successCount > 0) {
    revalidatePath("/jobs");
  }

  return result;
}

export async function bulkCancelJobsAction(
  jobIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runJobsBulk(
    jobIds,
    cancelJobAction,
    (job) => getCancelJobBlockReason(job),
  );

  if (result.successCount > 0) {
    revalidatePath("/jobs");
  }

  return result;
}

export async function bulkMoveJobsToTrashAction(
  jobIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runJobsBulk(
    jobIds,
    moveJobToTrashAction,
    (job, dependencies) =>
      dependencies ? getMoveJobToTrashBlockReason(job, dependencies) : null,
    true,
  );

  if (result.successCount > 0) {
    revalidatePath("/jobs");
  }

  return result;
}

export async function bulkRestoreJobsFromTrashAction(
  jobIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runJobsBulk(
    jobIds,
    restoreJobFromTrashAction,
    (job) => getRestoreJobFromTrashBlockReason(job),
  );

  if (result.successCount > 0) {
    revalidatePath("/jobs");
  }

  return result;
}

export async function bulkPermanentlyDeleteJobsAction(
  jobIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runJobsBulk(
    jobIds,
    permanentlyDeleteJobAction,
    (job, dependencies) =>
      dependencies
        ? getPermanentDeleteJobBlockReason(job, dependencies)
        : null,
    true,
  );

  if (result.successCount > 0) {
    revalidatePath("/jobs");
  }

  return result;
}
