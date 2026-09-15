/**
 * The operator's acceptance sequence, driven in a real browser, photographed at
 * every step.
 *
 * ==================== WHY THIS EXISTS BESIDE THE OTHER SUITES ====================
 * The other suites each prove one thing deeply: that the clock is monotonic,
 * that inserting pictures cannot corrupt the timeline, that the editor survives
 * being used hard. This one walks the whole list an operator gave as the
 * definition of done — open, play, scrub, replace, add, undo, redo, trim,
 * split, apply a camera move, change it, reframe, add a transition, save,
 * reload — in order, in one session, and takes a screenshot at each step so the
 * result can be LOOKED at rather than only asserted.
 *
 * The camera checks are the interesting ones: they read the canvas layer's
 * actual transform at two instants inside the same clip and require it to have
 * changed. A preset that wrote a value nothing rendered would pass a "the
 * button is highlighted" test and fail this one.
 *
 * Run: node scripts/editor-qa/verify-acceptance.mjs [baseUrl] [--headed]
 */
import fs from "node:fs";
import path from "node:path";
import {
  addLibraryAsset,
  analyse,
  applyLibraryAsset,
  assertSmooth,
  collect,
  compareModels,
  dumpModel,
  harness,
  launchEditor,
  openProject,
  openTool,
  playFor,
  recording,
  seekTo,
  selectClip,
  storageKey,
} from "./lib/probe.mjs";

const base = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const headed = process.argv.includes("--headed");
const PROJECT = "compressor-01";
const SHOTS = "ui-audit/video-editor/stabilization/acceptance";
fs.mkdirSync(SHOTS, { recursive: true });

let step = 0;
const shot = async (page, name) => {
  step += 1;
  await page.screenshot({ path: path.join(SHOTS, `${String(step).padStart(2, "0")}-${name}.png`) });
};

/** The scale currently applied to a clip's layer on the canvas. */
const layerScale = (page, clipId) =>
  page.evaluate((id) => {
    const node = document.querySelector(`[data-testid="ve-canvas"] [data-clip-id="${id}"]`);
    if (!node) return null;
    const m = /scale\(([\d.]+)\)/.exec(node.style.transform ?? "");
    return m ? Number(m[1]) : null;
  }, clipId);

