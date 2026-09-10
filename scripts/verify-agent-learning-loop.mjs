/**
 * The agent learning loop: preference contract, scope precedence, draft
 * generation, and the guard that keeps one session from becoming policy.
 *
 * ===================== WHY THIS IS ITS OWN SUITE =====================
 * `verify-edit-learning.mjs` proves we can measure what a human changed. This
 * proves the measurement can safely reach an agent — a different and more
 * dangerous question. A wrong diff produces a bad statistic; a wrong preference
 * contract produces a Director that confidently makes the same mistake on every
 * future video, and nobody can see why.
 *
 * The precedence rule is tested hardest, because its failure mode is silent:
 * a Shorts pacing preference leaking into a six-minute explainer does not
 * error, it just makes every episode slightly wrong.
 *
 * Run: npm run verify:agent-loop
 */
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  EDITING_PREFERENCE_SET_VERSION,
  GUIDANCE_CONFIDENCE,
  SCOPE_PRECEDENCE,
  STRONG_CONFIDENCE,
  renderPreferenceGuidance,
  resolveByPrecedence,
  strengthOf,
  suppliedPreferenceKeys,
} from "@/shared/types/editing-preferences";
import {
  buildPreferenceSet,
  explainPrecedence,
  preferenceState,
  preferenceStrengthLabel,
} from "@/shared/lib/video-editor/preference-set";
import {
  buildDraftFromPlan,
  describeDraftOrigin,
  draftProjectId,
} from "@/shared/lib/video-editor/draft-from-plan";
import {
  BASE_TAIL_MS,
  BRISK_WPM_BONUS_MS,
  BRISK_WPM_THRESHOLD,
  FAST_WPM_BONUS_MS,
  FAST_WPM_THRESHOLD,
  FINAL_BEAT_BONUS_MS,
  LEAD_IN_MS,
  SECTION_CARD_BONUS_MS,
  TRANSITION_MS,
  countWords,
  estimateSpeechMs,
  expectedMasterMs,
  paceBeat,
  tailMs,
} from "@/shared/lib/video-editor/pacing";
import { buildScorecard } from "@/shared/lib/video-editor/scorecard";
import { diffEditorProjects } from "@/shared/lib/video-editor/diff";
import {
  approveSession,
  createSession,
} from "@/shared/lib/video-editor/session";
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

function project(clipDurations, over = {}) {
  return {
    id: "p",
    title: "Fixture",
    width: 1920,
    height: 1080,
    fps: 30,
    version: 1,
    tracks: [
      {
        id: "t-video",
        kind: "video",
        name: "VIDEO 1",
        clips: clipDurations.map((durationMs, i) => ({
          id: `c${i}`,
          kind: "slide",
          assetId: `slide-${i}`,
          label: `Clip ${i}`,
          startMs: clipDurations.slice(0, i).reduce((a, b) => a + b, 0),
          durationMs,
        })),
      },
      { id: "t-caption", kind: "caption", name: "CAPTIONS", clips: [] },
      { id: "t-voice", kind: "voice", name: "VOICEOVER", clips: [] },
    ],
    ...over,
  };
}

/** N approved sessions that all shorten every clip, in a given scope. */
function shorteningSessions(count, scope, idPrefix = "s") {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const generated = project([6000, 6000, 6000]);
    const approved = project([3000, 3000, 3000]);
    const s = createSession({
      id: `${idPrefix}${i}`,
      projectId: "p",
      generatedProjectSnapshot: generated,
      generatedBy: "test-agent",
      startedAt: "2026-09-10T00:00:00.000Z",
      scope,
    });
    out.push(approveSession(s, approved, "2026-09-10T00:05:00.000Z"));
  }
  return out;
}

const AT = "2026-09-10T12:00:00.000Z";

/* ══════════════════════════════════ pacing ═════════════════════════════════ */

section("Pacing rule (mirrors render-episode.mjs)");

