/**
 * The regression that must never come back: adding or replacing a photograph
 * must not break playback.
 *
 * ==================== WHAT THIS IS FOR ====================
 * An operator reported that the editor's clock ran forwards and backwards, and
 * that it started after they added a picture. Every automated suite was green
 * at the time, because they all checked that the timecode had CHANGED, not that
 * it had only ever increased.
 *
 * The measured cause was that playback advanced by adding a frame delta to a
 * React ref that a passive effect had not yet updated, so a frame that landed
 * before the effect flushed added its delta to a value one frame old. Selecting
 * a clip and opening the photo library — the only way to add a picture — made
 * every frame's render about twice as expensive, which is what pushed a
 * sometimes-wrong clock into being wrong every other frame.
 *
 * So this drives the exact operator sequence and asserts the invariant:
 *
 *   play -> pause -> replace a picture -> play -> add a picture -> play
 *   -> save -> reload -> play
 *
 * with time strictly non-decreasing, at wall speed, with no narration reseeks,
 * and with the timeline unchanged except for the pictures that were edited.
 *
 * Run: node scripts/editor-qa/verify-image-edit-playback.mjs [baseUrl] [--headed]
 */
import fs from "node:fs";
import path from "node:path";
import {
  addLibraryAsset,
  analyse,
  applyLibraryAsset,
  collect,
  compareModels,
  dumpModel,
  harness,
  launchEditor,
  narrationSyncProblems,
  openProject,
  openTool,
  playFor,
  recording,
  seekTo,
  selectClip,
  storageKey,
  assertSmooth,
} from "./lib/probe.mjs";

const base = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const headed = process.argv.includes("--headed");
const PROJECT = "compressor-01";
const PLAY_MS = 32_000;
const OUT = "ui-audit/video-editor/stabilization";
fs.mkdirSync(OUT, { recursive: true });

const h = harness(`Image edits and playback — ${PROJECT}`);
const { browser, page, consoleErrors } = await launchEditor({ base, project: PROJECT, headed });

await openProject(page, { base, project: PROJECT });
await recording(page, true);

/* ── 1-2. Untouched playback ──────────────────────────────────────────────── */
await seekTo(page, 60_000);
const modelStart = await dumpModel(page);
const windowA = await playFor(page, PLAY_MS);

await h.check("plays for 30s with time only ever moving forward", async () => {
  const trace = await collect(page);
  const a = analyse(trace, windowA.from, windowA.to, "untouched");
  fs.writeFileSync(path.join(OUT, "image-edit-playback-A.json"), JSON.stringify(a, null, 1));
  assertSmooth(h.assert, a);
});

await h.check("the narration that is sounding is the one the timeline says", async () => {
  const trace = await collect(page);
  const a = analyse(trace, windowA.from, windowA.to);
  const sync = narrationSyncProblems(a.samples, modelStart);
  h.assert(sync.checked > 100, `only ${sync.checked} frames had audio to check`);
  h.assert(sync.count === 0, `narration out of step: ${sync.problems.join("; ")}`);
});

/* ── 3-5. Replace a picture, then play again ──────────────────────────────── */
const modelBefore = await dumpModel(page);
const replaceTarget = modelBefore.clips.find(
  (c) => c.trackKind === "video" && c.assetId !== null && c.startMs > modelBefore.playheadMs,
);
let replacedTo = null;

await h.check("a photograph can be replaced from the library", async () => {
  h.assert(replaceTarget !== undefined, "no photographed clip to replace");
  await selectClip(page, modelBefore, replaceTarget.id);
  await openTool(page, "Library");
  await page.waitForTimeout(700);
  replacedTo = await applyLibraryAsset(page, 6);
  h.assert(replacedTo !== null, "the library grid had nothing to apply");
  const after = await dumpModel(page);
  const clip = after.clips.find((c) => c.id === replaceTarget.id);
  h.assert(clip.assetId === replacedTo, `the clip still holds ${clip.assetId}`);
});

await h.check("replacing changed the picture and NOTHING about the timing", async () => {
  const after = await dumpModel(page);
  const problems = compareModels(modelBefore, after, [replaceTarget.id]);
  h.assert(problems.length === 0, problems.join("; "));
  h.assert(
    after.projectDurationMs === modelBefore.projectDurationMs,
    `project duration changed ${modelBefore.projectDurationMs} -> ${after.projectDurationMs}`,
  );
});

