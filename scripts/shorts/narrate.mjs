/**
 * Fit a narration take to a Short and write the track the renderer muxes.
 *
 * The voice is generated outside this repository (Higgsfield MCP, seed_audio,
 * the `jeremiah-2.0` cloned voice). This script does the unglamorous half:
 * fetch the take, measure it, and place it against a known video runtime.
 *
 * It will NOT stretch a take by more than `MAX_TEMPO`. A read that needs more
 * than that is the wrong read — the script is too long — and speeding it up
 * turns an explainer into an auctioneer. In that case it fails and says by how
 * much the words need cutting, which is the actual fix.
 *
 *   node scripts/shorts/narrate.mjs --short recip-what-happens --version v2 \
 *     --url https://.../take.wav --offset 260
 */
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.resolve(HERE, "../../ui-audit/shorts");

/** Past this, a sped-up read stops sounding like a person explaining a thing. */
const MAX_TEMPO = 1.14;

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};

const SHORT = arg("short", "recip-what-happens");
const VERSION = arg("version", "v2");
const URL = arg("url", null);
const OFFSET_MS = Number(arg("offset", "260"));
/**
 * How long an internal pause may be, in seconds.
 *
 * This started at 0.28 and that was too aggressive: capping every breath at
 * 280ms is what made a choppy script sound choppier, because the pauses a
 * speaker takes ARE part of the delivery. 0.45 removes dead air without
 * flattening the phrasing. `--pause 0` disables the step entirely.
 */
const PAUSE = Number(arg("pause", "0.45"));

async function durationOf(file) {
  const { stdout } = await exec("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file,
  ]);
  return Number(stdout.trim());
}

async function main() {
  if (!URL) throw new Error("--url is required (the generated take)");
  const dir = path.join(OUT_ROOT, SHORT, VERSION);
  await mkdir(dir, { recursive: true });
  const raw = path.join(dir, "narration-raw.wav");
  const out = path.join(dir, "narration.m4a");

  const res = await fetch(URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  await writeFile(raw, Buffer.from(await res.arrayBuffer()));

  // Cap the dead air, but do NOT flatten the phrasing. The pauses a speaker
  // takes are part of the delivery; the first version of this step capped every
  // one at 280ms and made an already-choppy read sound worse. The real lever is
  // the script — a take with fewer sentence boundaries arrives shorter on its
  // own, because each boundary costs a pause.
  const tight = PAUSE > 0 ? path.join(dir, "narration-tight.wav") : raw;
  if (PAUSE > 0) await exec("ffmpeg", [
    "-y", "-v", "error", "-i", raw,
    "-af",
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1:" +
      `stop_periods=-1:stop_threshold=-45dB:stop_duration=${PAUSE}:detection=rms`,
    tight,
  ]);

  const mp4 = path.join(dir, `${SHORT}-${VERSION}.mp4`);
  if (!existsSync(mp4)) throw new Error(`render the video first: ${mp4}`);
  const videoSec = await durationOf(mp4);
  const takeSec = await durationOf(tight);
  const budgetSec = videoSec - OFFSET_MS / 1000 - 0.35; // leave the tail to breathe

  const rawSec = await durationOf(raw);
  const tempo = takeSec / budgetSec;
  process.stdout.write(
    `video ${videoSec.toFixed(2)}s  take ${rawSec.toFixed(2)}s  tightened ${takeSec.toFixed(2)}s  ` +
      `budget ${budgetSec.toFixed(2)}s  ` +
      `needs ${tempo.toFixed(3)}x\n`,
  );

  if (tempo > MAX_TEMPO) {
    const overWords = Math.round(((takeSec - budgetSec) / takeSec) * 100);
    process.stderr.write(
      `refused: the take needs ${tempo.toFixed(2)}x to fit, over the ${MAX_TEMPO}x limit.\n` +
        `Cut roughly ${overWords}% of the words and generate again — do not speed-read it.\n`,
    );
    process.exit(1);
  }

  const filters = [];
  if (tempo > 1.005) filters.push(`atempo=${tempo.toFixed(4)}`);
  if (OFFSET_MS > 0) filters.unshift(`adelay=${OFFSET_MS}|${OFFSET_MS}`);
  filters.push("loudnorm=I=-16:TP=-1.5:LRA=11");

  await exec("ffmpeg", [
    "-y", "-i", tight,
    "-af", filters.join(","),
    "-t", String(videoSec),
    "-c:a", "aac", "-b:a", "192k",
    out,
  ], { maxBuffer: 1 << 28 });

  process.stdout.write(`narration: ${out}\nRe-run render.mjs to mux it in.\n`);
}

main().catch((e) => {
  process.stderr.write(`${e.message ?? e}\n`);
  process.exit(1);
});
