/**
 * The compressor practice episode — a complete, editable Studio project.
 *
 * ==================== WHY THIS SITS BESIDE THE DEMO EPISODE ====================
 * `demo-project.ts` loads the rendered hvac-01 episode: a cut the slide system
 * produced, committed so the editor always has something real to open. This is
 * the same idea one step further along the production path — a cut the DIRECTOR
 * produced, with its visuals chosen by the agent platform's curation out of the
 * HVAC photo library, committed for the same reason.
 *
 * Both resolve on the server. A generated draft cannot: it lives in one
 * browser's localStorage and is gone when that browser is. A practice film that
 * has to be re-imported every morning is not a practice film.
 *
 * ==================== WHAT THE SNAPSHOT IS ====================
 * Built by `scripts/practice/build-practice-episode.mjs`. Do not edit by hand.
 * Its durations are MEASURED from the synthesised narration, not estimated:
 * every clip edge is where the voice actually stops plus the production tail
 * rule, so a cut here is a cut in the render.
 *
 * Once opened, the editor's autosave writes the operator's edits to
 * localStorage under the project id. The snapshot is the starting point, not
 * the running state — reopening after an edit shows the edit, and "Reset" is
 * what comes back here.
 */

import {
  EDITOR_DEFAULT_FRAME,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
} from "@/shared/types/video-editor";
import { presetMotion } from "./motion";
import type { StudioBeatVisual } from "@/shared/types/visual-selection";
import type { LoadedEpisode } from "./demo-project";
import { PRACTICE_EPISODE as SNAPSHOT } from "./practice/compressor-episode-snapshot";

export const PRACTICE_PROJECT_ID = SNAPSHOT.stem;

/** Which track a snapshot clip belongs on. */
const TRACK_ID: Record<string, string> = {
  video: "t-video",
  graphics: "t-graphics",
  text: "t-text",
};

/**
 * The clip kind for a visual.
 *
 * A card has no asset and is drawn from its own rendered frame, so it is a
 * `slide` wherever it sits — including on the text track, which accepts only
 * `text`. That is why a card on the text track is typed `text` and a card on
 * the graphics track is typed `slide`: the track's accept list is the authority
 * here, and a clip the track would refuse is a project no human could have
 * built by hand.
 */
function clipKind(track: string, assetId: string | null): EditorClip["kind"] {
  if (track === "text") return "text";
  if (assetId === null) return "slide";
  return "image";
}

export function loadPracticeEpisode(): LoadedEpisode {
  const frames: Record<string, string> = {};
  const peaks: Record<string, readonly number[]> = {};
  const captionText: Record<string, string> = {};
  const audio: Record<string, { url: string; offsetMs: number; fileMs: number }> = {};

  const byTrack: Record<string, EditorClip[]> = {
    "t-video": [],
    "t-graphics": [],
    "t-text": [],
  };

  for (const v of SNAPSHOT.visual) {
    if (v.frame) frames[v.id] = v.frame;
    const trackId = TRACK_ID[v.track] ?? "t-video";
    byTrack[trackId].push({
      id: v.id,
      kind: clipKind(v.track, v.assetId),
      ...(v.assetId === null ? {} : { assetId: v.assetId }),
      beatId: v.beatId,
      label: v.label,
      startMs: v.startMs,
      durationMs: v.durationMs,
      /**
       * Restrained movement, varied per shot — as a real camera move now.
       *
       * These used to be STATIC transforms standing in for motion: `push-in`
       * was a fixed 6% crop and `pan` was a fixed 2px offset, so the film's
       * most deliberate-looking shots did not move at all in the master (and
       * the 2px offset exposed a black column at one edge). A `motion` is
       * interpolated over the clip's duration by the preview and by the filter
       * graph, from the same numbers.
       *
       * `hold` stays the ABSENCE of motion rather than a move of zero, so a
       * shot nobody has touched still compiles byte-identically to one that
       * never had the field.
       */
      ...(v.motion === "push-in"
        ? { motion: presetMotion("pushIn", 0.6), transform: { fit: "cover" as const } }
        : {}),
      ...(v.motion === "pan"
        ? { motion: presetMotion("panRight", 0.5), transform: { fit: "cover" as const } }
        : {}),
      // The dissolve this episode was cut with, as data rather than as a
      // global the renderer applied behind the editor's back. The first shot
      // has nothing to come from, so it is a cut.
      ...(v.startMs === 0
        ? {}
        : { transitionIn: { kind: "crossfade" as const, durationMs: SNAPSHOT.transitionMs ?? 260 } }),
    });
  }

  const captionClips: EditorClip[] = SNAPSHOT.captions.map((c) => {
    captionText[c.id] = c.text;
    return {
      id: c.id,
      kind: "caption",
      beatId: c.beatId,
      label: c.label,
      startMs: c.startMs,
      durationMs: c.durationMs,
      text: { text: c.text },
    };
  });

  const voiceClips: EditorClip[] = SNAPSHOT.voice.map((v) => {
    peaks[v.id] = v.peaks;
    if (v.audioUrl) {
      audio[v.id] = { url: v.audioUrl, offsetMs: v.audioOffsetMs, fileMs: v.audioFileMs };
    }
    return {
      id: v.id,
      kind: "audio",
      beatId: v.beatId,
      label: v.label,
      startMs: v.startMs,
      durationMs: v.durationMs,
      audio: { volume: 1 },
    };
  });

  const tracks: EditorTrack[] = [
    { id: "t-video", kind: "video", name: "VIDEO 1", clips: byTrack["t-video"] },
    { id: "t-overlay", kind: "overlay", name: "OVERLAY", clips: [] },
    { id: "t-graphics", kind: "graphics", name: "GRAPHICS", clips: byTrack["t-graphics"] },
    { id: "t-text", kind: "text", name: "TEXT", clips: byTrack["t-text"] },
    { id: "t-caption", kind: "caption", name: "CAPTIONS", clips: captionClips },
    { id: "t-voice", kind: "voice", name: "VOICEOVER", clips: voiceClips },
    { id: "t-music", kind: "music", name: "MUSIC", clips: [] },
    { id: "t-sfx", kind: "sfx", name: "SFX", clips: [] },
  ];

  const project: EditorProject = {
    id: SNAPSHOT.stem,
    title: SNAPSHOT.title,
    width: SNAPSHOT.width ?? EDITOR_DEFAULT_FRAME.width,
    height: SNAPSHOT.height ?? EDITOR_DEFAULT_FRAME.height,
    fps: SNAPSHOT.fps ?? EDITOR_DEFAULT_FRAME.fps,
    tracks,
    version: 1,
  };

  return {
    project,
    peaks,
    frames,
    audio,
    captionText,
    visuals: SNAPSHOT.visuals as unknown as Readonly<Record<string, StudioBeatVisual>>,
    meta: {
      stem: SNAPSHOT.stem,
      series: SNAPSHOT.series,
      rawMs: SNAPSHOT.rawMs,
      expectedOutMs: SNAPSHOT.expectedOutMs,
      transitionMs: SNAPSHOT.transitionMs,
      masterSha256: SNAPSHOT.masterSha256,
      generatedBy: SNAPSHOT.generatedBy,
    },
  };
}
