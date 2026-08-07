/**
 * Per-token shine / gradient support for Design Lab.
 *
 * Serialization (Stage 2/3):
 * - Base token var stays a solid color (`--north-star-gold: #C9A44D`) so every
 *   existing `color` / `border-color` / `background-color` consumer keeps working.
 * - Optional companion `--{var}--shine` stores a full `linear-gradient(...)`.
 * - Flat mode omits the companion key (or clears it on save).
 *
 * Application by paint role:
 * - fill  → background-color + background-image: var(--x--shine, none)
 * - stroke → border-image (sharp chrome; border-radius is suppressed while set)
 * - ink   → background-clip:text (preview + opted-in live selectors only;
 *           solid color remains the accessibility fallback)
 */

import {
  DESIGN_LAB_CSS_VAR_BY_KEY,
  DESIGN_LAB_TOKEN_DEFS,
  formatDesignLabColorFromChannels,
  isValidDesignLabColor,
  normalizeDesignLabColor,
  parseDesignLabColorChannels,
  type DesignLabColorKey,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

export type DesignLabShine = {
  /** Gradient angle in degrees (0–360). */
  angle: number;
  /** Color stop at 0%. */
  from: string;
  /** Color stop at 100%. */
  to: string;
};

export type DesignLabShineMap = Partial<Record<DesignLabColorKey, DesignLabShine>>;

export type DesignLabTokenPaintRole = "fill" | "stroke" | "ink";

const SHINE_SUFFIX = "--shine";

const STROKE_KEYS = new Set<DesignLabColorKey>([
  "northStarBorder",
  "northStarSectionDivider",
  "northStarPlateBorder",
  "northStarBrassRing",
  "altairBorder",
  "altairBorderStrong",
  "northStarWorkBorder",
  "northStarWorkBorderStrong",
  "borderSubtle",
  "borderStrong",
]);

const INK_KEYS = new Set<DesignLabColorKey>([
  "northStarTopbarHeading",
  "northStarSectionTitle",
  "northStarLinkHover",
  "northStarTopbarSubcopy",
  "northStarSectionSecondary",
  "northStarLink",
  "northStarTopbarIcon",
  "northStarIvory",
  "northStarIvoryStrong",
  "northStarTextDark",
  "northStarTextSecondary",
  "northStarTextMuted",
  "northStarSidebarLink",
  "northStarSidebarLinkHover",
  "northStarSidebarLinkActive",
  "northStarSidebarIcon",
  "northStarSidebarIconHover",
  "northStarSidebarIconActive",
  "northStarSidebarLabel",
  "altairInk",
  "altairInkSecondary",
  "altairInkMuted",
  "altairSuccessForeground",
  "altairWarningForeground",
  "altairDangerForeground",
  "altairInformationForeground",
  "northStarWorkText",
  "northStarWorkTextSecondary",
  "northStarWorkTextMuted",
  "northStarWorkPlaceholder",
]);

export function designLabShineCssVar(cssVar: string): string {
  return `${cssVar}${SHINE_SUFFIX}`;
}

export function isDesignLabShineCssVar(name: string): boolean {
  return name.endsWith(SHINE_SUFFIX);
}

export function baseCssVarFromShineVar(shineVar: string): string | null {
  if (!isDesignLabShineCssVar(shineVar)) {
    return null;
  }
  return shineVar.slice(0, -SHINE_SUFFIX.length);
}

export function getDesignLabTokenPaintRole(
  key: DesignLabColorKey,
): DesignLabTokenPaintRole {
  if (STROKE_KEYS.has(key)) {
    return "stroke";
  }
  if (INK_KEYS.has(key)) {
    return "ink";
  }
  return "fill";
}

export function clampShineAngle(angle: number): number {
  if (!Number.isFinite(angle)) {
    return 165;
  }
  const normalized = ((Math.round(angle) % 360) + 360) % 360;
  return normalized;
}

export function formatDesignLabShineGradient(shine: DesignLabShine): string {
  const angle = clampShineAngle(shine.angle);
  const from = normalizeDesignLabColor(shine.from) ?? shine.from.trim();
  const to = normalizeDesignLabColor(shine.to) ?? shine.to.trim();
  return `linear-gradient(${angle}deg, ${from} 0%, ${to} 100%)`;
}

const GRADIENT_PATTERN =
  /^linear-gradient\(\s*([\d.]+)deg\s*,\s*(.+?)\s+0%\s*,\s*(.+?)\s+100%\s*\)$/i;

export function parseDesignLabShineGradient(
  value: string,
): DesignLabShine | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "none") {
    return null;
  }

  const match = trimmed.match(GRADIENT_PATTERN);
  if (!match) {
    return null;
  }

  const from = normalizeDesignLabColor(match[2]);
  const to = normalizeDesignLabColor(match[3]);
  if (!from || !to || !isValidDesignLabColor(from) || !isValidDesignLabColor(to)) {
    return null;
  }

  return {
    angle: clampShineAngle(Number.parseFloat(match[1])),
    from,
    to,
  };
}