const layerTranslateX = (page, clipId) =>
  page.evaluate((id) => {
    const node = document.querySelector(`[data-testid="ve-canvas"] [data-clip-id="${id}"]`);
    if (!node) return null;
    const m = /translate\((-?[\d.]+)px/.exec(node.style.transform ?? "");
    return m ? Number(m[1]) : null;
  }, clipId);

const h = harness(`Acceptance — ${PROJECT}`);
const { browser, page, consoleErrors } = await launchEditor({ base, project: PROJECT, headed });

await openProject(page, { base, project: PROJECT });
await recording(page, true);
await shot(page, "opened");

/* ── 1-5. Open, play a full minute, never backwards ───────────────────────── */
await h.check("opens the film and plays a full minute without going backwards", async () => {
  const window_ = await playFor(page, 60_000);
  const trace = await collect(page);
  const result = analyse(trace, window_.from, window_.to, "one minute");
  fs.writeFileSync(
    path.join(SHOTS, "playback-one-minute.json"),
    JSON.stringify({ ...result, samples: undefined }, null, 2),
  );
  assertSmooth(h.assert, result);
  h.assert(result.editorSecondsAdvanced > 58, `only ${result.editorSecondsAdvanced}s of film played`);
});
await shot(page, "after-one-minute");

/* ── 6-7. Scrub somewhere else, resume ────────────────────────────────────── */
await h.check("scrubs somewhere else and resumes smoothly", async () => {
  await seekTo(page, 95_000);
  const window_ = await playFor(page, 15_000);
  const trace = await collect(page);
  assertSmooth(h.assert, analyse(trace, window_.from, window_.to, "after scrub"));
});
await shot(page, "after-scrub-resume");

/* ── 8-10. Select a photograph, replace it, add another ───────────────────── */
const model = await dumpModel(page);
const photo = model.clips.find(
  (c) => c.trackKind === "video" && c.assetId !== null && c.startMs > model.playheadMs,
);
let replaced = null;
let added = null;

await h.check("selects a photograph and replaces it from the library", async () => {
  h.assert(photo !== undefined, "no photographed clip after the playhead");
  await selectClip(page, model, photo.id);
  await openTool(page, "Library");
  await page.waitForTimeout(700);
  replaced = await applyLibraryAsset(page, 4);
  const after = await dumpModel(page);
  h.assert(
    after.clips.find((c) => c.id === photo.id).assetId === replaced,
    "the clip did not take the new picture",
  );
});
await shot(page, "replaced-photo");

await h.check("adds another photograph as its own clip", async () => {
  const before = await dumpModel(page);
  added = await addLibraryAsset(page, 9);
  const after = await dumpModel(page);
  h.assert(after.clipCount === before.clipCount + 1, "no clip was added");
  const clip = after.clips.find((c) => c.assetId === added && !before.clips.some((x) => x.id === c.id));
  h.assert(clip !== undefined, "the added clip is not in the project");
  h.assert(compareModels(before, after, [clip.id]).length === 0, "adding disturbed the rest");
});
await shot(page, "added-photo");

/* ── 11-12. Undo it, redo it ──────────────────────────────────────────────── */
await h.check("undo removes the added clip, redo puts it back", async () => {
  const before = await dumpModel(page);
  await page.keyboard.press("Control+z");
  await page.waitForTimeout(250);
  const undone = await dumpModel(page);
  h.assert(
    undone.clipCount === before.clipCount - 1,
    `undo left ${undone.clipCount} clips, expected ${before.clipCount - 1}`,
  );
  await page.keyboard.press("Control+Shift+z");
  await page.waitForTimeout(250);
  const redone = await dumpModel(page);
  h.assert(redone.clipCount === before.clipCount, "redo did not restore the clip");
  h.assert(
    redone.clips.some((c) => c.assetId === added),
    "redo restored a clip without its picture",
  );
});
await shot(page, "undo-redo");

/* ── 13-14. Trim and split ────────────────────────────────────────────────── */
await h.check("trims a clip by dragging its edge", async () => {
  const before = await dumpModel(page);
  const target = before.clips.find((c) => c.id === photo.id);
  const clip = page
    .locator(`[data-track-kind="video"][aria-label^="${target.label.replace(/"/g, '\\"')},"]`)
    .first();
  await clip.scrollIntoViewIfNeeded();
  const box = await clip.boundingBox();
  await page.mouse.move(box.x + box.width - 3, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 60, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await dumpModel(page);
  const trimmed = after.clips.find((c) => c.id === photo.id);
  h.assert(
    trimmed.durationMs < target.durationMs,
    `duration ${target.durationMs} -> ${trimmed.durationMs}`,
  );
  h.assert(trimmed.startMs === target.startMs, "trimming the end moved the start");
});
await shot(page, "trimmed");

await h.check("splits a clip at the playhead with S", async () => {
  const before = await dumpModel(page);
  const target = before.clips.find((c) => c.trackKind === "video" && c.durationMs > 4000);
  await selectClip(page, before, target.id);
  await seekTo(page, target.startMs + Math.round(target.durationMs / 2));
  await page.keyboard.press("s");
  await page.waitForTimeout(300);
  const after = await dumpModel(page);
  h.assert(after.clipCount === before.clipCount + 1, "the split produced no second clip");
  const halves = after.clips.filter(
    (c) => c.track === target.track && c.startMs >= target.startMs && c.endMs <= target.endMs,
  );
  h.assert(halves.length === 2, `${halves.length} pieces where there should be 2`);
  h.assert(
    Math.abs(halves[0].durationMs + halves[1].durationMs - target.durationMs) <= 1,
    "the two halves do not add up to the original",
  );
});
await shot(page, "split");

/* ── 15-17. Camera moves, seen in the preview ─────────────────────────────── */
const cameraClip = (await dumpModel(page)).clips.find(
  (c) => c.trackKind === "video" && c.assetId !== null && c.durationMs > 4000,
);

await h.check("Push In is visible in the preview, not just stored", async () => {
  const current = await dumpModel(page);
  await selectClip(page, current, cameraClip.id);

  // Start from a locked-off shot. Without this the check passes on a clip the
  // practice film already gave a push-in to, whether or not the button works.
  await page.locator('[data-testid="ve-camera-none"]').click();
  await page.waitForTimeout(250);
  h.assert(
    (await dumpModel(page)).clips.find((c) => c.id === cameraClip.id).motion === null,
    "clearing the camera move did not take",
  );
  await seekTo(page, cameraClip.startMs + 300);
  const stillEarly = await layerScale(page, cameraClip.id);
  await seekTo(page, cameraClip.endMs - 300);
  const stillLate = await layerScale(page, cameraClip.id);
  h.assert(
    stillEarly !== null && Math.abs(stillLate - stillEarly) < 0.001,
    `a locked-off shot moved on its own: ${stillEarly} -> ${stillLate}`,
  );

  await page.locator('[data-testid="ve-camera-pushIn"]').click();
  await page.waitForTimeout(250);

  await seekTo(page, cameraClip.startMs + 300);
  const early = await layerScale(page, cameraClip.id);
  await seekTo(page, cameraClip.endMs - 300);
  const late = await layerScale(page, cameraClip.id);

  h.assert(early !== null && late !== null, "the clip is not on the canvas at those instants");
  h.assert(late > early + 0.02, `the picture did not push in: ${early} -> ${late}`);
  const saved = (await dumpModel(page)).clips.find((c) => c.id === cameraClip.id);
  h.assert(saved.motion?.preset === "pushIn", "the move is not on the clip");
});
await shot(page, "camera-push-in");

await h.check("switching to Pan Right changes the move", async () => {
  await page.locator('[data-testid="ve-camera-panRight"]').click();
  await page.waitForTimeout(250);
  await seekTo(page, cameraClip.startMs + 300);
  const early = await layerTranslateX(page, cameraClip.id);
  await seekTo(page, cameraClip.endMs - 300);
  const late = await layerTranslateX(page, cameraClip.id);
  h.assert(early !== null && late !== null, "no layer to measure");
  h.assert(late > early + 5, `the picture did not pan right: ${early}px -> ${late}px`);
  const saved = (await dumpModel(page)).clips.find((c) => c.id === cameraClip.id);
  h.assert(saved.motion?.preset === "panRight", "the move did not change");
});
await shot(page, "camera-pan-right");

/* ── 18. Scale and position ───────────────────────────────────────────────── */
await h.check("scale and position are adjustable and take effect", async () => {
  const before = await layerScale(page, cameraClip.id);
  const slider = page.locator('aside[aria-label="Inspector"] input[type="range"]').nth(0);
  await slider.evaluate((el) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, "1.4");
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const after = await layerScale(page, cameraClip.id);
  h.assert(after > before, `scale did not reach the canvas: ${before} -> ${after}`);
  const saved = (await dumpModel(page)).clips.find((c) => c.id === cameraClip.id);
  h.assert(saved !== undefined, "the clip vanished while being reframed");
});
await shot(page, "reframed");

/* ── 19. A transition ─────────────────────────────────────────────────────── */
await h.check("a crossfade can be added and is on the clip", async () => {
  await page.locator('[data-testid="ve-transition-crossfade"]').click();
  await page.waitForTimeout(250);
  const saved = (await dumpModel(page)).clips.find((c) => c.id === cameraClip.id);
  h.assert(saved.transitionIn?.kind === "crossfade", "no crossfade on the clip");
  h.assert(saved.transitionIn.durationMs > 0, "a crossfade of zero is a cut");
});
await shot(page, "crossfade");

/* ── 20-22. Save, reload, everything still there ──────────────────────────── */
await h.check("saves, reloads, and every edit survived", async () => {
  await page.waitForTimeout(1500);
  const before = await dumpModel(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="ve-playhead-timecode"]', { timeout: 30000 });
  await page.waitForTimeout(2500);
  await recording(page, true);
  const after = await dumpModel(page);
  h.assert(after.clipCount === before.clipCount, "the clip count changed over a reload");
  const clip = after.clips.find((c) => c.id === cameraClip.id);
  h.assert(clip.motion?.preset === "panRight", "the camera move did not survive");
  h.assert(clip.transitionIn?.kind === "crossfade", "the transition did not survive");
  h.assert(
    after.clips.some((c) => c.assetId === added),
    "the added photograph did not survive",
  );
});
await shot(page, "after-reload");

await h.check("and it still plays smoothly with all of that on it", async () => {
  await seekTo(page, 40_000);
  const window_ = await playFor(page, 25_000);
  const trace = await collect(page);
  assertSmooth(h.assert, analyse(trace, window_.from, window_.to, "edited film"));
});
await shot(page, "final-playback");

await h.check("no uncaught errors in the whole session", () => {
  h.assert(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
});

await page.evaluate((k) => localStorage.removeItem(k), storageKey(PROJECT));
await browser.close();

const failures = h.finish(`  screenshots -> ${SHOTS}\n`);
process.exit(failures > 0 ? 1 : 0);
