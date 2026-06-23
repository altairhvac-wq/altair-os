import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { normalizeHexColor } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

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

const HEX_PATTERN = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

export function isValidContrastHex(value: string): boolean {
  return HEX_PATTERN.test(value.trim());
}

export function normalizeContrastHex(value: string): string | null {
  return normalizeHexColor(value);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeContrastHex(hex);
  if (!normalized) {
    return null;
  }

  const value = normalized.slice(1);
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);

  if ([r, g, b].some((channel) => Number.isNaN(channel))) {
    return null;
  }

  return { r, g, b };
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
      helperText: "Invalid color.",
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
      "header-on-page",
      "Header text on page background",
      colors.headerText,
      colors.pageBackground,
      "Header text",
      "Page background",
      "text",
    ),
    buildCheck(
      "body-on-card",
      "Body text on card background",
      colors.bodyText,
      colors.cardBackground,
      "Body text",
      "Card background",
      "text",
    ),
    buildCheck(
      "muted-on-card",
      "Muted text on card background",
      colors.mutedText,
      colors.cardBackground,
      "Muted text",
      "Card background",
      "text",
    ),
    buildCheck(
      "primary-button-text",
      "Primary button text on primary button",
      colors.primaryButtonText,
      colors.primaryButton,
      "Primary button text",
      "Primary button",
      "text",
    ),
    buildCheck(
      "secondary-button-text",
      "Secondary button text on secondary button",
      colors.secondaryButtonText,
      colors.secondaryButton,
      "Secondary button text",
      "Secondary button",
      "text",
    ),
    buildCheck(
      "body-on-secondary-button",
      "Body text on secondary button",
      colors.bodyText,
      colors.secondaryButton,
      "Body text",
      "Secondary button",
      "text",
    ),
    buildCheck(
      "card-border-on-card",
      "Card border on card background",
      colors.cardBorder,
      colors.cardBackground,
      "Card border",
      "Card background",
      "border",
    ),
    buildCheck(
      "success-badge",
      "Success badge readability",
      colors.bodyText,
      colors.successBadge,
      "Body text",
      "Success badge",
      "text",
    ),
    buildCheck(
      "warning-badge",
      "Warning badge readability",
      colors.bodyText,
      colors.warningBadge,
      "Body text",
      "Warning badge",
      "text",
    ),
    buildCheck(
      "danger-badge",
      "Danger badge readability",
      colors.bodyText,
      colors.dangerBadge,
      "Body text",
      "Danger badge",
      "text",
    ),
    buildCheck(
      "sidebar-text-on-sidebar",
      "Sidebar text on sidebar background",
      colors.sidebarText,
      colors.sidebarBackground,
      "Sidebar text",
      "Sidebar background",
      "text",
    ),
    buildCheck(
      "sidebar-muted-on-sidebar",
      "Sidebar muted text on sidebar background",
      colors.sidebarMutedText,
      colors.sidebarBackground,
      "Sidebar muted text",
      "Sidebar background",
      "text",
    ),
    buildCheck(
      "sidebar-text-on-active",
      "Sidebar text on active item background",
      colors.sidebarText,
      colors.sidebarActiveBackground,
      "Sidebar text",
      "Sidebar active background",
      "text",
    ),
    buildCheck(
      "topbar-text-on-topbar",
      "Topbar text on topbar background",
      colors.topbarText,
      colors.topbarBackground,
      "Topbar text",
      "Topbar background",
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
