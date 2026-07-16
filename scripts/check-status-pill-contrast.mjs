/**
 * Altair Design Foundation — Status Pill semantic-token contrast check.
 *
 * Verifies WCAG contrast for the status foreground/surface token pairs
 * introduced by the Status Pill token pilot (see
 * shared/design-system/components/StatusPill.tsx and
 * shared/design-system/foundation/README.md). Reads the actual CSS custom
 * property values from app/globals.css rather than duplicating them here, so
 * this stays a check on the real tokens rather than a self-fulfilling
 * mirror of the component's tone map.
 *
 * Run: node scripts/check-status-pill-contrast.mjs
 */

import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const GLOBALS_CSS = path.join(ROOT, "app", "globals.css");

const NORMAL_TEXT_MIN_CONTRAST = 4.5;

// globals.css declares `:root { ... }` more than once (legacy tokens, then
// the Altair Design Foundation tokens). Concatenate every block matching the
// selector rather than assuming there is exactly one.
function extractScope(css, selector) {
  const blocks = [];
  let searchFrom = 0;
  while (true) {
    const start = css.indexOf(`${selector} {`, searchFrom);
    if (start === -1) break;
    const openBrace = css.indexOf("{", start);
    let depth = 0;
    let end = openBrace;
    for (let i = openBrace; i < css.length; i++) {
      if (css[i] === "{") depth++;
      if (css[i] === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    blocks.push(css.slice(openBrace + 1, end));
    searchFrom = end + 1;
  }
  if (blocks.length === 0) throw new Error(`Could not find "${selector} {" in globals.css`);
  return blocks.join("\n");
}

function parseTokens(scopeText) {
  const tokens = {};
  const re = /--(altair-[a-z0-9-]+):\s*([^;]+);/g;
  let match;
  while ((match = re.exec(scopeText))) {
    tokens[match[1]] = match[2].trim();
  }
  return tokens;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const bigint = parseInt(h, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

// Handles plain #hex tokens and simple "var(--other-token)" indirection.
function resolveColor(value, tokens, seen = new Set()) {
  const trimmed = value.trim();
  const varMatch = trimmed.match(/^var\(--(altair-[a-z0-9-]+)\)$/);
  if (varMatch) {
    if (seen.has(varMatch[1])) throw new Error(`Circular token reference: ${varMatch[1]}`);
    seen.add(varMatch[1]);
    return resolveColor(tokens[varMatch[1]], tokens, seen);
  }
  if (trimmed.startsWith("#")) return hexToRgb(trimmed);
  throw new Error(`Unsupported color value for contrast check: ${trimmed}`);
}

function channelLum(c) {
  const cs = c / 255;
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relLum({ r, g, b }) {
  return 0.2126 * channelLum(r) + 0.7152 * channelLum(g) + 0.0722 * channelLum(b);
}

function contrast(c1, c2) {
  const L1 = relLum(c1);
  const L2 = relLum(c2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

const css = fs.readFileSync(GLOBALS_CSS, "utf8");
const rootTokens = parseTokens(extractScope(css, ":root"));
const darkTokens = parseTokens(extractScope(css, '[data-theme="dark"]'));

// Status Pill pairings: [tone label, foreground token, surface token]
const statusPairs = [
  ["success", "altair-success-foreground", "altair-success-surface"],
  ["warning", "altair-warning-foreground", "altair-warning-surface"],
  ["danger", "altair-danger-foreground", "altair-danger-surface"],
  ["information", "altair-information-foreground", "altair-information-surface"],
];

// Paper-card surfaces a status pill may realistically render directly on,
// checked as the worst case in addition to the pill's own surface token.
// `altair-paper-subtle` is deliberately excluded: it plays Canvas (the
// resting page plane), not a card surface, and in the dark scope it is a
// dark translucent overlay on Graphite — a different role entirely from the
// Paper-anchored, theme-invariant foreground/surface pair being checked here.
const paperFamilyTokens = ["altair-paper", "altair-paper-elevated"];

let allPassed = true;

function check(themeLabel, tokens, paperSubtleOverride) {
  console.log(`\n${themeLabel}`);
  console.log("-".repeat(themeLabel.length));

  for (const [tone, fgKey, surfaceKey] of statusPairs) {
    const fg = resolveColor(tokens[fgKey], tokens);
    const surface = resolveColor(tokens[surfaceKey], tokens);
    const results = [[surfaceKey, contrast(fg, surface)]];

    for (const bgKey of paperFamilyTokens) {
      const bg =
        bgKey === "altair-paper-subtle" && paperSubtleOverride
          ? paperSubtleOverride
          : resolveColor(tokens[bgKey], tokens);
      results.push([bgKey, contrast(fg, bg)]);
    }

    const worst = Math.min(...results.map(([, ratio]) => ratio));
    const pass = worst >= NORMAL_TEXT_MIN_CONTRAST;
    allPassed = allPassed && pass;

    console.log(`  ${tone.padEnd(12)} ${fgKey} vs:`);
    for (const [bgKey, ratio] of results) {
      console.log(`      ${bgKey.padEnd(24)} ${ratio.toFixed(2)}:1`);
    }
    console.log(
      `      worst case: ${worst.toFixed(2)}:1  (>= ${NORMAL_TEXT_MIN_CONTRAST}:1 required)  ${pass ? "PASS" : "FAIL"}`,
    );
  }

  // Neutral tone: ink-secondary on paper-subtle.
  const ink = resolveColor(tokens["altair-ink-secondary"], tokens);
  const subtle = paperSubtleOverride ?? resolveColor(tokens["altair-paper-subtle"], tokens);
  const neutralRatio = contrast(ink, subtle);
  const neutralPass = neutralRatio >= NORMAL_TEXT_MIN_CONTRAST;
  allPassed = allPassed && neutralPass;
  console.log(`  neutral      altair-ink-secondary vs altair-paper-subtle: ${neutralRatio.toFixed(2)}:1  ${neutralPass ? "PASS" : "FAIL"}`);
}

check("Light theme (:root)", rootTokens);

// Dark theme's --altair-paper-subtle is translucent white composited over
// Graphite (rgb(255 255 255 / 0.06)); resolve that composite explicitly
// since resolveColor() only understands opaque #hex / var() values.
const darkPaperSubtleRaw = darkTokens["altair-paper-subtle"];
const rgbAlphaMatch = darkPaperSubtleRaw.match(
  /rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([0-9.]+)\s*\)/,
);
let darkPaperSubtleComposite;
if (rgbAlphaMatch) {
  const [, r, g, b, a] = rgbAlphaMatch.map(Number);
  const alpha = a;
  const backdrop = resolveColor(darkTokens["altair-graphite"], darkTokens);
  darkPaperSubtleComposite = {
    r: r * alpha + backdrop.r * (1 - alpha),
    g: g * alpha + backdrop.g * (1 - alpha),
    b: b * alpha + backdrop.b * (1 - alpha),
  };
}

check("Dark theme ([data-theme=\"dark\"])", darkTokens, darkPaperSubtleComposite);

console.log(`\nOverall: ${allPassed ? "PASS" : "FAIL"}`);
process.exit(allPassed ? 0 : 1);
