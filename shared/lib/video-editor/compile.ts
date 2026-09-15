/**
 * Lowers an `EditorProject` onto the production renderer's `Timeline`.
 *
 * ==================== THE RENDERER IS SINGLE-TRACK ====================
 * `buildFilterGraph` consumes a strictly linear chain: N contiguous entries,
 * each one still or one video occupying [startMs, endMs), joined by concat or
 * a single global crossfade. There is no second video layer, no per-clip
 * transform, no per-clip audio gain, no per-cut transition, and text can only
 * ride an entry that already carries narration.
 *
 * The editor is deliberately a SUPERSET of that. Eight tracks, per-clip
 * transforms and per-clip audio exist because they are the right model for an
 * editor and because a second back-end (the Remotion path) already consumes
 * the same Timeline with more of them supported.
 *
 * ==================== SO THIS COMPILER'S REAL JOB IS THE DROP REPORT ====================
 * Flattening is the easy half. The half that matters is saying what did not
 * survive. A compiler that silently discarded a scale, an overlay layer or a
 * per-clip volume would produce a master that does not match the timeline the
 * operator approved — and they would find out by watching it. Every
 * unrepresentable property therefore produces a `CompileDrop` naming the clip,
 * the property, and why the renderer cannot carry it.
 *
 * This does NOT render, and it does NOT write files. It produces the plan and
 * the truth about the plan; the laptop-side pipeline does the rest.
 */

import {
  clipEndMs,
  clipTransition,
  isAudioTrackKind,
  projectDurationMs,
  visualClipsAt,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
  type MotionEasing,
  type TransitionKind,
} from "@/shared/types/video-editor";
import {
  needsBake,
  nativeTransformReasons,
  sceneFor,
  type BakePlan,
  type BakeScene,
} from "./bake";
import { isStillMotion, STILL_MOTION } from "./motion";

/** Matches TRANSITION_MS in render-episode.mjs. */
export const RENDER_TRANSITION_MS = 260;

/**
 * The floor for an entry with no transition: a couple of frames, so it is at
 * least one visible picture.
 *
 * It used to be `RENDER_TRANSITION_MS + 40` because EVERY cut carried the
 * global crossfade, so every entry had to outlast a dissolve it might not
 * want. With per-cut transitions the real constraint is per entry — see the
 * check below, which adds the entry's own transition on top of this.
 */
const MIN_ENTRY_MS = 80;

export type TimelineEntry = {
  readonly stepIndex: number;
  readonly startMs: number;
  readonly endMs: number;
  /** Library-relative id or slide id. The laptop resolves it to a real path. */
  readonly screenshotPath: string;
  /**
   * Narration for this entry.
   *
   * A REFERENCE, not a path. The compiler runs in a browser and has no idea
   * where the audio masters live; the worker on the production laptop resolves
   * `ref` inside the episode's own audio directory, exactly as it resolves
   * frames. A path here would be a path the browser chose, which is the thing
   * the job contract exists to prevent.
   */
  readonly audioClip?: {
    readonly ref: string;
    readonly durationMs: number;
  };
  readonly sourceTreatment?: {
    readonly fit: "cover" | "contain";
  };
  /**
   * The camera over this entry, in the renderer's own terms.
   *
   * Scale is a multiplier on a frame-filling picture; x/y are the picture's
   * centre offset as a FRACTION of frame width and height. `progressStart` /
   * `progressEnd` are the slice of the SOURCE CLIP this entry covers, because
   * a clip that sits under an overlay is cut into several entries and each one
   * must continue the same move rather than restart it.
   *
   * The editor and the filter graph evaluate the same formula — see
   * `shared/lib/video-editor/motion.ts`.
   */
  readonly cameraMotion?: {
    readonly startScale: number;
    readonly endScale: number;
    readonly startX: number;
    readonly startY: number;
    readonly endX: number;
    readonly endY: number;
    readonly easing: MotionEasing;
    readonly progressStart: number;
    readonly progressEnd: number;
  };
  /**
   * The transition INTO this entry, held in place: the previous entry's last
   * frame is held for `durationMs` and this one arrives over it. Timeline time
   * therefore equals output time — see `composition.ts`.
   */
  readonly transitionIn?: {
    readonly kind: TransitionKind;
    readonly durationMs: number;
  };
};

