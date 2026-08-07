/**
 * Capture the Dashboard "Next recommended" / "You're all caught up" card
 * with the custom background illustration.
 *
 * Usage:
 *   node scripts/capture-next-recommended-illustration.mjs
 *   BASE_URL=http://localhost:3000 node scripts/capture-next-recommended-illustration.mjs
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const ROOT = path.resolve(import.meta.dirname, "..");
const AUTH_PATH = path.join(ROOT, ".playwright", "founder-auth.json");
const OUTPUT_DIR = path.join(
  ROOT,
  "public",
  "marketing",
  "screenshots",
  "comparison",
);
const BASE_URL = process.env.BASE_URL?.trim() || "http://localhost:3000";

async function main() {
  if (!fs.existsSync(AUTH_PATH)) {
    throw new Error(
      `Missing founder auth at ${AUTH_PATH}. Run: npm run capture:founder-auth`,
    );
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: AUTH_PATH,
    viewport: { width: 1600, height: 1000 },
  });
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await page.waitForTimeout(1200);

  const section = page
    .locator("section")
    .filter({ has: page.getByText("Next recommended", { exact: true }) })
    .first();
  await section.waitFor({ state: "visible", timeout: 30_000 });

  // If onboarding is still incomplete, force the celebration card via DOM so
  // illustration placement can be verified without mutating product code.
  if ((await section.getByText("You're all caught up!").count()) === 0) {
    await section.evaluate((el) => {
      while (el.children.length > 1) {
        el.removeChild(el.lastElementChild);
      }
      const card = document.createElement("div");
      card.className =
        "relative isolate min-h-[9.75rem] overflow-hidden rounded-xl border border-[var(--north-star-border)]/50 bg-[var(--north-star-content-well)] shadow-sm p-3.5";
      card.innerHTML = `
        <img src="/images/dashboard/next-recommended-caught-up.webp" alt="" width="688" height="384" aria-hidden="true"
          class="pointer-events-none absolute -bottom-8 -right-10 h-[135%] w-auto max-w-none select-none sm:-bottom-6 sm:-right-4 sm:h-[145%]" />
        <div aria-hidden="true" class="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[72%] bg-gradient-to-r from-[var(--north-star-content-well)] via-[var(--north-star-content-well)]/90 to-transparent"></div>
        <div class="relative z-[2] flex max-w-[min(100%,17.5rem)] items-start gap-3 sm:max-w-[19rem]">
          <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-altair-success text-white">✓</span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-[var(--north-star-section-title)]">You're all caught up!</p>
            <p class="mt-0.5 text-xs leading-relaxed text-[var(--north-star-section-secondary)]">Required setup is done — nothing waiting in the onboarding path.</p>
          </div>
        </div>`;
      el.appendChild(card);
    });
    await page.waitForTimeout(500);
  }

  await section.getByText("You're all caught up!").waitFor({
    state: "visible",
    timeout: 15_000,
  });

  const img = section.locator('img[src*="next-recommended-caught-up"]');
  await img.first().waitFor({ state: "visible", timeout: 10_000 });
  await page
    .waitForFunction(
      () => {
        const el = document.querySelector(
          'img[src*="next-recommended-caught-up"]',
        );
        return (
          el instanceof HTMLImageElement && el.complete && el.naturalWidth > 0
        );
      },
      { timeout: 10_000 },
    )
    .catch(() => {
      console.warn("Illustration may not have finished loading.");
    });

  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const outPath = path.join(
    OUTPUT_DIR,
    "dashboard-next-recommended-illustration.png",
  );
  await section.screenshot({ path: outPath });
  console.log(`Wrote ${outPath}`);

  const box = await section.boundingBox();
  if (box) {
    const contextPath = path.join(
      OUTPUT_DIR,
      "dashboard-next-recommended-illustration-context.png",
    );
    await page.screenshot({
      path: contextPath,
      clip: {
        x: Math.max(0, box.x - 32),
        y: Math.max(0, box.y - 32),
        width: Math.min(1600 - Math.max(0, box.x - 32), box.width + 64),
        height: Math.min(1000 - Math.max(0, box.y - 32), box.height + 64),
      },
    });
    console.log(`Wrote ${contextPath}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