check("the mirrored constants still match the renderer", () => {
  // Read the real script. If someone edits the pacing rule on the laptop, this
  // fails here rather than producing drafts the renderer disagrees with.
  const source = fs.readFileSync(
    "C:/Users/User/Desktop/AltairDemoTool/production/slide-system/render-episode.mjs",
    "utf8",
  );
  assert.ok(
    source.includes(`const BASE_TAIL_MS = ${BASE_TAIL_MS};`),
    `base tail ${BASE_TAIL_MS} not found in render-episode.mjs`,
  );
  assert.ok(
    source.includes(`const LEAD_IN_MS = ${LEAD_IN_MS};`),
    `lead-in ${LEAD_IN_MS} drifted`,
  );
  assert.ok(
    source.includes(`wpm > ${FAST_WPM_THRESHOLD}`) &&
      source.includes(`tail += ${FAST_WPM_BONUS_MS}`),
    "fast-speech bonus drifted",
  );
  assert.ok(
    source.includes(`wpm > ${BRISK_WPM_THRESHOLD}`) &&
      source.includes(`tail += ${BRISK_WPM_BONUS_MS}`),
    "brisk-speech bonus drifted",
  );
  assert.ok(
    source.includes(`tail += ${SECTION_CARD_BONUS_MS}`),
    "section-card bonus drifted",
  );
  assert.ok(
    source.includes(`tail += ${FINAL_BEAT_BONUS_MS}`),
    "final-beat bonus drifted",
  );
  assert.ok(
    source.includes(`const TRANSITION_MS = ${TRANSITION_MS};`),
    "crossfade length drifted",
  );
});

check("word counting handles whitespace and empties", () => {
  assert.equal(countWords("one two three"), 3);
  assert.equal(countWords("  padded   words  "), 2);
  assert.equal(countWords(""), 0);
  assert.equal(estimateSpeechMs(""), 0);
});

check("tail applies exactly one speech bonus", () => {
  assert.equal(tailMs({ wpm: 150 }), BASE_TAIL_MS);
  assert.equal(tailMs({ wpm: 210 }), BASE_TAIL_MS + BRISK_WPM_BONUS_MS);
  assert.equal(tailMs({ wpm: 240 }), BASE_TAIL_MS + FAST_WPM_BONUS_MS);
  assert.equal(
    tailMs({ wpm: 150, isFinalBeat: true }),
    BASE_TAIL_MS + FINAL_BEAT_BONUS_MS,
  );
});

check("the first beat carries the lead-in and no other does", () => {
  const first = paceBeat({ narration: "a b c", isFirstBeat: true, isFinalBeat: false });
  const later = paceBeat({ narration: "a b c", isFirstBeat: false, isFinalBeat: false });
  assert.equal(first.leadInMs, LEAD_IN_MS);
  assert.equal(later.leadInMs, 0);
  assert.equal(first.totalMs - later.totalMs, LEAD_IN_MS);
});

check("a measured beat is not re-estimated", () => {
  const paced = paceBeat({
    narration: "some words here",
    isFirstBeat: false,
    isFinalBeat: false,
    measuredSpeechMs: 4321,
  });
  assert.equal(paced.speechMs, 4321);
  assert.equal(paced.measured, true);
});

check("crossfades shrink the master", () => {
  assert.equal(expectedMasterMs(10_000, 1), 10_000);
  assert.equal(expectedMasterMs(10_000, 5), 10_000 - 4 * TRANSITION_MS);
});

/* ═══════════════════════════ preference contract ═══════════════════════════ */

section("Preference contract");

check("strength bands map from confidence", () => {
  assert.equal(strengthOf(0.95), "strong");
  assert.equal(strengthOf(STRONG_CONFIDENCE), "strong");
  assert.equal(strengthOf(GUIDANCE_CONFIDENCE), "guidance");
  assert.equal(strengthOf(0.5), "weak");
});

check("a set from one session is empty, not merely weak", () => {
  const set = buildPreferenceSet(shorteningSessions(1, { series: "HVAC" }), {
    series: "HVAC",
    generatedAt: AT,
  });
  assert.equal(set.version, EDITING_PREFERENCE_SET_VERSION);
  assert.equal(
    set.preferences.length,
    0,
    "one session must not reach the agent at all",
  );
  assert.equal(renderPreferenceGuidance(set), null);
});

