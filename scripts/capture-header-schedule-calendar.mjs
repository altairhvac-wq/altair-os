/**
 * Capture header calendar icon and confirm it navigates to /schedule.
 * Requires: running app at BASE_URL + .playwright/founder-auth.json
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUT_DIR = path.join(
  ROOT,
  "public",
  "marketing",
  "screenshots",
  "comparison",
);
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";

if (!fs.existsSync(AUTH_PATH)) {
  console.error(`Missing ${AUTH_PATH}. Run: npm run capture:founder-auth`);
  process.exit(1);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  storageState: AUTH_PATH,
});
const page = await context.newPage();

await page.goto(`${BASE_URL}/`, {
  waitUntil: "networkidle",
  timeout: 90_000,
});
await page.waitForTimeout(1500);

const calendarLink = page.getByRole("link", { name: "Schedule" }).filter({
  has: page.locator("svg"),
});
await calendarLink.waitFor({ state: "visible", timeout: 30_000 });

const closedPath = path.join(OUT_DIR, "header-calendar-icon.png");
await page.screenshot({ path: closedPath, type: "png" });
console.log("saved", path.relative(ROOT, closedPath));

await calendarLink.click();
await page.waitForURL("**/schedule**", { timeout: 30_000 });
await page.waitForTimeout(800);

const schedulePath = path.join(OUT_DIR, "header-calendar-schedule-landed.png");
await page.screenshot({ path: schedulePath, type: "png" });
console.log("saved", path.relative(ROOT, schedulePath));
console.log("navigated to", page.url());

await browser.close();
console.log("Done.");
