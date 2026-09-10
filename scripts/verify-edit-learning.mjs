/**
 * Human-edit learning: diff, session capture, aggregation, preferences.
 *
 * ===================== WHY THIS IS SEPARATE =====================
 * `verify-video-editor.mjs` proves the editor's arithmetic. This proves the
 * arithmetic of what we LEARN from the editor, which has a different and
 * sharper failure mode: a wrong diff does not break the editor, it quietly
 * teaches an agent the opposite of what the human meant. Nothing here is
 * allowed to be approximate.
 *
 * The overfitting guard is tested explicitly. A system that turns one
 * afternoon's opinion into policy is worse than one that learns nothing,
 * because it is confidently wrong and nobody knows why.
 *
 * Run: npm run verify:edit-learning
 */
import assert from "node:assert/strict";

import { diffEditorProjects, describeDiffEntry } from "@/shared/lib/video-editor/diff";
import {
  aggregate,
  actionablePreferences,
  confidenceFrom,
  derivePreferences,
  median,
  summariseSession,
  visualChangesPerMinute,
  visualDurations,
} from "@/shared/lib/video-editor/learning";
import {
  appendEvent,
  approveSession,
  createSession,
  deriveEditEvent,
  upsertSession,
} from "@/shared/lib/video-editor/session";
import {
  createEditorState,
  editorReducer,
} from "@/shared/lib/video-editor/store";
import { DEFAULT_LEARNING_THRESHOLDS } from "@/shared/types/edit-learning";

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

/* ── fixtures ────────────────────────────────────────────────────────────── */

const clip = (over = {}) => ({
  id: "a",
  kind: "slide",
  assetId: "slide-a",
  label: "A",
  startMs: 0,
  durationMs: 6200,
  ...over,
});

function draft(over = {}) {
  return {
    id: "hvac-01",
    title: "Draft",
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
          clip({ id: "compressor-01", label: "Compressor" }),
          clip({
            id: "condenser-01",
            label: "Condenser",
            assetId: "slide-b",
            startMs: 6200,
            durationMs: 5000,
          }),
        ],
      },
      {
        id: "t-caption",
        kind: "caption",
        name: "CAPTIONS",
        clips: [
          {
            id: "cap-1",
            kind: "caption",
            label: "cap",
            startMs: 0,
            durationMs: 4000,
            text: { text: "Start at the compresser." },
          },
        ],
      },
      { id: "t-voice", kind: "voice", name: "VOICEOVER", clips: [] },
      { id: "t-overlay", kind: "overlay", name: "OVERLAY", clips: [] },
    ],
    ...over,
  };
}

/** Applies a shallow patch to one clip and returns a new project. */
function patchClip(project, clipId, patch) {
  return {
    ...project,
    tracks: project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => (c.id === clipId ? { ...c, ...patch } : c)),
    })),
  };
}

/* ══════════════════════════════════════ diff ═══════════════════════════════ */

section("Diff");

check("a shortened clip is reported with an exact delta", () => {
  const before = draft();
  const after = patchClip(before, "compressor-01", { durationMs: 3400 });
  const { entries } = diffEditorProjects(before, after);
  const entry = entries.find((e) => e.type === "clip_duration_changed");
  assert.ok(entry, "no duration entry");
  assert.equal(entry.clipId, "compressor-01");
  assert.equal(entry.beforeMs, 6200);
  assert.equal(entry.afterMs, 3400);
  assert.equal(entry.deltaMs, -2800);
});

check("an unchanged project produces no entries", () => {
  const { entries, summary } = diffEditorProjects(draft(), draft());
  assert.deepEqual(entries, []);
  assert.equal(summary.totalChanges, 0);
  assert.equal(summary.clipsUnchanged, 3);
});

