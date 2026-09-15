/**
 * Video editor: timeline math, edit operations, history and reducer.
 *
 * ===================== WHY THIS EXISTS =====================
 * Everything an editor gets wrong is arithmetic that looks right on screen.
 * A trim that moves the start without advancing `trimInMs` shows the correct
 * duration and the wrong frames. A split that rounds to the nearest pixel
 * produces two clips whose lengths do not sum to the original. Undo after a
 * drag walks back through two hundred pointermove events. None of those are
 * visible in a screenshot, and all of them are provable here.
 *
 * These import the REAL shipped modules — Node 24 runs the `.ts` directly and
 * `video-editor-alias-hooks.mjs` resolves the `@/` alias — so this is the code
 * that ships, not a re-typed model of it.
 *
 * Run: node --import ./scripts/video-editor-register.mjs scripts/verify-video-editor.mjs
 * Or:  npm run verify:video-editor
 */
import assert from "node:assert/strict";

import {
  EDITOR_MIN_CLIP_MS,
  EDITOR_TRACK_KINDS,
  clampPxPerSec,
  clipEndMs,
  clipTransition,
  clipsOverlap,
  normalizeClip,
  formatRulerLabel,
  formatTimecode,
  isAudioTrackKind,
  msToPx,
  projectDurationMs,
  pxToMs,
  rulerStepMs,
  snapMs,
  snapTargetsMs,
  splitClipAt,
  trackAccepts,
  trimClip,
  visualClipsAt,
} from "@/shared/types/video-editor";

import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  sealHistory,
  undo,
} from "@/shared/lib/video-editor/history";

import {
  createEditorState,
  currentProject,
  editorReducer,
} from "@/shared/lib/video-editor/store";

import { PlaybackClock } from "@/shared/lib/video-editor/playback-clock";

import {
  clampMotion,
  easeAt,
  motionAt,
  presetMotion,
  sampleClip,
} from "@/shared/lib/video-editor/motion";

import { compositionAt } from "@/shared/lib/video-editor/composition";

import {
  assetPatchFor,
  placeNewImageClip,
  resolveAsset,
  timelineProblems,
} from "@/shared/lib/video-editor/media-insert";

import {
  RENDER_TRANSITION_MS,
  bakedPropertyCount,
  compileProjectToTimeline,
} from "@/shared/lib/video-editor/compile";

let failures = 0;
let checks = 0;

function check(name, fn) {
  checks += 1;
  try {
    fn();
    process.stdout.write(`  ok   ${name}\n`);
  } catch (error) {
    failures += 1;
    process.stdout.write(`  FAIL ${name}\n       ${error.message}\n`);
  }
}

function section(title) {
  process.stdout.write(`\n${title}\n`);
}

/** Deterministic ids, so assertions can name the clip they expect. */
function idFactory(prefix = "new") {
  let n = 0;
  return () => `${prefix}-${(n += 1)}`;
}

const clip = (over = {}) => ({
  id: "c1",
  kind: "image",
  label: "Condenser",
  startMs: 1000,
  durationMs: 4000,
  ...over,
});

function project(over = {}) {
  return {
    id: "p1",
    title: "Test",
    width: 1920,
    height: 1080,
    fps: 30,
    version: 1,
    tracks: [
      { id: "t-video", kind: "video", name: "VIDEO 1", clips: [clip()] },
      { id: "t-text", kind: "text", name: "TEXT", clips: [] },
      { id: "t-voice", kind: "voice", name: "VOICEOVER", clips: [] },
    ],
    ...over,
  };
}

/* ══════════════════════════════════ math ═══════════════════════════════════ */

section("Timeline math");

check("px and ms are exact inverses", () => {
  for (const pxPerSec of [2, 17, 60, 400]) {
    for (const ms of [0, 1, 999, 5000, 138_630]) {
      const round = pxToMs(msToPx(ms, pxPerSec), pxPerSec);
      assert.ok(
        Math.abs(round - ms) < 1e-6,
        `${ms}ms at ${pxPerSec}px/s round-tripped to ${round}`,
      );
    }
  }
});

check("zoom clamps to a usable range and survives garbage", () => {
  assert.equal(clampPxPerSec(1), 2);
  assert.equal(clampPxPerSec(10_000), 400);
  assert.equal(clampPxPerSec(60), 60);
  assert.equal(clampPxPerSec(Number.NaN), 60);
  assert.equal(clampPxPerSec(Number.POSITIVE_INFINITY), 60);
});

check("ruler step always leaves room for its label", () => {
  for (const pxPerSec of [2, 5, 12, 60, 120, 400]) {
    const step = rulerStepMs(pxPerSec, 64);
    assert.ok(
      msToPx(step, pxPerSec) >= 64,
      `at ${pxPerSec}px/s the ${step}ms step is only ${msToPx(step, pxPerSec)}px`,
    );
  }
});

check("timecode and ruler labels format", () => {
  assert.equal(formatTimecode(0), "00:00.00");
  assert.equal(formatTimecode(65_432), "01:05.43");
  assert.equal(formatTimecode(-50), "00:00.00");
  assert.equal(formatRulerLabel(65_432), "1:05");
});

check("project duration counts hidden tracks", () => {
  const p = project({
    tracks: [
      { id: "a", kind: "video", name: "V", clips: [clip({ startMs: 0, durationMs: 2000 })] },
      {
        id: "b",
        kind: "overlay",
        name: "O",
        hidden: true,
        clips: [clip({ id: "c2", startMs: 5000, durationMs: 3000 })],
      },
    ],
  });
  assert.equal(
    projectDurationMs(p),
    8000,
    "hiding a track must not silently truncate the render",
  );
});

check("overlap excludes exact end-to-start abutment", () => {
  const a = clip({ startMs: 0, durationMs: 1000 });
  const b = clip({ id: "c2", startMs: 1000, durationMs: 1000 });
  assert.equal(clipsOverlap(a, b), false);
  assert.equal(clipsOverlap(a, { ...b, startMs: 999 }), true);
});

