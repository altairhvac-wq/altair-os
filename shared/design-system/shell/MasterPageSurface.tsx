import type { ReactNode } from "react";

export type MasterPageSurfaceVariant = "card" | "panel" | "section";

export type MasterPageSurfaceProps = {
  children: ReactNode;
  /** card = admin-card, panel = admin-panel, section = compact bordered block */
  variant?: MasterPageSurfaceVariant;
  className?: string;
};

const variantClass: Record<MasterPageSurfaceVariant, string> = {
  card: "admin-card overflow-hidden",
  panel: "admin-panel min-h-0 min-w-0 flex flex-col overflow-hidden",
  section: "rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm",
};

export function MasterPageSurface({
  children,
  variant = "card",
  className = "",
}: MasterPageSurfaceProps) {
  return (
    <div className={`${variantClass[variant]} ${className}`}>{children}</div>
  );
}
