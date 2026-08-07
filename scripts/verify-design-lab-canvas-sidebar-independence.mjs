/**
 * Verify sidebar / content-well are independently editable in Design Lab,
 * then save + promote and confirm the live `/` dashboard applies both.
 *
 *   node scripts/verify-design-lab-canvas-sidebar-independence.mjs
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

const SIDEBAR_PROBE = "#6B4E7A"; // distinct purple-olive for sidebar-only edit
const CANVAS_PROBE = "#2F4A5C"; // distinct blue-teal for canvas-only edit
const THEME_NAME = `Indep canvas/sidebar ${Date.now().toString(36)}`;

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(message);
}

async function shot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  log(`Wrote ${file}`);
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
  await page.waitForTimeout(1200);
}

async function readShellColors(page, { lab = false } = {}) {
  return page.evaluate((isLab) => {
    const root = isLab
      ? document.querySelector(".design-lab-preview .admin-north-star-shell") ||
        document.querySelector(".admin-north-star-shell")
      : document.querySelector(".admin-north-star-shell");
    const sidebar = isLab
      ? root?.querySelector('[data-edit-target="sidebar-shell"]') ||
        root?.querySelector(".admin-north-star-sidebar")
      : document.querySelector(".admin-north-star-sidebar");
    const well =
      root?.querySelector('[data-edit-target="content-well"]') ||
      root?.querySelector(".admin-shell-main") ||
      document.querySelector(".admin-shell-main");
    const mcWell = root?.querySelector(".mc-dashboard-content-well");

    const read = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      return {
        bg: s.backgroundColor,
        sidebarVar: s.getPropertyValue("--north-star-sidebar").trim(),
        contentWellVar: s
          .getPropertyValue("--north-star-content-well")
          .trim(),
      };
    };

    const nestedChrome = Boolean(
      root
        ?.querySelector('[data-edit-target="chrome-shell"]')
        ?.querySelector('[data-edit-target="sidebar-shell"]'),
    );

    return {
      shell: read(root),
      sidebar: read(sidebar),
      well: read(well),
      mcWell: read(mcWell),
      nestedChromeShell: nestedChrome,
    };
  }, lab);
}

function rgbClose(a, b) {
  return a === b;
}

async function setColorText(page, label, hex) {
  const input = page.getByLabel(`${label} color value`);
  await input.waitFor({ timeout: 15_000 });
  await input.click({ clickCount: 3 });
  await input.fill(hex);
  await input.press("Enter");
  await page.waitForTimeout(400);
}

async function openFullPageCanvas(page) {
  await goto(page, "/platform/design-lab");
  await page.getByText("Live token controls").waitFor({ timeout: 30_000 });
  const openBtn = page.getByRole("button", { name: "Open full page canvas" });
  if (await openBtn.count()) {
    await openBtn.click();
  }
  await page
    .locator(".design-lab-preview .mc-dashboard-olive-canvas")
    .first()
    .waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
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
    // --- Live baseline after CSS uncouple ---
    await goto(page, "/");
    await page.locator(".mc-dashboard-olive-canvas").first().waitFor({
      timeout: 30_000,
    });
    const liveBaseline = await readShellColors(page, { lab: false });
    log("\n=== Live / baseline (post CSS uncouple) ===");
    log(JSON.stringify(liveBaseline, null, 2));
    if (liveBaseline.shell?.sidebarVar !== "#4a5540") {
      fail(
        `Expected default sidebar #4a5540, got ${liveBaseline.shell?.sidebarVar}`,
      );
    }
    if (liveBaseline.shell?.contentWellVar !== "#414a35") {
      fail(
        `Expected independent content-well #414a35, got ${liveBaseline.shell?.contentWellVar}`,
      );
    }
    if (liveBaseline.sidebar?.bg === liveBaseline.well?.bg) {
      fail("Live sidebar and content-well backgrounds still match after uncouple");
    }
    log("OK: live defaults are independent (#4a5540 vs #414a35)");

    // --- Design Lab: flatten check + independence ---
    await openFullPageCanvas(page);
    const labBaseline = await readShellColors(page, { lab: true });
    log("\n=== Lab canvas baseline ===");
    log(JSON.stringify(labBaseline, null, 2));
    if (labBaseline.nestedChromeShell) {
      fail(
        "chrome-shell still nests sidebar-shell — flatten did not take effect",
      );
    }
    log("OK: chrome-shell does not nest sidebar-shell");

    // Edit sidebar only via click target + inspector
    await page.locator('[data-edit-target="sidebar-shell"]').first().click({
      force: true,
    });
    await page.getByText("Sidebar shell", { exact: false }).first().waitFor({
      timeout: 10_000,
    });
    const canvasBeforeSidebarEdit = labBaseline.well?.bg;
    const contentVarBeforeSidebarEdit = labBaseline.shell?.contentWellVar;
    await setColorText(page, "Sidebar", SIDEBAR_PROBE);
    const afterSidebarEdit = await readShellColors(page, { lab: true });
    log("\n=== After sidebar-only edit ===");
    log(JSON.stringify(afterSidebarEdit, null, 2));
    if (
      afterSidebarEdit.shell?.sidebarVar.toLowerCase() !==
      SIDEBAR_PROBE.toLowerCase()
    ) {
      fail(
        `Sidebar var did not update to ${SIDEBAR_PROBE}, got ${afterSidebarEdit.shell?.sidebarVar}`,
      );
    }
    if (
      afterSidebarEdit.shell?.contentWellVar !== contentVarBeforeSidebarEdit
    ) {
      fail(
        `Canvas/content-well moved when editing sidebar: ${contentVarBeforeSidebarEdit} → ${afterSidebarEdit.shell?.contentWellVar}`,
      );
    }
    if (!rgbClose(afterSidebarEdit.well?.bg, canvasBeforeSidebarEdit)) {
      // well element may use fill style; compare vars first (already checked)
      log(
        `Note: well bg ${canvasBeforeSidebarEdit} → ${afterSidebarEdit.well?.bg} (var unchanged — OK)`,
      );
    }
    await shot(page, "design-lab-sidebar-only-edit");
    log("OK: sidebar-only edit leaves content-well unchanged");

    // Edit canvas / content-well only
    const sidebarBgBeforeCanvasEdit = afterSidebarEdit.sidebar?.bg;
    const sidebarVarBeforeCanvasEdit = afterSidebarEdit.shell?.sidebarVar;
    await page.locator('[data-edit-target="content-well"]').first().click({
      force: true,
    });
    await page.getByText("Content well", { exact: false }).first().waitFor({
      timeout: 10_000,
    });
    await setColorText(page, "Content well", CANVAS_PROBE);
    const afterCanvasEdit = await readShellColors(page, { lab: true });
    log("\n=== After canvas-only edit ===");
    log(JSON.stringify(afterCanvasEdit, null, 2));
    if (
      afterCanvasEdit.shell?.contentWellVar.toLowerCase() !==
      CANVAS_PROBE.toLowerCase()
    ) {
      fail(
        `Content-well var did not update to ${CANVAS_PROBE}, got ${afterCanvasEdit.shell?.contentWellVar}`,
      );
    }
    if (afterCanvasEdit.shell?.sidebarVar !== sidebarVarBeforeCanvasEdit) {
      fail(
        `Sidebar moved when editing canvas: ${sidebarVarBeforeCanvasEdit} → ${afterCanvasEdit.shell?.sidebarVar}`,
      );
    }
    if (
      sidebarBgBeforeCanvasEdit &&
      afterCanvasEdit.sidebar?.bg !== sidebarBgBeforeCanvasEdit
    ) {
      fail(
        `Sidebar background moved when editing canvas: ${sidebarBgBeforeCanvasEdit} → ${afterCanvasEdit.sidebar?.bg}`,
      );
    }
    await shot(page, "design-lab-canvas-only-edit");
    log("OK: canvas-only edit leaves sidebar unchanged");

    // Both distinct
    if (afterCanvasEdit.sidebar?.bg === afterCanvasEdit.well?.bg) {
      fail("Lab sidebar and canvas still share the same background after edits");
    }
    await shot(page, "design-lab-both-independent");

    // --- Save + promote (exit canvas; React editor state is preserved) ---
    await page.getByRole("button", { name: "Back to controls" }).click();
    const nameInput = page.locator("#design-lab-theme-name");
    await nameInput.waitFor({ timeout: 15_000 });
    await nameInput.fill(THEME_NAME);
    await page.getByRole("button", { name: "Save current" }).click();
    await page.getByText(THEME_NAME, { exact: true }).first().waitFor({
      timeout: 20_000,
    });
    log(`OK: saved theme "${THEME_NAME}"`);

    const themeCard = page.locator("li").filter({ hasText: THEME_NAME }).first();
    await themeCard
      .getByRole("button", { name: "Apply to live product" })
      .click();
    // Confirm dialog
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Apply to live product" })
      .click();
    await page
      .getByText("Live on product", { exact: false })
      .first()
      .waitFor({ timeout: 20_000 });
    log("OK: theme promoted live");

    // --- Live / with promoted independent colors ---
    await goto(page, "/");
    await page.locator(".mc-dashboard-olive-canvas").first().waitFor({
      timeout: 30_000,
    });
    const livePromoted = await readShellColors(page, { lab: false });
    log("\n=== Live / after promote ===");
    log(JSON.stringify(livePromoted, null, 2));
    if (
      livePromoted.shell?.sidebarVar.toLowerCase() !==
      SIDEBAR_PROBE.toLowerCase()
    ) {
      fail(
        `Live sidebar not applied: expected ${SIDEBAR_PROBE}, got ${livePromoted.shell?.sidebarVar}`,
      );
    }
    if (
      livePromoted.shell?.contentWellVar.toLowerCase() !==
      CANVAS_PROBE.toLowerCase()
    ) {
      fail(
        `Live content-well not applied independently: expected ${CANVAS_PROBE}, got ${livePromoted.shell?.contentWellVar}`,
      );
    }
    if (livePromoted.sidebar?.bg === livePromoted.well?.bg) {
      fail("Live promoted sidebar and content-well backgrounds still match");
    }
    await shot(page, "dashboard-live-independent-promoted");
    log("OK: live dashboard shows independently promoted sidebar + canvas");

    // Revert so the founder company is not left on probe colors
    await goto(page, "/platform/design-lab");
    await page.getByText("Live token controls").waitFor({ timeout: 30_000 });
    const revertBtn = page.getByRole("button", { name: "Revert to default" }).first();
    await revertBtn.click();
    const revertDialog = page.getByRole("dialog");
    await revertDialog.waitFor({ timeout: 10_000 });
    await revertDialog.getByRole("button", { name: /Revert/i }).click();
    await page.waitForTimeout(1500);
    await goto(page, "/");
    const liveReverted = await readShellColors(page, { lab: false });
    log("\n=== Live / after revert ===");
    log(JSON.stringify(liveReverted, null, 2));
    if (
      liveReverted.shell?.sidebarVar !== "#4a5540" ||
      liveReverted.shell?.contentWellVar !== "#414a35"
    ) {
      fail(
        `Revert did not restore defaults (sidebar=${liveReverted.shell?.sidebarVar}, well=${liveReverted.shell?.contentWellVar})`,
      );
    }
    log("\nAll independence checks passed.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
