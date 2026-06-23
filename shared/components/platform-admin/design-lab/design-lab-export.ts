import type { DesignLabColors } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import { DESIGN_LAB_COLOR_FIELDS } from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  evaluateDesignLabContrast,
  getContrastOverallStatus,
  getOverallStatusLabel,
  type ContrastCheckResult,
} from "@/shared/components/platform-admin/design-lab/design-lab-contrast";

export type ContrastSummary = {
  overallLabel: string;
  poorCount: number;
  cautionCount: number;
};

const CSS_VARIABLE_MAP: Record<keyof DesignLabColors, string> = {
  pageBackground: "--altair-page-background",
  cardBackground: "--altair-card-background",
  cardBorder: "--altair-card-border",
  primaryButton: "--altair-primary-button",
  primaryButtonText: "--altair-primary-button-text",
  secondaryButton: "--altair-secondary-button",
  secondaryButtonText: "--altair-secondary-button-text",
  headerText: "--altair-header-text",
  bodyText: "--altair-body-text",
  mutedText: "--altair-muted-text",
  successBadge: "--altair-success-badge",
  warningBadge: "--altair-warning-badge",
  dangerBadge: "--altair-danger-badge",
  sidebarBackground: "--altair-sidebar-background",
  sidebarText: "--altair-sidebar-text",
  sidebarActiveBackground: "--altair-sidebar-active-background",
  sidebarMutedText: "--altair-sidebar-muted-text",
  topbarBackground: "--altair-topbar-background",
  topbarText: "--altair-topbar-text",
};

export function getContrastSummary(
  checks: ContrastCheckResult[],
): ContrastSummary {
  return {
    overallLabel: getOverallStatusLabel(getContrastOverallStatus(checks)),
    poorCount: checks.filter((check) => check.rating === "poor").length,
    cautionCount: checks.filter((check) => check.rating === "caution").length,
  };
}

export function buildJsonTheme(tokens: DesignLabColors): string {
  const ordered: Record<string, string> = {};

  for (const { key } of DESIGN_LAB_COLOR_FIELDS) {
    ordered[key] = tokens[key];
  }

  return JSON.stringify(ordered, null, 2);
}

export function buildCssVariableSnippet(tokens: DesignLabColors): string {
  return DESIGN_LAB_COLOR_FIELDS.map(({ key }) => {
    const cssVar = CSS_VARIABLE_MAP[key];
    return `${cssVar}: ${tokens[key]};`;
  }).join("\n");
}

function buildTokenSummary(tokens: DesignLabColors): string {
  return DESIGN_LAB_COLOR_FIELDS.map(
    ({ key }) => `${key}: ${tokens[key]}`,
  ).join("\n");
}

export function buildDesignLabThemeExport(
  tokens: DesignLabColors,
  contrastSummary: ContrastSummary,
): string {
  const sections = [
    "Altair Design Lab Theme Export",
    "Generated from /platform/design-lab",
    "Status: Preview-only export. Not saved or applied globally.",
    "",
    "Readability:",
    `Overall: ${contrastSummary.overallLabel}`,
    `Poor checks: ${contrastSummary.poorCount}`,
    `Caution checks: ${contrastSummary.cautionCount}`,
    "",
    "Tokens:",
    buildTokenSummary(tokens),
    "",
    "JSON:",
    buildJsonTheme(tokens),
    "",
    "CSS variables:",
    buildCssVariableSnippet(tokens),
  ];

  return sections.join("\n");
}

export function buildDesignLabThemeExportFromColors(
  tokens: DesignLabColors,
): string {
  const checks = evaluateDesignLabContrast(tokens);
  const contrastSummary = getContrastSummary(checks);
  return buildDesignLabThemeExport(tokens, contrastSummary);
}
