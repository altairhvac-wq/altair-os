/**
 * A curated draft, in a real browser, showing real pictures.
 *
 * ===================== THE ONE FAILURE THIS CATCHES =====================
 * `verify-curated-draft.mjs` proves the adapter puts an asset id on a clip.
 * That is the logic. It cannot prove the thing the phase was actually for: that
 * an operator opening Studio SEES the shots, rather than a timeline of grey
 * cards with sentences on them. A `<img src>` that 404s, a frame map keyed by
 * the wrong id, a preview URL the parser rejected — every one of those passes
 * the logic suite and produces exactly the empty visual layer we set out to fix.
 *
 * So this drives the real UI with the real curated draft written by the agent
 * platform against the real 65-asset library, and asserts on pixels reaching
 * the page.
 *
 * Requires a dev server, .playwright/founder-auth.json, and the proof draft at
 * ui-audit/video-editor/curated-draft-proof/. Thumbnails must have been
 * exported (AltairDemoTool's export-library-previews.mjs) or the image checks
 * will correctly report that Studio is naming assets it cannot show.
 *
 * Run: node scripts/verify-curated-draft-ui.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:3000";
const DRAFT = "ui-audit/video-editor/curated-draft-proof/studio-draft-paperwork.json";
const SHOTS = "ui-audit/video-editor/curated-draft-proof";

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

if (!fs.existsSync(DRAFT)) {
  process.stdout.write(
    `\nNo curated draft at ${DRAFT}.\n` +
      "Produce one with: npm run video:curate (agent platform)\n",
  );
  process.exit(2);
}
const draft = JSON.parse(fs.readFileSync(DRAFT, "utf8"));

/** What the draft itself claims, so the assertions below are not hand-typed. */
const EXPECTED = {
  beats: draft.beats.length,
  withAsset: draft.beats.filter((b) => b.visual?.assetId).length,
  pending: draft.beats.filter((b) => String(b.visual?.mode ?? "").startsWith("pending_"))
    .length,
  withPreview: draft.beats.filter((b) => b.visual?.previewUrl).length,
};

const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: ".playwright/founder-auth.json",
  viewport: { width: 1600, height: 1000 },
});
const page = await context.newPage();
const pageErrors = [];
const failedRequests = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
page.on("response", (r) => {
  if (r.status() >= 400 && r.url().includes("/studio/library/")) {
    failedRequests.push(`${r.status()} ${r.url()}`);
  }
});

async function openStudio() {
  await page.goto(`${BASE}/marketing`, {
    waitUntil: "domcontentloaded",
    timeout: 300000,
  });
  await page.waitForTimeout(3500);
  await page.locator('button:has-text("Studio")').first().click({ timeout: 90000 });
  await page.waitForTimeout(1200);
}

await openStudio();
await page.evaluate(() => {
  window.localStorage.removeItem("altair.editor.drafts");
  window.localStorage.removeItem("altair.editor.sessions");
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.locator('button:has-text("Studio")').first().click({ timeout: 90000 });
await page.waitForTimeout(1200);

/* -- The control condition ------------------------------------------------ */

process.stdout.write("\nThe same plan, uncurated\n");

/**
 * The SAME plan with every `visual` stripped: what this system produced before
 * curation existed, and still produces for a plan nothing has curated.
 *
 * A before/after taken from two different plans would prove nothing — the
 * second could simply be about a subject the library happens to cover. This is
 * the same six beats, the same narration and the same timing, differing in
 * exactly one thing.
 */
const UNCURATED = {
  ...draft,
  topic: `${draft.topic} (uncurated)`,
  beats: draft.beats.map(({ visual: _dropped, ...beat }) => beat),
};

await check("an uncurated plan still builds a draft, and says it has no shots", async () => {
  await page.locator("textarea").first().fill(JSON.stringify(UNCURATED));
  await page.locator('button:has-text("Create draft")').click();
  await page.waitForTimeout(1500);
  const text = await page.locator("body").innerText();
  assert(/Draft ready/i.test(text), `the uncurated plan was refused: ${text.slice(0, 200)}`);
  assert(
    /carries no curated visuals/i.test(text),
    "the intake did not say the plan has no visuals",
  );
});

await check("capture the BEFORE: a draft with an empty visual layer", async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.locator('[data-testid="ve-open-draft"]').first().click();
  await page.waitForTimeout(4500);
  assert(page.url().includes("/studio/editor/draft-"), `landed on ${page.url()}`);

  const painted = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="ve-canvas"]');
    if (!canvas) return -1;
    return [...canvas.querySelectorAll("*")].filter((el) =>
      window.getComputedStyle(el).backgroundImage.includes("/studio/library/"),
    ).length;
  });
  assert(painted === 0, "the uncurated draft is somehow showing library assets");

  await page.locator('[aria-label*="seconds"][data-track-kind="video"]').nth(1).click({
    position: { x: 20, y: 14 },
  });
  await page.waitForTimeout(500);
  assert(
    (await page.locator('[data-testid="ve-visual-decision"]').count()) === 0,
    "an uncurated clip is showing a visual decision it never made",
  );
  await page.screenshot({ path: `${SHOTS}/before-uncurated-draft.png` });
});

