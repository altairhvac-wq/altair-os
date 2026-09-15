/**
 * Camera motion: the arithmetic, once, for the preview AND the renderer.
 *
 * ==================== WHY THIS IS ITS OWN MODULE ====================
 * The operator's test is "apply Push In, see it in the preview, then see the
 * same move in the MP4". Two implementations of an easing curve is exactly how
 * that promise gets broken — one of them drifts, nobody notices until a master
 * is wrong. So the numbers live here, and both sides evaluate the same
 * function: the browser calls it every frame, and the compiler calls it to
 * write the numbers into the render job.
 *
 * ==================== THE EASINGS ARE FFMPEG-SHAPED ====================
 * FFmpeg evaluates a filter expression per frame, and a comma inside a filter
 * argument ends the filter. Every easing here is therefore a short, comma-free
 * algebraic formula that both JavaScript and FFmpeg can evaluate identically:
 *
 *   linear     p
 *   easeIn     p*p
 *   easeOut    1-(1-p)*(1-p)
 *   easeInOut  p*p*(3-2*p)
 *
 * A CSS cubic-bezier would be prettier in the browser and unreproducible in the
 * master, which makes it the wrong kind of pretty.
 */

import {
  type EditorClip,
  type EditorMotion,
  type EditorTransform,
  type MotionEasing,
  type MotionPreset,
} from "@/shared/types/video-editor";

/** A locked-off shot: the identity move. */
export const STILL_MOTION: EditorMotion = {
  preset: "none",
  startScale: 1,
  endScale: 1,
  startX: 0,
  startY: 0,
  endX: 0,
  endY: 0,
  easing: "linear",
};

export const MOTION_PRESET_LABEL: Record<MotionPreset, string> = {
  none: "None",
  pushIn: "Push in",
  pullOut: "Pull out",
  panLeft: "Pan left",
  panRight: "Pan right",
  panUp: "Pan up",
  panDown: "Pan down",
  slowZoom: "Slow zoom",
  kenBurns: "Ken Burns",
};

export const MOTION_EASING_LABEL: Record<MotionEasing, string> = {
  linear: "Linear",
  easeIn: "Ease in",
  easeOut: "Ease out",
  easeInOut: "Smooth",
};

export function easeAt(easing: MotionEasing, p: number): number {
  const t = p <= 0 ? 0 : p >= 1 ? 1 : p;
  switch (easing) {
    case "linear":
      return t;
    case "easeIn":
      return t * t;
    case "easeOut":
      return 1 - (1 - t) * (1 - t);
    case "easeInOut":
      return t * t * (3 - 2 * t);
    default:
      return t;
  }
}

export type MotionSample = {
  readonly scale: number;
  /** Centre offset as a fraction of frame width / height. */
  readonly x: number;
  readonly y: number;
};

/** The move at progress `p` (0 at the clip's first frame, 1 at its last). */
export function motionAt(motion: EditorMotion, p: number): MotionSample {
  const e = easeAt(motion.easing, p);
  return {
    scale: motion.startScale + (motion.endScale - motion.startScale) * e,
    x: motion.startX + (motion.endX - motion.startX) * e,
    y: motion.startY + (motion.endY - motion.startY) * e,
  };
}

/**
 * Keep the picture over the frame.
 *
 * At scale s, a frame-filling picture has (s-1)/2 of overflow on each side as a
 * fraction of the frame. Travelling further than that shows black — in the
 * preview, in the bake, and in the master. Presets stay inside it and the
 * inspector clamps to it, so a camera move cannot silently letterbox a shot.
 */
export function clampMotion(motion: EditorMotion): EditorMotion {
  const startScale = Math.max(1, Math.min(4, motion.startScale));
  const endScale = Math.max(1, Math.min(4, motion.endScale));
  const limit = (s: number) => Math.max(0, (s - 1) / 2);
  const clamp = (v: number, s: number) =>
    Math.max(-limit(s), Math.min(limit(s), v));
  return {
    ...motion,
    startScale,
    endScale,
    startX: clamp(motion.startX, startScale),
    startY: clamp(motion.startY, startScale),
    endX: clamp(motion.endX, endScale),
    endY: clamp(motion.endY, endScale),
  };
}

/**
 * A preset at an intensity.
 *
 * Intensity scales the DISTANCE travelled, not the time: the move always takes
 * the whole clip, which is what makes it read as a camera rather than an
 * animation. A pan's scale is derived from its travel (`1 + 2a`, plus a hair)
 * so the picture is exactly big enough to pan across without exposing an edge.
 */
