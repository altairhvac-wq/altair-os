/**
 * Altair Design Foundation — semantic token reference.
 *
 * Source of truth: docs/altair/ALTAIR_DESIGN_FOUNDATION.md
 * CSS values live in: app/globals.css (`:root` and `[data-theme="dark"]`)
 *
 * Material → Semantic token → Component → Page
 * ----------------------------------------------
 * A material (Graphite, Stone, Paper, Ink, Brass) never appears directly in a
 * component. It is exposed as one of the semantic roles below, a component
 * consumes the role, and a page composes components — never the reverse. See
 * the README in this folder for the full architecture explanation.
 *
 * Usage
 * -----
 * - In Tailwind classes, prefer the generated utilities directly, e.g.
 *   `bg-altair-paper`, `text-altair-ink-secondary`, `border-altair-border-strong`.
 * - In contexts that need a raw CSS value (inline styles, SVG fills, canvas/
 *   chart libraries), reference the CSS custom property via `altairToken(...)`
 *   or the `--altair-*` variable directly — never hardcode a hex value.
 *
 * This module does not change how any existing component renders. It exists
 * so future migrations have one typed, documented entry point instead of a
 * new hardcoded value per call site.
 */

/** The complete, fixed vocabulary of Altair semantic color roles. No other role names are approved. */
export type AltairSemanticRole =
  | "stone"
  | "paper"
  | "paperElevated"
  | "paperSubtle"
  | "graphite"
  | "ink"
  | "inkSecondary"
  | "inkMuted"
  | "border"
  | "borderStrong"
  | "brass"
  | "brassInteractive"
  | "success"
  | "warning"
  | "danger"
  | "information";

/** Maps each semantic role to its backing CSS custom property name (defined in app/globals.css). */
export const altairTokenVar: Record<AltairSemanticRole, string> = {
  stone: "--altair-stone",
  paper: "--altair-paper",
  paperElevated: "--altair-paper-elevated",
  paperSubtle: "--altair-paper-subtle",
  graphite: "--altair-graphite",
  ink: "--altair-ink",
  inkSecondary: "--altair-ink-secondary",
  inkMuted: "--altair-ink-muted",
  border: "--altair-border",
  borderStrong: "--altair-border-strong",
  brass: "--altair-brass",
  brassInteractive: "--altair-brass-interactive",
  success: "--altair-success",
  warning: "--altair-warning",
  danger: "--altair-danger",
  information: "--altair-information",
};

/**
 * The generated Tailwind utility color name for each role (via `@theme inline`
 * in app/globals.css). Prefer composing the class name directly in components
 * (e.g. `bg-altair-paper`) — this map exists for tooling that needs the string.
 */
export const altairTokenClassName: Record<AltairSemanticRole, string> = {
  stone: "altair-stone",
  paper: "altair-paper",
  paperElevated: "altair-paper-elevated",
  paperSubtle: "altair-paper-subtle",
  graphite: "altair-graphite",
  ink: "altair-ink",
  inkSecondary: "altair-ink-secondary",
  inkMuted: "altair-ink-muted",
  border: "altair-border",
  borderStrong: "altair-border-strong",
  brass: "altair-brass",
  brassInteractive: "altair-brass-interactive",
  success: "altair-success",
  warning: "altair-warning",
  danger: "altair-danger",
  information: "altair-information",
};

/**
 * Returns a `var(--altair-*)` reference for a semantic role, for use in inline
 * styles, SVG attributes, or chart/canvas libraries that cannot consume
 * Tailwind classes. Always resolves against whichever theme scope
 * (`:root` or `[data-theme="dark"]`) the element is rendered under.
 */
export function altairToken(role: AltairSemanticRole): string {
  return `var(${altairTokenVar[role]})`;
}
