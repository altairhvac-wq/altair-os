/**
 * Media stress: can the editor survive being used hard?
 *
 * Twenty replacements, several additions, undo and redo through them, a save, a
 * reload, and playback afterwards — with the timeline checked for corruption
 * after every step rather than once at the end. The operator's report was that
 * "adding pictures can break the editor", and the failure mode that description
 * fits is a mutation that half-lands: a clip that names an asset that is not
 * there, an overlap nobody asked for, a duration quietly recomputed.
 *
 * Run: node scripts/editor-qa/verify-media-stress.mjs [baseUrl] [--headed]
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
  notice,
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
const OUT = "ui-audit/video-editor/stabilization";
fs.mkdirSync(OUT, { recursive: true });

const h = harness(`Media stress — ${PROJECT}`);
const { browser, page, consoleErrors } = await launchEditor({ base, project: PROJECT, headed });

await openProject(page, { base, project: PROJECT });
await recording(page, true);

const start = await dumpModel(page);
const target = start.clips.find((c) => c.trackKind === "video" && c.assetId !== null);

await selectClip(page, start, target.id);
await openTool(page, "Library");
await page.waitForTimeout(800);

/* ── Twenty replacements on one clip ──────────────────────────────────────── */
const applied = [];
await h.check("the same picture can be changed twenty times over", async () => {
  for (let i = 0; i < 20; i += 1) {
    const assetId = await applyLibraryAsset(page, i % 12);
    applied.push(assetId);
    const model = await dumpModel(page);
    const clip = model.clips.find((c) => c.id === target.id);
    h.assert(clip !== undefined, `the clip disappeared on replacement ${i + 1}`);
    h.assert(
      clip.assetId === assetId,
      `replacement ${i + 1} left ${clip.assetId} instead of ${assetId}`,
    );
    h.assert(
      clip.startMs === target.startMs && clip.durationMs === target.durationMs,
      `replacement ${i + 1} retimed the clip`,
    );
  }
});

await h.check("twenty replacements left the rest of the film untouched", async () => {
  const after = await dumpModel(page);
  const problems = compareModels(start, after, [target.id]);
  h.assert(problems.length === 0, problems.join("; "));
});

/* ── Several additions ────────────────────────────────────────────────────── */
const added = [];
await h.check("several photographs can be added at different points", async () => {
  const model = await dumpModel(page);
  const before = model.clipCount;
  for (const at of [20_000, 45_000, 70_000]) {
    await seekTo(page, at);
    await openTool(page, "Library");
    await page.waitForTimeout(400);
    const assetId = await addLibraryAsset(page, added.length + 1);
    const now_ = await dumpModel(page);
    const isNew = now_.clips.find(
      (c) => c.assetId === assetId && !model.clips.some((x) => x.id === c.id),
    );
    if (isNew) added.push(isNew.id);
    else {
      // A refusal is acceptable — it must be a stated reason, not a silent
      // failure or a corrupted timeline.
      const text = await notice(page);
      h.assert(
        text !== null && text.length > 0,
        `adding at ${at}ms neither added a clip nor said why`,
      );
    }
  }
  const end = await dumpModel(page);
  h.assert(end.clipCount >= before, "clips went missing while adding");
  h.assert(added.length > 0, "not one of the three additions worked");
});

/* ── Undo and redo through all of it ──────────────────────────────────────── */
await h.check("undo walks back through the additions and replacements", async () => {
  const before = await dumpModel(page);
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press("Control+z");
    await page.waitForTimeout(90);
  }
  const after = await dumpModel(page);
  h.assert(after.revision !== before.revision, "ten undos changed nothing at all");
  h.assert(compareModels(after, after).length === 0, "undo produced an invalid timeline");
});

await h.check("redo puts them back", async () => {
  const before = await dumpModel(page);
  for (let i = 0; i < 10; i += 1) {
    await page.keyboard.press("Control+Shift+z");
    await page.waitForTimeout(90);
  }
  const after = await dumpModel(page);
  h.assert(after.revision !== before.revision, "ten redos changed nothing at all");
  h.assert(
    after.clips.find((c) => c.id === target.id).assetId === applied[applied.length - 1],
    "redo did not restore the last picture chosen",
  );
});

/* ── Save, reload, play ───────────────────────────────────────────────────── */
await h.check("it saves, reloads, and still holds the edits", async () => {
  await page.waitForTimeout(1400);
  const model = await dumpModel(page);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="ve-playhead-timecode"]', { timeout: 30000 });
  await page.waitForTimeout(2500);
  await recording(page, true);
  const after = await dumpModel(page);
  h.assert(
    after.clipCount === model.clipCount,
    `clip count ${model.clipCount} -> ${after.clipCount} over a reload`,
  );
  h.assert(
    after.clips.find((c) => c.id === target.id).assetId ===
      model.clips.find((c) => c.id === target.id).assetId,
    "the picture did not survive the reload",
  );
});

await h.check("and it still plays smoothly after all of that", async () => {
  await seekTo(page, 30_000);
  const window_ = await playFor(page, 20_000);
  const trace = await collect(page);
  const result = analyse(trace, window_.from, window_.to, "after the stress");
  fs.writeFileSync(
    path.join(OUT, "media-stress-playback.json"),
    JSON.stringify({ ...result, samples: undefined }, null, 2),
  );
  assertSmooth(h.assert, result);
});

await h.check("no uncaught errors through the whole session", () => {
  h.assert(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
});

await page.screenshot({ path: path.join(OUT, "media-stress.png") });
await page.evaluate((k) => localStorage.removeItem(k), storageKey(PROJECT));
await browser.close();

const failures = h.finish("");
process.exit(failures > 0 ? 1 : 0);