export function parseDesignLabShines(
  tokens: Record<string, string> | null | undefined,
): DesignLabShineMap {
  const shines: DesignLabShineMap = {};
  if (!tokens || typeof tokens !== "object") {
    return shines;
  }

  for (const def of DESIGN_LAB_TOKEN_DEFS) {
    const raw = tokens[designLabShineCssVar(def.cssVar)];
    if (typeof raw !== "string") {
      continue;
    }
    const parsed = parseDesignLabShineGradient(raw);
    if (parsed) {
      shines[def.key] = parsed;
    }
  }

  return shines;
}

export function isValidDesignLabShine(shine: DesignLabShine): boolean {
  return (
    Number.isFinite(shine.angle) &&
    isValidDesignLabColor(shine.from) &&
    isValidDesignLabColor(shine.to)
  );
}

/** Default 2-stop shine seeded from the current flat color. */
export function defaultShineFromColor(color: string): DesignLabShine {
  const base = normalizeDesignLabColor(color) ?? "#B88A2E";
  const channels = parseDesignLabColorChannels(base);
  const to = channels
    ? formatDesignLabColorFromChannels({
        r: Math.max(0, channels.r * 0.62),
        g: Math.max(0, channels.g * 0.62),
        b: Math.max(0, channels.b * 0.62),
        a: channels.a,
      })
    : base;
  return {
    angle: 165,
    from: base,
    to,
  };
}

/** Inline fill style that respects an optional shine companion var. */
export function designLabFillStyle(cssVar: string): React.CSSProperties {
  return {
    backgroundColor: `var(${cssVar})`,
    backgroundImage: `var(${designLabShineCssVar(cssVar)}, none)`,
  };
}

/** Inline stroke style — border-image when shine is present. */
export function designLabStrokeStyle(cssVar: string): React.CSSProperties {
  return {
    borderColor: `var(${cssVar})`,
    borderImageSource: `var(${designLabShineCssVar(cssVar)}, none)`,
    borderImageSlice: 1,
  };
}

/**
 * Ink shine via background-clip:text. Keep a solid color fallback for forced
 * colors / when shine is unset. Low-contrast gradient stops can hurt
 * readability — prefer strong stop contrast when enabling ink shine.
 */
export function designLabInkShineStyle(cssVar: string): React.CSSProperties {
  return {
    color: `var(${cssVar})`,
    backgroundImage: `var(${designLabShineCssVar(cssVar)}, none)`,
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    // Transparent fill only when a shine image paints; otherwise color shows.
    // Browsers treat `background-image: none` + clip as solid color text.
  };
}

/** CSS custom-property bag for all configured shines. */
export function designLabShineVars(
  shines: DesignLabShineMap,
): Record<string, string> {
  const style: Record<string, string> = {};

  for (const [key, shine] of Object.entries(shines) as [
    DesignLabColorKey,
    DesignLabShine,
  ][]) {
    if (!shine || !isValidDesignLabShine(shine)) {
      continue;
    }
    const cssVar = DESIGN_LAB_CSS_VAR_BY_KEY[key];
    style[designLabShineCssVar(cssVar)] = formatDesignLabShineGradient(shine);
  }

  return style;
}

/**
 * Live CSS rules that apply shine companions onto known chrome planes.
 * Safe when companions are unset (`none` fallback).
 */
export function buildDesignLabShineLiveCss(): string {
  return `
/* Fill planes — background-image overlays solid base color when --*--shine is set */
.admin-north-star-shell[data-design-lab-live="true"].admin-canvas,
.admin-north-star-shell[data-design-lab-live="true"].admin-shell-canvas {
  background-color: var(--north-star-root);
  background-image: var(--north-star-root--shine, none);
}
.admin-north-star-shell[data-design-lab-live="true"] .admin-north-star-sidebar {
  background-color: var(--north-star-sidebar);
  background-image: var(--north-star-sidebar--shine, none);
  border-image-source: var(--north-star-border--shine, none);
  border-image-slice: 1;
}
.admin-north-star-shell[data-design-lab-live="true"] .admin-premium-header {
  background-color: var(--north-star-topbar);
  background-image: var(--north-star-topbar--shine, none);
}
.admin-north-star-shell[data-design-lab-live="true"] .admin-shell-main {
  background-color: var(--north-star-content-well);
  background-image: var(--north-star-content-well--shine, none);
}
.admin-north-star-shell[data-design-lab-live="true"] .admin-page-header {
  background-color: var(--north-star-header-strip);
  background-image: var(--north-star-header-strip--shine, none);
  border-image-source: var(--north-star-border--shine, none);
  border-image-slice: 1;
}
.admin-north-star-shell[data-design-lab-live="true"] .admin-north-star-sidebar-rail {
  background-color: var(--north-star-brass-rail);
  background-image: var(--north-star-brass-rail--shine, none);
}
/* Brass / gold accents that use background-color utilities */
.admin-north-star-shell[data-design-lab-live="true"] .north-star-header-avatar {
  background-color: var(--north-star-gold);
  background-image: var(--north-star-gold--shine, none);
}
`.trim();
}
