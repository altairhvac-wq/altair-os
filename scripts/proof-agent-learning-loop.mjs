/**
 * End-to-end proof of the agent learning loop.
 *
 * ===================== WHAT IT PROVES =====================
 *   1. Fixture sessions (clearly labelled, never mixed with real history)
 *      produce a preference set through the REAL builder.
 *   2. One session is not enough — the same builder returns nothing.
 *   3. The agent platform's REAL `content.draft_video_plan` handler runs twice:
 *      Draft A with no preference file, Draft B with the generated one.
 *   4. Draft B's prompt contains the guidance; Draft A's does not.
 *   5. Both drafts record what they were given.
 *   6. Both plans become editable Studio projects through the real adapter,
 *      and the diff between them is computed deterministically.
 *
 * ===================== FIXTURES ARE NOT OPERATOR HISTORY =====================
 * The sessions below are constructed here, in this file, and never written to
 * the browser store an operator's real approvals live in. Manufacturing
 * evidence to clear a threshold would corrupt the one dataset the whole system
 * depends on; borrowing a synthetic one to test the plumbing does not.
 *
 * No paid model is called — the platform side runs on its FakeModelProvider.
 *
 * Run: npm run proof:agent-loop
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { buildPreferenceSetFile } from "@/shared/lib/video-editor/preference-set";
import { approveSession, createSession } from "@/shared/lib/video-editor/session";
import { buildDraftFromPlan } from "@/shared/lib/video-editor/draft-from-plan";
import { diffEditorProjects, describeDiffEntry } from "@/shared/lib/video-editor/diff";
import { buildScorecard } from "@/shared/lib/video-editor/scorecard";
import { DEFAULT_LEARNING_THRESHOLDS } from "@/shared/types/edit-learning";

const PLATFORM = "C:/Users/User/Desktop/Altair-Agents/Altair-agent-platform";
const OUT_DIR = path.resolve("ui-audit/video-editor/learning-loop-proof");

const SERIES = "How HVAC Actually Works";
const FORMAT = "short_narrated_video";

fs.mkdirSync(OUT_DIR, { recursive: true });

function line(text = "") {
  process.stdout.write(`${text}\n`);
}

/* ── 1. Fixture sessions ─────────────────────────────────────────────────── */

/** A project of N visual clips, each `durationMs` long, laid end to end. */
function projectOf(durations, idPrefix = "c") {
  let cursor = 0;
  const clips = durations.map((durationMs, i) => {
    const clip = {
      id: `${idPrefix}${i}`,
      kind: "slide",
      assetId: `slide-${i}`,
      label: `Shot ${i + 1}`,
      startMs: cursor,
      durationMs,
    };
    cursor += durationMs;
    return clip;
  });
  return {
    id: "fixture",
    title: "Fixture",
    width: 1920,
    height: 1080,
    fps: 30,
    version: 1,
    tracks: [
      { id: "t-video", kind: "video", name: "VIDEO 1", clips },
      { id: "t-caption", kind: "caption", name: "CAPTIONS", clips: [] },
      { id: "t-voice", kind: "voice", name: "VOICEOVER", clips: [] },
    ],
  };
}

/**
 * FIXTURE sessions. Every one shortens the bot's 6.2s stills to 3.4s and
 * replaces the opening shot — a consistent, obviously-synthetic signal, so the
 * preference that comes out is traceable to this file and to nothing else.
 */
function fixtureSessions(count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const generated = projectOf([6200, 6200, 6200, 6200]);
    const approved = {
      ...projectOf([3400, 3400, 3400, 3400]),
      tracks: projectOf([3400, 3400, 3400, 3400]).tracks.map((t) =>
        t.id === "t-video"
          ? {
              ...t,
              clips: t.clips.map((c, idx) =>
                idx === 0 ? { ...c, assetId: "operator-chosen-open" } : c,
              ),
            }
          : t,
      ),
    };
    const session = createSession({
      id: `FIXTURE-${i}`,
      projectId: "fixture",
      generatedProjectSnapshot: generated,
      generatedBy: "content.draft_video_plan.plan@v1",
      startedAt: "2026-09-10T00:00:00.000Z",
      scope: { series: SERIES, format: FORMAT },
    });
    out.push(approveSession(session, approved, "2026-09-10T00:10:00.000Z"));
  }
  return out;
}

