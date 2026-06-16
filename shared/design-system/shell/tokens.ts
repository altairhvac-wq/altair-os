/** Shared rhythm and width tokens for Master Shell V2. */

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

/**
 * Body inset for loaded estimate/invoice overlays inside `FocusedDocumentOverlay`.
 * Pair with `MasterPageCanvas` `width="detail"` + `MasterContentStack` — not `MasterDetailPageLayout`.
 */
export const masterDetailOverlayBodyInsetClass =
  "overflow-x-hidden px-3 py-3 pb-4 sm:px-4 sm:py-4 print:max-w-none print:px-0 print:pb-0 print:py-0";

/** Viewport-fill height for list-style pages inside AdminShell main. */
export const masterShellViewportFillClass =
  "lg:h-[calc(100dvh-7rem)] lg:min-h-0 lg:overflow-hidden";

/** Compact list-page primary action button (README checklist item 8). */
export const masterListPagePrimaryActionClass =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl admin-btn-primary px-3 py-1.5 text-sm";

/** Compact list-page secondary action button — pairs with primary in page headers. */
export const masterSecondaryActionClass =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl admin-btn-secondary px-3 py-1.5 text-sm";

/** Panel chrome header inside board/workbench surfaces (Dispatch, list detail panels). */
export const masterPanelHeaderClass = "admin-panel-header shrink-0";

/** Grouped section surface — details, settings, forms (maps to `.admin-section-surface`). */
export const masterSectionSurfaceClass = "admin-section-surface p-2.5";

/** Mobile viewport lock when a list detail/create panel is open (checklist item 7). */
export const masterListPageMobilePanelLockClass =
  "max-lg:h-[calc(100dvh-7rem)] max-lg:min-h-0 max-lg:overflow-hidden";

/** Main list card flex shell on `MasterPageSurface` variant="card". */
export const masterListPageSurfaceClass =
  "flex min-h-[16rem] min-w-0 lg:min-h-0 lg:flex-1 flex-col";

/** Scroll region inside the list card (checklist item 5). */
export const masterListPageScrollRegionClass =
  "min-h-0 min-w-0 flex-1 overflow-x-hidden lg:overflow-y-auto";

/** Board surface + desktop detail panel sibling row (Dispatch workbench). */
export const masterWorkbenchRowClass =
  "flex min-h-0 min-w-0 max-w-full lg:flex-1 flex-col gap-2 sm:gap-4 lg:flex-row lg:items-stretch";

/** Desktop/mobile nav link — pair with active variant class when current. */
export const adminNavLinkClass = "admin-nav-link";

/** Active nav item surface (does not replace routing/active matching). */
export const adminNavLinkActiveClass = "admin-nav-link-active";

/** Segmented control track (tabs, date range, filter pills). */
export const adminSegmentedControlClass = "admin-segmented-control";

/** Segmented control segment button. */
export const adminSegmentedItemClass = "admin-segmented-item";

/** Active segment — calm white pill on shared track. */
export const adminSegmentedItemActiveClass = "admin-segmented-item-active";

/** Pressed/selected state for operational filter cards (e.g. dispatch workload). */
export const adminFilterCardActiveClass = "admin-filter-card-active";
