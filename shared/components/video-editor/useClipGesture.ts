"use client";

import { useCallback, useRef, useState } from "react";
import {
  clipEndMs,
  pxToMs,
  snapMs,
  snapTargetsMs,
  type EditorClip,
  type EditorProject,
} from "@/shared/types/video-editor";
import { TIMELINE_GEOMETRY } from "./editor-theme";
import { usePlaybackClock } from "./playback";

/**
 * One pointer gesture on a clip: move, trim-start, or trim-end.
 *
 * ==================== WHY POINTER CAPTURE AND NOT onDrag ====================
 * HTML5 drag-and-drop cannot express a trim. It has no continuous position
 * during the drag on every browser, it cannot be cancelled with Escape, it
 * drags a translucent ghost image nobody asked for, and its drop target model
 * is wrong for "this clip is now at 4.２ seconds". Pointer capture gives exact
 * client coordinates on every move, survives the cursor leaving the element,
 * and ends deterministically.
 *
 * ==================== THE GESTURE OWNS NO PROJECT STATE ====================
 * It reports intent — "this clip wants to start at 4200ms" — and the reducer
 * decides. That is what keeps the timeline a view: there is no local copy of
 * the clip being dragged that could survive a failed edit, and a move onto a
 * locked or incompatible track simply does not happen rather than happening
 * visually and then snapping back.
 */

export type GestureMode = "move" | "trim-start" | "trim-end";

type GestureState = {
  readonly clipId: string;
  readonly mode: GestureMode;
  /** Pointer x at gesture start, in client coordinates. */
  readonly originX: number;
  /** The clip's value at gesture start, so deltas are absolute not cumulative. */
  readonly originMs: number;
  /** True once the pointer has moved past the slop threshold. */
  moved: boolean;
};

/**
 * Below this, a gesture is a click. Without it, selecting a clip nudges it by
 * a pixel — which is invisible, permanent, and produces a timeline that
 * silently drifts every time you look at it.
 */
const DRAG_SLOP_PX = 3;

export type ClipGestureHandlers = {
  readonly onPointerDown: (
    event: React.PointerEvent,
    clip: EditorClip,
    mode: GestureMode,
  ) => void;
  readonly activeClipId: string | null;
  readonly activeMode: GestureMode | null;
};

export function useClipGesture(opts: {
  readonly project: EditorProject;
  readonly pxPerSec: number;
  readonly snapEnabled: boolean;
  readonly onMove: (clipId: string, startMs: number) => void;
  readonly onTrim: (
    clipId: string,
    edge: "start" | "end",
    ms: number,
  ) => void;
  readonly onSelect: (clipId: string, additive: boolean) => void;
  readonly onGestureEnd: () => void;
}): ClipGestureHandlers {
  const {
    project,
    pxPerSec,
    snapEnabled,
    onMove,
    onTrim,
    onSelect,
    onGestureEnd,
  } = opts;
  // Read at pointer-down, not received as a prop. As a prop, the playhead
  // changed this callback's identity every frame, which broke the memo on every
  // TimelineClip and re-rendered all 108 of them sixty times a second.
  const clock = usePlaybackClock();

  const gestureRef = useRef<GestureState | null>(null);
  const [active, setActive] = useState<{
    clipId: string;
    mode: GestureMode;
  } | null>(null);

  const onPointerDown = useCallback(
    (event: React.PointerEvent, clip: EditorClip, mode: GestureMode) => {
      // Left button only. A right-click here would begin a drag that never
      // ends, because there is no matching pointerup for the context menu.
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();

      const target = event.currentTarget as HTMLElement;
      target.setPointerCapture(event.pointerId);

      const originMs =
        mode === "trim-end" ? clipEndMs(clip) : clip.startMs;

      gestureRef.current = {
        clipId: clip.id,
        mode,
        originX: event.clientX,
        originMs,
        moved: false,
      };
      setActive({ clipId: clip.id, mode });

      // Select on press, not on release — the inspector should already show
      // this clip while you are dragging it.
      onSelect(clip.id, event.shiftKey);

      const snapTargets = snapEnabled
        ? snapTargetsMs(project, {
            excludeClipId: clip.id,
            playheadMs: Math.round(clock.getTime()),
          })
        : [];
      const toleranceMs = pxToMs(TIMELINE_GEOMETRY.snapPx, pxPerSec);

      const handleMove = (moveEvent: PointerEvent) => {
        const gesture = gestureRef.current;
        if (!gesture) return;

        const dx = moveEvent.clientX - gesture.originX;
        if (!gesture.moved && Math.abs(dx) < DRAG_SLOP_PX) return;
        gesture.moved = true;

        const rawMs = gesture.originMs + pxToMs(dx, pxPerSec);
        // Alt suppresses snapping for one gesture, the usual editor escape
        // hatch for placing something deliberately off a boundary.
        const snapped =
          snapEnabled && !moveEvent.altKey
            ? snapMs(rawMs, snapTargets, toleranceMs)
            : rawMs;

        if (gesture.mode === "move") {
          onMove(gesture.clipId, Math.max(0, snapped));
        } else {
          onTrim(
            gesture.clipId,
            gesture.mode === "trim-start" ? "start" : "end",
            Math.max(0, snapped),
          );
        }
      };

      const finish = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        if (gestureRef.current?.moved) onGestureEnd();
        gestureRef.current = null;
        setActive(null);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    },
    [
      clock,
      project,
      pxPerSec,
      snapEnabled,
      onMove,
      onTrim,
      onSelect,
      onGestureEnd,
    ],
  );

  return {
    onPointerDown,
    activeClipId: active?.clipId ?? null,
    activeMode: active?.mode ?? null,
  };
}
