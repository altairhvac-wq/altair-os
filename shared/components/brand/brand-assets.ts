/**
 * Altair OS brand asset registry — canonical source paths live in `/branding`.
 * SVG mark geometry is shared between static files and the AltairLogo component.
 *
 * Approved identity: Version 1 luxury black-and-gold North Star (locked June 2026).
 * See `branding/BRAND_GUIDELINES.md` for usage rules. Do not introduce alternate
 * logo concepts without an explicit request.
 */

/** Locked brand identity — Version 1 North Star concept. */
export const ALTAIR_BRAND_IDENTITY = {
  status: "approved" as const,
  version: "v1" as const,
  name: "Luxury North Star",
  message: "Altair is the North Star for service companies.",
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

/**
 * R02 split-spine production mark — fill-only geometry mapped to the 80×80 internal
 * coordinate space used by AltairLogo (source: r02-production-final.svg on a 64×64 grid).
 */
export const ALTAIR_MARK_PATHS = {
  mark: "M37.5 2h5v20H37.5z M37.5 42h5v20H37.5z M40 29.5h25v5H40z M40 14.5l3.75 11.875 11.875 3.125-11.875 3.125-3.75 11.875-3.75-11.875-11.875-3.125 11.875-3.125z",
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
  /** Approved Version 1 concept reference — do not replace without explicit approval. */
  approvedConcept: ALTAIR_BRAND_IDENTITY.approvedConceptReference,
  /** @deprecated Use `approvedConcept` — kept for backward compatibility. */
  conceptReference: ALTAIR_BRAND_IDENTITY.approvedConceptReference,
  primary: "branding/altair-primary.svg",
  icon: "branding/altair-icon.svg",
  gold: "branding/altair-gold.svg",
  white: "branding/altair-white.svg",
  favicon: "branding/favicon.svg",
} as const;

/** Web-served copies under `/public` (mirrors of `branding/` SVGs). */
export const ALTAIR_BRAND_PUBLIC_PATHS = {
  brand: "/brand",
  primary: "/brand/altair-primary.svg",
  icon: "/brand/altair-icon.svg",
  gold: "/brand/altair-gold.svg",
  white: "/brand/altair-white.svg",
  favicon: "/favicon.svg",
} as const;

export type AltairBrandVariant = "primary" | "icon" | "gold" | "white";

/** Recommended usage for each variant (for rollout planning). */
export const ALTAIR_BRAND_USAGE: Record<
  AltairBrandVariant | "favicon",
  { surface: string; notes: string }
> = {
  primary: {
    surface: "Marketing, splash screens, light UI chrome",
    notes:
      "Full stacked mark + ALTAIR wordmark on black. Default brand lockup.",
  },
  icon: {
    surface: "App icon source, compact headers, avatars",
    notes: "Mark only on transparent background. Scales to small sizes.",
  },
  gold: {
    surface: "Dark backgrounds (auth hero, admin desktop header, public footers)",
    notes: "Gold gradient mark + wordmark without black plate.",
  },
  white: {
    surface: "Dark backgrounds requiring flat/mono treatment",
    notes: "Single-color white lockup for max contrast on slate/black.",
  },
  favicon: {
    surface: "Browser tab, PWA shortcut, 32×32 contexts",
    notes: "Mark on black rounded square. Thicker strokes for legibility.",
  },
};