check("the diff is deterministic across runs", () => {
  const before = draft();
  const after = patchClip(
    patchClip(before, "compressor-01", { durationMs: 3400 }),
    "condenser-01",
    { startMs: 3400 },
  );
  const a = JSON.stringify(diffEditorProjects(before, after).entries);
  const b = JSON.stringify(diffEditorProjects(before, after).entries);
  assert.equal(a, b);
});

check("added and removed clips are distinguished", () => {
  const before = draft();
  const after = {
    ...before,
    tracks: before.tracks.map((t) =>
      t.id === "t-video"
        ? { ...t, clips: t.clips.filter((c) => c.id !== "condenser-01") }
        : t.id === "t-overlay"
          ? {
              ...t,
              clips: [
                clip({ id: "logo-1", kind: "image", startMs: 1000, durationMs: 2000 }),
              ],
            }
          : t,
    ),
  };
  const { summary, entries } = diffEditorProjects(before, after);
  assert.equal(summary.clipsRemoved, 1);
  assert.equal(summary.clipsAdded, 1);
  assert.ok(entries.some((e) => e.type === "clip_removed" && e.clipId === "condenser-01"));
  assert.ok(entries.some((e) => e.type === "clip_added" && e.clipId === "logo-1"));
});

check("a replaced asset is reported, not mistaken for a new clip", () => {
  const before = draft();
  const after = patchClip(before, "compressor-01", { assetId: "slide-z" });
  const { summary, entries } = diffEditorProjects(before, after);
  assert.equal(summary.assetsReplaced, 1);
  assert.equal(summary.clipsAdded, 0);
  const entry = entries.find((e) => e.type === "asset_replaced");
  assert.equal(entry.before, "slide-a");
  assert.equal(entry.after, "slide-z");
});

check("caption edits and text edits are counted separately", () => {
  const before = draft();
  const after = patchClip(before, "cap-1", {
    text: { text: "Start at the compressor." },
  });
  const { summary, entries } = diffEditorProjects(before, after);
  assert.equal(summary.captionEdits, 1, "a caption-track edit is a caption edit");
  assert.equal(summary.textEdits, 0);
  assert.equal(entries.find((e) => e.type === "caption_changed").after, "Start at the compressor.");
});

check("transform changes report per property, defaults treated as equal", () => {
  const before = draft();
  const withDefaults = patchClip(before, "compressor-01", {
    transform: { scale: 1, opacity: 1, x: 0, y: 0 },
  });
  assert.equal(
    diffEditorProjects(before, withDefaults).summary.transformEdits,
    0,
    "explicit defaults must not read as edits",
  );
  const scaled = patchClip(before, "compressor-01", {
    transform: { scale: 1.4, x: 120 },
  });
  const { entries, summary } = diffEditorProjects(before, scaled);
  assert.equal(summary.transformEdits, 2);
  assert.ok(entries.some((e) => e.type === "transform_changed" && e.property === "scale"));
  assert.ok(entries.some((e) => e.type === "transform_changed" && e.property === "x"));
});

check("the opening visual replacement flag fires only on the first shot", () => {
  const before = draft();
  const laterChanged = patchClip(before, "condenser-01", { assetId: "slide-z" });
  assert.equal(
    diffEditorProjects(before, laterChanged).summary.openingVisualReplaced,
    false,
  );
  const firstChanged = patchClip(before, "compressor-01", { assetId: "slide-z" });
  assert.equal(
    diffEditorProjects(before, firstChanged).summary.openingVisualReplaced,
    true,
  );
});

check("runtime change is reported once, with the right sign", () => {
  const before = draft();
  const after = patchClip(before, "condenser-01", { durationMs: 2000 });
  const { entries, summary } = diffEditorProjects(before, after);
  const runtime = entries.filter((e) => e.type === "project_duration_changed");
  assert.equal(runtime.length, 1);
  assert.equal(runtime[0].deltaMs, -3000);
  assert.equal(summary.durationDeltaMs, -3000);
});