check("visual hit-testing respects z-order and hidden tracks", () => {
  const p = project({
    tracks: [
      { id: "a", kind: "video", name: "V", clips: [clip({ startMs: 0, durationMs: 5000 })] },
      { id: "b", kind: "overlay", name: "O", clips: [clip({ id: "c2", startMs: 0, durationMs: 5000 })] },
      { id: "c", kind: "voice", name: "VO", clips: [clip({ id: "c3", kind: "audio", startMs: 0, durationMs: 5000 })] },
    ],
  });
  const hits = visualClipsAt(p, 1000);
  assert.equal(hits.length, 2, "audio must not appear in visual hits");
  assert.equal(
    hits[hits.length - 1].track.kind,
    "overlay",
    "overlay must sort above video — it paints last",
  );
  assert.equal(visualClipsAt(p, 5000).length, 0, "clip end is exclusive");
});

check("track kind order is the documented z-order", () => {
  assert.ok(
    EDITOR_TRACK_KINDS.indexOf("overlay") > EDITOR_TRACK_KINDS.indexOf("video"),
  );
  assert.ok(
    EDITOR_TRACK_KINDS.indexOf("text") > EDITOR_TRACK_KINDS.indexOf("graphics"),
  );
  assert.equal(isAudioTrackKind("voice"), true);
  assert.equal(isAudioTrackKind("graphics"), false);
});

check("tracks reject clip kinds they cannot hold", () => {
  assert.equal(trackAccepts("voice", "audio"), true);
  assert.equal(trackAccepts("voice", "image"), false);
  assert.equal(trackAccepts("caption", "caption"), true);
  assert.equal(trackAccepts("caption", "text"), false);
  assert.equal(trackAccepts("video", "codeAnimation"), true);
});

/* ═══════════════════════════════ snapping ══════════════════════════════════ */

section("Snapping");

check("snap targets include cross-track edges but not the dragged clip", () => {
  const p = project({
    tracks: [
      { id: "a", kind: "video", name: "V", clips: [clip({ id: "x", startMs: 1000, durationMs: 2000 })] },
      { id: "b", kind: "text", name: "T", clips: [clip({ id: "y", kind: "text", startMs: 7000, durationMs: 1000 })] },
    ],
  });
  const targets = snapTargetsMs(p, { excludeClipId: "x", playheadMs: 500 });
  assert.ok(targets.includes(0), "zero is always a target");
  assert.ok(targets.includes(500), "playhead is a target");
  assert.ok(targets.includes(7000) && targets.includes(8000), "cross-track edges");
  assert.ok(!targets.includes(3000), "the dragged clip's own end must be excluded");
});

check("snap picks the nearest target inside tolerance, else leaves value alone", () => {
  const targets = [0, 1000, 5000];
  assert.equal(snapMs(1040, targets, 100), 1000);
  assert.equal(snapMs(1400, targets, 100), 1400, "outside tolerance is untouched");
  assert.equal(snapMs(900, targets, 200), 1000);
});

/* ═══════════════════════════ edit operations ═══════════════════════════════ */

section("Edit operations");

check("split halves sum to the original duration", () => {
  const c = clip({ startMs: 1000, durationMs: 4000 });
  const [left, right] = splitClipAt(c, 3000, idFactory());
  assert.equal(left.durationMs + right.durationMs, c.durationMs);
  assert.equal(left.startMs, 1000);
  assert.equal(right.startMs, 3000);
  assert.equal(clipEndMs(right), clipEndMs(c));
});

check("split advances trimIn so the right half shows the right frames", () => {
  const c = clip({ startMs: 1000, durationMs: 4000, trimInMs: 500 });
  const [, right] = splitClipAt(c, 3000, idFactory());
  assert.equal(
    right.trimInMs,
    2500,
    "500ms existing trim + 2000ms consumed by the left half",
  );
});

check("split drops the dissolve on the right half", () => {
  const c = clip({ startMs: 0, durationMs: 4000, transitionInMs: 500 });
  const [left, right] = splitClipAt(c, 2000, idFactory());
  assert.equal(left.transitionInMs, 500);
  assert.equal(right.transitionInMs, undefined, "a mid-shot cut must not re-run the dissolve");
});

check("split refuses to make unusable slivers", () => {
  const c = clip({ startMs: 1000, durationMs: 4000 });
  assert.equal(splitClipAt(c, 1000, idFactory()), null, "at the head");
  assert.equal(splitClipAt(c, 5000, idFactory()), null, "at the tail");
  assert.equal(splitClipAt(c, 1010, idFactory()), null, `within ${EDITOR_MIN_CLIP_MS}ms of the head`);
  assert.equal(splitClipAt(c, 500, idFactory()), null, "outside the clip");
  assert.ok(splitClipAt(c, 1200, idFactory()), "comfortably inside is fine");
});

check("trimming the right edge changes only duration", () => {
  const c = clip({ startMs: 1000, durationMs: 4000 });
  const t = trimClip(c, "end", 3000);
  assert.equal(t.startMs, 1000);
  assert.equal(t.durationMs, 2000);
  assert.equal(t.trimInMs, undefined);
});

check("trimming the left edge pulls trimIn with it", () => {
  const c = clip({ startMs: 1000, durationMs: 4000, trimInMs: 0 });
  const t = trimClip(c, "start", 2500);
  assert.equal(t.startMs, 2500);
  assert.equal(t.durationMs, 2500, "duration shrinks by the same 1500ms");
  assert.equal(t.trimInMs, 1500, "source offset advances so the frame does not jump");
  assert.equal(clipEndMs(t), clipEndMs(c), "the out point must not move");
});

check("trim cannot invert a clip or push it below zero", () => {
  const c = clip({ startMs: 1000, durationMs: 4000 });
  const past = trimClip(c, "start", 9999);
  assert.ok(past.durationMs >= EDITOR_MIN_CLIP_MS);
  assert.equal(clipEndMs(past), 5000);
  const negative = trimClip(clip({ startMs: 200, durationMs: 4000 }), "start", -5000);
  assert.equal(negative.startMs, 0);
  const short = trimClip(c, "end", -100);
  assert.equal(short.durationMs, EDITOR_MIN_CLIP_MS);
});

