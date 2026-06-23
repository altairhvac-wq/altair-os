"use client";

import { DesignLabEditTargetPanel } from "@/shared/components/platform-admin/design-lab/DesignLabEditTargetPanel";
import {
  getDesignLabEditTarget,
  type DesignLabEditTargetId,
} from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

type DesignLabCanvasInspectorProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  selectedTargetId: DesignLabEditTargetId | null;
  colors: DesignLabColors;
  onColorChange: (key: keyof DesignLabColors, value: string) => void;
};

export function DesignLabCanvasInspector({
  isOpen,
  onOpen,
  onClose,
  selectedTargetId,
  colors,
  onColorChange,
}: DesignLabCanvasInspectorProps) {
  const selectedTarget = selectedTargetId
    ? getDesignLabEditTarget(selectedTargetId)
    : undefined;

  if (!isOpen) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex max-w-[min(100%-2rem,14rem)] flex-col items-end gap-1.5">
        <button
          type="button"
          onClick={onOpen}
          className="pointer-events-auto rounded-lg border border-[rgba(23,19,14,0.12)] bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#17130E] shadow-[0_4px_16px_rgba(23,19,14,0.12)] backdrop-blur-sm transition-colors hover:bg-[#FFF9EA]"
        >
          Inspector
        </button>
        {selectedTarget ? (
          <p className="pointer-events-none truncate rounded-full border border-[rgba(23,19,14,0.1)] bg-white/90 px-2.5 py-0.5 text-[10px] text-[#17130E] shadow-sm backdrop-blur-sm">
            {selectedTarget.label}
          </p>
        ) : (
          <p className="pointer-events-none hidden rounded-full border border-[rgba(23,19,14,0.1)] bg-white/90 px-2.5 py-0.5 text-[10px] text-[#6B6255] shadow-sm backdrop-blur-sm sm:block">
            Click an element to edit.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <aside
        aria-label="Canvas color inspector"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] hidden w-[min(13rem,calc(100%-2rem))] sm:block"
      >
        <div className="pointer-events-auto overflow-hidden rounded-lg border border-[rgba(23,19,14,0.12)] bg-white/95 shadow-[0_6px_20px_rgba(23,19,14,0.12)] backdrop-blur-sm">
          <div className="flex items-center justify-between gap-2 border-b border-[rgba(23,19,14,0.08)] px-2.5 py-1.5">
            <p className="truncate text-[11px] font-semibold text-[#17130E]">Inspector</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Minimize inspector"
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-[#6B6255] hover:bg-[#F5F0E4] hover:text-[#17130E]"
            >
              Minimize
            </button>
          </div>
          <div className="max-h-[min(36vh,16rem)] overflow-y-auto p-2">
            <DesignLabEditTargetPanel
              selectedTargetId={selectedTargetId}
              colors={colors}
              onColorChange={onColorChange}
              variant="compact"
              emptyStateText="Click an element to edit."
            />
          </div>
        </div>
      </aside>

      <aside
        aria-label="Canvas color inspector"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] max-h-[32vh] sm:hidden"
      >
        <div className="pointer-events-auto overflow-hidden rounded-t-lg border border-[rgba(23,19,14,0.12)] bg-white/98 shadow-[0_-6px_20px_rgba(23,19,14,0.1)]">
          <div className="flex items-center justify-between gap-2 border-b border-[rgba(23,19,14,0.08)] px-2.5 py-1.5">
            <p className="text-[11px] font-semibold text-[#17130E]">Inspector</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Minimize inspector"
              className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#6B6255]"
            >
              Minimize
            </button>
          </div>
          <div className="max-h-[24vh] overflow-y-auto p-2">
            <DesignLabEditTargetPanel
              selectedTargetId={selectedTargetId}
              colors={colors}
              onColorChange={onColorChange}
              variant="compact"
              emptyStateText="Click an element to edit."
            />
          </div>
        </div>
      </aside>
    </>
  );
}
