"use client";

import { DesignLabEditTargetPanel } from "@/shared/components/platform-admin/design-lab/DesignLabEditTargetPanel";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

type DesignLabCanvasInspectorProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedTargetId: DesignLabEditTargetId | null;
  colors: DesignLabColors;
  onColorChange: (key: keyof DesignLabColors, value: string) => void;
};

export function DesignLabCanvasInspector({
  isOpen,
  onClose,
  selectedTargetId,
  colors,
  onColorChange,
}: DesignLabCanvasInspectorProps) {
  if (!isOpen) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] hidden sm:block">
        <p className="pointer-events-auto rounded-full border border-[rgba(23,19,14,0.1)] bg-white/95 px-3 py-1.5 text-[11px] text-[#6B6255] shadow-sm backdrop-blur-sm">
          Click an element to edit.
        </p>
      </div>
    );
  }

  return (
    <>
      <aside
        aria-label="Canvas color inspector"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] hidden w-[min(17rem,calc(100%-2rem))] sm:block"
      >
        <div className="pointer-events-auto overflow-hidden rounded-lg border border-[rgba(23,19,14,0.12)] bg-white/95 shadow-[0_8px_24px_rgba(23,19,14,0.12)] backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-[rgba(23,19,14,0.08)] px-3 py-2">
            <p className="text-xs font-semibold text-[#17130E]">Inspector</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[#6B6255] hover:bg-[#F5F0E4] hover:text-[#17130E]"
            >
              Close
            </button>
          </div>
          <div className="max-h-[min(50vh,24rem)] overflow-y-auto p-2.5">
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
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] max-h-[40vh] sm:hidden"
      >
        <div className="pointer-events-auto overflow-hidden rounded-t-lg border border-[rgba(23,19,14,0.12)] bg-white/98 shadow-[0_-6px_20px_rgba(23,19,14,0.1)]">
          <div className="flex items-center justify-between border-b border-[rgba(23,19,14,0.08)] px-3 py-2">
            <p className="text-xs font-semibold text-[#17130E]">Inspector</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-[#6B6255]"
            >
              Close
            </button>
          </div>
          <div className="max-h-[32vh] overflow-y-auto p-2.5">
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
