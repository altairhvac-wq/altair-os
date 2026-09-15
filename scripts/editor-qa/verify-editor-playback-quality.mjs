/**
 * Playback QUALITY, not playback existence.
 *
 * The suite this sits beside proves the editor's features work. This one
 * proves the thing a person actually feels: that the film plays smoothly,
 * that scrubbing and resuming do not disturb it, that speed changes are
 * honest, and that nothing in the editor is re-rendering sixty times a second
 * to move one number.
 *
 * Every assertion is a measurement over hundreds of sampled frames rather than
 * a before/after pair, because "the timecode changed" was exactly the check
 * that let a half-speed, stuttering clock ship.
 *
 * Run: node scripts/editor-qa/verify-editor-playback-quality.mjs [baseUrl] [--headed]
 */
import fs from "node:fs";
import path from "node:path";
import {
  analyse,
  assertSmooth,
  collect,
  dumpModel,
  harness,
  launchEditor,
  narrationSyncProblems,
  openProject,
  playFor,
  recording,
  seekTo,
} from "./lib/probe.mjs";

const base = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const headed = process.argv.includes("--headed");
const PROJECT = "compressor-01";
const OUT = "ui-audit/video-editor/stabilization";
fs.mkdirSync(OUT, { recursive: true });

const h = harness(`Playback quality — ${PROJECT}`);
// The React profiling hook is installed on purpose here: the render cost of
// playback is one of the things being measured.
const { browser, page, consoleErrors, failedRequests, abortedMedia } = await launchEditor({
  base,
  project: PROJECT,
  headed,
  light: false,
});

await openProject(page, { base, project: PROJECT });
await recording(page, true);

const model = await dumpModel(page);
const report = {};

/* ── A long, uninterrupted run from a cold start ──────────────────────────── */
const A = await playFor(page, 35_000);
await h.check("35 seconds of uninterrupted playback never moves backwards", async () => {
  const trace = await collect(page);
  report.fromStart = analyse(trace, A.from, A.to, "from the top");
  assertSmooth(h.assert, report.fromStart);
});

await h.check("the editor does not re-render to move the playhead", async () => {
  // The timeline's 108 clips, the inspector and the 160-tile photo library used
  // to re-render on every frame, because the playhead was React state.
  const r = report.fromStart;
  h.assert(
    r.commitsPerSec !== null && r.commitsPerSec < 3,
    `${r.commitsPerSec} React commits per second during playback`,
  );
});

await h.check("no long frames worth feeling", async () => {
  const r = report.fromStart;
  h.assert(
    r.longAnimationFrames <= 6,
    `${r.longAnimationFrames} long animation frames (max ${r.longAnimationFrameMaxMs}ms)`,
  );
  h.assert(
    r.frameIntervalMs.p95 !== null && r.frameIntervalMs.p95 < 40,
    `95th percentile frame gap was ${r.frameIntervalMs.p95}ms`,
  );
});

/* ── Seek, then resume ────────────────────────────────────────────────────── */
await h.check("seeking mid-film and resuming plays cleanly from there", async () => {
  await seekTo(page, 120_000);
  const at = (await dumpModel(page)).playheadMs;
  h.assert(Math.abs(at - 120_000) < 1500, `seek landed at ${at}ms`);
  const B = await playFor(page, 20_000);
  const trace = await collect(page);
  report.afterSeek = analyse(trace, B.from, B.to, "after a seek");
  assertSmooth(h.assert, report.afterSeek);
  h.assert(
    report.afterSeek.samples[0].tcMs >= at - 200,
    "playback resumed from somewhere other than the seek",
  );
});

await h.check("the narration follows the playhead, and is not dragged back", async () => {
  const sync = narrationSyncProblems(report.afterSeek.samples, model);
  h.assert(sync.checked > 50, `only ${sync.checked} frames had narration to check`);
  h.assert(sync.count === 0, sync.problems.join("; "));
  h.assert(
    report.afterSeek.audioCorrections === 0,
    `${report.afterSeek.audioCorrections} drift corrections — each one is an audible skip`,
  );
});

/* ── Pause really stops ───────────────────────────────────────────────────── */
await h.check("pause stops the clock and silences the narration", async () => {
  const before = (await dumpModel(page)).playheadMs;
  await page.waitForTimeout(1200);
  const after = await dumpModel(page);
  h.assert(after.playheadMs === before, `a paused clock moved ${before} -> ${after.playheadMs}`);
  const sounding = await page.evaluate(
    () => [...document.querySelectorAll('[data-testid="ve-audio-pool"] audio')].filter((a) => !a.paused).length,
  );
  h.assert(sounding === 0, `${sounding} narration clips still sounding while paused`);
});

/* ── Speed ────────────────────────────────────────────────────────────────── */
await h.check("2x plays twice as fast, and still only forwards", async () => {
  await page.locator('[data-testid="ve-rate-2"]').click();
  const C = await playFor(page, 12_000);
  const trace = await collect(page);
  report.doubleSpeed = analyse(trace, C.from, C.to, "2x");
  h.assert(
    report.doubleSpeed.displayedBackward.count === 0,
    `time moved backwards ${report.doubleSpeed.displayedBackward.count} times at 2x`,
  );
  h.assert(
    report.doubleSpeed.clockRate > 1.85 && report.doubleSpeed.clockRate < 2.15,
    `2x ran at ${report.doubleSpeed.clockRate}x`,
  );
  await page.locator('[data-testid="ve-rate-1"]').click();
});

/* ── Scrubbing ────────────────────────────────────────────────────────────── */
await h.check("scrubbing the ruler moves the playhead and does not start playback", async () => {
  const ruler = page.locator('[data-testid="ve-ruler"]');
  const box = await ruler.boundingBox();
  await page.mouse.move(box.x + 120, box.y + 6);
  await page.mouse.down();
  for (let i = 0; i < 8; i += 1) {
    await page.mouse.move(box.x + 120 + i * 25, box.y + 6);
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(300);
  const after = await dumpModel(page);
  h.assert(after.isPlaying === false, "scrubbing must not start playback");
  h.assert(after.playheadMs > 0, "the playhead did not follow the pointer");
});

await h.check("no console errors and no failed studio requests", () => {
  h.assert(consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  const studio = failedRequests.filter((r) => r.includes("/studio/"));
  h.assert(studio.length === 0, studio.slice(0, 3).join(" | "));
  // Reported rather than asserted: see the note in probe.mjs. This suite seeks
  // more than a person would, and each seek can interrupt a buffering file.
  process.stdout.write(
    `       (${abortedMedia.length} media fetches aborted by seeking — expected)\n`,
  );
});

fs.writeFileSync(
  path.join(OUT, "playback-quality.json"),
  JSON.stringify(
    {
      fromStart: { ...report.fromStart, samples: undefined },
      afterSeek: { ...report.afterSeek, samples: undefined },
      doubleSpeed: { ...report.doubleSpeed, samples: undefined },
    },
    null,
    2,
  ),
);

await browser.close();
const failures = h.finish(`  measurements -> ${OUT}/playback-quality.json\n`);
process.exit(failures > 0 ? 1 : 0);
