/**
 * Build the compressor practice episode: a real, editable Studio project.
 *
 * ==================== IT RUNS THE PRODUCTION PATH ====================
 * Nothing here is a mock. The plan is a Director-shaped `content.video_plan`.
 * The asset selections came out of the agent platform's own curation — the same
 * `asset-retrieval` ranking and `visual-curation` continuity rules every other
 * draft goes through, pointed at the new HVAC library. The project is assembled
 * by `buildDraftFromPlan`, the adapter Studio already uses for every generated
 * draft. Narration is real synthesised speech, and every duration below is
 * MEASURED from that audio rather than estimated from a word count.
 *
 * What this script adds is the last mile the automatic path cannot do on its
 * own: synthesising the voice, re-timing the cut to it, rendering the frames
 * that are not photographs, and writing the whole thing out as a committed
 * snapshot so the episode opens from a URL instead of from one browser's
 * localStorage.
 *
 * ==================== WHY A COMMITTED SNAPSHOT ====================
 * Generated drafts live in localStorage, which means they live in exactly one
 * browser and vanish with it. The rendered demo episode is committed instead,
 * and the editor route resolves it on the server. A practice film that has to
 * be re-imported every morning is not a practice film, so this one follows the
 * demo episode's precedent rather than the draft store's.
 *
 * Run: node --import ./scripts/video-editor-register.mjs \
 *        scripts/practice/build-practice-episode.mjs
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { buildDraftFromPlan } from "@/shared/lib/video-editor/draft-from-plan";
import { paceBeat, expectedMasterMs, TRANSITION_MS } from "@/shared/lib/video-editor/pacing";

import { stageAssets } from "./stage-frames.mjs";

const STEM = "compressor-01";
const SERIES = "hvac-fundamentals";

const OS_ROOT = "C:/Users/User/Desktop/altair-os";
const TOOL_SLIDES = "C:/Users/User/Desktop/AltairDemoTool/production/slide-system";
const LIB = "D:/Altair-HVAC-Library";

const PRACTICE = `${OS_ROOT}/shared/lib/video-editor/practice`;
const PUB = `${OS_ROOT}/public/studio/${STEM}`;
const PUB_AUDIO = `${PUB}/audio`;
const SLIDES_OUT = `${TOOL_SLIDES}/slides-${STEM}`;
const AUDIO_OUT = `${TOOL_SLIDES}/audio-${STEM}`;

const PIPER = "C:/Users/User/Desktop/AltairDemoTool/vendor/piper/piper/piper.exe";
const VOICE = "C:/Users/User/Desktop/AltairDemoTool/vendor/piper/piper/en_US-lessac-medium.onnx";

for (const d of [PUB, PUB_AUDIO, SLIDES_OUT, AUDIO_OUT]) mkdirSync(d, { recursive: true });

/* ── 1. The curated plan ──────────────────────────────────────────────────── */

const curated = JSON.parse(readFileSync(`${PRACTICE}/compressor-episode-curated.json`, "utf8"));
const beats = curated.beats;
process.stdout.write(`plan: ${String(beats.length)} beats, "${curated.topic}"\n`);

/* ── 2. Narration, and its measured length ────────────────────────────────── */

/** Milliseconds of audio in a RIFF/WAVE file, from its own header. */
function wavMs(path) {
  const b = readFileSync(path);
  if (b.length < 44 || b.toString("ascii", 0, 4) !== "RIFF") {
    throw new Error(`${path} is not a RIFF wav`);
  }
  let off = 12;
  let byteRate = 0;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "fmt ") byteRate = b.readUInt32LE(off + 16);
    if (id === "data" && byteRate > 0) return Math.round((size / byteRate) * 1000);
    off += 8 + size + (size % 2);
  }
  throw new Error(`${path} has no data chunk`);
}

/** Coarse waveform for the editor's voice track. Display data, not the edit. */
function peaksOf(path, buckets = 96) {
  const b = readFileSync(path);
  let off = 12;
  let dataStart = -1;
  let dataSize = 0;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "data") {
      dataStart = off + 8;
      dataSize = size;
      break;
    }
    off += 8 + size + (size % 2);
  }
  if (dataStart < 0) return [];
  const samples = Math.floor(dataSize / 2);
  const per = Math.max(1, Math.floor(samples / buckets));
  const out = [];
  for (let i = 0; i < buckets; i += 1) {
    let peak = 0;
    for (let j = 0; j < per; j += 8) {
      const idx = dataStart + (i * per + j) * 2;
      if (idx + 1 >= b.length) break;
      const v = Math.abs(b.readInt16LE(idx));
      if (v > peak) peak = v;
    }
    out.push(Math.round((peak / 32768) * 100) / 100);
  }
  return out;
}

