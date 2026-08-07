import {
  DESIGN_LAB_COLOR_FIELDS,
  DESIGN_LAB_CSS_VAR_BY_KEY,
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
 * Seed role-split tokens from legacy bundled vars when a saved theme still
 * stores `--north-star-text-light` / `--north-star-text-light-muted` /
 * `--north-star-border` / `--north-star-content-well` only.
 */
function applyLegacyTokenMigrations(
  tokens: Record<string, string>,
  next: DesignLabColors,
): number {
  let seeded = 0;

  const take = (cssVar: string): string | null => {
    const raw = tokens[cssVar];
    if (typeof raw !== "string") return null;
    const normalized = normalizeDesignLabColor(raw);
    if (!normalized || !isValidDesignLabColor(normalized)) return null;
    return normalized;
  };

  const seedIfUnset = (key: keyof DesignLabColors, value: string | null) => {
    if (!value) return;
    if (tokens[DESIGN_LAB_CSS_VAR_BY_KEY[key]]) return;
    next[key] = value;
    seeded += 1;
  };

  const legacyLight = take("--north-star-text-light");
  seedIfUnset("northStarTopbarHeading", legacyLight);
  seedIfUnset("northStarSectionTitle", legacyLight);
  seedIfUnset("northStarLinkHover", legacyLight);

  const legacyMuted = take("--north-star-text-light-muted");
  seedIfUnset("northStarTopbarSubcopy", legacyMuted);
  seedIfUnset("northStarSectionSecondary", legacyMuted);
  seedIfUnset("northStarLink", legacyMuted);
  seedIfUnset("northStarTopbarIcon", legacyMuted);

  const legacyBorder = take("--north-star-border");
  seedIfUnset("northStarSectionDivider", legacyBorder);
  seedIfUnset("northStarPlateBorder", legacyBorder);

  const legacyWell = take("--north-star-content-well");
  seedIfUnset("northStarCaughtUpFill", legacyWell);

  return seeded;
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

  matched += applyLegacyTokenMigrations(tokens, next);

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
