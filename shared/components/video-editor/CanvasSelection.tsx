"use client";

import { useCallback, useRef } from "react";
import type { EditorClip, EditorTransform } from "@/shared/types/video-editor";

/**
 * Selection bounds and handles on the preview canvas.
 *
 * ==================== POINTER DELTAS ARE DIVIDED BY THE STAGE SCALE ====================
 * The canvas is laid out at 1920x1080 and displayed with a single CSS
 * transform, typically around 0.45. A pointer that moved 100 screen pixels
 * therefore moved ~222 PROJECT pixels, and writing the raw delta would make
 * dragging feel weighted differently at every window size — and, worse, would
 * store a different number depending on how wide the browser happened to be.
 *
 * ==================== IT OWNS NO STATE ====================
 * Every gesture reports a transform through `onTransform`, which goes to the
 * same `updateClip` action the inspector uses. That is what makes canvas edits
 * undoable, inspectable and persistent for free: there is no canvas-only copy
 * of the clip that could disagree with the timeline.
 */

const HANDLE = 14;
/** Screen pixels from the frame edge. Keeps handles clear of the clip. */
const INSET = 3;

type Corner = "nw" | "ne" | "se" | "sw";

export function CanvasSelection({
  clip,
  frameWidth,
  frameHeight,
  stageScale,
  onTransform,
  onGestureEnd,
}: {
  readonly clip: EditorClip;
  readonly frameWidth: number;
  readonly frameHeight: number;
  /** The PreviewMonitor's display scale, so screen deltas become project px. */
  readonly stageScale: number;
  readonly onTransform: (next: EditorTransform, coalesceKey: string) => void;
  readonly onGestureEnd: () => void;
}) {
  const t = clip.transform ?? {};
  const scale = t.scale ?? 1;
  const x = t.x ?? 0;
  const y = t.y ?? 0;
  const rotation = t.rotation ?? 0;

  const originRef = useRef<{
    pointerX: number;
    pointerY: number;
    transform: EditorTransform;
  } | null>(null);

  const begin = useCallback(
    (
      event: React.PointerEvent,
      apply: (dxProject: number, dyProject: number, start: EditorTransform) => EditorTransform,
      coalesceKey: string,
    ) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();

      originRef.current = {
        pointerX: event.clientX,
        pointerY: event.clientY,
        transform: { ...t },
      };

      const move = (moveEvent: PointerEvent) => {
        const origin = originRef.current;
        if (!origin) return;
        // Screen delta -> project delta. This division is the whole reason a
        // drag feels the same at every zoom.
        const dx = (moveEvent.clientX - origin.pointerX) / stageScale;
        const dy = (moveEvent.clientY - origin.pointerY) / stageScale;
        onTransform(apply(dx, dy, origin.transform), coalesceKey);
      };

      const finish = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        originRef.current = null;
        onGestureEnd();
      };

      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
    },
    [t, stageScale, onTransform, onGestureEnd],
  );

  const dragBody = useCallback(
    (event: React.PointerEvent) =>
      begin(
        event,
        (dx, dy, start) => ({
          ...start,
          x: Math.round((start.x ?? 0) + dx),
          y: Math.round((start.y ?? 0) + dy),
        }),
        `canvas-move:${clip.id}`,
      ),
    [begin, clip.id],
  );

  const dragCorner = useCallback(
    (event: React.PointerEvent, corner: Corner) =>
      begin(
        event,
        (dx, dy, start) => {
          // Scale from the frame's half-diagonal so a corner drag tracks the
          // pointer instead of accelerating away from it. Outward is positive
          // for every corner, which is why the sign flips per corner.
          const signX = corner === "ne" || corner === "se" ? 1 : -1;
          const signY = corner === "se" || corner === "sw" ? 1 : -1;
          const reach = (dx * signX + dy * signY) / 2;
          const base = Math.hypot(frameWidth, frameHeight) / 2;
          const next = (start.scale ?? 1) + reach / base;
          return { ...start, scale: Math.max(0.1, Math.min(4, Number(next.toFixed(3)))) };
        },
        `canvas-scale:${clip.id}`,
      ),
    [begin, clip.id, frameWidth, frameHeight],
  );

  const dragRotate = useCallback(
    (event: React.PointerEvent) =>
      begin(
        event,
        (dx, _dy, start) => ({
          // Horizontal travel maps to degrees. A true angle-from-centre would
          // be more "correct" and is worse to use: the handle sits above the
          // frame, so small vertical jitter would spin it.
          ...start,
          rotation: Math.round(((start.rotation ?? 0) + dx / 4) * 10) / 10,
        }),
        `canvas-rotate:${clip.id}`,
      ),
    [begin, clip.id],
  );

  const corners: Corner[] = ["nw", "ne", "se", "sw"];

  return (
    <div
      data-testid="ve-canvas-selection"
      className="absolute inset-0"
      style={{
        transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`,
        transformOrigin: "center",
        outline: "2px solid var(--ve-accent)",
        outlineOffset: -2,
        cursor: "move",
      }}
      onPointerDown={dragBody}
    >
      {corners.map((corner) => (
        <div
          key={corner}
          data-testid={`ve-handle-${corner}`}
          onPointerDown={(event) => dragCorner(event, corner)}
          style={{
            position: "absolute",
            width: HANDLE / stageScale,
            height: HANDLE / stageScale,
            background: "var(--ve-accent)",
            border: `${1 / stageScale}px solid #000`,
            // INSIDE the frame, not straddling its edge. The canvas clips with
            // `overflow: hidden`, so a handle centred on the corner has its
            // outer half cut off and its centre point — the spot a pointer
            // aims at — lands outside the canvas entirely and hits the panel
            // behind it. Measured, not guessed: elementFromPoint at the corner
            // returned the preview container.
            top: corner.startsWith("n") ? INSET / stageScale : undefined,
            bottom: corner.startsWith("s") ? INSET / stageScale : undefined,
            left: corner.endsWith("w") ? INSET / stageScale : undefined,
            right: corner.endsWith("e") ? INSET / stageScale : undefined,
            cursor:
              corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
          }}
        />
      ))}

      <div
        data-testid="ve-handle-rotate"
        onPointerDown={dragRotate}
        style={{
          position: "absolute",
          left: "50%",
          // Also inside, for the same clipping reason.
          top: INSET / stageScale,
          width: HANDLE / stageScale,
          height: HANDLE / stageScale,
          marginLeft: -HANDLE / stageScale / 2,
          borderRadius: "50%",
          background: "var(--ve-accent)",
          border: `${1 / stageScale}px solid #000`,
          cursor: "grab",
        }}
      />
    </div>
  );
}
