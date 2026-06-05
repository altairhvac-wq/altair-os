import type { DashboardData } from "@/shared/types/dashboard";
import type { OperationalResolutionQueueType } from "@/shared/lib/operational-resolution-queue";
import { buildOfficePriorityRecommendations } from "@/shared/lib/office-priority-engine";

/**
 * Queue types surfaced in Altair Recommendations — used to avoid repeating the
 * same actionable signal on the same dashboard screen.
 */
export function getAltairCoveredQueueTypes(
  data: DashboardData,
): Set<OperationalResolutionQueueType> {
  return new Set(
    buildOfficePriorityRecommendations(data).map(
      (recommendation) => recommendation.relatedQueue,
    ),
  );
}

export function isCoveredByAltairRecommendations(
  queueType: OperationalResolutionQueueType | undefined,
  coveredQueues: Set<OperationalResolutionQueueType>,
): boolean {
  return queueType != null && coveredQueues.has(queueType);
}