line("\n=== 1. Evidence threshold ===");

const oneSession = buildPreferenceSetFile(fixtureSessions(1), {
  series: SERIES,
  format: FORMAT,
  generatedAt: "2026-09-10T12:00:00.000Z",
});
line(
  `  1 session  -> ${oneSession.suppliedKeys.length} preferences, guidance ${oneSession.guidance === null ? "null" : "present"}`,
);
if (oneSession.guidance !== null) {
  throw new Error("PROOF FAILED: one session produced usable guidance");
}

const FIXTURE_COUNT = 9;
const file = buildPreferenceSetFile(fixtureSessions(FIXTURE_COUNT), {
  series: SERIES,
  format: FORMAT,
  generatedAt: "2026-09-10T12:00:00.000Z",
});
line(
  `  ${FIXTURE_COUNT} sessions -> ${file.suppliedKeys.length} preferences: ${file.suppliedKeys.join(", ")}`,
);
line(
  `  thresholds: ${DEFAULT_LEARNING_THRESHOLDS.minSessions} sessions, ${Math.round(DEFAULT_LEARNING_THRESHOLDS.minConfidence * 100)}% confidence`,
);
if (file.guidance === null) {
  throw new Error(`PROOF FAILED: ${FIXTURE_COUNT} sessions produced no guidance`);
}

const prefsPath = path.join(OUT_DIR, "editing-preferences.json");
fs.writeFileSync(prefsPath, JSON.stringify(file, null, 2), "utf8");
line(`  wrote ${prefsPath}`);

/* ── 2. The real agent, twice ────────────────────────────────────────────── */

line("\n=== 2. Director plans Draft A and Draft B ===");

const platformOut = path.join(OUT_DIR, "platform-drafts.json");
try {
  execFileSync(
    "npx",
    ["vitest", "run", "src/agents/content/learning-loop.proof.test.ts"],
    {
      cwd: PLATFORM,
      env: {
        ...process.env,
        ALTAIR_PROOF_PREFERENCES: prefsPath,
        ALTAIR_PROOF_OUT: platformOut,
      },
      stdio: "pipe",
      shell: true,
    },
  );
} catch (error) {
  process.stdout.write(String(error.stdout ?? ""));
  process.stdout.write(String(error.stderr ?? ""));
  throw new Error("PROOF FAILED: the platform proof test did not pass");
}

const platformResult = JSON.parse(fs.readFileSync(platformOut, "utf8"));
line(`  Draft A  status=${platformResult.draftA.status}  sawGuidance=${platformResult.draftA.sawGuidance}`);
line(
  `           preferenceSetVersion=${String(platformResult.draftA.generatedWith?.preferenceSetVersion)}`,
);
line(`  Draft B  status=${platformResult.draftB.status}  sawGuidance=${platformResult.draftB.sawGuidance}`);
line(
  `           preferenceSetVersion=${String(platformResult.draftB.generatedWith?.preferenceSetVersion)}, keys=${(platformResult.draftB.generatedWith?.preferenceKeysSupplied ?? []).join(", ")}`,
);

if (platformResult.draftA.sawGuidance !== false) {
  throw new Error("PROOF FAILED: Draft A saw preference guidance");
}
if (platformResult.draftB.sawGuidance !== true) {
  throw new Error("PROOF FAILED: Draft B did not see preference guidance");
}
if (platformResult.draftB.generatedWith?.preferenceSetVersion !== 1) {
  throw new Error("PROOF FAILED: Draft B did not record the preference version");
}

line("\n  --- what the Director was actually shown ---");
for (const l of String(platformResult.draftB.guidanceShown).split("\n").slice(0, 12)) {
  line(`  | ${l}`);
}

/* ── 3. Both plans become editable Studio projects ───────────────────────── */

line("\n=== 3. Plans become editable drafts ===");