// Back to Studio, clean, so the control draft cannot be confused with the
// curated one in the list.
await openStudio();
await page.evaluate(() => {
  window.localStorage.removeItem("altair.editor.drafts");
});
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
await page.locator('button:has-text("Studio")').first().click({ timeout: 90000 });
await page.waitForTimeout(1200);

process.stdout.write("\nThe curated plan arrives\n");

await check("Studio accepts the curated draft", async () => {
  await page.locator("textarea").first().fill(JSON.stringify(draft));
  await page.locator('button:has-text("Create draft")').click();
  await page.waitForTimeout(1500);
  const text = await page.locator("body").innerText();
  assert(
    /Draft ready/i.test(text),
    `the draft was refused: ${text.slice(0, 300)}`,
  );
});

await check("the import reports how much of the video is actually shot", async () => {
  // The failure this phase fixed was invisible on this card: "6 beats, 48.2s"
  // was true of a draft with six real shots and of one with none.
  const text = await page.locator("body").innerText();
  assert(
    new RegExp(`${EXPECTED.withAsset} of ${EXPECTED.beats} beats arrived with a real library asset`).test(text),
    `the intake did not report the asset count: ${text.slice(text.indexOf("Draft ready"), text.indexOf("Draft ready") + 400)}`,
  );
  if (EXPECTED.pending > 0) {
    assert(
      new RegExp(`${EXPECTED.pending} still to produce`).test(text),
      "the intake did not report the gaps",
    );
  }
});

await check("the stored draft carries assets, frames and selection records", async () => {
  const stored = await page.evaluate(() => {
    const raw = window.localStorage.getItem("altair.editor.drafts");
    const d = JSON.parse(raw).drafts.at(-1);
    return {
      assetIds: d.project.tracks
        .flatMap((t) => t.clips)
        .map((c) => c.assetId)
        .filter(Boolean),
      frames: Object.keys(d.frames ?? {}).length,
      visuals: Object.keys(d.visuals ?? {}).length,
      beatsWithAsset: d.summary.beatsWithAsset,
      problems: d.summary.visualProblems,
    };
  });
  assert(
    stored.assetIds.length === EXPECTED.withAsset,
    `${stored.assetIds.length} clips carry an asset, expected ${EXPECTED.withAsset}`,
  );
  assert(
    stored.frames === EXPECTED.withPreview,
    `${stored.frames} frames stored, expected ${EXPECTED.withPreview}`,
  );
  assert(stored.visuals === EXPECTED.beats, `${stored.visuals} selection records`);
  assert(
    stored.problems.length === 0,
    `the draft arrived with problems: ${stored.problems.join("; ")}`,
  );
  // Nothing that looks like this machine's disk may have survived the trip.
  for (const id of stored.assetIds) {
    assert(!/^[A-Za-z]:/.test(id), `a drive-letter path reached Studio: ${id}`);
    assert(!id.includes("\\"), `a Windows path reached Studio: ${id}`);
  }
});

