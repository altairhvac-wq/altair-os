"use client";

import { DesignLabDimensionControl } from "@/shared/components/platform-admin/design-lab/DesignLabDimensionControl";
import { DesignLabEditTargetPanel } from "@/shared/components/platform-admin/design-lab/DesignLabEditTargetPanel";
import { DesignLabSurfaceInspectorPanel } from "@/shared/components/platform-admin/design-lab/DesignLabSurfaceInspectorPanel";
import {
  getCanvasSelectionLabel,
  type DesignLabCanvasSelection,
} from "@/shared/components/platform-admin/design-lab/design-lab-canvas-selection";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  DESIGN_LAB_DIMENSION_DEFS,
  type DesignLabDimensionKey,
  type DesignLabDimensions,
} from "@/shared/components/platform-admin/design-lab/design-lab-dimensions";
import {
  resolveSurfaceStyle,
  type DashboardSurfaceId,
  type DashboardSurfaceOverrides,
  type DashboardSurfaceStyle,
} from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import type {
  DesignLabShine,
  DesignLabShineMap,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";

type DesignLabCanvasInspectorProps = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  selection: DesignLabCanvasSelection | null;
  colors: DesignLabColors;
  shines?: DesignLabShineMap;
  dimensions: DesignLabDimensions;
  surfaceOverrides: DashboardSurfaceOverrides;
  onColorChange: (key: keyof DesignLabColors, value: string) => void;
  onShineChange?: (
    key: keyof DesignLabColors,
    shine: DesignLabShine | null,
  ) => void;
  onDimensionChange: (key: DesignLabDimensionKey, value: string) => void;
  onSurfaceStyleChange: (
    surfaceId: DashboardSurfaceId,
    field: keyof DashboardSurfaceStyle,
    value: string,
  ) => void;
};

export function DesignLabCanvasInspector({
  isOpen,
  onOpen,
  onClose,
  selection,
  colors,
  shines = {},
  dimensions,
  surfaceOverrides,
  onColorChange,
  onShineChange,
  onDimensionChange,
  onSurfaceStyleChange,
}: DesignLabCanvasInspectorProps) {
  const selectionLabel = getCanvasSelectionLabel(selection);
  const selectedTargetId: DesignLabEditTargetId | null =
    selection?.kind === "global" ? selection.targetId : null;

  const selectionBody =
    selection?.kind === "surface" ? (
      <DesignLabSurfaceInspectorPanel
        surfaceId={selection.surfaceId}
        style={resolveSurfaceStyle(selection.surfaceId, colors, surfaceOverrides)}
        onChange={(field, value) =>
          onSurfaceStyleChange(selection.surfaceId, field, value)
        }
      />
    ) : (
      <DesignLabEditTargetPanel
        selectedTargetId={selectedTargetId}
        colors={colors}
        shines={shines}
        onColorChange={onColorChange}
        onShineChange={onShineChange}
        variant="compact"
        emptyStateText="Click an element to edit its colors."
      />
    );

  if (!isOpen) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-3 pb-3">
        <button
          type="button"
          onClick={onOpen}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-[rgba(23,19,14,0.12)] bg-white/95 px-3.5 py-1.5 text-[11px] font-semibold text-[#17130E] shadow-[0_4px_16px_rgba(23,19,14,0.12)] backdrop-blur-sm transition-colors hover:bg-[#FFF9EA]"
        >
          Inspector
          {selectionLabel ? (
            <span className="max-w-[14rem] truncate font-medium text-[#6B6255]">
              · {selectionLabel}
            </span>
          ) : null}
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Canvas color inspector"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60]"
    >
      <div className="pointer-events-auto border-t border-[rgba(23,19,14,0.12)] bg-white/98 shadow-[0_-8px_28px_rgba(23,19,14,0.12)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-3 py-2.5 sm:px-4 lg:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A6324]">
                Inspector
              </p>
              <p className="truncate text-sm font-semibold text-[#17130E]">
                {selectionLabel ?? "No selection — click a card or chrome region"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Minimize inspector"
              className="shrink-0 rounded-md px-2 py-1 text-[11px] font-medium text-[#6B6255] hover:bg-[#F5F0E4] hover:text-[#17130E]"
            >
              Minimize
            </button>
          </div>

          <div className="grid max-h-[min(38vh,22rem)] gap-3 overflow-y-auto pb-1 lg:grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] lg:items-start">
            <section className="rounded-lg border border-[rgba(23,19,14,0.08)] bg-[#FBF7EF]/70 px-3 py-2.5">
              <p className="text-xs font-semibold text-[#17130E]">Shape</p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#6B6255]">
                Corner radius — the lever for less boxy cards and panels.
              </p>
              <div className="mt-2 space-y-2.5">
                {DESIGN_LAB_DIMENSION_DEFS.map((def) => (
                  <DesignLabDimensionControl
                    key={def.key}
                    dimensionKey={def.key}
                    value={dimensions[def.key]}
                    onChange={(value) => onDimensionChange(def.key, value)}
                    compact
                  />
                ))}
              </div>
            </section>

            <section className="min-w-0 rounded-lg border border-[rgba(23,19,14,0.08)] bg-[#FFF9EA]/60 px-3 py-2.5">
              {selectionBody}
            </section>
          </div>
        </div>
      </div>
    </aside>
  );
}
