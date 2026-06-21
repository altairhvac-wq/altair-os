/**
 * Local developer tool: capture founder-safe marketing screenshots from a running app.
 *
 * Not for production, not exposed to end users, and not for customer companies.
 *
 * Prerequisites:
 *   1. npm run dev
 *   2. Founder auth storage state at .playwright/founder-auth.json
 *      Create it with: node scripts/save-founder-playwright-auth.mjs
 *
 * Usage:
 *   node scripts/capture-founder-marketing-screenshots.mjs
 *   BASE_URL=http://localhost:3000 node scripts/capture-founder-marketing-screenshots.mjs
 *
 * Output:
 *   public/marketing/screenshots/social/*.png (1200x540 social-ready crops)
 */

import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUTPUT_DIR = path.join(ROOT, "public", "marketing", "screenshots", "social");
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";

const VIEWPORT = { width: 1440, height: 900 };
const CLIP_WIDTH = 1200;
const CLIP_HEIGHT = 540;

/** @type {Array<{ id: string; route: string; output: string; anchor: string; ready?: string }>} */
const CAPTURES = [
  {
    id: "reports-workspace",
    route: "/reports?range=30d",
    output: "reports-workspace.png",
    anchor: ".north-star-reports-page-header",
    ready: ".reports-north-star-brief",
  },
  {
    id: "leads-workspace",
    route: "/leads",
    output: "leads-workspace.png",
    anchor: "h1",
    ready: "button.north-star-leads-primary-action, .leads-north-star-filter-bar, .north-star-leads-primary-action",
  },
];

function centeredClip(y) {
  const x = Math.round((VIEWPORT.width - CLIP_WIDTH) / 2);
  const clipY = Math.max(0, Math.round(y - 12));
  const maxY = VIEWPORT.height - CLIP_HEIGHT;
  return {
    x,
    y: Math.min(clipY, maxY),
    width: CLIP_WIDTH,
    height: CLIP_HEIGHT,
  };
}

async function waitForRouteReady(page, capture) {
  await page.waitForSelector(capture.anchor, {
    state: "visible",
    timeout: 45_000,
  });

  if (capture.ready) {
    await page.waitForSelector(capture.ready, {
      state: "attached",
      timeout: 45_000,
    });
  }

  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}

async function captureSocialScreenshot(page, capture) {
  const url = `${BASE_URL}${capture.route}`;
  console.log(`Capturing ${capture.id} from ${url}`);

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForRouteReady(page, capture);

  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `Auth required for ${capture.route}. Create ${path.relative(ROOT, AUTH_PATH)} with node scripts/save-founder-playwright-auth.mjs`,
    );
  }

  if (currentUrl.includes("/setup")) {
    throw new Error(
      `Founder account is not bootstrapped (${capture.route} redirected to /setup). Use a founder/internal Altair account with demo data.`,
    );
  }

  const anchor = page.locator(capture.anchor).first();
  const box = await anchor.boundingBox();

  if (!box) {
    throw new Error(`Could not measure anchor "${capture.anchor}" on ${capture.route}`);
  }

  const outputPath = path.join(OUTPUT_DIR, capture.output);
  await page.screenshot({
    path: outputPath,
    type: "png",
    clip: centeredClip(box.y),
  });

  console.log(`  → ${path.relative(ROOT, outputPath)}`);
  return outputPath;
}

function assertAuthFile() {
  if (fs.existsSync(AUTH_PATH)) {
    return;
  }

  console.error("");
  console.error("Missing founder Playwright auth state.");
  console.error("");
  console.error("1. Start the app: npm run dev");
  console.error("2. Save auth: node scripts/save-founder-playwright-auth.mjs");
  console.error("3. Re-run: npm run capture:founder-screenshots");
  console.error("");
  process.exit(1);
}

async function main() {
  assertAuthFile();
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    storageState: AUTH_PATH,
  });
  const page = await context.newPage();

  try {
    for (const capture of CAPTURES) {
      await captureSocialScreenshot(page, capture);
    }
  } finally {
    await browser.close();
  }

  console.log("");
  console.log("Founder marketing screenshots captured.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
