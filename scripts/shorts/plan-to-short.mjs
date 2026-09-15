/**
 * plan-to-short — generate an engine data file from an agent-authored spec.
 *
 * ==================== THE LAST MANUAL STEP, REMOVED ====================
 * Phase 1 of the agent integration proved every contract but one seam stayed
 * human: turning a TechnicalShortPlan into `shorts/<id>.mjs`. This generator
 * closes it. The input is TEXT AND PHASE CHOICES ONLY — hook lines, captions,
 * chips, an ordered subset of the mechanism's named phases. Every camera
 * framing and theta range comes from `engine/presets.mjs`, lifted from the
 * six operator-tuned Shorts; every layout position is the house pattern. An
 * agent cannot place a pixel, invent an angle, or move a valve event — the
 * same "agents choose what to teach, the model owns the physics" boundary
 * the whole pipeline is built on, now enforced by construction at the
 * generation step too.
 *
 * ==================== FAIL CLOSED, LIKE EVERYTHING UPSTREAM ====================
 * Overlong text is refused, not shrunk (a caption that must shrink to fit is
 * a caption the Director must rewrite). Out-of-order phases are refused (a
 * machine may not run backwards to suit a script). A narration boundary that
 * cannot be matched to a real pause within ±1.6s falls back to the expected
 * position WITH A WARNING — a cut mid-breath is survivable; a silent wrong
 * cut is not, so the warning names the shot.
 *
 * Usage:
 *   node scripts/shorts/plan-to-short.mjs --spec <genspec.json> --audio <take.wav>
 *        [--pause 0.6] [--lead 260] [--tail 550]
 * Writes:
 *   scripts/shorts/shorts/<shortId>.mjs      the engine data file
 *   <specDir>/<shortId>.timing.json          per-shot ms for the platform plan
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MECHANISM_IMPORTS, PHASE_PRESETS } from "./engine/presets.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};

const LIMITS = { hookLine: 30, caption: 52, eyebrow: 34, chip: 30, maxCaptions: 2, maxChips: 3, coverLine: 18 };

function refuse(message) {
  process.stderr.write(`plan-to-short REFUSED: ${message}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------ validation */

