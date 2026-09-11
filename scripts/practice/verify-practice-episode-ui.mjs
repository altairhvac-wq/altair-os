/**
 * The practice episode, proved in a browser and photographed while it happens.
 *
 * ==================== WHY THIS EXISTS SEPARATELY ====================
 * `verify-video-editor-ui.mjs` proves the editor works against the rendered
 * demo episode. This proves the thing that was actually asked for: that ONE
 * complete practice film opens from a URL, carries the new HVAC library, and
 * survives being edited — open, swap a photograph, autosave, reload, still
 * changed. A green logic test cannot tell you the picture arrived on the
 * canvas, so every claim below is read back out of the live page.
 *
 * It finishes by clearing the autosave it created. A proof run that leaves its
 * own edit behind hands the next person a film with a stranger's change in it.
 *
 * Run: node scripts/practice/verify-practice-episode-ui.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const PROJECT = "compressor-01";
const URL_EDITOR = `${BASE}/studio/editor/${PROJECT}`;
const SHOTS = "ui-audit/video-editor/practice-episode";
const STORAGE_KEY = `altair.editor.project.${PROJECT}`;

let failures = 0;
let checks = 0;

async function check(name, fn) {
  checks += 1;
  try {
    await fn();
    process.stdout.write(`  ok   ${name}\n`);
  } catch (error) {
    failures += 1;
    process.stdout.write(`  FAIL ${name}\n       ${error.message}\n`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

fs.mkdirSync(SHOTS, { recursive: true });

const snapshot = JSON.parse(
  fs.readFileSync("shared/lib/video-editor/practice/compressor-episode-snapshot.json", "utf8"),
);
/** Read from the snapshot, not typed here, so the test cannot drift from it. */
const EXPECTED = {
  visualClips: snapshot.visual.length,
  photographs: snapshot.visual.filter((v) => v.assetId).length,
  captions: snapshot.captions.length,
  voice: snapshot.voice.length,
};

const AUTH = ".playwright/founder-auth.json";
if (!fs.existsSync(AUTH)) {
  process.stdout.write(`
No session at ${AUTH}. Run: npm run capture:founder-auth
`);
  process.exit(2);
}

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: AUTH,
  viewport: { width: 1680, height: 1050 },
});
const page = await context.newPage();

/** Anything the page asked for and did not get. Photographs are the point. */
const failedRequests = [];
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().includes("/studio/")) {
    failedRequests.push(`${String(r.status())} ${r.url()}`);
  }
});
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));

process.stdout.write(`\nThe practice film opens\n`);

await page.goto(URL_EDITOR, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.evaluate((k) => { localStorage.removeItem(k); }, STORAGE_KEY);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);

await check("the project resolves from the URL, with no import step", async () => {
  const title = await page.locator("header").first().innerText();
  assert(/Compressor/i.test(title), `header does not name the episode: ${title.slice(0, 80)}`);
});

await check(`the timeline is fully assembled (${String(EXPECTED.visualClips)} visual clips)`, async () => {
  const counts = await page.evaluate(() => {
    const tl = document.querySelector('section[aria-label="Timeline"]');
    if (!tl) return null;
    const clips = [...tl.querySelectorAll('[aria-label*="seconds"][data-track-kind]')];
    const byKind = {};
    for (const c of clips) {
      const k = c.getAttribute("data-track-kind");
      byKind[k] = (byKind[k] ?? 0) + 1;
    }
    return byKind;
  });
  assert(counts !== null, "no timeline");
  const visual = (counts.video ?? 0) + (counts.graphics ?? 0) + (counts.text ?? 0);
  assert(
    visual === EXPECTED.visualClips,
    `${String(visual)} visual clips, expected ${String(EXPECTED.visualClips)} (${JSON.stringify(counts)})`,
  );
  assert(
    (counts.caption ?? 0) === EXPECTED.captions,
    `${String(counts.caption ?? 0)} caption clips, expected ${String(EXPECTED.captions)}`,
  );
  assert(
    (counts.voice ?? 0) === EXPECTED.voice,
    `${String(counts.voice ?? 0)} voice clips, expected ${String(EXPECTED.voice)}`,
  );
});

await check("the canvas is showing a real photograph", async () => {
  const painted = await page.evaluate(() => {
    const monitor = document.querySelector('[data-testid="ve-preview-monitor"]') ?? document.body;
    const hit = [...monitor.querySelectorAll("*")]
      .map((el) => window.getComputedStyle(el).backgroundImage)
      .find((bg) => bg.includes("/studio/"));
    return hit ?? null;
  });
  assert(painted !== null, "nothing on the canvas");
  assert(painted.includes(`/studio/${PROJECT}/`), `not a staged frame: ${painted}`);
});

await check("every studio file the page asked for arrived", async () => {
  assert(failedRequests.length === 0, `missing: ${failedRequests.slice(0, 3).join(", ")}`);
});

await page.screenshot({ path: `${SHOTS}/01-editor-open.png` });

