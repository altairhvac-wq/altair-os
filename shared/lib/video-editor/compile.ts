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
  isAudioTrackKind,
  projectDurationMs,
  visualClipsAt,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
} from "@/shared/types/video-editor";
import { needsBake, sceneFor, type BakePlan, type BakeScene } from "./bake";

/** Matches TRANSITION_MS in render-episode.mjs. */
export const RENDER_TRANSITION_MS = 260;

/**
 * The renderer refuses any entry not strictly longer than the crossfade
 * (CompositionError, buildFilterGraph.ts). Enforced here so the failure is a
 * readable report rather than a stack trace two machines away.
 */
const MIN_ENTRY_MS = RENDER_TRANSITION_MS + 40;

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
  /** Output length after crossfades: raw − (n−1) × transitionMs. */
  readonly expectedOutputMs: number;
  /**
   * Scenes the laptop must composite before rendering. Anything represented
   * here is NOT a drop: it survives to the master, through the bake.
   */
  readonly bakePlan: BakePlan;
  /**
   * Properties that survive BECAUSE the bake runs, as `clipId:property`.
   * The invariant this exists to make checkable: every non-default property is
   * in exactly one of `drops` or `bakedProperties` — never in neither.
   */
  readonly bakedProperties: readonly string[];
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
    readonly transitionMs?: number;
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
  const transitionMs = opts.transitionMs ?? RENDER_TRANSITION_MS;
  const bakeEnabled = opts.bake ?? true;
  const audio = opts.audio ?? {};
  const drops: CompileDrop[] = [];
  const errors: string[] = [];
  const bakedProperties: string[] = [];
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

      if (clip.transitionInMs && clip.transitionInMs !== transitionMs) {
        drops.push({
          clipId: clip.id,
          clipLabel: clip.label,
          property: "transitionInMs",
          reason: `Every cut uses the same ${transitionMs}ms crossfade; per-cut duration is not expressible.`,
        });
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

  for (const entry of entries) {
    const length = entry.endMs - entry.startMs;
    if (length < MIN_ENTRY_MS) {
      errors.push(
        `Entry ${entry.stepIndex} (${entry.screenshotPath}) lasts ${length}ms, which is not comfortably longer than the ${transitionMs}ms crossfade. The renderer refuses this.`,
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
  const expectedOutputMs =
    entries.length > 0
      ? totalDurationMs - (entries.length - 1) * transitionMs
      : 0;

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
  };
}

/** Properties that survive BECAUSE of the bake. Reported, never silent. */
export function bakedPropertyCount(result: CompileResult): number {
  return result.bakePlan.scenes.reduce((n, s) => n + s.reasons.length, 0);
}

/** A one-line human summary, for the export dialog. */
export function describeCompileResult(result: CompileResult): string {
  const parts = [
    `${result.timeline.entries.length} entries`,
    `${Math.round(result.expectedOutputMs / 1000)}s after crossfades`,
  ];
  if (result.bakePlan.scenes.length) {
    parts.push(`${result.bakePlan.scenes.length} to composite`);
  }
  if (result.drops.length) parts.push(`${result.drops.length} dropped`);
  if (result.errors.length) parts.push(`${result.errors.length} blocking`);
  return parts.join(" · ");
}
