/**
 * Contrast gate for the Prestige palette.
 *
 * Premium must not cost accessibility. This checks every text/ground pair the
 * foundation introduces or changes against WCAG AA, and is meant to be re-run
 * whenever a canonical role is retuned.
 *
 *   node ui-audit/contrast-check.mjs
 */
const hex = (h) => {
  const v = h.replace("#", "");
  const n = parseInt(v.length === 3 ? v.split("").map((c) => c + c).join("") : v, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (h) => {
  const [r, g, b] = hex(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

// Canonical roles (keep in sync with the MATERIALS block in globals.css).
const T = {
  canvas: "#ece7d9",
  canvasSunken: "#e2dcca",
  surface: "#fdfbf7",
  surfaceRaised: "#ffffff",
  surfaceRecessed: "#f9f6ef",
  chrome: "#1c211a",
  chromeElevated: "#232922",
  ink: "#1c1913",
  inkSecondary: "#453f33",
  inkMuted: "#655e4e",
  inkOnChrome: "#f4f1e8",
  inkOnChromeSecondary: "#d3cec0",
  inkOnChromeMuted: "#a49d8c",
  brassText: "#77591b",
  brass: "#a4823a",
  champagne: "#e8d9ac",
  successFg: "#047653",
  successSurface: "#edf5f0",
  warningFg: "#9f5704",
  warningSurface: "#fbf5e6",
  dangerFg: "#d32222",
  dangerSurface: "#f9eeec",
  informationFg: "#3f5a63",
  informationSurface: "#eef2f3",
  chart1: "#c2a05a",
  chart2: "#3f8a63",
};

/**
 * Remapped Tailwind palette families (keep in sync with the `@theme` block).
 *
 * These are not decorative: the product paints ~2,000 badges, chips and
 * callouts with `text-<hue>-700 on bg-<hue>-50` pairs, so redefining a family
 * silently redefines real text contrast. Every step used as text in the
 * codebase is checked against every ground it is used on.
 */
const P = {
  amber: { 50: "#fbf7ec", 100: "#f5edd6", 200: "#ecdfb4", 300: "#e0cd8c", 400: "#cfb46a", 500: "#b8994c", 600: "#987836", 700: "#77591b", 800: "#5f4715", 900: "#4a370f", 950: "#33260a" },
  orange: { 50: "#fcf3e8", 100: "#f8e5cd", 200: "#f0c99c", 300: "#e5a866", 400: "#d88a3a", 500: "#c47119", 600: "#a95f13", 700: "#874c10", 800: "#6d3e0e", 900: "#58330c" },
  red: { 50: "#faeeec", 100: "#f4dad6", 200: "#e8bab3", 300: "#d9938a", 400: "#cc6a5e", 500: "#bf4a3c", 600: "#ab3a2e", 700: "#8f2f25", 800: "#74271f", 900: "#5d211b" },
  rose: { 50: "#fbf0ea", 100: "#f6dfd3", 200: "#ecc3ae", 300: "#dfa082", 400: "#d07c58", 500: "#bf6039", 600: "#a64f2d", 700: "#8a4126", 800: "#6f3520", 900: "#5a2c1c", 950: "#482316" },
  sky: { 50: "#eef2f3", 100: "#dde5e7", 600: "#465c64", 700: "#3a4a51", 800: "#2f3b40", 900: "#26302f" },
  blue: { 50: "#eef2f3", 100: "#dde5e7", 600: "#465c64", 700: "#3a4a51", 800: "#2f3b40", 900: "#26302f" },
  teal: { 50: "#eef3f2", 100: "#dae7e4", 600: "#41625c", 700: "#364e4a", 800: "#2c3e3b", 900: "#24322f" },
  indigo: { 50: "#f3f0f4", 100: "#e7e1ea", 600: "#675875", 700: "#53475e", 800: "#43394b", 900: "#362f3c" },
  violet: { 50: "#f3f0f4", 100: "#e7e1ea", 200: "#d4cbda", 300: "#b9acc4", 400: "#9a89a8", 500: "#7f6c8e", 600: "#675875", 700: "#53475e", 800: "#43394b", 900: "#362f3c" },
  purple: { 50: "#f3f0f4", 100: "#e7e1ea", 600: "#675875", 700: "#53475e" },
  pink: { 50: "#fbf0ea", 100: "#f6dfd3", 600: "#a64f2d", 700: "#8a4126" },
};

/**
 * Only steps the codebase actually paints with are gated, and each is gated
 * against the grounds it actually sits on. Checking every step against every
 * ground manufactures failures for combinations that do not exist
 * (`text-orange-600` and `text-pink-600` have zero call sites), and gating a
 * light step against a light ground is meaningless when that step is only ever
 * used on the dark report surface.
 *
 * Refresh the inventory with:
 *   rg -o "\btext-<hue>-[0-9]{2,3}" app shared | sort | uniq -c
 *
 * Threshold depends on what the step actually paints, not on the colour.
 *
 * Auditing every call site of the mid steps showed they are overwhelmingly
 * *icons* — `<Receipt className="h-4 w-4 text-amber-600" />`,
 * `iconClassName="text-rose-600 bg-rose-50"` — which WCAG scores as non-text
 * content at 3:1, not 4.5:1. Gating a glyph at 4.5 would force the whole ramp
 * darker to fix a problem that does not exist; gating real prose at 3.0 would
 * miss one that does. So the split below is by ROLE.
 *
 * The genuine prose uses of the -600 steps were moved to -700 rather than
 * dragging the ramp down for them.
 */
const AA_TEXT = 4.5;
const ICON = 3.0;

/** Steps that paint prose on light grounds. */
const TEXT_ON_LIGHT = {
  amber: [700, 800, 900, 950],
  orange: [700, 800, 900],
  red: [600, 700, 800],
  rose: [700, 800, 900, 950],
  pink: [700, 800],
  sky: [700, 800, 900],
  blue: [600, 700],
  teal: [700],
  indigo: [600, 900],
  violet: [600, 700, 800],
  purple: [600, 700],
};

/** Steps that paint icons/glyphs on light grounds. */
const ICON_ON_LIGHT = {
  amber: [600],
  rose: [600],
  red: [500],
};

/** Steps used on the DARK report surface / chrome (icons and legend glyphs). */
const ICON_ON_CHROME = {
  amber: [100, 200, 300, 400, 500],
  red: [100, 200, 300, 400],
  rose: [100, 200, 300, 400],
  violet: [400],
};

const paletteCases = [];
const onLight = (map, need) => {
  for (const [name, steps] of Object.entries(map)) {
    for (const step of steps) {
      const fg = P[name]?.[step];
      if (!fg) continue;
      paletteCases.push([`${name}-${step} on ${name}-50`, fg, P[name][50], need]);
      if (P[name][100]) paletteCases.push([`${name}-${step} on ${name}-100`, fg, P[name][100], need]);
      paletteCases.push([`${name}-${step} on surface`, fg, T.surface, need]);
      paletteCases.push([`${name}-${step} on canvas`, fg, T.canvas, need]);
      paletteCases.push([`${name}-${step} on canvasSunken`, fg, T.canvasSunken, need]);
    }
  }
};
onLight(TEXT_ON_LIGHT, AA_TEXT);
onLight(ICON_ON_LIGHT, ICON);
for (const [name, steps] of Object.entries(ICON_ON_CHROME)) {
  for (const step of steps) {
    const fg = P[name]?.[step];
    if (!fg) continue;
    paletteCases.push([`${name}-${step} on chrome`, fg, T.chrome, ICON]);
    paletteCases.push([`${name}-${step} on chromeElevated`, fg, T.chromeElevated, ICON]);
  }
}

const AA = 4.5;
const UI = 3.0; // non-text contrast (borders/indicators)

const cases = [
  // Body ink on every light ground
  ["ink on canvas", T.ink, T.canvas, AA],
  ["ink on surface", T.ink, T.surface, AA],
  ["ink on surfaceRaised", T.ink, T.surfaceRaised, AA],
  ["ink-secondary on canvas", T.inkSecondary, T.canvas, AA],
  ["ink-secondary on surface", T.inkSecondary, T.surface, AA],
  ["ink-muted on canvas", T.inkMuted, T.canvas, AA],
  ["ink-muted on surface", T.inkMuted, T.surface, AA],
  ["ink-muted on surfaceRecessed", T.inkMuted, T.surfaceRecessed, AA],
  ["ink-muted on canvasSunken", T.inkMuted, T.canvasSunken, AA],
  // Ink on chrome
  ["ink-on-chrome on chrome", T.inkOnChrome, T.chrome, AA],
  ["ink-on-chrome-secondary on chrome", T.inkOnChromeSecondary, T.chrome, AA],
  ["ink-on-chrome-muted on chrome", T.inkOnChromeMuted, T.chrome, AA],
  ["ink-on-chrome-secondary on chromeElevated", T.inkOnChromeSecondary, T.chromeElevated, AA],
  // Brand metal
  ["brass-text on surface", T.brassText, T.surface, AA],
  ["brass-text on canvas", T.brassText, T.canvas, AA],
  ["champagne on chrome (sidebar label)", T.champagne, T.chrome, AA],
  ["brass on chrome (non-text UI)", T.brass, T.chrome, UI],
  // Semantic pairs
  ["success-fg on success-surface", T.successFg, T.successSurface, AA],
  ["warning-fg on warning-surface", T.warningFg, T.warningSurface, AA],
  ["danger-fg on danger-surface", T.dangerFg, T.dangerSurface, AA],
  ["information-fg on information-surface", T.informationFg, T.informationSurface, AA],
  ["information-fg on surface", T.informationFg, T.surface, AA],
  // Data-vis on dark report card (non-text: series strokes)
  ["chart-1 on chrome (series stroke)", T.chart1, T.chrome, UI],
  ["chart-2 on chrome (series stroke)", T.chart2, T.chrome, UI],

  /*
   * Brass-500 replaced #D4AF37 across the auth / marketing / pricing / PWA
   * surfaces. It is DARKER than the gold it replaced, so every dark ground it
   * lands on is checked here — this is the pairing that could have regressed.
   * The /70 row is an icon and is scored as non-text.
   */
  ["brass-500 on marketing black #0a0a0a", "#c2a05a", "#0a0a0a", AA],
  ["brass-500 on auth deep #10120e", "#c2a05a", "#10120e", AA],
  ["brass-500 on card #171b15", "#c2a05a", "#171b15", AA],
  ["brass-500 on technician wallpaper #1c1d1f", "#c2a05a", "#1c1d1f", AA],
  ["brass-500 on chrome", "#c2a05a", T.chrome, AA],
  ["brass-500 on chromeElevated", "#c2a05a", T.chromeElevated, AA],
  ["brass-500 @90% on chrome", "#b59454", T.chrome, AA],
  ["brass-500 @70% on card (icon)", "#8e784a", "#171b15", UI],
  // Primary gold CTA: dark label on the darkest stop of the button gradient.
  ["CTA label on champagne-400 (top stop)", "#0e100d", "#d9c188", AA],
  ["CTA label on brass-600 (bottom stop)", "#0e100d", "#a4823a", AA],
  ["CTA label on hover bottom stop", "#0e100d", "#b8994c", AA],

  /*
   * WHICH BRASS STEP IS LEGAL ON WHICH GROUND.
   *
   * 66 hand-authored golds were folded onto five canonical steps, which only
   * works if each step is used on the ground it was chosen for. Getting this
   * backwards is invisible in a diff and unreadable on screen — a light brass
   * on paper, or brass-700 on chrome, both vanish. These cases pin the rule:
   *
   *   light ground (paper/canvas) -> brass-700 for text, brass-600 for icons
   *   dark ground  (chrome)       -> brass-500 / champagne-400 / champagne-300
   */
  ["brass-700 text on surface", "#77591b", T.surface, AA],
  ["brass-700 text on canvas", "#77591b", T.canvas, AA],
  ["brass-700 text on canvasSunken", "#77591b", T.canvasSunken, AA],
  ["brass-700 text on auth card #fdf9f0", "#77591b", "#fdf9f0", AA],
  /* brass-600 is NOT a light-ground text step (3.5:1). On paper it appears
   * only as a small status dot ringed in paper, and as a fill under a
   * near-black label — both checked here. Text on paper uses brass-700, and
   * link hover DEEPENS to amber-800 rather than brightening, which is what a
   * light ground requires. */
  ["brass-600 status dot on paper #fbf7ef", "#a4823a", "#fbf7ef", UI],
  ["near-black label on brass-600 fill", "#080907", "#a4823a", AA],
  ["link hover amber-800 on paper #fbf7ef", "#5f4715", "#fbf7ef", AA],
  ["link hover amber-800 on canvasSunken", "#5f4715", T.canvasSunken, AA],
  ["brass-500 text on chrome", "#c2a05a", T.chrome, AA],
  ["champagne-400 text on chrome", "#d9c188", T.chrome, AA],
  ["champagne-400 text on chromeElevated", "#d9c188", T.chromeElevated, AA],
  ["champagne-300 text on chrome", "#e8d9ac", T.chrome, AA],
  ["champagne-300 text on chromeElevated", "#e8d9ac", T.chromeElevated, AA],

  ...paletteCases,
];

let fail = 0;
console.log("role pair".padEnd(46) + "ratio   need  result");
console.log("-".repeat(74));
for (const [name, fg, bg, need] of cases) {
  const r = ratio(fg, bg);
  const ok = r >= need;
  if (!ok) fail += 1;
  console.log(
    name.padEnd(46) + r.toFixed(2).padStart(5) + "   " + need.toFixed(1).padStart(4) + "  " + (ok ? "pass" : "FAIL"),
  );
}
console.log("-".repeat(74));
console.log(fail === 0 ? "ALL PASS" : `${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
