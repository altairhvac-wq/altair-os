/**
 * Altair OS brand asset registry — canonical source paths live in `/branding`.
 * SVG mark geometry is shared between static files and the AltairLogo component.
 *
 * Approved identity: Version 2 platinum-and-gold gear A-monogram (locked Aug 2026).
 * See `branding/BRAND_GUIDELINES.md` for usage rules. Do not introduce alternate
 * logo concepts without an explicit request.
 */

/** Locked brand identity — Version 2 gear + two-tone concept. */
export const ALTAIR_BRAND_IDENTITY = {
  status: "approved" as const,
  version: "v2" as const,
  name: "Platinum Circuit gear A-monogram",
  message: "Altair is the North Star for service companies.",
  approvedConceptReference: "branding/altair-logo-concept-v2.png",
  /** @deprecated Superseded by the v2 gear mark — kept for historical reference only. */
  previousConceptReference: "branding/altair-logo-concept-v1.png",
  guidelines: "branding/BRAND_GUIDELINES.md",
  attributes: [
    "Precision engineered",
    "Two-tone platinum and gold",
    "Restrained luxury-industrial",
    "Modern",
    "Professional",
    "Gear A-monogram",
    "Guidance",
    "Command center",
    "AI operator",
    "Executive software",
    "High-end SaaS",
  ] as const,
  avoid: [
    "Wrenches",
    "HVAC/snowflake/flame/house icons",
    "Generic contractor imagery",
    "Generic startup gradients",
    "Reintroducing the retired Version 1 North Star mark",
  ] as const,
} as const;

export const ALTAIR_BRAND_COLORS = {
  black: "#0A0A0A",
  // Platinum Circuit palette (Version 2, approved Aug 2026)
  platinumHighlight: "#F0F2F4",
  platinum: "#C8CDD3",
  steel: "#71767D",
  goldAccent: "#D4AF37",
  white: "#FFFFFF",
  // Legacy Version 1 gold ramp — kept so any surface still reading these keys
  // (e.g. cached exports, external consumers) doesn't break. New work should
  // use `goldAccent` + `ALTAIR_GOLD_GRADIENT_STOPS` instead.
  goldHighlight: "#F5E6A3",
  goldMid: "#D4AF37",
  goldDeep: "#9A7209",
  goldBright: "#FBF5B7",
  goldBronze: "#B8860B",
} as const;

export const ALTAIR_GOLD_GRADIENT_STOPS = [
  { offset: "0%", color: ALTAIR_BRAND_COLORS.goldHighlight },
  { offset: "55%", color: ALTAIR_BRAND_COLORS.goldAccent },
  { offset: "100%", color: ALTAIR_BRAND_COLORS.goldDeep },
] as const;

export const ALTAIR_GOLD_GRADIENT_STOPS_BRIGHT = [
  { offset: "0%", color: ALTAIR_BRAND_COLORS.goldBright },
  { offset: "40%", color: ALTAIR_BRAND_COLORS.goldAccent },
  { offset: "100%", color: ALTAIR_BRAND_COLORS.goldBronze },
] as const;

export const ALTAIR_PLATINUM_GRADIENT_STOPS = [
  { offset: "0%", color: ALTAIR_BRAND_COLORS.platinumHighlight },
  { offset: "55%", color: ALTAIR_BRAND_COLORS.platinum },
  { offset: "100%", color: ALTAIR_BRAND_COLORS.steel },
] as const;

/**
 * Version 2 gear A-monogram — split into two fill groups (platinum / gold) so
 * the two-tone treatment renders identically in the static SVGs and in
 * <AltairLogo />. Geometry: an 18-tooth gear ring (gapped at the apex for the
 * A's peak to break through), split left(platinum)/right(gold); the A's left
 * leg is platinum, right leg + crossbar are gold. Authored on a 200×200 grid,
 * centered at (100,100).
 */
export const ALTAIR_MARK_PATHS = {
  platinum:
    "M 100.00,178.00 A 78.00,78.00 0 0 1 100.00,22.00 L 100.00,34.00 A 66.00,66.00 0 0 0 100.00,166.00 Z M 112.87,176.93 L 111.21,191.31 L 88.79,191.31 L 87.13,176.93 Z M 85.79,176.69 L 79.30,189.64 L 58.23,181.97 L 61.59,167.89 Z M 60.41,167.21 L 49.89,177.16 L 32.72,162.74 L 40.69,150.66 Z M 39.81,149.61 L 26.53,155.37 L 15.31,135.95 L 26.94,127.32 Z M 26.47,126.04 L 12.02,126.90 L 8.13,104.81 L 22.00,100.68 Z M 22.00,99.32 L 8.13,95.19 L 12.02,73.10 L 26.47,73.96 Z M 26.94,72.68 L 15.31,64.05 L 26.53,44.63 L 39.81,50.39 Z M 40.69,49.34 L 32.72,37.26 L 49.89,22.84 L 60.41,32.79 Z M 90.19,29.02 L 109.81,38.98 L 45.81,164.98 L 26.19,155.02 Z",
  gold:
    "M 100.00,22.00 A 78.00,78.00 0 0 1 100.00,178.00 L 100.00,166.00 A 66.00,66.00 0 0 0 100.00,34.00 Z M 139.59,32.79 L 150.11,22.84 L 167.28,37.26 L 159.31,49.34 Z M 160.19,50.39 L 173.47,44.63 L 184.69,64.05 L 173.06,72.68 Z M 173.53,73.96 L 187.98,73.10 L 191.87,95.19 L 178.00,99.32 Z M 178.00,100.68 L 191.87,104.81 L 187.98,126.90 L 173.53,126.04 Z M 173.06,127.32 L 184.69,135.95 L 173.47,155.37 L 160.19,149.61 Z M 159.31,150.66 L 167.28,162.74 L 150.11,177.16 L 139.59,167.21 Z M 138.41,167.89 L 141.77,181.97 L 120.70,189.64 L 114.21,176.69 Z M 90.19,38.98 L 109.81,29.02 L 173.81,155.02 L 154.19,164.98 Z M 44.22,120 L 155.78,120 L 163.91,136 L 36.09,136 Z",
  /**
   * @deprecated Flattened single-path fallback (platinum + gold geometry
   * combined, no color split) for any consumer still reading the old
   * singular `.mark` key. New code should render `.platinum` and `.gold`
   * as two separately-filled paths — see <AltairLogo />.
   */
  get mark(): string {
    return `${ALTAIR_MARK_PATHS.platinum} ${ALTAIR_MARK_PATHS.gold}`;
  },
} as const;

export const ALTAIR_WORDMARK = {
  text: "ALTAIR",
  fontFamily: "'Michroma', 'Georgia', sans-serif",
  fontWeight: 400,
  letterSpacing: "0.32em",
} as const;

/** Canonical on-disk asset library (repo root). */
export const ALTAIR_BRAND_LIBRARY = {
  root: "branding",
  /** Approved Version 2 concept reference — do not replace without explicit approval. */
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
      "Full stacked mark + ALTAIR wordmark on black. Default brand lockup. Two-tone platinum/gold.",
  },
  icon: {
    surface: "App icon source, compact headers, avatars",
    notes: "Two-tone mark only on transparent background. Scales to small sizes.",
  },
  gold: {
    surface: "Dark backgrounds (auth hero, admin desktop header, public footers)",
    notes: "Monochrome gold gradient mark + wordmark without black plate.",
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
