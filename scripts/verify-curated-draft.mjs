/**
 * A curated plan becomes a project with REAL assets on it.
 *
 * ===================== WHY THIS IS ITS OWN SUITE =====================
 * `verify-video-editor.mjs` proves the timeline arithmetic. `verify-edit-
 * learning.mjs` proves the diff. Neither would notice the failure this phase
 * existed to fix: a generated draft arriving with narration, timing, and an
 * empty visual layer. That failure is not arithmetic and not a diff — it is a
 * field that was never populated, and every existing check passed while it was
 * happening.
 *
 * So this suite asks one question in a dozen ways: does a curated plan produce
 * clips that name real files, and does an UNcurated plan still work?
 *
 * These import the REAL shipped modules — Node 24 runs the `.ts` directly and
 * `video-editor-register.mjs` resolves the `@/` alias.
 *
 * Run: npm run verify:curated-draft
 */
import assert from "node:assert/strict";

import { buildDraftFromPlan } from "@/shared/lib/video-editor/draft-from-plan";
import {
  confidenceBand,
  describeVisualIntent,
  isPendingMode,
  isSafePreviewUrl,
  parseStudioBeatVisual,
  portableAssetIdProblem,
  VISUAL_MODES,
  VISUAL_MODE_LABEL,
} from "@/shared/types/visual-selection";
import { diffEditorProjects } from "@/shared/lib/video-editor/diff";
import { trackAccepts } from "@/shared/types/video-editor";

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

const META = {
  agentVersion: "content.draft_video_plan@test",
  generatedAt: "2026-09-10T12:00:00.000Z",
};

function visual(over = {}) {
  return {
    mode: "real_asset",
    assetId: "raw-footage/hvac-trades/van.mp4",
    previewUrl: "/studio/library/raw-footage-hvac-trades-van.jpg",
    intent: {
      purpose: "establish",
      subject: "trade_work",
      mustShow: ["van"],
      mediaPreference: null,
    },
    reason: "matches 2 requirement terms (hvac, van)",
    confidence: 0.73,
    candidates: [
      {
        assetId: "raw-footage/hvac-trades/van.mp4",
        previewUrl: "/studio/library/raw-footage-hvac-trades-van.jpg",
        score: 5,
        description: "A service van in a driveway",
      },
      {
        assetId: "raw-footage/hvac-trades/van-b.mp4",
        previewUrl: null,
        score: 4,
        description: null,
      },
    ],
    warnings: [],
    pendingRequirement: null,
    ...over,
  };
}

function plan(beats) {
  return {
    topic: "A curated plan",
    format: "short_narrated_video",
    hook: "A hook.",
    beats,
  };
}

function beat(over = {}) {
  return {
    narration: "Some narration that takes a couple of seconds to say out loud.",
    visualDirection: "An HVAC van in a driveway",
    caption: "A caption",
    ...over,
  };
}

/* ════════════════════ 1. the assets actually arrive ═══════════════════════ */

section("A curated plan produces clips that name real files");

check("a curated beat puts its asset id on the clip", () => {
  const draft = buildDraftFromPlan(plan([beat({ visual: visual() })]), META);
  const clips = draft.project.tracks.flatMap((t) => t.clips);
  const video = clips.find((c) => c.id === "clip-beat-01");
  assert.ok(video, "no visual clip was produced");
  assert.equal(video.assetId, "raw-footage/hvac-trades/van.mp4");
});

check("an UNcurated beat still produces a clip, with no asset", () => {
  // Every plan written before curation existed must keep working, and the
  // honest description of one is a clip with no asset — not a missing clip.
  const draft = buildDraftFromPlan(plan([beat()]), META);
  const video = draft.project.tracks
    .flatMap((t) => t.clips)
    .find((c) => c.id === "clip-beat-01");
  assert.ok(video, "an uncurated beat produced no clip at all");
  assert.equal(video.assetId, undefined);
  assert.equal(draft.summary.beatsWithAsset, 0);
  assert.equal(draft.summary.beatsPending, 0);
});

check("a preview URL becomes a frame, keyed by clip id", () => {
  const draft = buildDraftFromPlan(plan([beat({ visual: visual() })]), META);
  assert.equal(
    draft.frames["clip-beat-01"],
    "/studio/library/raw-footage-hvac-trades-van.jpg",
  );
});

check("an asset with no exported thumbnail contributes no frame", () => {
  // A fabricated preview would be a lie about what is on this machine.
  const draft = buildDraftFromPlan(
    plan([beat({ visual: visual({ previewUrl: null }) })]),
    META,
  );
  assert.deepEqual(draft.frames, {});
  assert.equal(
    draft.project.tracks.flatMap((t) => t.clips).find((c) => c.id === "clip-beat-01")
      .assetId,
    "raw-footage/hvac-trades/van.mp4",
    "the asset must still be chosen even with no picture for it",
  );
});

