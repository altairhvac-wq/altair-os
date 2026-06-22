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
 *   public/marketing/screenshots/social/*-feature-crop.png (tight feature-focused crops)
 *   public/marketing/screenshots/social/*-feature-card.png (1080x1080 feature-focused cards)
 *   public/marketing/screenshots/social/*-facebook-card-v2.png (1080x1080 legacy full-width cards)
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
const SKIP_LIVE_CAPTURE = process.env.SKIP_LIVE_CAPTURE === "1";

const VIEWPORT = { width: 1440, height: 900 };
const CLIP_WIDTH = 1200;
const CLIP_HEIGHT = 540;
const CARD_SIZE = 1080;
const CARD_SCREENSHOT_WIDTH = 980;
const CARD_SCREENSHOT_HEIGHT = 590;
const FEATURE_CAPTURE_SCALE = 2;

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

/** @type {Array<{ id: string; route: string; output: string; anchor: string; ready?: string; startSelector: string; endSelector: string; contentSelector?: string }>} */
const FEATURE_CROPS = [
  {
    id: "reports-workspace",
    route: "/reports?range=30d",
    output: "reports-feature-crop.png",
    anchor: ".north-star-reports-page-header",
    ready: ".reports-north-star-brief",
    startSelector: ".north-star-reports-page-header",
    endSelector: ".reports-north-star-brief > .grid.lg\\:grid-cols-12",
    contentSelector: ".reports-north-star-brief",
  },
  {
    id: "leads-workspace",
    route: "/leads",
    output: "leads-feature-crop.png",
    anchor: "h1",
    ready:
      "button.north-star-leads-primary-action, .leads-north-star-filter-bar, .north-star-leads-primary-action",
    startSelector: "h1",
    endSelector: "table tbody tr:nth-child(5)",
    contentSelector: "table",
  },
];

/** @type {Array<{ id: string; screenshot: string; output: string; label: string; headline: string; subheadline: string; footer: string }>} */
const FEATURE_CARDS = [
  {
    id: "reports-workspace",
    screenshot: "reports-feature-crop.png",
    output: "reports-feature-card.png",
    label: "Altair OS",
    headline: "Reports that show what changed",
    subheadline:
      "Revenue, jobs, cash flow, and performance in one operating brief.",
    footer: "Built for small HVAC & trades companies",
    frameBackground:
      "linear-gradient(180deg, #fbf7ef 0%, #efe4cb 100%)",
    objectFit: "contain",
    screenshotHeight: CARD_SIZE - 184,
  },
  {
    id: "leads-workspace",
    screenshot: "leads-feature-crop.png",
    output: "leads-feature-card.png",
    label: "Altair OS",
    headline: "Leads that stay organized",
    subheadline:
      "Track inquiries, follow-ups, and conversions without losing momentum.",
    footer: "Built for small HVAC & trades companies",
    frameBackground:
      "linear-gradient(180deg, #1f2834 0%, #141c28 100%)",
    objectFit: "contain",
    screenshotHeight: 430,
  },
];

