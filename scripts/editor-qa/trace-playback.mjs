/**
 * Playback trace — what the clock, the reducer, React and the audio actually do
 * while the editor plays, before and after an image edit.
 *
 * ==================== WHY A TRACE AND NOT A CLICK TEST ====================
 * The earlier UI suites proved the Play button could be pressed and the
 * playhead "advanced". An operator then sat down, added a photograph, and
 * watched the timecode run backwards. A suite that samples the clock twice
 * cannot see that. This samples it EVERY FRAME, from three independent places:
 *
 *   1. the timecode the operator reads           (DOM, per rAF)
 *   2. the reducer's playheadMs                   (React commit hook, per commit)
 *   3. the narration element that is sounding     (audio.currentTime, per rAF)
 *
 * plus every audio `seeking` event (each one is an audible skip), every React
 * commit and which components rendered in it, long animation frames, and every
 * autosave write — and a full dump of the timeline model before and after the
 * edit, so a retiming shows up as data rather than as a feeling.
 *
 * Usage:
 *   node scripts/editor-qa/trace-playback.mjs [--scenario=insert|replace|select-only|baseline]
 *        [--seconds=40] [--headed] [--base=http://localhost:3000] [--out=dir]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"];
  }),
);
const BASE = args.base ?? "http://localhost:3000";
const SCENARIO = args.scenario ?? "insert";
const SECONDS = Number(args.seconds ?? 40);
const HEADED = args.headed === "true";
const LIGHT = args.light === "true";
const OUT = args.out ?? "ui-audit/video-editor/stabilization/traces";
const PROJECT = "compressor-01";
const STORAGE_KEY = `altair.editor.project.${PROJECT}`;
const AUTH = ".playwright/founder-auth.json";

fs.mkdirSync(OUT, { recursive: true });

/* ── In-page instrumentation, installed before any app script runs ─────────── */
const INIT = (opts) => {
  const T = (window.__veTrace = {
    commits: [],
    frames: [],
    audioSeeks: [],
    longFrames: [],
    saves: [],
    renders: {},
    marks: [],
    recording: false,
  });

  /** The FiberRoot, from the hook if it ran, else from the hydration container. */
  window.__veGetRoot = () => {
    if (window.__veRoot) return window.__veRoot;
    for (const node of [document, document.documentElement, document.body]) {
      const k = Object.keys(node).find((x) => x.startsWith("__reactContainer$"));
      if (k) return node[k].stateNode;
    }
    return null;
  };

  // A minimal React DevTools hook. React calls onCommitFiberRoot after every
  // commit when this exists, and turns on per-fiber profiling timers in dev.
  let shellFiber = null;
  const findShell = (fiber) => {
    const stack = [fiber];
    while (stack.length) {
      const f = stack.pop();
      if (!f) continue;
      if (f.type && f.type.name === "VideoEditorShell") return f;
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
    return null;
  };
  const isInCurrentTree = (f, root) => {
    let x = f;
    while (x.return) x = x.return;
    return x === root.current;
  };
  const nameOf = (f) =>
    (f.type && (f.type.displayName || f.type.name)) ||
    (f.type && f.type.render && (f.type.render.displayName || f.type.render.name)) ||
    (f.type && f.type.type && (f.type.type.displayName || f.type.type.name)) ||
    null;
  const countRendered = (next, out) => {
    let child = next.child;
    while (child) {
      const prev = child.alternate;
      const n = typeof child.type === "function" || typeof child.type === "object" ? nameOf(child) : null;
      if (!prev) {
        if (n) out[n] = (out[n] || 0) + 1;
        countRendered(child, out);
      } else {
        if (n && (child.flags & 1) === 1) out[n] = (out[n] || 0) + 1;
        if (child.child !== prev.child) countRendered(child, out);
      }
      child = child.sibling;
    }
  };

  // --light: no hook at all. The hook turns on React's profiling timers and
  // the per-commit walk costs time of its own, so a light run is the honest
  // measure of what an operator experiences; a full run is the diagnosis.
  if (!opts.light) window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    isDisabled: false,
    renderers: new Map(),
    inject(renderer) {
      const id = this.renderers.size + 1;
      this.renderers.set(id, renderer);
      return id;
    },
    checkDCE() {},
    onScheduleFiberRoot() {},
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    onCommitFiberRoot(_id, root) {
      window.__veRoot = root;
      if (!T.recording) return;
      if (!shellFiber || (!isInCurrentTree(shellFiber, root) && !(shellFiber.alternate && isInCurrentTree(shellFiber.alternate, root)))) {
        shellFiber = findShell(root.current);
      }
      let f = shellFiber;
      if (f && !isInCurrentTree(f, root) && f.alternate) f = f.alternate;
      const s = f && f.memoizedState ? f.memoizedState.memoizedState : null;
      const rendered = {};
      countRendered(root.current, rendered);
      for (const [k, v] of Object.entries(rendered)) T.renders[k] = (T.renders[k] || 0) + v;
      T.commits.push({
        t: performance.now(),
        playheadMs: s && typeof s.playheadMs === "number" ? s.playheadMs : null,
        isPlaying: s ? s.isPlaying : null,
        revision: s ? s.revision : null,
        dur: root.current.actualDuration ?? null,
        n: Object.values(rendered).reduce((a, b) => a + b, 0),
      });
    },
  };

  // Every write to storage, so autosave cadence is visible next to the clock.
  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (T.recording) T.saves.push({ t: performance.now(), key: k, bytes: String(v).length });
    return setItem.call(this, k, v);
  };

  // Long animation frames: the frames the operator actually perceives as a stall.
  try {
    new PerformanceObserver((list) => {
      if (!T.recording) return;
      for (const e of list.getEntries()) {
        T.longFrames.push({ t: e.startTime, dur: e.duration, block: e.blockingDuration ?? null });
      }
    }).observe({ type: "long-animation-frame", buffered: false });
  } catch {
    /* not supported — reported as null in the summary */
  }

  const parseTc = (s) => {
    const m = /^(\d+):(\d+)\.(\d+)/.exec(s || "");
    return m ? Number(m[1]) * 60000 + Number(m[2]) * 1000 + Number(m[3]) * 10 : null;
  };

  const seen = new WeakSet();
  const frame = (now) => {
    if (T.recording) {
      const tc = document.querySelector('[data-testid="ve-playhead-timecode"]');
      // The timeline's playhead is moved by a DIFFERENT subscriber than the
      // timecode, so sampling both is a real cross-check: if the two ever
      // disagree, one of them is not reading the clock.
      const ph = document.querySelector('[data-testid="ve-playhead"]');
      const poolEl = document.querySelector('[data-testid="ve-audio-pool"]');
      const pool = document.querySelectorAll('[data-testid="ve-audio-pool"] audio');
      let audio = null;
      for (const a of pool) {
        if (!seen.has(a)) {
          seen.add(a);
          a.addEventListener("seeking", () => {
            if (T.recording) T.audioSeeks.push({ t: performance.now(), clipId: a.dataset.clipId, to: a.currentTime });
          });
        }
        if (!a.paused) audio = { clipId: a.dataset.clipId, currentTime: a.currentTime };
      }
      T.frames.push({
        t: now,
        tcMs: parseTc(tc && tc.textContent),
        phMs: ph && ph.dataset.ms !== undefined ? Number(ph.dataset.ms) : null,
        audio,
        starts: poolEl ? Number(poolEl.dataset.starts ?? 0) : null,
        corrections: poolEl ? Number(poolEl.dataset.corrections ?? 0) : null,
      });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

/* ── Model dump, read out of the live reducer ─────────────────────────────── */
async function dumpModel(page) {
  return page.evaluate(() => {
    const root = window.__veGetRoot();
    if (!root) return null;
    const stack = [root.current];
    let shell = null;
    while (stack.length) {
      const f = stack.pop();
      if (!f) continue;
      if (f.type && f.type.name === "VideoEditorShell") {
        shell = f;
        break;
      }
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
    if (!shell) return null;
    const s = shell.memoizedState.memoizedState;
    const p = s.history.present;
    // Time lives in the PlaybackClock now, not in the reducer. Read it where
    // the operator reads it.
    const tcEl = document.querySelector('[data-testid="ve-playhead-timecode"]');
    const playheadMs = tcEl ? Number(tcEl.dataset.ms ?? 0) : 0;
    const isPlaying = Boolean(document.querySelector('button[aria-label="Pause"]'));
    const clips = [];
    for (const t of p.tracks) {
      for (const c of t.clips) {
        clips.push({
          track: t.id,
          id: c.id,
          kind: c.kind,
          assetId: c.assetId ?? null,
          startMs: c.startMs,
          endMs: c.startMs + c.durationMs,
          durationMs: c.durationMs,
          text: c.text?.text ?? null,
          transform: c.transform ?? null,
        });
      }
    }
    const end = clips.reduce((m, c) => Math.max(m, c.endMs), 0);
    const at = (trackKind) =>
      clips.find((c) => {
        const tr = p.tracks.find((x) => x.id === c.track);
        return tr && tr.kind === trackKind && playheadMs >= c.startMs && playheadMs < c.endMs;
      })?.id ?? null;
    const audio = [...document.querySelectorAll('[data-testid="ve-audio-pool"] audio')]
      .filter((a) => !a.paused || a.currentTime > 0)
      .map((a) => ({ clipId: a.dataset.clipId, currentTime: a.currentTime, paused: a.paused }));
    return {
      projectDurationMs: end,
      clipCount: clips.length,
      trackCount: p.tracks.length,
      trackIds: p.tracks.map((t) => t.id),
      selection: s.selection.clipIds,
      playheadMs,
      isPlaying,
      revision: s.revision,
      historyDepth: s.history.past.length,
      lastLabel: s.history.lastLabel,
      activeNarration: at("voice"),
      activeVisual: at("video"),
      activeGraphics: at("graphics"),
      activeCaption: at("caption"),
      audio,
      clips,
    };
  });
}

/* ── Invariants between two model dumps ──────────────────────────────────── */
function compareModels(before, after, editedClipId) {
  const problems = [];
  const b = new Map(before.clips.map((c) => [c.id, c]));
  const a = new Map(after.clips.map((c) => [c.id, c]));
  if (after.projectDurationMs !== before.projectDurationMs) {
    problems.push(`project duration ${before.projectDurationMs} -> ${after.projectDurationMs}`);
  }
  if (after.clipCount !== before.clipCount) problems.push(`clip count ${before.clipCount} -> ${after.clipCount}`);
  if (after.trackCount !== before.trackCount) problems.push(`track count ${before.trackCount} -> ${after.trackCount}`);
  const ids = after.clips.map((c) => c.id);
  if (new Set(ids).size !== ids.length) problems.push("duplicate clip ids");
  if (new Set(after.trackIds).size !== after.trackIds.length) problems.push("duplicate track ids");
  for (const c of after.clips) {
    if (![c.startMs, c.endMs, c.durationMs].every(Number.isFinite)) problems.push(`${c.id} has NaN timing`);
    if (c.durationMs <= 0) problems.push(`${c.id} non-positive duration`);
    const prev = b.get(c.id);
    if (!prev) continue;
    if (prev.startMs !== c.startMs || prev.durationMs !== c.durationMs) {
      problems.push(`${c.id} retimed ${prev.startMs}+${prev.durationMs} -> ${c.startMs}+${c.durationMs}`);
    }
    if (c.id !== editedClipId && (prev.assetId !== c.assetId || prev.kind !== c.kind)) {
      problems.push(`${c.id} changed but was not the edited clip`);
    }
    if (c.track.includes("caption") && prev.text !== c.text) problems.push(`${c.id} caption text changed`);
  }
  for (const id of b.keys()) if (!a.has(id)) problems.push(`${id} disappeared`);
  // Overlaps within one track.
  const byTrack = new Map();
  for (const c of after.clips) {
    if (!byTrack.has(c.track)) byTrack.set(c.track, []);
    byTrack.get(c.track).push(c);
  }
  for (const [track, list] of byTrack) {
    const sorted = [...list].sort((x, y) => x.startMs - y.startMs);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].startMs < sorted[i - 1].endMs) {
        const pairKey = `${sorted[i - 1].id}/${sorted[i].id}`;
        const wasOverlapping = before.clips.some((c) => c.id === sorted[i - 1].id) &&
          before.clips.find((c) => c.id === sorted[i].id)?.startMs < before.clips.find((c) => c.id === sorted[i - 1].id)?.endMs;
        if (!wasOverlapping) problems.push(`new overlap on ${track}: ${pairKey}`);
      }
    }
  }
  return problems;
}

