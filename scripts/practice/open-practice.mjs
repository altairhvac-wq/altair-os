/**
 * Open the practice episode in a real browser and report what the editor shows.
 *
 * This is the check that matters: typecheck proves the project compiles, and
 * only loading it proves an editor can open it. Every assertion below is about
 * something a person would notice — clips on the timeline, photographs on the
 * canvas, the library grid returning results.
 *
 * Run: node scripts/practice/open-practice.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SHOTS = "ui-audit/video-editor/practice-episode";
fs.mkdirSync(SHOTS, { recursive: true });

let fail = 0, n = 0;
const check = async (name, fn) => {
  n += 1;
  try { await fn(); process.stdout.write(`  ok   ${name}\n`); }
  catch (e) { fail += 1; process.stdout.write(`  FAIL ${name}\n       ${e.message}\n`); }
};
const assert = (c, m) => { if (!c) throw new Error(m); };

const browser = await chromium.launch();
const ctx = await browser.newContext({
  storageState: ".playwright/founder-auth.json",
  viewport: { width: 1600, height: 1000 },
});
const page = await ctx.newPage();
const errors = [];
const bad404 = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => { if (r.status() >= 400 && /\/studio\//.test(r.url())) bad404.push(`${r.status()} ${r.url()}`); });

process.stdout.write("\nOpening the practice episode\n");

await check("the project opens from its URL", async () => {
  await page.goto(`${BASE}/studio/editor/compressor-01`, { waitUntil: "domcontentloaded", timeout: 300000 });
  await page.waitForTimeout(7000);
  const title = await page.locator("body").innerText();
  assert(/Compressor Works/i.test(title), `title not shown: ${title.slice(0, 200)}`);
});

await check("the timeline is fully assembled", async () => {
  const clips = await page.locator('[aria-label*="seconds"]').count();
  assert(clips >= 70, `only ${clips} clips on the timeline`);
  const tl = await page.locator('section[aria-label="Timeline"]').innerText();
  for (const t of ["VIDEO 1", "GRAPHICS", "TEXT", "CAPTIONS", "VOICEOVER"]) {
    assert(tl.includes(t), `missing track ${t}`);
  }
});

await check("HVAC photographs are on the canvas", async () => {
  const ruler = page.locator('[data-testid="ve-ruler"]');
  const box = await ruler.boundingBox();
  await page.mouse.click(box.x + 40, box.y + box.height / 2);
  await page.waitForTimeout(700);
  const painted = await page.evaluate(() => {
    const c = document.querySelector('[data-testid="ve-canvas"]');
    if (!c) return -1;
    return [...c.querySelectorAll("*")].filter((el) =>
      window.getComputedStyle(el).backgroundImage.includes("/studio/library/")).length;
  });
  assert(painted > 0, "canvas is not painting a library photograph");
});

await check("timeline clips show their frames", async () => {
  const withFrames = await page.evaluate(() => {
    const tl = document.querySelector('section[aria-label="Timeline"]');
    return [...tl.querySelectorAll("*")].filter((el) => {
      const b = window.getComputedStyle(el).backgroundImage;
      return b.includes("/studio/library/") || b.includes("/studio/compressor-01/");
    }).length;
  });
  assert(withFrames > 10, `only ${withFrames} timeline clips show a frame`);
});

process.stdout.write("\nThe asset browser\n");

await check("the library tab lists the HVAC catalog", async () => {
  await page.locator('[aria-label="Tools"] button, nav button').filter({ hasText: /Library/i }).first().click().catch(async () => {
    await page.locator('text=Library').first().click();
  });
  await page.waitForTimeout(2500);
  const grid = await page.locator('[data-testid="ve-library-asset"]').count();
  assert(grid > 20, `library grid shows ${grid} assets`);
});

await check("search narrows the library", async () => {
  const box = page.locator('[data-testid="ve-library-search"]');
  await box.fill("scroll compressor");
  await page.waitForTimeout(700);
  const ids = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="ve-library-asset"]')].map((e) => e.getAttribute("data-asset-id")));
  assert(ids.length > 0, "search returned nothing");
  assert(ids.length < 60, `search barely narrowed: ${ids.length} results`);
  assert(ids.some((i) => i.includes("scroll")), `no scroll asset in: ${ids.slice(0,5).join(", ")}`);
});

await check("capture the editor with the practice episode", async () => {
  await page.screenshot({ path: `${SHOTS}/editor-practice-episode.png` });
});

process.stdout.write("\nIntegrity\n");
await check("no uncaught page errors", async () => {
  assert(errors.length === 0, `page errors:\n${errors.slice(0, 3).join("\n")}`);
});
await check("no missing studio assets", async () => {
  assert(bad404.length === 0, `${bad404.length} failed: ${bad404.slice(0, 4).join(", ")}`);
});

await browser.close();
process.stdout.write(`\n${n - fail}/${n} checks passed${fail ? ` — ${fail} FAILED` : ""}\n`);
process.exit(fail ? 1 : 0);
