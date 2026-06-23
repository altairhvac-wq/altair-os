"use client";

import { createContext, useContext, useMemo } from "react";
import type { DesignLabCanvasSelection } from "@/shared/components/platform-admin/design-lab/design-lab-canvas-selection";
import type { DesignLabEditTargetId } from "@/shared/components/platform-admin/design-lab/design-lab-edit-targets";
import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  resolveSurfaceStyle,
  surfaceStyleToCss,
  type DashboardSurfaceId,
  type DashboardSurfaceOverrides,
  type DashboardSurfaceStyle,
} from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import { isSurfaceSelected } from "@/shared/components/platform-admin/design-lab/design-lab-canvas-selection";

type DesignLabSurfaceContextValue = {
  colors: DesignLabColors;
  overrides: DashboardSurfaceOverrides;
  selection: DesignLabCanvasSelection | null;
  onSelectSurface: (surfaceId: DashboardSurfaceId) => void;
  resolveStyle: (surfaceId: DashboardSurfaceId) => DashboardSurfaceStyle;
};

const DesignLabSurfaceContext = createContext<DesignLabSurfaceContextValue | null>(
  null,
);

export function DesignLabSurfaceProvider({
  colors,
  overrides,
  selection,
  onSelectSurface,
  children,
}: {
  colors: DesignLabColors;
  overrides: DashboardSurfaceOverrides;
  selection: DesignLabCanvasSelection | null;
  onSelectSurface: (surfaceId: DashboardSurfaceId) => void;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      colors,
      overrides,
      selection,
      onSelectSurface,
      resolveStyle: (surfaceId: DashboardSurfaceId) =>
        resolveSurfaceStyle(surfaceId, colors, overrides),
    }),
    [colors, overrides, selection, onSelectSurface],
  );

  return (
    <DesignLabSurfaceContext.Provider value={value}>
      {children}
    </DesignLabSurfaceContext.Provider>
  );
}

export function useDesignLabSurfaceContext(): DesignLabSurfaceContextValue {
  const context = useContext(DesignLabSurfaceContext);

  if (!context) {
    throw new Error("DesignLabSurfaceProvider is required.");
  }

  return context;
}

type DesignLabSurfaceTargetProps = {
  surfaceId: DashboardSurfaceId;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "span" | "p" | "h3" | "h4" | "li" | "section" | "footer";
};

const SURFACE_HOVER =
  "hover:outline hover:outline-1 hover:outline-[rgba(184,148,63,0.4)] hover:outline-offset-1";

const SURFACE_SELECTED =
  "outline outline-2 outline-[rgba(184,148,63,0.65)] outline-offset-2";

export function DesignLabSurfaceTarget({
  surfaceId,
  children,
  className = "",
  style,
  as: Component = "div",
}: DesignLabSurfaceTargetProps) {
  const { selection, onSelectSurface, resolveStyle } = useDesignLabSurfaceContext();
  const resolved = resolveStyle(surfaceId);
  const isSelected = isSurfaceSelected(selection, surfaceId);

  function handleSelect(event: React.MouseEvent | React.KeyboardEvent) {
    event.stopPropagation();
    onSelectSurface(surfaceId);
  }

  function stopBubble(event: React.MouseEvent) {
    event.stopPropagation();
  }

  return (
    <Component
      role="button"
      tabIndex={0}
      onClick={handleSelect}
      onMouseDown={stopBubble}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect(event);
        }
      }}
      data-surface-target={surfaceId}
      aria-pressed={isSelected}
      className={[
        "cursor-pointer rounded-sm transition-[outline,box-shadow]",
        SURFACE_HOVER,
        isSelected ? SURFACE_SELECTED : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...surfaceStyleToCss(resolved), ...style }}
    >
      {children}
    </Component>
  );
}

export function useResolvedSurfaceStyle(surfaceId: DashboardSurfaceId) {
  const { resolveStyle } = useDesignLabSurfaceContext();
  return resolveStyle(surfaceId);
}

export type DesignLabGlobalTargetProps = {
  targetId: DesignLabEditTargetId;
  selectedTargetId: DesignLabEditTargetId | null;
  onSelectTarget: (id: DesignLabEditTargetId) => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  as?: "div" | "button" | "span" | "p" | "h3" | "h4" | "li" | "aside" | "header" | "nav";
  "aria-label"?: string;
};

export { DesignLabEditableTarget as DesignLabGlobalTarget } from "@/shared/components/platform-admin/design-lab/DesignLabEditableTarget";