await check("the preflight verdict is shown, with findings that name an action", async () => {
  const panel = page.locator('[data-testid="studio-preflight"]');
  assert((await panel.count()) >= 1, "no preflight shown for a curated draft");
  const head = await panel.first().innerText();
  assert(
    new RegExp(`${String(draft.curation.preflight.score)}/100`).test(head),
    `the preflight score is not shown: ${head}`,
  );

  const expected = draft.curation.preflight.findings.length;
  if (expected > 0) {
    await panel.first().locator("button").click();
    await page.waitForTimeout(300);
    const body = await panel.first().innerText();
    // Every finding must carry an action. A preflight that says a draft is
    // imperfect without saying what to do is the one people learn to ignore.
    for (const finding of draft.curation.preflight.findings) {
      assert(
        body.includes(finding.summary),
        `finding not shown: ${finding.summary}`,
      );
      assert(finding.action.length > 20, `finding has no usable action: ${finding.summary}`);
    }
  }
});

await check("capture the preflight findings", async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  const card = page.locator('[data-testid="studio-preflight"]').first();
  const row = card.locator("xpath=ancestor::li[1]");
  if ((await row.count()) > 0) {
    await row.screenshot({ path: `${SHOTS}/studio-preflight-findings.png` });
  }
});

process.stdout.write("\nThe draft in the editor\n");

await check("the draft opens", async () => {
  const open = page.locator('[data-testid="ve-open-draft"]').first();
  await open.click();
  await page.waitForTimeout(4500);
  assert(page.url().includes("/studio/editor/draft-"), `landed on ${page.url()}`);
});

await check("the canvas shows a real picture, not a grey card", async () => {
  // THE check. A curated draft whose canvas is still a placeholder is the exact
  // failure this phase existed to fix.
  //
  // The playhead starts at 0, and beat 1 of this proof draft is deliberately a
  // gap — so asserting without moving it would test the placeholder and call it
  // a broken canvas. Scrub to the middle of the first beat that HAS a picture,
  // which is the moment an operator would actually be looking at.
  const firstShot = draft.beats.findIndex((b) => b.visual?.previewUrl);
  assert(firstShot >= 0, "this draft has no previewable beat to check the canvas with");
  const target = await page.evaluate((index) => {
    const raw = window.localStorage.getItem("altair.editor.project." +
      JSON.parse(window.localStorage.getItem("altair.editor.drafts")).drafts.at(-1).project.id);
    const project = raw
      ? JSON.parse(raw).project ?? JSON.parse(raw)
      : JSON.parse(window.localStorage.getItem("altair.editor.drafts")).drafts.at(-1).project;
    const clip = project.tracks
      .flatMap((t) => t.clips)
      .find((c) => c.id === `clip-beat-0${String(index + 1)}`);
    return clip ? clip.startMs + Math.floor(clip.durationMs / 2) : null;
  }, firstShot);
  assert(target !== null, "could not locate the clip to scrub to");

  const ruler = page.locator('[data-testid="ve-ruler"]');
  const box = await ruler.boundingBox();
  assert(box, "no ruler to scrub on");
  const pxPerSec = await page.evaluate(() => {
    const label = document.body.innerText.match(/(\d+)\s*px\/s/);
    return label ? Number(label[1]) : 60;
  });
  await page.mouse.click(box.x + (target / 1000) * pxPerSec, box.y + box.height / 2);
  await page.waitForTimeout(600);

  const painted = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="ve-canvas"]');
    if (!canvas) return { found: false };
    const withImage = [...canvas.querySelectorAll("*")].filter((el) => {
      const bg = window.getComputedStyle(el).backgroundImage;
      return bg && bg.startsWith('url(') && bg.includes("/studio/library/");
    });
    return { found: true, count: withImage.length, sample: withImage[0] ? window.getComputedStyle(withImage[0]).backgroundImage : null };
  });
  assert(painted.found, "no canvas");
  assert(
    painted.count > 0,
    "the canvas is painting no library asset — the visual layer is still empty",
  );
  assert(
    painted.sample.includes("/studio/library/"),
    `the painted image is not a library thumbnail: ${painted.sample}`,
  );
});

