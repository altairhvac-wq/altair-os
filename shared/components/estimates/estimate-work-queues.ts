import { getEstimateLifecycleState } from "@/shared/lib/estimate-lifecycle";
import type { Estimate, EstimateStatus } from "@/shared/types/estimate";

/**
 * Header filter pills for the Estimates list.
 * Primary status pills and Past are active-lifecycle only. Archived / recently
 * deleted stay on the lifecycle filter (queue scoping is skipped there).
 */
export type EstimateWorkQueue =
  | "draft"
  | "sent"
  | "approved"
  | "declined"
  | "past";

export const ESTIMATE_WORK_QUEUE_ORDER: readonly EstimateWorkQueue[] = [
  "draft",
  "sent",
  "approved",
  "declined",
  "past",
];

export const ESTIMATE_WORK_QUEUE_LABELS: Record<EstimateWorkQueue, string> = {
  draft: "Draft",
  sent: "Sent",
  approved: "Approved",
  declined: "Declined",
  past: "Past",
};

const PAST_ACTIVE_STATUSES = new Set<EstimateStatus>([
  "converted",
  "cancelled",
]);

function isActiveEstimateRecord(estimate: Estimate): boolean {
  return getEstimateLifecycleState(estimate) === "active";
}

/** Active draft estimates waiting to be finished or sent. */
export function isEstimateDraftQueue(estimate: Estimate): boolean {
  return isActiveEstimateRecord(estimate) && estimate.status === "draft";
}

/** Active sent estimates awaiting customer response. */
export function isEstimateSentQueue(estimate: Estimate): boolean {
  return isActiveEstimateRecord(estimate) && estimate.status === "sent";
}

/** Active approved estimates not yet converted. */
export function isEstimateApprovedQueue(estimate: Estimate): boolean {
  return isActiveEstimateRecord(estimate) && estimate.status === "approved";
}

/** Active declined estimates. */
export function isEstimateDeclinedQueue(estimate: Estimate): boolean {
  return isActiveEstimateRecord(estimate) && estimate.status === "declined";
}

/** Active converted + cancelled — closed outcomes folded like Leads Past. */
export function isEstimatePastQueue(estimate: Estimate): boolean {
  return (
    isActiveEstimateRecord(estimate) &&
    PAST_ACTIVE_STATUSES.has(estimate.status)
  );
}

export function matchesEstimateWorkQueue(
  estimate: Estimate,
  queue: EstimateWorkQueue,
): boolean {
  switch (queue) {
    case "draft":
      return isEstimateDraftQueue(estimate);
    case "sent":
      return isEstimateSentQueue(estimate);
    case "approved":
      return isEstimateApprovedQueue(estimate);
    case "declined":
      return isEstimateDeclinedQueue(estimate);
    case "past":
      return isEstimatePastQueue(estimate);
  }
}

export function filterEstimatesForWorkQueue(
  estimates: Estimate[],
  queue: EstimateWorkQueue,
): Estimate[] {
  return estimates.filter((estimate) =>
    matchesEstimateWorkQueue(estimate, queue),
  );
}

export function countEstimatesForWorkQueue(
  estimates: Estimate[],
  queue: EstimateWorkQueue,
): number {
  return filterEstimatesForWorkQueue(estimates, queue).length;
}

export function sumEstimatesForWorkQueue(
  estimates: Estimate[],
  queue: EstimateWorkQueue,
): number {
  return filterEstimatesForWorkQueue(estimates, queue).reduce(
    (sum, estimate) => sum + (Number.isFinite(estimate.total) ? estimate.total : 0),
    0,
  );
}

function compareEstimateRecency(left: Estimate, right: Estimate): number {
  const leftTime = Date.parse(left.updatedAt ?? left.createdAt);
  const rightTime = Date.parse(right.updatedAt ?? right.createdAt);

  if (
    Number.isFinite(leftTime) &&
    Number.isFinite(rightTime) &&
    leftTime !== rightTime
  ) {
    return rightTime - leftTime;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

export function sortEstimatesForWorkQueue(
  estimates: Estimate[],
  queue: EstimateWorkQueue,
): Estimate[] {
  void queue;
  return [...estimates].sort(compareEstimateRecency);
}

export function resolveDefaultEstimateWorkQueue(): EstimateWorkQueue {
  return "draft";
}

const ESTIMATE_WORK_QUEUE_SET = new Set<EstimateWorkQueue>(
  ESTIMATE_WORK_QUEUE_ORDER,
);

/** Narrows a URL parameter before it reaches a query builder. */
export function isEstimateWorkQueue(value: string): value is EstimateWorkQueue {
  return ESTIMATE_WORK_QUEUE_SET.has(value as EstimateWorkQueue);
}
