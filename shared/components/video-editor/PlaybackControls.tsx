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

/**
 * Transport. Deliberately compact — this strip is a control surface, not a
 * section, so it gets one row and no headings.
 *
 * The timecode is the LEFT-hand anchor because it is the number you read while
 * scrubbing; total duration sits beside it dimmed, so "where am I / how long is
 * it" is one glance rather than two.
 */
export function PlaybackControls({
  playheadMs,
  durationMs,
  isPlaying,
  fps,
  onPlayPause,
  onSeek,
  onStepFrame,
  muted,
  onToggleMute,
  audioBlocked,
  onUnlockAudio,
  audioClipCount,
}: {
  readonly playheadMs: number;
  readonly durationMs: number;
  readonly isPlaying: boolean;
  readonly fps: number;
  readonly onPlayPause: () => void;
  readonly onSeek: (ms: number) => void;
  readonly onStepFrame: (direction: -1 | 1) => void;
  readonly muted: boolean;
  readonly onToggleMute: () => void;
  /** True when the browser refused playback without a user gesture. */
  readonly audioBlocked: boolean;
  readonly onUnlockAudio: () => void;
  readonly audioClipCount: number;
}) {
  return (
    <div
      className="flex h-10 shrink-0 items-center gap-2 px-3"
      style={{
        background: "var(--ve-panel)",
        borderTop: "1px solid var(--ve-line)",
      }}
    >
      <span
        data-testid="ve-playhead-timecode"
        className="tabular-nums text-[12px] font-medium"
        style={{ color: "var(--ve-text)" }}
      >
        {formatTimecode(playheadMs)}
      </span>
      <span
        className="tabular-nums text-[11px]"
        style={{ color: "var(--ve-text-faint)" }}
      >
        / {formatTimecode(durationMs)}
      </span>

      <div className="mx-auto flex items-center gap-1">
        <TransportButton title="Go to start (Home)" onClick={() => onSeek(0)}>
          <SkipBack className="size-3.5" />
        </TransportButton>
        <TransportButton
          title={`Previous frame (←) · 1/${fps}s`}
          onClick={() => onStepFrame(-1)}
        >
          <ChevronFirst className="size-4" />
        </TransportButton>

        <button
          type="button"
          onClick={onPlayPause}
          title={isPlaying ? "Pause (Space)" : "Play (Space)"}
          aria-label={isPlaying ? "Pause" : "Play"}
          className="flex size-8 items-center justify-center rounded-full"
          style={{
            background: "var(--ve-accent)",
            color: "var(--ve-on-accent)",
          }}
        >
          {isPlaying ? (
            <Pause className="size-4" fill="currentColor" />
          ) : (
            <Play className="size-4 translate-x-[1px]" fill="currentColor" />
          )}
        </button>

        <TransportButton
          title={`Next frame (→) · 1/${fps}s`}
          onClick={() => onStepFrame(1)}
        >
          <ChevronLast className="size-4" />
        </TransportButton>
        <TransportButton
          title="Go to end (End)"
          onClick={() => onSeek(durationMs)}
        >
          <SkipBack className="size-3.5 rotate-180" />
        </TransportButton>
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
          title={`${audioClipCount} narration clips loaded. The production renderer crossfades every cut, so the exported master is slightly shorter than the timeline.`}
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
}: {
  readonly children: React.ReactNode;
  readonly onClick: () => void;
  readonly title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex size-7 items-center justify-center rounded hover:brightness-150"
      style={{ color: "var(--ve-text-dim)" }}
    >
      {children}
    </button>
  );
}
