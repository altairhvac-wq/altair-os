/**
 * Pass 1 verification: live `/` dashboard vs Design Lab canvas after
 * MissionControlV2View swap (fixture-fed, no click-to-edit checks).
 *
 *   node scripts/capture-design-lab-mc-pass1.mjs
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

function fail(message) {
  console.error(message);
  process.exit(1);
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`Wrote ${file}`);
}

async function goto(page, route) {
  const response = await page.goto(new URL(route, BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  if (!response || response.status() >= 400) {
    fail(`Failed to load ${route}: ${response?.status()}`);
  }
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(1500);
}

async function collectCanvasSignals(page, canvas) {
  const texts = [
    "Needs attention",
    "Payments",
    "Invoices",
    "Dispatch",
    "Jobs",
    "Estimates",
    "Leads",
    "Team",
    "Customers",
    "Today's schedule",
    "Recent activity",
    "Next recommended",
  ];
  const present = {};
  for (const label of texts) {
    present[label] =
      (await canvas.getByText(label, { exact: true }).count()) > 0;
  }
  return present;
}

async function main() {
  if (!fs.existsSync(AUTH_PATH)) {
    fail("Missing .playwright/founder-auth.json — run npm run capture:founder-auth");
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 1600, height: 1100 },
  });
  const page = await context.newPage();

  try {
    await goto(page, "/");
    const liveCanvas = page.locator(".mc-dashboard-olive-canvas").first();
    await liveCanvas.waitFor({ timeout: 30_000 });
    await page.getByRole("heading", { name: "Needs attention" }).waitFor({
      timeout: 30_000,
    });
    const liveSignals = await collectCanvasSignals(page, liveCanvas);
    await shot(page, "design-lab-pass1-live-dashboard");

    await goto(page, "/platform/design-lab");
    await page.getByText("Live token controls").waitFor({ timeout: 30_000 });
    await page.getByRole("button", { name: "Open full page canvas" }).click();
    const labCanvas = page.locator(".mc-dashboard-olive-canvas").first();
    await labCanvas.waitFor({ timeout: 30_000 });
    await page.getByRole("heading", { name: "Needs attention" }).waitFor({
      timeout: 30_000,
    });

    for (const forbidden of [
      "Demo mode",
      "Sharp MC tile",
      "Dark pages (ink / graphite)",
      "Hub work tables",
    ]) {
      if ((await labCanvas.getByText(forbidden, { exact: false }).count()) > 0) {
        fail(`Lab canvas still shows forbidden showcase copy: ${forbidden}`);
      }
    }

    const labSignals = await collectCanvasSignals(page, labCanvas);

    // Fixture must force every exception bucket in the lab.
    for (const required of [
      "Payments",
      "Invoices",
      "Dispatch",
      "Jobs",
      "Estimates",
      "Leads",
      "Team",
      "Customers",
      "Today's schedule",
      "Recent activity",
      "Next recommended",
    ]) {
      if (!labSignals[required]) {
        fail(`Lab canvas missing expected label: ${required}`);
      }
    }

    await shot(page, "design-lab-pass1-lab-canvas");

    console.log("\n=== Pass 1 signal diff (live / vs lab canvas) ===");
    for (const key of Object.keys(labSignals)) {
      const live = liveSignals[key] ? "yes" : "no";
      const lab = labSignals[key] ? "yes" : "no";
      const mark = live === lab ? "same" : "DIFF";
      console.log(`${mark.padEnd(4)}  ${key.padEnd(22)} live=${live}  lab=${lab}`);
    }
    console.log("Design Lab MC pass 1 capture OK.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
