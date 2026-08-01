/**
 * Capture Customer Profile (MC v2) screenshots.
 * Requires: running app at BASE_URL + .playwright/founder-auth.json
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUT_DIR = path.join(ROOT, ".tmp", "customer-profile");
const BASE = process.env.BASE_URL?.trim() || "http://localhost:3000";

async function main() {
  if (!fs.existsSync(AUTH_PATH)) {
    throw new Error(`Missing auth state at ${AUTH_PATH}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
  });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  await page.goto(`${BASE}/customers`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(1500);

  const href = await page
    .locator('a[href^="/customers/"]')
    .evaluateAll((anchors) => {
      const reserved = new Set(["import", "new"]);
      const match = anchors.find((anchor) => {
        const value = anchor.getAttribute("href") ?? "";
        const parts = value.split("?")[0]?.split("/").filter(Boolean) ?? [];
        if (parts.length !== 2 || parts[0] !== "customers") {
          return false;
        }
        const customerId = parts[1] ?? "";
        return customerId.length > 8 && !reserved.has(customerId);
      });
      return match?.getAttribute("href") ?? null;
    });

  if (!href) {
    throw new Error("No customer detail link found on /customers");
  }

  console.log("Opening", href);
  await page.goto(`${BASE}${href}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: path.join(OUT_DIR, "01-top.png"),
    fullPage: false,
  });

  await page.evaluate(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = 420;
  });
  await page.waitForTimeout(300);
  await page.screenshot({
    path: path.join(OUT_DIR, "02-tabs-jobs.png"),
    fullPage: false,
  });

  for (const [label, file] of [
    ["Estimates", "03-estimates.png"],
    ["Invoices", "04-invoices.png"],
    ["Payments", "05-payments.png"],
    ["Notes", "06-notes.png"],
    ["Files", "07-files.png"],
    ["Equipment", "08-equipment.png"],
    ["Activity", "09-activity.png"],
  ]) {
    const tab = page.getByRole("tab", { name: new RegExp(`^${label}`, "i") });
    if ((await tab.count()) === 0) continue;
    await tab.first().click();
    await page.waitForTimeout(350);
    await page.screenshot({
      path: path.join(OUT_DIR, file),
      fullPage: false,
    });
  }

  await page.screenshot({
    path: path.join(OUT_DIR, "final-full.png"),
    fullPage: true,
  });

  console.log("Saved screenshots to", OUT_DIR);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
