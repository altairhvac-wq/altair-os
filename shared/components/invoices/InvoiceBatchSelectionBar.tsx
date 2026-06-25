"use client";

import { Archive, Ban, Loader2, Send, Trash2, X } from "lucide-react";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

type InvoiceLifecycleActionProps = {
  eligibleCount: number;
  isPending: boolean;
  confirmMessage: string;
  onAction: () => void;
};

type InvoiceBatchSelectionBarProps = {
  selectedCount: number;
  sendableCount: number;
  eligibilityHints?: string[];
  isSending: boolean;
  isLifecycleBusy?: boolean;
  onSendSelected: () => void;
  onClearSelection: () => void;
  archiveAction?: InvoiceLifecycleActionProps;
  voidAction?: InvoiceLifecycleActionProps;
  moveToTrashAction?: InvoiceLifecycleActionProps;
  northStar?: boolean;
};

export function InvoiceBatchSelectionBar({
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
}: InvoiceBatchSelectionBarProps) {
  const isBusy = isSending || isLifecycleBusy;
  const canSendSelected = sendableCount > 0;

  if (selectedCount === 0) {
    return null;
  }

  function confirmAndRun(
    message: string,
    action?: InvoiceLifecycleActionProps,
  ) {
    if (isBusy || !action || action.eligibleCount === 0) return;
    if (!window.confirm(message)) return;
    action.onAction();
  }

  const hintClass = northStar
    ? "mt-1 space-y-0.5 text-xs font-medium text-[#64748B]"
    : "mt-1 space-y-0.5 text-xs font-medium text-cyan-800/90";

  return (
    <div
      className={
        northStar
          ? lt.bulkBar
          : "sticky bottom-0 z-20 border-t border-cyan-200 bg-cyan-50/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur-sm sm:px-5"
      }
      role="region"
      aria-label="Batch invoice actions"
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
            className={
              northStar
                ? lt.bulkClearButton
                : "inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 self-start rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-900 transition-colors hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9"
            }
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
                : "Only draft invoices with a valid customer email can be sent."
            }
            className={
              northStar
                ? lt.bulkPrimaryAction
                : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-cyan-700 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9"
            }
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
                  ? "None of the selected invoices can be archived."
                  : undefined
              }
              className={
                northStar
                  ? lt.bulkSecondaryAction
                  : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9"
              }
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
                  ? "Void sent or unpaid invoices. Draft invoices should move to Recently Deleted."
                  : undefined
              }
              className={
                northStar
                  ? lt.bulkDestructiveAction
                  : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9"
              }
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
                  ? "Only draft invoices can move to Recently Deleted."
                  : undefined
              }
              className={
                northStar
                  ? lt.bulkDestructiveAction
                  : "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-900 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9"
              }
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
    </div>
  );
}
