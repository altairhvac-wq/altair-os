import {
  DESIGN_LAB_TOKEN_DEFS,
  type DesignLabTokenGroupId,
} from "@/shared/components/platform-admin/design-lab/design-lab-defaults";

/**
 * Which Design Lab token groups a promoted theme may apply to the live product.
 *
 * The Design Lab is a legitimate tool — exploring the shell's chrome identity
 * is real product value — but a promoted row was overriding the *foundation*
 * too, and doing it silently. Read off the running product, the live theme was
 * injecting 25 cool values over the warm source palette, among them:
 *
 *   --altair-information        #2563EB   (the generic SaaS blue source removed)
 *   --altair-graphite           #1A2029   (the retired blue-black family)
 *   --altair-ink-muted          #64748B   (stock slate-500)
 *   --north-star-work-text-*    cool greys on every data table
 *
 * So source could not answer "what colour is danger?" — a database row could,
 * per company, and it disagreed. That is the mechanism behind Altair rendering
 * like different products in different environments, and it silently undid
 * accessibility and palette work committed in source.
 *
 * The split below is by what a group *means*, not by convenience:
 *
 * - `chrome`, `sidebar-states`, `text-on-chrome`, `brass` describe the
 *   navigational shell's identity. That is exactly what the Lab exists to
 *   explore, and getting it wrong is recoverable and visible.
 * - `altair-foundation` is the semantic contract — success, warning, danger,
 *   information, the ink ladder, borders. If a theme can redefine "danger",
 *   the product no longer has semantics, it has suggestions.
 * - `surfaces` and `hub-work-tables` are the material foundation every page and
 *   data table is built on. A theme moving those repaints the product, not the
 *   chrome.
 *
 * This filter applies to the LIVE product only. The Design Lab's own preview
 * sandbox still renders every token, so the tool remains fully explorable —
 * what changes is which edits can escape it.
 */
export const DESIGN_LAB_LIVE_APPLIED_GROUPS: readonly DesignLabTokenGroupId[] = [
  "chrome",
  "sidebar-states",
  "text-on-chrome",
  "brass",
];

/** CSS custom properties a promoted theme is allowed to set on the product. */
export const DESIGN_LAB_LIVE_ALLOWED_VARS: ReadonlySet<string> = new Set(
  DESIGN_LAB_TOKEN_DEFS.filter((def) =>
    DESIGN_LAB_LIVE_APPLIED_GROUPS.includes(def.group),
  ).map((def) => def.cssVar),
);

/**
 * Drop foundation-owned properties from a resolved live style map.
 *
 * Dimension and `--*--shine` companions are kept: they are geometry and
 * material finish on the chrome the Lab does own, not semantic colour.
 */
export function restrictToLiveChromeVars(
  style: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [property, value] of Object.entries(style)) {
    if (!property.startsWith("--")) continue;

    // Tailwind mirrors (`--color-altair-*`) shadow the same roles, so they must
    // follow the same rule as the token they mirror.
    const mirrored = property.startsWith("--color-")
      ? `--${property.slice("--color-".length)}`
      : property;

    const isDesignLabColor = DESIGN_LAB_TOKEN_DEFS.some(
      (def) => def.cssVar === mirrored,
    );

    // Paper-anchored ink aliases are derived from foundation ink in the
    // preview; they are foundation for the same reason.
    const isPaperInkAlias = /^--(color-)?altair-ink-on-paper/.test(property);

    if (isPaperInkAlias) continue;
    if (isDesignLabColor && !DESIGN_LAB_LIVE_ALLOWED_VARS.has(mirrored)) continue;

    out[property] = value;
  }
  return out;
}
