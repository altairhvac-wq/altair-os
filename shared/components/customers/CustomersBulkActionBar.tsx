"use client";

import { Archive, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { useConfirm } from "@/shared/design-system/dialog";
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
  // Declared before the `selectedCount === 0` early return — hook order
  // must not depend on whether anything is selected.
  const { confirm, confirmDialog } = useConfirm();
  const isBusy =
    isArchiving ||
    isRestoring ||
    isMovingToTrash ||
    isRestoringFromTrash ||
    isPermanentlyDeleting;

  if (selectedCount === 0) {
    return null;
  }

  async function handleMoveToTrashClick() {
    if (isBusy) {
      return;
    }

    const confirmed = await confirm({
      title: `Move ${selectedCount} customer${
        selectedCount === 1 ? "" : "s"
      } to Recently Deleted?`,
      description:
        "They will be hidden from customer lists for 60 days, then permanently removed.",
      confirmLabel: "Move to Trash",
      destructive: true,
      icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
    });

    if (!confirmed) {
      return;
    }

    onMoveToTrash();
  }

  async function handleArchiveClick() {
    if (isBusy) {
      return;
    }

    const confirmed = await confirm({
      title: `Archive ${selectedCount} customer${
        selectedCount === 1 ? "" : "s"
      }?`,
      description:
        "They will be hidden from active lists. Historical records are preserved.",
      confirmLabel: "Archive",
      icon: <Archive className="h-4 w-4" aria-hidden="true" />,
    });

    if (!confirmed) {
      return;
    }

    onArchive();
  }

  async function handlePermanentDeleteClick() {
    if (isBusy) {
      return;
    }

    const confirmed = await confirm({
      title: `Permanently delete ${selectedCount} customer${
        selectedCount === 1 ? "" : "s"
      }?`,
      description:
        "This cannot be undone. Customers with historical records will be skipped.",
      confirmLabel: "Delete permanently",
      destructive: true,
      icon: <Trash2 className="h-4 w-4" aria-hidden="true" />,
    });

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
      {confirmDialog}
    </div>
  );
}