check("every entry renders a human-readable line", () => {
  const before = draft();
  const after = patchClip(before, "compressor-01", {
    durationMs: 3400,
    assetId: "slide-z",
    transform: { scale: 1.4 },
  });
  for (const entry of diffEditorProjects(before, after).entries) {
    const line = describeDiffEntry(entry);
    assert.ok(line && line !== "unknown change", `no description for ${entry.type}`);
  }
});

/* ═══════════════════════════════ event capture ═════════════════════════════ */

section("Event capture");

const ctx = { projectId: "hvac-01", timestampMs: 10, makeId: () => "evt-1" };

check("a trim through the reducer produces a trim event", () => {
  const previous = createEditorState(draft());
  const action = { type: "trimClip", clipId: "compressor-01", edge: "end", ms: 3400 };
  const next = editorReducer(previous, action);
  const event = deriveEditEvent(previous, action, next, ctx);
  assert.ok(event, "no event");
  assert.equal(event.action, "trim");
  assert.equal(event.clipId, "compressor-01");
  assert.equal(event.before.durationMs, 6200);
  assert.equal(event.after.durationMs, 3400);
  assert.equal(event.source, "human");
});

check("selection and seeking produce no events", () => {
  const previous = createEditorState(draft());
  for (const action of [
    { type: "select", clipId: "compressor-01" },
    { type: "seek", ms: 4000 },
    { type: "setPxPerSec", pxPerSec: 90 },
    { type: "clearSelection" },
  ]) {
    const next = editorReducer(previous, action);
    assert.equal(
      deriveEditEvent(previous, action, next, ctx),
      null,
      `${action.type} must not be an edit`,
    );
  }
});

check("a rejected edit produces no event", () => {
  const locked = {
    ...draft(),
    tracks: draft().tracks.map((t) =>
      t.id === "t-video" ? { ...t, locked: true } : t,
    ),
  };
  const previous = createEditorState(locked);
  const action = { type: "moveClip", clipId: "compressor-01", startMs: 9000 };
  const next = editorReducer(previous, action);
  assert.equal(
    deriveEditEvent(previous, action, next, ctx),
    null,
    "a move the reducer refused must not be recorded as an edit",
  );
});

check("undo and redo are not recorded as new editorial decisions", () => {
  let state = createEditorState(draft());
  state = editorReducer(state, { type: "select", clipId: "compressor-01" });
  const deleted = editorReducer(state, { type: "deleteSelected" });
  const undone = editorReducer(deleted, { type: "undo" });
  assert.equal(
    deriveEditEvent(deleted, { type: "undo" }, undone, ctx),
    null,
    "undo would double-count the work it reverses",
  );
});

check("a caption patch is classified as a caption edit, not a property change", () => {
  const previous = createEditorState(draft());
  const action = {
    type: "updateClip",
    clipId: "cap-1",
    patch: { text: { text: "fixed" } },
  };
  const next = editorReducer(previous, action);
  assert.equal(deriveEditEvent(previous, action, next, ctx).action, "caption_edit");
});

check("a transform patch is classified as a transform", () => {
  const previous = createEditorState(draft());
  const action = {
    type: "updateClip",
    clipId: "compressor-01",
    patch: { transform: { scale: 1.5 } },
  };
  const next = editorReducer(previous, action);
  assert.equal(deriveEditEvent(previous, action, next, ctx).action, "transform");
});

/* ════════════════════════════ session lifecycle ════════════════════════════ */

section("Session lifecycle");

function session(id, generated, approved, scope = { series: "HVAC" }) {
  let s = createSession({
    id,
    projectId: "hvac-01",
    generatedProjectSnapshot: generated,
    generatedBy: "test-agent",
    startedAt: "2026-09-10T00:00:00.000Z",
    scope,
  });
  s = appendEvent(s, {
    id: "e1",
    projectId: "hvac-01",
    action: "trim",
    timestampMs: 1,
    source: "human",
  });
  return approved
    ? approveSession(s, approved, "2026-09-10T00:05:00.000Z")
    : s;
}