/* ── Analysis of one recorded window ──────────────────────────────────────── */
function analyse(trace, fromT, toT, label) {
  const frames = trace.frames.filter((f) => f.t >= fromT && f.t <= toT && f.tcMs !== null);
  const playheadFrames = frames.filter((f) => f.phMs !== null);
  const commits = trace.commits.filter((c) => c.t >= fromT && c.t <= toT);
  const seeks = trace.audioSeeks.filter((s) => s.t >= fromT && s.t <= toT);
  const longFrames = trace.longFrames.filter((l) => l.t >= fromT && l.t <= toT);

  const backward = (seq, key) => {
    let count = 0;
    let worst = 0;
    const examples = [];
    for (let i = 1; i < seq.length; i += 1) {
      const d = seq[i][key] - seq[i - 1][key];
      if (d < 0) {
        count += 1;
        worst = Math.min(worst, d);
        if (examples.length < 8) examples.push({ i, from: seq[i - 1][key], to: seq[i][key], dt: +(seq[i].t - seq[i - 1].t).toFixed(1) });
      }
    }
    return { count, worstMs: worst, examples };
  };

  const wallMs = frames.length ? frames[frames.length - 1].t - frames[0].t : 0;
  const editorMs = frames.length ? frames[frames.length - 1].tcMs - frames[0].tcMs : 0;
  const intervals = [];
  for (let i = 1; i < frames.length; i += 1) intervals.push(frames[i].t - frames[i - 1].t);
  intervals.sort((x, y) => x - y);
  const pct = (p) => (intervals.length ? +intervals[Math.floor((intervals.length - 1) * p)].toFixed(1) : null);

  // Audio vs editor: where the sounding element is, against where the editor
  // says it should be. Needs the clip offsets, so it is reported as a raw
  // editor-vs-audio rate instead — both should advance at wall speed.
  let jumpsOver250 = 0;
  for (let i = 1; i < frames.length; i += 1) {
    const d = frames[i].tcMs - frames[i - 1].tcMs;
    const dt = frames[i].t - frames[i - 1].t;
    if (d - dt > 250) jumpsOver250 += 1;
  }

  return {
    label,
    wallSeconds: +(wallMs / 1000).toFixed(2),
    editorSecondsAdvanced: +(editorMs / 1000).toFixed(2),
    clockRate: wallMs ? +(editorMs / wallMs).toFixed(4) : null,
    frames: frames.length,
    fps: wallMs ? +((frames.length / wallMs) * 1000).toFixed(1) : null,
    frameIntervalMs: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: intervals.length ? +intervals[intervals.length - 1].toFixed(1) : null },
    displayedBackward: backward(frames, "tcMs"),
    // The timeline playhead, moved by a different subscriber than the timecode.
    playheadBackward: backward(playheadFrames, "phMs"),
    maxTimecodeVsPlayheadMs: playheadFrames.reduce(
      (m, f) => Math.max(m, Math.abs(f.phMs - f.tcMs)),
      0,
    ),
    audioStarts: frames.length ? (frames[frames.length - 1].starts ?? 0) - (frames[0].starts ?? 0) : 0,
    // Drift corrections: each one is an audible skip in the narration.
    audioCorrections: frames.length
      ? (frames[frames.length - 1].corrections ?? 0) - (frames[0].corrections ?? 0)
      : 0,
    forwardJumpsOver250ms: jumpsOver250,
    reactCommits: commits.length,
    commitsPerSec: wallMs ? +((commits.length / wallMs) * 1000).toFixed(1) : null,
    commitRenderMs: (() => {
      const d = commits.map((c) => c.dur).filter((x) => typeof x === "number").sort((x, y) => x - y);
      return d.length ? { p50: +d[Math.floor(d.length * 0.5)].toFixed(2), p95: +d[Math.floor(d.length * 0.95)].toFixed(2), max: +d[d.length - 1].toFixed(2) } : null;
    })(),
    fibersPerCommit: commits.length ? +(commits.reduce((a, c) => a + c.n, 0) / commits.length).toFixed(1) : null,
    audioSeeks: seeks.length,
    audioSeekExamples: seeks.slice(0, 6),
    longAnimationFrames: longFrames.length,
    longAnimationFrameMaxMs: longFrames.length ? Math.max(...longFrames.map((l) => l.dur)) : 0,
    autosaveWrites: trace.saves.filter((s) => s.t >= fromT && s.t <= toT && s.key.startsWith("altair.editor.project.")).length,
  };
}