/* ════════════════════════════════ history ══════════════════════════════════ */

section("History");

check("undo and redo walk the stack", () => {
  let h = createHistory("a");
  h = commit(h, "b", "to b");
  h = commit(h, "c", "to c");
  assert.equal(h.present, "c");
  h = undo(h);
  assert.equal(h.present, "b");
  h = undo(h);
  assert.equal(h.present, "a");
  assert.equal(canUndo(h), false);
  h = redo(h);
  assert.equal(h.present, "b");
  h = redo(h);
  assert.equal(h.present, "c");
  assert.equal(canRedo(h), false);
});

check("one gesture is one undo step", () => {
  let h = createHistory({ x: 0 });
  for (let i = 1; i <= 200; i += 1) {
    h = commit(h, { x: i }, "Move clip", "move:c1");
  }
  assert.equal(h.present.x, 200);
  assert.equal(h.past.length, 1, "200 pointermoves must collapse to one entry");
  h = undo(h);
  assert.equal(h.present.x, 0, "undo returns to before the whole drag");
});

check("sealing ends the gesture so the next drag is its own step", () => {
  let h = createHistory({ x: 0 });
  h = commit(h, { x: 1 }, "Move", "move:c1");
  h = commit(h, { x: 2 }, "Move", "move:c1");
  h = sealHistory(h);
  h = commit(h, { x: 3 }, "Move", "move:c1");
  assert.equal(h.past.length, 2, "two drags, two undo steps");
  h = undo(h);
  assert.equal(h.present.x, 2);
});

check("a new commit clears the redo branch", () => {
  let h = createHistory("a");
  h = commit(h, "b", "b");
  h = undo(h);
  assert.equal(canRedo(h), true);
  h = commit(h, "c", "c");
  assert.equal(canRedo(h), false);
});

check("committing an identical state is a no-op", () => {
  const state = { x: 1 };
  let h = createHistory(state);
  h = commit(h, state, "same");
  assert.equal(h.past.length, 0);
});

/* ════════════════════════════════ reducer ══════════════════════════════════ */

section("Reducer");

const run = (state, action, ids = idFactory()) =>
  editorReducer(state, action, ids);

check("playback state is not in the reducer", () => {
  const s = createEditorState(project());
  assert.equal("playheadMs" in s, false, "time belongs to PlaybackClock");
  assert.equal("isPlaying" in s, false);
  assert.equal(run(s, { type: "seek", ms: 1000 }), s, "a seek is not a reducer action");
});

check("split at the given instant produces two clips and selects both", () => {
  let s = createEditorState(project());
  s = run(s, { type: "select", clipId: "c1" });
  s = run(s, { type: "splitSelected", atMs: 3000 }, idFactory("half"));
  const p = currentProject(s);
  assert.equal(p.tracks[0].clips.length, 2);
  assert.equal(s.selection.clipIds.length, 2);
});

check("delete removes the clip and clears selection", () => {
  let s = createEditorState(project());
  s = run(s, { type: "select", clipId: "c1" });
  s = run(s, { type: "deleteSelected" });
  assert.equal(currentProject(s).tracks[0].clips.length, 0);
  assert.equal(s.selection.clipIds.length, 0);
});

check("undo restores a deleted clip", () => {
  let s = createEditorState(project());
  s = run(s, { type: "select", clipId: "c1" });
  s = run(s, { type: "deleteSelected" });
  s = run(s, { type: "undo" });
  assert.equal(currentProject(s).tracks[0].clips.length, 1);
  s = run(s, { type: "redo" });
  assert.equal(currentProject(s).tracks[0].clips.length, 0);
});

check("locked tracks reject every mutation", () => {
  const p = project();
  const locked = {
    ...p,
    tracks: p.tracks.map((t) => (t.id === "t-video" ? { ...t, locked: true } : t)),
  };
  let s = createEditorState(locked);
  s = run(s, { type: "select", clipId: "c1" });
  const before = currentProject(s);
  s = run(s, { type: "moveClip", clipId: "c1", startMs: 9000 });
  s = run(s, { type: "deleteSelected" });
  s = run(s, { type: "trimClip", clipId: "c1", edge: "end", ms: 2000 });
  assert.equal(currentProject(s), before, "nothing may change on a locked track");
});

check("a clip cannot move to a track that does not accept its kind", () => {
  let s = createEditorState(project());
  const before = currentProject(s);
  s = run(s, { type: "moveClipToTrack", clipId: "c1", trackId: "t-voice" });
  assert.equal(currentProject(s), before, "an image must not land on VOICEOVER");
  s = run(s, { type: "moveClipToTrack", clipId: "c1", trackId: "t-nonexistent" });
  assert.equal(currentProject(s), before);
});

check("dragging emits one undo step, then endGesture starts the next", () => {
  let s = createEditorState(project());
  for (let ms = 1000; ms <= 2000; ms += 10) {
    s = run(s, { type: "moveClip", clipId: "c1", startMs: ms });
  }
  assert.equal(s.history.past.length, 1);
  s = run(s, { type: "endGesture" });
  s = run(s, { type: "moveClip", clipId: "c1", startMs: 3000 });
  assert.equal(s.history.past.length, 2);
});

check("undo does not change the zoom", () => {
  let s = createEditorState(project());
  s = run(s, { type: "setPxPerSec", pxPerSec: 120 });
  s = run(s, { type: "select", clipId: "c1" });
  s = run(s, { type: "deleteSelected" });
  s = run(s, { type: "undo" });
  assert.equal(s.pxPerSec, 120, "undo must not scroll you away from the edit");
});

check("loading a stored project is not an undoable edit", () => {
  let s = createEditorState(project());
  const stored = { ...project(), title: "restored" };
  s = run(s, { type: "loadProject", project: stored });
  assert.equal(currentProject(s).title, "restored");
  assert.equal(canUndo(s.history), false, "Ctrl+Z must not discard a restored autosave");
  assert.equal(s.revision, 0, "a restore is not unsaved work");
});