const windowB = await playFor(page, PLAY_MS);
await h.check("playback after replacing a picture is still monotonic and smooth", async () => {
  const trace = await collect(page);
  const b = analyse(trace, windowB.from, windowB.to, "after replace");
  fs.writeFileSync(path.join(OUT, "image-edit-playback-B.json"), JSON.stringify(b, null, 1));
  assertSmooth(h.assert, b);
});

/* ── 6. Add a picture as a new clip, then play again ──────────────────────── */
const modelBeforeAdd = await dumpModel(page);
let addedAsset = null;

await h.check("a photograph can be added as a new clip at the playhead", async () => {
  addedAsset = await addLibraryAsset(page, 3);
  h.assert(addedAsset !== null, "the library grid had no add control");
  const after = await dumpModel(page);
  h.assert(
    after.clipCount === modelBeforeAdd.clipCount + 1,
    `clip count ${modelBeforeAdd.clipCount} -> ${after.clipCount}`,
  );
  const added = after.clips.find((c) => !modelBeforeAdd.clips.some((x) => x.id === c.id));
  h.assert(added !== undefined, "no new clip appeared");
  h.assert(added.assetId === addedAsset, `the new clip holds ${added.assetId}`);
  h.assert(added.track === "t-overlay", `it landed on ${added.track}, not the overlay`);
});

await h.check("adding a clip moved nothing that was already there", async () => {
  const after = await dumpModel(page);
  const added = after.clips.find((c) => !modelBeforeAdd.clips.some((x) => x.id === c.id));
  const problems = compareModels(modelBeforeAdd, after, [added?.id ?? ""]);
  h.assert(problems.length === 0, problems.join("; "));
});

const windowC = await playFor(page, PLAY_MS);
await h.check("playback after adding a picture is still monotonic and smooth", async () => {
  const trace = await collect(page);
  const c = analyse(trace, windowC.from, windowC.to, "after add");
  fs.writeFileSync(path.join(OUT, "image-edit-playback-C.json"), JSON.stringify(c, null, 1));
  assertSmooth(h.assert, c);
});

/* ── 7. Save, reload, play again ──────────────────────────────────────────── */
await h.check("the edits are saved to this browser", async () => {
  await page.waitForTimeout(1400);
  const stored = await page.evaluate((k) => localStorage.getItem(k), storageKey(PROJECT));
  h.assert(stored !== null, "nothing was written to storage");
  const parsed = JSON.parse(stored);
  const clips = parsed.project.tracks.flatMap((t) => t.clips);
  h.assert(
    clips.some((c) => c.assetId === replacedTo),
    "the replaced picture is not in the saved project",
  );
  h.assert(
    clips.some((c) => c.assetId === addedAsset),
    "the added picture is not in the saved project",
  );
});

const modelBeforeReload = await dumpModel(page);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="ve-playhead-timecode"]', { timeout: 30000 });
await page.waitForTimeout(2500);
await recording(page, true);

await h.check("the edits are still there after a reload", async () => {
  const after = await dumpModel(page);
  h.assert(after.clipCount === modelBeforeReload.clipCount, "the clip count changed over a reload");
  h.assert(
    after.clips.some((c) => c.assetId === addedAsset),
    "the added picture did not survive the reload",
  );
  h.assert(
    after.historyDepth === 0,
    "a restored autosave must not arrive with undo steps that would discard it",
  );
});

await seekTo(page, 60_000);
const windowD = await playFor(page, PLAY_MS);
await h.check("playback after a reload is monotonic and smooth", async () => {
  const trace = await collect(page);
  const d = analyse(trace, windowD.from, windowD.to, "after reload");
  fs.writeFileSync(path.join(OUT, "image-edit-playback-D.json"), JSON.stringify(d, null, 1));
  assertSmooth(h.assert, d);
});

await h.check("no uncaught errors during any of it", () => {
  h.assert(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
});

await page.screenshot({ path: path.join(OUT, "image-edit-playback.png") });

/* Leave the film as it was found. */
await page.evaluate((k) => localStorage.removeItem(k), storageKey(PROJECT));
await browser.close();

const failures = h.finish(`  traces -> ${OUT}/image-edit-playback-*.json\n`);
process.exit(failures > 0 ? 1 : 0);
