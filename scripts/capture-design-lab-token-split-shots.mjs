/**
 * Before + independence shots for the text/border/caught-up token split.
 *
 *   node scripts/capture-design-lab-token-split-shots.mjs
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

async function openCanvas(page) {
  await page.goto(new URL("/platform/design-lab", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.getByText("Live token controls").waitFor({ timeout: 30_000 });
  const openBtn = page.getByRole("button", { name: "Open full page canvas" });
  if (await openBtn.count()) {
    await openBtn.click();
  }
  await page.locator(".design-lab-preview").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function setProbe(page, targetId, fieldLabel, hex) {
  const target = page
    .locator(`.design-lab-preview [data-edit-target="${targetId}"]`)
    .first();
  await target.evaluate((el) => el.click());
  const input = page.getByLabel(`${fieldLabel} color value`).first();
  await input.waitFor({ timeout: 15_000 });
  await input.click({ clickCount: 3 });
  await input.fill(hex);
  await input.press("Enter");
  await page.waitForTimeout(400);
  await target.scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(250);
  return target;
}

async function main() {
  if (!fs.existsSync(AUTH_PATH)) {
    throw new Error("Missing .playwright/founder-auth.json");
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 1600, height: 1100 },
  });
  const page = await context.newPage();

  try {
    await openCanvas(page);
    await page.screenshot({
      path: path.join(OUT_DIR, "design-lab-token-split-before.png"),
      fullPage: false,
    });
    console.log("Wrote design-lab-token-split-before.png");

    await setProbe(page, "caught-up-fill", "Caught-up fill", "#7C3AED");
    const minimize = page.getByRole("button", { name: /Minimize/i });
    if (await minimize.count()) {
      await minimize.first().click();
      await page.waitForTimeout(250);
    }
    const caughtUp = page
      .locator('.design-lab-preview [data-edit-target="caught-up-fill"]')
      .first();
    await caughtUp.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUT_DIR, "design-lab-caught-up-fill-only.png"),
      fullPage: false,
    });
    console.log("Wrote design-lab-caught-up-fill-only.png");

    // Re-open inspector for content-well probe
    const inspectorBtn = page.getByRole("button", { name: /^Inspector$/i });
    if (await inspectorBtn.count()) {
      await inspectorBtn.first().click();
      await page.waitForTimeout(250);
    }
    await setProbe(page, "content-well", "Content well", "#0E7490");
    if (await minimize.count()) {
      await minimize.first().click();
      await page.waitForTimeout(250);
    }
    await caughtUp.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(OUT_DIR, "design-lab-content-well-vs-caught-up.png"),
      fullPage: false,
    });
    console.log("Wrote design-lab-content-well-vs-caught-up.png");

    await openCanvas(page);
    await setProbe(page, "topbar-heading", "Topbar heading", "#FFE600");
    await page.screenshot({
      path: path.join(OUT_DIR, "design-lab-topbar-heading-only.png"),
      fullPage: false,
    });
    console.log("Wrote design-lab-topbar-heading-only.png");

    await openCanvas(page);
    await setProbe(page, "section-title", "Section title", "#22D3EE");
    await page.screenshot({
      path: path.join(OUT_DIR, "design-lab-section-title-only.png"),
      fullPage: false,
    });
    console.log("Wrote design-lab-section-title-only.png");

    await openCanvas(page);
    await setProbe(page, "plate-border", "Plate border", "#DB2777");
    await page.screenshot({
      path: path.join(OUT_DIR, "design-lab-plate-border-only.png"),
      fullPage: false,
    });
    console.log("Wrote design-lab-plate-border-only.png");

    await openCanvas(page);
    await setProbe(page, "section-divider", "Section divider", "#F97316");
    await page.screenshot({
      path: path.join(OUT_DIR, "design-lab-section-divider-only.png"),
      fullPage: false,
    });
    console.log("Wrote design-lab-section-divider-only.png");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
