import type { Estimate } from "@/shared/types/estimate";
import type { StaleSentEstimateEntry } from "@/shared/types/reports";

/** In-code threshold for V1; not user-configurable yet. */
export const ESTIMATE_RECOVERY_THRESHOLD_DAYS = 7;

export function daysSinceSentAt(
  sentAt: string,
  reference = new Date(),
): number {
  const elapsedMs = reference.getTime() - new Date(sentAt).getTime();
  if (!Number.isFinite(elapsedMs)) {
    return 0;
  }

  return Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
}

export function isEstimateAwaitingRecovery(
  estimate: Pick<Estimate, "status" | "sentAt">,
  reference = new Date(),
): boolean {
  if (estimate.status !== "sent") {
    return false;
  }

  const sentAt = estimate.sentAt?.trim();
  if (!sentAt) {
    return false;
  }

  return (
    daysSinceSentAt(sentAt, reference) >= ESTIMATE_RECOVERY_THRESHOLD_DAYS
  );
}

function toStaleSentEstimateEntry(
  estimate: Estimate,
  reference: Date,
): StaleSentEstimateEntry | null {
  if (!estimate.id?.trim() || !estimate.sentAt?.trim()) {
    return null;
  }

  return {
    estimateId: estimate.id,
    estimateNumber: estimate.estimateNumber?.trim() || "Unknown estimate",
    customerName: estimate.customerName?.trim() || "Unknown customer",
    customerEmail: estimate.customerEmail,
    jobId: estimate.jobId,
    total: estimate.total,
    status: estimate.status,
    sentAt: estimate.sentAt,
    daysSinceSent: daysSinceSentAt(estimate.sentAt, reference),
  };
}

/** Sent estimates past the recovery threshold, sorted oldest first. */
export function buildStaleSentEstimateEntries(
  estimates: ReadonlyArray<Estimate>,
  reference = new Date(),
): StaleSentEstimateEntry[] {
  return estimates
    .filter((estimate) => isEstimateAwaitingRecovery(estimate, reference))
    .map((estimate) => toStaleSentEstimateEntry(estimate, reference))
    .filter((entry): entry is StaleSentEstimateEntry => entry != null)
    .sort((left, right) => right.daysSinceSent - left.daysSinceSent);
}
