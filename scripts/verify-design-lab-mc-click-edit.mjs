/**
 * Verify Design Lab MC click-to-edit + bottom inspector + radius controls.
 *
 *   node scripts/verify-design-lab-mc-click-edit.mjs
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

  await page.goto(new URL("/platform/design-lab", BASE_URL).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 90_000,
  });
  await page.waitForLoadState("load").catch(() => {});
  await page.waitForTimeout(1200);

  await page.getByRole("button", { name: /Open full page canvas/i }).click();
  await page.waitForTimeout(1500);

  const canvas = page.locator(".design-lab-preview").first();
  await canvas.waitFor({ state: "visible", timeout: 30_000 });

  // Inspector should be a full-width bottom dock (not bottom-right float).
  const inspector = page.getByRole("complementary", {
    name: "Canvas color inspector",
  });
  await inspector.waitFor({ state: "visible", timeout: 15_000 });
  const inspectorBox = await inspector.boundingBox();
  if (!inspectorBox) fail("Inspector has no box");
  if (inspectorBox.y < 500) {
    fail(`Inspector not docked to bottom (y=${inspectorBox.y})`);
  }
  if (inspectorBox.width < 900) {
    fail(`Inspector not full-width (width=${inspectorBox.width})`);
  }
  console.log(
    `OK: inspector docked bottom full-width (${Math.round(inspectorBox.width)}×${Math.round(inspectorBox.height)} @ y=${Math.round(inspectorBox.y)})`,
  );

  // Shape controls present
  const shapeLabel = inspector.getByText("Panel radius", { exact: true });
  if ((await shapeLabel.count()) === 0) {
    fail("Missing Panel radius control in inspector");
  }
  console.log("OK: radius controls present in inspector");

  await shot(page, "design-lab-inspector-bottom-dock");

  async function openInspector() {
    const dock = page.getByRole("complementary", {
      name: "Canvas color inspector",
    });
    if (await dock.isVisible().catch(() => false)) {
      return dock;
    }
    await page.getByRole("button", { name: /^Inspector/i }).first().click();
    await page.waitForTimeout(250);
    await dock.waitFor({ state: "visible", timeout: 10_000 });
    return dock;
  }

  async function clickTarget(ariaLabel, expectedInspectorLabel) {
    // Minimize dock so fixed inspector does not steal click coordinates.
    const dock = page.getByRole("complementary", {
      name: "Canvas color inspector",
    });
    if (await dock.isVisible().catch(() => false)) {
      await dock.getByRole("button", { name: /Minimize/i }).click();
      await page.waitForTimeout(200);
    }

    const target = canvas.locator(`[aria-label="${ariaLabel}"]`).first();
    await target.scrollIntoViewIfNeeded();
    await target.click({ force: true, position: { x: 24, y: 12 } });
    await page.waitForTimeout(350);

    const opened = await openInspector();
    const text = await opened.innerText();
    const header = text.split("\n").slice(0, 8).join("\n");
    if (!new RegExp(expectedInspectorLabel, "i").test(header)) {
      fail(
        `Expected ${expectedInspectorLabel} after "${ariaLabel}", got:\n${header}`,
      );
    }
    if (
      /Content well/i.test(header) &&
      !new RegExp(expectedInspectorLabel, "i").test(header)
    ) {
      fail(`Click registered as Content well for "${ariaLabel}"`);
    }
    console.log(`OK: ${ariaLabel} → ${expectedInspectorLabel}`);
  }

  await clickTarget(
    "Edit status colors · Payments (low)",
    "Status colors",
  );
  await shot(page, "design-lab-click-exception-card");

  await clickTarget(
    "Edit Altair materials · Today's schedule",
    "Altair materials",
  );
  await shot(page, "design-lab-click-schedule-card");

  await clickTarget(
    "Edit surface hierarchy · Next recommended",
    "Surface hierarchy",
  );
  await shot(page, "design-lab-click-next-recommended");

  await clickTarget(
    "Edit text on chrome · Needs attention",
    "Text on chrome",
  );
  await shot(page, "design-lab-click-needs-attention-header");

  // Nudge panel radius slider and confirm CSS var moves on preview
  const panelSlider = inspector.locator("#design-lab-dim-radiusPanel");
  await panelSlider.fill("1.25");
  await page.waitForTimeout(300);
  const radiusOnPreview = await canvas.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--radius-panel").trim(),
  );
  if (radiusOnPreview !== "1.25rem") {
    fail(`Expected --radius-panel 1.25rem after slider, got ${radiusOnPreview}`);
  }
  console.log("OK: panel radius slider updates preview var");
  await shot(page, "design-lab-radius-panel-edited");

  await browser.close();
  console.log("All click-edit / inspector / radius checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