check("the clip kind follows the ASSET, not the scene kind", () => {
  // A `b_roll` beat answered with an .mp4 is footage. Calling it a slide makes
  // the compositor hold a still where a clip belongs.
  const video = buildDraftFromPlan(
    plan([beat({ kind: "b_roll", visual: visual() })]),
    META,
  ).project.tracks
    .flatMap((t) => t.clips)
    .find((c) => c.id === "clip-beat-01");
  assert.equal(video.kind, "video");

  const still = buildDraftFromPlan(
    plan([
      beat({
        kind: "b_roll",
        visual: visual({ assetId: "altair/dispatch/overview.png" }),
      }),
    ]),
    META,
  ).project.tracks
    .flatMap((t) => t.clips)
    .find((c) => c.id === "clip-beat-01");
  assert.equal(still.kind, "image");
});

check("every clip lands on a track that accepts it", () => {
  // A diagram_graphic beat routes to GRAPHICS, which takes stills only. If
  // curation answered it with an .mp4, the clip has to move rather than be an
  // invalid placement the editor would refuse from a human.
  const draft = buildDraftFromPlan(
    plan([
      beat({ kind: "diagram_graphic", visual: visual() }),
      beat({ kind: "diagram_graphic", visual: visual({ assetId: "graphics/cycle.png" }) }),
      beat({ kind: "on_screen_text" }),
      beat({ kind: "b_roll", visual: visual() }),
    ]),
    META,
  );
  for (const track of draft.project.tracks) {
    for (const clip of track.clips) {
      assert.ok(
        trackAccepts(track.kind, clip.kind),
        `${track.kind} does not accept a ${clip.kind} clip (${clip.id})`,
      );
    }
  }
});

/* ════════════════════ 2. gaps are named, never blank ═════════════════════ */

section("A gap is a named requirement, not a blank");

check("a pending beat carries its requirement through to the draft", () => {
  const draft = buildDraftFromPlan(
    plan([
      beat({
        visual: visual({
          mode: "pending_generation",
          assetId: null,
          previewUrl: null,
          pendingRequirement:
            "A shoebox overflowing with receipts. It must visibly contain: receipt.",
        }),
      }),
    ]),
    META,
  );
  assert.equal(draft.summary.beatsPending, 1);
  assert.equal(draft.summary.beatsWithAsset, 0);
  const record = draft.visuals["clip-beat-01"];
  assert.ok(record.pendingRequirement.includes("receipt"));
  assert.ok(isPendingMode(record.mode));
});

check("a draft reports how much of itself is actually shot", () => {
  const draft = buildDraftFromPlan(
    plan([
      beat({ visual: visual() }),
      beat({ visual: visual({ assetId: "altair/dispatch/overview.png" }) }),
      beat({ visual: visual({ mode: "pending_capture", assetId: null, previewUrl: null }) }),
    ]),
    META,
  );
  assert.equal(draft.summary.beats, 3);
  assert.equal(draft.summary.beatsWithAsset, 2);
  assert.equal(draft.summary.beatsPending, 1);
});

/* ════════════════════ 3. the boundary holds on arrival ═══════════════════ */

section("A document is not trusted because of where it came from");

for (const [id, why] of [
  ["D:/Altair-Asset-Library/van.mp4", "drive letter"],
  ["C:\\library\\van.mp4", "drive letter"],
  ["/mnt/library/van.mp4", "absolute"],
  ["raw-footage/../../etc/passwd", "parent-directory"],
  ["file:///D:/library/van.mp4", "absolute"],
  ["", "empty"],
]) {
  check(`an arriving asset id that ${why} is refused (${id || "empty string"})`, () => {
    assert.notEqual(portableAssetIdProblem(id), null);
    const parsed = parseStudioBeatVisual(visual({ assetId: id }));
    assert.equal(parsed.visual.assetId, null, "the unportable id was kept");
    assert.ok(parsed.problems.length > 0, "the refusal was silent");
  });
}

check("a library-relative id is accepted", () => {
  assert.equal(portableAssetIdProblem("raw-footage/hvac-trades/van.mp4"), null);
});

check("a preview URL outside the library prefix is refused", () => {
  // A document arriving from a file must not be able to point the operator's
  // browser at an arbitrary host.
  for (const url of [
    "https://example.test/tracker.jpg",
    "/etc/passwd",
    "/studio/library/../../secret.jpg",
    "//evil.test/x.jpg",
  ]) {
    assert.equal(isSafePreviewUrl(url), false, `${url} was accepted`);
    const parsed = parseStudioBeatVisual(visual({ previewUrl: url }));
    assert.equal(parsed.visual.previewUrl, null, `${url} survived parsing`);
  }
  assert.equal(isSafePreviewUrl("/studio/library/a-b-c.jpg"), true);
});

check("an unportable asset id does not take the draft down with it", () => {
  // A refusal degrades one beat. It must not throw, because a throw here would
  // lose an otherwise good draft to one bad field.
  const draft = buildDraftFromPlan(
    plan([
      beat({ visual: visual({ assetId: "D:/private/van.mp4" }) }),
      beat({ visual: visual() }),
    ]),
    META,
  );
  assert.equal(draft.summary.beats, 2);
  assert.equal(draft.summary.beatsWithAsset, 1);
  assert.ok(
    draft.summary.visualProblems.some((p) => p.includes("beat 1")),
    "the refusal was not reported",
  );
});

