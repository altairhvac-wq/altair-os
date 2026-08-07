import {
  DESIGN_LAB_COLOR_FIELDS,
  DESIGN_LAB_CSS_VAR_BY_KEY,
  DESIGN_LAB_TOKEN_GROUPS,
  type DesignLabColors,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  buildSurfaceOverridesExportSection,
  type DashboardSurfaceOverrides,
} from "@/shared/components/platform-admin/design-lab/design-lab-dashboard-surfaces";
import {
  evaluateDesignLabContrast,
  getContrastOverallStatus,
  getOverallStatusLabel,
  type ContrastCheckResult,
} from "@/shared/components/platform-admin/design-lab/design-lab-contrast";
import {
  designLabShineCssVar,
  formatDesignLabShineGradient,
  isValidDesignLabShine,
  type DesignLabShineMap,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";

export type ContrastSummary = {
  overallLabel: string;
  poorCount: number;
  cautionCount: number;
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

/** JSON keyed by real CSS custom property names (+ optional `--*--shine`). */
export function buildJsonTheme(
  tokens: DesignLabColors,
  shines: DesignLabShineMap = {},
): string {
  const ordered: Record<string, string> = {};

  for (const { key, cssVar } of DESIGN_LAB_COLOR_FIELDS) {
    ordered[cssVar] = tokens[key];
    const shine = shines[key];
    if (shine && isValidDesignLabShine(shine)) {
      ordered[designLabShineCssVar(cssVar)] = formatDesignLabShineGradient(shine);
    }
  }

  return JSON.stringify(ordered, null, 2);
}

/** Copy-pasteable :root fragment using real product token names. */
export function buildCssVariableSnippet(
  tokens: DesignLabColors,
  shines: DesignLabShineMap = {},
): string {
  const lines: string[] = [":root {"];

  for (const group of DESIGN_LAB_TOKEN_GROUPS) {
    const fields = DESIGN_LAB_COLOR_FIELDS.filter(
      (field) => field.group === group.id,
    );
    if (fields.length === 0) {
      continue;
    }
    lines.push(`  /* ${group.label} */`);
    for (const { key, cssVar } of fields) {
      lines.push(`  ${cssVar}: ${tokens[key]};`);
      const shine = shines[key];
      if (shine && isValidDesignLabShine(shine)) {
        lines.push(
          `  ${designLabShineCssVar(cssVar)}: ${formatDesignLabShineGradient(shine)};`,
        );
      }
    }
    lines.push("");
  }

  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  lines.push("}");
  return lines.join("\n");
}

function buildTokenSummary(
  tokens: DesignLabColors,
  shines: DesignLabShineMap = {},
): string {
  return DESIGN_LAB_COLOR_FIELDS.flatMap(({ key, cssVar }) => {
    const rows = [`${cssVar}: ${tokens[key]}`];
    const shine = shines[key];
    if (shine && isValidDesignLabShine(shine)) {
      rows.push(
        `${designLabShineCssVar(cssVar)}: ${formatDesignLabShineGradient(shine)}`,
      );
    }
    return rows;
  }).join("\n");
}

export function buildDesignLabThemeExport(
  tokens: DesignLabColors,
  contrastSummary: ContrastSummary,
  surfaceOverrides: DashboardSurfaceOverrides = {},
  shines: DesignLabShineMap = {},
): string {
  const surfaceSection = buildSurfaceOverridesExportSection(surfaceOverrides);
  const sections = [
    "Altair Design Lab Theme Export",
    "Generated from /platform/design-lab",
    "Status: Preview-only export. Not saved or applied globally.",
    "Token names match live product CSS custom properties (globals.css).",
    "Shine companions use --token--shine gradient strings beside solid bases.",
    "",
    "Readability:",
    `Overall: ${contrastSummary.overallLabel}`,
    `Poor checks: ${contrastSummary.poorCount}`,
    `Caution checks: ${contrastSummary.cautionCount}`,
    "",
    "Tokens:",
    buildTokenSummary(tokens, shines),
  ];

  if (surfaceSection) {
    sections.push("", surfaceSection);
  } else {
    sections.push(
      "",
      "Dashboard surface overrides: none.",
      "Note: Dashboard surface overrides are preview-only and are not included in the global token export when none are active.",
    );
  }

  sections.push(
    "",
    "JSON (CSS variable keys):",
    buildJsonTheme(tokens, shines),
    "",
    "CSS variables:",
    buildCssVariableSnippet(tokens, shines),
  );

  return sections.join("\n");
}

export function buildDesignLabThemeExportFromColors(
  tokens: DesignLabColors,
  surfaceOverrides: DashboardSurfaceOverrides = {},
  shines: DesignLabShineMap = {},
): string {
  const checks = evaluateDesignLabContrast(tokens);
  const contrastSummary = getContrastSummary(checks);
  return buildDesignLabThemeExport(
    tokens,
    contrastSummary,
    surfaceOverrides,
    shines,
  );
}

export { DESIGN_LAB_CSS_VAR_BY_KEY };
