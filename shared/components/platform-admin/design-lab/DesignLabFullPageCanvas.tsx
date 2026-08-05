"use client";

import { useState } from "react";
import {
  DESIGN_LAB_CANVAS_DEMO_PAGES,
  DesignLabCanvasDemoContent,
  type DesignLabCanvasDemoPageId,
} from "@/shared/components/platform-admin/design-lab/DesignLabCanvasDemoContent";
import { DesignLabDashboardShellClone } from "@/shared/components/platform-admin/design-lab/DesignLabDashboardShellClone";
import { DesignLabEditableTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
import type { DesignLabCanvasSelection } from "@/shared/components/platform-admin/design-lab/design-lab-canvas-selection";
import type { DesignLabCanvasTarget } from "@/shared/components/platform-admin/design-lab/DesignLabCanvasToolbar";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  type DesignLabDimensions,
} from "@/shared/components/platform-admin/design-lab/design-lab-dimensions";
import type {
  DashboardSurfaceId,
  DashboardSurfaceOverrides,
} from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import {
  DESIGN_LAB_OPACITY_CHECKER_STYLE,
  designLabPreviewVars,
} from "@/shared/components/platform-admin/design-lab/design-lab-preview-vars";
import type { DesignLabShineMap } from "@/shared/components/platform-admin/design-lab/design-lab-shine";

type DesignLabFullPageCanvasProps = {
  colors: DesignLabColors;
  shines?: DesignLabShineMap;
  dimensions?: DesignLabDimensions;
  selection: DesignLabCanvasSelection | null;
  surfaceOverrides: DashboardSurfaceOverrides;
  onSelectGlobal: (id: DesignLabEditTargetId) => void;
  onSelectSurface: (surfaceId: DashboardSurfaceId) => void;
  canvasTarget: DesignLabCanvasTarget;
};

export function DesignLabFullPageCanvas({
  colors,
  shines = {},
  dimensions = LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  selection,
  surfaceOverrides,
  onSelectGlobal,
  onSelectSurface,
  canvasTarget,
}: DesignLabFullPageCanvasProps) {
  const [activeDemoPage, setActiveDemoPage] =
    useState<DesignLabCanvasDemoPageId>("dashboard");
  const selectedTargetId =
    selection?.kind === "global" ? selection.targetId : null;

  if (canvasTarget === "dashboard-replica") {
    return (
      <div
        className="design-lab-preview min-h-full"
        style={{
          ...DESIGN_LAB_OPACITY_CHECKER_STYLE,
          ...designLabPreviewVars(colors, shines, dimensions),
        }}
      >
        <DesignLabDashboardShellClone
          colors={colors}
          shines={shines}
          dimensions={dimensions}
          surfaceOverrides={surfaceOverrides}
          selection={selection}
          onSelectGlobal={onSelectGlobal}
          onSelectSurface={onSelectSurface}
        />
      </div>
    );
  }

  return (
    <div
      className="design-lab-preview admin-north-star-shell min-h-full"
      style={{
        ...DESIGN_LAB_OPACITY_CHECKER_STYLE,
        ...designLabPreviewVars(colors, shines, dimensions),
      }}
    >
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <DesignLabEditableTarget
          targetId="sidebar-shell"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectGlobal}
          as="aside"
          className="hidden w-52 shrink-0 flex-col sm:flex lg:w-56"
          style={{
            backgroundColor: "var(--north-star-sidebar)",
          }}
          aria-label="Demo workspace navigation"
        >
          <div className="px-4 py-4">
            <p
              className="text-sm font-bold"
              style={{ color: "var(--north-star-text-light)" }}
            >
              Altair HVAC
            </p>
            <p
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--north-star-text-light-muted)" }}
            >
              Demo workspace
            </p>
          </div>
          <nav className="flex-1 px-2 py-3">
            <ul className="space-y-0.5" role="tablist" aria-label="Demo pages">
              {DESIGN_LAB_CANVAS_DEMO_PAGES.map((page) => {
                const isActive = activeDemoPage === page.id;

                return (
                  <li key={page.id}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={(event) => {
                        event.stopPropagation();
                        setActiveDemoPage(page.id);
                      }}
                      className="flex w-full items-center rounded-none px-3 py-2 text-left text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: isActive
                          ? "color-mix(in srgb, var(--north-star-gold) 12%, transparent)"
                          : "transparent",
                        color: isActive
                          ? "var(--north-star-sidebar-link-active)"
                          : "var(--north-star-sidebar-link)",
                      }}
                    >
                      {page.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </DesignLabEditableTarget>

        <DesignLabEditableTarget
          targetId="chrome-border"
          selectedTargetId={selectedTargetId}
          onSelectTarget={onSelectGlobal}
          className="hidden w-1 shrink-0 sm:block"
          style={{ backgroundColor: "var(--north-star-border)" }}
          aria-label="Chrome border"
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <DesignLabEditableTarget
            targetId="topbar-shell"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectGlobal}
            as="header"
            className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6"
            style={{
              backgroundColor: "var(--north-star-topbar)",
            }}
          >
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold"
                style={{ color: "var(--north-star-text-light)" }}
              >
                Workspace
              </p>
              <p
                className="truncate text-[11px]"
                style={{ color: "var(--north-star-text-light-muted)" }}
              >
                Design Lab canvas · live chrome tokens
              </p>
            </div>
          </DesignLabEditableTarget>

          <DesignLabEditableTarget
            targetId="content-well"
            selectedTargetId={selectedTargetId}
            onSelectTarget={onSelectGlobal}
            className="flex-1"
            style={{ backgroundColor: "var(--north-star-content-well)" }}
          >
            <DesignLabCanvasDemoContent
              pageId={activeDemoPage}
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectGlobal}
            />
          </DesignLabEditableTarget>
        </div>
      </div>
    </div>
  );
}
