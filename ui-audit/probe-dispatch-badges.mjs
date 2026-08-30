/**
 * Measure dispatch badge contrast in the LIVE DOM, not from the stylesheet.
 *
 * The stylesheet cannot tell you what a translucent wash composites to, and the
 * `[data-theme="dark"]` scope makes the source misleading on top of that — the
 * whole reason these badges regressed. So ask the browser.
 *
 *   AUTH_STATE=.playwright/founder-auth.json node ui-audit/probe-dispatch-badges.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim() || ".playwright/founder-auth.json";

const PROBE = () => {
  const lum = (rgb) => {
    const [r, g, b] = rgb.map((c) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
  /* Walk up compositing every translucent layer until an opaque one is hit —
   * a badge's own background is a wash and settles nothing by itself. */
  const solidBg = (el) => {
    let node = el, acc = null;
    while (node && node !== document.documentElement.parentNode) {
      const p = parse(getComputedStyle(node).backgroundColor);
      if (p.length) {
        const a = p.length === 4 ? p[3] : 1;
        if (a > 0) {
          const layer = [p[0], p[1], p[2]];
          acc = acc === null ? { c: layer, a } : acc;
          if (a === 1) {
            return acc.a === 1 ? acc.c : acc.c.map((v, i) => v * acc.a + layer[i] * (1 - acc.a));
          }
        }
      }
      node = node.parentElement;
    }
    return acc ? acc.c : [255, 255, 255];
  };
  const out = [];
  for (const el of document.querySelectorAll("span,div,button")) {
    const cls = el.className;
    if (typeof cls !== "string") continue;
    const txt = (el.textContent || "").trim();
    if (!txt || txt.length > 24) continue;
    if (!/rounded-full|rounded-md|rounded-lg/.test(cls)) continue;
    /* Leaf nodes only. A wrapper's textContent merges its children ("Collected"
     * + "$1,486") and its own `color` is inherited rather than painted, so
     * measuring one reports a ratio that nothing on screen actually has. */
    if (el.firstElementChild) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color).slice(0, 3);
    const bg = solidBg(el);
    const a = lum(fg), b = lum(bg);
    const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const px = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = px >= 24 || (px >= 18.66 && bold) ? 3 : 4.5;
    out.push({ txt, ratio: +ratio.toFixed(2), px, need, ok: ratio >= need });
  }
  return out;
};

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ storageState: AUTH, viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
let fails = 0, total = 0;
for (const route of ["/dispatch", "/customers?tab=pipeline", "/expenses", "/reports", "/work", "/schedule", "/"]) {
  await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
  await p.waitForTimeout(1200);
  const rows = await p.evaluate(PROBE);
  const seen = new Map();
  for (const r of rows) if (!seen.has(r.txt) || seen.get(r.txt).ratio > r.ratio) seen.set(r.txt, r);
  console.log(`\n${route}  (${seen.size} distinct pill/chip labels)`);
  for (const r of [...seen.values()].sort((x, y) => x.ratio - y.ratio)) {
    total += 1;
    if (!r.ok) fails += 1;
    console.log(`  ${r.ok ? "pass" : "FAIL"}  ${String(r.ratio).padStart(6)}  need ${r.need}  ${r.px}px  "${r.txt}"`);
  }
}
console.log(`\n${fails === 0 ? "ALL PASS" : fails + " FAILURES"} across ${total} labels`);
await b.close();
process.exit(fails === 0 ? 0 : 1);
