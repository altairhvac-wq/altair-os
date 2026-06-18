"use client";

import { Archive, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import type { CustomerLifecycleActionId } from "@/shared/lib/customer-lifecycle";
import type { CustomerLifecycleState } from "@/shared/types/customer";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

type CustomersBulkActionBarProps = {
  selectedCount: number;
  lifecycleFilter: CustomerLifecycleState;
  isArchiving: boolean;
  isRestoring: boolean;
  isMovingToTrash: boolean;
  isRestoringFromTrash: boolean;
  isPermanentlyDeleting: boolean;
  onArchive: () => void;
  onRestore: () => void;
  onMoveToTrash: () => void;
  onRestoreFromTrash: () => void;
  onPermanentDelete: () => void;
  onClearSelection: () => void;
  northStar?: boolean;
};

const ACTION_LABELS: Record<CustomerLifecycleActionId, string> = {
  archive: "Archive",
  restore: "Restore",
  moveToTrash: "Move to Trash",
  restoreFromTrash: "Restore",
  permanentDelete: "Permanently Delete",
};

export function CustomersBulkActionBar({
  selectedCount,
  lifecycleFilter,
  isArchiving,
  isRestoring,
  isMovingToTrash,
  isRestoringFromTrash,
  isPermanentlyDeleting,
  onArchive,
  onRestore,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onClearSelection,
  northStar = false,
}: CustomersBulkActionBarProps) {
  const isBusy =
    isArchiving ||
    isRestoring ||
    isMovingToTrash ||
    isRestoringFromTrash ||
    isPermanentlyDeleting;

  if (selectedCount === 0) {
    return null;
  }

  function handleMoveToTrashClick() {
    if (isBusy) {
      return;
    }

    const confirmed = window.confirm(
      `Move ${selectedCount} selected customer${
        selectedCount === 1 ? "" : "s"
      } to Recently Deleted? They will be hidden from customer lists for 60 days.`,
    );

    if (!confirmed) {
      return;
    }

    onMoveToTrash();
  }

  function handleArchiveClick() {
    if (isBusy) {
      return;
    }

    const confirmed = window.confirm(
      `Archive ${selectedCount} selected customer${
        selectedCount === 1 ? "" : "s"
      }? They will be hidden from active lists, but historical records will be preserved.`,
    );

    if (!confirmed) {
      return;
    }

    onArchive();
  }

  function handlePermanentDeleteClick() {
    if (isBusy) {
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${selectedCount} selected customer${
        selectedCount === 1 ? "" : "s"
      }? This cannot be undone. Customers with historical records will be skipped.`,
    );

    if (!confirmed) {
      return;
    }

    onPermanentDelete();
  }

  return (
    <div
      className={
        northStar
          ? lt.bulkBar
          : "sticky bottom-0 z-20 border-t border-cyan-200 bg-cyan-50/95 px-3 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur-sm sm:px-4"
      }
      role="region"
      aria-label="Bulk customer actions"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p
            className={
              northStar
                ? lt.bulkBarTitle
                : "text-sm font-bold text-cyan-950"
            }
          >
            {selectedCount} selected
          </p>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isBusy}
            className={
              northStar
                ? lt.bulkClearButton
                : "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-xs font-semibold text-cyan-900 transition-colors hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
            }
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear selection
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {lifecycleFilter === "active" ? (
            <>
              <button
                type="button"
                onClick={handleArchiveClick}
                disabled={isBusy}
                className={
                  northStar
                    ? lt.bulkSecondaryAction
                    : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                }
              >
                {isArchiving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isArchiving ? "Archiving…" : ACTION_LABELS.archive}
              </button>
              <button
                type="button"
                onClick={handleMoveToTrashClick}
                disabled={isBusy}
                className={
                  northStar
                    ? lt.bulkDestructiveAction
                    : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                }
              >
                {isMovingToTrash ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isMovingToTrash ? "Moving…" : ACTION_LABELS.moveToTrash}
              </button>
            </>
          ) : null}

          {lifecycleFilter === "archived" ? (
            <>
              <button
                type="button"
                onClick={onRestore}
                disabled={isBusy}
                className={
                  northStar
                    ? lt.bulkPrimaryAction
                    : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-cyan-700 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                }
              >
                {isRestoring ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isRestoring ? "Restoring…" : ACTION_LABELS.restore}
              </button>
              <button
                type="button"
                onClick={handleMoveToTrashClick}
                disabled={isBusy}
                className={
                  northStar
                    ? lt.bulkDestructiveAction
                    : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                }
              >
                {isMovingToTrash ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isMovingToTrash ? "Moving…" : ACTION_LABELS.moveToTrash}
              </button>
            </>
          ) : null}

          {lifecycleFilter === "deleted" ? (
            <>
              <button
                type="button"
                onClick={onRestoreFromTrash}
                disabled={isBusy}
                className={
                  northStar
                    ? lt.bulkPrimaryAction
                    : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-cyan-700 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
                }
              >
                {isRestoringFromTrash ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isRestoringFromTrash ? "Restoring…" : ACTION_LABELS.restoreFromTrash}
              </button>
              <button
                type="button"
                onClick={handlePermanentDeleteClick}
                disabled={isBusy}
                className={
                  northStar
                    ? lt.bulkDestructiveAction
                    : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                }
              >
                {isPermanentlyDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isPermanentlyDeleting
                  ? "Deleting…"
                  : ACTION_LABELS.permanentDelete}
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