function validateSpec(spec) {
  const preset = PHASE_PRESETS[spec.mechanism];
  if (preset === undefined) refuse(`unknown mechanism '${spec.mechanism}'`);
  if (!Array.isArray(spec.shots) || spec.shots.length < 3 || spec.shots.length > 7) {
    refuse(`shots must number 3..7, got ${spec.shots?.length}`);
  }

  let orderCursor = -1;
  for (const shot of spec.shots) {
    const phase = preset.phases[shot.enginePhase];
    if (phase === undefined) {
      refuse(`shot '${shot.id}': unknown enginePhase '${shot.enginePhase}' for ${spec.mechanism}. ` +
        `Known: ${Object.keys(preset.phases).join(', ')}`);
    }
    if (!preset.orderExempt.includes(shot.enginePhase)) {
      const idx = preset.order.indexOf(shot.enginePhase);
      if (idx < orderCursor) {
        refuse(`shot '${shot.id}': phase '${shot.enginePhase}' is out of canonical order — ` +
          'the machine does not run backwards to suit a script.');
      }
      orderCursor = idx;
    }
    if (!Array.isArray(shot.sentences) || shot.sentences.length === 0) {
      refuse(`shot '${shot.id}' carries no narration sentences.`);
    }
    for (const cap of shot.captions ?? []) {
      if (cap.length > LIMITS.caption) refuse(`shot '${shot.id}': caption over ${LIMITS.caption} chars: "${cap}"`);
    }
    if ((shot.captions ?? []).length > LIMITS.maxCaptions) refuse(`shot '${shot.id}': more than ${LIMITS.maxCaptions} captions.`);
    if ((shot.chips ?? []).length > LIMITS.maxChips) refuse(`shot '${shot.id}': more than ${LIMITS.maxChips} chips.`);
    for (const chip of shot.chips ?? []) {
      if (chip.text.length > LIMITS.chip) refuse(`shot '${shot.id}': chip over ${LIMITS.chip} chars: "${chip.text}"`);
    }
    if (shot.eyebrow && shot.eyebrow.text.length > LIMITS.eyebrow) {
      refuse(`shot '${shot.id}': eyebrow over ${LIMITS.eyebrow} chars.`);
    }
    if (shot.liveValves && !preset.liveValveChips) {
      refuse(`shot '${shot.id}' asks for live valve chips on '${spec.mechanism}', which has none.`);
    }
  }
  for (const line of [spec.hook?.line1, spec.hook?.line2]) {
    if (typeof line !== 'string' || line.length === 0) refuse('hook needs line1 and line2.');
    if (line.length > LIMITS.hookLine) refuse(`hook line over ${LIMITS.hookLine} chars: "${line}"`);
  }
  if (spec.payoff) {
    for (const line of [spec.payoff.line1, spec.payoff.line2]) {
      if (typeof line !== 'string' || line.length > 36) refuse(`payoff line missing or over 36 chars.`);
    }
  }
  // Cover text: the thumbnail's 2-5 words. Framing comes from the mechanism's
  // operator-tuned cover preset — text is the only agent-authored part.
  if (spec.cover) {
    const preset = PHASE_PRESETS[spec.mechanism];
    if (preset.cover === undefined) refuse(`mechanism '${spec.mechanism}' has no cover preset framing.`);
    const lines = [spec.cover.line1, spec.cover.line2].filter((l) => l !== undefined && l !== null);
    if (lines.length === 0) refuse('cover needs line1 (line2 optional).');
    for (const line of lines) {
      if (typeof line !== 'string' || line.length === 0) refuse('cover lines must be non-empty strings.');
      if (line.length > LIMITS.coverLine) refuse(`cover line over ${LIMITS.coverLine} chars: "${line}"`);
    }
    const words = lines.join(' ').split(/\s+/).filter(Boolean).length;
    if (words < 2 || words > 5) refuse(`cover text must be 2-5 words, got ${words}.`);
  }
}

/* ---------------------------------------------------------------- audio */

function capSilences(audioPath, pauseSec) {
  const dir = mkdtempSync(join(tmpdir(), 'p2s-'));
  const out = join(dir, 'capped.wav');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', audioPath, '-af',
    `silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.1:` +
    `stop_periods=-1:stop_threshold=-45dB:stop_duration=${pauseSec}:detection=rms`, out]);
  return out;
}

function durationOf(file) {
  return Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).trim());
}

function detectGaps(file, minGap) {
  // ffmpeg writes silencedetect output to STDERR; execFileSync only returns
  // stdout, so spawnSync is the right primitive here.
  const run = spawnSync('ffmpeg', ['-i', file, '-af', `silencedetect=noise=-42dB:d=${minGap}`, '-f', 'null', '-'],
    { encoding: 'utf8' });
  const stderr = run.stderr ?? '';
  const starts = [...stderr.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const ends = [...stderr.matchAll(/silence_end:\s*([\d.]+)/g)].map((m) => Number(m[1]));
  const total = durationOf(file);
  const gaps = [];
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i];
    const e = ends[i] ?? total;
    if (s <= 0.05 || e >= total - 0.05) continue;
    gaps.push({ mid: (s + e) / 2, dur: e - s });
  }
  return { gaps, total };
}

/**
 * Boundary picking without a human --pick: each shot boundary is matched to
 * the detected pause nearest its EXPECTED position (cumulative word-count
 * fraction of the whole take), monotonic, each gap used once. The heuristic
 * the operator applied by eye in Phase 1, made explicit.
 */
