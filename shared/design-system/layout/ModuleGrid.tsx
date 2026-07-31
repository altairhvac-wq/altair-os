import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { CardSize } from "./card-size";

export type ModuleGridRhythm = "compact" | "default";
export type ModuleGridSpan = 1 | 2 | 3;

export type ModuleGridProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  children: ReactNode;
  /** The parent owns spacing between modules. */
  rhythm?: ModuleGridRhythm;
};

export type ModuleGridItemProps = Omit<
  ComponentPropsWithoutRef<"div">,
  "children"
> & {
  children: ReactNode;
  /**
   * Requested desktop span. Mobile always uses one column; tablet safely
   * clamps three-column workspaces to the available two columns.
   */
  span?: ModuleGridSpan;
  /** Semantic composition hint only. Never applies width. */
  size?: CardSize;
};

const rhythmClass: Record<ModuleGridRhythm, string> = {
  compact: "gap-3 lg:gap-4",
  default: "gap-4 lg:gap-5",
};

const spanClass: Record<ModuleGridSpan, string> = {
  1: "md:col-span-1 lg:col-span-1",
  2: "md:col-span-2 lg:col-span-2",
  3: "md:col-span-2 lg:col-span-3",
};

/**
 * Responsive module composition: one column on mobile, two on tablet, and
 * three on desktop. It owns rhythm only; children own span and card size.
 */
export function ModuleGrid({
  children,
  rhythm = "default",
  className = "",
  ...rest
}: ModuleGridProps) {
  return (
    <div
      className={`grid min-w-0 grid-cols-1 items-start md:grid-cols-2 lg:grid-cols-3 ${rhythmClass[rhythm]} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function ModuleGridItem({
  children,
  span = 1,
  size,
  className = "",
  ...rest
}: ModuleGridItemProps) {
  return (
    <div
      className={`min-w-0 ${spanClass[span]} ${className}`}
      data-card-size={size}
      data-module-span={span}
      {...rest}
    >
      {children}
    </div>
  );
}