check("duplicate lands immediately after the original", () => {
  let s = createEditorState(project());
  s = run(s, { type: "select", clipId: "c1" });
  s = run(s, { type: "duplicateSelected" }, idFactory("dup"));
  const clips = currentProject(s).tracks[0].clips;
  assert.equal(clips.length, 2);
  const copy = clips.find((c) => c.id === "dup-1");
  assert.equal(copy.startMs, 5000, "starts where the original ends");
});

check("copy then paste places at the playhead", () => {
  let s = createEditorState(project());
  s = run(s, { type: "select", clipId: "c1" });
  s = run(s, { type: "copySelected" });
  s = run(s, { type: "paste", atMs: 4000 }, idFactory("pasted"));
  const pasted = currentProject(s).tracks[0].clips.find((c) => c.id === "pasted-1");
  assert.equal(pasted.startMs, 4000);
});

check("revision advances only on project change", () => {
  let s = createEditorState(project());
  const r0 = s.revision;
  s = run(s, { type: "select", clipId: "c1" });
  s = run(s, { type: "setPxPerSec", pxPerSec: 90 });
  assert.equal(s.revision, r0, "selecting and zooming are not edits");
  s = run(s, { type: "deleteSelected" });
  assert.equal(s.revision, r0 + 1);
});
/* ═════════════════════════════ playback clock ══════════════════════════════ */

section("Playback clock");

/**
 * A clock driven by a fake `now` and a manual frame scheduler, so the exact
 * frame pattern that broke the old implementation can be replayed on demand:
 * irregular deltas, long frames, and several frames with no React commit in
 * between.
 */
function fakeClock(durationMs = 10_000) {
  let now = 1000;
  let pending = [];
  const clock = new PlaybackClock({
    durationMs,
    now: () => now,
    scheduler: {
      request: (cb) => {
        pending.push(cb);
        return pending.length;
      },
      cancel: () => {
        pending = [];
      },
    },
  });
  /** Advance wall time by `ms` and run the frame callbacks that were due. */
  const frame = (ms) => {
    now += ms;
    const due = pending;
    pending = [];
    for (const cb of due) cb();
  };
  return { clock, frame };
}

check("playing advances at wall-clock speed", () => {
  const { clock, frame } = fakeClock();
  clock.play();
  for (let i = 0; i < 10; i += 1) frame(16);
  assert.equal(clock.getTime(), 160, "160ms of wall time is 160ms of film");
});

check("time never moves backwards under irregular and long frames", () => {
  const { clock, frame } = fakeClock(60_000);
  const seen = [];
  clock.subscribeFrame((t) => seen.push(t));
  clock.play();
  // The measured pattern from the real failure: normal frames, a 450ms stall,
  // then normal frames again.
  for (const delta of [16, 17, 16, 450, 16, 4, 33, 16, 120, 16, 16, 8, 16]) {
    frame(delta);
  }
  for (let i = 1; i < seen.length; i += 1) {
    assert.ok(
      seen[i] >= seen[i - 1],
      `frame ${i} went backwards: ${seen[i - 1]} -> ${seen[i]}`,
    );
  }
  assert.equal(seen[seen.length - 1], 744, "and it loses no time either");
});

check("two frames with no commit in between still advance", () => {
  // The old clock added its delta to a value React had not yet written back,
  // so the second of two closely-spaced frames stepped backwards. Time is now
  // derived from the anchor, so nothing can be stale.
  const { clock, frame } = fakeClock();
  clock.play();
  frame(16);
  const first = clock.getTime();
  frame(1);
  assert.ok(clock.getTime() > first, "the second frame must still be later");
});

check("rate changes speed without moving the playhead", () => {
  const { clock, frame } = fakeClock();
  clock.play();
  frame(100);
  clock.setRate(2);
  assert.equal(clock.getTime(), 100, "changing speed is not a jump");
  frame(100);
  assert.equal(clock.getTime(), 300, "2x covers 200ms of film in 100ms");
});

check("pause parks the playhead and play resumes from it", () => {
  const { clock, frame } = fakeClock();
  clock.play();
  frame(500);
  clock.pause();
  const parked = clock.getTime();
  frame(5000); // wall time passes while paused
  assert.equal(clock.getTime(), parked, "a paused clock does not drift");
  clock.play();
  frame(100);
  assert.equal(clock.getTime(), parked + 100);
});

check("seek clamps to the project", () => {
  const { clock } = fakeClock(5000);
  clock.seek(999_999);
  assert.equal(clock.getTime(), 5000);
  clock.seek(-100);
  assert.equal(clock.getTime(), 0);
  clock.seek(Number.NaN);
  assert.equal(clock.getTime(), 0, "a NaN seek must not poison the clock");
});

check("reaching the end stops, and play starts again from the top", () => {
  const { clock, frame } = fakeClock(1000);
  clock.play();
  frame(900);
  frame(200);
  assert.equal(clock.isPlaying(), false, "playback stops at the end");
  assert.equal(clock.getTime(), 1000, "and parks exactly there");
  clock.play();
  assert.equal(clock.getTime(), 0, "pressing play at the end restarts");
});

check("shortening the project pulls a parked playhead back", () => {
  const { clock } = fakeClock(10_000);
  clock.seek(9000);
  clock.setDuration(4000);
  assert.equal(clock.getTime(), 4000);
});

check("a frame step pauses and moves exactly one frame", () => {
  const { clock, frame } = fakeClock();
  clock.play();
  frame(100);
  clock.step(1000 / 30);
  assert.equal(clock.isPlaying(), false, "stepping stops playback");
  assert.ok(Math.abs(clock.getTime() - (100 + 1000 / 30)) < 0.001);
});

check("transport state is published, but never per frame", () => {
  const { clock, frame } = fakeClock();
  let states = 0;
  let frames = 0;
  clock.subscribeState(() => {
    states += 1;
  });
  clock.subscribeFrame(() => {
    frames += 1;
  });
  clock.play();
  for (let i = 0; i < 60; i += 1) frame(16);
  assert.equal(states, 1, "play is one state change; 60 frames are none");
  assert.equal(frames, 61, "the frame subscriber sees every frame");
});

