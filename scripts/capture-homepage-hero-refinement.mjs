/**
 * Capture homepage hero refinement validation shots.
 * Desktop 1440×1000, Mobile 390×844 → docs/marketing/homepage-hero-refinement/
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "marketing", "homepage-hero-refinement");
const BASE = process.env.BASE_URL?.trim() || "http://localhost:3002";

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function capture({ name, width, height, fullPage = false }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForSelector("#ah-hero-heading", { timeout: 30_000 });
  await page.waitForTimeout(600);
  const out = path.join(OUT_DIR, name);
  await page.screenshot({ path: out, type: "png", fullPage });
  const buf = fs.readFileSync(out);
  console.log(
    `saved ${name} ${Math.round(buf.length / 1024)}KB ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`,
  );
  await context.close();
}

await capture({
  name: "after-desktop.png",
  width: 1440,
  height: 1000,
});
await capture({
  name: "after-desktop-tall.png",
  width: 1440,
  height: 1400,
});
await capture({
  name: "after-mobile.png",
  width: 390,
  height: 844,
});
await capture({
  name: "after-mobile-tall.png",
  width: 390,
  height: 1400,
});

await browser.close();
console.log("Hero refinement captures written to", OUT_DIR);
