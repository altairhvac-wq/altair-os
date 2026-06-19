import { getEstimateLifecycleState } from "@/shared/lib/estimate-lifecycle";
import { getEstimateWorkflowGroup } from "@/shared/lib/estimate-workflow-list";
import type { Estimate } from "@/shared/types/estimate";

export type EstimateWorkQueue =
  | "needs-action"
  | "drafts"
  | "sent"
  | "past";

export const ESTIMATE_WORK_QUEUE_ORDER: readonly EstimateWorkQueue[] = [
  "needs-action",
  "drafts",
  "sent",
  "past",
];

export const ESTIMATE_WORK_QUEUE_LABELS: Record<EstimateWorkQueue, string> = {
  "needs-action": "Needs action",
  drafts: "Drafts",
  sent: "Sent",
  past: "Past",
};

const PAST_ACTIVE_STATUSES = new Set<string>([
  "approved",
  "declined",
  "converted",
  "cancelled",
]);

/** Active estimates that still need finishing, sending, or follow-up. */
export function isEstimateNeedsActionQueue(estimate: Estimate): boolean {
  if (getEstimateLifecycleState(estimate) !== "active") {
    return false;
  }

  return getEstimateWorkflowGroup(estimate.status) === "needs_action";
}

/** Active draft estimates waiting to be finished or sent. */
export function isEstimateDraftQueue(estimate: Estimate): boolean {
  return (
    getEstimateLifecycleState(estimate) === "active" &&
    estimate.status === "draft"
  );
}

/** Active sent estimates awaiting customer response. */
export function isEstimateSentQueue(estimate: Estimate): boolean {
  return (
    getEstimateLifecycleState(estimate) === "active" &&
    estimate.status === "sent"
  );
}

/** Approved, declined, converted, cancelled, archived, deleted, and other closed records. */
export function isEstimatePastQueue(estimate: Estimate): boolean {
  const lifecycle = getEstimateLifecycleState(estimate);

  if (lifecycle !== "active") {
    return true;
  }

  return PAST_ACTIVE_STATUSES.has(estimate.status);
}

export function filterEstimatesForWorkQueue(
  estimates: Estimate[],
  queue: EstimateWorkQueue,
): Estimate[] {
  const predicate = {
    "needs-action": isEstimateNeedsActionQueue,
    drafts: isEstimateDraftQueue,
    sent: isEstimateSentQueue,
    past: isEstimatePastQueue,
  }[queue];

  return estimates.filter(predicate);
}

export function countEstimatesForWorkQueue(
  estimates: Estimate[],
  queue: EstimateWorkQueue,
): number {
  return filterEstimatesForWorkQueue(estimates, queue).length;
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
  const sorted = [...estimates];

  if (queue === "drafts" || queue === "sent" || queue === "past") {
    return sorted.sort(compareEstimateRecency);
  }

  return sorted;
}
