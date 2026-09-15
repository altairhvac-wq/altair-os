/**
 * What is on screen at one instant, transitions included.
 *
 * ==================== THE TIME MODEL, STATED ONCE ====================
 * A transition happens INSIDE the incoming clip's own time:
 *
 *      ... clip A ...][=== d ===|          clip B          ]
 *                     ^ B.startMs
 *
 * During `[B.start, B.start + d)` the outgoing clip is HELD on its last frame
 * underneath, and B arrives over it — fading, or sliding, or through black.
 * Nothing is moved and nothing is shortened: B still starts where the timeline
 * says, the project still ends where it ended, and narration measured against
 * the cut still lands on the cut.
 *
 * This is deliberately NOT how the renderer's old global crossfade worked. That
 * one overlapped neighbouring entries, so the master came out shorter than the
 * timeline by one transition per cut — 9.1 seconds on this episode — and the
 * preview could never agree with it. Holding the outgoing frame instead keeps
 * timeline time and master time the same number, which is the only version an
 * operator can trust while editing.
 *
 * `compileProjectToTimeline` emits the same windows for the renderer, so the
 * two sides describe one composition rather than two.
 */

import {
  clipEndMs,
  clipTransition,
  isVisualTrackKind,
  EDITOR_TRACK_KINDS,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
  type TransitionKind,
} from "@/shared/types/video-editor";
import { clipProgress, sampleClip, type MotionSample } from "./motion";

export type CompositedLayer = {
  readonly clip: EditorClip;
  readonly track: EditorTrack;
  /** Where this layer's camera move has got to. */
  readonly sample: MotionSample;
  /** Transition opacity, before the clip's own. 1 outside a transition. */
  readonly opacity: number;
  /** Black wash over this layer, 0..1 — "fade through black". */
  readonly veil: number;
  /** Slide offset, as a fraction of frame width / height. */
  readonly slideX: number;
  readonly slideY: number;
  /** True when this layer is only here because it is fading out underneath. */
  readonly outgoing: boolean;
};

/**
 * What was on screen the instant before a clip began.
 *
 * Deliberately ACROSS tracks, not just the same one. The renderer flattens
 * every visual track into one chain of entries and dissolves between
 * neighbours in that chain, so "the previous picture" is whatever was topmost
 * a millisecond earlier — which may be a card on the graphics track over a
 * photograph on the video track. Looking only at the same track would fade in
 * from black exactly where the master fades in from the previous shot.
 *
 * Captions are excluded: the renderer draws them in its own channel, and a
 * subtitle is not what a shot dissolves from.
 */
function topVisualAt(
  project: EditorProject,
  timeMs: number,
  excludeClipId: string,
): { clip: EditorClip; track: EditorTrack } | null {
  let best: { clip: EditorClip; track: EditorTrack } | null = null;
  for (const track of project.tracks) {
    if (track.hidden || !isVisualTrackKind(track.kind)) continue;
    if (track.kind === "caption") continue;
    for (const clip of track.clips) {
      if (clip.id === excludeClipId || clip.hidden) continue;
      if (timeMs < clip.startMs || timeMs >= clipEndMs(clip)) continue;
      if (
        !best ||
        EDITOR_TRACK_KINDS.indexOf(track.kind) >=
          EDITOR_TRACK_KINDS.indexOf(best.track.kind)
      ) {
        best = { clip, track };
      }
    }
  }
  return best;
}

/** True when a clip is on screen in its own right at this instant. */
function isActiveAt(clip: EditorClip, timeMs: number): boolean {
  return timeMs >= clip.startMs && timeMs < clipEndMs(clip);
}

