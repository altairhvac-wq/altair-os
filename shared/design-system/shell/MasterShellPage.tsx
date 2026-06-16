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
  /** Fill remaining viewport below admin chrome (list pages) */
  fillViewport?: boolean;
  className?: string;
};

export function MasterShellPage({
  children,
  density = "default",
  fillViewport = false,
  className = "",
}: MasterShellPageProps) {
  return (
    <div
      className={`mx-auto flex w-full min-w-0 max-w-full flex-col pb-2 ${masterShellStackGap[density]} ${fillViewport ? masterShellViewportFillClass : ""} ${className}`}
    >
      {children}
    </div>
  );
}
