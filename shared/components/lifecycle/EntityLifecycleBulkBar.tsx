"use client";

import { Archive, Ban, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { useConfirm } from "@/shared/design-system/dialog";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

type EntityLifecycleBulkBarProps = {
  entityLabel: string;
  selectedCount: number;
  lifecycleFilter: string;
  eligibilityHints?: string[];
  isArchiving?: boolean;
  isRestoring?: boolean;
  isVoiding?: boolean;
  isCancelling?: boolean;
  isMovingToTrash?: boolean;
  isRestoringFromTrash?: boolean;
  isPermanentlyDeleting?: boolean;
  showArchive?: boolean;
  showRestore?: boolean;
  showVoid?: boolean;
  showCancel?: boolean;
  showMoveToTrash?: boolean;
  showRestoreFromTrash?: boolean;
  showPermanentDelete?: boolean;
  archiveEligibleCount?: number;
  restoreEligibleCount?: number;
  voidEligibleCount?: number;
  moveToTrashEligibleCount?: number;
  restoreFromTrashEligibleCount?: number;
  permanentDeleteEligibleCount?: number;
  archiveConfirmMessage?: string;
  restoreConfirmMessage?: string;
  voidConfirmMessage?: string;
  cancelConfirmMessage?: string;
  moveToTrashConfirmMessage?: string;
  restoreFromTrashConfirmMessage?: string;
  permanentDeleteConfirmMessage?: string;
  onArchive?: () => void;
  onRestore?: () => void;
  onVoid?: () => void;
  onCancel?: () => void;
  onMoveToTrash?: () => void;
  onRestoreFromTrash?: () => void;
  onPermanentDelete?: () => void;
  onClearSelection: () => void;
  northStar?: boolean;
};

export function EntityLifecycleBulkBar({
  entityLabel,
  selectedCount,
  lifecycleFilter,
  eligibilityHints = [],
  isArchiving = false,
  isRestoring = false,
  isVoiding = false,
  isCancelling = false,
  isMovingToTrash = false,
  isRestoringFromTrash = false,
  isPermanentlyDeleting = false,
  showArchive = false,
  showRestore = false,
  showVoid = false,
  showCancel = false,
  showMoveToTrash = false,
  showRestoreFromTrash = false,
  showPermanentDelete = false,
  archiveEligibleCount,
  restoreEligibleCount,
  voidEligibleCount,
  moveToTrashEligibleCount,
  restoreFromTrashEligibleCount,
  permanentDeleteEligibleCount,
  archiveConfirmMessage,
  restoreConfirmMessage,
  voidConfirmMessage,
  cancelConfirmMessage,
  moveToTrashConfirmMessage,
  restoreFromTrashConfirmMessage,
  permanentDeleteConfirmMessage,
  onArchive,
  onRestore,
  onVoid,
  onCancel,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onClearSelection,
  northStar = false,
}: EntityLifecycleBulkBarProps) {
  const { confirm, confirmDialog } = useConfirm();
  const isBusy =
    isArchiving ||
    isRestoring ||
    isVoiding ||
    isCancelling ||
    isMovingToTrash ||
    isRestoringFromTrash ||
    isPermanentlyDeleting;

  if (selectedCount === 0) {
    return null;
  }

  function isActionDisabled(eligibleCount?: number): boolean {
    return isBusy || (eligibleCount !== undefined && eligibleCount === 0);
  }

  async function confirmAndRun(
    defaultMessage: string,
    action?: () => void,
    confirmMessage?: string,
    eligibleCount?: number,
  ) {
    if (isActionDisabled(eligibleCount) || !action) return;
    const ok = await confirm({
      title: confirmMessage ?? defaultMessage,
      confirmLabel: "Continue",
      destructive: true,
    });
    if (!ok) return;
    action();
  }

  const plural = selectedCount === 1 ? entityLabel : `${entityLabel}s`;

  const shellClass = northStar
    ? lt.bulkBar
    : "sticky bottom-0 z-20 border-t border-altair-border bg-altair-paper/95 px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(6,7,5,0.12)] backdrop-blur-sm sm:px-4";
  const titleClass = northStar
    ? lt.bulkBarTitle
    : "text-sm font-semibold text-altair-ink-on-paper";
  const hintClass = northStar
    ? "mt-1 space-y-0.5 text-xs font-medium text-[#6B6255]"
    : "mt-1 space-y-0.5 text-xs font-medium text-altair-ink-on-paper-secondary";
  const clearClass = northStar
    ? lt.bulkClearButton
    : "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-altair-border bg-altair-paper-elevated px-3 py-1.5 text-xs font-semibold text-altair-ink-on-paper-secondary transition-colors hover:border-altair-brass/40 hover:bg-altair-brass/5 disabled:cursor-not-allowed disabled:opacity-60";
  const secondaryActionClass = northStar
    ? lt.bulkSecondaryAction
    : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-altair-border bg-altair-paper-elevated px-3 py-2 text-xs font-semibold text-altair-ink-on-paper transition-colors hover:bg-altair-paper-subtle disabled:cursor-not-allowed disabled:opacity-60";
  const primaryActionClass = northStar
    ? lt.bulkPrimaryAction
    : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-altair-graphite bg-altair-graphite px-3 py-2 text-xs font-semibold text-altair-paper transition-colors hover:border-altair-brass-interactive disabled:cursor-not-allowed disabled:opacity-60";
  const destructiveActionClass = northStar
    ? lt.bulkDestructiveAction
    : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-altair-danger/30 bg-altair-danger-surface px-3 py-2 text-xs font-semibold text-altair-danger-foreground transition-colors hover:border-altair-danger/50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div
      className={`sticky bottom-0 z-20 ${shellClass}`}
      role="region"
      aria-label={`Bulk ${entityLabel} lifecycle actions`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className={titleClass}>{selectedCount} selected</p>
            {eligibilityHints.length > 0 ? (
              <ul className={hintClass}>
                {eligibilityHints.map((hint) => (
                  <li key={hint}>{hint}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isBusy}
            className={clearClass}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear selection
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {showArchive ? (
            <button
              type="button"
              onClick={() =>
                confirmAndRun(
                  `Archive ${selectedCount} selected ${plural}? Historical records will be preserved.`,
                  onArchive,
                  archiveConfirmMessage,
                  archiveEligibleCount,
                )
              }
              disabled={isActionDisabled(archiveEligibleCount)}
              className={secondaryActionClass}
            >
              {isArchiving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isArchiving ? "Archiving…" : "Archive"}
            </button>
          ) : null}

          {showCancel ? (
            <button
              type="button"
              onClick={() =>
                confirmAndRun(
                  `Cancel ${selectedCount} selected ${plural}?`,
                  onCancel,
                  cancelConfirmMessage,
                )
              }
              disabled={isBusy}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isCancelling ? "Cancelling…" : "Cancel"}
            </button>
          ) : null}

          {showVoid ? (
            <button
              type="button"
              onClick={() =>
                confirmAndRun(
                  `Void ${selectedCount} selected ${plural}? This preserves audit history.`,
                  onVoid,
                  voidConfirmMessage,
                  voidEligibleCount,
                )
              }
              disabled={isActionDisabled(voidEligibleCount)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isVoiding ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isVoiding ? "Voiding…" : "Void"}
            </button>
          ) : null}

          {showMoveToTrash ? (
            <button
              type="button"
              onClick={() =>
                confirmAndRun(
                  `Move ${selectedCount} selected ${plural} to Recently Deleted?`,
                  onMoveToTrash,
                  moveToTrashConfirmMessage,
                  moveToTrashEligibleCount,
                )
              }
              disabled={isActionDisabled(moveToTrashEligibleCount)}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMovingToTrash ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isMovingToTrash ? "Moving…" : "Move to Trash"}
            </button>
          ) : null}

          {showRestore ? (
            <button
              type="button"
              onClick={async () => {
                if (isActionDisabled(restoreEligibleCount) || !onRestore) return;
                if (
                  restoreConfirmMessage &&
                  !(await confirm({
                    title: restoreConfirmMessage,
                    confirmLabel: "Restore",
                  }))
                ) {
                  return;
                }
                onRestore();
              }}
              disabled={isActionDisabled(restoreEligibleCount)}
              className={primaryActionClass}
            >
              {isRestoring ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isRestoring ? "Restoring…" : "Restore"}
            </button>
          ) : null}

          {showRestoreFromTrash ? (
            <button
              type="button"
              onClick={async () => {
                if (isActionDisabled(restoreFromTrashEligibleCount) || !onRestoreFromTrash) {
                  return;
                }
                if (
                  restoreFromTrashConfirmMessage &&
                  !(await confirm({
                    title: restoreFromTrashConfirmMessage,
                    confirmLabel: "Restore",
                  }))
                ) {
                  return;
                }
                onRestoreFromTrash();
              }}
              disabled={isActionDisabled(restoreFromTrashEligibleCount)}
              className={primaryActionClass}
            >
              {isRestoringFromTrash ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isRestoringFromTrash ? "Restoring…" : "Restore"}
            </button>
          ) : null}

          {showPermanentDelete ? (
            <button
              type="button"
              onClick={() =>
                confirmAndRun(
                  `Permanently delete ${selectedCount} selected ${plural}? Records with history will be skipped.`,
                  onPermanentDelete,
                  permanentDeleteConfirmMessage,
                  permanentDeleteEligibleCount,
                )
              }
              disabled={isActionDisabled(permanentDeleteEligibleCount)}
              className={destructiveActionClass}
            >
              {isPermanentlyDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {isPermanentlyDeleting ? "Deleting…" : "Permanently Delete"}
            </button>
          ) : null}
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}
