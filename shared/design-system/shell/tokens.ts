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