export type CompiledTimeline = {
  readonly videoTitle: string;
  readonly totalDurationMs: number;
  readonly entries: readonly TimelineEntry[];
};

export type CompileDrop = {
  readonly clipId: string;
  readonly clipLabel: string;
  readonly property: string;
  readonly reason: string;
};

export type CompileResult = {
  readonly timeline: CompiledTimeline;
  /** Everything the renderer cannot carry, named. Never silently discarded. */
  readonly drops: readonly CompileDrop[];
  /** Structural problems that would make the render wrong, not just lossy. */
  readonly errors: readonly string[];
  /**
   * Output length. Equal to the timeline's own length: a transition holds the
   * outgoing frame rather than overlapping its neighbour, so the master is not
   * shortened by one dissolve per cut the way the old global crossfade was.
   */
  readonly expectedOutputMs: number;
  /**
   * Scenes the laptop must composite before rendering. Anything represented
   * here is NOT a drop: it survives to the master, through the bake.
   */
  readonly bakePlan: BakePlan;
  /**
   * Properties that survive BECAUSE the bake runs, as `clipId:property`.
   * The invariant this exists to make checkable: every non-default property is
   * in exactly one of `drops`, `bakedProperties` or `nativeProperties` — never
   * in none of them.
   */
  readonly bakedProperties: readonly string[];
  /**
   * Properties the filter graph now carries itself: framing and camera motion.
   * Neither dropped nor baked — rendered.
   */
  readonly nativeProperties: readonly string[];
};

function describeTrack(track: EditorTrack): string {
  return `${track.name} (${track.kind})`;
}

/**
 * Cut points: every instant at which the visible composition changes.
 *
 * Taking the union of all visual clip boundaries — rather than just the base
 * track's — is what makes an overlay appearing mid-shot produce its own entry.
 * Without it, the overlay would either not appear or would replace the whole
 * shot.
 */
function cutPoints(project: EditorProject): number[] {
  const points = new Set<number>([0]);
  for (const track of project.tracks) {
    if (track.hidden || isAudioTrackKind(track.kind)) continue;
    // A caption appearing is not a picture cut. Letting captions punctuate the
    // entry list would slice every shot into caption-shaped pieces and add a
    // crossfade at each one.
    if (track.kind === "caption") continue;
    for (const clip of track.clips) {
      points.add(clip.startMs);
      points.add(clipEndMs(clip));
    }
  }
  return [...points].sort((a, b) => a - b);
}

/** Where a voice clip's audio can be found, keyed by clip id. */
export type AudioRefs = Readonly<
  Record<string, { readonly ref: string; readonly fileMs: number }>
>;

/**
 * Narration that starts at an entry boundary, keyed by that entry's start.
 *
 * The renderer attaches at most ONE clip per entry and delays it to that
 * entry's start (`adelay`), so a voice clip beginning mid-entry cannot be
 * expressed: it would play early by the difference. Those are reported as
 * drops rather than silently shifted, because a line that starts at the wrong
 * moment is worse than a line that is missing and named.
 */
function narrationByStart(
  project: EditorProject,
  audio: AudioRefs,
): { byStart: Map<number, { clip: EditorClip; ref: string; fileMs: number }>; loose: EditorClip[] } {
  const byStart = new Map<
    number,
    { clip: EditorClip; ref: string; fileMs: number }
  >();
  const loose: EditorClip[] = [];
  for (const track of project.tracks) {
    if (track.kind !== "voice" || track.muted) continue;
    for (const clip of track.clips) {
      const source = audio[clip.id];
      if (!source) continue;
      if (byStart.has(clip.startMs)) {
        loose.push(clip);
        continue;
      }
      byStart.set(clip.startMs, { clip, ref: source.ref, fileMs: source.fileMs });
    }
  }
  return { byStart, loose };
}