/* ── Run ──────────────────────────────────────────────────────────────────── */
if (!fs.existsSync(AUTH)) {
  console.error(`No session at ${AUTH}. Run: npm run capture:founder-auth`);
  process.exit(2);
}

const browser = await chromium.launch({
  headless: !HEADED,
  args: ["--autoplay-policy=no-user-gesture-required"],
});
const context = await browser.newContext({ storageState: AUTH, viewport: { width: 1680, height: 1050 } });
await context.addInitScript(INIT, { light: LIGHT });
const page = await context.newPage();
const consoleErrors = [];
page.on("console", (m) => {
  if (m.type() === "error" && !/facebook|Meta Pixel|fbevents/i.test(m.text())) consoleErrors.push(m.text().slice(0, 300));
});
page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));

await page.goto(`${BASE}/studio/editor/${PROJECT}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
await page.evaluate((k) => localStorage.removeItem(k), STORAGE_KEY);
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector('[data-testid="ve-playhead-timecode"]', { timeout: 30000 });
await page.waitForTimeout(2500);

const now = () => page.evaluate(() => performance.now());
const setRecording = (on) => page.evaluate((v) => { window.__veTrace.recording = v; }, on);
const mark = async (name) => {
  const t = await now();
  await page.evaluate(([n, tt]) => window.__veTrace.marks.push({ name: n, t: tt }), [name, t]);
  return t;
};
const play = () => page.locator('button[aria-label="Play"]').click();
const pause = () => page.locator('button[aria-label="Pause"]').click();

await setRecording(true);

// Seek somewhere with narration and a mix of clip kinds, like an operator
// reviewing the middle of the film rather than the cold open.
const startAt = Number(args.start ?? 60000);
await page.evaluate(() => document.querySelector('[data-testid="ve-playhead-timecode"]'));
// Scrub via the ruler is pixel-dependent; seek with the arrow keys instead is
// slow. Use Home then Shift+Right (1s steps) — the same keys an operator uses.
await page.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => {});
await page.keyboard.press("Home");
for (let i = 0; i < Math.round(startAt / 1000); i += 1) await page.keyboard.press("Shift+ArrowRight");
await page.waitForTimeout(400);

const modelStart = await dumpModel(page);

/* Phase A — untouched playback */
const aFrom = await mark("A-play");
await play();
await page.waitForTimeout(SECONDS * 1000);
await pause();
const aTo = await mark("A-pause");
await page.waitForTimeout(600);

const modelBefore = await dumpModel(page);

/* The edit */
let editedClipId = null;
let editDescription = "none";
if (SCENARIO !== "baseline") {
  const target = modelBefore.clips.find((c) => {
    if (SCENARIO === "insert") return (c.track === "t-video" || c.track === "t-graphics") && c.assetId === null && c.startMs > modelBefore.playheadMs;
    return c.track === "t-video" && c.assetId !== null && modelBefore.playheadMs >= c.startMs && modelBefore.playheadMs < c.endMs;
  }) ?? modelBefore.clips.find((c) => c.track === "t-video" && c.assetId !== null && c.startMs >= modelBefore.playheadMs);
  editedClipId = target?.id ?? null;
  if (!target) throw new Error("no target clip for the edit");

  // Select the clip the way an operator does: click it on the timeline.
  const label = await page.evaluate((id) => {
    const root = window.__veGetRoot();
    const stack = [root.current];
    while (stack.length) {
      const f = stack.pop();
      if (!f) continue;
      if (f.type && f.type.name === "VideoEditorShell") {
        const p = f.memoizedState.memoizedState.history.present;
        for (const t of p.tracks) for (const c of t.clips) if (c.id === id) return c.label;
      }
      if (f.sibling) stack.push(f.sibling);
      if (f.child) stack.push(f.child);
    }
    return null;
  }, target.id);
  const trackKind = target.track === "t-graphics" ? "graphics" : "video";
  const clipEl = page.locator(`[data-track-kind="${trackKind}"][aria-label^="${label.replace(/"/g, '\\"')},"]`).first();
  await clipEl.scrollIntoViewIfNeeded();
  await clipEl.click({ position: { x: 10, y: 12 } });
  await page.waitForTimeout(300);

  await page.locator('nav[aria-label="Editor tools"] button[title="Library"]').click();
  await page.waitForTimeout(900);

  if (SCENARIO === "insert" || SCENARIO === "replace") {
    const assets = page.locator('[data-testid="ve-library-asset"]:not([disabled])');
    const n = await assets.count();
    const pick = assets.nth(Math.min(7, n - 1));
    const assetId = await pick.getAttribute("data-asset-id");
    await pick.click();
    editDescription = `${SCENARIO}: ${target.id} (${target.assetId ?? "no asset"}) -> ${assetId}`;
  } else {
    editDescription = `select-only: ${target.id}, library tab open`;
  }
  await page.waitForTimeout(1500); // past the autosave debounce
}

