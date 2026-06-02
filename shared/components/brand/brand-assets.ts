/**
 * Altair OS brand asset registry — canonical source paths live in `/branding`.
 *
 * Approved identity: Version 1 luxury black-and-gold North Star (locked June 2026).
 * **Canonical primary asset:** `branding/altair-logo-concept-v1.png` — all high-impact
 * UI surfaces should use `<AltairBrandMark />` (WebP crops derived from this file).
 *
 * Flat SVG variants and `<AltairLogo />` are secondary fallbacks for compact operational
 * UI only (technician shell, document footers, favicon source). Do not use them for
 * auth hero, admin header, or other primary brand moments.
 *
 * See `branding/BRAND_GUIDELINES.md` for usage rules.
 */

/** Locked brand identity — Version 1 North Star concept. */
export const ALTAIR_BRAND_IDENTITY = {
  status: "approved" as const,
  version: "v1" as const,
  name: "Luxury North Star",
  message: "Altair is the North Star for service companies.",
  /** Canonical primary brand asset — source of truth for all production lockups. */
  canonicalPrimary: "branding/altair-logo-concept-v1.png",
  approvedConceptReference: "branding/altair-logo-concept-v1.png",
  guidelines: "branding/BRAND_GUIDELINES.md",
  attributes: [
    "Luxury",
    "Premium",
    "Modern",
    "Professional",
    "Black and gold",
    "North Star",
    "Guidance",
    "Command center",
    "AI operator",
    "Executive software",
    "High-end SaaS",
  ] as const,
  avoid: [
    "Wrenches",
    "Gears",
    "HVAC icons",
    "Snowflakes",
    "Flames",
    "Houses",
    "Generic contractor imagery",
    "Generic startup gradients",
  ] as const,
} as const;

export const ALTAIR_BRAND_COLORS = {
  black: "#0A0A0A",
  goldHighlight: "#F5E6A3",
  goldMid: "#D4AF37",
  goldDeep: "#9A7209",
  goldBright: "#FBF5B7",
  goldBronze: "#B8860B",
  white: "#FFFFFF",
} as const;

export const ALTAIR_GOLD_GRADIENT_STOPS = [
  { offset: "0%", color: ALTAIR_BRAND_COLORS.goldHighlight },
  { offset: "42%", color: ALTAIR_BRAND_COLORS.goldMid },
  { offset: "100%", color: ALTAIR_BRAND_COLORS.goldDeep },
] as const;

export const ALTAIR_GOLD_GRADIENT_STOPS_BRIGHT = [
  { offset: "0%", color: ALTAIR_BRAND_COLORS.goldBright },
  { offset: "40%", color: ALTAIR_BRAND_COLORS.goldMid },
  { offset: "100%", color: ALTAIR_BRAND_COLORS.goldBronze },
] as const;

/** Shared vector paths for the stylized A + North Star mark (viewBox 0 0 80 80). */
export const ALTAIR_MARK_PATHS = {
  letter: "M40 6L62 58H54L48 40H32L26 58H18L40 6Z",
  star: "M40 26L43.2 36.5L54 38L43.2 39.5L40 50L36.8 39.5L26 38L36.8 36.5L40 26Z",
  horizon: "M28 38.5Q40 42.5 52 38.5",
} as const;

export const ALTAIR_WORDMARK = {
  text: "ALTAIR",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontWeight: 600,
  letterSpacing: "0.38em",
} as const;

/** Canonical on-disk asset library (repo root). */
export const ALTAIR_BRAND_LIBRARY = {
  root: "branding",
  /** Approved Version 1 concept — canonical primary; do not replace without explicit approval. */
  approvedConcept: ALTAIR_BRAND_IDENTITY.canonicalPrimary,
  /** @deprecated Use `approvedConcept` — kept for backward compatibility. */
  conceptReference: ALTAIR_BRAND_IDENTITY.canonicalPrimary,
  /** Secondary flat SVG lockups — not for primary brand moments. */
  primary: "branding/altair-primary.svg",
  icon: "branding/altair-icon.svg",
  gold: "branding/altair-gold.svg",
  white: "branding/altair-white.svg",
  favicon: "branding/favicon.svg",
} as const;