function deriveTimings(spec, cappedPath, leadMs, tailMs) {
  const { gaps, total } = detectGaps(cappedPath, 0.4);
  const words = spec.shots.map((s) => s.sentences.join(' ').split(/\s+/).filter(Boolean).length);
  const totalWords = words.reduce((a, b) => a + b, 0);
  let cum = 0;
  const boundaries = [];
  for (let i = 0; i < spec.shots.length - 1; i++) {
    cum += words[i];
    const expected = (cum / totalWords) * total;
    let best = null;
    for (const g of gaps) {
      if (boundaries.length > 0 && g.mid <= boundaries[boundaries.length - 1]) continue;
      if (best === null || Math.abs(g.mid - expected) < Math.abs(best.mid - expected)) best = g;
    }
    if (best === null || Math.abs(best.mid - expected) > 1.6) {
      process.stderr.write(
        `  WARN boundary after shot '${spec.shots[i].id}': no pause within 1.6s of expected ` +
        `${expected.toFixed(2)}s — cutting at the expected position.\n`);
      boundaries.push(expected);
    } else {
      boundaries.push(best.mid);
    }
  }
  const picture = total + leadMs / 1000 + tailMs / 1000;
  const bounds = [0, ...boundaries.map((b) => b + leadMs / 1000), picture];
  return spec.shots.map((s, i) => ({
    id: s.id,
    startMs: Math.round(bounds[i] * 1000),
    endMs: Math.round(bounds[i + 1] * 1000),
    durMs: Math.round((bounds[i + 1] - bounds[i]) * 1000),
  }));
}

/* ------------------------------------------------------------- emission */

const q = (s) => JSON.stringify(s);

