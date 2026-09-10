"use client";

import { useEffect, useRef, useState } from "react";
import type {
  EditorProject,
  EditorTransform,
} from "@/shared/types/video-editor";
import { CanvasRenderer } from "./CanvasRenderer";

/**
 * The program monitor: a dark stage with the project canvas scaled to fit.
 *
 * The canvas is always laid out at its true `project.width x project.height`
 * and scaled by ONE transform, so every child can be positioned in project
 * pixels and nothing downstream needs to know the zoom. That is also what
 * keeps 9:16 a data change rather than a code change — swap the project's
 * dimensions and the fit math already handles it.
 */
export function PreviewMonitor({
  project,
  timeMs,
  frames,
  selectedIds,
  onSelectClip,
  onTransform,
  onGestureEnd,
}: {
  readonly project: EditorProject;
  readonly timeMs: number;
  readonly frames: Readonly<Record<string, string>>;
  readonly selectedIds: readonly string[];
  readonly onSelectClip: (clipId: string) => void;
  readonly onTransform: (
    clipId: string,
    next: EditorTransform,
    coalesceKey: string,
  ) => void;
  readonly onGestureEnd: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;

    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      // 24px of breathing room so the frame never touches the panel edge —
      // a canvas flush to its container reads as a cropped image.
      const next = Math.min(
        (width - 24) / project.width,
        (height - 24) / project.height,
      );
      setScale(Math.max(0.05, next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [project.width, project.height]);

  return (
    <div
      ref={boxRef}
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden"
      style={{ background: "var(--ve-stage)" }}
    >
      <div
        style={{
          width: project.width * scale,
          height: project.height * scale,
          boxShadow: "0 0 0 1px var(--ve-line-strong), 0 12px 40px rgba(0,0,0,0.6)",
        }}
      >
        <div
          style={{
            width: project.width,
            height: project.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <CanvasRenderer
            project={project}
            timeMs={timeMs}
            frames={frames}
            selectedIds={selectedIds}
            onSelectClip={onSelectClip}
            stageScale={scale}
            onTransform={onTransform}
            onGestureEnd={onGestureEnd}
          />
        </div>
      </div>

      <span
        className="pointer-events-none absolute right-2 top-2 rounded px-1.5 py-0.5 text-[10px] tabular-nums"
        style={{ background: "rgba(0,0,0,0.55)", color: "var(--ve-text-faint)" }}
      >
        {project.width}×{project.height} · {Math.round(scale * 100)}%
      </span>
    </div>
  );
}