check("repeated evidence produces a usable set", () => {
  const set = buildPreferenceSet(shorteningSessions(10, { series: "HVAC" }), {
    series: "HVAC",
    generatedAt: AT,
  });
  assert.ok(set.preferences.length > 0, "no preferences survived");
  for (const preference of set.preferences) {
    assert.ok(
      preference.confidence >= DEFAULT_LEARNING_THRESHOLDS.minConfidence,
      `${preference.key} is below threshold at ${preference.confidence}`,
    );
    assert.ok(preference.evidenceSessions >= DEFAULT_LEARNING_THRESHOLDS.minSessions);
    assert.ok(preference.recommendation.length > 0);
  }
});

check("guidance is prose with evidence, not JSON", () => {
  const set = buildPreferenceSet(shorteningSessions(10, { series: "HVAC" }), {
    series: "HVAC",
    generatedAt: AT,
  });
  const text = renderPreferenceGuidance(set);
  assert.ok(text.includes("HUMAN-LEARNED EDITING PREFERENCES"));
  assert.ok(/Evidence: \d+ approved editing session/.test(text));
  assert.ok(/Confidence: \d+% \((strong|guidance)\)/.test(text));
  assert.ok(text.includes("never outrank"), "the precedence caveat is missing");
  assert.ok(!text.includes("{"), "raw JSON leaked into the prompt");
});

check("weak preferences are never shown to an agent", () => {
  const set = {
    version: 1,
    generatedAt: AT,
    scope: {},
    preferences: [
      { key: "weak_one", evidenceSessions: 9, confidence: 0.3, recommendation: "Do a thing." },
      { key: "strong_one", evidenceSessions: 9, confidence: 0.9, recommendation: "Do another." },
    ],
  };
  const text = renderPreferenceGuidance(set);
  assert.ok(text.includes("Do another."));
  assert.ok(!text.includes("Do a thing."), "a weak preference reached the prompt");
  assert.deepEqual(suppliedPreferenceKeys(set), ["strong_one"]);
});

/* ═════════════════════════════ scope precedence ════════════════════════════ */

section("Scope precedence");

check("the documented order is narrowest first", () => {
  assert.deepEqual([...SCOPE_PRECEDENCE], ["topic", "series", "format", "global"]);
});

