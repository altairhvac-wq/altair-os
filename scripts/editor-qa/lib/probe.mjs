/**
 * The editor probe: one place that knows how to open the editor, drive it, and
 * measure what playback actually did.
 *
 * ==================== WHY THE MEASUREMENTS LIVE HERE ====================
 * The suites that existed before this could prove the Play button was
 * clickable and that the timecode was different a moment later. An operator
 * then sat down and watched the clock run backwards. The difference is
 * sampling: these helpers record the displayed timecode EVERY FRAME, from the
 * two independent elements that show it, alongside what the narration is
 * doing — so "it played" becomes a number rather than an impression.
 *
 * Every consumer asserts on the same three things:
 *   1. time never moves backwards during uninterrupted playback,
 *   2. it advances at wall-clock speed,
 *   3. the narration is not being dragged back to catch up.
 */

import { chromium } from "playwright";
import fs from "node:fs";

export const AUTH = ".playwright/founder-auth.json";
export const DEFAULT_PROJECT = "compressor-01";

export const storageKey = (project) => `altair.editor.project.${project}`;

/**
 * Installed before any app script runs.
 *
 * `light: true` omits the React profiling hook — the honest measure of what an
 * operator experiences. With the hook, commit counts and render costs are
 * available, at the price of making every render a little more expensive.
 */
export const INIT = (opts) => {
  const T = (window.__veProbe = {
    frames: [],
    commits: [],
    renders: {},
    longFrames: [],
    saves: [],
    marks: [],
    recording: false,
  });

  window.__veGetRoot = () => {
    if (window.__veRoot) return window.__veRoot;
    for (const node of [document, document.documentElement, document.body]) {
      const k = Object.keys(node).find((x) => x.startsWith("__reactContainer$"));
      if (k) return node[k].stateNode;
    }
    return null;
  };

  if (!opts.light) {
    const nameOf = (f) =>
      (f.type && (f.type.displayName || f.type.name)) ||
      (f.type && f.type.render && (f.type.render.displayName || f.type.render.name)) ||
      null;
    const countRendered = (next, out) => {
      let child = next.child;
      while (child) {
        const prev = child.alternate;
        const n =
          typeof child.type === "function" || typeof child.type === "object"
            ? nameOf(child)
            : null;
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
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
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
        const rendered = {};
        countRendered(root.current, rendered);
        for (const [k, v] of Object.entries(rendered)) {
          T.renders[k] = (T.renders[k] || 0) + v;
        }
        T.commits.push({
          t: performance.now(),
          dur: root.current.actualDuration ?? null,
          n: Object.values(rendered).reduce((a, b) => a + b, 0),
        });
      },
    };
  }

  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) {
    if (T.recording) T.saves.push({ t: performance.now(), key: k, bytes: String(v).length });
    return setItem.call(this, k, v);
  };

  try {
    new PerformanceObserver((list) => {
      if (!T.recording) return;
      for (const e of list.getEntries()) {
        T.longFrames.push({ t: e.startTime, dur: e.duration });
      }
    }).observe({ type: "long-animation-frame", buffered: false });
  } catch {
    /* not supported here; reported as null */
  }

  const frame = (now) => {
    if (T.recording) {
      const tc = document.querySelector('[data-testid="ve-playhead-timecode"]');
      // A second, independently-updated element showing the same clock.
      const ph = document.querySelector('[data-testid="ve-playhead"]');
      const poolEl = document.querySelector('[data-testid="ve-audio-pool"]');
      let audio = null;
      for (const a of document.querySelectorAll('[data-testid="ve-audio-pool"] audio')) {
        if (!a.paused) audio = { clipId: a.dataset.clipId, currentTime: a.currentTime };
      }
      T.frames.push({
        t: now,
        tcMs: tc && tc.dataset.ms !== undefined ? Number(tc.dataset.ms) : null,
        phMs: ph && ph.dataset.ms !== undefined ? Number(ph.dataset.ms) : null,
        audio,
        starts: poolEl ? Number(poolEl.dataset.starts ?? 0) : null,
        settles: poolEl ? Number(poolEl.dataset.settles ?? 0) : null,
        corrections: poolEl ? Number(poolEl.dataset.corrections ?? 0) : null,
      });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};

export async function launchEditor({
  base = "http://localhost:3000",
  project = DEFAULT_PROJECT,
  headed = false,
  light = true,
  viewport = { width: 1680, height: 1050 },
} = {}) {
  if (!fs.existsSync(AUTH)) {
    throw new Error(`No session at ${AUTH}. Run: npm run capture:founder-auth`);
  }
  const browser = await chromium.launch({
    headless: !headed,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });
  const context = await browser.newContext({ storageState: AUTH, viewport });
  await context.addInitScript(INIT, { light });
  const page = await context.newPage();

  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // "Failed to load resource" carries its URL in the console LOCATION, not in
    // the message, so filtering on the text alone hid which resource failed.
    // The Meta pixel cannot load on localhost and never could; it is not this
    // editor's error. Everything else is reported WITH its URL, so a failure
    // names the file instead of sending someone hunting for it.
    const url = m.location()?.url ?? "";
    const text = m.text();
    if (/facebook|fbevents|Meta Pixel|doubleclick/i.test(`${text} ${url}`)) return;
    consoleErrors.push(`${text.slice(0, 200)}${url ? ` @ ${url.slice(0, 140)}` : ""}`);
  });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e.message}`));
  const abortedMedia = [];
  page.on("requestfailed", (r) => {
    const url = r.url();
    const error = r.failure()?.errorText ?? "";
    if (/facebook|fbevents/i.test(url)) return;
    // A media element whose buffering is interrupted by a pause or a seek
    // aborts its own range request. That is the browser doing what it is meant
    // to do — these suites seek dozens of times — and the file is fetched again
    // when it is next needed. Counted, so it stays visible, but not a failure.
    if (error.includes("ERR_ABORTED") && /\.(m4a|mp3|aac|wav|mp4)(\?|$)/i.test(url)) {
      abortedMedia.push(url);
      return;
    }
    failedRequests.push(`${url} ${error}`);
  });

  return { browser, context, page, consoleErrors, failedRequests, abortedMedia, base, project };
}

export async function openProject(page, { base, project, clearStorage = true }) {
  await page.goto(`${base}/studio/editor/${project}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-testid="ve-playhead-timecode"]', { timeout: 30000 });
  if (clearStorage) {
    await page.evaluate((k) => localStorage.removeItem(k), storageKey(project));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-testid="ve-playhead-timecode"]', { timeout: 30000 });
  }
  await page.waitForTimeout(2200);
}

