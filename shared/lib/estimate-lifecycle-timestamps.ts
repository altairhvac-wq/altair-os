import type { Estimate } from "@/shared/types/estimate";
import type { EstimateActivity } from "@/shared/types/estimate-activity";

export type EstimateLifecycleTimestamps = {
  sentAt?: string;
  approvedAt?: string;
};

type LifecycleActivity = Pick<EstimateActivity, "eventType" | "createdAt">;

type LifecycleActivityRow = {
  estimateId: string;
  eventType: EstimateActivity["eventType"];
  createdAt: string;
};

/** Earliest estimate_sent / estimate_approved only; resends are excluded from sentAt. */
export function resolveEstimateLifecycleTimestampsFromActivities(
  activities: ReadonlyArray<LifecycleActivity>,
): EstimateLifecycleTimestamps {
  let sentAt: string | undefined;
  let approvedAt: string | undefined;

  for (const activity of activities) {
    if (activity.eventType === "estimate_sent") {
      if (!sentAt || activity.createdAt < sentAt) {
        sentAt = activity.createdAt;
      }
      continue;
    }

    if (activity.eventType === "estimate_approved") {
      if (!approvedAt || activity.createdAt < approvedAt) {
        approvedAt = activity.createdAt;
      }
    }
  }

  return { sentAt, approvedAt };
}

export function resolveEstimateLifecycleTimestampsByEstimateId(
  activities: ReadonlyArray<LifecycleActivityRow>,
): Map<string, EstimateLifecycleTimestamps> {
  const grouped = new Map<string, LifecycleActivity[]>();

  for (const activity of activities) {
    const existing = grouped.get(activity.estimateId) ?? [];
    existing.push({
      eventType: activity.eventType,
      createdAt: activity.createdAt,
    });
    grouped.set(activity.estimateId, existing);
  }

  const timestampsByEstimateId = new Map<string, EstimateLifecycleTimestamps>();

  for (const [estimateId, estimateActivities] of grouped) {
    timestampsByEstimateId.set(
      estimateId,
      resolveEstimateLifecycleTimestampsFromActivities(estimateActivities),
    );
  }

  return timestampsByEstimateId;
}

export function mergeEstimateLifecycleTimestamps<T extends Estimate>(
  estimate: T,
  timestamps: EstimateLifecycleTimestamps | undefined,
): T {
  if (!timestamps) {
    return estimate;
  }

  return {
    ...estimate,
    ...(timestamps.sentAt ? { sentAt: timestamps.sentAt } : {}),
    ...(timestamps.approvedAt ? { approvedAt: timestamps.approvedAt } : {}),
  };
}

export function mergeEstimateLifecycleTimestampsBatch(
  estimates: Estimate[],
  timestampsByEstimateId: ReadonlyMap<string, EstimateLifecycleTimestamps>,
): Estimate[] {
  return estimates.map((estimate) =>
    mergeEstimateLifecycleTimestamps(
      estimate,
      timestampsByEstimateId.get(estimate.id),
    ),
  );
}
