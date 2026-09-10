"use client";

import { useCallback, useMemo, useRef } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Scissors,
  Trash2,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  clipEndMs,
  formatRulerLabel,
  isAudioTrackKind,
  msToPx,
  projectDurationMs,
  pxToMs,
  rulerStepMs,
  sortedClips,
  type EditorProject,
  type EditorTrack,
} from "@/shared/types/video-editor";
import { TIMELINE_GEOMETRY } from "./editor-theme";
import { TimelineClip } from "./TimelineClip";
import { useClipGesture, type GestureMode } from "./useClipGesture";

/**
 * The multitrack timeline.
 *
 * ==================== ONE SCROLLER, THREE LAYERS ====================
 * The ruler, the track lanes and the playhead all read the SAME horizontal
 * scroll offset from one scrolling element. Giving the ruler its own scroller
 * and syncing them in an effect is the classic way these drift by a pixel and
 * then by a frame; here there is nothing to sync because there is one element.
 *
 * The track headers sit in a sticky left column INSIDE that scroller, so they
 * stay put horizontally while scrolling vertically with their lanes.
 */

type Props = {
  readonly project: EditorProject;
  readonly pxPerSec: number;
  readonly playheadMs: number;
  readonly selectedIds: readonly string[];
  readonly peaks: Readonly<Record<string, readonly number[]>>;
  readonly frames: Readonly<Record<string, string>>;
  readonly snapEnabled: boolean;
  readonly onSeek: (ms: number) => void;
  readonly onSelect: (clipId: string, additive: boolean) => void;
  readonly onClearSelection: () => void;
  readonly onMoveClip: (clipId: string, startMs: number) => void;
  readonly onTrimClip: (
    clipId: string,
    edge: "start" | "end",
    ms: number,
  ) => void;
  readonly onGestureEnd: () => void;
  readonly onToggleTrack: (
    trackId: string,
    patch: Partial<EditorTrack>,
  ) => void;
  readonly onZoom: (pxPerSec: number) => void;
  readonly onSplit: () => void;
  readonly onDelete: () => void;
  readonly onToggleSnap: () => void;
};