export const recording = (page, on) =>
  page.evaluate((v) => {
    window.__veProbe.recording = v;
  }, on);

export const now = (page) => page.evaluate(() => performance.now());
export const collect = (page) => page.evaluate(() => window.__veProbe);

export const play = (page) => page.locator('[data-testid="ve-play"][aria-label="Play"]').click();
export const pause = (page) => page.locator('[data-testid="ve-play"][aria-label="Pause"]').click();

/** Seek with the keys an operator uses, from a known position. */
export async function seekTo(page, ms) {
  await page.locator("body").click({ position: { x: 4, y: 4 } }).catch(() => {});
  await page.keyboard.press("Home");
  for (let i = 0; i < Math.round(ms / 1000); i += 1) {
    await page.keyboard.press("Shift+ArrowRight");
  }
  await page.waitForTimeout(250);
}

export async function playFor(page, ms) {
  const from = await now(page);
  await play(page);
  await page.waitForTimeout(ms);
  await pause(page);
  const to = await now(page);
  await page.waitForTimeout(300);
  return { from, to };
}

/** The live reducer project plus the clock, read where the operator reads it. */
export function dumpModel(page) {
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
    const clips = [];
    for (const t of p.tracks) {
      for (const c of t.clips) {
        clips.push({
          track: t.id,
          trackKind: t.kind,
          id: c.id,
          kind: c.kind,
          label: c.label,
          assetId: c.assetId ?? null,
          startMs: c.startMs,
          endMs: c.startMs + c.durationMs,
          durationMs: c.durationMs,
          text: c.text?.text ?? null,
          motion: c.motion ?? null,
          transitionIn: c.transitionIn ?? null,
          hidden: c.hidden ?? false,
        });
      }
    }
    const tcEl = document.querySelector('[data-testid="ve-playhead-timecode"]');
    const playheadMs = tcEl ? Number(tcEl.dataset.ms ?? 0) : 0;
    return {
      projectDurationMs: clips.reduce((m, c) => Math.max(m, c.endMs), 0),
      clipCount: clips.length,
      trackCount: p.tracks.length,
      trackIds: p.tracks.map((t) => t.id),
      selection: s.selection.clipIds,
      revision: s.revision,
      historyDepth: s.history.past.length,
      lastLabel: s.history.lastLabel,
      playheadMs,
      isPlaying: Boolean(document.querySelector('button[aria-label="Pause"]')),
      clips,
    };
  });
}