check("one broken subscriber does not stop the clock", () => {
  const { clock, frame } = fakeClock();
  let good = 0;
  clock.subscribeFrame(() => {
    throw new Error("waveform exploded");
  });
  clock.subscribeFrame(() => {
    good += 1;
  });
  clock.play();
  frame(16);
  assert.ok(good >= 1, "the narration must still be scheduled");
  assert.equal(clock.isPlaying(), true);
});

/* ═══════════════════════════════ compiler ═════════════════════════════════ */

section("Compiler (editor project -> renderer Timeline)");

/** Two abutting clips, each comfortably longer than the crossfade. */
function compilable(extraTracks = []) {
  return {
    id: "p",
    title: "Compilable",
    width: 1920,
    height: 1080,
    fps: 30,
    version: 1,
    tracks: [
      {
        id: "t-video",
        kind: "video",
        name: "VIDEO 1",
        clips: [
          { id: "a", kind: "slide", assetId: "slide-a", label: "A", startMs: 0, durationMs: 4000 },
          { id: "b", kind: "slide", assetId: "slide-b", label: "B", startMs: 4000, durationMs: 4000 },
        ],
      },
      ...extraTracks,
    ],
  };
}

check("a clean two-clip project compiles with no errors", () => {
  const r = compileProjectToTimeline(compilable());
  assert.deepEqual(r.errors, [], `errors: ${r.errors.join("; ")}`);
  assert.equal(r.timeline.entries.length, 2);
  assert.equal(r.timeline.entries[0].startMs, 0);
  assert.equal(r.timeline.entries[0].endMs, 4000);
  assert.equal(r.timeline.entries[1].screenshotPath, "slide-b");
});

check("entries are contiguous and indexed from zero", () => {
  const r = compileProjectToTimeline(compilable());
  r.timeline.entries.forEach((e, i) => {
    assert.equal(e.stepIndex, i);
    if (i > 0) assert.equal(e.startMs, r.timeline.entries[i - 1].endMs);
  });
});

check("output length equals the timeline, because transitions hold in place", () => {
  // The old global crossfade overlapped neighbours, so the master came out
  // (n-1) x 260ms shorter than the timeline and no editor clock could agree
  // with it. A transition now holds the outgoing frame instead.
  const r = compileProjectToTimeline(compilable());
  assert.equal(r.expectedOutputMs, 8000);
});

check("a gap at the head is a blocking error, not a silent desync", () => {
  const p = compilable();
  const shifted = {
    ...p,
    tracks: p.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => ({ ...c, startMs: c.startMs + 1000 })),
    })),
  };
  const r = compileProjectToTimeline(shifted);
  assert.ok(
    r.errors.some((e) => /startMs === 0/.test(e)),
    `expected a head-gap error, got: ${r.errors.join("; ")}`,
  );
});

check("an entry shorter than its own transition is refused", () => {
  const p = compilable();
  const tiny = {
    ...p,
    tracks: p.tracks.map((t) =>
      t.id === "t-video"
        ? {
            ...t,
            clips: [
              t.clips[0],
              // A 300ms shot cannot carry a 600ms dissolve INTO it: the
              // transition would still be running when the shot ended.
              {
                ...t.clips[1],
                durationMs: 300,
                transitionIn: { kind: "crossfade", durationMs: 600 },
              },
            ],
          }
        : t,
    ),
  };
  const r = compileProjectToTimeline(tiny);
  assert.ok(
    r.errors.some((e) => /transition/.test(e)),
    `expected a transition-length error, got: ${r.errors.join("; ")}`,
  );
});

check("a hard cut is allowed to be short", () => {
  // The old floor was global: every entry had to outlast a 260ms crossfade it
  // might not even have. A cut needs no room to dissolve into.
  const p = compilable();
  const short = {
    ...p,
    tracks: p.tracks.map((t) =>
      t.id === "t-video"
        ? {
            ...t,
            clips: [
              { ...t.clips[0], durationMs: 200 },
              { ...t.clips[1], startMs: 200 },
            ],
          }
        : t,
    ),
  };
  assert.deepEqual(compileProjectToTimeline(short).errors, []);
});

check("a camera move compiles to a per-entry spec", () => {
  const p = compilable();
  const moving = {
    ...p,
    tracks: p.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c, i) =>
        i === 0 ? { ...c, motion: presetMotion("pushIn", 1) } : c,
      ),
    })),
  };
  const r = compileProjectToTimeline(moving);
  const entry = r.timeline.entries[0];
  assert.ok(entry.cameraMotion, "the move must reach the renderer");
  assert.equal(entry.cameraMotion.startScale, 1);
  assert.ok(entry.cameraMotion.endScale > 1.1);
  assert.equal(entry.cameraMotion.progressStart, 0);
  assert.equal(entry.cameraMotion.progressEnd, 1);
  assert.ok(
    r.nativeProperties.some((n) => n === "a:motion"),
    "a move the graph renders is native, not dropped and not baked",
  );
  assert.equal(r.bakePlan.scenes.length, 0, "a move must not force a bake");
});

check("transitions compile per cut, and never onto the first shot", () => {
  const p = compilable();
  const withTransitions = {
    ...p,
    tracks: p.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => ({
        ...c,
        transitionIn: { kind: "crossfade", durationMs: 400 },
      })),
    })),
  };
  const r = compileProjectToTimeline(withTransitions);
  assert.equal(r.timeline.entries[0].transitionIn, undefined, "nothing precedes the first shot");
  assert.equal(r.timeline.entries[1].transitionIn.kind, "crossfade");
  assert.equal(r.timeline.entries[1].transitionIn.durationMs, 400);
  assert.ok(
    r.drops.some((d) => d.property === "transitionIn"),
    "a transition on the first shot is reported rather than silently ignored",
  );
  assert.equal(r.expectedOutputMs, 8000, "a transition does not shorten the film");
});

