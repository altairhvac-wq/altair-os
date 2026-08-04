/**
 * Verify exception-bucket expand + drill-down landings with live data.
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
    throw new Error(`Missing founder auth at ${AUTH_PATH}`);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(1000);

  const buckets = page.locator('[aria-label="Needs attention"] details');
  const bucketCount = await buckets.count();
  console.log(`Expandable exception buckets: ${bucketCount}`);

  const results = [];

  for (let i = 0; i < bucketCount; i++) {
    const bucket = buckets.nth(i);
    const title = (await bucket.locator("summary p").first().innerText()).trim();
    await bucket.locator("summary").click();
    await page.waitForTimeout(300);

    const itemLinks = bucket.locator("ul a[href]");
    const itemCount = await itemLinks.count();
    const firstHref =
      itemCount > 0 ? await itemLinks.first().getAttribute("href") : null;
    const firstLabel =
      itemCount > 0
        ? (await itemLinks.first().locator("p").first().innerText()).trim()
        : null;

    results.push({ title, itemCount, firstHref, firstLabel });
    console.log(
      `- ${title}: ${itemCount} items; first=${firstLabel ?? "—"} -> ${firstHref ?? "—"}`,
    );

    // Keep Invoices expanded for the screenshot already captured; collapse others.
    if (title !== "Invoices") {
      await bucket.locator("summary").click();
      await page.waitForTimeout(150);
    }
  }

  // Navigate to first Invoices item via full goto (authoritative landing check).
  const invoices = results.find((r) => r.title === "Invoices");
  if (invoices?.firstHref) {
    await page.goto(`${BASE_URL}${invoices.firstHref}`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await page.waitForTimeout(800);
    const landed = page.url();
    const heading = await page
      .locator("h1, h2")
      .first()
      .innerText()
      .catch(() => "");
    console.log(`Invoice drill-down landed: ${landed}`);
    console.log(`Page heading: ${heading}`);
    const landedPath = path.join(
      OUTPUT_DIR,
      "dashboard-exception-invoice-landed.png",
    );
    await page.screenshot({ path: landedPath, fullPage: true });
    console.log(`Wrote ${landedPath}`);

    if (!landed.includes("/invoices/")) {
      throw new Error(`Expected invoice detail URL, got ${landed}`);
    }
  }

  // Spot-check Estimates openHref if present.
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(800);
  const estimatesBucket = page
    .locator('[aria-label="Needs attention"] details')
    .filter({ hasText: "Estimates" })
    .first();
  if ((await estimatesBucket.count()) > 0) {
    await estimatesBucket.locator("summary").click();
    await page.waitForTimeout(300);
    const estHref = await estimatesBucket
      .locator("ul a[href]")
      .first()
      .getAttribute("href");
    console.log(`Estimates first item href: ${estHref}`);
    if (estHref) {
      await page.goto(`${BASE_URL}${estHref}`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await page.waitForTimeout(600);
      console.log(`Estimates drill-down landed: ${page.url()}`);
      const estPath = path.join(
        OUTPUT_DIR,
        "dashboard-exception-estimate-landed.png",
      );
      await page.screenshot({ path: estPath, fullPage: true });
      console.log(`Wrote ${estPath}`);
    }
  }

  // Spot-check Dispatch technician deep link.
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(800);
  const dispatchBucket = page
    .locator('[aria-label="Needs attention"] details')
    .filter({ hasText: "Dispatch" })
    .first();
  if ((await dispatchBucket.count()) > 0) {
    await dispatchBucket.locator("summary").click();
    await page.waitForTimeout(300);
    const dispatchHref = await dispatchBucket
      .locator("ul a[href]")
      .first()
      .getAttribute("href");
    console.log(`Dispatch first item href: ${dispatchHref}`);
    if (dispatchHref) {
      await page.goto(`${BASE_URL}${dispatchHref}`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await page.waitForTimeout(1000);
      console.log(`Dispatch drill-down landed: ${page.url()}`);
      const focusedLane = page.locator('[id^="dispatch-tech-"]');
      const focusedCount = await focusedLane.count();
      console.log(`Dispatch tech lanes on page: ${focusedCount}`);
      const dispatchPath = path.join(
        OUTPUT_DIR,
        "dashboard-exception-dispatch-landed.png",
      );
      await page.screenshot({ path: dispatchPath, fullPage: true });
      console.log(`Wrote ${dispatchPath}`);
      if (!page.url().includes("focus=overload")) {
        throw new Error(`Expected overload focus, got ${page.url()}`);
      }
    }
  }

  await browser.close();
  console.log("Drill-down verification complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