const narration = [];
let synthesised = 0;
for (const [i, beat] of beats.entries()) {
  const ref = `narration-${String(i).padStart(3, "0")}`;
  const wav = `${AUDIO_OUT}/${ref}.wav`;
  if (!existsSync(wav)) {
    execFileSync(PIPER, ["--model", VOICE, "--output_file", wav], {
      input: beat.narration,
      stdio: ["pipe", "ignore", "pipe"],
    });
    synthesised += 1;
  }
  const m4a = `${PUB_AUDIO}/${ref}.m4a`;
  if (!existsSync(m4a)) {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-c:a", "aac", "-b:a", "96k", m4a],
      { stdio: ["ignore", "ignore", "pipe"] });
  }
  narration.push({ ref, wav, m4a, fileMs: wavMs(wav), peaks: peaksOf(wav) });
}
const spokenMs = narration.reduce((n, x) => n + x.fileMs, 0);
process.stdout.write(
  `narration: ${String(synthesised)} synthesised, ${String(beats.length)} total, ` +
    `${(spokenMs / 1000).toFixed(1)}s of speech\n`,
);

/* ── 3. The project, from the real adapter ───────────────────────────────── */

const draft = buildDraftFromPlan(
  {
    topic: curated.topic,
    format: curated.format,
    hook: curated.hook,
    objective: curated.objective,
    cta: curated.cta,
    targetDurationSeconds: curated.targetDurationSeconds,
    series: SERIES,
    beats,
    curation: curated.curation,
  },
  {
    agentVersion: "content.draft_video_plan + content.visual_curation@1",
    generatedAt: "2026-09-11T00:00:00.000Z",
    sourcePlanId: "compressor-episode-plan",
  },
);

/* ── 4. Re-time to the audio that actually exists ────────────────────────── */

const paced = beats.map((beat, i) =>
  paceBeat({
    narration: beat.narration,
    isFirstBeat: i === 0,
    isFinalBeat: i === beats.length - 1,
    isSectionCard: beat.kind === "on_screen_text",
    measuredSpeechMs: narration[i].fileMs,
  }),
);

const startAt = [];
let cursor = 0;
for (const p of paced) {
  startAt.push(cursor);
  cursor += p.totalMs;
}
const rawMs = cursor;

/**
 * An assetId with an extension becomes a double-extension when the render
 * worker joins it onto a frames directory and appends `.png`. The librarian
 * index names the file, the project names the ASSET, and here is where the two
 * part company.
 */
const bare = (id) => (typeof id === "string" ? id.replace(/\.[a-z0-9]+$/i, "") : id);

const TRACK_OF = { "t-video": "video", "t-graphics": "graphics", "t-text": "text" };

const visual = [];
const captions = [];
const voice = [];
const cards = [];

for (const [i, beat] of beats.entries()) {
  const beatId = `beat-${String(i + 1).padStart(2, "0")}`;
  const start = startAt[i];
  const p = paced[i];
  const v = beat.visual ?? {};
  const assetId = bare(v.assetId);

  // Which track this beat's visual belongs on, taken from where the adapter
  // actually put it rather than re-deciding it here.
  let trackId = "t-video";
  for (const t of draft.project.tracks) {
    if (t.clips.some((c) => c.id === `clip-${beatId}`)) trackId = t.id;
  }

  // ==================== A RENDERED CARD IS A PICTURE ====================
  // The text track is drawn as LIVE TYPE by both the canvas and the bake: a
  // clip sitting there composites its `text`, never its frame. A card is the
  // other thing — words already drawn into pixels, with a kicker and a rule the
  // bake's plain centred span cannot reproduce — so parking one on the text
  // track composited eight black frames into the film.
  //
  // Graphics is where a picture that is not a photograph belongs, and it is
  // already where the diagram placeholders sit and already render correctly.
  // The text track stays open for live type the operator adds, which has text
  // to draw and so works on exactly the path it was built for.
  if (beat.kind === "on_screen_text") trackId = "t-graphics";

  const clipId = `clip-${beatId}`;

  const isCard = !assetId;
  if (isCard) {
    if (beat.kind === "on_screen_text") {
      cards.push({ id: clipId, type: "text", caption: beat.caption });
    } else {
      cards.push({
        id: clipId,
        type: "placeholder",
        role: v.mode === "diagram" ? "Diagram" : "Supporting image",
        query: beat.visualDirection,
        tags: (v.intent?.mustShow ?? []).concat(["hvac", beat.kind]).slice(0, 6),
        status: v.mode === "diagram" ? "needs a diagram" : String(v.mode ?? "unresolved").replace(/_/g, " "),
      });
    }
  }

  visual.push({
    id: clipId,
    beatId,
    track: TRACK_OF[trackId] ?? "video",
    label: beat.visualDirection.slice(0, 60),
    assetId: assetId ?? null,
    // The preview reads the SAME file the bake does. Pointing the editor at the
    // library's shared thumbnail instead would mean the frame an operator
    // approved and the frame the compositor flattened were two different
    // images — the one divergence this whole staging step exists to prevent.
    frame: `/studio/${STEM}/${assetId ?? clipId}.jpg`,
    startMs: start,
    durationMs: p.totalMs,
    // Movement. Restrained and varied — a push on a cutaway, a drift across a
    // wide, nothing at all on a card. The renderer's own pan is what executes
    // it; this records the intent so the editor can show and change it.
    motion: isCard ? "none" : i % 3 === 0 ? "push-in" : i % 3 === 1 ? "pan" : "hold",
  });

  if (beat.caption?.trim()) {
    captions.push({
      id: `cap-${beatId}`,
      beatId,
      label: beat.caption.slice(0, 40),
      text: beat.caption,
      startMs: start + p.leadInMs,
      durationMs: Math.max(p.speechMs, 600),
    });
  }

  voice.push({
    id: `vo-${beatId}`,
    beatId,
    label: beatId,
    startMs: start,
    durationMs: p.totalMs,
    audioUrl: `/studio/${STEM}/audio/${narration[i].ref}.m4a`,
    audioOffsetMs: p.leadInMs,
    audioFileMs: narration[i].fileMs,
    peaks: narration[i].peaks,
  });
}

