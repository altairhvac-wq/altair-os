"use client";

import { Archive, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import type { CustomerLifecycleActionId } from "@/shared/lib/customer-lifecycle";
import type { CustomerLifecycleState } from "@/shared/types/customer";
import { customerMissionClasses as cm } from "./customer-list-presentation";

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
  /** @deprecated Mission Briefing unifies presentation; retained for call-site compatibility. */
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
      className={cm.bulkBar}
      role="region"
      aria-label="Bulk customer actions"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className={cm.bulkBarTitle}>{selectedCount} selected</p>
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isBusy}
            className={cm.bulkClearButton}
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
                className={cm.bulkSecondaryAction}
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
                className={cm.bulkDestructiveAction}
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
                className={cm.bulkPrimaryAction}
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
                className={cm.bulkDestructiveAction}
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
                className={cm.bulkPrimaryAction}
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
                className={cm.bulkDestructiveAction}
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
