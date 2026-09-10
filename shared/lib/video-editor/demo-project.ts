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
import { DEMO_EPISODE } from "./demo-project-hvac-01";

/** Peaks live outside the project: they are display data, not the edit. */
export type WaveformPeaks = Readonly<Record<string, readonly number[]>>;

/** Frame URLs, likewise — the project stores an assetId, not a URL. */
export type FrameSources = Readonly<Record<string, string>>;

export type LoadedEpisode = {
  readonly project: EditorProject;
  readonly peaks: WaveformPeaks;
  readonly frames: FrameSources;
  readonly captionText: Readonly<Record<string, string>>;
  readonly meta: {
    readonly stem: string;
    readonly series: string;
    readonly rawMs: number;
    readonly expectedOutMs: number;
    readonly transitionMs: number;
    readonly masterSha256: string;
  };
};

export const DEMO_PROJECT_ID = DEMO_EPISODE.stem;

export function loadDemoEpisode(): LoadedEpisode {
  const frames: Record<string, string> = {};
  const peaks: Record<string, readonly number[]> = {};
  const captionText: Record<string, string> = {};

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
    captionText,
    meta: {
      stem: DEMO_EPISODE.stem,
      series: DEMO_EPISODE.series,
      rawMs: DEMO_EPISODE.rawMs,
      expectedOutMs: DEMO_EPISODE.expectedOutMs,
      transitionMs: DEMO_EPISODE.transitionMs,
      masterSha256: DEMO_EPISODE.masterSha256,
    },
  };
}
