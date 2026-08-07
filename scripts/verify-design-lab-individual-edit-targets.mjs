/**
 * Verify newly-split Design Lab edit targets each move only their own token.
 *
 *   node scripts/verify-design-lab-individual-edit-targets.mjs
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

const CASES = [
  {
    id: "chrome-border",
    inspectorTitle: "Chrome border",
    fieldLabel: "Chrome border",
    cssVar: "--north-star-border",
    probe: "#E11D48",
    mustNotMove: [
      "--north-star-section-divider",
      "--north-star-plate-border",
      "--north-star-content-well",
    ],
    shot: "design-lab-chrome-border-only",
    canvas: "dashboard-replica",
  },
  {
    id: "section-divider",
    inspectorTitle: "Section divider",
    fieldLabel: "Section divider",
    cssVar: "--north-star-section-divider",
    probe: "#F97316",
    mustNotMove: [
      "--north-star-border",
      "--north-star-plate-border",
      "--north-star-content-well",
    ],
    shot: "design-lab-section-divider-only",
    canvas: "dashboard-replica",
  },
  {
    id: "plate-border",
    inspectorTitle: "Plate border",
    fieldLabel: "Plate border",
    cssVar: "--north-star-plate-border",
    probe: "#DB2777",
    mustNotMove: [
      "--north-star-border",
      "--north-star-section-divider",
      "--north-star-content-well",
    ],
    shot: "design-lab-plate-border-only",
    canvas: "dashboard-replica",
  },
  {
    id: "content-well",
    inspectorTitle: "Content well",
    fieldLabel: "Content well",
    cssVar: "--north-star-content-well",
    probe: "#0E7490",
    mustNotMove: [
      "--north-star-caught-up-fill",
      "--north-star-sidebar",
      "--north-star-border",
    ],
    shot: "design-lab-content-well-only",
    canvas: "dashboard-replica",
  },
  {
    id: "caught-up-fill",
    inspectorTitle: "Caught-up fill",
    fieldLabel: "Caught-up fill",
    cssVar: "--north-star-caught-up-fill",
    probe: "#7C3AED",
    mustNotMove: [
      "--north-star-content-well",
      "--north-star-sidebar",
      "--north-star-border",
    ],
    shot: "design-lab-caught-up-fill-only",
    canvas: "dashboard-replica",
  },
  {
    id: "chrome-shell",
    inspectorTitle: "Page canvas",
    fieldLabel: "Page canvas",
    cssVar: "--north-star-root",
    probe: "#7C3AED",
    mustNotMove: [
      "--north-star-sidebar",
      "--north-star-content-well",
      "--north-star-border",
    ],
    shot: "design-lab-page-canvas-only",
    canvas: "dashboard-replica",
  },
  {
    id: "header-strip",
    inspectorTitle: "Header strip",
    fieldLabel: "Header strip",
    cssVar: "--north-star-header-strip",
    probe: "#B45309",
    mustNotMove: ["--north-star-content-well", "--north-star-sidebar"],
    shot: "design-lab-header-strip-only",
    canvas: "workspace-demo",
  },
  {
    id: "topbar-heading",
    inspectorTitle: "Topbar heading",
    fieldLabel: "Topbar heading",
    cssVar: "--north-star-topbar-heading",
    probe: "#FFE600",
    mustNotMove: [
      "--north-star-section-title",
      "--north-star-link-hover",
      "--north-star-sidebar-link-hover",
    ],
    shot: "design-lab-topbar-heading-only",
    canvas: "dashboard-replica",
  },
  {
    id: "section-title",
    inspectorTitle: "Section title",
    fieldLabel: "Section title",
    cssVar: "--north-star-section-title",
    probe: "#22D3EE",
    mustNotMove: [
      "--north-star-topbar-heading",
      "--north-star-link-hover",
      "--north-star-section-secondary",
    ],
    shot: "design-lab-section-title-only",
    canvas: "dashboard-replica",
  },
  {
    id: "link-hover",
    inspectorTitle: "Link hover",
    fieldLabel: "Link hover",
    cssVar: "--north-star-link-hover",
    probe: "#FB7185",
    mustNotMove: [
      "--north-star-topbar-heading",
      "--north-star-section-title",
      "--north-star-sidebar-link-hover",
      "--north-star-link",
    ],
    shot: "design-lab-link-hover-only",
    canvas: "dashboard-replica",
  },
  {
    id: "topbar-subcopy",
    inspectorTitle: "Topbar subcopy",
    fieldLabel: "Topbar subcopy",
    cssVar: "--north-star-topbar-subcopy",
    probe: "#A3E635",
    mustNotMove: [
      "--north-star-section-secondary",
      "--north-star-link",
      "--north-star-topbar-icon",
    ],
    shot: "design-lab-topbar-subcopy-only",
    canvas: "dashboard-replica",
  },
  {
    id: "section-secondary",
    inspectorTitle: "Section secondary",
    fieldLabel: "Section secondary",
    cssVar: "--north-star-section-secondary",
    probe: "#FBBF24",
    mustNotMove: [
      "--north-star-topbar-subcopy",
      "--north-star-link",
      "--north-star-topbar-icon",
    ],
    shot: "design-lab-section-secondary-only",
    canvas: "dashboard-replica",
  },
  {
    id: "link-base",
    inspectorTitle: "Link",
    fieldLabel: "Link",
    cssVar: "--north-star-link",
    probe: "#38BDF8",
    mustNotMove: [
      "--north-star-link-hover",
      "--north-star-section-secondary",
      "--north-star-topbar-subcopy",
    ],
    shot: "design-lab-link-base-only",
    canvas: "dashboard-replica",
  },
  {
    id: "topbar-icon",
    inspectorTitle: "Topbar icon",
    fieldLabel: "Topbar icon",
    cssVar: "--north-star-topbar-icon",
    probe: "#C084FC",
    mustNotMove: [
      "--north-star-topbar-subcopy",
      "--north-star-section-secondary",
      "--north-star-link",
    ],
    shot: "design-lab-topbar-icon-only",
    canvas: "dashboard-replica",
  },
];

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
  await page.waitForTimeout(1000);
}

async function readVars(page) {
  return page.evaluate(() => {
    const root =
      document.querySelector(".design-lab-preview .admin-north-star-shell") ||
      document.querySelector(".design-lab-preview") ||
      document.documentElement;
    const style = getComputedStyle(root);
    const keys = [
      "--north-star-root",
      "--north-star-sidebar",
      "--north-star-topbar",
      "--north-star-panel",
      "--north-star-border",
      "--north-star-section-divider",
      "--north-star-plate-border",
      "--north-star-header-strip",
      "--north-star-content-well",
      "--north-star-caught-up-fill",
      "--north-star-topbar-heading",
      "--north-star-section-title",
      "--north-star-link-hover",
      "--north-star-topbar-subcopy",
      "--north-star-section-secondary",
      "--north-star-link",
      "--north-star-topbar-icon",
      "--north-star-sidebar-link-hover",
    ];
    const out = {};
    for (const key of keys) {
      out[key] = style.getPropertyValue(key).trim();
    }
    return out;
  });
}

async function setColorText(page, label, hex) {
  const input = page.getByLabel(`${label} color value`).first();
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
  await page.locator(".design-lab-preview").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
}

async function setCanvasTarget(page, target) {
  const select = page.getByLabel("Canvas target");
  await select.waitFor({ timeout: 10_000 });
  await select.selectOption(target);
  await page.waitForTimeout(700);
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
    await openFullPageCanvas(page);

    const legacy = await page
      .locator('[data-edit-target="chrome-two-tone"]')
      .count();
    if (legacy > 0) {
      fail("Legacy chrome-two-tone edit target still present in the canvas");
    }
    log("OK: chrome-two-tone removed from canvas");

    let currentCanvas = "dashboard-replica";

    for (const testCase of CASES) {
      log(`\n=== ${testCase.id} ===`);

      if (testCase.canvas !== currentCanvas) {
        await setCanvasTarget(page, testCase.canvas);
        currentCanvas = testCase.canvas;
      }

      // Reset canvas between probes so prior probe colors don't poison mustNotMove
      await openFullPageCanvas(page);
      if (testCase.canvas !== "dashboard-replica") {
        await setCanvasTarget(page, testCase.canvas);
        currentCanvas = testCase.canvas;
      } else {
        currentCanvas = "dashboard-replica";
      }

      const target = page
        .locator(`.design-lab-preview [data-edit-target="${testCase.id}"]`)
        .first();
      if ((await target.count()) === 0) {
        fail(`Missing edit target ${testCase.id} in preview`);
      }

      const before = await readVars(page);
      // Prefer a direct element click so nested edit targets (MC cards, etc.)
      // don't steal the hit-test when the target is a large wrapper.
      await target.evaluate((el) => {
        el.click();
      });
      await page
        .getByText(testCase.inspectorTitle, { exact: false })
        .first()
        .waitFor({ timeout: 10_000 });

      // Single-field target: the editing panel should expose this one field label
      const field = page.getByLabel(`${testCase.fieldLabel} color value`);
      if ((await field.count()) < 1) {
        fail(`Missing field control for ${testCase.fieldLabel}`);
      }

      await setColorText(page, testCase.fieldLabel, testCase.probe);
      const after = await readVars(page);

      if (
        after[testCase.cssVar].toLowerCase() !== testCase.probe.toLowerCase()
      ) {
        fail(
          `${testCase.cssVar} did not update to ${testCase.probe}, got ${after[testCase.cssVar]}`,
        );
      }

      for (const other of testCase.mustNotMove) {
        if (after[other] !== before[other]) {
          fail(
            `${other} moved while editing ${testCase.id}: ${before[other]} → ${after[other]}`,
          );
        }
      }

      await target.scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(200);
      await shot(page, testCase.shot);
      log(`OK: ${testCase.id} moves only ${testCase.cssVar}`);
    }

    log("\nAll individual edit-target isolation checks passed.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
