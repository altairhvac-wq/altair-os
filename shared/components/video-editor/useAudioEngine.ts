"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clipEndMs,
  isAudioTrackKind,
  type EditorProject,
} from "@/shared/types/video-editor";

/**
 * Real audio playback, scheduled against the timeline.
 *
 * ==================== THE TIMELINE IS THE MASTER CLOCK ====================
 * The playhead advances from a requestAnimationFrame loop; audio follows it.
 * The alternative — making one audio element the clock — is more accurate for a
 * single continuous file and wrong here, because this project has nineteen
 * separate narration clips that an operator can move, trim and delete. There is
 * no single element that could be the clock, and the one you picked would stop
 * existing the moment someone deleted it.
 *
 * Following costs drift, so drift is corrected rather than ignored: each frame,
 * any element more than DRIFT_TOLERANCE_MS away from where the timeline says it
 * should be gets its `currentTime` reset. The tolerance is wide enough that
 * normal decode jitter does not cause constant reseeking (which is audible as
 * stutter) and tight enough that nobody perceives the offset.
 *
 * ==================== AUDIO IS NOT PART OF THE PROJECT ====================
 * URLs live in a side map keyed by clip id, exactly like frames and waveform
 * peaks. The project stores the edit; where a file happens to be served from is
 * not the edit, and putting it in the project would put a deployment detail
 * into the undo stack.
 */

export type AudioSource = {
  readonly url: string;
  /**
   * Where the VOICE begins inside the clip. A beat carries a lead-in before the
   * line, so audio starting at clip offset 0 would speak early by exactly that
   * lead.
   */
  readonly offsetMs: number;
  readonly fileMs: number;
};

export type AudioSources = Readonly<Record<string, AudioSource>>;

/** Beyond this, reseek. Below it, leave the element alone. */
const DRIFT_TOLERANCE_MS = 140;

export type AudioEngine = {
  /** True once the browser has actually allowed playback to begin. */
  readonly unlocked: boolean;
  /** Set when the browser refused to start audio without a gesture. */
  readonly blocked: boolean;
  /** Call from a user gesture to satisfy the autoplay policy. */
  readonly unlock: () => void;
  /** How many narration clips have a real file behind them. */
  readonly loadedCount: number;
};

export function useAudioEngine(opts: {
  readonly project: EditorProject;
  readonly sources: AudioSources;
  readonly playheadMs: number;
  readonly isPlaying: boolean;
  readonly masterMuted: boolean;
}): AudioEngine {
  const { project, sources, playheadMs, isPlaying, masterMuted } = opts;

  const elementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  /* ── Element pool ─────────────────────────────────────────────────────── */
  /**
   * The elements are APPENDED to a hidden container rather than left detached.
   * `new Audio()` alone works for playback, but a detached element is invisible
   * to `document.querySelectorAll('audio')` — so nothing can inspect what is
   * sounding, no test can assert on it, and devtools shows an editor with no
   * audio in a page that is making noise. A real node costs nothing and makes
   * the whole subsystem observable.
   */
  useEffect(() => {
    if (!containerRef.current) {
      const container = document.createElement("div");
      container.setAttribute("data-testid", "ve-audio-pool");
      container.setAttribute("aria-hidden", "true");
      container.style.display = "none";
      document.body.appendChild(container);
      containerRef.current = container;
    }

    const pool = elementsRef.current;
    for (const [clipId, source] of Object.entries(sources)) {
      if (pool.has(clipId)) continue;
      const element = document.createElement("audio");
      element.src = source.url;
      element.preload = "auto";
      element.dataset.clipId = clipId;
      // Each clip is played from an offset and stopped by us; letting the
      // element loop or run past its clip would leak audio into the next shot.
      element.loop = false;
      containerRef.current.appendChild(element);
      pool.set(clipId, element);
    }
  }, [sources]);

  /* ── Teardown, on unmount only ────────────────────────────────────────── */
  useEffect(() => {
    const pool = elementsRef.current;
    return () => {
      for (const element of pool.values()) {
        element.pause();
        element.remove();
      }
      pool.clear();
      containerRef.current?.remove();
      containerRef.current = null;
    };
  }, []);

  /** Audio clips that should be sounding at a given time. */
  const schedule = useMemo(() => {
    const out: {
      clipId: string;
      startMs: number;
      endMs: number;
      volume: number;
    }[] = [];
    for (const track of project.tracks) {
      if (!isAudioTrackKind(track.kind)) continue;
      for (const clip of track.clips) {
        if (!sources[clip.id]) continue;
        const trackVolume = track.muted ? 0 : 1;
        const clipVolume = clip.audio?.muted ? 0 : (clip.audio?.volume ?? 1);
        out.push({
          clipId: clip.id,
          startMs: clip.startMs,
          endMs: clipEndMs(clip),
          volume: Math.max(0, Math.min(1, trackVolume * clipVolume)),
        });
      }
    }
    return out;
  }, [project, sources]);

  /* ── Drive the pool from the playhead ─────────────────────────────────── */
  useEffect(() => {
    const pool = elementsRef.current;

    for (const entry of schedule) {
      const element = pool.get(entry.clipId);
      const source = sources[entry.clipId];
      if (!element || !source) continue;

      const audible =
        isPlaying &&
        !masterMuted &&
        entry.volume > 0 &&
        playheadMs >= entry.startMs &&
        playheadMs < entry.endMs;

      if (!audible) {
        if (!element.paused) element.pause();
        continue;
      }

      const expectedSec =
        (playheadMs - entry.startMs + source.offsetMs) / 1000;

      // Past the end of the file — the clip is longer than its audio (the tail
      // after the line). Silence is correct here, not a wrapped replay.
      if (expectedSec >= source.fileMs / 1000) {
        if (!element.paused) element.pause();
        continue;
      }

      element.volume = entry.volume;

      const driftMs = Math.abs(element.currentTime * 1000 - expectedSec * 1000);
      if (driftMs > DRIFT_TOLERANCE_MS) {
        element.currentTime = Math.max(0, expectedSec);
      }

      if (element.paused) {
        const started = element.play();
        if (started && typeof started.catch === "function") {
          started
            .then(() => {
              setUnlocked(true);
              setBlocked(false);
            })
            .catch(() => {
              // Autoplay policy. Surfaced rather than swallowed, because
              // silent playback with a moving playhead looks like a bug in the
              // editor rather than a browser rule.
              setBlocked(true);
            });
        }
      }
    }
  }, [schedule, sources, playheadMs, isPlaying, masterMuted]);

  /* ── Pause everything when playback stops ─────────────────────────────── */
  useEffect(() => {
    if (isPlaying) return;
    for (const element of elementsRef.current.values()) {
      if (!element.paused) element.pause();
    }
  }, [isPlaying]);

  const unlock = useCallback(() => {
    const first = elementsRef.current.values().next().value;
    if (!first) return;
    const started = first.play();
    if (started && typeof started.catch === "function") {
      started
        .then(() => {
          first.pause();
          first.currentTime = 0;
          setUnlocked(true);
          setBlocked(false);
        })
        .catch(() => setBlocked(true));
    }
  }, []);

  return {
    unlocked,
    blocked,
    unlock,
    loadedCount: Object.keys(sources).length,
  };
}
