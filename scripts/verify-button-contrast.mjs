#!/usr/bin/env node
/**
 * Deterministic contrast verification for the canonical Button primitive.
 *
 * Reads the actual `--altair-*` custom property values out of
 * app/globals.css (both `:root` and `[data-theme="dark"]`) and checks the
 * exact semantic pairings shared/design-system/components/Button.tsx uses
 * for each variant's resting text-on-background pair, in both themes.
 *
 * This does not reimplement Button's rendering logic — it only re-derives
 * the token pairs Button.tsx declares in `variantClass` and measures them
 * against the WCAG 2.x contrast formula. A failing pairing here means
 * Button.tsx (or app/globals.css) drifted from the audited contrast
 * evidence and must be fixed before merging.
 *
 * Usage: node scripts/verify-button-contrast.mjs
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GLOBALS_CSS_PATH = path.resolve(__dirname, "..", "app", "globals.css");

const TEXT_THRESHOLD = 4.5;
const NON_TEXT_THRESHOLD = 3.0;

function extractBlock(css, selectorPattern) {
  const regex = new RegExp(`${selectorPattern}\\s*{([^}]*)}`, "g");
  const merged = {};
  let match;
  while ((match = regex.exec(css)) !== null) {
    const body = match[1];
    const varRegex = /(--altair-[\w-]+)\s*:\s*([^;]+);/g;
    let varMatch;
    while ((varMatch = varRegex.exec(body)) !== null) {
      merged[varMatch[1]] = varMatch[2].trim();
    }
  }
  return merged;
}

function parseHex(value) {
  const hexMatch = /^#([0-9a-fA-F]{6})$/.exec(value);
  if (!hexMatch) return null;
  const int = parseInt(hexMatch[1], 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Parses `rgb(r g b / a)` (the format app/globals.css uses for translucent tokens). */
function parseRgbSlashAlpha(value) {
  const m = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([\d.]+)\s*\)$/.exec(value);
  if (!m) return null;
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], alpha: Number(m[4]) };
}

