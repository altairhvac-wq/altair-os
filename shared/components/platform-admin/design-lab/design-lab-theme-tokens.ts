import {
  DESIGN_LAB_COLOR_FIELDS,
  LIVE_CHROME_DESIGN_LAB_DEFAULTS,
  isValidDesignLabColor,
  normalizeDesignLabColor,
  type DesignLabColors,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";
import {
  LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
  parseDesignLabDimensions,
  serializeDesignLabDimensions,
  validateDesignLabDimensions,
  type DesignLabDimensions,
} from "@/shared/components/platform-admin/design-lab/design-lab-dimensions";
import {
  designLabShineCssVar,
  formatDesignLabShineGradient,
  isValidDesignLabShine,
  parseDesignLabShines,
  type DesignLabShineMap,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";

/** Persistable map keyed by live CSS custom property names (plus optional `--*--shine`). */
export function serializeDesignLabTokens(
  colors: DesignLabColors,
  shines: DesignLabShineMap = {},
  dimensions: DesignLabDimensions = LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
): Record<string, string> {
  const tokens: Record<string, string> = {};

  for (const { key, cssVar } of DESIGN_LAB_COLOR_FIELDS) {
    tokens[cssVar] = colors[key];
    const shine = shines[key];
    if (shine && isValidDesignLabShine(shine)) {
      tokens[designLabShineCssVar(cssVar)] = formatDesignLabShineGradient(shine);
    }
  }

  Object.assign(tokens, serializeDesignLabDimensions(dimensions));

  return tokens;
}

/**
 * Rebuild editor colors from a CSS-var-keyed token map.
 * Unknown keys are ignored; missing keys fall back to live chrome defaults.
 * Shine companions are ignored here — use `parseDesignLabShines`.
 */
export function parseDesignLabTokens(
  tokens: Record<string, string> | null | undefined,
): DesignLabColors | null {
  if (!tokens || typeof tokens !== "object" || Array.isArray(tokens)) {
    return null;
  }

  const next: DesignLabColors = { ...LIVE_CHROME_DESIGN_LAB_DEFAULTS };
  let matched = 0;

  for (const { key, cssVar } of DESIGN_LAB_COLOR_FIELDS) {
    const raw = tokens[cssVar];
    if (typeof raw !== "string") {
      continue;
    }

    const normalized = normalizeDesignLabColor(raw);
    if (!normalized || !isValidDesignLabColor(normalized)) {
      continue;
    }

    next[key] = normalized;
    matched += 1;
  }

  if (matched === 0) {
    return null;
  }

  return next;
}

export function parseDesignLabThemeTokens(
  tokens: Record<string, string> | null | undefined,
): {
  colors: DesignLabColors;
  shines: DesignLabShineMap;
  dimensions: DesignLabDimensions;
} | null {
  const colors = parseDesignLabTokens(tokens);
  if (!colors) {
    return null;
  }
  return {
    colors,
    shines: parseDesignLabShines(tokens),
    dimensions: parseDesignLabDimensions(tokens),
  };
}

export function validateDesignLabTokensForSave(
  colors: DesignLabColors,
  shines: DesignLabShineMap = {},
  dimensions: DesignLabDimensions = LIVE_DESIGN_LAB_DIMENSION_DEFAULTS,
): string | null {
  for (const { key, cssVar } of DESIGN_LAB_COLOR_FIELDS) {
    const value = colors[key];
    if (!isValidDesignLabColor(value)) {
      return `Invalid color for ${cssVar}.`;
    }
    const shine = shines[key];
    if (shine && !isValidDesignLabShine(shine)) {
      return `Invalid shine gradient for ${cssVar}.`;
    }
  }

  return validateDesignLabDimensions(dimensions);
}

export { parseDesignLabShines };
