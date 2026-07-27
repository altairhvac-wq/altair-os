import type { ReactNode } from "react";
import {
  altairSurfaceCardClass,
  altairSurfaceSectionClass,
  altairSurfaceTileClass,
} from "./surface-hierarchy";
import { masterSectionSurfaceClass } from "./tokens";

export type MasterPageSurfaceVariant =
  | "card"
  | "panel"
  | "section"
  | "workspace"
  | "northStarList"
  | "northStarDetail"
  /** Surface Hierarchy — Surface 1 section grouping */
  | "surfaceSection"
  /** Surface Hierarchy — Surface 2 card */
  | "surfaceCard"
  /** Surface Hierarchy — Surface 3 tile */
  | "surfaceTile";

export type MasterPageSurfaceProps = {
  children: ReactNode;
  /**
   * card = admin-card, panel = admin-panel, section = compact bordered block,
   * workspace = Altair Design Foundation Surface, northStarList/northStarDetail =
   * ivory work surfaces, surfaceSection/surfaceCard/surfaceTile = Surface
   * Hierarchy levels 1–3 (see surface-hierarchy.ts).
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
  surfaceSection: `${altairSurfaceSectionClass} overflow-hidden`,
  surfaceCard: `${altairSurfaceCardClass} overflow-hidden`,
  surfaceTile: altairSurfaceTileClass,
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
