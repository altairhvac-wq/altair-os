"use client";

import { memo } from "react";
import {
  isAudioTrackKind,
  msToPx,
  type EditorClip,
  type EditorTrackKind,
} from "@/shared/types/video-editor";
import { AudioWaveform } from "./AudioWaveform";
import { CLIP_COLOR_VAR, TIMELINE_GEOMETRY } from "./editor-theme";
import type { GestureMode } from "./useClipGesture";

/**
 * One clip: a horizontal block whose LEFT is its start time and whose WIDTH is
 * its duration. That is the whole contract, and it is why this component takes
 * `pxPerSec` rather than a computed width — the geometry is derived from time
 * at every render, so it cannot fall out of step with the project.
 *
 * ==================== WHY IT IS NOT A CARD ====================
 * Square-ish corners, a flat fill, a 1px edge, and content that is clipped
 * rather than wrapped. A rounded, padded, shadowed clip reads as a list item
 * and destroys the one thing a timeline has to communicate: that these objects
 * butt against each other in time. The only rounding is 2px, enough to keep
 * the corners from looking broken at 1px borders.
 */

type Props = {
  readonly clip: EditorClip;
  readonly trackKind: EditorTrackKind;
  readonly pxPerSec: number;
  readonly height: number;
  readonly selected: boolean;
  readonly dragging: boolean;
  readonly peaks?: readonly number[];
  readonly frameSrc?: string;
  readonly onPointerDown: (
    event: React.PointerEvent,
    clip: EditorClip,
    mode: GestureMode,
  ) => void;
};

function TimelineClipImpl({
  clip,
  trackKind,
  pxPerSec,
  height,
  selected,
  dragging,
  peaks,
  frameSrc,
  onPointerDown,
}: Props) {
  const left = msToPx(clip.startMs, pxPerSec);
  const width = Math.max(2, msToPx(clip.durationMs, pxPerSec));
  const colors = CLIP_COLOR_VAR[trackKind] ?? CLIP_COLOR_VAR.video;
  const isAudio = isAudioTrackKind(trackKind);

  // Below this the clip is a sliver; a label would render as one clipped
  // glyph, which is noisier than nothing.
  const showLabel = width > 34;
  const showHandles = width > TIMELINE_GEOMETRY.trimHandleWidth * 2 + 6;

  return (
    <div
      role="button"
      tabIndex={-1}
      aria-label={`${clip.label}, ${(clip.durationMs / 1000).toFixed(1)} seconds`}
      aria-pressed={selected}
      onPointerDown={(event) => onPointerDown(event, clip, "move")}
      className="absolute top-0 select-none overflow-hidden rounded-[2px]"
      style={{
        left,
        width,
        height,
        background: colors.fill,
        // Selection is carried by a ring rather than a border so the clip's
        // width does not change by 2px when you click it — that shift reads
        // as the clip having moved.
        boxShadow: selected
          ? `inset 0 0 0 2px var(--ve-accent)`
          : `inset 0 0 0 1px ${colors.edge}`,
        cursor: dragging ? "grabbing" : "grab",
        opacity: dragging ? 0.85 : 1,
        zIndex: selected ? 2 : 1,
      }}
    >
      {frameSrc && !isAudio ? (
        // The frame is a texture, not an image to read: it tells you WHICH
        // shot this is at a glance. Left-anchored so the first frame of the
        // clip is the one you see, which is how you identify a cut.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-left bg-no-repeat"
          style={{
            backgroundImage: `url(${frameSrc})`,
            backgroundSize: "auto 100%",
            opacity: 0.5,
          }}
        />
      ) : null}

      {isAudio && peaks && peaks.length > 0 ? (
        <AudioWaveform
          peaks={peaks}
          width={width}
          height={height}
          color={colors.edge}
        />
      ) : null}

      {showLabel ? (
        <span
          className="pointer-events-none absolute left-1.5 top-1 max-w-[calc(100%-12px)] truncate text-[10px] font-medium leading-none"
          style={{
            color: "var(--ve-text)",
            textShadow: "0 1px 2px rgba(0,0,0,0.75)",
          }}
        >
          {clip.label}
        </span>
      ) : null}

      {showHandles ? (
        <>
          <div
            onPointerDown={(event) => onPointerDown(event, clip, "trim-start")}
            className="absolute inset-y-0 left-0 z-10"
            style={{
              width: TIMELINE_GEOMETRY.trimHandleWidth,
              cursor: "ew-resize",
              // Visible only on hover of the clip, so a dense timeline is not
              // covered in handle chrome.
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.16), transparent)",
            }}
          />
          <div
            onPointerDown={(event) => onPointerDown(event, clip, "trim-end")}
            className="absolute inset-y-0 right-0 z-10"
            style={{
              width: TIMELINE_GEOMETRY.trimHandleWidth,
              cursor: "ew-resize",
              background:
                "linear-gradient(270deg, rgba(255,255,255,0.16), transparent)",
            }}
          />
        </>
      ) : null}
    </div>
  );
}

/**
 * Memoised on the values that actually change geometry. Without this, dragging
 * one clip re-renders every clip on every pointermove — at ~60 clips that is
 * where the timeline starts to feel heavy.
 */
export const TimelineClip = memo(TimelineClipImpl);