const modelAfter = await dumpModel(page);
const invariantProblems = compareModels(modelBefore, modelAfter, editedClipId);

/* Phase B — playback after the edit, from where it paused */
const bFrom = await mark("B-play");
await play();
await page.waitForTimeout(SECONDS * 1000);
await pause();
const bTo = await mark("B-pause");
await page.waitForTimeout(400);
await setRecording(false);

const trace = await page.evaluate(() => window.__veTrace);
const renderTop = Object.entries(trace.renders).sort((x, y) => y[1] - x[1]).slice(0, 25);

const A = analyse(trace, aFrom, aTo, "A: untouched");
const B = analyse(trace, bFrom, bTo, `B: after ${SCENARIO}`);

// Per-component renders during each window, from commit-level counts.
// (Aggregate only — the per-window split is in the raw trace.)
const summary = {
  scenario: SCENARIO,
  headed: HEADED,
  seconds: SECONDS,
  edit: editDescription,
  modelStart: { durationMs: modelStart.projectDurationMs, clips: modelStart.clipCount, tracks: modelStart.trackCount },
  modelBefore: { ...modelBefore, clips: undefined },
  modelAfter: { ...modelAfter, clips: undefined },
  invariantProblems,
  A,
  B,
  topRenderedComponents: renderTop,
  consoleErrors: consoleErrors.slice(0, 20),
};

