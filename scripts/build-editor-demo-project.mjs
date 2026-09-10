/**
 * Turns a real rendered episode into the editor's demo project.
 *
 * ==================== WHY A GENERATED SNAPSHOT ====================
 * The editor needs a project to open that is not empty, and every number in it
 * has to be real or the editor is a mockup with extra steps. The numbers ARE
 * real: they come from `render-report-<stem>.json`, which the production
 * renderer writes after a Piper narration pass — measured word counts, measured
 * speech durations, the tail the pacing rule actually applied, and the exact
 * per-slide split the compositor used.
 *
 * What this cannot be is a live read. The render artifacts live on the
 * production laptop under `AltairDemoTool/production/slide-system`, and the web
 * app has no access to that tree in any deployed environment. So this script
 * runs where the artifacts are and commits a snapshot: frames into
 * `public/studio/<stem>/`, timings and waveform peaks into a TypeScript module.
 *
 * Re-run it after re-rendering the episode and the demo project follows.
 *
 * Run: node scripts/build-editor-demo-project.mjs [stem]
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const STEM = process.argv[2] ?? "hvac-01";
const TOOL = "C:/Users/User/Desktop/AltairDemoTool";
const SLIDE_SYSTEM = path.join(TOOL, "production/slide-system");
const OUT_PUBLIC = path.resolve(`public/studio/${STEM}`);
const OUT_MODULE = path.resolve(
  `shared/lib/video-editor/demo-project-${STEM}.ts`,
);

/** Preview frames, not masters. 640x360 keeps the whole episode under a MB. */
const FRAME_WIDTH = 640;
const FRAME_QUALITY = 4; // ffmpeg -q:v, 2 (best) .. 31 (worst)
/** Waveform resolution. 240 peaks across a clip survives any timeline zoom
 *  we allow while staying a short array in the committed module. */
const PEAK_BUCKETS = 240;
/**
 * Narration is re-encoded rather than copied. The masters are 22kHz mono PCM
 * (6.3 MB for this episode); at 64k AAC the same audio is ~1.4 MB, which is
 * the difference between an editor that seeks instantly and one that stalls.
 * Nothing downstream uses these files - the RENDER still reads the original
 * WAVs - so this is a preview encode and lossy is the correct trade.
 */
const AUDIO_BITRATE = "64k";

function read(file) {
  return JSON.parse(fs.readFileSync(path.join(SLIDE_SYSTEM, file), "utf8"));
}

const report = read(`render-report-${STEM}.json`);
const episode = read(`episode-${STEM}.json`);
const audioDir = path.join(SLIDE_SYSTEM, `audio-${STEM}`);
const slidesDir = path.join(SLIDE_SYSTEM, `slides-${STEM}`);

fs.mkdirSync(OUT_PUBLIC, { recursive: true });

/* ── 1. Frames ───────────────────────────────────────────────────────────── */

const frameFor = new Map();
for (const png of fs.readdirSync(slidesDir).filter((f) => f.endsWith(".png"))) {
  const id = png.replace(/\.png$/, "");
  const out = path.join(OUT_PUBLIC, `${id}.jpg`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-i", path.join(slidesDir, png),
    "-vf", `scale=${FRAME_WIDTH}:-2`,
    "-q:v", String(FRAME_QUALITY),
    out,
  ]);
  frameFor.set(id, `/studio/${STEM}/${id}.jpg`);
}
process.stdout.write(`frames: ${frameFor.size} -> ${OUT_PUBLIC}\n`);

/* -- 1b. Narration audio, for preview playback ------------------------- */

const OUT_AUDIO = path.join(OUT_PUBLIC, "audio");
fs.mkdirSync(OUT_AUDIO, { recursive: true });

/* ── 2. Waveform peaks ───────────────────────────────────────────────────── */

/**
 * Peaks are read from the decoded PCM rather than from any ffmpeg visualiser,
 * because a picture of a waveform cannot be re-scaled when the timeline zooms.
 * An array of normalised maxima can.
 */
function peaksFor(wavPath) {
  const raw = execFileSync(
    "ffmpeg",
    ["-v", "error", "-i", wavPath, "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
    { maxBuffer: 1 << 28 },
  );
  const samples = new Int16Array(
    raw.buffer,
    raw.byteOffset,
    Math.floor(raw.length / 2),
  );
  if (samples.length === 0) return [];
  const bucket = Math.max(1, Math.floor(samples.length / PEAK_BUCKETS));
  const peaks = [];
  for (let i = 0; i < PEAK_BUCKETS; i += 1) {
    let max = 0;
    const start = i * bucket;
    const end = Math.min(samples.length, start + bucket);
    for (let j = start; j < end; j += 1) {
      const v = Math.abs(samples[j]);
      if (v > max) max = v;
    }
    peaks.push(Math.round((max / 32768) * 100) / 100);
  }
  return peaks;
}

const wavs = fs
  .readdirSync(audioDir)
  .filter((f) => f.endsWith(".wav"))
  .sort();

/** Encodes one narration clip to AAC and returns its public URL + duration. */
function publishAudio(wavName) {
  const stem = wavName.replace(/[.]wav$/, "");
  const out = path.join(OUT_AUDIO, `${stem}.m4a`);
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    "-i", path.join(audioDir, wavName),
    "-c:a", "aac", "-b:a", AUDIO_BITRATE, "-ac", "1",
    "-movflags", "+faststart",
    out,
  ]);
  const durationSec = Number(
    execFileSync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "csv=p=0",
      out,
    ])
      .toString()
      .trim(),
  );
  return {
    url: `/studio/${STEM}/audio/${stem}.m4a`,
    fileDurationMs: Math.round(durationSec * 1000),
  };
}


