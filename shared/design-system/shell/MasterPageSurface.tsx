import type { ReactNode } from "react";
import { masterSectionSurfaceClass } from "./tokens";

export type MasterPageSurfaceVariant =
  | "card"
  | "panel"
  | "section"
  | "workspace"
  | "northStarList"
  | "northStarDetail";

export type MasterPageSurfaceProps = {
  children: ReactNode;
  /**
   * card = admin-card (legacy slate/cyan), panel = admin-panel, section = compact
   * bordered block, workspace = canonical Altair Design Foundation Surface (warm
   * Paper-on-Stone materials, semantic tokens only — see altair-surface-workspace
   * in app/globals.css), northStarList/northStarDetail = ivory surfaces (no admin-card).
   */
  variant?: MasterPageSurfaceVariant;
  id?: string;
  className?: string;
};

const variantClass: Record<MasterPageSurfaceVariant, string> = {
  card: "admin-card overflow-hidden",
  panel: "admin-panel min-h-0 min-w-0 flex flex-col overflow-hidden",
  section: masterSectionSurfaceClass,
  workspace: "altair-surface-workspace overflow-hidden",
  northStarList: "north-star-list-surface overflow-hidden",
  northStarDetail: "north-star-detail-section-surface",
};

export function MasterPageSurface({
  children,
  variant = "card",
  id,
  className = "",
}: MasterPageSurfaceProps) {
  return (
    <div id={id} className={`${variantClass[variant]} ${className}`}>
      {children}
    </div>
  );
}
