import { designLabPreviewVars } from "@/shared/components/platform-admin/design-lab/design-lab-preview-vars";
import {
  buildDesignLabShineLiveCss,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";
import { restrictToLiveChromeVars } from "@/shared/components/platform-admin/design-lab/design-lab-live-scope";
import { parseDesignLabThemeTokens } from "@/shared/components/platform-admin/design-lab/design-lab-theme-tokens";

/**
 * Build SSR-safe inline CSS custom-property overrides for live admin chrome.
 *
 * Fail closed: unknown / empty / invalid token maps return null so the product
 * keeps default globals.css tokens. Only the Design Lab vocabulary is emitted
 * (same mapping as the Stage 1 preview sandbox), including optional `--*--shine`
 * companions.
 */
export function buildDesignLabLiveStyleVars(
  tokens: Record<string, string> | null | undefined,
): React.CSSProperties | null {
  const parsed = parseDesignLabThemeTokens(tokens);
  if (!parsed) {
    return null;
  }

  /* Chrome only. A promoted theme may restyle the shell's identity; it may not
     redefine the semantic contract (success/warning/danger/information), the
     ink ladder, or the surface foundation every page is built on. See
     design-lab-live-scope.ts for why, and for what was measured leaking. */
  const all = designLabPreviewVars(
    parsed.colors,
    parsed.shines,
    parsed.dimensions,
  ) as unknown as Record<string, string>;

  const chromeOnly = restrictToLiveChromeVars(all);

  /* Keep the fail-closed contract meaningful now that the map is filtered: a
     saved theme consisting only of foundation tokens produces no live chrome,
     and both callers (the shell layout and the promote action) treat null as
     "fall back to source". Returning an empty object instead would let such a
     theme promote successfully and then change nothing. */
  if (Object.keys(chromeOnly).length === 0) {
    return null;
  }

  return chromeOnly as React.CSSProperties;
}

/**
 * Serialize resolved live vars into a small CSS ruleset scoped to the admin
 * shell. Prefer the inline `style` prop on `.admin-north-star-shell` for
 * SSR (no FOUC); this helper is available when a `<style>` block is needed.
 */
export function buildDesignLabLiveStyleBlock(
  tokens: Record<string, string> | null | undefined,
): string | null {
  const style = buildDesignLabLiveStyleVars(tokens);
  if (!style) {
    return null;
  }

  const declarations = Object.entries(style as Record<string, string>)
    .filter(
      ([property, value]) =>
        property.startsWith("--") &&
        typeof value === "string" &&
        value.trim().length > 0,
    )
    .map(([property, value]) => `  ${property}: ${value};`)
    .join("\n");

  if (!declarations) {
    return null;
  }

  return `.admin-north-star-shell {\n${declarations}\n}\n\n${buildDesignLabShineLiveCss()}`;
}

/** Whether the token map includes any shine companions worth applying live. */
export function designLabTokensHaveShine(
  tokens: Record<string, string> | null | undefined,
): boolean {
  if (!tokens) {
    return false;
  }
  return Object.keys(tokens).some((key) => key.endsWith("--shine"));
}

export { buildDesignLabShineLiveCss };