check("splitting a dissolved shot does not dissolve it into itself", () => {
  const clip = {
    id: "c",
    kind: "image",
    label: "Shot",
    startMs: 0,
    durationMs: 4000,
    transitionIn: { kind: "crossfade", durationMs: 400 },
  };
  const [left, right] = splitClipAt(clip, 2000, () => "right");
  assert.deepEqual(left.transitionIn, clip.transitionIn, "the head keeps its dissolve");
  assert.equal(right.transitionIn, undefined, "the tail begins mid-shot: no dissolve");
  assert.equal(right.transitionInMs, undefined);
});

check("an old project's dissolve length is read as a crossfade", () => {
  const clip = normalizeClip({
    id: "x",
    kind: "image",
    label: "X",
    startMs: 0,
    durationMs: 4000,
    transitionInMs: 260,
  });
  assert.equal(clipTransition(clip).kind, "crossfade");
  assert.equal(clipTransition(clip).durationMs, 260);
});

const overlaid = () =>
  compilable([
    {
      id: "t-overlay",
      kind: "overlay",
      name: "OVERLAY",
      clips: [
        { id: "o", kind: "image", assetId: "logo", label: "Logo", startMs: 1000, durationMs: 2000 },
      ],
    },
  ]);

check("overlapping layers become a bake scene, not a drop", () => {
  const r = compileProjectToTimeline(overlaid());
  assert.equal(
    r.drops.filter((d) => /layer under/.test(d.property)).length,
    0,
    "with baking on, an overlap is composited rather than lost",
  );
  const scene = r.bakePlan.scenes.find(
    (sc) => sc.startMs === 1000 && sc.endMs === 3000,
  );
  assert.ok(scene, "no bake scene for the overlap span");
  assert.equal(scene.layers.length, 2, "both layers must reach the compositor");
  assert.equal(
    scene.layers[scene.layers.length - 1].clipId,
    "o",
    "the overlay must be the top layer",
  );
  assert.ok(scene.reasons.some((x) => /overlapping/.test(x)));

  // The entry now points at the composited frame, not at either source.
  const entry = r.timeline.entries.find(
    (e) => e.startMs === 1000 && e.endMs === 3000,
  );
  assert.equal(entry.screenshotPath, scene.outputName);
});

check("with baking disabled the overlap IS a drop", () => {
  const r = compileProjectToTimeline(overlaid(), { bake: false });
  assert.ok(
    r.drops.some((d) => /layer under/.test(d.property)),
    "a caller that cannot composite must be told what it loses",
  );
  assert.equal(r.bakePlan.scenes.length, 0);
});

check("a clip cut into several entries continues its move", () => {
  // An overlay slices the shot underneath. Each piece must carry its own slice
  // of the same move, or the camera restarts mid-shot.
  const p = overlaid();
  const moving = {
    ...p,
    tracks: p.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) =>
        c.id === "a" ? { ...c, motion: presetMotion("pushIn", 1) } : c,
      ),
    })),
  };
  const r = compileProjectToTimeline(moving);
  const fromA = r.timeline.entries.filter((e) => e.startMs < 4000);
  assert.ok(fromA.length >= 2, "the overlay should have split clip A");
  assert.equal(fromA[0].cameraMotion.progressStart, 0);
  assert.equal(fromA[0].cameraMotion.progressEnd, 0.25, "1000ms of a 4000ms clip");
  // The slice that is composited with the overlay cannot move, and says so.
  assert.ok(
    r.drops.some((d) => d.property === "motion"),
    "motion on a baked scene must be reported, not silently still",
  );
});

const decorated = () => {
  const p = compilable();
  return {
    ...p,
    tracks: p.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c, i) =>
        i === 0
          ? {
              ...c,
              transform: { scale: 1.5, x: 40, rotation: 10, opacity: 0.5 },
              audio: { volume: 0.5, fadeInMs: 200 },
            }
          : c,
      ),
    })),
  };
};

check("rotation and opacity are baked; audio properties still drop", () => {
  const r = compileProjectToTimeline(decorated());
  for (const property of ["rotation", "opacity"]) {
    assert.ok(
      r.bakedProperties.some((b) => b.endsWith(`:${property}`)),
      `${property} should be baked, not lost`,
    );
    assert.ok(
      !r.drops.some((d) => d.property === `transform.${property}`),
      `${property} must not ALSO be reported as dropped`,
    );
  }
  // Audio has no compositing escape hatch: the bake paints pictures.
  assert.ok(r.drops.some((d) => d.property === "audio.volume"));
  assert.ok(r.drops.some((d) => d.property === "audio.fade"));
  assert.ok(bakedPropertyCount(r) > 0);
});

check("framing is rendered natively rather than baked", () => {
  // Scale and position used to force a bake, which is why a "push in" arrived
  // in the master as a static crop: a baked PNG is one picture.
  const p = compilable();
  const framed = {
    ...p,
    tracks: p.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c, i) =>
        i === 0 ? { ...c, transform: { scale: 1.25, x: 40 } } : c,
      ),
    })),
  };
  const r = compileProjectToTimeline(framed);
  assert.equal(r.bakePlan.scenes.length, 0, "framing alone must not bake");
  assert.ok(r.nativeProperties.includes("a:scale"));
  assert.ok(r.nativeProperties.includes("a:position"));
  const entry = r.timeline.entries[0];
  assert.equal(entry.cameraMotion.startScale, 1.25, "the framing is the camera");
  assert.equal(entry.cameraMotion.endScale, 1.25, "and it does not move");
  assert.ok(
    Math.abs(entry.cameraMotion.startX - 40 / 1920) < 1e-9,
    "position is carried as a fraction of the frame",
  );
});

check("no property vanishes from EVERY list", () => {
  // The invariant the whole honesty argument rests on: every non-default
  // property is rendered natively, baked, or reported — never none of them.
  const r = compileProjectToTimeline(decorated());
  const accounted = new Set([
    ...r.bakedProperties.map((b) => b.split(":")[1]),
    ...r.nativeProperties.map((n) => n.split(":")[1]),
    ...r.drops.map((d) => d.property.replace(/^transform[.]/, "")),
  ]);
  for (const property of ["scale", "position", "rotation", "opacity"]) {
    assert.ok(accounted.has(property), `${property} is unaccounted for`);
  }
});

