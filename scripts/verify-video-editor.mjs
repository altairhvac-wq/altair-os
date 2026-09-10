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
  clipsOverlap,
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

check("seek clamps to the project duration", () => {
  let s = createEditorState(project());
  s = run(s, { type: "seek", ms: 999_999 });
  assert.equal(s.playheadMs, 5000, "clip ends at 5000ms");
  s = run(s, { type: "seek", ms: -100 });
  assert.equal(s.playheadMs, 0);
});

check("split at the playhead produces two clips and selects both", () => {
  let s = createEditorState(project());
  s = run(s, { type: "select", clipId: "c1" });
  s = run(s, { type: "seek", ms: 3000 });
  s = run(s, { type: "splitSelected" }, idFactory("half"));
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

check("undo does not move the playhead or the zoom", () => {
  let s = createEditorState(project());
  s = run(s, { type: "seek", ms: 2000 });
  s = run(s, { type: "setPxPerSec", pxPerSec: 120 });
  s = run(s, { type: "select", clipId: "c1" });
  s = run(s, { type: "deleteSelected" });
  s = run(s, { type: "undo" });
  assert.equal(s.playheadMs, 2000, "undo must not scroll you away from the edit");
  assert.equal(s.pxPerSec, 120);
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
  s = run(s, { type: "seek", ms: 4000 });
  s = run(s, { type: "paste" }, idFactory("pasted"));
  const pasted = currentProject(s).tracks[0].clips.find((c) => c.id === "pasted-1");
  assert.equal(pasted.startMs, 4000);
});

check("revision advances only on project change", () => {
  let s = createEditorState(project());
  const r0 = s.revision;
  s = run(s, { type: "seek", ms: 1000 });
  s = run(s, { type: "select", clipId: "c1" });
  assert.equal(s.revision, r0, "seeking and selecting are not edits");
  s = run(s, { type: "deleteSelected" });
  assert.equal(s.revision, r0 + 1);
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

check("output length accounts for the crossfade shrink", () => {
  const r = compileProjectToTimeline(compilable());
  assert.equal(r.expectedOutputMs, 8000 - RENDER_TRANSITION_MS);
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

check("an entry shorter than the crossfade is refused", () => {
  const p = compilable();
  const tiny = {
    ...p,
    tracks: p.tracks.map((t) =>
      t.id === "t-video"
        ? {
            ...t,
            clips: [
              { ...t.clips[0], durationMs: 150 },
              { ...t.clips[1], startMs: 150 },
            ],
          }
        : t,
    ),
  };
  const r = compileProjectToTimeline(tiny);
  assert.ok(
    r.errors.some((e) => /crossfade/.test(e)),
    `expected a crossfade-length error, got: ${r.errors.join("; ")}`,
  );
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

check("bakeable properties are baked; audio properties still drop", () => {
  const r = compileProjectToTimeline(decorated());
  for (const property of ["scale", "position", "rotation", "opacity"]) {
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

check("no property vanishes from BOTH lists", () => {
  // The invariant the whole honesty argument rests on: anything the renderer
  // cannot express natively is either baked or reported, never neither.
  const r = compileProjectToTimeline(decorated());
  const accounted = new Set([
    ...r.bakedProperties.map((b) => b.split(":")[1]),
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



/* ════════════════════════════════ result ═══════════════════════════════════ */

process.stdout.write(
  `\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);
process.exit(failures ? 1 : 0);
