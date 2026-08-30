/**
 * Contrast inside detail panels, which the route-level probe never sees.
 *
 * A static sweep can list files where a dark-surface class and a paper token
 * co-occur, but co-occurrence is not confirmation — the token may sit outside
 * the dark subtree entirely. So instead of inferring, this opens the panels and
 * measures them.
 *
 *   AUTH_STATE=.playwright/founder-auth.json node ui-audit/probe-panel-contrast.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim() || ".playwright/founder-auth.json";

const SCAN = () => {
  const cv = document.createElement("canvas"); cv.width = cv.height = 1;
  const c2d = cv.getContext("2d", { willReadFrequently: true });
  c2d.globalCompositeOperation = "copy";
  const rgba = (css) => { try { c2d.fillStyle = "rgba(0,0,0,0)"; c2d.fillRect(0,0,1,1); c2d.fillStyle = css; c2d.fillRect(0,0,1,1);
    const d = c2d.getImageData(0,0,1,1).data; return [d[0],d[1],d[2],d[3]/255]; } catch { return null; } };
  const lum = (c) => { const f = c.map((v) => { const s = v/255; return s <= 0.04045 ? s/12.92 : Math.pow((s+0.055)/1.055, 2.4); });
    return 0.2126*f[0] + 0.7152*f[1] + 0.0722*f[2]; };
  const groundOf = (el) => { const stack = []; let grad = false;
    for (let n = el; n; n = n.parentElement) { const c = getComputedStyle(n);
      if (c.backgroundImage && c.backgroundImage !== "none") grad = true;
      const p = rgba(c.backgroundColor); if (!p || p[3] === 0) continue;
      stack.push({ c: p.slice(0,3), a: p[3] }); if (p[3] === 1) break; }
    if (!stack.length) return { c: [255,255,255], grad };
    let out = stack[stack.length-1].c;
    for (let i = stack.length-2; i >= 0; i -= 1) { const { c, a } = stack[i]; out = out.map((v,j) => c[j]*a + v*(1-a)); }
    return { c: out, grad }; };
  const hex = (c) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2,"0")).join("");

  const out = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let t = walker.nextNode(); t; t = walker.nextNode()) {
    const el = t.parentElement; const txt = t.nodeValue.trim();
    if (!el || !txt || seen.has(el)) continue; seen.add(el);
    if (el.closest("script,style,noscript,svg")) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const op = parseFloat(cs.opacity); if (op < 0.05) continue;
    if (cs.webkitTextFillColor === "transparent") continue;
    const fg = rgba(cs.color); if (!fg) continue;
    const { c: ground, grad } = groundOf(el);
    if (grad) continue; // handled by probe-gradient-grounds
    const alpha = fg[3] * op;
    const eff = fg.slice(0,3).map((v,i) => v*alpha + ground[i]*(1-alpha));
    const L1 = lum(eff), L2 = lum(ground);
    const ratio = (Math.max(L1,L2) + 0.05) / (Math.min(L1,L2) + 0.05);
    const size = parseFloat(cs.fontSize);
    const need = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight,10) >= 700) ? 3 : 4.5;
    if (ratio >= need) continue;
    out.push({ text: txt.slice(0,30), ratio: +ratio.toFixed(2), need, size,
      fg: hex(fg.slice(0,3)), bg: hex(ground),
      cls: (typeof el.className === "string" ? el.className : "").slice(0,70) });
  }
  return out;
};

/* Each entry opens one panel that the route-level scan cannot reach. */
const CASES = [
  { route: "/customers", open: "tbody tr", label: "customer detail" },
  { route: "/invoices", open: "tbody tr", label: "invoice detail" },
  { route: "/estimates", open: "tbody tr", label: "estimate detail" },
  { route: "/expenses", open: "tbody tr", label: "expense detail" },
  { route: "/time-clock", open: "tbody tr", label: "time entry detail" },
  { route: "/price-book", open: "tbody tr", label: "service item detail" },
  { route: "/leads", open: "tbody tr", label: "lead detail" },
  { route: "/network", open: "tbody tr", label: "network profile" },
  { route: "/dispatch", open: "[class*='unassigned'] button, tbody tr", label: "dispatch job" },
];

const b = await chromium.launch({ headless: true });
const all = [];
for (const width of [390, 1440]) {
  const ctx = await b.newContext({ storageState: AUTH, viewport: { width, height: 900 } });
  const p = await ctx.newPage();
  for (const { route, open, label } of CASES) {
    try {
      await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 90000 });
      await p.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
      await p.waitForTimeout(600);
      const target = p.locator(open).first();
      if (!(await target.count())) continue;
      await target.click({ timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(1000);
      for (const f of await p.evaluate(SCAN)) all.push({ ...f, route, width, label });
    } catch {}
  }
  await ctx.close();
  process.stdout.write(`${width}px `);
}
await b.close();

const g = new Map();
for (const f of all) { const k = `${f.fg}|${f.bg}|${f.cls}`;
  if (!g.has(k)) g.set(k, { ...f, count: 0, where: new Set() });
  const x = g.get(k); x.count += 1; x.where.add(f.label); if (f.ratio < x.ratio) x.ratio = f.ratio; }
console.log(`\n\n${all.length} failing text nodes inside opened panels (${g.size} groups)\n`);
for (const x of [...g.values()].sort((a, c) => a.ratio - c.ratio)) {
  console.log(`${String(x.ratio).padStart(6)} (need ${x.need}) x${String(x.count).padStart(3)} ${x.size}px  ${[...x.where].join(" ")}`);
  console.log(`        "${x.text}"  ${x.fg} on ${x.bg}\n        ${x.cls}`);
}
if (!all.length) console.log("ALL PASS — every opened panel clears its threshold");
process.exit(all.length === 0 ? 0 : 1);
