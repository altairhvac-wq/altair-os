"use client";

import { Loader2, Send, X } from "lucide-react";

type EstimateBatchSelectionBarProps = {
  selectedCount: number;
  sendableCount: number;
  isSending: boolean;
  onSendSelected: () => void;
  onClearSelection: () => void;
};

export function EstimateBatchSelectionBar({
  selectedCount,
  sendableCount,
  isSending,
  onSendSelected,
  onClearSelection,
}: EstimateBatchSelectionBarProps) {
  const canSendSelected = sendableCount > 0;
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div
      className="sticky bottom-0 z-20 border-t border-cyan-200 bg-cyan-50/95 px-4 py-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur-sm sm:px-5"
      role="region"
      aria-label="Batch estimate actions"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-cyan-950">
          {selectedCount} selected
          {sendableCount > 0 && sendableCount < selectedCount
            ? ` · ${sendableCount} can be sent`
            : null}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClearSelection}
            disabled={isSending}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs font-semibold text-cyan-900 transition-colors hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear
          </button>
          <button
            type="button"
            onClick={onSendSelected}
            disabled={isSending || !canSendSelected}
            title={
              canSendSelected
                ? undefined
                : "Only draft estimates with a valid customer email can be sent."
            }
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-cyan-700 hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {isSending ? "Sending…" : "Send selected"}
          </button>
        </div>
      </div>
    </div>
  );
}