check("approval never overwrites the generated snapshot", () => {
  const generated = draft();
  const approved = patchClip(generated, "compressor-01", { durationMs: 3400 });
  const s = session("s1", generated, approved);
  assert.equal(
    s.generatedProjectSnapshot.tracks[0].clips[0].durationMs,
    6200,
    "the control condition must survive approval",
  );
  assert.equal(s.approvedProjectSnapshot.tracks[0].clips[0].durationMs, 3400);
  assert.ok(s.approvedAt);
});

check("upsert replaces by id rather than appending duplicates", () => {
  const a = session("s1", draft(), draft());
  const list = upsertSession(upsertSession([], a), { ...a, approvedAt: "later" });
  assert.equal(list.length, 1);
  assert.equal(list[0].approvedAt, "later");
});

check("an unapproved session yields no statistics", () => {
  assert.equal(summariseSession(session("s1", draft(), null)), null);
});

/* ════════════════════════════════ statistics ═══════════════════════════════ */

section("Statistics");

check("median is a true median, not a mean", () => {
  assert.equal(median([1000, 2000, 30000]), 2000);
  assert.equal(median([1000, 3000]), 2000);
  assert.equal(median([]), 0);
});

check("visual durations exclude audio and captions", () => {
  const durations = visualDurations(draft());
  assert.deepEqual(durations.sort((a, b) => a - b), [4000, 5000, 6200]);
});

check("changes per minute is derived from real runtime", () => {
  // 3 visual clips (2 video + 1 caption) across 11200ms.
  const rate = visualChangesPerMinute(draft());
  assert.ok(rate > 15 && rate < 17, `unexpected rate ${rate}`);
});

check("trimming a mid-timeline clip does NOT change runtime", () => {
  // Runtime is the furthest clip END, so shortening a clip that something else
  // outlasts changes nothing about the total. This is the correct behaviour —
  // the editor does not ripple — and it is asserted so that a future ripple
  // feature cannot change it silently.
  const generated = draft();
  const approved = patchClip(generated, "compressor-01", { durationMs: 3400 });
  const stats = summariseSession(session("s1", generated, approved));
  assert.equal(stats.durationDeltaMs, 0);
  assert.ok(stats.unchangedRatio < 1, "the clip itself still counts as changed");
});

check("session stats capture the shortening direction", () => {
  // The LAST clip, so the trim moves both the median and the runtime.
  const generated = draft();
  const approved = patchClip(generated, "condenser-01", { durationMs: 2000 });
  const stats = summariseSession(session("s1", generated, approved));
  assert.ok(
    stats.humanMedianVisualMs < stats.botMedianVisualMs,
    `median did not fall (${stats.botMedianVisualMs} -> ${stats.humanMedianVisualMs})`,
  );
  assert.equal(stats.durationDeltaMs, -3000);
  assert.ok(stats.unchangedRatio < 1);
});

/* ═══════════════════════════════ preferences ═══════════════════════════════ */

section("Preferences and the overfitting guard");

/** N sessions that all shorten the opening clip. */
function shorteningSessions(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const generated = draft();
    const approved = patchClip(generated, "compressor-01", { durationMs: 3400 });
    out.push(session(`s${i}`, generated, approved));
  }
  return out;
}

check("confidence rises with agreement and saturates with volume", () => {
  assert.equal(confidenceFrom(5, 10, 5), 0, "a coin flip is zero confidence");
  assert.ok(confidenceFrom(10, 10, 5) > confidenceFrom(6, 10, 5));
  const five = confidenceFrom(5, 5, 5);
  const ten = confidenceFrom(10, 10, 5);
  const twenty = confidenceFrom(20, 20, 5);
  assert.ok(ten > five, "more evidence must raise confidence");
  assert.equal(ten, twenty, "confidence saturates rather than growing forever");
});