function slideOffset(kind: TransitionKind, remaining: number): {
  x: number;
  y: number;
} {
  switch (kind) {
    // Named for FFmpeg's xfade: `slideleft` brings the incoming picture in
    // from the right and moves it left.
    case "slideLeft":
      return { x: remaining, y: 0 };
    case "slideRight":
      return { x: -remaining, y: 0 };
    case "slideUp":
      return { x: 0, y: remaining };
    case "slideDown":
      return { x: 0, y: -remaining };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Every visual layer at `timeMs`, bottom to top.
 *
 * Ordering is the track order in `EDITOR_TRACK_KINDS` (the z-order), with an
 * outgoing transition partner immediately below its incoming clip.
 */
export function compositionAt(
  project: EditorProject,
  timeMs: number,
): CompositedLayer[] {
  const out: CompositedLayer[] = [];

  for (const track of project.tracks) {
    if (track.hidden || !isVisualTrackKind(track.kind)) continue;

    for (const clip of track.clips) {
      if (clip.hidden) continue;
      if (timeMs < clip.startMs || timeMs >= clipEndMs(clip)) continue;

      const transition = clipTransition(clip);
      const inTransition =
        transition.kind !== "cut" &&
        transition.durationMs > 0 &&
        timeMs < clip.startMs + transition.durationMs;

      if (!inTransition) {
        out.push({
          clip,
          track,
          sample: sampleClip(clip, clipProgress(clip, timeMs)),
          opacity: 1,
          veil: 0,
          slideX: 0,
          slideY: 0,
          outgoing: false,
        });
        continue;
      }

      const q = (timeMs - clip.startMs) / transition.durationMs;
      const previous = topVisualAt(project, clip.startMs - 1, clip.id);

      // Held on its last frame, exactly as the renderer holds it — unless it
      // is still running underneath, in which case it is already being drawn
      // and freezing a second copy over it would be the wrong picture.
      if (previous && !isActiveAt(previous.clip, timeMs)) {
        out.push({
          clip: previous.clip,
          track: previous.track,
          sample: sampleClip(previous.clip, 1),
          opacity: 1,
          veil: transition.kind === "fadeBlack" ? Math.min(1, q * 2) : 0,
          slideX: 0,
          slideY: 0,
          outgoing: true,
        });
      }

      const sample = sampleClip(clip, clipProgress(clip, timeMs));
      if (transition.kind === "crossfade") {
        out.push({ clip, track, sample, opacity: q, veil: 0, slideX: 0, slideY: 0, outgoing: false });
      } else if (transition.kind === "fadeBlack") {
        // First half: the outgoing picture goes to black. Second half: this one
        // comes out of it.
        out.push({
          clip,
          track,
          sample,
          opacity: q < 0.5 ? 0 : 1,
          veil: q < 0.5 ? 1 : Math.max(0, 2 - q * 2),
          slideX: 0,
          slideY: 0,
          outgoing: false,
        });
      } else {
        const { x, y } = slideOffset(transition.kind, 1 - q);
        out.push({ clip, track, sample, opacity: 1, veil: 0, slideX: x, slideY: y, outgoing: false });
      }
    }
  }

  return out.sort((a, b) => {
    const byTrack =
      EDITOR_TRACK_KINDS.indexOf(a.track.kind) -
      EDITOR_TRACK_KINDS.indexOf(b.track.kind);
    if (byTrack !== 0) return byTrack;
    // Within a track, the outgoing clip paints first so the incoming one
    // arrives over it.
    return Number(a.outgoing ? 0 : 1) - Number(b.outgoing ? 0 : 1);
  });
}

/** Identity of the composition, for deciding when the preview must re-render. */
export function compositionKey(layers: readonly CompositedLayer[]): string {
  let key = "";
  for (const layer of layers) key += `${layer.clip.id}${layer.outgoing ? "^" : ""}|`;
  return key;
}

/**
 * Whether anything on screen is moving at this instant — a camera move or a
 * transition in progress. When nothing is, the preview can leave the DOM alone.
 */
export function compositionIsAnimating(
  layers: readonly CompositedLayer[],
): boolean {
  for (const layer of layers) {
    if (layer.outgoing || layer.opacity !== 1 || layer.veil !== 0) return true;
    if (layer.slideX !== 0 || layer.slideY !== 0) return true;
    const m = layer.clip.motion;
    if (m && (m.startScale !== m.endScale || m.startX !== m.endX || m.startY !== m.endY)) {
      return true;
    }
  }
  return false;
}
