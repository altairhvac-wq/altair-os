"use client";

import {
  ChevronFirst,
  ChevronLast,
  Pause,
  Play,
  SkipBack,
  Volume2,
  VolumeX,
} from "lucide-react";
import { formatTimecode } from "@/shared/types/video-editor";
import { PLAYBACK_RATES } from "@/shared/lib/video-editor/playback-clock";
import { LiveTimecode, usePlaybackClock, usePlaybackState } from "./playback";

/**
 * Transport. Deliberately compact — this strip is a control surface, not a
 * section, so it gets one row and no headings.
 *
 * The timecode is the LEFT-hand anchor because it is the number you read while
 * scrubbing; total duration sits beside it dimmed, so "where am I / how long is
 * it" is one glance rather than two.
 *
 * ==================== IT READS THE CLOCK, IT DOES NOT RECEIVE TIME ====================
 * This used to take `playheadMs` as a prop, which meant the whole editor
 * re-rendered to move one number. The timecode now subscribes to the clock
 * directly and the strip re-renders only when play/pause or speed change.
 */
export function PlaybackControls({
  durationMs,
  fps,
  muted,
  onToggleMute,
  audioBlocked,
  onUnlockAudio,
  audioClipCount,
}: {
  readonly durationMs: number;
  readonly fps: number;
  readonly muted: boolean;
  readonly onToggleMute: () => void;
  /** True when the browser refused playback without a user gesture. */
  readonly audioBlocked: boolean;
  readonly onUnlockAudio: () => void;
  readonly audioClipCount: number;
}) {
  const clock = usePlaybackClock();
  const { playing, rate } = usePlaybackState();
  const frameMs = 1000 / fps;

  return (
    <div
      className="flex h-10 shrink-0 items-center gap-2 px-3"
      style={{
        background: "var(--ve-panel)",
        borderTop: "1px solid var(--ve-line)",
      }}
    >
      <LiveTimecode
        testId="ve-playhead-timecode"
        className="w-[64px] tabular-nums text-[12px] font-medium"
        style={{ color: "var(--ve-text)" }}
      />
      <span
        data-testid="ve-duration-timecode"
        className="tabular-nums text-[11px]"
        style={{ color: "var(--ve-text-faint)" }}
      >
        / {formatTimecode(durationMs)}
      </span>

      <div className="mx-auto flex items-center gap-1">
        <TransportButton title="Go to start (Home)" onClick={() => clock.seek(0)}>
          <SkipBack className="size-3.5" />
        </TransportButton>
        <TransportButton
          title={`Previous frame (←) · 1/${fps}s — Shift+← for 1s`}
          testId="ve-step-back"
          onClick={() => clock.step(-frameMs)}
        >
          <ChevronFirst className="size-4" />
        </TransportButton>

        <button
          type="button"
          onClick={() => clock.toggle()}
          title={playing ? "Pause (Space / K)" : "Play (Space / L)"}
          aria-label={playing ? "Pause" : "Play"}
          data-testid="ve-play"
          className="flex size-8 items-center justify-center rounded-full"
          style={{
            background: "var(--ve-accent)",
            color: "var(--ve-on-accent)",
          }}
        >
          {playing ? (
            <Pause className="size-4" fill="currentColor" />
          ) : (
            <Play className="size-4 translate-x-[1px]" fill="currentColor" />
          )}
        </button>

        <TransportButton
          title={`Next frame (→) · 1/${fps}s — Shift+→ for 1s`}
          testId="ve-step-forward"
          onClick={() => clock.step(frameMs)}
        >
          <ChevronLast className="size-4" />
        </TransportButton>
        <TransportButton
          title="Go to end (End)"
          onClick={() => clock.seek(clock.getDuration())}
        >
          <SkipBack className="size-3.5 rotate-180" />
        </TransportButton>

        <div
          className="ml-2 flex items-center overflow-hidden rounded"
          role="group"
          aria-label="Playback speed"
          style={{ border: "1px solid var(--ve-line-strong)" }}
        >
          {PLAYBACK_RATES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={rate === r}
              data-testid={`ve-rate-${r}`}
              title={`Play at ${r}×`}
              onClick={() => clock.setRate(r)}
              className="h-6 px-1.5 text-[10px] tabular-nums"
              style={{
                background: rate === r ? "var(--ve-accent-wash)" : "transparent",
                color: rate === r ? "var(--ve-accent)" : "var(--ve-text-faint)",
              }}
            >
              {r}×
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {audioBlocked ? (
          // The browser blocked playback. Said out loud, with the fix attached:
          // a moving playhead and no sound otherwise reads as a broken editor.
          <button
            type="button"
            onClick={onUnlockAudio}
            className="h-6 rounded px-2 text-[10px] font-medium"
            style={{
              background: "var(--ve-accent)",
              color: "var(--ve-on-accent)",
            }}
          >
            Enable audio
          </button>
        ) : null}

        <button
          type="button"
          onClick={onToggleMute}
          title={muted ? "Unmute (M)" : "Mute (M)"}
          aria-label={muted ? "Unmute" : "Mute"}
          aria-pressed={muted}
          data-testid="ve-master-mute"
          className="flex size-7 items-center justify-center rounded"
          style={{ color: muted ? "var(--ve-accent)" : "var(--ve-text-dim)" }}
        >
          {muted ? (
            <VolumeX className="size-3.5" />
          ) : (
            <Volume2 className="size-3.5" />
          )}
        </button>

        <span
          className="text-[10px]"
          style={{ color: "var(--ve-text-faint)" }}
          title={`${audioClipCount} narration clips loaded. J back 5s · K pause · L play (again for faster) · S split.`}
        >
          {fps} fps · preview
        </span>
      </div>
    </div>
  );
}

function TransportButton({
  children,
  onClick,
  title,
  testId,
}: {
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  readonly title: string;
  readonly testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      data-testid={testId}
      className="flex size-7 items-center justify-center rounded hover:brightness-150"
      style={{ color: "var(--ve-text-dim)" }}
    >
      {children}
    </button>
  );
}