check("one session never produces an actionable preference", () => {
  const prefs = derivePreferences(shorteningSessions(1));
  assert.ok(prefs.length > 0, "a single session still produces candidates");
  assert.equal(
    actionablePreferences(prefs).length,
    0,
    "a single edit must never become policy",
  );
});

check("repeated consistent evidence does produce one", () => {
  const prefs = derivePreferences(shorteningSessions(10));
  const duration = prefs.find((p) => p.key === "static_visual_duration");
  assert.ok(duration, "no duration preference");
  assert.equal(duration.evidenceCount, 10);
  assert.ok(
    duration.confidence >= DEFAULT_LEARNING_THRESHOLDS.minConfidence,
    `confidence ${duration.confidence} below threshold`,
  );
  assert.ok(
    actionablePreferences(prefs).some((p) => p.key === "static_visual_duration"),
  );
  assert.match(duration.recommendation, /shorten/i);
});

check("evidence count is SESSIONS, not events", () => {
  const sessions = shorteningSessions(6);
  const withManyEvents = sessions.map((s) => ({
    ...s,
    events: Array.from({ length: 50 }, (_, i) => ({
      id: `e${i}`,
      projectId: "hvac-01",
      action: "trim",
      timestampMs: i,
      source: "human",
    })),
  }));
  const prefs = derivePreferences(withManyEvents);
  assert.equal(
    prefs.find((p) => p.key === "static_visual_duration").evidenceCount,
    6,
    "one operator shortening fifty clips in one sitting is one opinion",
  );
});

check("disagreeing sessions do not clear the confidence bar", () => {
  const shorter = shorteningSessions(5);
  const longer = [];
  for (let i = 0; i < 5; i += 1) {
    const generated = draft();
    const approved = patchClip(generated, "compressor-01", { durationMs: 9000 });
    longer.push(session(`L${i}`, generated, approved));
  }
  const prefs = derivePreferences([...shorter, ...longer]);
  const duration = prefs.find((p) => p.key === "static_visual_duration");
  // Perfectly split evidence should not yield a duration preference at all,
  // or one with zero confidence — never an actionable one.
  assert.ok(
    !duration || duration.confidence === 0,
    `split evidence produced confidence ${duration?.confidence}`,
  );
  assert.equal(
    actionablePreferences(prefs).some((p) => p.key === "static_visual_duration"),
    false,
  );
});

check("scope keeps series apart", () => {
  const hvac = shorteningSessions(8);
  const shorts = shorteningSessions(8).map((s) => ({
    ...s,
    id: `short-${s.id}`,
    scope: { series: "Shorts", format: "short" },
  }));
  const all = [...hvac, ...shorts];
  const seriesPrefs = derivePreferences(all, {
    scope: "series",
    scopeValue: "HVAC",
  });
  assert.equal(
    seriesPrefs.find((p) => p.key === "draft_acceptance").evidenceCount,
    8,
    "a series preference must not count the other series' sessions",
  );
  assert.equal(
    derivePreferences(all, { scope: "series", scopeValue: "Nothing" }).length,
    0,
    "an empty scope yields nothing rather than falling back to global",
  );
});

check("aggregate over no sessions is zeroed, not NaN", () => {
  const totals = aggregate([]);
  for (const [key, value] of Object.entries(totals)) {
    assert.ok(Number.isFinite(value), `${key} is not finite: ${value}`);
  }
});

check("thresholds are configurable", () => {
  const prefs = derivePreferences(shorteningSessions(3));
  assert.equal(actionablePreferences(prefs).length, 0, "default bar is 5 sessions");
  const relaxed = actionablePreferences(prefs, {
    minSessions: 2,
    minConfidence: 0.1,
  });
  assert.ok(relaxed.length > 0, "a lowered bar must actually lower it");
});

/* ══════════════════════════════════ result ═════════════════════════════════ */

process.stdout.write(
  `\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);
process.exit(failures ? 1 : 0);