function emit(spec, timings) {
  const preset = PHASE_PRESETS[spec.mechanism];
  const imp = MECHANISM_IMPORTS[spec.mechanism];
  const L = [];
  const w = (s) => L.push(s);

  const starts = {};
  let acc = 0;
  for (const t of timings) { starts[t.id] = acc; acc += t.durMs; }
  const totalMs = acc;

  w(`/**`);
  w(` * GENERATED by scripts/shorts/plan-to-short.mjs — do not hand-edit.`);
  w(` * Source spec: agent-authored (${q(spec.specSource ?? 'unknown')}); regenerate instead.`);
  w(` * Framings and theta ranges come from engine/presets.mjs (operator-tuned,`);
  w(` * lifted from the shipped Shorts). Agents supplied only text and phases.`);
  w(` */`);
  w(`import { ease, lerp } from "../engine/style.mjs";`);
  w(`import { ${imp.name} } from "${imp.from}";`);
  w(``);
  w(`export const spec = {`);
  w(`  id: ${q(spec.specId)},`);
  w(`  title: ${q(spec.title)},`);
  w(`  topic: ${q(spec.topic)},`);
  w(`  hookType: ${q(spec.hookType)},`);
  w(`  takeaway: ${q(spec.takeaway)},`);
  w(`  takeawayType: ${q(spec.takeawayType)},`);
  w(`  mechanism: ${imp.name},`);
  w(`  startTheta: 0,`);
  if (spec.cover) {
    const lines = [
      `{ text: ${q(spec.cover.line1)} }`,
      ...(spec.cover.line2 ? [`{ text: ${q(spec.cover.line2)}, accent: true }`] : []),
    ].join(', ');
    w(`  // Cover still: preset framing + the plan's cover words (render.mjs --cover).`);
    w(`  cover: { theta: ${preset.cover.theta}, cam: ${JSON.stringify(preset.cover.cam)}, lines: [${lines}] },`);
  }
  w(``);
  w(`  shots: [`);
  for (let i = 0; i < spec.shots.length; i++) {
    const shot = spec.shots[i];
    const t = timings[i];
    const p = preset.phases[shot.enginePhase];
    w(`    {`);
    w(`      id: ${q(shot.id)},`);
    w(`      dur: ${t.durMs},`);
    w(`      theta: (k) => lerp(${p.theta[0]}, ${p.theta[1]}, ease.inOut(k)),`);
    w(`      cam: ${JSON.stringify(p.cam)},`);
    w(`      camTo: ${JSON.stringify(p.camTo)},`);
    if (i === 0 || i === spec.shots.length - 1) w(`      camEase: ease.out,`);
    w(`    },`);
  }
  w(`  ],`);
  w(``);
  w(`  overlays: [`);
  // Hook — always shot 1, house position.
  const hookDur = Math.max(timings[0].durMs - 300, 1200);
  w(`    { kind: "hook", at: 120, dur: ${hookDur}, reveal: 600, y: 250, size: ${spec.hook.size ?? 56},`);
  w(`      lines: [{ text: ${q(spec.hook.line1)} }, { text: ${q(spec.hook.line2)}, accent: true }] },`);

  // Gauges: one continuous run across allowed shots, if requested.
  if (spec.gauges) {
    const allowed = spec.shots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => preset.phases[s.enginePhase].gaugesAllowed);
    if (allowed.length > 0) {
      const from = starts[allowed[0].s.id] + 400;
      const last = allowed[allowed.length - 1];
      const to = starts[last.s.id] + timings[last.i].durMs;
      const right = preset.gaugeRight ? `, right: ${q(preset.gaugeRight)}` : '';
      w(`    { kind: "gauges"${right}, at: ${from}, dur: ${to - from - 400}, fadeOut: 500 },`);
    }
  }

  for (let i = 0; i < spec.shots.length; i++) {
    const shot = spec.shots[i];
    const t = timings[i];
    const s0 = starts[shot.id];
    if (shot.eyebrow) {
      const tone = shot.eyebrow.tone === 'hot' ? `, tone: "hot"` : '';
      w(`    { kind: "eyebrow", at: ${s0 + 140}, dur: ${t.durMs - 340}${tone}, text: ${q(shot.eyebrow.text)} },`);
    }
    // The voice band holds ONE text at a time, across kinds. Two rules keep
    // captions clear of the hooks that share their band (both shipped
    // stacked once — batch 2026-09-13, every lane — and read as neither;
    // Render QA now fails any overlap):
    //   - the OPENING hook owns shot 1: captions there are dropped, loudly.
    //     The Director is instructed not to write them; this enforces it.
    //   - on the last shot of a Short with a payoff, captions get the first
    //     48% and the payoff arrives at 52% into clear air.
    const isPayoffShot = spec.payoff && i === spec.shots.length - 1;
    const capWindow = isPayoffShot ? Math.floor(t.durMs * 0.48) : t.durMs;
    let caps = shot.captions ?? [];
    if (i === 0 && caps.length > 0) {
      process.stderr.write(
        `  WARN shot '${shot.id}': ${caps.length} caption(s) dropped — the opening hook owns the ` +
          'first shot\'s voice band. Move the line to a later shot in the draft.\n',
      );
      caps = [];
    }
    if (caps.length === 1) {
      w(`    { kind: "caption", at: ${s0 + 200}, dur: ${Math.min(capWindow - 500, 5200)}, text: ${q(caps[0])} },`);
    } else if (caps.length === 2) {
      const half = Math.floor(capWindow * 0.48);
      w(`    { kind: "caption", at: ${s0 + 200}, dur: ${half - 400}, text: ${q(caps[0])} },`);
      w(`    { kind: "caption", at: ${s0 + half + 100}, dur: ${capWindow - half - 400}, text: ${q(caps[1])} },`);
    }
    if (shot.liveValves) {
      w(`    { kind: "chip", at: ${s0 + 700}, dur: ${t.durMs - 900}, live: "suction", x: 64, y: 330 },`);
      w(`    { kind: "chip", at: ${s0 + 900}, dur: ${t.durMs - 1100}, live: "discharge", x: 64, y: 396 },`);
    }
    const chips = shot.chips ?? [];
    chips.forEach((chip, ci) => {
      const at = s0 + Math.floor(t.durMs * 0.25) + ci * 700;
      w(`    { kind: "chip", at: ${at}, dur: ${t.durMs - (at - s0) - 300}, align: "right", x: 1024, y: ${1000 + ci * 72}, text: ${q(chip.text)}, tone: ${q(chip.tone ?? 'cool')} },`);
    });
  }

  if (spec.payoff) {
    const last = timings[timings.length - 1];
    const s0 = starts[last.id];
    // 52% in when the shot carries captions (they own the first 48%); from
    // the top when it does not.
    const hookAt = (spec.shots[spec.shots.length - 1].captions ?? []).length > 0
      ? s0 + Math.floor(last.durMs * 0.52)
      : s0 + 150;
    w(`    { kind: "hook", at: ${hookAt}, dur: ${s0 + last.durMs - hookAt - 200}, reveal: 600, y: 256, size: 46,`);
    w(`      lines: [{ text: ${q(spec.payoff.line1)} }, { text: ${q(spec.payoff.line2)}, accent: true }] },`);
  }
  w(`  ],`);
  w(``);
  w(`  narration: [`);
  for (let i = 0; i < spec.shots.length; i++) {
    const shot = spec.shots[i];
    const s0 = starts[shot.id];
    const t = timings[i];
    shot.sentences.forEach((sentence, si) => {
      const at = si === 0 ? s0 + 200 : s0 + Math.floor((t.durMs * (si)) / (shot.sentences.length + 0.4));
      w(`    { at: ${at}, text: ${q(sentence)}, visual: ${q(shot.visual ?? shot.enginePhase)} },`);
    });
  }
  w(`  ],`);
  w(``);
  w(`  generationNotes: [`);
  w(`    ${q('GENERATED by plan-to-short.mjs from an agent-authored spec; framings from engine/presets.mjs.')},`);
  w(`    ${q(`Mechanism: ${spec.mechanism}; phases: ${spec.shots.map((s) => s.enginePhase).join(' -> ')}.`)},`);
  w(`    ${q(`Shot boundaries derived from the narration take (pause cap ${spec.pauseCap}s), total ${totalMs}ms.`)},`);
  w(`  ],`);
  w(`};`);
  w(``);
  return L.join('\n');
}