/** Fallback pixel crops from wide raw screenshots when live auth capture is unavailable. */
const FEATURE_CROP_FROM_RAW = {
  "reports-workspace": {
    input: "reports-workspace.png",
    output: "reports-feature-crop.png",
  },
  "leads-workspace": {
    input: "leads-workspace.png",
    output: "leads-feature-crop.png",
    clip: { x: 56, y: 84, width: 1088, height: 300 },
  },
};

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
    file: "reports-feature-crop.png",
    kind: "FEATURE",
    publicPath: "/marketing/screenshots/social/reports-feature-crop.png",
  },
  {
    file: "reports-feature-card.png",
    kind: "FEATURE-CARD",
    publicPath: "/marketing/screenshots/social/reports-feature-card.png",
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
    file: "leads-feature-crop.png",
    kind: "FEATURE",
    publicPath: "/marketing/screenshots/social/leads-feature-crop.png",
  },
  {
    file: "leads-feature-card.png",
    kind: "FEATURE-CARD",
    publicPath: "/marketing/screenshots/social/leads-feature-card.png",
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

async function measureFeatureClip(page, crop) {
  const clip = await page.evaluate(
    ({ startSelector, endSelector, contentSelector, padX, padY, viewportWidth, viewportHeight }) => {
      const start = document.querySelector(startSelector);
      const end = document.querySelector(endSelector);
      const content = contentSelector
        ? document.querySelector(contentSelector)
        : null;

      if (!start || !end) {
        return null;
      }

      const startBox = start.getBoundingClientRect();
      const endBox = end.getBoundingClientRect();
      const contentBox = content?.getBoundingClientRect();

      const top = Math.max(0, startBox.top - padY);
      const bottom = Math.min(viewportHeight, endBox.bottom + padY);

      let left = Math.min(startBox.left, endBox.left) - padX;
      let right = Math.max(startBox.right, endBox.right) + padX;

      if (contentBox) {
        left = Math.max(left, contentBox.left - padX);
        right = Math.min(
          Math.max(right, contentBox.right + padX),
          viewportWidth,
        );
      }

      const width = Math.max(1, right - left);
      const height = Math.max(1, bottom - top);

      return {
        x: Math.round(Math.max(0, left)),
        y: Math.round(top),
        width: Math.round(Math.min(width, viewportWidth)),
        height: Math.round(Math.min(height, viewportHeight - top)),
      };
    },
    {
      startSelector: crop.startSelector,
      endSelector: crop.endSelector,
      contentSelector: crop.contentSelector ?? null,
      padX: crop.padX ?? 10,
      padY: crop.padY ?? 8,
      viewportWidth: VIEWPORT.width,
      viewportHeight: VIEWPORT.height,
    },
  );

  if (!clip) {
    throw new Error(
      `Could not measure feature crop for ${crop.id} (${crop.startSelector} → ${crop.endSelector})`,
    );
  }

  return clip;
}

async function captureFeatureCrop(page, crop) {
  const url = `${BASE_URL}${crop.route}`;
  console.log(`Feature crop ${crop.id} from ${url}`);

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForRouteReady(page, crop);

  const currentUrl = page.url();
  if (currentUrl.includes("/login")) {
    throw new Error(
      `Auth required for ${crop.route}. Create ${path.relative(ROOT, AUTH_PATH)} with node scripts/save-founder-playwright-auth.mjs`,
    );
  }

  if (currentUrl.includes("/setup")) {
    throw new Error(
      `Founder account is not bootstrapped (${crop.route} redirected to /setup). Use a founder/internal Altair account with demo data.`,
    );
  }

  const clip = await measureFeatureClip(page, crop);
  const outputPath = path.join(OUTPUT_DIR, crop.output);

  await page.screenshot({
    path: outputPath,
    type: "png",
    clip,
  });

  const dimensions = readPngDimensions(outputPath);
  console.log(
    `  → ${path.relative(ROOT, outputPath)} (${dimensions?.width ?? "?"}x${dimensions?.height ?? "?"})`,
  );
  return outputPath;
}

async function deriveFeatureCropFromRaw(page, cropId) {
  const config = FEATURE_CROP_FROM_RAW[cropId];
  if (!config) {
    throw new Error(`No raw fallback crop config for ${cropId}`);
  }

  const inputPath = path.join(OUTPUT_DIR, config.input);
  if (!fs.existsSync(inputPath)) {
    throw new Error(
      `Missing raw screenshot for ${cropId}: ${path.relative(ROOT, inputPath)}`,
    );
  }

  const outputPath = path.join(OUTPUT_DIR, config.output);
  const screenshotDataUrl = `data:image/png;base64,${fs.readFileSync(inputPath).toString("base64")}`;

  await page.setViewportSize({ width: VIEWPORT.width, height: VIEWPORT.height });
  await page.setContent(
    `<!DOCTYPE html><html><body style="margin:0"><img id="source" src="${screenshotDataUrl}" alt="" /></body></html>`,
    { waitUntil: "load" },
  );
  await page.waitForFunction(() => {
    const img = document.getElementById("source");
    return Boolean(img && img.complete && img.naturalWidth > 0);
  });

  const pngBase64 = await page.evaluate((clip) => {
    const img = document.getElementById("source");
    const sourceWidth = img.naturalWidth;
    const sourceHeight = img.naturalHeight;
    const target = clip ?? {
      x: 0,
      y: 0,
      width: sourceWidth,
      height: sourceHeight,
    };

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      img,
      target.x,
      target.y,
      target.width,
      target.height,
      0,
      0,
      target.width,
      target.height,
    );
    return canvas.toDataURL("image/png").split(",")[1];
  }, config.clip ?? null);

  fs.writeFileSync(outputPath, Buffer.from(pngBase64, "base64"));

  const dimensions = readPngDimensions(outputPath);
  console.log(
    `  → ${path.relative(ROOT, outputPath)} (${dimensions?.width ?? "?"}x${dimensions?.height ?? "?"}) [raw fallback]`,
  );
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

function buildFeatureCardHtml({
  screenshotDataUrl,
  label,
  headline,
  subheadline,
  footer,
  frameBackground,
  objectFit = "cover",
  screenshotHeight = CARD_SIZE - 184,
}) {
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
      padding: 18px 20px 14px;
      gap: 10px;
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
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    .headline {
      margin-top: 6px;
      max-width: 1000px;
      color: #fff9ea;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.06;
      text-align: center;
    }
    .subheadline {
      margin-top: 5px;
      max-width: 1000px;
      color: #c9bfae;
      font-size: 17px;
      font-weight: 500;
      line-height: 1.26;
      text-align: center;
    }
    .screenshot-frame {
      flex: 0 0 auto;
      width: 100%;
      max-width: 1020px;
      height: ${screenshotHeight}px;
      padding: 0;
      display: flex;
      overflow: hidden;
      border-radius: 14px;
      border: 1px solid rgb(201 164 77 / 0.32);
      background: ${frameBackground};
      box-shadow:
        0 0 0 1px rgb(255 255 255 / 0.05),
        0 16px 42px rgb(0 0 0 / 0.36),
        0 0 48px rgb(201 164 77 / 0.08);
    }
    .screenshot-frame img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: ${objectFit};
      object-position: top center;
      border-radius: 14px;
    }
    .footer {
      flex: 0 0 auto;
      color: #8e826f;
      font-size: 13px;
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

async function renderFeatureCard(page, card) {
  const screenshotPath = path.join(OUTPUT_DIR, card.screenshot);
  if (!fs.existsSync(screenshotPath)) {
    throw new Error(
      `Missing feature crop for card ${card.id}: ${path.relative(ROOT, screenshotPath)}`,
    );
  }

  const screenshotDataUrl = `data:image/png;base64,${fs.readFileSync(screenshotPath).toString("base64")}`;
  const html = buildFeatureCardHtml({
    screenshotDataUrl,
    label: card.label,
    headline: card.headline,
    subheadline: card.subheadline,
    footer: card.footer,
    frameBackground:
      card.frameBackground ??
      "linear-gradient(180deg, rgb(16 26 40 / 0.92) 0%, rgb(11 17 24 / 0.96) 100%)",
    objectFit: card.objectFit ?? "cover",
    screenshotHeight: card.screenshotHeight ?? CARD_SIZE - 184,
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
    .panel-feature { border: 2px dashed #38bdf8; }
    .panel-feature-card { border: 3px solid #22c55e; }
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
  <p class="intro">RAW = wide browser crop. FEATURE = tight product crop. FEATURE-CARD = 1080×1080 feature-focused card. CARD = legacy full-width card (v2).</p>
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
  if (!CARDS_ONLY && !SKIP_LIVE_CAPTURE) {
    assertAuthFile();
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    storageState: fs.existsSync(AUTH_PATH) ? AUTH_PATH : undefined,
  });
  const featureContext = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: FEATURE_CAPTURE_SCALE,
    storageState: fs.existsSync(AUTH_PATH) ? AUTH_PATH : undefined,
  });
  const page = await context.newPage();
  const featurePage = await featureContext.newPage();

  try {
    if (!CARDS_ONLY && !SKIP_LIVE_CAPTURE) {
      for (const capture of CAPTURES) {
        try {
          await captureSocialScreenshot(page, capture);
        } catch (error) {
          const existingPath = path.join(OUTPUT_DIR, capture.output);
          if (!fs.existsSync(existingPath)) {
            throw error;
          }

          console.warn(
            `  ! Raw capture failed for ${capture.id}: ${error instanceof Error ? error.message : error}`,
          );
          console.warn(`  → Using existing ${path.relative(ROOT, existingPath)}`);
        }
      }

      console.log("");
      console.log("Capturing feature-focused crops...");

      for (const crop of FEATURE_CROPS) {
        try {
          await captureFeatureCrop(featurePage, crop);
        } catch (error) {
          console.warn(
            `  ! Live feature crop failed for ${crop.id}: ${error instanceof Error ? error.message : error}`,
          );
          console.warn("  → Falling back to raw screenshot crop");
          await deriveFeatureCropFromRaw(page, crop.id);
        }
      }
    } else if (!CARDS_ONLY && SKIP_LIVE_CAPTURE) {
      console.log("SKIP_LIVE_CAPTURE=1 — deriving feature crops from existing raw screenshots.");

      for (const crop of FEATURE_CROPS) {
        await deriveFeatureCropFromRaw(page, crop.id);
      }
    } else {
      console.log("CARDS_ONLY=1 — skipping live route captures.");
    }

    console.log("");
    console.log("Rendering feature-focused social cards...");

    for (const card of FEATURE_CARDS) {
      console.log(`Feature card ${card.id}`);
      await renderFeatureCard(page, card);
    }

    console.log("");
    console.log("Rendering legacy Facebook-ready social cards...");

    for (const card of SOCIAL_CARDS) {
      console.log(`Card ${card.id}`);
      await renderSocialCard(page, card);
    }

    console.log("");
    console.log("Writing contact sheet for visual verification...");
    await writeContactSheet(page);
  } finally {
    await featurePage.close();
    await featureContext.close();
    await browser.close();
  }

  console.log("");
  console.log("Founder marketing screenshots captured.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
