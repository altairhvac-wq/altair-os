/**
 * Contrast of EVERY visible text leaf, measured in the live DOM.
 *
 * The badge probe only looked at rounded chips. The failure pattern it found —
 * a tone colour painted over a wash of itself on a dark surface, which reads as
 * correct in the source because `[data-theme="dark"]` declares bright values
 * that never apply — is not specific to chips. So this looks at all text.
 *
 * Two things the stylesheet cannot tell you and this can: what a stack of
 * translucent layers composites to, and which scope actually won.
 *
 *   AUTH_STATE=.playwright/founder-auth.json node ui-audit/probe-text-contrast.mjs [routes.csv]
 */
import fs from "fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim() || ".playwright/founder-auth.json";
const WIDTHS = (process.env.WIDTHS || "390,1440").split(",").map(Number);
const ROUTES = (process.argv[2] ||
  "/,/work,/dispatch,/customers,/customers?tab=pipeline,/sales,/invoices,/estimates,/expenses,/reports,/time-clock,/payroll,/price-book,/settings,/settings/team,/technician,/community"
).split(",");

const SCAN = () => {
  /* Parse colour through a canvas, not a regex.
   *
   * Chromium serialises some computed colours as `oklab(...)` or `color(srgb
   * ...)`, whose components are 0-1. Reading those with a number regex and
   * treating them as 0-255 turns `text-altair-paper/70` — a light ivory — into
   * near-black, which is how a first run of this probe invented 272 failures.
   * Painting one pixel and reading it back converts any syntax to sRGB bytes. */
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const c2d = cv.getContext("2d", { willReadFrequently: true });
  c2d.globalCompositeOperation = "copy";
  const rgba = (css) => {
    try {
      c2d.fillStyle = "rgba(0,0,0,0)";
      c2d.fillRect(0, 0, 1, 1);
      c2d.fillStyle = css;
      c2d.fillRect(0, 0, 1, 1);
      const d = c2d.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    } catch { return null; }
  };
  const lum = (c) => {
    const [r, g, b] = c.map((v) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  /* Composite upward to the first opaque background. If any layer on the way
   * paints an image or gradient, the composite is not the whole truth — those
   * are reported separately rather than scored, because a wrong number here is
   * worse than no number. */
  const groundOf = (el) => {
    const stack = [];
    let gradient = false;
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== "none") gradient = true;
      const p = rgba(cs.backgroundColor);
      if (!p) continue;
      if (p[3] === 0) continue;
      stack.push({ c: p.slice(0, 3), a: p[3] });
      if (p[3] === 1) break;
    }
    if (!stack.length) return { c: [255, 255, 255], gradient };
    let out = stack[stack.length - 1].c;
    for (let i = stack.length - 2; i >= 0; i -= 1) {
      const { c, a } = stack[i];
      out = out.map((v, j) => c[j] * a + v * (1 - a));
    }
    return { c: out, gradient };
  };
  const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");

  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const text = t.nodeValue.trim();
    if (!text) continue;
    const el = t.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    if (el.closest("script,style,noscript,svg")) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const op = parseFloat(cs.opacity);
    if (op < 0.05) continue;
    /* Text clipped to a gradient has no single colour to measure. */
    if (cs.webkitTextFillColor === "transparent" || cs.color === "transparent") continue;

    const fg = rgba(cs.color);
    if (!fg) continue;
    const { c: ground, gradient } = groundOf(el);
    const alpha = fg[3] * op;
    const eff = fg.slice(0, 3).map((v, i) => v * alpha + ground[i] * (1 - alpha));

    const L1 = lum(eff), L2 = lum(ground);
    const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    if (ratio >= need) continue;

    out.push({
      text: text.slice(0, 32), ratio: +ratio.toFixed(2), need, size, gradient,
      fg: hex(fg.slice(0, 3)), bg: hex(ground),
      cls: (typeof el.className === "string" ? el.className : "").slice(0, 80),
      tag: el.tagName.toLowerCase(),
    });
  }
  return out;
};

const b = await chromium.launch({ headless: true });
const all = [];
for (const width of WIDTHS) {
  const ctx = await b.newContext({ storageState: AUTH, viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  for (const route of ROUTES) {
    try {
      await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 90000 });
      await p.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
      await p.waitForTimeout(600);
      for (const f of await p.evaluate(SCAN)) all.push({ ...f, route, width });
    } catch (e) {
      console.log(`  (${route} @${width} skipped: ${String(e).slice(0, 60)})`);
    }
  }
  await ctx.close();
  process.stdout.write(`${width}px `);
}
await b.close();

/* Group by the colour pair, which is what a fix actually targets. */
const solid = all.filter((f) => !f.gradient);
const onGradient = all.filter((f) => f.gradient);
const groups = new Map();
for (const f of solid) {
  const k = `${f.fg} on ${f.bg}`;
  if (!groups.has(k)) groups.set(k, { ...f, count: 0, routes: new Set(), samples: new Set() });
  const g = groups.get(k);
  g.count += 1;
  g.routes.add(f.route);
  if (g.samples.size < 3) g.samples.add(f.text);
  if (f.ratio < g.ratio) g.ratio = f.ratio;
}
const rows = [...groups.entries()].sort((a, b2) => a[1].ratio - b2[1].ratio);
console.log(`\n\n${all.length} failing text nodes, ${rows.length} distinct colour pairs\n`);
for (const [k, g] of rows) {
  console.log(`${String(g.ratio).padStart(6)} (need ${g.need})  x${String(g.count).padStart(4)}  ${k}  ${g.size}px`);
  console.log(`        routes: ${[...g.routes].slice(0, 5).join(" ")}`);
  console.log(`        e.g. ${[...g.samples].map((s) => JSON.stringify(s)).join(", ")}`);
  console.log(`        class: ${g.cls}`);
}
fs.writeFileSync("ui-audit/text-contrast.json", JSON.stringify(all, null, 1));
console.log(`\nwritten ui-audit/text-contrast.json`);
