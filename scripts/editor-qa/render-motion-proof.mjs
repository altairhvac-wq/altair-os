/**
 * Render a short proof: several camera moves and every transition kind, through
 * the real compositor, then measure the file that comes out.
 *
 * ==================== WHY A SHORT ONE ====================
 * The whole practice film is 5:50 and every moving shot costs real encode time.
 * The claim under test is not "the film renders" — it already did — but "a
 * camera move and a per-cut transition authored in the editor arrive in the
 * master, and the master is exactly as long as the timeline". Six shots prove
 * that as well as thirty-six do, and can be looked at frame by frame.
 *
 * It goes through `compileProjectToTimeline` and `run-editor-render-job.mjs` —
 * the same compile and the same worker an editor render uses. Nothing here
 * calls ffmpeg to make the picture; ffprobe and one frame-extraction pass are
 * used afterwards to MEASURE it.
 *
 * Run: node --import ./scripts/video-editor-register.mjs \
 *        scripts/editor-qa/render-motion-proof.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

import { compileProjectToTimeline } from "@/shared/lib/video-editor/compile";
import { audioRefsFrom } from "@/shared/lib/video-editor/demo-project";
import { loadPracticeEpisode } from "@/shared/lib/video-editor/practice-project";
import { presetMotion } from "@/shared/lib/video-editor/motion";
import { canQueue } from "@/shared/lib/video-editor/render-job";
import { clipEndMs } from "@/shared/types/video-editor";

import { assetIdsInJob, stageAssets } from "../practice/stage-frames.mjs";

const TOOL = "C:/Users/User/Desktop/AltairDemoTool";
const JOBS = `${TOOL}/production/slide-system/jobs`;
const LIB = "D:/Altair-HVAC-Library";
const OS_ROOT = "C:/Users/User/Desktop/altair-os";
const OUT = `${OS_ROOT}/ui-audit/video-editor/stabilization`;
const FRAMES = `${OUT}/proof-frames`;
const JOB_ID = "job-editor-motion-proof";
const SHOTS = 6;

const episode = loadPracticeEpisode();

/* ── Trim to the first few shots ──────────────────────────────────────────── */
const visualKinds = new Set(["video", "graphics", "text"]);
const visual = episode.project.tracks
  .filter((t) => visualKinds.has(t.kind))
  .flatMap((t) => t.clips)
  .sort((a, b) => a.startMs - b.startMs);
const untilMs = clipEndMs(visual[SHOTS - 1]);

/**
 * The edit under test, written the way the inspector writes it.
 *
 * One shot of each kind of move, and one of each transition, so a single file
 * answers "does the master do what the preview did" for all of them.
 */
const PLAN = [
  { motion: null, transition: null },
  { motion: ["pushIn", 1], transition: ["crossfade", 400] },
  { motion: ["panLeft", 1], transition: ["fadeBlack", 500] },
  { motion: ["kenBurns", 1], transition: ["slideLeft", 400] },
  { motion: ["pullOut", 0.8], transition: ["cut", 0] },
  { motion: ["slowZoom", 1], transition: ["crossfade", 300] },
];

const order = new Map(visual.slice(0, SHOTS).map((clip, i) => [clip.id, i]));

const project = {
  ...episode.project,
  title: `${episode.project.title} — motion proof`,
  tracks: episode.project.tracks.map((track) => ({
    ...track,
    clips: track.clips
      .filter((clip) => clip.startMs >= 0 && clipEndMs(clip) <= untilMs)
      .map((clip) => {
        const index = order.get(clip.id);
        if (index === undefined) return clip;
        const plan = PLAN[index];
        return {
          ...clip,
          ...(plan.motion
            ? { motion: presetMotion(plan.motion[0], plan.motion[1]) }
            : { motion: undefined }),
          ...(plan.transition
            ? { transitionIn: { kind: plan.transition[0], durationMs: plan.transition[1] } }
            : { transitionIn: undefined }),
        };
      }),
  })),
};

const result = compileProjectToTimeline(project, { audio: audioRefsFrom(episode.audio) });

process.stdout.write(
  `\ncompiled: ${String(result.timeline.entries.length)} entries, ` +
    `${(result.expectedOutputMs / 1000).toFixed(3)}s expected\n` +
    `  camera moves: ${String(result.timeline.entries.filter((e) => e.cameraMotion).length)}\n` +
    `  transitions:  ${result.timeline.entries.filter((e) => e.transitionIn).map((e) => e.transitionIn.kind).join(", ")}\n` +
    `  bake scenes:  ${String(result.bakePlan.scenes.length)}\n` +
    `  native:       ${result.nativeProperties.join(", ") || "none"}\n` +
    `  drops:        ${String(result.drops.length)}\n`,
);
for (const d of result.drops) {
  process.stdout.write(`    - ${d.clipLabel}: ${d.property} — ${d.reason.slice(0, 90)}\n`);
}
if (result.errors.length) {
  process.stderr.write(`\nblocked:\n  ${result.errors.join("\n  ")}\n`);
  process.exit(1);
}

