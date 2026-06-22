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
 *   public/marketing/screenshots/social/*-facebook-card-v2.png (1080x1080 Facebook-ready cards)
 *   public/marketing/screenshots/social/_debug/founder-screenshot-contact-sheet.html (visual diff aid)
 */

import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUTPUT_DIR = path.join(ROOT, "public", "marketing", "screenshots", "social");
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";
const CARDS_ONLY = process.env.CARDS_ONLY === "1";

const VIEWPORT = { width: 1440, height: 900 };
const CLIP_WIDTH = 1200;
const CLIP_HEIGHT = 540;
const CARD_SIZE = 1080;
const CARD_SCREENSHOT_WIDTH = 980;
const CARD_SCREENSHOT_HEIGHT = 590;

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

/** @type {Array<{ id: string; screenshot: string; output: string; label: string; headline: string; subheadline: string; footer: string }>} */
const SOCIAL_CARDS = [
  {
    id: "reports-workspace",
    screenshot: "reports-workspace.png",
    output: "reports-workspace-facebook-card-v2.png",
    label: "Altair OS",
    headline: "Reports that show what changed",
    subheadline:
      "Revenue, jobs, cash flow, and performance in one operating brief.",
    footer: "Built for small HVAC & trades companies",
  },
  {
    id: "leads-workspace",
    screenshot: "leads-workspace.png",
    output: "leads-workspace-facebook-card-v2.png",
    label: "Altair OS",
    headline: "Leads that stay organized",
    subheadline:
      "Track inquiries, follow-ups, and conversions without losing momentum.",
    footer: "Built for small HVAC & trades companies",
  },
];