function toDraft(planResult, label) {
  const plan = planResult.plan;
  return buildDraftFromPlan(
    {
      topic: plan.topic,
      format: plan.format,
      hook: plan.hook,
      beats: plan.beats,
      cta: plan.cta,
      targetDurationSeconds: plan.targetDurationSeconds,
      series: SERIES,
    },
    {
      agentVersion: plan.generatedWith?.agentVersion ?? "unknown",
      generatedAt: `2026-09-10T12:0${label === "A" ? "1" : "2"}:00.000Z`,
      preferenceSetVersion: plan.generatedWith?.preferenceSetVersion ?? undefined,
      preferenceKeysSupplied: plan.generatedWith?.preferenceKeysSupplied ?? undefined,
    },
  );
}

const draftA = toDraft(platformResult.draftA, "A");
const draftB = toDraft(platformResult.draftB, "B");

for (const [label, draft] of [["A", draftA], ["B", draftB]]) {
  line(
    `  Draft ${label}: ${draft.summary.beats} beats, ${(draft.summary.expectedMasterMs / 1000).toFixed(1)}s master, id=${draft.project.id}`,
  );
  const clips = draft.project.tracks.reduce((n, t) => n + t.clips.length, 0);
  line(`            ${clips} clips across ${draft.project.tracks.length} tracks`);
}

/* ── 4. A human edit, and the evidence it produces ───────────────────────── */

line("\n=== 4. A human edit on Draft B, measured ===");

// Shorten every visual and replace the opening asset — the same corrections
// the fixtures encode, applied once to a REAL generated draft.
//
// The opening shot is the earliest clip ACROSS the visual tracks, not index 0
// of each of them. Getting that wrong reported two assets replaced when one
// was intended, which is exactly the kind of quiet miscount this whole system
// exists to avoid — including in its own proof.
const openingClipId = draftB.project.tracks
  .filter((t) => t.kind === "video" || t.kind === "graphics")
  .flatMap((t) => t.clips)
  .sort((a, b) => a.startMs - b.startMs)[0]?.id;

const edited = {
  ...draftB.project,
  tracks: draftB.project.tracks.map((t) => {
    if (t.kind !== "video" && t.kind !== "graphics") return t;
    return {
      ...t,
      clips: t.clips.map((c) => ({
        ...c,
        durationMs: Math.max(1200, Math.round(c.durationMs * 0.6)),
        ...(c.id === openingClipId ? { assetId: "operator-chosen-open" } : {}),
      })),
    };
  }),
};

const diff = diffEditorProjects(draftB.project, edited);
const card = buildScorecard(draftB.project, edited, diff);
line(`  ${card.headline}`);
for (const l of card.lines) line(`    ${l.label}: ${l.value}`);
line("  first five diff entries:");
for (const entry of diff.entries.slice(0, 5)) {
  line(`    - ${describeDiffEntry(entry)}`);
}

if (diff.summary.totalChanges === 0) {
  throw new Error("PROOF FAILED: the edit produced no measurable difference");
}

/* ── 5. Write the proof artifact ─────────────────────────────────────────── */

const proof = {
  generatedAt: "2026-09-10T12:00:00.000Z",
  thresholds: DEFAULT_LEARNING_THRESHOLDS,
  fixtureSessions: FIXTURE_COUNT,
  fixtureNote:
    "Synthetic sessions built by this script. Never written to the operator session store.",
  preferenceSet: file.set,
  suppliedKeys: file.suppliedKeys,
  draftA: {
    sawGuidance: platformResult.draftA.sawGuidance,
    generatedWith: platformResult.draftA.generatedWith,
    projectId: draftA.project.id,
    beats: draftA.summary.beats,
    expectedMasterMs: draftA.summary.expectedMasterMs,
  },
  draftB: {
    sawGuidance: platformResult.draftB.sawGuidance,
    generatedWith: platformResult.draftB.generatedWith,
    projectId: draftB.project.id,
    beats: draftB.summary.beats,
    expectedMasterMs: draftB.summary.expectedMasterMs,
  },
  humanEditOnDraftB: {
    headline: card.headline,
    retentionRatio: card.retentionRatio,
    summary: diff.summary,
    entries: diff.entries.map(describeDiffEntry),
  },
};

const proofPath = path.join(OUT_DIR, "proof.json");
fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2), "utf8");

line(`\n=== PROOF COMPLETE ===`);
line(`  ${proofPath}`);
line(`  ${prefsPath}`);
line(`  ${platformOut}`);
