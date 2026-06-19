import { getDateOnlyInTimeZone } from "@/shared/lib/datetime";
import type { Estimate, EstimateStatus } from "@/shared/types/estimate";

const OPEN_OWNER_STATUSES = new Set<EstimateStatus>(["draft", "sent", "approved"]);

const EXPIRING_SOON_DAYS = 7;

export function isEstimateOpenForOwnerView(estimate: Estimate): boolean {
  return OPEN_OWNER_STATUSES.has(estimate.status);
}

export function isEstimateExpiringSoon(
  estimate: Estimate,
  timeZone?: string,
): boolean {
  if (estimate.status !== "sent" || !estimate.validUntil) {
    return false;
  }

  const today = getDateOnlyInTimeZone(new Date(), timeZone);
  const todayMs = Date.parse(today);
  const validMs = Date.parse(estimate.validUntil);

  if (!Number.isFinite(todayMs) || !Number.isFinite(validMs)) {
    return false;
  }

  const diffDays = (validMs - todayMs) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= EXPIRING_SOON_DAYS;
}

function getOwnerPriorityRank(estimate: Estimate, timeZone?: string): number {
  if (estimate.status === "draft") {
    return 1;
  }

  if (estimate.status === "sent") {
    return isEstimateExpiringSoon(estimate, timeZone) ? 3 : 2;
  }

  if (estimate.status === "approved" && estimate.approvedAt) {
    return 4;
  }

  return 5;
}

function getTimestamp(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareEstimatesWithinRank(
  left: Estimate,
  right: Estimate,
  rank: number,
): number {
  if (rank === 3) {
    const leftValid = getTimestamp(left.validUntil);
    const rightValid = getTimestamp(right.validUntil);

    if (leftValid !== rightValid) {
      return leftValid - rightValid;
    }
  }

  if (rank === 4) {
    const approvedDiff =
      getTimestamp(right.approvedAt) - getTimestamp(left.approvedAt);

    if (approvedDiff !== 0) {
      return approvedDiff;
    }
  }

  if (rank === 1 || rank === 2 || rank === 5) {
    const leftActivity = getTimestamp(left.sentAt) || getTimestamp(left.createdAt);
    const rightActivity = getTimestamp(right.sentAt) || getTimestamp(right.createdAt);

    if (leftActivity !== rightActivity) {
      return rightActivity - leftActivity;
    }
  }

  const createdDiff = getTimestamp(right.createdAt) - getTimestamp(left.createdAt);

  if (createdDiff !== 0) {
    return createdDiff;
  }

  return left.estimateNumber.localeCompare(right.estimateNumber);
}

export function compareEstimatesForOwnerView(
  left: Estimate,
  right: Estimate,
  timeZone?: string,
): number {
  const leftRank = getOwnerPriorityRank(left, timeZone);
  const rightRank = getOwnerPriorityRank(right, timeZone);
  const rankDiff = leftRank - rightRank;

  if (rankDiff !== 0) {
    return rankDiff;
  }

  return compareEstimatesWithinRank(left, right, leftRank);
}

export function sortEstimatesForOwnerView(
  estimates: Estimate[],
  timeZone?: string,
): Estimate[] {
  return [...estimates].sort((left, right) =>
    compareEstimatesForOwnerView(left, right, timeZone),
  );
}
