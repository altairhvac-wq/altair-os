"use client";

import { Archive, Ban, Loader2, RotateCcw, Trash2, X } from "lucide-react";

type EntityLifecycleBulkBarProps = {
  entityLabel: string;
  selectedCount: number;
  lifecycleFilter: string;
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
  onArchive?: () => void;
  onRestore?: () => void;
  onVoid?: () => void;
  onCancel?: () => void;
  onMoveToTrash?: () => void;
  onRestoreFromTrash?: () => void;
  onPermanentDelete?: () => void;
  onClearSelection: () => void;
};

export function EntityLifecycleBulkBar({
  entityLabel,
  selectedCount,
  lifecycleFilter,
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
  onArchive,
  onRestore,
  onVoid,
  onCancel,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onClearSelection,
}: EntityLifecycleBulkBarProps) {
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

  function confirmAndRun(
    message: string,
    action?: () => void,
  ) {
    if (isBusy || !action) return;
    if (!window.confirm(message)) return;
    action();
  }

  const plural = selectedCount === 1 ? entityLabel : `${entityLabel}s`;

  return (
    <div
      className="sticky bottom-0 z-20 border-t border-cyan-200 bg-cyan-50/95 px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur-sm sm:px-4"
      role="region"
      aria-label={`Bulk ${entityLabel} lifecycle actions`}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-cyan-950">
            {selectedCount} selected
          </p>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isBusy}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-900 transition-colors hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                )
              }
              disabled={isBusy}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                )
              }
              disabled={isBusy}
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
                )
              }
              disabled={isBusy}
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
              onClick={onRestore}
              disabled={isBusy}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-cyan-700 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
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
              onClick={onRestoreFromTrash}
              disabled={isBusy}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-cyan-700 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
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
                )
              }
              disabled={isBusy}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
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
    </div>
  );
}
