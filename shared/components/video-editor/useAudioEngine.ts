"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  clipEndMs,
  isAudioTrackKind,
  type EditorProject,
} from "@/shared/types/video-editor";
import type { PlaybackClock } from "@/shared/lib/video-editor/playback-clock";

/**
 * Real audio playback, scheduled against the playback clock.
 *
 * ==================== THE CLOCK LEADS, AUDIO FOLLOWS ====================
 * `PlaybackClock` is the one authority on editor time. This engine never sets
 * it — it only reads. There are thirty-six separate narration clips an operator
 * can move, trim and delete, so no single element could be the clock; the one
 * you picked would stop existing the moment someone deleted it.
 *
 * ==================== WHY THE OLD VERSION SKIPPED ====================
 * It ran as a React effect keyed on `playheadMs`, so it only ran when React
 * committed, and the playhead it was following was running at half speed (see
 * playback-clock.ts). Every ~300ms the audio was 140ms "ahead" of a clock that
 * was wrong, and was dragged back — an audible skip, 1083 of them in 40s.
 *
 * Now it runs on the clock's own frame, and correction is deliberately rare:
 *
 *  - A START (element was paused) positions the element and plays it. That is
 *    scheduling, not correction.
 *  - After any start or correction there is a GRACE window. A freshly started
 *    element needs tens of milliseconds before `currentTime` moves; measuring
 *    drift during that window and "fixing" it is the classic feedback loop —
 *    seek, stall, drift, seek — that turns a smooth line into stutter.
 *  - Outside the grace window, only drift beyond DRIFT_TOLERANCE_MS is
 *    corrected. With a correct clock, steady-state drift is a few ms.
 *
 * `data-starts` / `data-corrections` on the pool make both counts testable: a
 * correction during uninterrupted playback is a skip the operator can hear.
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
const DRIFT_TOLERANCE_MS = 180;
/** No correction this soon after a start or a reseek. */
const GRACE_MS = 500;
/**
 * A reseek within this long of a start is a SETTLE, not a skip.
 *
 * An element that has just begun is still opening the file; nudging it then is
 * inaudible because the line has barely started. The same nudge two seconds
 * into a sentence is the jump an operator hears, so the two are counted
 * separately rather than averaged into one reassuring number.
 */
const SETTLE_WINDOW_MS = 1500;
/** First guess at how long `play()` takes to actually make sound. */
const INITIAL_START_LATENCY_MS = 90;

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

type ScheduleEntry = {
  readonly clipId: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly volume: number;
};

