"use client";

import type { ContrastOverallStatus } from "@/shared/components/platform-admin/design-lab/design-lab-contrast";
import { getOverallStatusLabel } from "@/shared/components/platform-admin/design-lab/design-lab-contrast";

export type DesignLabCanvasTarget = "dashboard-replica" | "workspace-demo";

type DesignLabCanvasToolbarProps = {
  canvasTarget: DesignLabCanvasTarget;
  onCanvasTargetChange: (target: DesignLabCanvasTarget) => void;
  activePresetName: string | null;
  readabilityStatus: ContrastOverallStatus;
  inspectorOpen: boolean;
  onInspectorToggle: () => void;
  onBack: () => void;
  onReset: () => void;
  onExport: () => void;
  exportState: "idle" | "success" | "error";
};

const READABILITY_LABELS: Record<ContrastOverallStatus, string> = {
  "all-good": "Readable",
  "needs-review": "Review contrast",
  "poor-detected": "Poor contrast",
};

const READABILITY_STYLES: Record<ContrastOverallStatus, string> = {
  "all-good": "bg-emerald-50 text-emerald-800 ring-emerald-200",
  "needs-review": "bg-amber-50 text-amber-900 ring-amber-200",
  "poor-detected": "bg-red-50 text-red-800 ring-red-200",
};

export function DesignLabCanvasToolbar({
  canvasTarget,
  onCanvasTargetChange,
  activePresetName,
  readabilityStatus,
  inspectorOpen,
  onInspectorToggle,
  onBack,
  onReset,
  onExport,
  exportState,
}: DesignLabCanvasToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-[rgba(23,19,14,0.08)] bg-white/95 px-3 py-2 backdrop-blur-sm sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-[rgba(23,19,14,0.1)] px-2.5 py-1 text-xs font-medium text-[#17130E] transition-colors hover:bg-[#F5F0E4]"
        >
          Back to controls
        </button>

        <label className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-[#6B6255]">
            Canvas
          </span>
          <select
            value={canvasTarget}
            onChange={(event) =>
              onCanvasTargetChange(event.target.value as DesignLabCanvasTarget)
            }
            className="rounded-md border border-[rgba(23,19,14,0.1)] bg-white px-2 py-1 text-xs font-medium text-[#17130E] outline-none focus:border-[#B8943F] focus:ring-1 focus:ring-[#B8943F]/30"
            aria-label="Canvas target"
          >
            <option value="dashboard-replica">Dashboard shell</option>
            <option value="workspace-demo">Workspace demo</option>
          </select>
        </label>

        <span className="hidden rounded-md bg-[#F5F0E4] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#6B6255] sm:inline">
          Tool: Select / Edit
        </span>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
        {activePresetName ? (
          <span className="max-w-[10rem] truncate text-[11px] text-[#6B6255] sm:max-w-none">
            Preset: <span className="font-medium text-[#17130E]">{activePresetName}</span>
          </span>
        ) : (
          <span className="text-[11px] text-[#6B6255]">Custom palette</span>
        )}

        <span
          className={[
            "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset",
            READABILITY_STYLES[readabilityStatus],
          ].join(" ")}
          title={getOverallStatusLabel(readabilityStatus)}
        >
          {READABILITY_LABELS[readabilityStatus]}
        </span>

        <button
          type="button"
          onClick={onExport}
          className="rounded-md border border-[rgba(23,19,14,0.1)] px-2.5 py-1 text-xs font-medium text-[#17130E] transition-colors hover:bg-[#F5F0E4]"
        >
          {exportState === "success"
            ? "Copied"
            : exportState === "error"
              ? "Copy failed"
              : "Export"}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-[rgba(23,19,14,0.1)] px-2.5 py-1 text-xs font-medium text-[#6B6255] transition-colors hover:bg-[#F5F0E4] hover:text-[#17130E]"
        >
          Reset
        </button>

        <button
          type="button"
          onClick={onInspectorToggle}
          aria-pressed={inspectorOpen}
          className={[
            "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
            inspectorOpen
              ? "border-[#B8943F] bg-[#FFF3D6] text-[#17130E]"
              : "border-[rgba(23,19,14,0.1)] text-[#17130E] hover:bg-[#F5F0E4]",
          ].join(" ")}
        >
          Inspector
        </button>
      </div>
    </div>
  );
}