export function presetMotion(preset: MotionPreset, intensity = 1): EditorMotion {
  const i = Math.max(0.1, Math.min(3, intensity));
  const zoom = 0.12 * i;
  const travel = 0.05 * i;
  const panScale = 1 + 2 * travel + 0.02;
  const base = { preset, easing: "easeInOut" as MotionEasing };

  switch (preset) {
    case "none":
      return { ...STILL_MOTION, preset: "none" };
    case "pushIn":
      return clampMotion({ ...base, startScale: 1, endScale: 1 + zoom, startX: 0, startY: 0, endX: 0, endY: 0 });
    case "pullOut":
      return clampMotion({ ...base, startScale: 1 + zoom, endScale: 1, startX: 0, startY: 0, endX: 0, endY: 0 });
    case "panLeft":
      // The picture drifts left across the screen.
      return clampMotion({ ...base, easing: "linear", startScale: panScale, endScale: panScale, startX: travel, startY: 0, endX: -travel, endY: 0 });
    case "panRight":
      return clampMotion({ ...base, easing: "linear", startScale: panScale, endScale: panScale, startX: -travel, startY: 0, endX: travel, endY: 0 });
    case "panUp":
      return clampMotion({ ...base, easing: "linear", startScale: panScale, endScale: panScale, startX: 0, startY: travel, endX: 0, endY: -travel });
    case "panDown":
      return clampMotion({ ...base, easing: "linear", startScale: panScale, endScale: panScale, startX: 0, startY: -travel, endX: 0, endY: travel });
    case "slowZoom":
      return clampMotion({ ...base, easing: "linear", startScale: 1, endScale: 1 + 0.06 * i, startX: 0, startY: 0, endX: 0, endY: 0 });
    case "kenBurns":
      // A zoom and a drift together, which is the whole point of the thing.
      return clampMotion({
        ...base,
        startScale: 1 + 0.08 * i,
        endScale: 1 + 0.18 * i,
        startX: -0.03 * i,
        startY: 0.015 * i,
        endX: 0.03 * i,
        endY: -0.015 * i,
      });
    default:
      return STILL_MOTION;
  }
}

/** Roughly how far a preset moves, for redrawing the intensity slider. */
export function motionIntensity(motion: EditorMotion): number {
  const zoom = Math.abs(motion.endScale - motion.startScale);
  const travel = Math.max(
    Math.abs(motion.endX - motion.startX),
    Math.abs(motion.endY - motion.startY),
  );
  if (zoom >= travel) return zoom > 0 ? zoom / 0.12 : 1;
  return travel / 0.1;
}

export function isStillMotion(motion: EditorMotion | undefined): boolean {
  if (!motion) return true;
  return (
    motion.startScale === 1 &&
    motion.endScale === 1 &&
    motion.startX === 0 &&
    motion.startY === 0 &&
    motion.endX === 0 &&
    motion.endY === 0
  );
}

/**
 * The clip's framing and its camera move, combined into ONE sample.
 *
 * The transform is the shot (where the operator put the picture); the motion is
 * the move over it. Composing them here means every consumer — preview, bake,
 * filter graph — applies exactly one scale and one offset, and cannot apply the
 * transform twice.
 */
export function sampleClip(
  clip: Pick<EditorClip, "transform" | "motion">,
  p: number,
): MotionSample {
  const t: EditorTransform = clip.transform ?? {};
  const baseScale = t.scale ?? 1;
  const m = clip.motion ? motionAt(clip.motion, p) : { scale: 1, x: 0, y: 0 };
  return { scale: baseScale * m.scale, x: m.x, y: m.y };
}

/** Progress through a clip at an absolute project time, clamped to [0,1]. */
export function clipProgress(
  clip: Pick<EditorClip, "startMs" | "durationMs">,
  timeMs: number,
): number {
  if (clip.durationMs <= 0) return 0;
  const p = (timeMs - clip.startMs) / clip.durationMs;
  return p <= 0 ? 0 : p >= 1 ? 1 : p;
}

/**
 * The CSS transform for a sampled clip.
 *
 * Motion offsets are fractions of the frame, so they become pixels here and
 * ONLY here. The order — translate then scale, about the centre — is the order
 * the bake and the filter graph use.
 */
export function motionTransformCss(
  sample: MotionSample,
  frameWidth: number,
  frameHeight: number,
  transform: EditorTransform | undefined,
): string {
  const t = transform ?? {};
  const x = (t.x ?? 0) + sample.x * frameWidth;
  const y = (t.y ?? 0) + sample.y * frameHeight;
  const rotation = t.rotation ?? 0;
  return `translate(${x}px, ${y}px) scale(${sample.scale}) rotate(${rotation}deg)`;
}
