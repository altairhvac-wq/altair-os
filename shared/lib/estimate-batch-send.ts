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
