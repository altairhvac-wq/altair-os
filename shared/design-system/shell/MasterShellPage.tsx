import type { ReactNode } from "react";
import {
  masterShellStackGap,
  masterShellViewportFillClass,
  type MasterShellDensity,
} from "./tokens";

export type MasterShellPageProps = {
  children: ReactNode;
  /** Vertical rhythm between major page blocks */
  density?: MasterShellDensity;
  /**
   * Override stack gap (e.g. `gap-0` for flush header-strip → content-well
   * hairline on MC v2 list hubs). Defaults to density token.
   */
  stackGapClassName?: string;
  /** Fill remaining viewport below admin chrome (list pages) */
  fillViewport?: boolean;
  className?: string;
  /** Stable hook for Playwright / demo-tool targeting */
  "data-testid"?: string;
};

export function MasterShellPage({
  children,
  density = "default",
  stackGapClassName,
  fillViewport = false,
  className = "",
  "data-testid": testId,
}: MasterShellPageProps) {
  return (
    <div
      data-testid={testId}
      className={`mx-auto flex w-full min-w-0 max-w-full flex-col pb-2 ${stackGapClassName ?? masterShellStackGap[density]} ${fillViewport ? masterShellViewportFillClass : ""} ${className}`}
    >
      {children}
    </div>
  );
}
