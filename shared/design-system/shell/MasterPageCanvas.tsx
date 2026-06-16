import type { ReactNode } from "react";
import {
  masterPageCanvasWidthClass,
  type MasterPageCanvasWidth,
} from "./tokens";

export type MasterPageCanvasProps = {
  children: ReactNode;
  /** Page content width relative to admin main area */
  width?: MasterPageCanvasWidth;
  className?: string;
};

export function MasterPageCanvas({
  children,
  width = "standard",
  className = "",
}: MasterPageCanvasProps) {
  return (
    <div
      className={`mx-auto flex w-full min-w-0 flex-col ${masterPageCanvasWidthClass[width]} ${className}`}
    >
      {children}
    </div>
  );
}