/* ── 5. Frames: cards rendered, photographs copied at full size ──────────── */

if (cards.length > 0) {
  const spec = `${PRACTICE}/_cards.json`;
  writeFileSync(spec, JSON.stringify(cards), "utf8");
  execFileSync("python", [`${OS_ROOT}/scripts/practice/render-cards.py`, spec, SLIDES_OUT, PUB], {
    stdio: ["ignore", "inherit", "inherit"],
  });
}

const { staged, missing } = stageAssets({
  assetIds: visual.map((v) => v.assetId),
  libRoot: LIB,
  slidesOut: SLIDES_OUT,
  pubOut: PUB,
  log: (m) => process.stdout.write(`  ${m}\n`),
});
process.stdout.write(
  `frames: ${String(cards.length)} cards rendered, ${String(staged.length)} photographs staged at 1920x1080` +
    (missing.length ? `, ${String(missing.length)} MISSING: ${missing.join(", ")}` : "") + "\n",
);

/* ── 6. The snapshot ─────────────────────────────────────────────────────── */

const visualsById = {};
for (const [i, beat] of beats.entries()) {
  const clipId = `clip-beat-${String(i + 1).padStart(2, "0")}`;
  if (beat.visual) {
    visualsById[clipId] = {
      ...beat.visual,
      assetId: bare(beat.visual.assetId),
      candidates: (beat.visual.candidates ?? []).map((c) => ({ ...c, assetId: bare(c.assetId) })),
    };
  }
}

const snapshot = {
  stem: STEM,
  series: SERIES,
  title: curated.topic,
  width: 1920,
  height: 1080,
  fps: 30,
  rawMs,
  expectedOutMs: expectedMasterMs(rawMs, visual.length),
  transitionMs: TRANSITION_MS,
  masterSha256: "",
  generatedBy: "content.draft_video_plan + content.visual_curation@1",
  curation: curated.curation,
  visual,
  captions,
  voice,
  visuals: visualsById,
};

writeFileSync(
  `${PRACTICE}/compressor-episode-snapshot.json`,
  JSON.stringify(snapshot, null, 1),
  "utf8",
);

// ==================== WHY A .ts MODULE AS WELL ====================
// Next bundles a JSON import happily; Node's ESM loader refuses one without an
// import attribute, and the render script runs under Node. The demo episode
// solved this the same way — a committed TypeScript module — so the snapshot is
// emitted twice: the JSON stays as readable data, and this is what the code
// imports. One writer, so they cannot drift.
const header = [
  "/**",
  " * The compressor practice episode, as measured data.",
  " *",
  " * GENERATED by scripts/practice/build-practice-episode.mjs. Do not edit by",
  " * hand — re-run the builder, which re-synthesises the narration and re-times",
  " * the cut to it.",
  " *",
  " * Provenance:",
  `ic *   plan        compressor-episode-plan.json (${String(beats.length)} beats)`,
  "ic *   curation    content.visual_curation@1 against D:/Altair-HVAC-Library",
  `ic *   narration   Piper en_US-lessac-medium, ${(spokenMs / 1000).toFixed(1)}s measured`,
  `ic *   raw         ${String(rawMs)}ms across ${String(visual.length)} entries`,
  " */",
  "",
].join("\n").split("ic ").join(" ");

writeFileSync(
  `${PRACTICE}/compressor-episode-snapshot.ts`,
  `${header}\nexport const PRACTICE_EPISODE = ${JSON.stringify(snapshot, null, 1)};\n`,
  "utf8",
);

const withAsset = visual.filter((v) => v.assetId).length;
process.stdout.write(
  `\nproject "${STEM}" — ${String(visual.length)} visual clips, ` +
    `${String(withAsset)} from the HVAC library, ${String(cards.length)} cards\n` +
    `  runtime ${(rawMs / 1000 / 60).toFixed(2)} min raw, ` +
    `${(snapshot.expectedOutMs / 1000 / 60).toFixed(2)} min after crossfades\n` +
    `  snapshot -> shared/lib/video-editor/practice/compressor-episode-snapshot.json\n`,
);