export function compileProjectToTimeline(
  project: EditorProject,
  opts: {
    /**
     * Narration references. Absent means the timeline compiles silent — which
     * the compositor's own silent path currently mishandles, so a caller that
     * has audio should always pass it.
     */
    readonly audio?: AudioRefs;
    /**
     * Whether the caller can run the bake pass. Defaults to true because the
     * production path can; a caller that cannot composite passes false and gets
     * the honest drop list instead of a promise nobody will keep.
     */
    readonly bake?: boolean;
  } = {},
): CompileResult {
  // There is no global transition length any more. Each clip carries its own
  // (`clipTransition`), so a caller cannot set one for the whole film — which
  // was how the renderer and the editor came to disagree about the length of
  // the master in the first place.
  const bakeEnabled = opts.bake ?? true;
  const audio = opts.audio ?? {};
  const drops: CompileDrop[] = [];
  const errors: string[] = [];
  const bakedProperties: string[] = [];
  const nativeProperties: string[] = [];
  const scenes: BakeScene[] = [];

  /* ── 1. What cannot survive, per clip ─────────────────────────────────── */
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      // Transforms are no longer dropped. The filter graph still cannot express
      // them, but the bake pass composites them into the frame before the
      // renderer sees it, so they DO reach the master. A bakeable property
      // therefore belongs in the bake plan rather than the drop report — and
      // every property must appear in exactly one of the two, never neither.
      if (bakeEnabled) {
        for (const reason of needsBake(clip)) {
          bakedProperties.push(`${clip.id}:${reason}`);
        }
      } else {
        for (const reason of needsBake(clip)) {
          drops.push({
            clipId: clip.id,
            clipLabel: clip.label,
            property: `transform.${reason}`,
            reason:
              "The filter graph has no per-entry transform, and baking is disabled for this compile.",
          });
        }
      }

      if (clip.audio) {
        if (clip.audio.volume !== undefined && clip.audio.volume !== 1) {
          drops.push({
            clipId: clip.id,
            clipLabel: clip.label,
            property: "audio.volume",
            reason:
              "Narration carries one global gain (narrationGainDb). Per-clip volume needs the source file pre-processed.",
          });
        }
        if (clip.audio.fadeInMs || clip.audio.fadeOutMs) {
          drops.push({
            clipId: clip.id,
            clipLabel: clip.label,
            property: "audio.fade",
            reason: "No fade is applied to narration clips by the graph.",
          });
        }
      }

    }
  }

  const { byStart: narration, loose: looseNarration } = narrationByStart(
    project,
    audio,
  );
  for (const clip of looseNarration) {
    drops.push({
      clipId: clip.id,
      clipLabel: clip.label,
      property: "narration overlap",
      reason:
        "The renderer attaches at most one narration clip per entry. A second clip starting at the same instant cannot be carried.",
    });
  }

  /* ── 2. Layers that cannot coexist ────────────────────────────────────── */
  const points = cutPoints(project);
  const entries: TimelineEntry[] = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const startMs = points[i];
    const endMs = points[i + 1];
    if (endMs <= startMs) continue;

    // Sample at the midpoint: a boundary instant belongs to the next entry,
    // and sampling exactly on it would pick up the clip that just ended.
    const mid = (startMs + endMs) / 2;
    const stack = visualClipsAt(project, mid).filter(
      (s) => s.track.kind !== "caption",
    );
    if (stack.length === 0) continue;

    const top = stack[stack.length - 1];

    const scene = bakeEnabled
      ? sceneFor(
          project,
          entries.length,
          startMs,
          endMs,
          stack.map((s) => ({ clip: s.clip, trackKind: s.track.kind })),
        )
      : null;

    if (scene) {
      scenes.push(scene);
    } else if (stack.length > 1) {
      // Only reachable with baking disabled: the layers genuinely cannot be
      // carried, so each one is named.
      for (const under of stack.slice(0, -1)) {
        drops.push({
          clipId: under.clip.id,
          clipLabel: under.clip.label,
          property: `layer under ${describeTrack(top.track)}`,
          reason:
            "The renderer composites one visual layer per instant, and baking is disabled for this compile.",
        });
      }
    }

    const voice = narration.get(startMs);

    /* ── Framing and camera, per entry ──────────────────────────────────── */
    // A baked scene already HAS the framing painted into its picture, and a
    // still picture cannot move — so motion on a composited layer is a drop,
    // named, rather than a move that silently does not happen.
    let cameraMotion: TimelineEntry["cameraMotion"];
    if (scene) {
      for (const layer of stack) {
        for (const reason of nativeTransformReasons(layer.clip)) {
          if (reason === "motion") {
            drops.push({
              clipId: layer.clip.id,
              clipLabel: layer.clip.label,
              property: "motion",
              reason:
                "This instant composites several layers (or a rotation/opacity), so it is baked to one still. A still cannot carry a camera move.",
            });
          } else {
            bakedProperties.push(`${layer.clip.id}:${reason}`);
          }
        }
      }
    } else {
      const clip = top.clip;
      const motion = clip.motion ?? STILL_MOTION;
      const baseScale = clip.transform?.scale ?? 1;
      const offsetX = (clip.transform?.x ?? 0) / project.width;
      const offsetY = (clip.transform?.y ?? 0) / project.height;
      const moving = !isStillMotion(clip.motion);
      const framed = baseScale !== 1 || offsetX !== 0 || offsetY !== 0;

      if (moving || framed) {
        // The clip's framing and its move, composed into one spec — so the
        // renderer applies exactly one scale and one offset, and cannot apply
        // the framing twice.
        const span = clip.durationMs > 0 ? clip.durationMs : 1;
        cameraMotion = {
          startScale: baseScale * motion.startScale,
          endScale: baseScale * motion.endScale,
          startX: offsetX + motion.startX,
          startY: offsetY + motion.startY,
          endX: offsetX + motion.endX,
          endY: offsetY + motion.endY,
          easing: motion.easing,
          progressStart: (startMs - clip.startMs) / span,
          progressEnd: (endMs - clip.startMs) / span,
        };
        for (const reason of nativeTransformReasons(clip)) {
          nativeProperties.push(`${clip.id}:${reason}`);
        }
      } else if (clip.transform?.fit) {
        nativeProperties.push(`${clip.id}:fit`);
      }
    }

    /* ── The transition into this entry ─────────────────────────────────── */
    // Only where a clip BEGINS. An entry boundary in the middle of a clip is
    // the compiler slicing for an overlay, not an editorial cut, and putting a
    // dissolve there would fade a shot into itself.
    const transition = clipTransition(top.clip);
    const beginsHere = startMs === top.clip.startMs;
    const transitionIn =
      beginsHere && transition.kind !== "cut" && transition.durationMs > 0
        ? transition
        : null;

    if (transitionIn && entries.length === 0) {
      // Nothing precedes the first entry, so there is nothing to come out of.
      drops.push({
        clipId: top.clip.id,
        clipLabel: top.clip.label,
        property: "transitionIn",
        reason:
          "This is the first shot in the film; a transition needs a picture to come from.",
      });
    }

    entries.push({
      stepIndex: entries.length,
      startMs,
      endMs,
      // A baked scene REPLACES the source frame for this entry.
      screenshotPath: scene
        ? scene.outputName
        : (top.clip.assetId ?? top.clip.id),
      ...(top.clip.transform?.fit
        ? { sourceTreatment: { fit: top.clip.transform.fit } }
        : {}),
      ...(cameraMotion ? { cameraMotion } : {}),
      ...(transitionIn && entries.length > 0 ? { transitionIn } : {}),
      ...(voice
        ? { audioClip: { ref: voice.ref, durationMs: voice.fileMs } }
        : {}),
    });
    if (voice) narration.delete(startMs);
  }

  /* ── 3. Structural validation the renderer will not do for us ─────────── */
  if (entries.length === 0) {
    errors.push("No visual clips: the timeline would render nothing.");
  }

  if (entries.length > 0 && entries[0].startMs !== 0) {
    errors.push(
      `The first entry starts at ${entries[0].startMs}ms. The renderer requires entries[0].startMs === 0; a gap at the head desynchronises picture from sound.`,
    );
  }

  for (let i = 1; i < entries.length; i += 1) {
    if (entries[i].startMs !== entries[i - 1].endMs) {
      errors.push(
        `Gap or overlap between entry ${i - 1} (ends ${entries[i - 1].endMs}ms) and entry ${i} (starts ${entries[i].startMs}ms). The graph never validates contiguity — a gap vanishes from the picture but still shifts the audio.`,
      );
    }
  }

  // An entry must outlast its own transition. With per-cut transitions this is
  // per entry rather than one global floor: a hard cut needs only to be a
  // couple of frames long, while a 600ms dissolve needs a shot to dissolve
  // into.
  for (const entry of entries) {
    const length = entry.endMs - entry.startMs;
    const floor = Math.max(
      MIN_ENTRY_MS,
      (entry.transitionIn?.durationMs ?? 0) + 40,
    );
    if (length < floor) {
      errors.push(
        `Entry ${entry.stepIndex} (${entry.screenshotPath}) lasts ${length}ms, which is not longer than its ${String(entry.transitionIn?.durationMs ?? 0)}ms transition plus a margin. The renderer refuses this.`,
      );
    }
  }

  /* ── 4. Audio beyond one narration line per entry ─────────────────────── */
  const voiceTracks = project.tracks.filter((t) => t.kind === "voice");
  if (voiceTracks.length > 1) {
    errors.push("More than one VOICEOVER track; the renderer supports one.");
  }
  const musicTracks = project.tracks.filter((t) => t.kind === "music");
  for (const track of musicTracks) {
    if (track.clips.length > 1) {
      drops.push({
        clipId: track.clips[1].id,
        clipLabel: track.clips[1].label,
        property: "music clips",
        reason:
          "Music is one looped bed for the whole render, not a track of clips. Only the first is used.",
      });
    }
  }

  // Anything left has no entry beginning at its start — it would play early.
  for (const [startMs, left] of narration) {
    drops.push({
      clipId: left.clip.id,
      clipLabel: left.clip.label,
      property: "narration start",
      reason: `No visual cut begins at ${startMs}ms, and the renderer delays narration to its entry's start — this line would play early.`,
    });
  }

  const totalDurationMs = projectDurationMs(project);
  /**
   * Output length EQUALS timeline length.
   *
   * The old global crossfade overlapped neighbouring entries, so the master
   * came out (n-1) x 260ms shorter than the timeline — 9.1 seconds on this
   * episode — and no clock in the editor could agree with the file. A
   * transition now holds the outgoing frame instead of eating into it, so the
   * two are the same number and a timecode in the editor is a timecode in the
   * master.
   */
  const expectedOutputMs = entries.length > 0 ? totalDurationMs : 0;

  return {
    timeline: {
      videoTitle: project.title,
      totalDurationMs,
      entries,
    },
    drops,
    errors,
    expectedOutputMs,
    bakePlan: {
      projectId: project.id,
      width: project.width,
      height: project.height,
      scenes,
    },
    bakedProperties,
    nativeProperties,
  };
}

/** Properties that survive BECAUSE of the bake. Reported, never silent. */
export function bakedPropertyCount(result: CompileResult): number {
  return result.bakePlan.scenes.reduce((n, s) => n + s.reasons.length, 0);
}

/** A one-line human summary, for the export dialog. */
export function describeCompileResult(result: CompileResult): string {
  const transitions = result.timeline.entries.filter((e) => e.transitionIn).length;
  const moving = result.timeline.entries.filter((e) => e.cameraMotion).length;
  const parts = [
    `${result.timeline.entries.length} entries`,
    `${Math.round(result.expectedOutputMs / 1000)}s`,
  ];
  if (moving) parts.push(`${moving} with camera moves`);
  if (transitions) parts.push(`${transitions} transitions`);
  if (result.bakePlan.scenes.length) {
    parts.push(`${result.bakePlan.scenes.length} to composite`);
  }
  if (result.drops.length) parts.push(`${result.drops.length} dropped`);
  if (result.errors.length) parts.push(`${result.errors.length} blocking`);
  return parts.join(" · ");
}
