"use client";

import { Archive, Ban, Loader2, Send, Trash2, X } from "lucide-react";
import { useConfirm } from "@/shared/design-system/dialog";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

type EstimateLifecycleActionProps = {
  eligibleCount: number;
  isPending: boolean;
  confirmMessage: string;
  onAction: () => void;
};

type EstimateBatchSelectionBarProps = {
  selectedCount: number;
  sendableCount: number;
  eligibilityHints?: string[];
  isSending: boolean;
  isLifecycleBusy?: boolean;
  onSendSelected: () => void;
  onClearSelection: () => void;
  archiveAction?: EstimateLifecycleActionProps;
  voidAction?: EstimateLifecycleActionProps;
  moveToTrashAction?: EstimateLifecycleActionProps;
  northStar?: boolean;
};

export function EstimateBatchSelectionBar({
  selectedCount,
  sendableCount,
  eligibilityHints = [],
  isSending,
  isLifecycleBusy = false,
  onSendSelected,
  onClearSelection,
  archiveAction,
  voidAction,
  moveToTrashAction,
  northStar = false,
}: EstimateBatchSelectionBarProps) {
  // Before the `selectedCount === 0` early return so hook order is stable.
  const { confirm, confirmDialog } = useConfirm();
  const isBusy = isSending || isLifecycleBusy;
  const canSendSelected = sendableCount > 0;

  if (selectedCount === 0) {
    return null;
  }

  async function confirmAndRun(
    message: string,
    action?: EstimateLifecycleActionProps,
  ) {
    if (isBusy || !action || action.eligibleCount === 0) return;
    // The action supplies one sentence of consequence copy; it becomes the
    // dialog description so the title can stay a short question.
    const confirmed = await confirm({
      title: `Apply this to ${action.eligibleCount} estimate${
        action.eligibleCount === 1 ? "" : "s"
      }?`,
      description: message,
      confirmLabel: "Continue",
      destructive: true,
    });
    if (!confirmed) return;
    action.onAction();
  }

  const hintClass = northStar
    ? "mt-1 space-y-0.5 text-xs font-medium text-[#7C7259]"
    : "mt-1 space-y-0.5 text-xs font-medium text-cyan-800/90";

  return (
    <div
      className={
        northStar
          ? lt.bulkBar
          : "sticky bottom-0 z-20 border-t border-cyan-200 bg-cyan-50/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(21,25,19,0.25)] backdrop-blur-sm sm:px-5"
      }
      role="region"
      aria-label="Batch estimate actions"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p
              className={
                northStar ? lt.bulkBarTitle : "text-sm font-bold text-cyan-950"
              }
            >
              {selectedCount} selected
            </p>
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
            className={lt.bulkClearButton}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSendSelected}
            disabled={isBusy || !canSendSelected}
            title={
              canSendSelected
                ? undefined
                : "Only draft estimates with a valid customer email can be sent."
            }
            className={lt.bulkPrimaryAction}
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isSending ? "Sending…" : "Send selected"}
          </button>

          {archiveAction ? (
            <button
              type="button"
              onClick={() =>
                confirmAndRun(archiveAction.confirmMessage, archiveAction)
              }
              disabled={isBusy || archiveAction.eligibleCount === 0}
              title={
                archiveAction.eligibleCount === 0
                  ? "None of the selected estimates can be archived."
                  : undefined
              }
              className={lt.bulkSecondaryAction}
            >
              {archiveAction.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {archiveAction.isPending ? "Archiving…" : "Archive"}
            </button>
          ) : null}

          {voidAction ? (
            <button
              type="button"
              onClick={() => confirmAndRun(voidAction.confirmMessage, voidAction)}
              disabled={isBusy || voidAction.eligibleCount === 0}
              title={
                voidAction.eligibleCount === 0
                  ? "Void sent estimates. Draft estimates should move to Recently Deleted."
                  : undefined
              }
              className={lt.bulkDestructiveAction}
            >
              {voidAction.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Ban className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {voidAction.isPending ? "Voiding…" : "Void"}
            </button>
          ) : null}

          {moveToTrashAction ? (
            <button
              type="button"
              onClick={() =>
                confirmAndRun(moveToTrashAction.confirmMessage, moveToTrashAction)
              }
              disabled={isBusy || moveToTrashAction.eligibleCount === 0}
              title={
                moveToTrashAction.eligibleCount === 0
                  ? "Only draft estimates can move to Recently Deleted."
                  : undefined
              }
              className={lt.bulkDestructiveAction}
            >
              {moveToTrashAction.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {moveToTrashAction.isPending ? "Moving…" : "Move to Trash"}
            </button>
          ) : null}
        </div>
      </div>
      {confirmDialog}
    </div>
  );
}
