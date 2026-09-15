/**
 * The composition bridge: what the renderer cannot composite, a browser can.
 *
 * ==================== THE IDEA, AND WHY IT IS NOT A REWRITE ====================
 * `buildFilterGraph` accepts one still per entry. It cannot stack two layers,
 * scale one of them, or put text at an arbitrary position. But the slide system
 * ALREADY manufactures its stills by pointing Playwright at authored HTML and
 * screenshotting at 1920x1080 (`build-slides.mjs`) — so anything the editor's
 * preview can express in DOM, that same recipe can flatten into a PNG the
 * renderer will happily accept as an ordinary entry.
 *
 * So the bridge is not a new renderer. It is a pre-pass that turns "two layers
 * with a transform" into "one picture", and hands the picture to the renderer
 * that already exists.
 *
 * ==================== WHAT THIS MODULE PRODUCES ====================
 * A `BakePlan`: a declarative list of scenes, each naming the frame files and
 * transforms to composite. It renders nothing itself — it cannot, because the
 * frames and the browser live on the production laptop. It emits the
 * instructions, and `scripts/bake-editor-scenes.mjs` executes them there.
 *
 * ==================== THE HONESTY RULE IS UNCHANGED ====================
 * A property that CAN be baked stops being a `CompileDrop`, because it will
 * survive to the master. A property that cannot — per-clip audio gain, per-cut
 * transition length — stays a drop. What must never happen is a property
 * disappearing from BOTH lists.
 */

import {
  isVisualTrackKind,
  type EditorClip,
  type EditorProject,
} from "@/shared/types/video-editor";

/** One composited layer inside a scene, in project pixels. */
export type BakeLayer = {
  readonly clipId: string;
  readonly kind: EditorClip["kind"];
  /** Frame file for image-like layers; absent for text. */
  readonly assetId: string | null;
  readonly text: string | null;
  readonly transform: {
    readonly x: number;
    readonly y: number;
    readonly scale: number;
    readonly rotation: number;
    readonly opacity: number;
    readonly fit: "cover" | "contain";
  };
  readonly style: {
    readonly fontSize: number;
    readonly color: string;
    readonly align: "left" | "center" | "right";
    readonly background: string | null;
  } | null;
};

export type BakeScene = {
  /** Matches the timeline entry's `stepIndex`. */
  readonly stepIndex: number;
  readonly startMs: number;
  readonly endMs: number;
  /** Bottom to top. The last one paints over everything before it. */
  readonly layers: readonly BakeLayer[];
  /** Where the laptop should write the composited PNG. */
  readonly outputName: string;
  /** Why this scene needs baking at all — for the report. */
  readonly reasons: readonly string[];
};

export type BakePlan = {
  readonly projectId: string;
  readonly width: number;
  readonly height: number;
  readonly scenes: readonly BakeScene[];
};

const DEFAULT_TRANSFORM = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
  fit: "cover" as const,
};

/**
 * True when the clip carries anything the filter graph cannot express alone.
 *
 * ==================== SCALE AND POSITION LEFT THIS LIST ====================
 * They used to force a bake. The filter graph now carries a per-entry camera
 * spec — a start and end scale and offset with an easing — and a static
 * framing is simply a move whose start equals its end. Expressing them
 * natively is what allows a shot to MOVE: a baked PNG is one picture, so a
 * push-in composited into a still would render as a static crop, which is
 * exactly what the last master did.
 *
 * Rotation and opacity stay: the graph has no per-entry rotate, and a
 * partially transparent entry means compositing with whatever is under it.
 */
export function needsBake(clip: EditorClip): string[] {
  const reasons: string[] = [];
  const t = clip.transform;
  if (t) {
    if (t.rotation !== undefined && t.rotation !== 0) reasons.push("rotation");
    if (t.opacity !== undefined && t.opacity !== 1) reasons.push("opacity");
  }
  if (clip.kind === "text") reasons.push("text layer");
  return reasons;
}

/** Framing the filter graph now carries itself, reported as native, not baked. */
export function nativeTransformReasons(clip: EditorClip): string[] {
  const reasons: string[] = [];
  const t = clip.transform;
  if (t?.scale !== undefined && t.scale !== 1) reasons.push("scale");
  if ((t?.x ?? 0) !== 0 || (t?.y ?? 0) !== 0) reasons.push("position");
  if (t?.fit !== undefined) reasons.push("fit");
  if (clip.motion && clip.motion.preset !== "none") reasons.push("motion");
  return reasons;
}

function toLayer(clip: EditorClip): BakeLayer {
  const t = { ...DEFAULT_TRANSFORM, ...(clip.transform ?? {}) };
  return {
    clipId: clip.id,
    kind: clip.kind,
    assetId: clip.assetId ?? null,
    text: clip.text?.text ?? null,
    transform: {
      x: t.x ?? 0,
      y: t.y ?? 0,
      scale: t.scale ?? 1,
      rotation: t.rotation ?? 0,
      opacity: t.opacity ?? 1,
      fit: t.fit ?? "cover",
    },
    style:
      clip.kind === "text" || clip.text
        ? {
            fontSize: clip.text?.fontSize ?? 96,
            color: clip.text?.color ?? "#ffffff",
            align: clip.text?.align ?? "center",
            background: clip.text?.background ?? null,
          }
        : null,
  };
}

/**
 * Builds a bake scene for one timeline interval, or null when the interval is
 * a single untransformed layer the renderer can already take as-is.
 *
 * Not baking when it is unnecessary matters: a bake replaces the original
 * 1920x1080 slide with a re-screenshotted copy, and doing that to 25 slides
 * that did not need it costs minutes of Playwright time and risks a
 * re-encode artefact for no gain.
 */
export function sceneFor(
  project: EditorProject,
  stepIndex: number,
  startMs: number,
  endMs: number,
  stack: readonly { clip: EditorClip; trackKind: string }[],
): BakeScene | null {
  /**
   * Captions are excluded from the composite on purpose. The renderer has its
   * OWN caption channel (a drawtext band, or a per-entry .ass document), so a
   * caption baked into the frame would be drawn twice — once in the picture and
   * again over it. Captions are also why almost every interval looked like it
   * needed compositing before this filter existed: 29 scenes for an episode
   * with one overlay.
   */
  const visual = stack.filter(
    (s) => isVisualTrackKind(s.trackKind as never) && s.trackKind !== "caption",
  );
  if (visual.length === 0) return null;

  const reasons: string[] = [];
  if (visual.length > 1) {
    reasons.push(`${visual.length} overlapping layers`);
  }
  for (const { clip } of visual) {
    for (const reason of needsBake(clip)) {
      if (!reasons.includes(reason)) reasons.push(reason);
    }
  }

  if (reasons.length === 0) return null;

  return {
    stepIndex,
    startMs,
    endMs,
    layers: visual.map((v) => toLayer(v.clip)),
    outputName: `baked-${String(stepIndex).padStart(3, "0")}.png`,
    reasons,
  };
}

export function describeBakePlan(plan: BakePlan): string {
  if (plan.scenes.length === 0) return "no scenes need compositing";
  const layers = plan.scenes.reduce((n, s) => n + s.layers.length, 0);
  return `${plan.scenes.length} scene${plan.scenes.length === 1 ? "" : "s"} to composite, ${layers} layers`;
}
