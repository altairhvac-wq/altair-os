/**
 * Computed-style fingerprint of page headers, tables and their rows.
 *
 * Used to prove a CSS deletion is inert. Computed styles beat pixels here: no
 * antialiasing noise, and a diff names the property that moved.
 *
 *   AUTH_STATE=... node ui-audit/snapshot-chrome.mjs <out.json>
 */
import fs from "fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim() || ".playwright/founder-auth.json";
const out = process.argv[2] || "ui-audit/chrome.json";

const PROPS = ["color", "backgroundColor", "backgroundImage", "borderBottomColor", "borderColor",
  "fontSize", "fontWeight", "letterSpacing", "textTransform", "padding", "opacity", "boxShadow", "accentColor"];

const GRAB = (props) => {
  const pick = (el) => {
    const cs = getComputedStyle(el);
    const o = {};
    for (const p of props) o[p] = cs[p];
    return o;
  };
  const res = {};
  const sels = ["h1", "h1 + p", "thead tr", "thead th", "tbody tr", "tbody td",
    'input[type="checkbox"]', "header", "table"];
  for (const s of sels) {
    const els = [...document.querySelectorAll(s)].slice(0, 4);
    res[s] = els.map(pick);
  }
  return res;
};

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ storageState: AUTH, viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const snap = {};
for (const r of ["/customers", "/work", "/dispatch", "/settings", "/time-clock", "/invoices", "/estimates", "/expenses", "/payroll", "/reports"]) {
  await p.goto(BASE + r, { waitUntil: "domcontentloaded", timeout: 90000 });
  await p.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(700);
  snap[r] = await p.evaluate(GRAB, PROPS);
  process.stdout.write(`${r} `);
}
fs.writeFileSync(out, JSON.stringify(snap, null, 1));
console.log(`\nwritten ${out}`);
await b.close();
