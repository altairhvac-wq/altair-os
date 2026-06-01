import { getCustomerEmailSendBlockReason } from "@/shared/lib/operational-errors";
import {
  getSendEstimateJobBlockReason,
  type Estimate,
} from "@/shared/types/estimate";
import type { JobStatus } from "@/shared/types/job";

export type EstimateBatchSendJobLookup = ReadonlyMap<
  string,
  Pick<{ status: JobStatus }, "status">
>;

export function getBatchSendEstimateBlockReason(
  estimate: Pick<Estimate, "status" | "jobId" | "customerEmail">,
  jobsById?: EstimateBatchSendJobLookup,
): string | null {
  if (estimate.status !== "draft") {
    return "Only draft estimates can be sent.";
  }

  const emailBlockReason = getCustomerEmailSendBlockReason(estimate.customerEmail);
  if (emailBlockReason) {
    return emailBlockReason;
  }

  if (estimate.jobId && jobsById) {
    const linkedJob = jobsById.get(estimate.jobId);
    if (linkedJob) {
      return getSendEstimateJobBlockReason(linkedJob.status);
    }
  }

  return null;
}

export function canBatchSendEstimate(
  estimate: Pick<Estimate, "status" | "jobId" | "customerEmail">,
  jobsById?: EstimateBatchSendJobLookup,
): boolean {
  return getBatchSendEstimateBlockReason(estimate, jobsById) === null;
}

export function getBatchSendableEstimates(
  estimates: Estimate[],
  jobsById?: EstimateBatchSendJobLookup,
): Estimate[] {
  return estimates.filter((estimate) => canBatchSendEstimate(estimate, jobsById));
}

export function toggleEstimateBatchSelection(
  selectedIds: ReadonlySet<string>,
  estimateId: string,
  selected?: boolean,
): Set<string> {
  const next = new Set(selectedIds);
  const shouldSelect = selected ?? !next.has(estimateId);

  if (shouldSelect) {
    next.add(estimateId);
  } else {
    next.delete(estimateId);
  }

  return next;
}

export function toggleEstimateGroupBatchSelection(
  selectedIds: ReadonlySet<string>,
  estimates: Estimate[],
  selectAll: boolean,
  jobsById?: EstimateBatchSendJobLookup,
): Set<string> {
  const next = new Set(selectedIds);

  for (const estimate of getBatchSendableEstimates(estimates, jobsById)) {
    if (selectAll) {
      next.add(estimate.id);
    } else {
      next.delete(estimate.id);
    }
  }

  return next;
}

export function resolveEstimateBatchSelectionState(
  selectedIds: ReadonlySet<string>,
  estimates: Estimate[],
  jobsById?: EstimateBatchSendJobLookup,
): {
  selectableCount: number;
  allSelected: boolean;
  someSelected: boolean;
  selectedCount: number;
} {
  const selectable = getBatchSendableEstimates(estimates, jobsById);
  const selectableCount = selectable.length;

  if (selectableCount === 0) {
    return {
      selectableCount: 0,
      allSelected: false,
      someSelected: false,
      selectedCount: 0,
    };
  }

  let selectedCount = 0;

  for (const estimate of selectable) {
    if (selectedIds.has(estimate.id)) {
      selectedCount += 1;
    }
  }

  return {
    selectableCount,
    allSelected: selectedCount === selectableCount,
    someSelected: selectedCount > 0 && selectedCount < selectableCount,
    selectedCount,
  };
}

export function formatBatchSendEstimatesResultMessage(input: {
  successCount: number;
  failureCount: number;
}): string {
  const { successCount, failureCount } = input;

  if (successCount === 0 && failureCount === 0) {
    return "No estimates were sent.";
  }

  if (failureCount === 0) {
    return `Sent ${successCount} estimate${successCount === 1 ? "" : "s"}.`;
  }

  if (successCount === 0) {
    return `${failureCount} estimate${failureCount === 1 ? "" : "s"} could not be sent.`;
  }

  return `Sent ${successCount} estimate${successCount === 1 ? "" : "s"}. ${failureCount} could not be sent.`;
}

export function buildJobsByIdForEstimateBatchSend<
  T extends Pick<{ id: string; status: JobStatus }, "id" | "status">,
>(jobs: T[]): EstimateBatchSendJobLookup {
  return new Map(jobs.map((job) => [job.id, job]));
}
