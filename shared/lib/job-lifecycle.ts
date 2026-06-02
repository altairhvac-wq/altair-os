import type { Job, JobStatus } from "@/shared/types/job";

export type JobDeleteDependencies = {
  timeEntryCount: number;
  estimateCount: number;
  invoiceCount: number;
  expenseCount: number;
  paymentCount: number;
};

export type JobLifecycleActionId =
  | "archive"
  | "restore"
  | "cancel"
  | "moveToTrash"
  | "restoreFromTrash"
  | "permanentDelete";

export type JobLifecycleState = "active" | "archived" | "deleted";

export const JOB_TRASH_BLOCKED_MESSAGE =
  "This job has linked time, billing, or expense records. Archive or cancel it instead of moving to Recently Deleted.";

export const JOB_PERMANENT_DELETE_BLOCKED_MESSAGE =
  "This job has historical records and cannot be permanently deleted. Keep it archived or in Recently Deleted.";

export function isJobDeleted(job: Pick<Job, "deletedAt">): boolean {
  return Boolean(job.deletedAt);
}

export function isJobArchived(job: Pick<Job, "archivedAt">): boolean {
  return Boolean(job.archivedAt);
}

export function getJobLifecycleState(
  job: Pick<Job, "archivedAt" | "deletedAt">,
): JobLifecycleState {
  if (isJobDeleted(job)) return "deleted";
  if (isJobArchived(job)) return "archived";
  return "active";
}

export function hasJobHistory(dependencies: JobDeleteDependencies): boolean {
  return (
    dependencies.timeEntryCount > 0 ||
    dependencies.estimateCount > 0 ||
    dependencies.invoiceCount > 0 ||
    dependencies.expenseCount > 0 ||
    dependencies.paymentCount > 0
  );
}

export function getArchiveJobBlockReason(
  job: Pick<Job, "archivedAt" | "deletedAt">,
): string | null {
  if (isJobDeleted(job)) {
    return "This job is in Recently Deleted. Restore it first.";
  }
  if (isJobArchived(job)) {
    return "This job is already archived.";
  }
  return null;
}

export function canArchiveJob(job: Pick<Job, "archivedAt" | "deletedAt">): boolean {
  return getArchiveJobBlockReason(job) === null;
}

export function getRestoreJobBlockReason(
  job: Pick<Job, "archivedAt" | "deletedAt">,
): string | null {
  if (isJobDeleted(job)) {
    return "This job is in Recently Deleted. Use restore from Recently Deleted.";
  }
  if (!isJobArchived(job)) {
    return "This job is not archived.";
  }
  return null;
}

export function canRestoreJob(job: Pick<Job, "archivedAt" | "deletedAt">): boolean {
  return getRestoreJobBlockReason(job) === null;
}

export function getCancelJobBlockReason(
  job: Pick<Job, "status" | "deletedAt">,
): string | null {
  if (isJobDeleted(job)) {
    return "This job is in Recently Deleted. Restore it first.";
  }
  if (job.status === "cancelled") {
    return "This job is already cancelled.";
  }
  if (job.status === "completed") {
    return "Completed jobs cannot be cancelled. Archive the job instead.";
  }
  return null;
}

export function canCancelJob(job: Pick<Job, "status" | "deletedAt">): boolean {
  return getCancelJobBlockReason(job) === null;
}

export function getMoveJobToTrashBlockReason(
  job: Pick<Job, "deletedAt">,
  dependencies: JobDeleteDependencies,
): string | null {
  if (isJobDeleted(job)) {
    return "This job is already in Recently Deleted.";
  }
  if (hasJobHistory(dependencies)) {
    return JOB_TRASH_BLOCKED_MESSAGE;
  }
  return null;
}

export function canMoveJobToTrash(
  job: Pick<Job, "deletedAt">,
  dependencies: JobDeleteDependencies,
): boolean {
  return getMoveJobToTrashBlockReason(job, dependencies) === null;
}

export function getRestoreJobFromTrashBlockReason(
  job: Pick<Job, "deletedAt">,
): string | null {
  if (!isJobDeleted(job)) {
    return "This job is not in Recently Deleted.";
  }
  return null;
}

export function canRestoreJobFromTrash(job: Pick<Job, "deletedAt">): boolean {
  return getRestoreJobFromTrashBlockReason(job) === null;
}

export function getPermanentDeleteJobBlockReason(
  job: Pick<Job, "deletedAt">,
  dependencies: JobDeleteDependencies,
): string | null {
  if (!isJobDeleted(job)) {
    return "Move this job to Recently Deleted before permanently deleting.";
  }
  if (hasJobHistory(dependencies)) {
    return JOB_PERMANENT_DELETE_BLOCKED_MESSAGE;
  }
  return null;
}

export function canPermanentlyDeleteJob(
  job: Pick<Job, "deletedAt">,
  dependencies: JobDeleteDependencies,
): boolean {
  return getPermanentDeleteJobBlockReason(job, dependencies) === null;
}

export function formatBulkJobsResultMessage(input: {
  successCount: number;
  failureCount: number;
  actionLabel: string;
}): string {
  const { successCount, failureCount, actionLabel } = input;

  if (successCount === 0 && failureCount === 0) {
    return "No jobs were updated.";
  }

  if (failureCount === 0) {
    return `${actionLabel} applied to ${successCount} job${
      successCount === 1 ? "" : "s"
    }.`;
  }

  if (successCount === 0) {
    return `${failureCount} job${failureCount === 1 ? "" : "s"} could not be updated.`;
  }

  return `${actionLabel} applied to ${successCount} job${
    successCount === 1 ? "" : "s"
  }. ${failureCount} could not be updated.`;
}

export function isBulkJobActionDestructive(actionId: JobLifecycleActionId): boolean {
  return actionId === "permanentDelete";
}

export function resolveBulkJobLifecycleActions(
  lifecycleFilter: JobLifecycleState,
): JobLifecycleActionId[] {
  if (lifecycleFilter === "archived") {
    return ["restore", "moveToTrash"];
  }
  if (lifecycleFilter === "deleted") {
    return ["restoreFromTrash", "permanentDelete"];
  }
  return ["archive", "cancel", "moveToTrash"];
}

export function isJobStatusCancelled(status: JobStatus): boolean {
  return status === "cancelled";
}
