/** Shared rhythm and width tokens for Master Shell V1. */

export type MasterShellDensity = "default" | "compact";

export const masterShellStackGap: Record<MasterShellDensity, string> = {
  default: "gap-3 lg:gap-4",
  compact: "gap-2 lg:gap-3",
};

export const masterShellSectionGap: Record<MasterShellDensity, string> = {
  default: "gap-2 lg:gap-3",
  compact: "gap-2 lg:gap-2.5",
};

export type MasterPageCanvasWidth = "wide" | "standard" | "detail";

export const masterPageCanvasWidthClass: Record<MasterPageCanvasWidth, string> = {
  wide: "xl:max-w-[1440px]",
  standard: "max-w-full",
  detail: "max-w-5xl",
};

/** Viewport-fill height for list-style pages inside AdminShell main. */
export const masterShellViewportFillClass =
  "lg:h-[calc(100dvh-7rem)] lg:min-h-0 lg:overflow-hidden";

/** Compact list-page primary action button (README checklist item 8). */
export const masterListPagePrimaryActionClass =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl admin-btn-primary px-3 py-1.5 text-sm";

/** Mobile viewport lock when a list detail/create panel is open (checklist item 7). */
export const masterListPageMobilePanelLockClass =
  "max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-0 max-lg:overflow-hidden";

/** Main list card flex shell on `MasterPageSurface` variant="card". */
export const masterListPageSurfaceClass =
  "flex min-h-[16rem] min-w-0 lg:min-h-0 lg:flex-1 flex-col";

/** Scroll region inside the list card (checklist item 5). */
export const masterListPageScrollRegionClass =
  "min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto";
