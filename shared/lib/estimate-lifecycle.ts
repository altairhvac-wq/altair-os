import type { Estimate, EstimateStatus } from "@/shared/types/estimate";

export type EstimateDeleteDependencies = {
  linkedInvoiceCount: number;
};

export type EstimateLifecycleActionId =
  | "archive"
  | "restore"
  | "void"
  | "moveToTrash"
  | "restoreFromTrash"
  | "permanentDelete";

export type EstimateLifecycleState = "active" | "archived" | "deleted";

const SENT_STATUSES = new Set<EstimateStatus>(["sent", "approved", "declined"]);
const LOCKED_STATUSES = new Set<EstimateStatus>(["approved", "converted"]);

export const ESTIMATE_TRASH_BLOCKED_MESSAGE =
  "Only draft estimates can move to Recently Deleted. Archive or void sent estimates instead.";

export const ESTIMATE_PERMANENT_DELETE_BLOCKED_MESSAGE =
  "This estimate is linked to billing or customer history and cannot be permanently deleted.";

export function isEstimateDeleted(
  estimate: Pick<Estimate, "deletedAt">,
): boolean {
  return Boolean(estimate.deletedAt);
}

export function isEstimateArchived(
  estimate: Pick<Estimate, "archivedAt">,
): boolean {
  return Boolean(estimate.archivedAt);
}

export function getEstimateLifecycleState(
  estimate: Pick<Estimate, "archivedAt" | "deletedAt">,
): EstimateLifecycleState {
  if (isEstimateDeleted(estimate)) return "deleted";
  if (isEstimateArchived(estimate)) return "archived";
  return "active";
}

export function getArchiveEstimateBlockReason(
  estimate: Pick<Estimate, "archivedAt" | "deletedAt" | "status">,
): string | null {
  if (isEstimateDeleted(estimate)) {
    return "This estimate is in Recently Deleted. Restore it first.";
  }
  if (isEstimateArchived(estimate)) {
    return "This estimate is already archived.";
  }
  if (estimate.status === "converted") {
    return "Converted estimates cannot be archived.";
  }
  return null;
}

export function canArchiveEstimate(
  estimate: Pick<Estimate, "archivedAt" | "deletedAt" | "status">,
): boolean {
  return getArchiveEstimateBlockReason(estimate) === null;
}

export function getRestoreEstimateBlockReason(
  estimate: Pick<Estimate, "archivedAt" | "deletedAt">,
): string | null {
  if (isEstimateDeleted(estimate)) {
    return "This estimate is in Recently Deleted. Use restore from Recently Deleted.";
  }
  if (!isEstimateArchived(estimate)) {
    return "This estimate is not archived.";
  }
  return null;
}

export function canRestoreEstimate(
  estimate: Pick<Estimate, "archivedAt" | "deletedAt">,
): boolean {
  return getRestoreEstimateBlockReason(estimate) === null;
}

export function getVoidEstimateBlockReason(
  estimate: Pick<Estimate, "status" | "deletedAt" | "archivedAt">,
): string | null {
  if (isEstimateDeleted(estimate)) {
    return "This estimate is in Recently Deleted. Restore it first.";
  }
  if (estimate.status === "cancelled") {
    return "This estimate is already voided.";
  }
  if (estimate.status === "draft") {
    return "Draft estimates should be moved to Recently Deleted instead of voided.";
  }
  if (estimate.status === "converted") {
    return "Converted estimates cannot be voided.";
  }
  if (!SENT_STATUSES.has(estimate.status)) {
    return "This estimate cannot be voided in its current status.";
  }
  return null;
}

export function canVoidEstimate(
  estimate: Pick<Estimate, "status" | "deletedAt" | "archivedAt">,
): boolean {
  return getVoidEstimateBlockReason(estimate) === null;
}

export function getMoveEstimateToTrashBlockReason(
  estimate: Pick<Estimate, "status" | "deletedAt">,
): string | null {
  if (isEstimateDeleted(estimate)) {
    return "This estimate is already in Recently Deleted.";
  }
  if (estimate.status !== "draft") {
    return ESTIMATE_TRASH_BLOCKED_MESSAGE;
  }
  return null;
}

export function canMoveEstimateToTrash(
  estimate: Pick<Estimate, "status" | "deletedAt">,
): boolean {
  return getMoveEstimateToTrashBlockReason(estimate) === null;
}

export function getRestoreEstimateFromTrashBlockReason(
  estimate: Pick<Estimate, "deletedAt">,
): string | null {
  if (!isEstimateDeleted(estimate)) {
    return "This estimate is not in Recently Deleted.";
  }
  return null;
}

export function canRestoreEstimateFromTrash(
  estimate: Pick<Estimate, "deletedAt">,
): boolean {
  return getRestoreEstimateFromTrashBlockReason(estimate) === null;
}

export function getPermanentDeleteEstimateBlockReason(
  estimate: Pick<Estimate, "deletedAt" | "status">,
  dependencies: EstimateDeleteDependencies,
): string | null {
  if (!isEstimateDeleted(estimate)) {
    return "Move this estimate to Recently Deleted before permanently deleting.";
  }
  if (estimate.status !== "draft") {
    return ESTIMATE_PERMANENT_DELETE_BLOCKED_MESSAGE;
  }
  if (LOCKED_STATUSES.has(estimate.status) || dependencies.linkedInvoiceCount > 0) {
    return ESTIMATE_PERMANENT_DELETE_BLOCKED_MESSAGE;
  }
  return null;
}

export function canPermanentlyDeleteEstimate(
  estimate: Pick<Estimate, "deletedAt" | "status">,
  dependencies: EstimateDeleteDependencies,
): boolean {
  return getPermanentDeleteEstimateBlockReason(estimate, dependencies) === null;
}

export function formatBulkEstimatesResultMessage(input: {
  successCount: number;
  failureCount: number;
  actionLabel: string;
}): string {
  const { successCount, failureCount, actionLabel } = input;

  if (successCount === 0 && failureCount === 0) {
    return "No estimates were updated.";
  }

  if (failureCount === 0) {
    return `${actionLabel} applied to ${successCount} estimate${
      successCount === 1 ? "" : "s"
    }.`;
  }

  if (successCount === 0) {
    return `${failureCount} estimate${failureCount === 1 ? "" : "s"} could not be updated.`;
  }

  return `${actionLabel} applied to ${successCount} estimate${
    successCount === 1 ? "" : "s"
  }. ${failureCount} could not be updated.`;
}

export function isBulkEstimateActionDestructive(
  actionId: EstimateLifecycleActionId,
): boolean {
  return actionId === "permanentDelete";
}

export function resolveBulkEstimateLifecycleActions(
  lifecycleFilter: EstimateLifecycleState,
): EstimateLifecycleActionId[] {
  if (lifecycleFilter === "archived") {
    return ["restore", "void", "moveToTrash"];
  }
  if (lifecycleFilter === "deleted") {
    return ["restoreFromTrash", "permanentDelete"];
  }
  return ["archive", "void", "moveToTrash"];
}
