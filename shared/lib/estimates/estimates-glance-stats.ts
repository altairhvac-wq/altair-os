import {
  countEstimatesForWorkQueue,
  ESTIMATE_WORK_QUEUE_LABELS,
  ESTIMATE_WORK_QUEUE_ORDER,
  sumEstimatesForWorkQueue,
  type EstimateWorkQueue,
} from "@/shared/components/estimates/estimate-work-queues";
import { formatCurrency } from "@/shared/types/customer";
import type { Estimate } from "@/shared/types/estimate";

export type EstimatesGlanceStat = {
  id: string;
  label: string;
  value: string;
  amount: string;
  detail: string;
  /** When set, clicking the stat activates this list filter. */
  filterQueue?: EstimateWorkQueue;
};

const FILTER_DETAILS: Record<EstimateWorkQueue, string> = {
  draft: "Active drafts waiting to finish or send",
  sent: "Active estimates awaiting customer response",
  approved: "Active approved estimates",
  declined: "Active declined estimates",
  past: "Active converted or cancelled estimates",
};

/**
 * Builds compact glance stats for the Estimates list header.
 * Primary pills count/sum active lifecycle only; Past matches its work queue.
 */
export function buildEstimatesGlanceStats(input: {
  estimates: ReadonlyArray<Estimate>;
}): EstimatesGlanceStat[] {
  const estimates = [...input.estimates];

  return ESTIMATE_WORK_QUEUE_ORDER.map((queue) => {
    const count = countEstimatesForWorkQueue(estimates, queue);
    const total = sumEstimatesForWorkQueue(estimates, queue);
    const label = ESTIMATE_WORK_QUEUE_LABELS[queue];

    return {
      id: queue,
      label,
      value: String(count),
      amount: formatCurrency(total),
      detail:
        count === 0
          ? `No ${label.toLowerCase()} estimates`
          : `${FILTER_DETAILS[queue]} · ${formatCurrency(total)} total`,
      filterQueue: queue,
    };
  });
}