check("every drop names its clip and its reason", () => {
  for (const drop of compileProjectToTimeline(decorated()).drops) {
    assert.ok(drop.clipId && drop.clipLabel && drop.reason, "drop is incomplete");
  }
});

check("a plain project needs no bake scenes at all", () => {
  const r = compileProjectToTimeline(compilable());
  assert.equal(
    r.bakePlan.scenes.length,
    0,
    "baking untransformed single-layer frames would be wasted Playwright time",
  );
  assert.equal(r.timeline.entries[0].screenshotPath, "slide-a");
});

check("hidden tracks do not contribute entries", () => {
  const p = compilable([
    {
      id: "t-overlay",
      kind: "overlay",
      name: "OVERLAY",
      hidden: true,
      clips: [
        { id: "o", kind: "image", assetId: "logo", label: "Logo", startMs: 1000, durationMs: 2000 },
      ],
    },
  ]);
  const r = compileProjectToTimeline(p);
  assert.ok(
    !r.timeline.entries.some((e) => e.screenshotPath === "logo"),
    "a hidden track must not reach the renderer",
  );
});

const { loadDemoEpisode } = await import("@/shared/lib/video-editor/demo-project");
check("the real EP01 project compiles without blocking errors", () => {
  const { project } = loadDemoEpisode();
  const r = compileProjectToTimeline(project);
  assert.equal(
    r.errors.length,
    0,
    `EP01 does not compile: ${r.errors.slice(0, 3).join("; ")}`,
  );
  assert.ok(
    r.timeline.entries.length >= 20,
    `only ${r.timeline.entries.length} entries`,
  );
});



/* ═════════════════════════ camera motion ═══════════════════════════════════ */

section("Camera motion");

check("easings are the formulas the renderer can also evaluate", () => {
  for (const easing of ["linear", "easeIn", "easeOut", "easeInOut"]) {
    assert.equal(easeAt(easing, 0), 0, `${easing} must start at 0`);
    assert.equal(easeAt(easing, 1), 1, `${easing} must end at 1`);
    // Monotonic, or a "smooth" move would go backwards mid-shot.
    let previous = -1;
    for (let p = 0; p <= 1.0001; p += 0.05) {
      const v = easeAt(easing, p);
      assert.ok(v >= previous - 1e-9, `${easing} is not monotonic at ${p}`);
      previous = v;
    }
  }
  assert.equal(easeAt("easeInOut", 0.5), 0.5);
  assert.equal(easeAt("easeIn", 0.5), 0.25);
});

check("a move is clamped inside the frame, so no edge goes black", () => {
  for (const preset of ["pushIn", "pullOut", "panLeft", "panRight", "panUp", "panDown", "slowZoom", "kenBurns"]) {
    for (const intensity of [0.25, 1, 2, 3]) {
      const m = presetMotion(preset, intensity);
      for (const p of [0, 0.25, 0.5, 0.75, 1]) {
        const s = motionAt(m, p);
        const limit = (s.scale - 1) / 2 + 1e-9;
        assert.ok(s.scale >= 1, `${preset}@${intensity} scaled below the frame`);
        assert.ok(
          Math.abs(s.x) <= limit && Math.abs(s.y) <= limit,
          `${preset}@${intensity} travels off the picture at p=${p}`,
        );
      }
    }
  }
});

check("an out-of-range move is pulled back rather than rendered black", () => {
  const clamped = clampMotion({
    preset: "panLeft",
    startScale: 1,
    endScale: 1,
    startX: 0.4,
    startY: 0,
    endX: -0.4,
    endY: 0,
    easing: "linear",
  });
  assert.equal(clamped.startX, 0, "at scale 1 there is no overflow to pan into");
});

check("a preset moves the picture, and 'none' does not", () => {
  const push = presetMotion("pushIn", 1);
  assert.ok(motionAt(push, 1).scale > motionAt(push, 0).scale);
  const pan = presetMotion("panLeft", 1);
  assert.ok(motionAt(pan, 1).x < motionAt(pan, 0).x, "pan left drifts left");
  const none = presetMotion("none", 1);
  assert.deepEqual(motionAt(none, 0.5), { scale: 1, x: 0, y: 0 });
});

check("framing and motion compose into one sample", () => {
  const clip = {
    transform: { scale: 1.2 },
    motion: presetMotion("pushIn", 1),
  };
  const start = sampleClip(clip, 0);
  const end = sampleClip(clip, 1);
  assert.ok(Math.abs(start.scale - 1.2) < 1e-9, "the framing is where it starts");
  assert.ok(end.scale > start.scale, "and the move goes on from there");
});

/* ═════════════════════════ composition ═════════════════════════════════════ */

section("Composition (what is on screen, transitions included)");

function transitioned(kind, durationMs = 400) {
  const p = compilable();
  return {
    ...p,
    tracks: p.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => (c.id === "b" ? { ...c, transitionIn: { kind, durationMs } } : c)),
    })),
  };
}

check("outside a transition, one clip is on screen", () => {
  const layers = compositionAt(transitioned("crossfade"), 2000);
  assert.equal(layers.length, 1);
  assert.equal(layers[0].clip.id, "a");
  assert.equal(layers[0].opacity, 1);
});

check("a crossfade holds the outgoing shot and fades the incoming one in", () => {
  const project = transitioned("crossfade");
  const layers = compositionAt(project, 4200); // 200ms into a 400ms dissolve
  assert.equal(layers.length, 2, "both shots must be on screen");
  const [under, over] = layers;
  assert.equal(under.clip.id, "a");
  assert.equal(under.outgoing, true);
  assert.equal(over.clip.id, "b");
  assert.ok(Math.abs(over.opacity - 0.5) < 1e-9, "half way through, half opaque");
  // And it is over by the time the window closes.
  assert.equal(compositionAt(project, 4400).length, 1);
});

check("fade through black actually reaches black", () => {
  const project = transitioned("fadeBlack", 400);
  const middle = compositionAt(project, 4200);
  assert.ok(
    middle.some((l) => l.veil >= 0.99),
    "the midpoint of a fade through black must be black",
  );
});

