/**
 * UI-audit: capture the technician experience via the owner view switcher.
 * Mobile viewport. Switches back to Owner/Admin view at the end.
 */
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "ui-audit", "SCREENSHOTS");
const BASE = "http://localhost:3000";
const AUTH_STATE = process.env.AUTH_STATE?.trim();
if (!AUTH_STATE) { console.error("Set AUTH_STATE"); process.exit(1); }

async function settle(page, ms = 700) {
  await page.waitForFunction(() => document.querySelectorAll(".north-star-skeleton").length === 0, { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function shot(page, name, opts = {}) {
  await page.screenshot({ path: path.join(OUT, `x-${name}.png`), type: "png", animations: "disabled", ...opts });
  console.log(`  shot x-${name}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    storageState: AUTH_STATE,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await settle(page);

  // Open the owner view switcher and choose the technician view.
  const switcher = page.locator('button[aria-haspopup="listbox"]').first();
  if (!(await switcher.count())) { console.log("no view switcher found"); }
  else {
    await switcher.click();
    await page.waitForTimeout(400);
    await shot(page, "view-switcher-open-mobile");
    const techOption = page.locator('[role="option"], [role="listbox"] button').filter({ hasText: /technician/i }).first();
    if (await techOption.count()) {
      await techOption.click();
      await page.waitForURL(/\/technician/, { timeout: 20000 }).catch(() => {});
      await settle(page);
      await shot(page, "technician-home-mobile", { fullPage: true });
      for (const [route, name] of [
        ["/technician/schedule", "technician-schedule-mobile"],
        ["/tech/time", "tech-time-mobile"],
        ["/tech/receipts", "tech-receipts-mobile"],
        ["/tech/notifications", "tech-notifications-mobile"],
      ]) {
        await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded" });
        await settle(page);
        await shot(page, name, { fullPage: true });
      }
      // Switch back to Owner/Admin.
      await page.goto(`${BASE}/technician`, { waitUntil: "domcontentloaded" });
      await settle(page);
      const sw2 = page.locator('button[aria-haspopup="listbox"]').first();
      if (await sw2.count()) {
        await sw2.click();
        await page.waitForTimeout(300);
        const adminOption = page.locator('[role="option"], [role="listbox"] button').filter({ hasText: /owner|admin/i }).first();
        if (await adminOption.count()) {
          await adminOption.click();
          await page.waitForTimeout(1500);
          console.log("switched back to owner/admin view");
        }
      }
    } else {
      console.log("technician option not found in switcher");
    }
  }
  await ctx.storageState({ path: AUTH_STATE });
  await ctx.close();
  await browser.close();
  console.log("done");
}

main().catch((e) => { console.error(e); process.exit(1); });