/* ------------------------------------------------------------------ main */

const specPath = arg('spec', null);
const audioPath = arg('audio', null);
if (specPath === null || audioPath === null) refuse('--spec and --audio are required.');
const pauseSec = Number(arg('pause', '0.6'));
const leadMs = Number(arg('lead', '260'));
const tailMs = Number(arg('tail', '550'));

const spec = JSON.parse(readFileSync(resolve(specPath), 'utf8').replace(/^﻿/, ''));
spec.specSource = resolve(specPath);
spec.pauseCap = pauseSec;
validateSpec(spec);

const capped = capSilences(resolve(audioPath), pauseSec);
const timings = deriveTimings(spec, capped, leadMs, tailMs);
const totalMs = timings.reduce((a, t) => a + t.durMs, 0);

const outFile = join(HERE, 'shorts', `${spec.shortId}.mjs`);
writeFileSync(outFile, emit(spec, timings), 'utf8');

const timingFile = join(dirname(resolve(specPath)), `${spec.shortId}.timing.json`);
writeFileSync(timingFile, JSON.stringify({
  shortId: spec.shortId,
  totalMs,
  pauseCapSec: pauseSec,
  takeSec: durationOf(resolve(audioPath)),
  cappedSec: durationOf(capped),
  shots: timings,
}, null, 2), 'utf8');

process.stderr.write(`plan-to-short: wrote ${outFile}\n`);
process.stderr.write(`  ${timings.map((t) => `${t.id}=${t.durMs}ms`).join('  ')}  total ${totalMs}ms\n`);
process.stderr.write(`  timing record: ${timingFile}\n`);
if (totalMs < 22000 || totalMs > 50000) {
  process.stderr.write(`  WARN total ${(totalMs / 1000).toFixed(1)}s is outside the 22-50s target window.\n`);
}