const CONTACT_SHEET_FILES = [
  {
    file: "reports-workspace.png",
    kind: "RAW",
    publicPath: "/marketing/screenshots/social/reports-workspace.png",
  },
  {
    file: "reports-workspace-facebook-card-v2.png",
    kind: "CARD",
    publicPath:
      "/marketing/screenshots/social/reports-workspace-facebook-card-v2.png",
  },
  {
    file: "leads-workspace.png",
    kind: "RAW",
    publicPath: "/marketing/screenshots/social/leads-workspace.png",
  },
  {
    file: "leads-workspace-facebook-card-v2.png",
    kind: "CARD",
    publicPath:
      "/marketing/screenshots/social/leads-workspace-facebook-card-v2.png",
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

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildSocialCardHtml({ screenshotDataUrl, label, headline, subheadline, footer }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${CARD_SIZE}px;
      height: ${CARD_SIZE}px;
      overflow: hidden;
      background: #070b10;
    }
    .card {
      width: ${CARD_SIZE}px;
      height: ${CARD_SIZE}px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 26px 28px 22px;
      border: 4px solid rgb(201 164 77 / 0.55);
      box-shadow:
        inset 0 0 0 1px rgb(255 255 255 / 0.08),
        0 0 0 2px rgb(7 11 16 / 0.9);
      background:
        radial-gradient(ellipse 120% 70% at 50% -10%, rgb(201 164 77 / 0.16) 0%, transparent 58%),
        radial-gradient(ellipse 90% 55% at 88% 92%, rgb(138 99 36 / 0.12) 0%, transparent 62%),
        linear-gradient(180deg, #141c28 0%, #0a1018 55%, #070b10 100%);
      color: #f3ebdd;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    }
    .copy {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    .label {
      color: #c9a44d;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    .headline {
      margin-top: 10px;
      max-width: ${CARD_SCREENSHOT_WIDTH}px;
      color: #fff9ea;
      font-size: 38px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.08;
      text-align: center;
    }
    .subheadline {
      margin-top: 8px;
      max-width: ${CARD_SCREENSHOT_WIDTH}px;
      color: #c9bfae;
      font-size: 20px;
      font-weight: 500;
      line-height: 1.3;
      text-align: center;
    }
    .screenshot-frame {
      flex: 0 0 auto;
      width: ${CARD_SCREENSHOT_WIDTH}px;
      height: ${CARD_SCREENSHOT_HEIGHT}px;
      padding: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 18px;
      border: 1px solid rgb(201 164 77 / 0.28);
      background: linear-gradient(180deg, rgb(16 26 40 / 0.92) 0%, rgb(11 17 24 / 0.96) 100%);
      box-shadow:
        0 0 0 1px rgb(255 255 255 / 0.04),
        0 18px 48px rgb(0 0 0 / 0.42),
        0 0 72px rgb(201 164 77 / 0.08);
    }
    .screenshot-frame img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: top center;
      border-radius: 12px;
      border: 1px solid rgb(255 255 255 / 0.06);
    }
    .footer {
      flex: 0 0 auto;
      margin-top: 12px;
      color: #8e826f;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="copy">
      <div class="label">${escapeHtml(label)}</div>
      <h1 class="headline">${escapeHtml(headline)}</h1>
      <p class="subheadline">${escapeHtml(subheadline)}</p>
    </div>
    <div class="screenshot-frame">
      <img src="${screenshotDataUrl}" alt="" />
    </div>
    <p class="footer">${escapeHtml(footer)}</p>
  </div>
</body>
</html>`;
}

async function renderSocialCard(page, card) {
  const screenshotPath = path.join(OUTPUT_DIR, card.screenshot);
  if (!fs.existsSync(screenshotPath)) {
    throw new Error(`Missing screenshot for card ${card.id}: ${path.relative(ROOT, screenshotPath)}`);
  }

  const screenshotDataUrl = `data:image/png;base64,${fs.readFileSync(screenshotPath).toString("base64")}`;
  const html = buildSocialCardHtml({
    screenshotDataUrl,
    label: card.label,
    headline: card.headline,
    subheadline: card.subheadline,
    footer: card.footer,
  });

  await page.setViewportSize({ width: CARD_SIZE, height: CARD_SIZE });
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const img = document.querySelector(".screenshot-frame img");
    return Boolean(img && img.complete && img.naturalWidth > 0);
  });

  const outputPath = path.join(OUTPUT_DIR, card.output);
  await page.locator(".card").screenshot({
    path: outputPath,
    type: "png",
  });

  console.log(`  → ${path.relative(ROOT, outputPath)} (${CARD_SIZE}x${CARD_SIZE})`);
  return outputPath;
}

function readPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf.length < 24 || buf.toString("ascii", 1, 4) !== "PNG") {
    return null;
  }

  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function buildContactSheetHtml(entries) {
  const panels = entries
    .map(
      (entry) => `<section class="panel panel-${entry.kind.toLowerCase()}">
      <div class="meta">
        <p class="filename">${escapeHtml(entry.file)}</p>
        <p><strong>Type:</strong> ${escapeHtml(entry.kind)}</p>
        <p><strong>Dimensions:</strong> ${escapeHtml(entry.dimensions)}</p>
        <p class="path"><strong>Path:</strong> ${escapeHtml(entry.publicPath)}</p>
      </div>
      <img src="${entry.dataUrl}" alt="${escapeHtml(entry.file)}" />
    </section>`,
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Founder screenshot contact sheet</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #1a1f2a;
      color: #f3ebdd;
      font-family: "Segoe UI", system-ui, sans-serif;
    }
    h1 { margin: 0 0 8px; font-size: 22px; }
    .intro { margin: 0 0 20px; color: #c9bfae; font-size: 14px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 20px;
    }
    .panel {
      border-radius: 12px;
      padding: 14px;
      background: #0f141d;
    }
    .panel-raw { border: 2px dashed #64748b; }
    .panel-card { border: 2px solid #c9a44d; }
    .meta { margin-bottom: 10px; font-size: 13px; line-height: 1.45; }
    .filename { margin: 0 0 6px; font-size: 15px; font-weight: 700; }
    .path { margin: 0; word-break: break-all; font-family: Consolas, monospace; font-size: 12px; }
    img {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 8px;
      border: 1px solid rgb(255 255 255 / 0.08);
      background: #070b10;
    }
  </style>
</head>
<body>
  <h1>Founder marketing screenshot contact sheet</h1>
  <p class="intro">RAW = browser crop only. CARD = 1080×1080 Facebook-ready branded card (v2).</p>
  <div class="grid">
    ${panels}
  </div>
</body>
</html>`;
}

async function writeContactSheet(page) {
  const debugDir = path.join(OUTPUT_DIR, "_debug");
  fs.mkdirSync(debugDir, { recursive: true });

  const entries = CONTACT_SHEET_FILES.map((item) => {
    const filePath = path.join(OUTPUT_DIR, item.file);
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `Missing contact sheet asset: ${path.relative(ROOT, filePath)}`,
      );
    }

    const dimensions = readPngDimensions(filePath);
    const dataUrl = `data:image/png;base64,${fs.readFileSync(filePath).toString("base64")}`;

    return {
      ...item,
      dimensions: dimensions
        ? `${dimensions.width}×${dimensions.height}`
        : "unknown",
      dataUrl,
    };
  });

  const html = buildContactSheetHtml(entries);
  const htmlPath = path.join(debugDir, "founder-screenshot-contact-sheet.html");
  fs.writeFileSync(htmlPath, html, "utf8");
  console.log(`  → ${path.relative(ROOT, htmlPath)}`);

  await page.setViewportSize({ width: 1400, height: 2200 });
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForFunction(() =>
    [...document.images].every((img) => img.complete && img.naturalWidth > 0),
  );

  const pngPath = path.join(debugDir, "founder-screenshot-contact-sheet.png");
  await page.screenshot({ path: pngPath, type: "png", fullPage: true });
  console.log(`  → ${path.relative(ROOT, pngPath)}`);
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
  if (!CARDS_ONLY) {
    assertAuthFile();
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    storageState: AUTH_PATH,
  });
  const page = await context.newPage();

  try {
    if (!CARDS_ONLY) {
      for (const capture of CAPTURES) {
        await captureSocialScreenshot(page, capture);
      }
    } else {
      console.log("CARDS_ONLY=1 — skipping live route captures.");
    }

    console.log("");
    console.log("Rendering Facebook-ready social cards...");

    for (const card of SOCIAL_CARDS) {
      console.log(`Card ${card.id}`);
      await renderSocialCard(page, card);
    }

    console.log("");
    console.log("Writing contact sheet for visual verification...");
    await writeContactSheet(page);
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
