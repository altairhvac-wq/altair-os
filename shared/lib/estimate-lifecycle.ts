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

/** Any estimate visible in the current lifecycle tab can be bulk-selected. */
export function canSelectEstimateForBulkLifecycle(
  _estimate: Pick<Estimate, "id">,
): boolean {
  return true;
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

/** Sent estimates eligible for bulk void on Active — excludes drafts (use trash instead). */
export function canVoidEstimateBulkGuide(
  estimate: Pick<Estimate, "status" | "deletedAt" | "archivedAt">,
): boolean {
  if (!SENT_STATUSES.has(estimate.status)) {
    return false;
  }

  return canVoidEstimate(estimate);
}

export type EstimateBulkEligibilitySummary = {
  selectedCount: number;
  trashEligibleCount: number;
  voidEligibleCount: number;
  archiveEligibleCount: number;
  restoreEligibleCount: number;
  restoreFromTrashEligibleCount: number;
  permanentDeleteEligibleCount: number;
};

export function summarizeEstimateBulkEligibility(
  estimates: Estimate[],
  options?: { voidMode?: "guide" | "lifecycle" },
): EstimateBulkEligibilitySummary {
  const voidMode = options?.voidMode ?? "guide";
  let trashEligibleCount = 0;
  let voidEligibleCount = 0;
  let archiveEligibleCount = 0;
  let restoreEligibleCount = 0;
  let restoreFromTrashEligibleCount = 0;
  let permanentDeleteEligibleCount = 0;

  for (const estimate of estimates) {
    if (canMoveEstimateToTrash(estimate)) {
      trashEligibleCount += 1;
    }
    if (
      voidMode === "guide"
        ? canVoidEstimateBulkGuide(estimate)
        : canVoidEstimate(estimate)
    ) {
      voidEligibleCount += 1;
    }
    if (canArchiveEstimate(estimate)) {
      archiveEligibleCount += 1;
    }
    if (canRestoreEstimate(estimate)) {
      restoreEligibleCount += 1;
    }
    if (canRestoreEstimateFromTrash(estimate)) {
      restoreFromTrashEligibleCount += 1;
    }
    if (
      canPermanentlyDeleteEstimate(estimate, {
        linkedInvoiceCount: 0,
      })
    ) {
      permanentDeleteEligibleCount += 1;
    }
  }

  return {
    selectedCount: estimates.length,
    trashEligibleCount,
    voidEligibleCount,
    archiveEligibleCount,
    restoreEligibleCount,
    restoreFromTrashEligibleCount,
    permanentDeleteEligibleCount,
  };
}

function formatEstimateCountHint(count: number, phrase: string): string {
  return `${count} ${phrase}`;
}

export function formatEstimateBulkEligibilityHints(
  summary: EstimateBulkEligibilitySummary,
  lifecycleFilter: EstimateLifecycleState,
): string[] {
  const hints: string[] = [];

  if (lifecycleFilter === "active") {
    if (summary.trashEligibleCount > 0) {
      hints.push(formatEstimateCountHint(summary.trashEligibleCount, "can move to trash"));
    }
    if (summary.voidEligibleCount > 0) {
      hints.push(formatEstimateCountHint(summary.voidEligibleCount, "can be voided"));
    }
    if (summary.archiveEligibleCount > 0) {
      hints.push(formatEstimateCountHint(summary.archiveEligibleCount, "can be archived"));
    }
    return hints;
  }

  if (lifecycleFilter === "archived") {
    if (summary.restoreEligibleCount > 0) {
      hints.push(formatEstimateCountHint(summary.restoreEligibleCount, "can be restored"));
    }
    if (summary.voidEligibleCount > 0) {
      hints.push(formatEstimateCountHint(summary.voidEligibleCount, "can be voided"));
    }
    if (summary.trashEligibleCount > 0) {
      hints.push(formatEstimateCountHint(summary.trashEligibleCount, "can move to trash"));
    }
    return hints;
  }

  if (lifecycleFilter === "deleted") {
    if (summary.restoreFromTrashEligibleCount > 0) {
      hints.push(
        formatEstimateCountHint(
          summary.restoreFromTrashEligibleCount,
          "can be restored from Recently Deleted",
        ),
      );
    }
    if (summary.permanentDeleteEligibleCount > 0) {
      hints.push(
        formatEstimateCountHint(
          summary.permanentDeleteEligibleCount,
          "can be permanently deleted",
        ),
      );
    }
  }

  return hints;
}

function formatSkippedRecordsSuffix(skippedCount: number): string {
  if (skippedCount <= 0) {
    return "";
  }

  return ` ${skippedCount} selected estimate${
    skippedCount === 1 ? "" : "s"
  } will be skipped.`;
}

export function formatEstimateBulkActionConfirmMessage(
  actionId: EstimateLifecycleActionId,
  summary: EstimateBulkEligibilitySummary,
): string {
  const { selectedCount } = summary;

  switch (actionId) {
    case "archive": {
      const eligible = summary.archiveEligibleCount;
      return `Archive ${eligible} selected estimate${
        eligible === 1 ? "" : "s"
      }? Historical records will be preserved.${formatSkippedRecordsSuffix(
        selectedCount - eligible,
      )}`;
    }
    case "void": {
      const eligible = summary.voidEligibleCount;
      return `Void ${eligible} selected estimate${
        eligible === 1 ? "" : "s"
      }? This preserves audit history.${formatSkippedRecordsSuffix(
        selectedCount - eligible,
      )}`;
    }
    case "moveToTrash": {
      const eligible = summary.trashEligibleCount;
      return `Move ${eligible} draft estimate${
        eligible === 1 ? "" : "s"
      } to Recently Deleted? Sent estimates should be archived or voided instead.${formatSkippedRecordsSuffix(
        selectedCount - eligible,
      )}`;
    }
    case "restore": {
      const eligible = summary.restoreEligibleCount;
      return `Restore ${eligible} selected estimate${
        eligible === 1 ? "" : "s"
      } to Active?${formatSkippedRecordsSuffix(selectedCount - eligible)}`;
    }
    case "restoreFromTrash": {
      const eligible = summary.restoreFromTrashEligibleCount;
      return `Restore ${eligible} selected estimate${
        eligible === 1 ? "" : "s"
      } from Recently Deleted?${formatSkippedRecordsSuffix(selectedCount - eligible)}`;
    }
    case "permanentDelete": {
      const eligible = summary.permanentDeleteEligibleCount;
      return `Permanently delete ${eligible} selected estimate${
        eligible === 1 ? "" : "s"
      }? Records with billing or approval history will be skipped.${formatSkippedRecordsSuffix(
        selectedCount - eligible,
      )}`;
    }
    default:
      return `Update ${selectedCount} selected estimate${
        selectedCount === 1 ? "" : "s"
      }?`;
  }
}