/**
 * Everything that must still be true after an edit that was only supposed to
 * change one clip's picture.
 */
export function compareModels(before, after, editedClipIds = []) {
  const problems = [];
  const edited = new Set(editedClipIds);
  const b = new Map(before.clips.map((c) => [c.id, c]));
  const a = new Map(after.clips.map((c) => [c.id, c]));

  if (after.trackCount !== before.trackCount) {
    problems.push(`track count ${before.trackCount} -> ${after.trackCount}`);
  }
  const ids = after.clips.map((c) => c.id);
  if (new Set(ids).size !== ids.length) problems.push("duplicate clip ids");

  for (const clip of after.clips) {
    if (![clip.startMs, clip.endMs, clip.durationMs].every(Number.isFinite)) {
      problems.push(`${clip.id} has NaN timing`);
    }
    if (clip.durationMs <= 0) problems.push(`${clip.id} has no duration`);
    const previous = b.get(clip.id);
    if (!previous) continue;
    if (previous.startMs !== clip.startMs || previous.durationMs !== clip.durationMs) {
      problems.push(
        `${clip.id} retimed ${previous.startMs}+${previous.durationMs} -> ${clip.startMs}+${clip.durationMs}`,
      );
    }
    if (previous.text !== clip.text) problems.push(`${clip.id} text changed`);
    if (!edited.has(clip.id) && previous.assetId !== clip.assetId) {
      problems.push(`${clip.id} asset changed but was not edited`);
    }
  }
  for (const id of b.keys()) if (!a.has(id)) problems.push(`${id} disappeared`);

  const byTrack = new Map();
  for (const clip of after.clips) {
    if (!byTrack.has(clip.track)) byTrack.set(clip.track, []);
    byTrack.get(clip.track).push(clip);
  }
  for (const [track, list] of byTrack) {
    const sorted = [...list].sort((x, y) => x.startMs - y.startMs);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].startMs < sorted[i - 1].endMs) {
        problems.push(`overlap on ${track}: ${sorted[i - 1].id}/${sorted[i].id}`);
      }
    }
  }
  return problems;
}