export function Timeline(props: Props) {
  const {
    project,
    pxPerSec,
    playheadMs,
    selectedIds,
    peaks,
    frames,
    snapEnabled,
    onSeek,
    onSelect,
    onClearSelection,
    onMoveClip,
    onTrimClip,
    onGestureEnd,
    onToggleTrack,
    onZoom,
    onSplit,
    onDelete,
    onToggleSnap,
  } = props;

  const scrollerRef = useRef<HTMLDivElement>(null);

  const durationMs = useMemo(() => projectDurationMs(project), [project]);
  /** A screen of empty runway past the end, so the last clip can be dragged. */
  const canvasMs = durationMs + 8000;
  const canvasWidth = msToPx(canvasMs, pxPerSec);

  const gesture = useClipGesture({
    project,
    pxPerSec,
    playheadMs,
    snapEnabled,
    onMove: onMoveClip,
    onTrim: onTrimClip,
    onSelect,
    onGestureEnd,
  });

  /** Client x → project ms, accounting for scroll and the header column. */
  const msAtClientX = useCallback(
    (clientX: number): number => {
      const scroller = scrollerRef.current;
      if (!scroller) return 0;
      const rect = scroller.getBoundingClientRect();
      const x =
        clientX - rect.left + scroller.scrollLeft - TIMELINE_GEOMETRY.headerWidth;
      return Math.max(0, pxToMs(x, pxPerSec));
    },
    [pxPerSec],
  );

  /** Scrub: pointer down anywhere on the ruler or empty lane moves the head. */
  const startScrub = useCallback(
    (event: React.PointerEvent) => {
      if (event.button !== 0) return;
      onSeek(msAtClientX(event.clientX));
      const move = (moveEvent: PointerEvent) =>
        onSeek(msAtClientX(moveEvent.clientX));
      const finish = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
    },
    [msAtClientX, onSeek],
  );

  const ticks = useMemo(() => {
    const step = rulerStepMs(pxPerSec);
    const out: number[] = [];
    for (let ms = 0; ms <= canvasMs; ms += step) out.push(ms);
    return out;
  }, [pxPerSec, canvasMs]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent, clip: Parameters<typeof gesture.onPointerDown>[1], mode: GestureMode) => {
      gesture.onPointerDown(event, clip, mode);
    },
    [gesture],
  );

  return (
    <section
      aria-label="Timeline"
      className="flex min-h-0 flex-col"
      style={{ background: "var(--ve-panel)" }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div
        className="flex h-9 shrink-0 items-center gap-1 px-2"
        style={{ borderBottom: "1px solid var(--ve-line)" }}
      >
        <ToolbarButton onClick={onSplit} title="Split at playhead (Ctrl+B)">
          <Scissors className="size-3.5" />
          <span>Split</span>
        </ToolbarButton>
        <ToolbarButton onClick={onDelete} title="Delete selected (Del)">
          <Trash2 className="size-3.5" />
          <span>Delete</span>
        </ToolbarButton>

        <div className="mx-1 h-4 w-px" style={{ background: "var(--ve-line-strong)" }} />

        <button
          type="button"
          onClick={onToggleSnap}
          title="Toggle snapping (hold Alt to bypass)"
          className="h-6 rounded px-2 text-[11px]"
          style={{
            background: snapEnabled ? "var(--ve-accent-wash)" : "transparent",
            color: snapEnabled ? "var(--ve-accent)" : "var(--ve-text-dim)",
          }}
        >
          Snap
        </button>

        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton
            onClick={() => onZoom(pxPerSec / 1.5)}
            title="Zoom out"
          >
            <ZoomOut className="size-3.5" />
          </ToolbarButton>
          <span
            className="w-14 text-center text-[10px] tabular-nums"
            style={{ color: "var(--ve-text-faint)" }}
          >
            {Math.round(pxPerSec)} px/s
          </span>
          <ToolbarButton onClick={() => onZoom(pxPerSec * 1.5)} title="Zoom in">
            <ZoomIn className="size-3.5" />
          </ToolbarButton>
        </div>
      </div>

      {/* ── Scroller ────────────────────────────────────────────────────── */}
      <div
        ref={scrollerRef}
        className="relative min-h-0 flex-1 overflow-auto"
        onPointerDown={(event) => {
          // Empty space clears selection; clips stopPropagation so they don't.
          if (event.target === event.currentTarget) onClearSelection();
        }}
      >
        <div
          style={{
            width: canvasWidth + TIMELINE_GEOMETRY.headerWidth,
            position: "relative",
          }}
        >
          {/* Ruler */}
          <div
            className="sticky top-0 z-20 flex"
            style={{
              height: TIMELINE_GEOMETRY.rulerHeight,
              background: "var(--ve-panel)",
              borderBottom: "1px solid var(--ve-line-strong)",
            }}
          >
            <div
              className="sticky left-0 z-10 shrink-0"
              style={{
                width: TIMELINE_GEOMETRY.headerWidth,
                background: "var(--ve-panel)",
                borderRight: "1px solid var(--ve-line-strong)",
              }}
            />
            <div
              data-testid="ve-ruler"
              className="relative flex-1 cursor-ew-resize"
              onPointerDown={startScrub}
            >
              {ticks.map((ms) => (
                <div
                  key={ms}
                  className="absolute top-0 flex h-full items-center"
                  style={{ left: msToPx(ms, pxPerSec) }}
                >
                  <div
                    className="h-2 w-px"
                    style={{ background: "var(--ve-line-strong)" }}
                  />
                  <span
                    className="ml-1 text-[9px] tabular-nums"
                    style={{ color: "var(--ve-text-faint)" }}
                  >
                    {formatRulerLabel(ms)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracks */}
          {project.tracks.map((track) => {
            const laneHeight = isAudioTrackKind(track.kind)
              ? TIMELINE_GEOMETRY.audioTrackHeight
              : TIMELINE_GEOMETRY.trackHeight;
            return (
              <div
                key={track.id}
                className="flex"
                style={{
                  height: laneHeight,
                  borderBottom: "1px solid var(--ve-line)",
                }}
              >
                <TrackHeader
                  track={track}
                  onToggle={(patch) => onToggleTrack(track.id, patch)}
                />
                <div
                  className="relative flex-1"
                  onPointerDown={(event) => {
                    if (event.target === event.currentTarget) {
                      onClearSelection();
                      startScrub(event);
                    }
                  }}
                  style={{
                    opacity: track.hidden || track.muted ? 0.4 : 1,
                    background: track.locked
                      ? "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.02) 6px, rgba(255,255,255,0.02) 12px)"
                      : undefined,
                  }}
                >
                  {sortedClips(track).map((clip) => (
                    <TimelineClip
                      key={clip.id}
                      clip={clip}
                      trackKind={track.kind}
                      pxPerSec={pxPerSec}
                      height={laneHeight - 1}
                      selected={selectedIds.includes(clip.id)}
                      dragging={gesture.activeClipId === clip.id}
                      peaks={peaks[clip.id]}
                      frameSrc={frames[clip.id]}
                      onPointerDown={handlePointerDown}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* Playhead — one element crossing every track. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 z-30"
            style={{
              left:
                TIMELINE_GEOMETRY.headerWidth + msToPx(playheadMs, pxPerSec),
              bottom: 0,
              width: 1,
              background: "var(--ve-accent)",
            }}
          >
            <div
              className="absolute -left-[5px] top-0 size-0"
              style={{
                borderLeft: "5.5px solid transparent",
                borderRight: "5.5px solid transparent",
                borderTop: "7px solid var(--ve-accent)",
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ToolbarButton({
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
      className="flex h-6 items-center gap-1 rounded px-2 text-[11px] hover:brightness-125"
      style={{ background: "var(--ve-raised)", color: "var(--ve-text-dim)" }}
    >
      {children}
    </button>
  );
}

function TrackHeader({
  track,
  onToggle,
}: {
  readonly track: EditorTrack;
  readonly onToggle: (patch: Partial<EditorTrack>) => void;
}) {
  const audio = isAudioTrackKind(track.kind);
  return (
    <div
      className="sticky left-0 z-10 flex shrink-0 items-center gap-1 px-2"
      style={{
        width: TIMELINE_GEOMETRY.headerWidth,
        background: "var(--ve-panel)",
        borderRight: "1px solid var(--ve-line-strong)",
      }}
    >
      <span
        className="flex-1 truncate text-[10px] font-medium tracking-wide"
        style={{ color: "var(--ve-text-dim)" }}
      >
        {track.name}
      </span>
      {track.locked ? (
        <Lock className="size-3" style={{ color: "var(--ve-text-faint)" }} />
      ) : null}
      <button
        type="button"
        title={audio ? "Mute track" : "Hide track"}
        onClick={() =>
          onToggle(audio ? { muted: !track.muted } : { hidden: !track.hidden })
        }
        className="rounded p-0.5 hover:brightness-150"
        style={{
          color:
            (audio ? track.muted : track.hidden)
              ? "var(--ve-accent)"
              : "var(--ve-text-faint)",
        }}
      >
        {audio ? (
          track.muted ? (
            <VolumeX className="size-3" />
          ) : (
            <Volume2 className="size-3" />
          )
        ) : track.hidden ? (
          <EyeOff className="size-3" />
        ) : (
          <Eye className="size-3" />
        )}
      </button>
    </div>
  );
}

/** Re-exported so the shell can show "end of project" without recomputing. */
export function timelineEndMs(project: EditorProject): number {
  let end = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) end = Math.max(end, clipEndMs(clip));
  }
  return end;
}