/* ── 3. Assemble the project ─────────────────────────────────────────────── */

const beatById = new Map(episode.beats.map((b) => [b.id, b]));

const visual = [];
const captions = [];
const voice = [];

let cursor = 0;
let wavIndex = 0;

for (const beat of report.beats) {
  const source = beatById.get(beat.beat);
  const slides = beat.slides;
  const lead = beat.leadInMs ?? 0;
  const total = beat.beatMs;

  // The compositor's own split rule, mirrored: first slide carries the lead-in,
  // the last absorbs the rounding remainder. Reproduced rather than
  // approximated so the editor's clip edges are the render's cut points.
  const share = Math.floor((total - lead) / slides.length);

  slides.forEach((slideId, index) => {
    const first = index === 0;
    const last = index === slides.length - 1;
    const durationMs = first
      ? lead + share
      : last
        ? total - lead - share * (slides.length - 1)
        : share;

    visual.push({
      id: `clip-${slideId}`,
      kind: "slide",
      assetId: slideId,
      beatId: beat.beat,
      label: slideId,
      startMs: cursor,
      durationMs,
      frame: frameFor.get(slideId) ?? null,
      section: beat.section,
    });
    cursor += durationMs;
  });

  // Narration: one clip per beat, at the beat's start. The renderer attaches
  // audio to the first entry of a beat only, and this mirrors that exactly —
  // a per-slide voice clip would restart the line at every cut.
  const wav = wavs[wavIndex];
  wavIndex += 1;
  const published = wav ? publishAudio(wav) : null;
  voice.push({
    id: `vo-${beat.beat}`,
    kind: "audio",
    beatId: beat.beat,
    label: beat.beat,
    startMs: cursor - total,
    durationMs: total,
    // Where the VOICE actually starts inside this clip. A beat carries a
    // lead-in before the line and a tail after it, so audio that began at
    // offset 0 would speak early by exactly the lead.
    audioOffsetMs: beat.leadInMs ?? 0,
    speechMs: beat.speechMs,
    words: beat.words,
    wpm: beat.wpm,
    audioUrl: published ? published.url : null,
    audioFileMs: published ? published.fileDurationMs : null,
    peaks: wav ? peaksFor(path.join(audioDir, wav)) : [],
  });

  // Captions follow the spoken line, not the slide, and stop when the voice
  // stops rather than running under the tail.
  if (source?.voiceover) {
    captions.push({
      id: `cap-${beat.beat}`,
      kind: "caption",
      beatId: beat.beat,
      label: source.voiceover.slice(0, 40),
      text: source.voiceover,
      startMs: cursor - total + (beat.leadInMs ?? 0),
      durationMs: beat.speechMs,
    });
  }
}

const payload = {
  stem: STEM,
  title: episode.title,
  series: episode.series,
  width: episode.widthPx,
  height: episode.heightPx,
  fps: episode.fps,
  rawMs: report.timeline.rawMs,
  expectedOutMs: report.timeline.expectedOutMs,
  transitionMs: report.timeline.transitionMs,
  masterSha256: report.sha256,
  visual,
  captions,
  voice,
};

/* ── 4. Emit ─────────────────────────────────────────────────────────────── */

const header = `/**
 * ${episode.title} — the editor's demo project.
 *
 * GENERATED by scripts/build-editor-demo-project.mjs from a REAL Piper render.
 * Do not edit by hand; re-run the script after re-rendering the episode.
 *
 * Provenance, so every number here can be traced:
 *   episode      episode-${STEM}.json (${episode.beats.length} beats)
 *   render       render-report-${STEM}.json
 *   master       ${report.sha256}
 *   raw          ${report.timeline.rawMs}ms across ${report.timeline.entries} entries
 *   after xfade  ${report.timeline.expectedOutMs}ms at ${report.timeline.transitionMs}ms crossfades
 *
 * Durations are MEASURED: word counts and speech lengths come from the Piper
 * pass, and the per-slide split reproduces the compositor's own arithmetic, so
 * a clip edge here is a cut point there. Waveform peaks are normalised maxima
 * decoded from the narration WAVs at ${PEAK_BUCKETS} buckets per clip.
 *
 * The frames under /studio/${STEM}/ are ${FRAME_WIDTH}px previews of the 1920x1080
 * slides, not the masters.
 */
`;

fs.mkdirSync(path.dirname(OUT_MODULE), { recursive: true });
fs.writeFileSync(
  OUT_MODULE,
  `${header}\nexport const DEMO_EPISODE = ${JSON.stringify(payload, null, 2)} as const;\n`,
  "utf8",
);

const bytes = fs.statSync(OUT_MODULE).size;
const audioFiles = fs.readdirSync(OUT_AUDIO);
const audioBytes = audioFiles.reduce(
  (n, f) => n + fs.statSync(path.join(OUT_AUDIO, f)).size,
  0,
);

process.stdout.write(
  `project: ${visual.length} visual, ${captions.length} captions, ${voice.length} voice\n` +
    `audio:   ${audioFiles.length} clips, ${Math.round(audioBytes / 1024)} KB\n` +
    `module:  ${OUT_MODULE} (${Math.round(bytes / 1024)} KB)\n` +
    `timing:  raw ${payload.rawMs}ms, out ${payload.expectedOutMs}ms\n`,
);
