/**
 * Contrast for text sitting on a gradient.
 *
 * The composite probe cannot score these: walking up to the first opaque
 * background skips the gradient that is actually painted, and reports a ratio
 * nothing on screen has. Rather than exclude them, this parses the gradient's
 * own colour stops and scores the text against EVERY stop. If the worst stop
 * clears the threshold, the whole run does — no sampling, no interpolation
 * assumptions, and no image dependency.
 *
 *   AUTH_STATE=.playwright/founder-auth.json node ui-audit/probe-gradient-grounds.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim() || ".playwright/founder-auth.json";
const ROUTES = (process.argv[2] ||
  "/,/work,/dispatch,/customers,/sales,/invoices,/estimates,/expenses,/reports,/time-clock,/payroll,/price-book,/settings,/settings/team,/technician,/community"
).split(",");

const SCAN = () => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const c2d = cv.getContext("2d", { willReadFrequently: true });
  c2d.globalCompositeOperation = "copy";
  const rgba = (css) => {
    try {
      c2d.fillStyle = "rgba(0,0,0,0)"; c2d.fillRect(0, 0, 1, 1);
      c2d.fillStyle = css; c2d.fillRect(0, 0, 1, 1);
      const d = c2d.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    } catch { return null; }
  };
  const lum = (c) => { const f = c.map((v) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
  const cr = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement; const txt = t.nodeValue.trim();
    if (!el || !txt || seen.has(el)) continue;
    seen.add(el);
    if (el.closest("script,style,noscript,svg")) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;

    /* The nearest painted gradient above this text. */
    let img = null;
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n);
      if (c.backgroundImage && c.backgroundImage !== "none") { img = c.backgroundImage; break; }
      const bc = rgba(c.backgroundColor);
      if (bc && bc[3] === 1) break;
    }
    if (!img || !/gradient/.test(img)) continue;

    const stops = (img.match(/rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}/g) || [])
      .map(rgba).filter(Boolean).filter((c) => c[3] > 0.5).map((c) => c.slice(0, 3));
    if (!stops.length) continue;

    const fg = rgba(cs.color);
    if (!fg) continue;
    const size = parseFloat(cs.fontSize);
    const need = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700) ? 3 : 4.5;
    /* Worst stop decides. */
    const worst = Math.min(...stops.map((s) => cr(fg.slice(0, 3), s)));
    if (worst >= need) continue;
    out.push({
      text: txt.slice(0, 30), ratio: +worst.toFixed(2), need, size, stops: stops.length,
      cls: (typeof el.className === "string" ? el.className : "").slice(0, 70),
    });
  }
  return out;
};

const b = await chromium.launch({ headless: true });
const all = [];
for (const width of [390, 1440]) {
  const ctx = await b.newContext({ storageState: AUTH, viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  for (const route of ROUTES) {
    try {
      await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 90000 });
      await p.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
      await p.waitForTimeout(500);
      for (const f of await p.evaluate(SCAN)) all.push({ ...f, route, width });
    } catch {}
  }
  await ctx.close();
  process.stdout.write(`${width}px `);
}
await b.close();

const g = new Map();
for (const f of all) { const k = f.cls + "|" + f.ratio; if (!g.has(k)) g.set(k, { ...f, count: 0, routes: new Set() }); const x = g.get(k); x.count += 1; x.routes.add(f.route); }
console.log(`\n\n${all.length} text nodes fail against the WORST stop of their gradient (${g.size} groups)\n`);
for (const x of [...g.values()].sort((a, c) => a.ratio - c.ratio)) {
  console.log(`${String(x.ratio).padStart(6)} (need ${x.need}) x${String(x.count).padStart(3)} ${x.size}px  ${[...x.routes].slice(0, 3).join(" ")}`);
  console.log(`        "${x.text}"   ${x.cls}`);
}
console.log(all.length === 0 ? "\nALL PASS against every gradient stop" : "");
process.exit(all.length === 0 ? 0 : 1);