export function useAudioEngine(opts: {
  readonly clock: PlaybackClock;
  readonly project: EditorProject;
  readonly sources: AudioSources;
  readonly masterMuted: boolean;
}): AudioEngine {
  const { clock, project, sources, masterMuted } = opts;

  const elementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const blockedRef = useRef(false);

  /* ── Element pool ─────────────────────────────────────────────────────── */
  /**
   * The elements are APPENDED to a hidden container rather than left detached,
   * so what is sounding is inspectable in devtools and assertable in tests.
   */
  useEffect(() => {
    if (!containerRef.current) {
      const container = document.createElement("div");
      container.setAttribute("data-testid", "ve-audio-pool");
      container.setAttribute("aria-hidden", "true");
      container.style.display = "none";
      container.dataset.starts = "0";
      container.dataset.settles = "0";
      container.dataset.corrections = "0";
      container.dataset.waiting = "0";
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

  /** Audio clips that should be sounding, recomputed only when the edit changes. */
  const schedule = useMemo(() => {
    const out: ScheduleEntry[] = [];
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

  // The frame callback reads the latest of these without resubscribing.
  const scheduleRef = useRef(schedule);
  const sourcesRef = useRef(sources);
  const mutedRef = useRef(masterMuted);
  useLayoutEffect(() => {
    scheduleRef.current = schedule;
    sourcesRef.current = sources;
    mutedRef.current = masterMuted;
  });

  /* ── Follow the clock, one frame at a time ────────────────────────────── */
  useEffect(() => {
    const grace = new Map<string, number>();
    const started = new Map<
      string,
      { wall: number; expectedSec: number; measured: boolean }
    >();
    let starts = 0;
    let settles = 0;
    let corrections = 0;
    let waiting = 0;
    /**
     * How far behind the clock an element is when it finally makes sound.
     *
     * Measured rather than assumed, and applied to the NEXT start: positioning
     * an element at exactly "now" and then waiting 150ms for it to open means
     * it is 150ms late for the rest of the line, which is then "corrected" — an
     * audible skip caused entirely by not having accounted for the latency.
     */
    let latencyMs = INITIAL_START_LATENCY_MS;

    const start = (element: HTMLAudioElement) => {
      const started = element.play();
      if (started && typeof started.catch === "function") {
        started
          .then(() => {
            blockedRef.current = false;
            setUnlocked(true);
            setBlocked(false);
          })
          .catch(() => {
            // Autoplay policy. Surfaced rather than swallowed, because silent
            // playback with a moving playhead looks like a bug in the editor
            // rather than a browser rule. Not retried every frame.
            blockedRef.current = true;
            setBlocked(true);
          });
      }
    };

    const sync = (ms: number) => {
      const pool = elementsRef.current;
      const playing = clock.isPlaying();
      const rate = clock.getRate();
      const wall = performance.now();

      for (const entry of scheduleRef.current) {
        const element = pool.get(entry.clipId);
        const source = sourcesRef.current[entry.clipId];
        if (!element || !source) continue;

        const expectedSec = Math.max(0, (ms - entry.startMs + source.offsetMs) / 1000);
        const audible =
          playing &&
          !mutedRef.current &&
          !blockedRef.current &&
          entry.volume > 0 &&
          ms >= entry.startMs &&
          ms < entry.endMs &&
          // Past the end of the file: the clip is longer than its audio (the
          // tail after the line). Silence is correct, not a wrapped replay.
          expectedSec < source.fileMs / 1000;

        if (!audible) {
          if (!element.paused) element.pause();
          grace.delete(entry.clipId);
          started.delete(entry.clipId);
          continue;
        }

        if (element.volume !== entry.volume) element.volume = entry.volume;
        if (element.playbackRate !== rate) element.playbackRate = rate;

        if (element.paused) {
          // Seeking a file whose metadata has not arrived ABORTS the request
          // that is fetching it, and the element then starts from zero — the
          // wrong part of the line. Wait a frame instead; `preload="auto"`
          // means this is normally over before playback reaches the clip.
          if (element.readyState < 1) {
            waiting += 1;
            continue;
          }
          const compensated = Math.max(
            0,
            Math.min(expectedSec + latencyMs / 1000, source.fileMs / 1000 - 0.05),
          );
          element.currentTime = compensated;
          starts += 1;
          started.set(entry.clipId, { wall, expectedSec: compensated, measured: false });
          grace.set(entry.clipId, wall + GRACE_MS);
          start(element);
          continue;
        }

        // The first time an element actually advances after a start, record how
        // long it took to get going.
        const record = started.get(entry.clipId);
        if (record && !record.measured && element.currentTime > record.expectedSec + 0.01) {
          const observed =
            wall - record.wall - (element.currentTime - record.expectedSec) * 1000;
          if (observed > 0 && observed < 1000) {
            latencyMs = latencyMs * 0.7 + observed * 0.3;
          }
          record.measured = true;
        }

        if (wall < (grace.get(entry.clipId) ?? 0)) continue;

        const driftMs = Math.abs(element.currentTime * 1000 - expectedSec * 1000);
        if (driftMs > DRIFT_TOLERANCE_MS) {
          element.currentTime = expectedSec;
          if (record && wall - record.wall < SETTLE_WINDOW_MS) settles += 1;
          else corrections += 1;
          grace.set(entry.clipId, wall + GRACE_MS);
        }
      }

      const container = containerRef.current;
      if (container) {
        container.dataset.starts = String(starts);
        container.dataset.settles = String(settles);
        container.dataset.corrections = String(corrections);
        container.dataset.waiting = String(waiting);
        container.dataset.latencyMs = String(Math.round(latencyMs));
      }
    };

    sync(clock.getTime());
    return clock.subscribeFrame(sync);
  }, [clock]);

  const unlock = useCallback(() => {
    const first = elementsRef.current.values().next().value;
    if (!first) return;
    const started = first.play();
    if (started && typeof started.catch === "function") {
      started
        .then(() => {
          first.pause();
          first.currentTime = 0;
          blockedRef.current = false;
          setUnlocked(true);
          setBlocked(false);
        })
        .catch(() => {
          blockedRef.current = true;
          setBlocked(true);
        });
    }
  }, []);

  return {
    unlocked,
    blocked,
    unlock,
    loadedCount: Object.keys(sources).length,
  };
}
