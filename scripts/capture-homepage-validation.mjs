/**
 * Capture Mission Control homepage validation shots.
 * Desktop 1440×1000, Mobile 390×844 → docs/altair/homepage-phase1-final/
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "altair", "homepage-phase1-final");
const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function capture({ name, width, height, fullPage = false }) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.waitForTimeout(1800);
  const out = path.join(OUT_DIR, name);
  await page.screenshot({ path: out, type: "png", fullPage });
  const buf = fs.readFileSync(out);
  console.log(
    `saved ${name} ${Math.round(buf.length / 1024)}KB ${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`,
  );
  await context.close();
}

await capture({
  name: "desktop-1440x1000.png",
  width: 1440,
  height: 1000,
});
await capture({
  name: "desktop-full.png",
  width: 1440,
  height: 1000,
  fullPage: true,
});
await capture({
  name: "mobile-390x844.png",
  width: 390,
  height: 844,
});
await capture({
  name: "mobile-full.png",
  width: 390,
  height: 844,
  fullPage: true,
});

await browser.close();
console.log("Validation captures written to", OUT_DIR);
