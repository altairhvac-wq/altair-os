/**
 * Crop a region of a route for close visual inspection.
 *
 * Full-page shots are good for composition but hide the things that decide
 * whether a palette works — icon accents, hover and focus states, hairlines.
 * This captures a clipped region, optionally after hovering or focusing an
 * element, so those states can actually be looked at.
 *
 *   AUTH_STATE=<path> node ui-audit/crop.mjs <label> <route> <x,y,w,h> [width] [hover=<sel>|focus=<sel>]
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "ui-audit", "SHOTS");
const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";
const AUTH = process.env.AUTH_STATE?.trim();
if (!AUTH) { console.error("Set AUTH_STATE"); process.exit(1); }

const [label, route, clipArg, widthArg, action] = process.argv.slice(2);
const [x, y, w, h] = (clipArg || "0,0,900,500").split(",").map(Number);
const width = Number(widthArg || 1440);

fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({
  storageState: AUTH,
  viewport: { width, height: Math.max(900, y + h + 100) },
  deviceScaleFactor: 2,
});
const p = await ctx.newPage();
await p.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForFunction(
  () => document.querySelectorAll(".north-star-skeleton").length === 0,
  { timeout: 25000 },
).catch(() => {});
await p.waitForLoadState("networkidle", { timeout: 25000 }).catch(() => {});
await p.waitForTimeout(600);

if (action) {
  const [kind, sel] = action.split("=");
  const el = p.locator(sel).first();
  try {
    if (kind === "hover") await el.hover({ timeout: 5000 });
    else if (kind === "focus") await el.focus({ timeout: 5000 });
    await p.waitForTimeout(350);
  } catch (e) {
    console.log("  (could not " + kind + " " + sel + ": " + String(e.message).slice(0, 60) + ")");
  }
}

const file = path.join(OUT, `${label}.png`);
await p.screenshot({ path: file, clip: { x, y, width: w, height: h }, animations: "disabled" });
console.log("  " + path.basename(file));
await b.close();
