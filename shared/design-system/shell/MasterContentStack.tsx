import type { ReactNode } from "react";
import { masterShellStackGap, type MasterShellDensity } from "./tokens";

export type MasterContentStackProps = {
  children: ReactNode;
  density?: MasterShellDensity;
  /** Allow flex child to shrink and scroll inside viewport-fill pages */
  scrollable?: boolean;
  className?: string;
};

export function MasterContentStack({
  children,
  density = "default",
  scrollable = false,
  className = "",
}: MasterContentStackProps) {
  return (
    <div
      className={`flex min-w-0 flex-col ${masterShellStackGap[density]} ${scrollable ? "min-h-0 lg:flex-1 lg:overflow-hidden" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