check("a real_asset mode with no readable asset degrades rather than lying", () => {
  const parsed = parseStudioBeatVisual(visual({ assetId: null }));
  assert.equal(parsed.visual.mode, "pending_capture");
  assert.ok(parsed.problems.some((p) => p.includes("claims a library asset")));
});

check("an unknown mode from a newer platform build is handled, not crashed on", () => {
  const parsed = parseStudioBeatVisual(visual({ mode: "holographic_projection" }));
  assert.ok(VISUAL_MODES.includes(parsed.visual.mode));
  assert.ok(parsed.problems.some((p) => p.includes("does not know")));
});

check("a beat with no visual at all parses to null, not to a fake one", () => {
  // "Never curated" and "curated and found nothing" need different answers.
  assert.equal(parseStudioBeatVisual(undefined), null);
  assert.equal(parseStudioBeatVisual("nonsense"), null);
});

/* ════════════════════ 4. a swap is learning evidence ════════════════════ */

section("Swapping a chosen asset is a measurable edit");

check("replacing an asset produces an asset_replaced diff", () => {
  const generated = buildDraftFromPlan(plan([beat({ visual: visual() })]), META).project;
  const approved = {
    ...generated,
    tracks: generated.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) =>
        clip.id === "clip-beat-01"
          ? { ...clip, assetId: "raw-footage/hvac-trades/van-b.mp4" }
          : clip,
      ),
    })),
  };
  const diff = diffEditorProjects(generated, approved);
  const entry = diff.entries.find((e) => e.type === "asset_replaced");
  assert.ok(entry, "a swap produced no asset_replaced entry");
  assert.equal(entry.before, "raw-footage/hvac-trades/van.mp4");
  assert.equal(entry.after, "raw-footage/hvac-trades/van-b.mp4");
});

check("filling a pending beat reads as an asset being added, not a cut change", () => {
  const generated = buildDraftFromPlan(
    plan([beat({ visual: visual({ mode: "pending_generation", assetId: null }) })]),
    META,
  ).project;
  const approved = {
    ...generated,
    tracks: generated.tracks.map((track) => ({
      ...track,
      clips: track.clips.map((clip) =>
        clip.id === "clip-beat-01"
          ? { ...clip, assetId: "raw-footage/hvac-trades/van.mp4" }
          : clip,
      ),
    })),
  };
  const diff = diffEditorProjects(generated, approved);
  const entry = diff.entries.find((e) => e.type === "asset_replaced");
  assert.ok(entry, "filling a gap produced no diff entry");
  assert.equal(entry.before, null);
  assert.equal(entry.after, "raw-footage/hvac-trades/van.mp4");
  assert.ok(
    !diff.entries.some((e) => e.type === "clip_duration_changed"),
    "choosing a picture must not read as a timing decision",
  );
});

/* ════════════════════ 5. the vocabulary agrees ══════════════════════════ */

section("The two repositories agree about one document");

check("every mode is labelled, and pending is a strict subset", () => {
  for (const mode of VISUAL_MODES) {
    assert.ok(VISUAL_MODE_LABEL[mode], `${mode} has no label`);
  }
  assert.deepEqual(VISUAL_MODES.filter(isPendingMode), [
    "pending_capture",
    "pending_generation",
  ]);
});

check("confidence bands are ordered and total", () => {
  assert.equal(confidenceBand(0.95), "strong");
  assert.equal(confidenceBand(0.7), "strong");
  assert.equal(confidenceBand(0.69), "worth a look");
  assert.equal(confidenceBand(0.5), "worth a look");
  assert.equal(confidenceBand(0.49), "weak");
  assert.equal(confidenceBand(0), "weak");
});

check("an intent renders as one readable line", () => {
  assert.equal(
    describeVisualIntent({
      purpose: "evidence",
      subject: "product_ui",
      mustShow: ["altair"],
      mediaPreference: "still",
    }),
    "evidence / product ui (still) — must show altair",
  );
});

check("a confidence outside 0..1 is clamped rather than displayed", () => {
  assert.equal(parseStudioBeatVisual(visual({ confidence: 4 })).visual.confidence, 1);
  assert.equal(parseStudioBeatVisual(visual({ confidence: -2 })).visual.confidence, 0);
  assert.equal(parseStudioBeatVisual(visual({ confidence: "0.5" })).visual.confidence, 0);
});

/* ════════════════════ 6. determinism ════════════════════════════════════ */

section("Determinism");

check("the same curated plan builds the same project twice", () => {
  const p = plan([beat({ visual: visual() }), beat({ visual: visual() })]);
  assert.deepEqual(buildDraftFromPlan(p, META), buildDraftFromPlan(p, META));
});

/* ════════════════════════════════ result ═══════════════════════════════════ */

process.stdout.write(
  `\n${checks - failures}/${checks} checks passed${failures ? ` — ${failures} FAILED` : ""}\n`,
);
process.exit(failures ? 1 : 0);
