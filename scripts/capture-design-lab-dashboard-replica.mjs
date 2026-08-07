/**
 * Side-by-side verification: live Dashboard vs Design Lab Dashboard replica.
 *
 * Prerequisites: local server, .playwright/founder-auth.json for localhost.
 *
 *   node scripts/capture-design-lab-dashboard-replica.mjs
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

async function shot(page, name, options = {}) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, ...options });
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
    await page.getByRole("heading", { name: "Needs attention" }).waitFor({
      timeout: 30_000,
    });
    await shot(page, "design-lab-replica-live-dashboard");

    await goto(page, "/platform/design-lab");
    await page.getByText("Live token controls").waitFor({ timeout: 30_000 });
    await page.getByRole("button", { name: "Open full page canvas" }).click();
    await page.getByRole("heading", { name: "Needs attention" }).waitFor({
      timeout: 30_000,
    });

    // Confirm showcase / demo chrome is gone from the replica canvas (not sidebar controls).
    const canvas = page.locator(".mc-dashboard-olive-canvas").first();
    await canvas.waitFor({ timeout: 10_000 });
    for (const forbidden of [
      "Demo mode",
      "Sharp MC tile",
      "Dark pages (ink / graphite)",
      "Hub work tables",
      "Customers · Team · Work · Sales",
    ]) {
      if ((await canvas.getByText(forbidden, { exact: false }).count()) > 0) {
        fail(`Replica still shows forbidden showcase copy: ${forbidden}`);
      }
    }

    // Confirm real bucket order / sample labels.
    for (const label of [
      "Payments",
      "Invoices",
      "Dispatch",
      "Jobs",
      "Estimates",
      "Leads",
      "Today's schedule",
      "Recent activity",
      "Next recommended",
    ]) {
      await canvas.getByText(label, { exact: true }).first().waitFor({
        timeout: 10_000,
      });
    }
    await page.getByText("Trial ends", { exact: false }).first().waitFor({
      timeout: 10_000,
    });

    await shot(page, "design-lab-replica-canvas");

    // Click-to-edit smoke: exception card → status colors; schedule → materials; next recommended → surfaces.
    await page.getByText("Invoices", { exact: true }).first().click({ force: true });
    await page.getByText("--altair-warning").first().waitFor({ timeout: 10_000 });
    await shot(page, "design-lab-replica-edit-status-colors");

    await page.getByRole("button", { name: "Minimize inspector" }).first().click().catch(() => {});
    await page.getByText("Today's schedule", { exact: true }).first().click({ force: true });
    await page.getByText("--altair-paper").first().waitFor({ timeout: 10_000 });
    await shot(page, "design-lab-replica-edit-materials");

    await page.getByRole("button", { name: "Minimize inspector" }).first().click().catch(() => {});
    await page.getByText("Next recommended", { exact: true }).first().click({ force: true });
    await page.getByText("Surface hierarchy", { exact: false }).first().waitFor({
      timeout: 10_000,
    });
    await shot(page, "design-lab-replica-edit-surfaces");

    console.log("Design Lab dashboard replica capture OK.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
