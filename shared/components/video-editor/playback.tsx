"use client";

import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { formatTimecode } from "@/shared/types/video-editor";
import type {
  FrameListener,
  PlaybackClock,
  PlaybackSnapshot,
} from "@/shared/lib/video-editor/playback-clock";

/**
 * React's view onto the playback clock.
 *
 * ==================== TWO SPEEDS OF SUBSCRIPTION ====================
 * `usePlaybackState` re-renders on play / pause / rate — a handful of times a
 * minute. `usePlaybackFrame` runs a callback every frame and NEVER re-renders:
 * the callback writes to the DOM directly. Everything that moves with time
 * (playhead, timecode, canvas motion, audio) uses the second; everything that
 * only needs to know whether we are playing uses the first.
 *
 * The editor shell, the timeline's 108 clips, the inspector and the photo
 * library therefore do not render at all while the film plays.
 */

const PlaybackClockContext = createContext<PlaybackClock | null>(null);

export const PlaybackClockProvider = PlaybackClockContext.Provider;

export function usePlaybackClock(): PlaybackClock {
  const clock = useContext(PlaybackClockContext);
  if (!clock) throw new Error("usePlaybackClock outside PlaybackClockProvider");
  return clock;
}

export function usePlaybackState(): PlaybackSnapshot {
  const clock = usePlaybackClock();
  return useSyncExternalStore(clock.subscribeState, clock.getSnapshot, clock.getSnapshot);
}

/**
 * Run `listener` on every clock frame. The latest listener is always used, so
 * callers may close over props freely without resubscribing.
 */
export function usePlaybackFrame(listener: FrameListener): void {
  const clock = usePlaybackClock();
  const ref = useRef(listener);
  useLayoutEffect(() => {
    ref.current = listener;
  });
  useEffect(() => clock.subscribeFrame((t) => ref.current(t)), [clock]);
}

/**
 * The running timecode, written straight to its text node.
 *
 * React is given NO children here on purpose. If React owned the text, a later
 * re-render would reconcile against a node this component had already replaced
 * and the display would freeze. It owns the element; the clock owns the words.
 *
 * `data-ms` carries the exact time for tests, which read the same element the
 * operator reads rather than an internal they cannot see.
 */
export function LiveTimecode({
  className,
  style,
  testId,
}: {
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly testId?: string;
}) {
  const clock = usePlaybackClock();
  const ref = useRef<HTMLSpanElement>(null);

  const write = (ms: number) => {
    const el = ref.current;
    if (!el) return;
    const text = formatTimecode(ms);
    if (el.textContent !== text) el.textContent = text;
    el.dataset.ms = String(Math.round(ms));
  };

  useLayoutEffect(() => {
    write(clock.getTime());
  });
  usePlaybackFrame(write);

  return <span ref={ref} data-testid={testId} className={className} style={style} />;
}
