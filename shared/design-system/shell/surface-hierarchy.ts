/**
 * Altair Surface Hierarchy System (Phase 1)
 *
 * Five semantic surface levels — tonal hierarchy over elevation.
 * CSS material lives in app/globals.css; consume these class tokens in UI.
 *
 * Surface 0 — Canvas: page background (never pure white)
 * Surface 1 — Section: grouped region (Mission Critical, Cash Flow, …)
 * Surface 2 — Card: only when content needs true separation
 * Surface 3 — Tile: KPIs, quick actions, metric blocks
 * Surface 4 — List Row: native-feeling rows (customers, jobs, activity)
 */

export type AltairSurfaceLevel = 0 | 1 | 2 | 3 | 4;

/** Surface 0 — application / page canvas */
export const altairSurfaceCanvasClass = "altair-surface-canvas";

/** Surface 1 — section grouping region */
export const altairSurfaceSectionClass = "altair-surface-section";

/**
 * Surface 1 attention variant — Needs Attention primary anchor.
 * Color Hierarchy Phase 2; warmer + brass edge. See foundation/color-hierarchy.ts.
 */
export const altairSurfaceAttentionClass = "altair-surface-attention";

/** Surface 2 — card (use sparingly; prefer section + spacing) */
export const altairSurfaceCardClass = "altair-surface-card";

/** Surface 3 — tile (KPI / metric / quick action) */
export const altairSurfaceTileClass = "altair-surface-tile";

/** Surface 4 — list container */
export const altairSurfaceListClass = "altair-surface-list";

/** Surface 4 — individual list row */
export const altairSurfaceListRowClass = "altair-surface-list-row";

/** Shared padding inside a Surface 1 section that holds tiles */
export const altairSurfaceSectionBodyClass = "altair-surface-section-body";

/** North Star report/work card — lighter elevation than legacy ivory shadows */
export const altairSurfaceNsCardClass = "altair-surface-ns-card";

/** North Star tile inside a shared section */
export const altairSurfaceNsTileClass = "altair-surface-ns-tile";

export const altairSurfaceLevelClass: Record<AltairSurfaceLevel, string> = {
  0: altairSurfaceCanvasClass,
  1: altairSurfaceSectionClass,
  2: altairSurfaceCardClass,
  3: altairSurfaceTileClass,
  4: altairSurfaceListRowClass,
};
