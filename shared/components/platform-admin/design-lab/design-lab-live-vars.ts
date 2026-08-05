import { designLabPreviewVars } from "@/shared/components/platform-admin/design-lab/design-lab-preview-vars";
import {
  buildDesignLabShineLiveCss,
} from "@/shared/components/platform-admin/design-lab/design-lab-shine";
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

  return designLabPreviewVars(parsed.colors, parsed.shines, parsed.dimensions);
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