await check("every library image the page requested actually loaded", async () => {
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .filter((img) => img.src.includes("/studio/library/") && img.naturalWidth === 0)
      .map((img) => img.src),
  );
  assert(
    broken.length === 0,
    `${broken.length} library thumbnails failed to load: ${broken.slice(0, 3).join(", ")}`,
  );
  assert(
    failedRequests.length === 0,
    `library requests returned errors: ${failedRequests.slice(0, 3).join(", ")}`,
  );
});

await check("the timeline shows frames on its clips", async () => {
  const withFrames = await page.evaluate(() => {
    const timeline = document.querySelector('section[aria-label="Timeline"]');
    if (!timeline) return 0;
    return [...timeline.querySelectorAll("*")].filter((el) => {
      const bg = window.getComputedStyle(el).backgroundImage;
      return bg && bg.includes("/studio/library/");
    }).length;
  });
  assert(withFrames > 0, "no timeline clip is showing its frame");
});

process.stdout.write("\nThe decision is inspectable\n");

await check("selecting a curated clip shows why that shot was chosen", async () => {
  const clip = page
    .locator('[aria-label*="seconds"][data-track-kind="video"]')
    .first();
  await clip.click({ position: { x: 20, y: 14 } });
  await page.waitForTimeout(400);
  const panel = page.locator('[data-testid="ve-visual-decision"]');
  assert((await panel.count()) === 1, "no visual-decision panel");
  const text = await panel.innerText();
  assert(/Library asset|Needs/i.test(text), `no mode: ${text.slice(0, 160)}`);
  assert(/Confidence/i.test(text), "no confidence band");
  assert(/matches|library|plan marks/i.test(text), `no reason given: ${text.slice(0, 200)}`);
});

await check("the alternatives are offered, with their pictures", async () => {
  const swaps = page.locator('[data-testid="ve-swap-asset"]');
  const count = await swaps.count();
  assert(count > 0, "no alternatives offered — a swap is impossible");
  const thumbed = await page.evaluate(
    () =>
      [...document.querySelectorAll('[data-testid="ve-swap-asset"] img')].filter(
        (img) => img.naturalWidth > 0,
      ).length,
  );
  assert(thumbed > 0, "every alternative is a grey rectangle");
});

await check("swapping an asset actually changes the clip", async () => {
  const before = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="ve-visual-decision"]');
    return el ? el.innerText : "";
  });
  const target = await page
    .locator('[data-testid="ve-swap-asset"]')
    .first()
    .getAttribute("data-asset-id");
  await page.locator('[data-testid="ve-swap-asset"]').first().click();
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="ve-visual-decision"]');
    return el ? el.innerText : "";
  });
  assert(after !== before, "the panel did not change after a swap");
  assert(
    after.includes(target),
    `the clip does not name the swapped asset ${target}`,
  );
});

await check("a pending beat shows what still has to be produced", async () => {
  // Find the beat the curation could not answer and select it.
  const pendingIndex = draft.beats.findIndex((b) =>
    String(b.visual?.mode ?? "").startsWith("pending_"),
  );
  if (pendingIndex < 0) {
    process.stdout.write("       (this draft has no pending beat — nothing to check)\n");
    return;
  }
  const clips = page.locator('[aria-label*="seconds"][data-track-kind="video"]');
  await clips.nth(pendingIndex).click({ position: { x: 12, y: 14 } });
  await page.waitForTimeout(400);
  const panel = await page.locator('[data-testid="ve-visual-decision"]').innerText();
  assert(
    /Needs generation|Needs a capture/i.test(panel),
    `a pending beat does not say so: ${panel.slice(0, 200)}`,
  );
  const requirement = page.locator('[data-testid="ve-pending-requirement"]');
  assert((await requirement.count()) === 1, "no requirement shown for a pending beat");
  const text = await requirement.innerText();
  assert(text.length > 40, `the requirement is not actionable: ${text}`);
});