function resolveOpaqueRgb(value, backdropRgb) {
  const hex = parseHex(value);
  if (hex) return hex;
  const translucent = parseRgbSlashAlpha(value);
  if (translucent) {
    if (!backdropRgb) {
      throw new Error(`Translucent token "${value}" requires a backdrop to resolve to an opaque color.`);
    }
    const { rgb, alpha } = translucent;
    return rgb.map((c, i) => c * alpha + backdropRgb[i] * (1 - alpha));
  }
  throw new Error(`Unrecognized color format: "${value}"`);
}

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]) {
  const [R, G, B] = [r, g, b].map(srgbToLinear);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(rgbA, rgbB) {
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

const css = readFileSync(GLOBALS_CSS_PATH, "utf8");
const lightTokens = extractBlock(css, ":root");
const darkTokens = extractBlock(css, '\\[data-theme="dark"\\]');

function tokenValue(themeTokens, name) {
  const value = themeTokens[name];
  if (!value) {
    throw new Error(`Token "${name}" not found in parsed globals.css block.`);
  }
  return value;
}

/**
 * `--altair-paper-subtle` is a solid pale color in `:root` but a translucent
 * ivory wash in `[data-theme="dark"]` (see altair-tokens README — it is
 * designed to tint whatever dark surface it sits on, not render as a flat
 * color). Button's Secondary/Quiet variants are documented as resting on a
 * Graphite-family surface in dark contexts (see the design-lab "Graphite
 * context" demo), so that is the backdrop used to resolve it here.
 */
const DARK_AMBIENT_BACKDROP = parseHex(tokenValue(darkTokens, "--altair-graphite"));

function resolve(themeTokens, name, backdropRgb) {
  return resolveOpaqueRgb(tokenValue(themeTokens, name), backdropRgb);
}

const checks = [
  {
    label: "Primary — text-altair-paper on bg-altair-graphite",
    threshold: TEXT_THRESHOLD,
    themes: {
      light: () => [resolve(lightTokens, "--altair-paper"), resolve(lightTokens, "--altair-graphite")],
      dark: () => [resolve(darkTokens, "--altair-paper"), resolve(darkTokens, "--altair-graphite")],
    },
  },
  {
    label: "Secondary — text-altair-ink on bg-altair-paper-subtle",
    threshold: TEXT_THRESHOLD,
    themes: {
      light: () => [resolve(lightTokens, "--altair-ink"), resolve(lightTokens, "--altair-paper-subtle")],
      dark: () => [
        resolve(darkTokens, "--altair-ink"),
        resolve(darkTokens, "--altair-paper-subtle", DARK_AMBIENT_BACKDROP),
      ],
    },
  },
  {
    label: "Secondary hover — text-altair-ink on bg-altair-stone",
    threshold: TEXT_THRESHOLD,
    themes: {
      light: () => [resolve(lightTokens, "--altair-ink"), resolve(lightTokens, "--altair-stone")],
      dark: () => [resolve(darkTokens, "--altair-ink"), resolve(darkTokens, "--altair-stone")],
    },
  },
  {
    label: "Destructive — text-altair-danger-foreground on bg-altair-danger-surface",
    threshold: TEXT_THRESHOLD,
    themes: {
      light: () => [
        resolve(lightTokens, "--altair-danger-foreground"),
        resolve(lightTokens, "--altair-danger-surface"),
      ],
      dark: () => [
        resolve(darkTokens, "--altair-danger-foreground"),
        resolve(darkTokens, "--altair-danger-surface"),
      ],
    },
  },
  {
    label: "Quiet (resting) — text-altair-ink-secondary on ambient Paper backdrop",
    threshold: TEXT_THRESHOLD,
    themes: {
      light: () => [resolve(lightTokens, "--altair-ink-secondary"), resolve(lightTokens, "--altair-paper")],
      dark: () => [resolve(darkTokens, "--altair-ink-secondary"), DARK_AMBIENT_BACKDROP],
    },
  },
  {
    label: "Primary focus ring — ring-altair-paper on ring-offset-altair-graphite (non-text, ≥3:1)",
    threshold: NON_TEXT_THRESHOLD,
    themes: {
      light: () => [resolve(lightTokens, "--altair-paper"), resolve(lightTokens, "--altair-graphite")],
      dark: () => [resolve(darkTokens, "--altair-paper"), resolve(darkTokens, "--altair-graphite")],
    },
  },
  {
    label: "Secondary/Quiet focus ring — ring-altair-ink on ring-offset-altair-paper-subtle (non-text, ≥3:1)",
    threshold: NON_TEXT_THRESHOLD,
    themes: {
      light: () => [resolve(lightTokens, "--altair-ink"), resolve(lightTokens, "--altair-paper-subtle")],
      dark: () => [
        resolve(darkTokens, "--altair-ink"),
        resolve(darkTokens, "--altair-paper-subtle", DARK_AMBIENT_BACKDROP),
      ],
    },
  },
  {
    label: "Destructive focus ring — ring-altair-danger-foreground on ring-offset-altair-danger-surface (non-text, ≥3:1)",
    threshold: NON_TEXT_THRESHOLD,
    themes: {
      light: () => [
        resolve(lightTokens, "--altair-danger-foreground"),
        resolve(lightTokens, "--altair-danger-surface"),
      ],
      dark: () => [
        resolve(darkTokens, "--altair-danger-foreground"),
        resolve(darkTokens, "--altair-danger-surface"),
      ],
    },
  },
  {
    label: "Primary hover/active border accent — border-altair-brass-interactive on bg-altair-graphite (non-text, ≥3:1)",
    threshold: NON_TEXT_THRESHOLD,
    themes: {
      light: () => [resolve(lightTokens, "--altair-brass-interactive"), resolve(lightTokens, "--altair-graphite")],
      dark: () => [resolve(darkTokens, "--altair-brass-interactive"), resolve(darkTokens, "--altair-graphite")],
    },
  },
  {
    label: "Disabled — text-altair-ink-muted on bg-altair-paper-subtle (WCAG-exempt for disabled controls; reported for visibility)",
    threshold: null,
    themes: {
      light: () => [resolve(lightTokens, "--altair-ink-muted"), resolve(lightTokens, "--altair-paper-subtle")],
      dark: () => [
        resolve(darkTokens, "--altair-ink-muted"),
        resolve(darkTokens, "--altair-paper-subtle", DARK_AMBIENT_BACKDROP),
      ],
    },
  },
];

let hasFailure = false;
const rows = [];

for (const check of checks) {
  for (const theme of ["light", "dark"]) {
    const [fg, bg] = check.themes[theme]();
    const ratio = contrastRatio(fg, bg);
    const passed = check.threshold === null ? null : ratio >= check.threshold;
    if (passed === false) hasFailure = true;
    rows.push({
      label: check.label,
      theme,
      ratio: ratio.toFixed(2),
      threshold: check.threshold === null ? "exempt" : check.threshold.toFixed(1),
      result: passed === null ? "N/A (exempt)" : passed ? "PASS" : "FAIL",
    });
  }
}

const labelWidth = Math.max(...rows.map((r) => r.label.length));
console.log("Altair Button contrast verification\n");
for (const row of rows) {
  console.log(
    `[${row.result.padEnd(12)}] ${row.label.padEnd(labelWidth)}  theme=${row.theme.padEnd(5)}  ratio=${row.ratio}  threshold=${row.threshold}`,
  );
}

console.log("");
if (hasFailure) {
  console.error("FAILED: one or more Button token pairings do not meet their contrast threshold.");
  process.exit(1);
}
console.log("PASSED: every checked Button token pairing meets its contrast threshold.");