const gate = canQueue({
  projectId: project.id,
  allowlist: ["hvac-01", "hvac-04", "compressor-01"],
  compileErrors: result.errors,
});
if (!gate.ok) {
  process.stderr.write(`\nrefused: ${gate.reason}\n`);
  process.exit(1);
}

stageAssets({
  assetIds: assetIdsInJob(result),
  libRoot: LIB,
  slidesOut: `${TOOL}/production/slide-system/slides-${project.id}`,
  pubOut: `${OS_ROOT}/public/studio/${project.id}`,
  log: (m) => process.stdout.write(`  ${m}\n`),
});

mkdirSync(JOBS, { recursive: true });
const jobFile = `${JOBS}/${JOB_ID}.json`;
writeFileSync(
  jobFile,
  JSON.stringify(
    {
      jobId: JOB_ID,
      projectId: project.id,
      projectTitle: project.title,
      requestedAt: "2026-09-11T02:00:00.000Z",
      timeline: result.timeline,
      bakePlan: result.bakePlan,
      drops: result.drops,
      expectedOutputMs: result.expectedOutputMs,
      assetStem: project.id,
    },
    null,
    2,
  ),
  "utf8",
);
process.stdout.write(`\njob -> ${jobFile}\nrunning the worker...\n\n`);

execFileSync("node", [`${TOOL}/production/slide-system/run-editor-render-job.mjs`, jobFile], {
  cwd: TOOL,
  stdio: "inherit",
});

/* ── Measure the file that came out ───────────────────────────────────────── */
const master = `${TOOL}/production/slide-system/out/editor-${project.id}-${JOB_ID}.mp4`;
const probe = JSON.parse(
  execFileSync(
    "ffprobe",
    [
      "-v", "error",
      "-select_streams", "v:0",
      "-show_entries", "stream=nb_frames,r_frame_rate,width,height",
      "-show_entries", "format=duration",
      "-of", "json",
      master,
    ],
    { encoding: "utf8" },
  ),
);
const durationMs = Math.round(Number(probe.format.duration) * 1000);
const deltaMs = durationMs - result.expectedOutputMs;
process.stdout.write(
  `\nmaster: ${master}\n` +
    `  ${probe.streams[0].width}x${probe.streams[0].height} @ ${probe.streams[0].r_frame_rate}, ` +
    `${String(probe.streams[0].nb_frames)} frames\n` +
    `  duration ${String(durationMs)}ms vs timeline ${String(result.expectedOutputMs)}ms — delta ${String(deltaMs)}ms\n`,
);

/* Frames worth looking at: inside each move, and through each transition. */
mkdirSync(FRAMES, { recursive: true });
const shots = [];
for (const entry of result.timeline.entries) {
  const index = entry.stepIndex;
  if (entry.cameraMotion) {
    // Clear of the transition window: a frame taken 200ms into a 400ms
    // dissolve is a blend of two shots, which says nothing about how far the
    // camera has moved.
    const settled = entry.startMs + (entry.transitionIn?.durationMs ?? 0) + 200;
    shots.push({ name: `entry${index}-move-start`, ms: settled });
    shots.push({ name: `entry${index}-move-mid`, ms: (settled + entry.endMs) / 2 });
    shots.push({ name: `entry${index}-move-end`, ms: entry.endMs - 200 });
  }
  if (entry.transitionIn) {
    const d = entry.transitionIn.durationMs;
    for (const [label, fraction] of [["25", 0.25], ["50", 0.5], ["75", 0.75]]) {
      shots.push({
        name: `entry${index}-${entry.transitionIn.kind}-${label}`,
        ms: entry.startMs + d * fraction,
      });
    }
  }
}
for (const shot of shots) {
  execFileSync(
    "ffmpeg",
    [
      "-v", "error", "-y",
      "-ss", (shot.ms / 1000).toFixed(3),
      "-i", master,
      "-frames:v", "1",
      `${FRAMES}/${shot.name}.png`,
    ],
    { stdio: "inherit" },
  );
}
process.stdout.write(`  ${String(shots.length)} frames -> ${FRAMES}\n`);

writeFileSync(
  `${OUT}/motion-proof.json`,
  JSON.stringify(
    {
      master,
      expectedOutputMs: result.expectedOutputMs,
      durationMs,
      deltaMs,
      frames: Number(probe.streams[0].nb_frames),
      entries: result.timeline.entries.map((e) => ({
        stepIndex: e.stepIndex,
        startMs: e.startMs,
        endMs: e.endMs,
        screenshotPath: e.screenshotPath,
        cameraMotion: e.cameraMotion ?? null,
        transitionIn: e.transitionIn ?? null,
      })),
      drops: result.drops,
      nativeProperties: result.nativeProperties,
      bakedProperties: result.bakedProperties,
    },
    null,
    2,
  ),
  "utf8",
);
process.stdout.write(`  summary -> ${OUT}/motion-proof.json\n`);
