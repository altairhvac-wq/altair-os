/**
 * Builds an `EditorProject` from the generated episode snapshot.
 *
 * The snapshot is real measured data (see the header of
 * `demo-project-hvac-01.ts`); this module's only job is arranging it into
 * tracks. It deliberately produces MORE structure than the renderer can
 * currently express — a graphics track, a text track, a music track — because
 * the editor is the place those become editable, and the compiler is the place
 * they are honestly reported as dropped.
 */

import {
  EDITOR_DEFAULT_FRAME,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
} from "@/shared/types/video-editor";
import type { StudioBeatVisual } from "@/shared/types/visual-selection";
import { DEMO_EPISODE } from "./demo-project-hvac-01";

/** Peaks live outside the project: they are display data, not the edit. */
export type WaveformPeaks = Readonly<Record<string, readonly number[]>>;

/** Frame URLs, likewise — the project stores an assetId, not a URL. */
export type FrameSources = Readonly<Record<string, string>>;

/** Narration files, keyed by clip id. See useAudioEngine for why these are
 *  a side map rather than fields on the clip. */
export type AudioSourceMap = Readonly<
  Record<string, { url: string; offsetMs: number; fileMs: number }>
>;

/**
 * The same audio, addressed the way the RENDER worker needs it: a bare file
 * stem, not a browser URL. `narration-000.m4a` in public is `narration-000.wav`
 * in the episode's audio directory, and only the worker knows where that is.
 */
export function audioRefsFrom(audio: AudioSourceMap) {
  const refs: Record<string, { ref: string; fileMs: number }> = {};
  for (const [clipId, source] of Object.entries(audio)) {
    const stem = source.url.split("/").pop()?.replace(/\.[a-z0-9]+$/i, "");
    if (stem) refs[clipId] = { ref: stem, fileMs: source.fileMs };
  }
  return refs;
}

export type LoadedEpisode = {
  readonly project: EditorProject;
  readonly peaks: WaveformPeaks;
  readonly frames: FrameSources;
  readonly audio: AudioSourceMap;
  readonly captionText: Readonly<Record<string, string>>;
  /**
   * The curation record behind each visual clip, when an agent chose it.
   *
   * OPTIONAL: the rendered demo episode has none — its slides were authored by
   * the visual plan, not selected from a library — and every existing reader
   * treats its absence as "nothing to explain". Present on a curated episode,
   * where it is what lets the inspector say why a shot was chosen and offer the
   * alternatives that were considered.
   */
  readonly visuals?: Readonly<Record<string, StudioBeatVisual>>;
  readonly meta: {
    readonly stem: string;
    readonly series: string;
    readonly rawMs: number;
    readonly expectedOutMs: number;
    readonly transitionMs: number;
    readonly masterSha256: string;
    /** Which agent produced this draft, when one did. */
    readonly generatedBy?: string;
  };
};

export const DEMO_PROJECT_ID = DEMO_EPISODE.stem;

export function loadDemoEpisode(): LoadedEpisode {
  const frames: Record<string, string> = {};
  const peaks: Record<string, readonly number[]> = {};
  const captionText: Record<string, string> = {};
  const audio: Record<string, { url: string; offsetMs: number; fileMs: number }> =
    {};

  const videoClips: EditorClip[] = DEMO_EPISODE.visual.map((v) => {
    if (v.frame) frames[v.id] = v.frame;
    return {
      id: v.id,
      kind: "slide",
      assetId: v.assetId,
      beatId: v.beatId,
      label: v.label,
      startMs: v.startMs,
      durationMs: v.durationMs,
    };
  });

  const captionClips: EditorClip[] = DEMO_EPISODE.captions.map((c) => {
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

  const voiceClips: EditorClip[] = DEMO_EPISODE.voice.map((v) => {
    peaks[v.id] = v.peaks;
    // The generator writes `audioUrl` and `audioFileMs` together or not at all,
    // so the url guard covers both. `as const` makes them literal types, which
    // is why a `??` fallback here would narrow to `never` rather than defend
    // against anything.
    if (v.audioUrl) {
      audio[v.id] = {
        url: v.audioUrl,
        offsetMs: v.audioOffsetMs,
        fileMs: v.audioFileMs,
      };
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
    { id: "t-video", kind: "video", name: "VIDEO 1", clips: videoClips },
    { id: "t-overlay", kind: "overlay", name: "OVERLAY", clips: [] },
    { id: "t-graphics", kind: "graphics", name: "GRAPHICS", clips: [] },
    { id: "t-text", kind: "text", name: "TEXT", clips: [] },
    { id: "t-caption", kind: "caption", name: "CAPTIONS", clips: captionClips },
    { id: "t-voice", kind: "voice", name: "VOICEOVER", clips: voiceClips },
    { id: "t-music", kind: "music", name: "MUSIC", clips: [] },
    { id: "t-sfx", kind: "sfx", name: "SFX", clips: [] },
  ];

  return {
    project: {
      id: DEMO_EPISODE.stem,
      title: DEMO_EPISODE.title,
      width: DEMO_EPISODE.width ?? EDITOR_DEFAULT_FRAME.width,
      height: DEMO_EPISODE.height ?? EDITOR_DEFAULT_FRAME.height,
      fps: DEMO_EPISODE.fps ?? EDITOR_DEFAULT_FRAME.fps,
      tracks,
      version: 1,
    },
    peaks,
    frames,
    audio,
    captionText,
    meta: {
      stem: DEMO_EPISODE.stem,
      series: DEMO_EPISODE.series,
      rawMs: DEMO_EPISODE.rawMs,
      expectedOutMs: DEMO_EPISODE.expectedOutMs,
      transitionMs: DEMO_EPISODE.transitionMs,
      masterSha256: DEMO_EPISODE.masterSha256,
      // The slide pipeline authored this cut: the pacing rule chose every
      // duration and the visual plan chose every slide. That makes it a
      // machine-generated draft, and naming it is what lets a later diff say
      // whose work the human corrected.
      generatedBy: "slide-system/render-episode",
    },
  };
}
