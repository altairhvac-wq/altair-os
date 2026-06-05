import type { OperationalResolutionQueueType } from "@/shared/lib/operational-resolution-queue";

/** Maps operational insight highlight ids to resolution queue types when actionable. */
export const DASHBOARD_HIGHLIGHT_QUEUE_TYPES: Partial<
  Record<string, OperationalResolutionQueueType>
> = {
  "stalled-jobs": "stalled_job",
  "completed-awaiting-invoicing": "ready_to_invoice",
  "completed-work-review": "needs_review",
};

export function resolveHighlightQueueType(
  highlightId: string,
): OperationalResolutionQueueType | undefined {
  return DASHBOARD_HIGHLIGHT_QUEUE_TYPES[highlightId];
}
