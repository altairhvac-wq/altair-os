/**
 * Read the narration and tell the picture how long each shot should be.
 *
 * Up to now shot lengths were guessed and the voice was stretched to fit them,
 * which is backwards: the voice is the channel's, the picture is ours. This
 * finds the real pauses in a take with ffmpeg's `silencedetect`, treats the
 * largest ones as the beat boundaries, and prints the shot durations that put
 * every cut on a breath instead of in the middle of a clause.
 *
 * It does NOT edit the spec. It prints numbers a human pastes in, because
 * which sentence belongs to which shot is an editorial decision and the script
 * has no business guessing it.
 *
 *   node scripts/shorts/beats.mjs --audio take.wav --shots 5 --lead 260 --tail 550
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};

const AUDIO = arg("audio", null);
const SHOTS = Number(arg("shots", "5"));
/** Silence before the first word, so the hook has a beat before the voice. */
const LEAD_MS = Number(arg("lead", "260"));
/** Silence after the last word, so the Short does not cut on the final syllable. */
const TAIL_MS = Number(arg("tail", "550"));
/** A gap shorter than this is a breath inside a sentence, not a beat. */
const MIN_GAP = Number(arg("min-gap", "0.34"));
/**
 * Which candidate gaps are the beat boundaries, as 1-based indices into the
 * printed list. Without this the tool takes the longest gaps, and the longest
 * gap is not always a sentence end — a dense technical line can pause harder
 * mid-sentence than it does between two short ones. Which sentence belongs to
 * which shot is an editorial decision, so it is made by a person and recorded
 * here rather than guessed every run.
 */
const PICK = (arg("pick", "") || "").split(",").map((n) => Number(n.trim())).filter(Boolean);

async function main() {
  if (!AUDIO) throw new Error("--audio is required");

  const { stderr } = await exec("ffmpeg", [
    "-i", AUDIO,
    "-af", `silencedetect=noise=-42dB:d=${MIN_GAP}`,
    "-f", "null", "-",
  ], { maxBuffer: 1 << 28 });

  const total = Number(/time=\s*(\d+):(\d+):([\d.]+)/.exec(stderr)
    ? (() => {
        const m = [...stderr.matchAll(/time=\s*(\d+):(\d+):([\d.]+)/g)].pop();
        return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
      })()
    : 0);

  // Each silence is a candidate beat boundary; the cut belongs in its middle.
  const gaps = [];
  const starts = [...stderr.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const e = ends[i] ?? total;
    if (s <= 0.05 || e >= total - 0.05) continue; // lead-in / tail, not a beat
    gaps.push({ start: s, end: e, dur: e - s, mid: (s + e) / 2 });
  }

  process.stdout.write(`take ${total.toFixed(2)}s — ${gaps.length} candidate beats\n`);
  for (const g of gaps) {
    process.stdout.write(`  ${g.start.toFixed(2)}–${g.end.toFixed(2)}  (${g.dur.toFixed(2)}s)\n`);
  }

  const needed = SHOTS - 1;
  if (gaps.length < needed) {
    process.stderr.write(
      `\nonly ${gaps.length} pauses for ${SHOTS} shots. Either the script has fewer\n` +
        `beats than the edit does, or --min-gap is too high.\n`,
    );
    process.exit(1);
  }

  // The longest pauses are the real sentence breaks; keep them in time order.
  const chosen = PICK.length
    ? PICK.map((i) => {
        const g = gaps[i - 1];
        if (!g) throw new Error(`--pick ${i} is out of range (1..${gaps.length})`);
        return g;
      }).sort((a, b) => a.mid - b.mid)
    : gaps
        .slice()
        .sort((a, b) => b.dur - a.dur)
        .slice(0, needed)
        .sort((a, b) => a.mid - b.mid);
  if (PICK.length && PICK.length !== needed) {
    throw new Error(`--pick needs ${needed} indices for ${SHOTS} shots, got ${PICK.length}`);
  }

  const cuts = chosen.map((g) => g.mid);
  const picture = total + LEAD_MS / 1000 + TAIL_MS / 1000;
  const bounds = [0, ...cuts.map((c) => c + LEAD_MS / 1000), picture];

  process.stdout.write(`\npicture ${picture.toFixed(2)}s (lead ${LEAD_MS}ms, tail ${TAIL_MS}ms)\n`);
  process.stdout.write("shot durations, ms:\n");
  const out = [];
  for (let i = 0; i < SHOTS; i++) {
    const ms = Math.round((bounds[i + 1] - bounds[i]) * 1000);
    out.push(ms);
    process.stdout.write(`  shot ${i + 1}  ${String(ms).padStart(6)}\n`);
  }
  process.stdout.write(`\ntotal ${out.reduce((a, b) => a + b, 0)}ms\n`);
  process.stdout.write(`T = { ${out.map((m, i) => `s${i + 1}: ${m}`).join(", ")} }\n`);
}

main().catch((e) => {
  process.stderr.write(`${e.message ?? e}\n`);
  process.exit(1);
});