check("a narrower tier wins the same key", () => {
  const merged = resolveByPrecedence([
    {
      scope: "global",
      preferences: [
        { key: "static_visual_duration", evidenceSessions: 20, confidence: 0.95, recommendation: "GLOBAL" },
      ],
    },
    {
      scope: "series",
      scopeValue: "HVAC",
      preferences: [
        { key: "static_visual_duration", evidenceSessions: 6, confidence: 0.75, recommendation: "SERIES" },
      ],
    },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(
    merged[0].preference.recommendation,
    "SERIES",
    "a broader tier with higher confidence must NOT outrank a narrower one",
  );
  assert.equal(merged[0].scope, "series");
});

check("broader tiers fill gaps rather than being discarded", () => {
  const merged = resolveByPrecedence([
    {
      scope: "series",
      scopeValue: "HVAC",
      preferences: [
        { key: "caption_correction", evidenceSessions: 6, confidence: 0.8, recommendation: "SERIES CAPTIONS" },
      ],
    },
    {
      scope: "format",
      scopeValue: "long-form",
      preferences: [
        { key: "static_visual_duration", evidenceSessions: 9, confidence: 0.85, recommendation: "FORMAT PACING" },
      ],
    },
  ]);
  const keys = merged.map((m) => m.preference.key).sort();
  assert.deepEqual(keys, ["caption_correction", "static_visual_duration"]);
  assert.equal(
    merged.find((m) => m.preference.key === "static_visual_duration").scope,
    "format",
    "a series with no pacing opinion must inherit the format's",
  );
});

check("a Shorts pacing rule does not reach a long-form request", () => {
  // The concrete failure this whole tier system exists to prevent.
  const shorts = shorteningSessions(10, { series: "Shorts", format: "short-form" }, "short");
  const set = buildPreferenceSet(shorts, {
    series: "How HVAC Actually Works",
    format: "long-form-educational",
    generatedAt: AT,
  });
  const pacing = set.preferences.find((p) => p.key === "static_visual_duration");
  // Global still sees the Shorts sessions, but nothing series- or
  // format-scoped does — and a global pacing claim built ONLY from Shorts is
  // exactly what the operator was warned about, so assert the scope it landed
  // in rather than pretending it vanished.
  const explained = explainPrecedence(shorts, {
    series: "How HVAC Actually Works",
    format: "long-form-educational",
    generatedAt: AT,
  });
  const entry = explained.find((e) => e.key === "static_visual_duration");
  if (pacing) {
    assert.equal(
      entry.scope,
      "global",
      "Shorts evidence must only ever reach a long-form request through the GLOBAL tier",
    );
  }
  // What must never happen: it being attributed to this series or format.
  assert.ok(
    !explained.some(
      (e) => (e.scope === "series" || e.scope === "format") && e.key === "static_visual_duration",
    ),
    "Shorts evidence was attributed to the long-form series or format",
  );
});

check("an unknown scope yields an empty tier, not a fallback", () => {
  const sessions = shorteningSessions(10, { series: "HVAC" });
  const explained = explainPrecedence(sessions, {
    series: "Does Not Exist",
    generatedAt: AT,
  });
  assert.ok(
    explained.every((e) => e.scope === "global"),
    "a missing series must not silently borrow another series' evidence",
  );
});

/* ════════════════════════════ operator states ══════════════════════════════ */

section("Operator states");

check("states progress collecting -> candidate -> active", () => {
  assert.equal(
    preferenceState({ key: "k", evidenceCount: 2, confidence: 0.9, scope: "global", recommendation: "" }),
    "collecting",
  );
  assert.equal(
    preferenceState({ key: "k", evidenceCount: 8, confidence: 0.4, scope: "global", recommendation: "" }),
    "candidate",
  );
  assert.equal(
    preferenceState({ key: "k", evidenceCount: 8, confidence: 0.9, scope: "global", recommendation: "" }),
    "active",
  );
});

check("the operator label matches the agent's band", () => {
  assert.equal(preferenceStrengthLabel(0.9), "Follow normally");
  assert.equal(preferenceStrengthLabel(0.72), "Guidance only");
  assert.equal(preferenceStrengthLabel(0.2), "Not used by agents");
});

/* ═══════════════════════════ draft from a plan ═════════════════════════════ */

section("Draft generation");

const PLAN = {
  topic: "How the HVAC cycle works",
  format: "long-form-educational",
  hook: "Cold air is not made. It is moved.",
  beats: [
    { narration: "Cold air is not made. It is moved.", visualDirection: "Title card", caption: "Cold air is moved", kind: "diagram_graphic" },
    { narration: "Start at the compressor, where cool vapor arrives.", visualDirection: "Compressor cutaway", caption: "Start at the compressor", kind: "narration" },
    { narration: "And that is the loop.", visualDirection: "Loop recap", caption: "That is the loop", kind: "diagram_graphic" },
  ],
  targetDurationSeconds: 60,
};

const META = {
  agentVersion: "content.draft_video_plan@v1",
  generatedAt: AT,
};

check("a plan becomes an editable project with all eight tracks", () => {
  const draft = buildDraftFromPlan(PLAN, META);
  assert.equal(draft.project.tracks.length, 8);
  const names = draft.project.tracks.map((t) => t.name);
  for (const expected of ["VIDEO 1", "GRAPHICS", "CAPTIONS", "VOICEOVER"]) {
    assert.ok(names.includes(expected), `missing ${expected}`);
  }
});

check("beats land on the track their scene kind implies", () => {
  const draft = buildDraftFromPlan(PLAN, META);
  const graphics = draft.project.tracks.find((t) => t.id === "t-graphics");
  const video = draft.project.tracks.find((t) => t.id === "t-video");
  assert.equal(graphics.clips.length, 2, "two diagram_graphic beats");
  assert.equal(video.clips.length, 1, "one narration beat");
});

check("durations come from the pacing rule, not from the plan", () => {
  const draft = buildDraftFromPlan(PLAN, META);
  const all = draft.project.tracks.flatMap((t) =>
    t.kind === "video" || t.kind === "graphics" ? t.clips : [],
  );
  for (const clip of all) {
    assert.ok(clip.durationMs > BASE_TAIL_MS, `${clip.id} is impossibly short`);
  }
  // The final beat gets the long tail; it must be the longest despite the
  // shortest line.
  const last = [...all].sort((a, b) => a.startMs - b.startMs).at(-1);
  assert.ok(
    last.durationMs > FINAL_BEAT_BONUS_MS,
    "the final beat did not receive its tail",
  );
  assert.equal(draft.summary.durationsEstimated, true, "estimates must be flagged");
});

check("clips are contiguous from zero", () => {
  const draft = buildDraftFromPlan(PLAN, META);
  const visual = draft.project.tracks
    .flatMap((t) => (t.kind === "video" || t.kind === "graphics" ? t.clips : []))
    .sort((a, b) => a.startMs - b.startMs);
  assert.equal(visual[0].startMs, 0);
  for (let i = 1; i < visual.length; i += 1) {
    assert.equal(
      visual[i].startMs,
      visual[i - 1].startMs + visual[i - 1].durationMs,
      `gap before ${visual[i].id}`,
    );
  }
});

check("narration and captions are generated per beat", () => {
  const draft = buildDraftFromPlan(PLAN, META);
  const voice = draft.project.tracks.find((t) => t.id === "t-voice");
  const captions = draft.project.tracks.find((t) => t.id === "t-caption");
  assert.equal(voice.clips.length, 3);
  assert.equal(captions.clips.length, 3);
  // The caption starts after the lead-in on beat one, not at zero.
  const first = captions.clips.find((c) => c.beatId === "beat-01");
  assert.equal(first.startMs, LEAD_IN_MS);
});

check("the project id is deterministic for one plan", () => {
  assert.equal(draftProjectId(PLAN, META), draftProjectId(PLAN, META));
  assert.notEqual(
    draftProjectId(PLAN, META),
    draftProjectId(PLAN, { ...META, generatedAt: "2026-09-11T12:00:00.000Z" }),
  );
});

check("generation metadata records the preference set", () => {
  const withPrefs = buildDraftFromPlan(PLAN, {
    ...META,
    preferenceSetVersion: 1,
    preferenceKeysSupplied: ["static_visual_duration", "caption_correction"],
    preferenceKeysApplied: ["static_visual_duration"],
  });
  assert.equal(withPrefs.metadata.preferenceSetVersion, 1);
  assert.equal(withPrefs.metadata.preferenceKeysSupplied.length, 2);
  assert.match(describeDraftOrigin(withPrefs.metadata), /preference set v1 \(2 preferences\)/);
  assert.match(describeDraftOrigin(META), /no learned preferences/);
});

/* ═══════════════════════════════ scorecard ═════════════════════════════════ */

section("Scorecard");

check("an untouched approval scores 100% retention", () => {
  const p = project([5000, 5000]);
  const card = buildScorecard(p, p, diffEditorProjects(p, p));
  assert.equal(card.retentionRatio, 1);
  assert.match(card.headline, /Approved unchanged/);
});

check("a heavily edited approval reports what changed", () => {
  const generated = project([6000, 6000, 6000]);
  const approved = project([3000, 6000, 6000]);
  const card = buildScorecard(
    generated,
    approved,
    diffEditorProjects(generated, approved),
  );
  assert.ok(card.retentionRatio < 1);
  const labels = card.lines.map((l) => l.label);
  assert.ok(labels.includes("Clips retained"));
  assert.ok(labels.includes("Clips shortened"));
  assert.ok(labels.includes("Clips moved"), "shifting a clip's start must show");
  assert.match(card.headline, /of the generated cut was kept/);
});

check("scorecard numbers agree with the diff they came from", () => {
  const generated = project([6000, 6000, 6000]);
  const approved = project([3000, 3000, 3000]);
  const diff = diffEditorProjects(generated, approved);
  const card = buildScorecard(generated, approved, diff);
  const shortened = card.lines.find((l) => l.label === "Clips shortened");
  assert.equal(Number(shortened.value), diff.summary.clipsShortened);
});

/* ══════════════════════════════════ result ═════════════════════════════════ */

process.stdout.write(
  `\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);
process.exit(failures ? 1 : 0);
