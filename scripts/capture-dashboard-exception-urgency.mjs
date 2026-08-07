/**
 * Capture Dashboard exception board showing count-based urgency tiers.
 *
 * Usage:
 *   node scripts/capture-dashboard-exception-urgency.mjs
 *   BASE_URL=http://localhost:3000 node scripts/capture-dashboard-exception-urgency.mjs
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUTPUT_DIR = path.join(
  ROOT,
  "public",
  "marketing",
  "screenshots",
  "comparison",
);
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";

async function main() {
  if (!fs.existsSync(AUTH_PATH)) {
    throw new Error(
      `Missing founder auth at ${AUTH_PATH}. Run: npm run capture:founder-auth`,
    );
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 1600, height: 1100 },
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(1400);

  const board = page.locator('[aria-label="Needs attention"]');
  await board.waitFor({ state: "visible", timeout: 30_000 });

  const counts = await board.locator("span.rounded-full").allTextContents();
  console.log("Bucket count badges:", counts);

  const cluster = page.locator('[aria-label="Needs attention cluster"]');
  const outPath = path.join(
    OUTPUT_DIR,
    "dashboard-exception-board-urgency.png",
  );
  await cluster.screenshot({ path: outPath });
  console.log(`Wrote ${outPath}`);

  const fullPath = path.join(
    OUTPUT_DIR,
    "dashboard-exception-board-urgency-full.png",
  );
  await page.screenshot({ path: fullPath, fullPage: true });
  console.log(`Wrote ${fullPath}`);

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