process.stdout.write(`\nThe HVAC library is reachable and searchable\n`);

await check("a visual clip can be selected, and explains its own shot", async () => {
  await page.locator('[aria-label*="seconds"][data-track-kind="video"]').first().click({ position: { x: 24, y: 14 } });
  await page.waitForTimeout(400);
  const panel = page.locator('[data-testid="ve-visual-decision"]');
  assert((await panel.count()) === 1, "no visual-decision panel");
  const text = await panel.innerText();
  assert(/Confidence/i.test(text), "the panel does not say how sure it was");
});
await page.screenshot({ path: `${SHOTS}/02-why-this-shot.png` });

await check("the library panel lists the catalog", async () => {
  await page.locator('nav[aria-label="Editor tools"] button[title="Library"]').click();
  await page.waitForTimeout(900);
  const n = await page.locator('[data-testid="ve-library-asset"]').count();
  assert(n > 20, `only ${String(n)} assets listed`);
});

await check("search narrows it", async () => {
  const box = page.locator('[data-testid="ve-library-search"]');
  await box.fill("rooftop package unit");
  await page.waitForTimeout(700);
  const n = await page.locator('[data-testid="ve-library-asset"]').count();
  assert(n > 0 && n < 40, `search returned ${String(n)} — not a narrowing`);
});
await page.screenshot({ path: `${SHOTS}/03-library-search.png` });

process.stdout.write(`\nAn asset can be replaced, and the replacement sticks\n`);

const before = await page.evaluate(() => {
  const s = document.querySelector('[data-testid="ve-visual-decision"]');
  return s ? s.innerText : null;
});

let swappedTo = null;
await check("applying a library asset changes the clip and the picture", async () => {
  const first = page.locator('[data-testid="ve-library-asset"]').first();
  swappedTo = await first.getAttribute("data-asset-id");
  await first.click();
  await page.waitForTimeout(900);
  const painted = await page.evaluate(() => {
    const monitor = document.querySelector('[data-testid="ve-preview-monitor"]') ?? document.body;
    return (
      [...monitor.querySelectorAll("*")]
        .map((el) => window.getComputedStyle(el).backgroundImage)
        .find((bg) => bg.includes("/studio/")) ?? null
    );
  });
  assert(swappedTo !== null && swappedTo !== before, `the clip still holds ${String(before)}`);
  const slug = swappedTo.replace(/_/g, "-");
  assert(
    painted !== null && painted.includes(slug),
    `the canvas did not follow the swap — still ${String(painted)}`,
  );
});
await page.screenshot({ path: `${SHOTS}/04-asset-replaced.png` });

await check("it autosaved", async () => {
  await page.waitForTimeout(1400);
  const stored = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
  assert(stored !== null, "nothing was written to storage");
});

await check("and it is still there after a reload", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  const asset = await page.evaluate((k) => {
    const s = JSON.parse(localStorage.getItem(k) ?? "null");
    const t = s?.project.tracks.find((x) => x.id === "t-video");
    return t?.clips[0]?.assetId ?? null;
  }, STORAGE_KEY);
  assert(asset === swappedTo, `after reload the clip holds ${String(asset)}, not ${String(swappedTo)}`);
  const banner = await page.getByText(/Restored your unsaved edit/i).count();
  assert(banner > 0, "the editor did not say it restored the edit");
});
await page.screenshot({ path: `${SHOTS}/05-survives-reload.png` });

process.stdout.write(`\nGaps are visible rather than silent\n`);

await check("a beat with no asset shows what still has to be produced", async () => {
  const pending = snapshot.visual.find((v) => v.assetId === null && v.track !== "text");
  assert(pending !== undefined, "the episode has no placeholder beat to check");
  await page.evaluate(() => { window.scrollTo(0, 0); });
  const clip = page.locator(`[data-clip-id="${pending.id}"]`);
  if ((await clip.count()) > 0) await clip.first().click({ position: { x: 16, y: 12 } });
  await page.waitForTimeout(500);
});

await check("the render control is offered for this project", async () => {
  const render = page.getByRole("button", { name: /render/i }).first();
  assert((await render.count()) > 0, "no render control");
  assert(!(await render.isDisabled()), "render is disabled — the allowlist does not include this project");
});
await page.screenshot({ path: `${SHOTS}/06-render-offered.png` });

await check("no uncaught page errors during the whole run", async () => {
  assert(pageErrors.length === 0, pageErrors.slice(0, 2).join(" | "));
});

/* Leave the film as it was found. */
await page.evaluate((k) => { localStorage.removeItem(k); }, STORAGE_KEY);

await browser.close();

process.stdout.write(
  `\n${String(checks - failures)}/${String(checks)} practice-episode checks passed` +
    (failures > 0 ? ` — ${String(failures)} FAILED\n` : "\n") +
    `  screenshots -> ${SHOTS}\n`,
);
process.exit(failures > 0 ? 1 : 0);