const stamp = `${SCENARIO}-${HEADED ? "headed" : "headless"}`;
fs.writeFileSync(path.join(OUT, `${stamp}.summary.json`), JSON.stringify(summary, null, 2));
fs.writeFileSync(
  path.join(OUT, `${stamp}.raw.json`),
  JSON.stringify({ trace, modelBefore, modelAfter }, null, 0),
);

const line = (r) =>
  `  ${r.label.padEnd(22)} rate ${String(r.clockRate).padEnd(7)} fps ${String(r.fps).padEnd(5)} ` +
  `backward(display) ${String(r.displayedBackward.count).padEnd(4)} worst ${String(r.displayedBackward.worstMs).padEnd(6)} ` +
  `backward(playhead) ${String(r.playheadBackward.count).padEnd(4)} skew ${String(r.maxTimecodeVsPlayheadMs).padEnd(4)} ` +
  `audioSeeks ${String(r.audioSeeks).padEnd(4)} corrections ${String(r.audioCorrections).padEnd(4)} ` +
  `commits/s ${String(r.commitsPerSec).padEnd(5)} commit p95 ${r.commitRenderMs?.p95 ?? "-"}ms fibers/commit ${r.fibersPerCommit} LoAF ${r.longAnimationFrames}`;

console.log(`\nscenario=${SCENARIO} headed=${HEADED} ${SECONDS}s per window`);
console.log(`edit: ${editDescription}`);
console.log(line(A));
console.log(line(B));
console.log(`invariants after edit: ${invariantProblems.length ? invariantProblems.join("; ") : "all hold"}`);
console.log(`top renders: ${renderTop.slice(0, 12).map(([k, v]) => `${k}:${v}`).join(" ")}`);
console.log(`console errors: ${consoleErrors.length}`);
console.log(`-> ${path.join(OUT, `${stamp}.summary.json`)}`);

await page.evaluate((k) => localStorage.removeItem(k), STORAGE_KEY);
await browser.close();
