/**
 * Derive a Short's scene contract and metadata record from the spec itself.
 *
 * Everything structural is MEASURED, not declared: cut count, average shot
 * length and caption density come from walking the same shot and overlay lists
 * the renderer walks. A hand-typed metadata file would drift from the video by
 * the second iteration, and the whole point of the record is to make later
 * performance comparisons trustworthy.
 *
 *   node scripts/shorts/metadata.mjs --short recip-what-happens --version v1
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.resolve(HERE, "../../ui-audit/shorts");

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > -1 ? process.argv[i + 1] : d;
};

const TEXT_KINDS = new Set(["hook", "caption", "callout", "chip", "stat", "eyebrow"]);

const MOTION = {
  /** Classify a shot's camera by what actually changes between its endpoints. */
  of(shot) {
    const a = shot.cam;
    const b = shot.camTo ?? shot.cam;
    const dz = b.z - a.z;
    const dxy = Math.hypot(b.fx - a.fx, b.fy - a.fy);
    if (Math.abs(dz) < 0.02 && dxy < 12) return "hold";
    if (dz > 0.04) return "push";
    if (dz < -0.04) return "pull";
    return dxy > 80 ? "track" : "drift";
  },
};

export function describe(spec, opts = {}) {
  const fps = spec.fps ?? 30;
  const runtimeMs = spec.shots.reduce((a, s) => a + s.dur, 0);

  const shots = spec.shots.map((s) => ({
    id: s.id,
    durationMs: s.dur,
    cameraMotion: MOTION.of(s),
    mechanismPhase: s.id,
  }));

  const overlays = spec.overlays.map((o) => ({
    kind: o.kind,
    atMs: o.at,
    durationMs: o.dur,
    text: overlayText(o),
    boundToState: Boolean(o.live) || o.kind === "gauges",
  }));

  /**
   * Caption density = the average number of words visible at any instant.
   *
   * Counting authored words per second of runtime measures how much was
   * WRITTEN; this measures how much is ON SCREEN, which is the thing that
   * actually makes a Short feel like a poster. A line held for four seconds
   * costs four seconds of clutter, not one word's worth.
   */
  const wordSeconds = overlays
    .filter((o) => TEXT_KINDS.has(o.kind) && o.text)
    .reduce((a, o) => a + o.text.split(/\s+/).filter(Boolean).length * (o.durationMs / 1000), 0);
  const totalWords = overlays
    .filter((o) => TEXT_KINDS.has(o.kind) && o.text)
    .reduce((a, o) => a + o.text.split(/\s+/).filter(Boolean).length, 0);

  const modes = new Set(["cutaway"]);
  for (const o of spec.overlays) {
    if (o.kind === "gauges") modes.add("gauges");
    else if (o.kind === "callout") modes.add("callouts");
    else if (o.kind === "chip") modes.add("chips");
    else if (o.kind === "arrow") modes.add("arrows");
    else if (o.kind === "stat") modes.add("stats");
  }
  modes.add("particles");

  const scene = {
    shortId: spec.id,
    title: spec.title,
    mechanismType: spec.mechanism.id,
    visualStyleVersion: "ALT-HVAC-CUTAWAY-V1",
    aspect: "9:16",
    width: 1080,
    height: 1920,
    fps,
    runtimeMs,
    shots,
    overlays,
    narration: spec.narration.map((n) => ({ atMs: n.at, text: n.text, visual: n.visual })),
    // A mechanism that models system topology attests its measured geometry
    // here (see engine/evaporator-machine.mjs), so agent-side Technical QA can
    // verify flow order, inlet/outlet sides, frost placement and the
    // superheat point from the render's own evidence — the same
    // travel-with-the-render pattern as audit.json.
    ...(spec.mechanism.topology ? { topology: spec.mechanism.topology } : {}),
  };

  const record = {
    shortId: spec.id,
    topic: spec.topic ?? spec.title,
    hook: spec.hook ?? hookOf(spec),
    hookType: spec.hookType ?? "question",
    takeaway: spec.takeaway ?? "",
    takeawayType: spec.takeawayType ?? "principle",
    runtimeMs,
    visualStyleVersion: "ALT-HVAC-CUTAWAY-V1",
    mechanismType: spec.mechanism.id,
    renderVersion: opts.version ?? "v1",
    renderedAt: new Date().toISOString(),
    structure: {
      sceneCount: shots.length,
      numberOfCuts: Math.max(shots.length - 1, 0),
      averageShotLengthMs: Math.round(runtimeMs / shots.length),
      /** Average words on screen at any instant. */
      captionDensity: +(wordSeconds / (runtimeMs / 1000)).toFixed(2),
      /** Total distinct words authored, for reference. */
      totalOnScreenWords: totalWords,
      cameraMotionTypes: [...new Set(shots.map((s) => s.cameraMotion))],
      visualModesUsed: [...modes],
      particleAnimationUsed: true,
      gaugeAnimationUsed: spec.overlays.some((o) => o.kind === "gauges"),
    },
    generationNotes: spec.generationNotes ?? [],
    // The intended thumbnail: file name is the render contract (render.mjs
    // --cover writes cover.png beside the mp4); text recorded for the card.
    ...(spec.cover
      ? { cover: { file: "cover.png", lines: spec.cover.lines.map((l) => l.text) } }
      : {}),
    // No `performance` key. Absent means not measured, which is a different
    // claim from measured-as-zero, and nothing here may invent platform data.
  };

  return { scene, record };
}

function overlayText(o) {
  if (o.kind === "hook") return o.lines.map((l) => l.text).join(" ");
  if (o.kind === "callout") return [o.title, o.sub].filter(Boolean).join(" ");
  if (o.kind === "stat") return [o.label, o.value, o.sub].filter(Boolean).join(" ");
  if (o.kind === "chip" && o.live) return `${o.live} valve state`;
  return o.text ?? "";
}

const hookOf = (spec) => {
  const h = spec.overlays.find((o) => o.kind === "hook");
  return h ? h.lines.map((l) => l.text).join(" ") : spec.title;
};

// A hand-rolled file:// comparison silently fails on Windows (drive letter and
// backslashes), which is how this CLI ran to completion and wrote nothing.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const short = arg("short", "recip-what-happens");
  const version = arg("version", "v1");
  const mod = await import(`./shorts/${short}.mjs`);
  const { scene, record } = describe(mod.spec, { version });
  const dir = path.join(OUT_ROOT, short, version);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "scene.json"), JSON.stringify(scene, null, 2), "utf8");
  await writeFile(path.join(dir, "metadata.json"), JSON.stringify(record, null, 2), "utf8");
  process.stdout.write(
    `${record.shortId}\n` +
      `  runtime ${(record.runtimeMs / 1000).toFixed(2)}s  scenes ${record.structure.sceneCount}  ` +
      `cuts ${record.structure.numberOfCuts}  avg shot ${record.structure.averageShotLengthMs}ms\n` +
      `  caption density ${record.structure.captionDensity} words on screen  camera ${record.structure.cameraMotionTypes.join(", ")}\n` +
      `  wrote scene.json + metadata.json to ${dir}\n`,
  );
}
