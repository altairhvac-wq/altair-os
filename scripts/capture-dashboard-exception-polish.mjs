/**
 * Capture cleaned Dashboard + one expanded exception bucket with drill-down rows.
 *
 * Usage:
 *   node scripts/capture-dashboard-exception-polish.mjs
 *   BASE_URL=http://localhost:3000 node scripts/capture-dashboard-exception-polish.mjs
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
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(1200);

  const cleanedPath = path.join(
    OUTPUT_DIR,
    "dashboard-exception-board-polish.png",
  );
  await page.screenshot({ path: cleanedPath, fullPage: true });
  console.log(`Wrote ${cleanedPath}`);

  // Expand the first exception bucket that has a details dropdown with items.
  const firstDetails = page.locator('[aria-label="Needs attention"] details').first();
  if ((await firstDetails.count()) > 0) {
    await firstDetails.locator("summary").click();
    await page.waitForTimeout(500);

    const expandedPath = path.join(
      OUTPUT_DIR,
      "dashboard-exception-board-expanded.png",
    );
    await page.screenshot({ path: expandedPath, fullPage: true });
    console.log(`Wrote ${expandedPath}`);

    // Click the first drill-down item and confirm navigation lands somewhere real.
    const firstItem = firstDetails.locator("a[href]").first();
    if ((await firstItem.count()) > 0) {
      const href = await firstItem.getAttribute("href");
      await firstItem.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(800);
      const landedPath = path.join(
        OUTPUT_DIR,
        "dashboard-exception-drilldown-landed.png",
      );
      await page.screenshot({ path: landedPath, fullPage: true });
      console.log(`Expanded item href: ${href}`);
      console.log(`Landed URL: ${page.url()}`);
      console.log(`Wrote ${landedPath}`);
    }
  } else {
    console.log(
      "No expandable exception buckets present (clear state) — cleaned shot only.",
    );
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
