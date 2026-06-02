import type { Job } from "@/shared/types/job";
import {
  getAvailableWorkflowActions,
  isTerminalJobStatus,
  type JobWorkflowActionId,
} from "@/shared/types/job-workflow";

const BULK_STATUS_ACTION_ORDER: JobWorkflowActionId[] = [
  "dispatch",
  "arrive",
  "start_work",
  "complete",
  "cancel",
];

export function getBulkAssignJobBlockReason(
  job: Pick<Job, "status">,
): string | null {
  if (job.status === "completed") {
    return "Completed jobs cannot be reassigned.";
  }

  if (job.status === "cancelled") {
    return "Cancelled jobs cannot be reassigned.";
  }

  return null;
}

export function canBulkAssignJob(job: Pick<Job, "status">): boolean {
  return getBulkAssignJobBlockReason(job) === null;
}

export function getBulkStatusActionBlockReason(
  job: Pick<Job, "status">,
  actionId: JobWorkflowActionId,
): string | null {
  if (isTerminalJobStatus(job.status)) {
    return `${
      job.status === "completed" ? "Completed" : "Cancelled"
    } jobs cannot change status.`;
  }

  const action = getAvailableWorkflowActions(job.status).find(
    (candidate) => candidate.id === actionId,
  );

  if (!action) {
    return "This status change is not allowed for this job.";
  }

  return null;
}

export function resolveBulkStatusActionOptions(
  jobs: Job[],
): { id: JobWorkflowActionId; label: string }[] {
  const actionLabels = new Map<JobWorkflowActionId, string>();

  for (const job of jobs) {
    for (const action of getAvailableWorkflowActions(job.status)) {
      actionLabels.set(action.id, action.label);
    }
  }

  return BULK_STATUS_ACTION_ORDER.filter((actionId) =>
    actionLabels.has(actionId),
  ).map((actionId) => ({
    id: actionId,
    label: actionLabels.get(actionId)!,
  }));
}

export function formatBulkJobsResultMessage(input: {
  successCount: number;
  failureCount: number;
  actionLabel: string;
}): string {
  const { successCount, failureCount, actionLabel } = input;

  if (successCount === 0 && failureCount === 0) {
    return `No jobs were updated.`;
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

export function formatBulkAssignJobsResultMessage(input: {
  successCount: number;
  failureCount: number;
  technicianName: string;
}): string {
  const { successCount, failureCount, technicianName } = input;
  const actionLabel = `Assigned to ${technicianName}`;

  if (successCount === 0 && failureCount === 0) {
    return "No jobs were assigned.";
  }

  if (failureCount === 0) {
    return `${actionLabel} for ${successCount} job${
      successCount === 1 ? "" : "s"
    }.`;
  }

  if (successCount === 0) {
    return `${failureCount} job${failureCount === 1 ? "" : "s"} could not be assigned.`;
  }

  return `${actionLabel} for ${successCount} job${
    successCount === 1 ? "" : "s"
  }. ${failureCount} could not be assigned.`;
}

export function isBulkStatusActionDestructive(
  actionId: JobWorkflowActionId,
): boolean {
  return actionId === "cancel";
}
