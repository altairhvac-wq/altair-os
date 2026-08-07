import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  isValidHexColor,
  normalizeHexColor,
  parseDesignLabColorChannels,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

export type ContrastRating = "good" | "caution" | "poor";

export type ContrastCheckKind = "text" | "border";

export type ContrastCheckResult = {
  id: string;
  name: string;
  foregroundLabel: string;
  backgroundLabel: string;
  kind: ContrastCheckKind;
  ratio: number | null;
  rating: ContrastRating | null;
  helperText: string;
};

export function isValidContrastHex(value: string): boolean {
  return isValidHexColor(value);
}

export function normalizeContrastHex(value: string): string | null {
  return normalizeHexColor(value);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const channels = parseDesignLabColorChannels(hex);
  if (!channels) {
    return null;
  }

  return { r: channels.r, g: channels.g, b: channels.b };
}

function srgbToLinear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number | null {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }

  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fgLuminance = relativeLuminance(foreground);
  const bgLuminance = relativeLuminance(background);

  if (fgLuminance === null || bgLuminance === null) {
    return null;
  }

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

export function rateTextContrast(ratio: number): ContrastRating {
  if (ratio >= 4.5) {
    return "good";
  }

  if (ratio >= 3) {
    return "caution";
  }

  return "poor";
}

export function rateBorderContrast(ratio: number): ContrastRating {
  if (ratio >= 3) {
    return "good";
  }

  if (ratio >= 1.8) {
    return "caution";
  }

  return "poor";
}

export function contrastHelperText(rating: ContrastRating): string {
  switch (rating) {
    case "good":
      return "Readable.";
    case "caution":
      return "Usable for large text, but may feel soft.";
    case "poor":
      return "Hard to read. Adjust one of these colors.";
  }
}

function buildCheck(
  id: string,
  name: string,
  foreground: string,
  background: string,
  foregroundLabel: string,
  backgroundLabel: string,
  kind: ContrastCheckKind,
): ContrastCheckResult {
  const ratio = contrastRatio(foreground, background);

  if (ratio === null) {
    return {
      id,
      name,
      foregroundLabel,
      backgroundLabel,
      kind,
      ratio: null,
      rating: null,
      helperText: "Invalid or non-hex color (skipped for alpha/rgb tokens).",
    };
  }

  const rating =
    kind === "text" ? rateTextContrast(ratio) : rateBorderContrast(ratio);

  return {
    id,
    name,
    foregroundLabel,
    backgroundLabel,
    kind,
    ratio,
    rating,
    helperText: contrastHelperText(rating),
  };
}

export type ContrastOverallStatus =
  | "all-good"
  | "needs-review"
  | "poor-detected";

export function getContrastOverallStatus(
  checks: ContrastCheckResult[],
): ContrastOverallStatus {
  if (checks.some((check) => check.rating === "poor")) {
    return "poor-detected";
  }

  if (checks.some((check) => check.rating === "caution")) {
    return "needs-review";
  }

  return "all-good";
}

export function getOverallStatusLabel(status: ContrastOverallStatus): string {
  switch (status) {
    case "all-good":
      return "All key pairs look readable";
    case "needs-review":
      return "Some pairs need review";
    case "poor-detected":
      return "Poor contrast detected";
  }
}

export function evaluateDesignLabContrast(
  colors: DesignLabColors,
): ContrastCheckResult[] {
  return [
    buildCheck(
      "topbar-heading-on-topbar",
      "Topbar heading on topbar",
      colors.northStarTopbarHeading,
      colors.northStarTopbar,
      "--north-star-topbar-heading",
      "--north-star-topbar",
      "text",
    ),
    buildCheck(
      "sidebar-link-on-sidebar",
      "Sidebar link on sidebar",
      colors.northStarSidebarLink,
      colors.northStarSidebar,
      "--north-star-sidebar-link",
      "--north-star-sidebar",
      "text",
    ),
    buildCheck(
      "sidebar-label-on-sidebar",
      "Sidebar label on sidebar",
      colors.northStarSidebarLabel,
      colors.northStarSidebar,
      "--north-star-sidebar-label",
      "--north-star-sidebar",
      "text",
    ),
    buildCheck(
      "section-title-on-content-well",
      "Section title on content well",
      colors.northStarSectionTitle,
      colors.northStarContentWell,
      "--north-star-section-title",
      "--north-star-content-well",
      "text",
    ),
    buildCheck(
      "text-dark-on-paper",
      "Text dark on paper",
      colors.northStarTextDark,
      colors.altairPaper,
      "--north-star-text-dark",
      "--altair-paper",
      "text",
    ),
    buildCheck(
      "ink-on-surface-card",
      "Ink on surface card",
      colors.altairInk,
      colors.surfaceCard,
      "--altair-ink",
      "--surface-card",
      "text",
    ),
    buildCheck(
      "section-title-on-caught-up",
      "Section title on caught-up fill",
      colors.northStarSectionTitle,
      colors.northStarCaughtUpFill,
      "--north-star-section-title",
      "--north-star-caught-up-fill",
      "text",
    ),
    buildCheck(
      "chrome-border-on-sidebar",
      "Chrome border on sidebar",
      colors.northStarBorder,
      colors.northStarSidebar,
      "--north-star-border",
      "--north-star-sidebar",
      "border",
    ),
    buildCheck(
      "plate-border-on-surface-card",
      "Plate border on surface card",
      colors.northStarPlateBorder,
      colors.surfaceCard,
      "--north-star-plate-border",
      "--surface-card",
      "border",
    ),
    buildCheck(
      "exception-low-ink",
      "Dark text on exception low shell (paper)",
      colors.northStarTextDark,
      colors.altairPaper,
      "--north-star-text-dark",
      "--altair-paper",
      "text",
    ),
    buildCheck(
      "exception-medium-ink",
      "Warning foreground on warning surface",
      colors.altairWarningForeground,
      colors.altairWarningSurface,
      "--altair-warning-foreground",
      "--altair-warning-surface",
      "text",
    ),
    buildCheck(
      "exception-high-ink",
      "Danger on danger surface",
      colors.altairDanger,
      colors.altairDangerSurface,
      "--altair-danger",
      "--altair-danger-surface",
      "text",
    ),
    buildCheck(
      "dark-page-paper-on-ink",
      "Paper text on dark-page ink",
      colors.altairPaper,
      colors.altairInk,
      "--altair-paper",
      "--altair-ink",
      "text",
    ),
    buildCheck(
      "hub-work-text-on-row",
      "Work text on work row",
      colors.northStarWorkText,
      colors.northStarWorkRow,
      "--north-star-work-text",
      "--north-star-work-row",
      "text",
    ),
  ];
}

export function formatContrastRatio(ratio: number | null): string {
  if (ratio === null) {
    return "Invalid color";
  }

  return `${ratio.toFixed(2)}:1`;
}

export function ratingLabel(rating: ContrastRating | null): string {
  if (rating === null) {
    return "Invalid color";
  }

  switch (rating) {
    case "good":
      return "Good";
    case "caution":
      return "Caution";
    case "poor":
      return "Poor";
  }
}
