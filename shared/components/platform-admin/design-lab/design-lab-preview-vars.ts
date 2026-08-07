import {
  DESIGN_LAB_TOKEN_DEFS,
  type DesignLabColors,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  designLabDimensionVars,
  type DesignLabDimensions,
} from "@/shared/components/platform-admin/design-lab/design-lab-dimensions";
import {
  designLabShineVars,
  type DesignLabShineMap,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";

/**
 * Scope live CSS custom properties onto the preview root so nested product
 * classes (`bg-[var(--north-star-sidebar)]`, etc.) pick up Design Lab edits.
 */
export function designLabPreviewVars(
  colors: DesignLabColors,
  shines: DesignLabShineMap = {},
  dimensions: DesignLabDimensions = LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
): React.CSSProperties {
  const style: Record<string, string> = {};

  for (const def of DESIGN_LAB_TOKEN_DEFS) {
    style[def.cssVar] = colors[def.key];
  }

  Object.assign(style, designLabShineVars(shines));
  Object.assign(style, designLabDimensionVars(dimensions));

  /* Keep Tailwind altair-* utilities in sync inside the preview tree. */
  style["--color-altair-stone"] = colors.altairStone;
  style["--color-altair-paper"] = colors.altairPaper;
  style["--color-altair-paper-elevated"] = colors.altairPaperElevated;
  style["--color-altair-paper-subtle"] = colors.altairPaperSubtle;
  style["--color-altair-graphite"] = colors.altairGraphite;
  style["--color-altair-ink"] = colors.altairInk;
  style["--color-altair-ink-secondary"] = colors.altairInkSecondary;
  style["--color-altair-ink-muted"] = colors.altairInkMuted;
  /* Paper-anchored ink follows foundation ink ladder in the preview sandbox. */
  style["--altair-ink-on-paper"] = colors.altairInk;
  style["--altair-ink-on-paper-secondary"] = colors.altairInkSecondary;
  style["--altair-ink-on-paper-muted"] = colors.altairInkMuted;
  style["--color-altair-ink-on-paper"] = colors.altairInk;
  style["--color-altair-ink-on-paper-secondary"] = colors.altairInkSecondary;
  style["--color-altair-ink-on-paper-muted"] = colors.altairInkMuted;
  style["--color-altair-border"] = colors.altairBorder;
  style["--color-altair-border-strong"] = colors.altairBorderStrong;
  style["--color-altair-brass"] = colors.altairBrass;
  style["--color-altair-brass-interactive"] = colors.altairBrassInteractive;
  style["--color-altair-success"] = colors.altairSuccess;
  style["--color-altair-success-foreground"] = colors.altairSuccessForeground;
  style["--color-altair-success-surface"] = colors.altairSuccessSurface;
  style["--color-altair-warning"] = colors.altairWarning;
  style["--color-altair-warning-foreground"] = colors.altairWarningForeground;
  style["--color-altair-warning-surface"] = colors.altairWarningSurface;
  style["--color-altair-danger"] = colors.altairDanger;
  style["--color-altair-danger-foreground"] = colors.altairDangerForeground;
  style["--color-altair-danger-surface"] = colors.altairDangerSurface;
  style["--color-altair-information"] = colors.altairInformation;
  style["--color-altair-information-foreground"] =
    colors.altairInformationForeground;
  style["--color-altair-information-surface"] =
    colors.altairInformationSurface;

  return style as React.CSSProperties;
}

export const DESIGN_LAB_CARD_SURFACE_STYLE: React.CSSProperties = {
  backgroundColor: "var(--surface-card)",
  borderColor: "var(--north-star-plate-border)",
  backgroundImage: "var(--surface-card--shine, none)",
};

/** Checkerboard so token alpha is readable against the preview chrome. */
export const DESIGN_LAB_OPACITY_CHECKER_STYLE: React.CSSProperties = {
  backgroundColor: "#d6d3cd",
  backgroundImage:
    "linear-gradient(45deg, #bdb8ae 25%, transparent 25%), linear-gradient(-45deg, #bdb8ae 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #bdb8ae 75%), linear-gradient(-45deg, transparent 75%, #bdb8ae 75%)",
  backgroundSize: "14px 14px",
  backgroundPosition: "0 0, 0 7px, 7px -7px, -7px 0",
};