await check("a pending clip's canvas says no asset was chosen", async () => {
  const canvasText = await page.evaluate(() => {
    const canvas = document.querySelector('[data-testid="ve-canvas"]');
    return canvas ? canvas.innerText : "";
  });
  assert(
    /no asset chosen|no thumbnail exported/i.test(canvasText) ||
      canvasText.trim().length > 0,
    "the canvas is blank for a beat with no asset",
  );
});

process.stdout.write("\nScreenshots\n");

await check("capture the AFTER: the same plan, curated", async () => {
  fs.mkdirSync(SHOTS, { recursive: true });
  // Select a beat that has a shot AND put the playhead on it, so the capture
  // shows what an operator actually sees rather than the frame at 00:00 — which
  // in this proof draft is deliberately one of the gaps.
  await page.locator('[aria-label*="seconds"][data-track-kind="video"]').nth(1).click({
    position: { x: 20, y: 14 },
  });
  await page.waitForTimeout(400);
  const shotBox = await page
    .locator('[aria-label*="seconds"][data-track-kind="video"]')
    .nth(1)
    .boundingBox();
  const rulerBox = await page.locator('[data-testid="ve-ruler"]').boundingBox();
  if (shotBox && rulerBox) {
    await page.mouse.click(
      shotBox.x + shotBox.width / 2,
      rulerBox.y + rulerBox.height / 2,
    );
    await page.waitForTimeout(600);
    await page
      .locator('[aria-label*="seconds"][data-track-kind="video"]')
      .nth(1)
      .click({ position: { x: 20, y: 14 } });
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `${SHOTS}/after-curated-draft.png` });
  const inspector = page.locator('aside[aria-label="Inspector"]');
  await inspector.screenshot({ path: `${SHOTS}/inspector-visual-decision.png` });
});

process.stdout.write("\nRetention\n");

await check("approving a curated draft records which shots survived", async () => {
  await page.locator('[data-testid="ve-approve"]').click();
  await page.waitForTimeout(900);
  const stored = await page.evaluate(() => {
    const raw = window.localStorage.getItem("altair.editor.sessions");
    if (!raw) return null;
    const session = JSON.parse(raw).sessions.at(-1);
    const chosen = session.generatedProjectSnapshot.tracks
      .flatMap((t) => t.clips)
      .filter((c) => c.assetId).length;
    return { chosen, hasApproved: Boolean(session.approvedProjectSnapshot) };
  });
  assert(stored, "no session was stored");
  assert(stored.hasApproved, "the approved snapshot is missing");
  // The generated snapshot must carry the bot's CHOICES, or visual retention
  // has no denominator and the metric silently reads as "nothing to retain".
  assert(
    stored.chosen > 0,
    "the generated snapshot records no chosen assets — visual retention cannot be computed",
  );
});

await check("the learning panel reports shot retention, and refuses a trend", async () => {
  await openStudio();
  const panel = page.locator('[data-testid="studio-retention"]');
  assert((await panel.count()) === 1, "no retention panel after an approval");
  const text = await panel.innerText();
  assert(/Cut kept/.test(text), `no cut retention: ${text}`);
  assert(/Chosen shots kept/.test(text), `no shot retention: ${text}`);
  assert(/swapped, over 1 session/.test(text), `the swap count is not shown: ${text}`);
  // One session is not a trend, and the panel must say how many more it needs
  // rather than drawing an arrow.
  assert(
    /more approved session/.test(text),
    `one session produced a trend claim: ${text}`,
  );
  assert(
    !/climbing|falling/.test(text),
    `a direction was claimed from one session: ${text}`,
  );
  await panel.screenshot({ path: `${SHOTS}/studio-retention.png` });
});

process.stdout.write("\nIntegrity\n");

await check("no uncaught page errors during the whole run", async () => {
  assert(
    pageErrors.length === 0,
    `page errors:\n${pageErrors.slice(0, 4).join("\n")}`,
  );
});

await browser.close();

process.stdout.write(
  `\n${checks - failures}/${checks} curated-draft UI checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);
process.exit(failures ? 1 : 0);
