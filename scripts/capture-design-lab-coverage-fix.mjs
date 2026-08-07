/**
 * One-off verification for Design Lab foundation-token coverage fix:
 * 1) Screenshot relabeled Dark pages / Status colors / Hub work tables panels
 * 2) Before/after promote of a warning color on Dashboard + Dispatch
 *
 * Prerequisites: local server, .playwright/founder-auth.json for localhost.
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
const THEME_NAME = `Coverage fix warning ${Date.now()}`;
const WARNING_AFTER = "#C026D3"; // vivid magenta — unmistakable vs default amber

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

async function main() {
  if (!fs.existsSync(AUTH_PATH)) {
    fail("Missing .playwright/founder-auth.json — run npm run capture:founder-auth");
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 1600, height: 1000 },
  });
  context.on("dialog", async (dialog) => {
    await dialog.accept();
  });
  const page = await context.newPage();

  try {
    /* —— Before promote: product pages —— */
    await goto(page, "/");
    await shot(page, "design-lab-coverage-dashboard-before");

    await goto(page, "/dispatch");
    await shot(page, "design-lab-coverage-dispatch-before");

    /* —— Design Lab: relabeled panels —— */
    await goto(page, "/platform/design-lab");
    await page.getByText("Live token controls").waitFor({ timeout: 30_000 });

    // Confirm dead groups are gone and real groups exist in the sidebar.
    const sidebar = page.locator("aside").filter({ hasText: "Live token controls" });
    if (await sidebar.getByText("Exception urgency").count()) {
      fail("Sidebar still shows dead 'Exception urgency' group");
    }
    if (await sidebar.getByText("Dispatch register").count()) {
      fail("Sidebar still shows dead 'Dispatch register' group");
    }
    await sidebar.getByText("Hub work tables").first().waitFor();
    await sidebar.getByText("Altair foundation").first().waitFor();
    await sidebar.getByText("Altair foundation").first().scrollIntoViewIfNeeded();
    await shot(page, "design-lab-coverage-lab-overview");

    // Dashboard replica (dark pages / status / hub table chips) lives in canvas mode.
    await page.getByRole("button", { name: "Open full page canvas" }).click();
    await page.getByText("Dark pages (ink / graphite)").waitFor({ timeout: 30_000 });
    await shot(page, "design-lab-coverage-canvas-replica");

    // Click replica chips to open relabeled edit panels in the inspector.
    await page.getByText("Dark pages (ink / graphite)").click();
    await page.getByText("--altair-ink").first().waitFor();
    await page
      .getByText("Shared foundation materials used by Dispatch", { exact: false })
      .first()
      .waitFor();
    await shot(page, "design-lab-coverage-panel-dark-pages");

    // Minimize inspector so it doesn't cover bottom replica chips.
    await page.getByRole("button", { name: "Minimize inspector" }).first().click();
    await page.getByText("Customers · Team · Work · Sales").click({ force: true });
    await page.getByText("--north-star-work-band").first().waitFor();
    await shot(page, "design-lab-coverage-panel-hub-work-tables");

    // Exception cards open Status colors (shared foundation status tokens).
    await page.getByRole("button", { name: "Minimize inspector" }).first().click().catch(() => {});
    await page.getByText("Invoices", { exact: true }).first().click({ force: true });
    await page.getByText("--altair-warning").first().waitFor();
    await page
      .getByText("Shared status tokens", { exact: false })
      .first()
      .waitFor();
    await shot(page, "design-lab-coverage-panel-status-colors");

    // Exit canvas to use Live token controls + Saved themes for promote.
    await page.getByRole("button", { name: "Back to controls" }).click();
    await page.getByText("Live token controls").waitFor({ timeout: 20_000 });

    // Edit warning mid via the Live token controls input id.
    const warningInput = page.locator("#color---altair-warning");
    await warningInput.waitFor({ timeout: 15_000 });
    await warningInput.scrollIntoViewIfNeeded();
    await warningInput.fill(WARNING_AFTER);
    await warningInput.press("Enter");

    // Confirm compact preview medium tier picked up the change.
    await page.waitForTimeout(400);
    await shot(page, "design-lab-coverage-lab-warning-edited");

    // Save + promote
    await page.locator("#design-lab-theme-name").scrollIntoViewIfNeeded();
    await page.locator("#design-lab-theme-name").fill(THEME_NAME);
    await page.getByRole("button", { name: "Save current" }).click();
    await page.getByText(/Theme saved|saved/i).first().waitFor({ timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(800);

    const themeRow = page.locator("li").filter({ hasText: THEME_NAME }).first();
    await themeRow.waitFor({ timeout: 20_000 });
    await themeRow.getByRole("button", { name: "Apply to live product" }).click();

    // Confirm dialog
    const confirmApply = page.getByRole("button", { name: /Apply to live|Confirm|Yes/i }).last();
    await confirmApply.click();
    await page
      .getByText(/Live on product|applied to live|Theme applied/i)
      .first()
      .waitFor({ timeout: 30_000 });
    await shot(page, "design-lab-coverage-promoted");

    /* —— After promote: product pages must reflect foundation warning —— */
    await goto(page, "/");
    await shot(page, "design-lab-coverage-dashboard-after");

    await goto(page, "/dispatch");
    await shot(page, "design-lab-coverage-dispatch-after");

    // Read computed --altair-warning from admin shell on Dispatch
    const liveWarning = await page.evaluate(() => {
      const shell = document.querySelector(".admin-north-star-shell");
      if (!shell) return null;
      return getComputedStyle(shell).getPropertyValue("--altair-warning").trim();
    });
    console.log(`Live --altair-warning on Dispatch shell: ${liveWarning}`);
    if (!liveWarning || liveWarning.toUpperCase() !== WARNING_AFTER.toUpperCase()) {
      fail(
        `Promote did not set live --altair-warning. Expected ${WARNING_AFTER}, got ${liveWarning}`,
      );
    }

    // Also confirm Tailwind bridge
    const colorBridge = await page.evaluate(() => {
      const shell = document.querySelector(".admin-north-star-shell");
      if (!shell) return null;
      return getComputedStyle(shell)
        .getPropertyValue("--color-altair-warning")
        .trim();
    });
    console.log(`Live --color-altair-warning: ${colorBridge}`);

    /* —— Revert so we don't leave magenta live —— */
    await goto(page, "/platform/design-lab");
    const revertBtn = page.getByRole("button", { name: "Revert to default" }).first();
    if (await revertBtn.count()) {
      await revertBtn.click();
      const confirmRevert = page
        .getByRole("button", { name: /Revert|Confirm|Yes/i })
        .last();
      await confirmRevert.click();
      await page
        .getByText(/No live theme|reverted|Live theme removed|standard Altair/i)
        .first()
        .waitFor({ timeout: 30_000 })
        .catch(() => {});
      console.log("Reverted live theme.");
    }

    // Cleanup: delete the throwaway theme if possible
    const cleanupRow = page.locator("li").filter({ hasText: THEME_NAME }).first();
    if (await cleanupRow.count()) {
      await cleanupRow.getByRole("button", { name: "Delete" }).click();
      const confirmDelete = page
        .getByRole("button", { name: /Delete|Confirm|Yes/i })
        .last();
      if (await confirmDelete.count()) {
        await confirmDelete.click();
      }
    }

    console.log("Coverage fix verification passed.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
