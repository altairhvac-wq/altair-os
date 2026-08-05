/**
 * Non-color Design Lab controls — radius / shape tokens from `app/globals.css`.
 * Persisted alongside colors in theme token maps (CSS var → value string).
 */

export type DesignLabDimensionKey = "radiusPanel" | "radiusSection";

export type DesignLabDimensions = Record<DesignLabDimensionKey, string>;

export type DesignLabDimensionDef = {
  key: DesignLabDimensionKey;
  cssVar: string;
  label: string;
  helper: string;
  /** Literal default from live globals.css */
  defaultValue: string;
  /** Slider range in rem */
  minRem: number;
  maxRem: number;
  stepRem: number;
};

export const DESIGN_LAB_DIMENSION_DEFS: DesignLabDimensionDef[] = [
  {
    key: "radiusPanel",
    cssVar: "--radius-panel",
    label: "Panel radius",
    helper:
      "Rounded corners on cards / panels (exception cards, admin cards, soft plates).",
    defaultValue: "0.875rem",
    minRem: 0,
    maxRem: 1.5,
    stepRem: 0.0625,
  },
  {
    key: "radiusSection",
    cssVar: "--radius-section",
    label: "Section radius",
    helper:
      "Rounded corners on section plates / MC hub cards / list shells.",
    defaultValue: "0.75rem",
    minRem: 0,
    maxRem: 1.5,
    stepRem: 0.0625,
  },
];

export const DESIGN_LAB_DIMENSION_CSS_VAR_BY_KEY: Record<
  DesignLabDimensionKey,
  string
> = Object.fromEntries(
  DESIGN_LAB_DIMENSION_DEFS.map((def) => [def.key, def.cssVar]),
) as Record<DesignLabDimensionKey, string>;

export const LIVE_DESIGN_LAB_DIMENSION_DEFAULTS: DesignLabDimensions =
  Object.fromEntries(
    DESIGN_LAB_DIMENSION_DEFS.map((def) => [def.key, def.defaultValue]),
  ) as DesignLabDimensions;

const REM_PATTERN = /^(\d+(?:\.\d+)?)rem$/i;
const PX_PATTERN = /^(\d+(?:\.\d+)?)px$/i;

export function parseRemValue(value: string): number | null {
  const trimmed = value.trim();
  const rem = trimmed.match(REM_PATTERN);
  if (rem) {
    const n = Number.parseFloat(rem[1]);
    return Number.isFinite(n) ? n : null;
  }
  const px = trimmed.match(PX_PATTERN);
  if (px) {
    const n = Number.parseFloat(px[1]);
    return Number.isFinite(n) ? n / 16 : null;
  }
  if (trimmed === "0") {
    return 0;
  }
  return null;
}

export function formatRemValue(rem: number): string {
  const clamped = Math.min(1.5, Math.max(0, rem));
  if (clamped === 0) {
    return "0px";
  }
  const rounded = Math.round(clamped * 10000) / 10000;
  return `${rounded}rem`;
}

export function isValidDesignLabDimension(value: string): boolean {
  return parseRemValue(value) != null;
}

export function normalizeDesignLabDimension(value: string): string | null {
  const rem = parseRemValue(value);
  if (rem == null) {
    return null;
  }
  return formatRemValue(rem);
}

export function getDesignLabDimensionDef(
  key: DesignLabDimensionKey,
): DesignLabDimensionDef | undefined {
  return DESIGN_LAB_DIMENSION_DEFS.find((def) => def.key === key);
}

export function parseDesignLabDimensions(
  tokens: Record<string, string> | null | undefined,
): DesignLabDimensions {
  const next: DesignLabDimensions = { ...LIVE_DESIGN_LAB_DIMENSION_DEFAULTS };
  if (!tokens || typeof tokens !== "object") {
    return next;
  }

  for (const def of DESIGN_LAB_DIMENSION_DEFS) {
    const raw = tokens[def.cssVar];
    if (typeof raw !== "string") {
      continue;
    }
    const normalized = normalizeDesignLabDimension(raw);
    if (normalized) {
      next[def.key] = normalized;
    }
  }

  return next;
}

export function serializeDesignLabDimensions(
  dimensions: DesignLabDimensions,
): Record<string, string> {
  const tokens: Record<string, string> = {};
  for (const def of DESIGN_LAB_DIMENSION_DEFS) {
    const normalized =
      normalizeDesignLabDimension(dimensions[def.key]) ?? def.defaultValue;
    tokens[def.cssVar] = normalized;
  }
  return tokens;
}

export function designLabDimensionVars(
  dimensions: DesignLabDimensions,
): Record<string, string> {
  const style: Record<string, string> = {};
  for (const def of DESIGN_LAB_DIMENSION_DEFS) {
    style[def.cssVar] =
      normalizeDesignLabDimension(dimensions[def.key]) ?? def.defaultValue;
  }
  return style;
}

export function validateDesignLabDimensions(
  dimensions: DesignLabDimensions,
): string | null {
  for (const def of DESIGN_LAB_DIMENSION_DEFS) {
    if (!isValidDesignLabDimension(dimensions[def.key])) {
      return `Invalid dimension for ${def.cssVar}.`;
    }
  }
  return null;
}