check("a slide brings the incoming shot in from off-frame", () => {
  const project = transitioned("slideLeft", 400);
  const start = compositionAt(project, 4001).find((l) => l.clip.id === "b");
  const end = compositionAt(project, 4399).find((l) => l.clip.id === "b");
  assert.ok(start.slideX > 0.99, "slideLeft enters from the right edge");
  assert.ok(end.slideX < 0.05, "and has arrived by the end of the window");
});

check("a hidden clip is not composited", () => {
  const p = compilable();
  const hidden = {
    ...p,
    tracks: p.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => (c.id === "a" ? { ...c, hidden: true } : c)),
    })),
  };
  assert.equal(compositionAt(hidden, 2000).length, 0);
});

/* ═════════════════════════ media insertion ═════════════════════════════════ */

section("Media insertion");

const CATALOG = [
  { assetId: "asset-a", thumbnailUrl: "/studio/library/asset-a.jpg", variants: [] },
  {
    assetId: "asset-v",
    thumbnailUrl: "/studio/library/asset-v.jpg",
    variants: [{ aspectRatio: "9:16", thumbnailUrl: "/studio/library-v/asset-v.jpg" }],
  },
];

check("an asset that is not in the library is refused, not inserted", () => {
  const r = resolveAsset(CATALOG, "asset-missing", { portrait: false });
  assert.equal(r.ok, false);
  assert.match(r.reason, /No asset/);
  assert.equal(resolveAsset(null, "asset-a", { portrait: false }).ok, false, "nor before the catalog loads");
});

check("a portrait project resolves the portrait variant", () => {
  assert.equal(
    resolveAsset(CATALOG, "asset-v", { portrait: true }).url,
    "/studio/library-v/asset-v.jpg",
  );
  assert.equal(
    resolveAsset(CATALOG, "asset-v", { portrait: false }).url,
    "/studio/library/asset-v.jpg",
  );
});

check("replacing an asset changes the asset and NOTHING else", () => {
  // The whole contract. The compressor episode's timings were measured from
  // real narration; an insert that retimed a shot would desynchronise the film
  // from the voice recorded for it.
  const project = compilable();
  const track = project.tracks[0];
  const clip = track.clips[0];
  const result = assetPatchFor(clip, track, "asset-a");
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.patch).sort(), ["assetId", "kind"]);
  assert.equal(result.patch.assetId, "asset-a");
  assert.equal(result.patch.kind, "image", "a card becomes a photograph");
  const after = { ...clip, ...result.patch };
  assert.equal(after.startMs, clip.startMs);
  assert.equal(after.durationMs, clip.durationMs);
  assert.equal(after.transitionIn, clip.transitionIn);
});

check("a locked track and a narration track both refuse a photograph", () => {
  const project = compilable();
  const track = project.tracks[0];
  const clip = track.clips[0];
  assert.equal(assetPatchFor(clip, { ...track, locked: true }, "asset-a").ok, false);
  assert.equal(
    assetPatchFor(clip, { id: "t-voice", kind: "voice", name: "VOICEOVER", clips: [] }, "asset-a").ok,
    false,
  );
});

check("adding a photograph lands on the overlay and moves nothing", () => {
  const project = compilable([
    { id: "t-overlay", kind: "overlay", name: "OVERLAY", clips: [] },
  ]);
  const placed = placeNewImageClip(project, {
    assetId: "asset-a",
    label: "A photo",
    atMs: 2000,
    id: "new-1",
  });
  assert.equal(placed.ok, true);
  assert.equal(placed.trackId, "t-overlay");
  assert.equal(placed.clip.startMs, 2000);
  assert.equal(placed.clip.kind, "image");
  const next = {
    ...project,
    tracks: project.tracks.map((t) =>
      t.id === "t-overlay" ? { ...t, clips: [placed.clip] } : t,
    ),
  };
  assert.deepEqual(timelineProblems(next), [], "the timeline must stay valid");
  assert.deepEqual(
    next.tracks[0].clips,
    project.tracks[0].clips,
    "the film underneath must be untouched",
  );
});

check("adding onto an occupied spot is refused with a reason", () => {
  const project = compilable([
    {
      id: "t-overlay",
      kind: "overlay",
      name: "OVERLAY",
      clips: [
        { id: "o", kind: "image", assetId: "x", label: "Already here", startMs: 1000, durationMs: 2000 },
      ],
    },
  ]);
  const placed = placeNewImageClip(project, {
    assetId: "asset-a",
    label: "A photo",
    atMs: 1500,
    id: "new-1",
  });
  assert.equal(placed.ok, false);
  assert.match(placed.reason, /already has/);
});

check("a new clip is clipped to the room available, never overlapped", () => {
  const project = compilable([
    {
      id: "t-overlay",
      kind: "overlay",
      name: "OVERLAY",
      clips: [
        { id: "o", kind: "image", assetId: "x", label: "Later", startMs: 3000, durationMs: 2000 },
      ],
    },
  ]);
  const placed = placeNewImageClip(project, {
    assetId: "asset-a",
    label: "A photo",
    atMs: 2000,
    id: "new-1",
    durationMs: 4000,
  });
  assert.equal(placed.ok, true);
  assert.equal(placed.clip.durationMs, 1000, "trimmed to the gap, not laid over it");
});

check("timelineProblems catches the corruptions an insert could cause", () => {
  const broken = {
    ...compilable(),
    tracks: [
      {
        id: "t-video",
        kind: "video",
        name: "VIDEO 1",
        clips: [
          { id: "a", kind: "slide", label: "A", startMs: 0, durationMs: 4000 },
          { id: "a", kind: "slide", label: "dup", startMs: 3000, durationMs: 1000 },
        ],
      },
    ],
  };
  const problems = timelineProblems(broken);
  assert.ok(problems.some((p) => /duplicate clip id/.test(p)));
  assert.ok(problems.some((p) => /overlap/.test(p)));
  assert.deepEqual(timelineProblems(compilable()), []);
});

/* ════════════════════════════════ result ═══════════════════════════════════ */

process.stdout.write(
  `\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);
process.exit(failures ? 1 : 0);
