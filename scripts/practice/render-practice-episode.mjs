/**
 * Compile the practice episode and hand it to the real render worker.
 *
 * ==================== IT DOES NOT BYPASS THE COMPOSITOR ====================
 * This writes a render JOB — a project id, a compiled timeline and a bake plan
 * — and then runs `run-editor-render-job.mjs`, the same worker every editor
 * render goes through. Nothing here calls ffmpeg, chooses a flag, or names a
 * binary. A proof that skipped the compositor would prove nothing about the
 * pipeline it was supposed to be proving.
 *
 * The compile is the real one too: `compileProjectToTimeline` decides the cut
 * points, reports what it had to drop, and refuses a timeline the renderer
 * cannot express.
 *
 * Run: node --import ./scripts/video-editor-register.mjs \
 *        scripts/practice/render-practice-episode.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

import { compileProjectToTimeline } from "@/shared/lib/video-editor/compile";
import { audioRefsFrom } from "@/shared/lib/video-editor/demo-project";
import { loadPracticeEpisode } from "@/shared/lib/video-editor/practice-project";
import { canQueue } from "@/shared/lib/video-editor/render-job";

import { assetIdsInJob, stageAssets } from "./stage-frames.mjs";

const TOOL = "C:/Users/User/Desktop/AltairDemoTool";
const JOBS = `${TOOL}/production/slide-system/jobs`;
const LIB = "D:/Altair-HVAC-Library";
const OS_ROOT = "C:/Users/User/Desktop/altair-os";
const ALLOWLIST = ["hvac-01", "hvac-04", "compressor-01"];

const episode = loadPracticeEpisode();

// No global transition length: each clip carries its own, and the compiler
// reads them. The snapshot's 260ms now lives on the clips themselves.
const result = compileProjectToTimeline(episode.project, {
  audio: audioRefsFrom(episode.audio),
});

process.stdout.write(
  `compiled: ${String(result.timeline.entries.length)} entries, ` +
    `${(result.expectedOutputMs / 1000 / 60).toFixed(2)} min expected\n` +
    `  bake scenes: ${String(result.bakePlan.scenes.length)}\n` +
    `  drops: ${String(result.drops.length)}\n`,
);
for (const d of result.drops.slice(0, 8)) {
  process.stdout.write(`    - ${d.clipLabel}: ${d.property} — ${d.reason.slice(0, 90)}\n`);
}
if (result.drops.length > 8) {
  process.stdout.write(`    ...and ${String(result.drops.length - 8)} more\n`);
}

const gate = canQueue({
  projectId: episode.project.id,
  allowlist: ALLOWLIST,
  compileErrors: result.errors,
});
if (!gate.ok) {
  process.stderr.write(`\nrefused: ${gate.reason}\n`);
  process.exit(1);
}

/**
 * Every picture the job asks for, put where the job will look for it.
 *
 * The build stages what CURATION chose. By the time someone renders, the
 * timeline may reference something else entirely — the library panel swaps a
 * clip's asset with one patch, and an asset nobody staged composites as
 * `missing:` no matter how right the edit was. Staging from the compiled job
 * rather than from the snapshot is what makes "replace a photograph, then
 * render" work for any of the 229 assets instead of only the 21 curated ones.
 */
stageAssets({
  assetIds: assetIdsInJob(result),
  libRoot: LIB,
  slidesOut: `${TOOL}/production/slide-system/slides-${episode.project.id}`,
  pubOut: `${OS_ROOT}/public/studio/${episode.project.id}`,
  log: (m) => process.stdout.write(`  ${m}\n`),
});

const withAudio = result.timeline.entries.filter((e) => e.audioClip).length;
process.stdout.write(`  narration attached to ${String(withAudio)} of ${String(result.timeline.entries.length)} entries\n`);

const jobId = "job-practice-compressor-01";
const job = {
  jobId,
  projectId: episode.project.id,
  projectTitle: episode.project.title,
  requestedAt: "2026-09-11T00:00:00.000Z",
  timeline: result.timeline,
  bakePlan: result.bakePlan,
  drops: result.drops,
  expectedOutputMs: result.expectedOutputMs,
  assetStem: episode.project.id,
};

mkdirSync(JOBS, { recursive: true });
const jobFile = `${JOBS}/${jobId}.json`;
writeFileSync(jobFile, JSON.stringify(job, null, 2), "utf8");
process.stdout.write(`\njob -> ${jobFile}\nrunning the worker...\n\n`);

execFileSync(
  "node",
  [`${TOOL}/production/slide-system/run-editor-render-job.mjs`, jobFile],
  { cwd: TOOL, stdio: "inherit" },
);