/** What playback did between two marks. */
export function analyse(trace, fromT, toT, label = "") {
  const frames = trace.frames.filter((f) => f.t >= fromT && f.t <= toT && f.tcMs !== null);
  const playheadFrames = frames.filter((f) => f.phMs !== null);
  const commits = trace.commits.filter((c) => c.t >= fromT && c.t <= toT);
  const longFrames = trace.longFrames.filter((l) => l.t >= fromT && l.t <= toT);

  const backward = (seq, key) => {
    let count = 0;
    let worst = 0;
    const examples = [];
    for (let i = 1; i < seq.length; i += 1) {
      const delta = seq[i][key] - seq[i - 1][key];
      if (delta < 0) {
        count += 1;
        worst = Math.min(worst, delta);
        if (examples.length < 6) {
          examples.push({ from: seq[i - 1][key], to: seq[i][key], dtMs: +(seq[i].t - seq[i - 1].t).toFixed(1) });
        }
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

  let bigJumps = 0;
  for (let i = 1; i < frames.length; i += 1) {
    if (frames[i].tcMs - frames[i - 1].tcMs - (frames[i].t - frames[i - 1].t) > 250) bigJumps += 1;
  }

  const first = frames[0] ?? {};
  const last = frames[frames.length - 1] ?? {};
  return {
    label,
    wallSeconds: +(wallMs / 1000).toFixed(2),
    editorSecondsAdvanced: +(editorMs / 1000).toFixed(2),
    clockRate: wallMs ? +(editorMs / wallMs).toFixed(4) : null,
    frames: frames.length,
    fps: wallMs ? +((frames.length / wallMs) * 1000).toFixed(1) : null,
    frameIntervalMs: {
      p50: pct(0.5),
      p95: pct(0.95),
      p99: pct(0.99),
      max: intervals.length ? +intervals[intervals.length - 1].toFixed(1) : null,
    },
    displayedBackward: backward(frames, "tcMs"),
    playheadBackward: backward(playheadFrames, "phMs"),
    maxTimecodeVsPlayheadMs: playheadFrames.reduce((m, f) => Math.max(m, Math.abs(f.phMs - f.tcMs)), 0),
    forwardJumpsOver250ms: bigJumps,
    audioStarts: (last.starts ?? 0) - (first.starts ?? 0),
    /** Nudges while an element was still opening — inaudible. */
    audioSettles: (last.settles ?? 0) - (first.settles ?? 0),
    /** Mid-line reseeks. These are the skips an operator hears. */
    audioCorrections: (last.corrections ?? 0) - (first.corrections ?? 0),
    reactCommits: commits.length,
    commitsPerSec: wallMs ? +((commits.length / wallMs) * 1000).toFixed(2) : null,
    fibersPerCommit: commits.length
      ? +(commits.reduce((a, c) => a + c.n, 0) / commits.length).toFixed(1)
      : null,
    longAnimationFrames: longFrames.length,
    longAnimationFrameMaxMs: longFrames.length ? +Math.max(...longFrames.map((l) => l.dur)).toFixed(1) : 0,
    samples: frames,
  };
}

/**
 * Is the narration the timeline says should be sounding the one that IS?
 *
 * Sampled from the recorded frames rather than asked once, because a
 * desynchronised editor is usually right at the moment you check it.
 */
export function narrationSyncProblems(samples, model, toleranceMs = 300) {
  const voice = model.clips.filter((c) => c.trackKind === "voice");
  let checked = 0;
  const problems = [];
  for (const sample of samples) {
    if (!sample.audio || sample.tcMs === null) continue;
    checked += 1;
    const clip = voice.find((c) => c.id === sample.audio.clipId);
    if (!clip) {
      problems.push(`${sample.audio.clipId} is sounding but is not on the voice track`);
      continue;
    }
    if (sample.tcMs < clip.startMs - toleranceMs || sample.tcMs > clip.endMs + toleranceMs) {
      problems.push(
        `${clip.id} sounding at ${sample.tcMs}ms, outside its ${clip.startMs}-${clip.endMs}ms window`,
      );
    }
  }
  return { checked, problems: problems.slice(0, 5), count: problems.length };
}

/* ── Driving the editor the way an operator does ──────────────────────────── */

export const openTool = (page, title) =>
  page.locator(`nav[aria-label="Editor tools"] button[title="${title}"]`).click();

export async function selectClip(page, model, clipId) {
  const clip = model.clips.find((c) => c.id === clipId);
  if (!clip) throw new Error(`no clip ${clipId}`);
  // By id, never by label: splitting a clip leaves two halves with the same
  // label, and selecting "the first one with that label" silently edits the
  // wrong half — which is exactly how a green test can accompany an editor
  // that did nothing.
  //
  // Scoped to the TIMELINE, because the canvas layers carry the same id and
  // sit earlier in the document; clicking one of those is intercepted by the
  // selection handles drawn over it.
  const locator = page
    .locator(`section[aria-label="Timeline"] [data-clip-id="${clipId}"]`)
    .first();
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ position: { x: 10, y: 12 } });
  await page.waitForTimeout(250);
  const selected = await page.evaluate(() => {
    const el = document.querySelector(
      'section[aria-label="Timeline"] [data-clip-id][aria-pressed="true"]',
    );
    return el ? el.getAttribute("data-clip-id") : null;
  });
  if (selected !== clipId) {
    throw new Error(`selected ${String(selected)} instead of ${clipId}`);
  }
}

/** Click a library tile (replace the selected clip's picture). */
export async function applyLibraryAsset(page, index = 0) {
  const tiles = page.locator('[data-testid="ve-library-asset"]');
  const tile = tiles.nth(index);
  const assetId = await tile.getAttribute("data-asset-id");
  await tile.click();
  await page.waitForTimeout(500);
  return assetId;
}

/** Click a library tile's "+" (add as a new clip at the playhead). */
export async function addLibraryAsset(page, index = 0) {
  const add = page.locator('[data-testid="ve-library-add"]').nth(index);
  const assetId = await add.getAttribute("data-asset-id");
  await add.click();
  await page.waitForTimeout(500);
  return assetId;
}

export const notice = (page) =>
  page
    .locator('[data-testid="ve-notice"]')
    .first()
    .textContent()
    .catch(() => null);

/* ── A tiny check harness, so every script reports the same way ───────────── */

export function harness(title) {
  let checks = 0;
  let failures = 0;
  const lines = [];
  process.stdout.write(`\n${title}\n`);
  return {
    async check(name, fn) {
      checks += 1;
      try {
        await fn();
        process.stdout.write(`  ok   ${name}\n`);
        lines.push({ name, ok: true });
      } catch (error) {
        failures += 1;
        process.stdout.write(`  FAIL ${name}\n       ${error.message}\n`);
        lines.push({ name, ok: false, error: error.message });
      }
    },
    assert(condition, message) {
      if (!condition) throw new Error(message);
    },
    finish(extra = "") {
      process.stdout.write(
        `\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}\n${extra}`,
      );
      return failures;
    },
    get results() {
      return lines;
    },
  };
}

/** The playback invariants every suite asserts, in one place. */
export function assertSmooth(assert, window_, opts = {}) {
  const { minRate = 0.93, maxRate = 1.07, allowCorrections = 0, minFps = 24 } = opts;
  assert(
    window_.displayedBackward.count === 0,
    `time moved BACKWARDS ${window_.displayedBackward.count} times (worst ${window_.displayedBackward.worstMs}ms): ${JSON.stringify(window_.displayedBackward.examples.slice(0, 3))}`,
  );
  assert(
    window_.playheadBackward.count === 0,
    `the timeline playhead moved backwards ${window_.playheadBackward.count} times`,
  );
  assert(
    window_.clockRate !== null && window_.clockRate >= minRate && window_.clockRate <= maxRate,
    `the clock ran at ${window_.clockRate}x wall time (expected ~1.0)`,
  );
  assert(
    window_.fps !== null && window_.fps >= minFps,
    `only ${window_.fps} frames per second`,
  );
  assert(
    window_.forwardJumpsOver250ms === 0,
    `${window_.forwardJumpsOver250ms} forward jumps over 250ms`,
  );
  assert(
    window_.audioCorrections <= allowCorrections,
    `the narration was dragged back ${window_.audioCorrections} times mid-line (audible skips); ${window_.audioSettles} settles at clip starts`,
  );
  assert(
    window_.audioSettles <= window_.audioStarts,
    `${window_.audioSettles} settles for only ${window_.audioStarts} clip starts — the engine is fighting the files`,
  );
  assert(
    window_.maxTimecodeVsPlayheadMs <= 40,
    `the timecode and the playhead disagreed by ${window_.maxTimecodeVsPlayheadMs}ms`,
  );
}