/** Web-served brand assets under `/public/brand`. */
export const ALTAIR_BRAND_PUBLIC_PATHS = {
  brand: "/brand",
  /** Full approved concept reference sheet (repo mirror). */
  conceptReference: "/brand/altair-logo-concept-v1.png",
  /** Primary lockup crop — auth hero, mobile brand strip, branded loading. */
  conceptHero: "/brand/altair-concept-v1-hero.webp",
  /** Squircle mark crop — compact header / icon contexts. */
  conceptMark: "/brand/altair-concept-v1-mark.webp",
  /** Star + ALTAIR wordmark crop — desktop admin header. */
  conceptWordmark: "/brand/altair-concept-v1-wordmark.webp",
  /** @deprecated Secondary SVG lockups — compact operational UI only. */
  primary: "/brand/altair-primary.svg",
  icon: "/brand/altair-icon.svg",
  gold: "/brand/altair-gold.svg",
  white: "/brand/altair-white.svg",
  favicon: "/favicon.svg",
} as const;

/** Presentations cropped from `altair-logo-concept-v1.png` for in-app use. */
export type AltairBrandPresentation =
  | "hero"
  | "headerMark"
  | "headerWordmark"
  | "loader";

export const ALTAIR_BRAND_MARK_PRESENTATIONS: Record<
  AltairBrandPresentation,
  {
    src: string;
    intrinsicWidth: number;
    intrinsicHeight: number;
    sizes: string;
    notes: string;
  }
> = {
  hero: {
    src: ALTAIR_BRAND_PUBLIC_PATHS.conceptHero,
    intrinsicWidth: 704,
    intrinsicHeight: 580,
    sizes: "(max-width: 768px) 200px, 240px",
    notes: "Full primary lockup with black plate, mark, and ALTAIR wordmark.",
  },
  loader: {
    src: ALTAIR_BRAND_PUBLIC_PATHS.conceptHero,
    intrinsicWidth: 704,
    intrinsicHeight: 580,
    sizes: "(max-width: 768px) 180px, 220px",
    notes: "Same primary lockup — used on auth/setup loading surfaces.",
  },
  headerMark: {
    src: ALTAIR_BRAND_PUBLIC_PATHS.conceptMark,
    intrinsicWidth: 210,
    intrinsicHeight: 210,
    sizes: "32px",
    notes: "Squircle mark from concept sheet — mobile admin header.",
  },
  headerWordmark: {
    src: ALTAIR_BRAND_PUBLIC_PATHS.conceptWordmark,
    intrinsicWidth: 220,
    intrinsicHeight: 210,
    sizes: "128px",
    notes: "Star + ALTAIR wordmark from concept sheet — desktop admin header.",
  },
};

export type AltairBrandVariant = "primary" | "icon" | "gold" | "white";

/** Recommended usage for each variant (for rollout planning). */
export const ALTAIR_BRAND_USAGE: Record<
  AltairBrandVariant | "favicon" | "concept",
  { surface: string; notes: string; tier: "primary" | "secondary" }
> = {
  concept: {
    surface: "Auth hero, admin header, branded loading, marketing",
    notes:
      "Approved concept-v1 PNG and WebP crops via <AltairBrandMark />. Canonical primary.",
    tier: "primary",
  },
  primary: {
    surface: "Legacy / export only",
    notes:
      "Flat SVG approximation. Secondary — do not use for auth, header, or splash.",
    tier: "secondary",
  },
  icon: {
    surface: "App icon source, compact operational UI",
    notes: "Mark only on transparent background. Secondary vector fallback.",
    tier: "secondary",
  },
  gold: {
    surface: "Public document footers, technician shell",
    notes: "Gold gradient without black plate. Secondary vector fallback.",
    tier: "secondary",
  },
  white: {
    surface: "Dark backgrounds requiring flat/mono treatment",
    notes: "Single-color white lockup. Secondary vector fallback.",
    tier: "secondary",
  },
  favicon: {
    surface: "Browser tab, PWA shortcut, 32×32 contexts",
    notes: "Mark on black rounded square. Simplified; keep for favicon/app icon.",
    tier: "secondary",
  },
};
