"use client";

import {
  visualClipsAt,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
} from "@/shared/types/video-editor";

/**
 * The project canvas at one instant.
 *
 * ==================== DOM LAYERS, NOT A <canvas> ====================
 * Every layer is a positioned element inside a 1920x1080 box that the monitor
 * scales with a single transform. That choice buys three things a 2D context
 * would have to reimplement: text is real text (selectable, styleable, and
 * correct at any scale), an element can be hit-tested to select its clip, and
 * a future drag handle is just another absolutely positioned child. The cost —
 * no per-pixel effects — is a cost this pipeline does not pay anyway, because
 * the production renderer composites in ffmpeg, not here.
 *
 * ==================== IT IS A PREVIEW, NOT THE RENDER ====================
 * What this paints is the EDITOR's model of the frame. The production renderer
 * is single-track and applies a 260ms crossfade at every cut, so the true
 * output is fractionally shorter and dissolves where this hard-cuts. The
 * monitor says so rather than implying frame accuracy it does not have.
 */

export function CanvasRenderer({
  project,
  timeMs,
  frames,
  selectedIds,
  onSelectClip,
}: {
  readonly project: EditorProject;
  readonly timeMs: number;
  readonly frames: Readonly<Record<string, string>>;
  readonly selectedIds: readonly string[];
  readonly onSelectClip: (clipId: string) => void;
}) {
  const layers = visualClipsAt(project, timeMs);

  return (
    <div
      data-testid="ve-canvas"
      className="relative overflow-hidden"
      style={{
        width: project.width,
        height: project.height,
        background: "#000",
      }}
    >
      {layers.map(({ track, clip }) => (
        <Layer
          key={clip.id}
          track={track}
          clip={clip}
          frames={frames}
          selected={selectedIds.includes(clip.id)}
          onSelect={() => onSelectClip(clip.id)}
        />
      ))}
    </div>
  );
}

function Layer({
  track,
  clip,
  frames,
  selected,
  onSelect,
}: {
  readonly track: EditorTrack;
  readonly clip: EditorClip;
  readonly frames: Readonly<Record<string, string>>;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const t = clip.transform ?? {};
  const base: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: t.opacity ?? 1,
    transform: `translate(${t.x ?? 0}px, ${t.y ?? 0}px) scale(${t.scale ?? 1}) rotate(${t.rotation ?? 0}deg)`,
    transformOrigin: "center",
    outline: selected ? "2px solid var(--ve-accent)" : undefined,
    outlineOffset: -2,
    cursor: "pointer",
  };

  // Captions are pinned to the lower third, matching where the renderer's
  // caption band lands, so what you position here is what burns in.
  if (track.kind === "caption") {
    return (
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        style={{
          ...base,
          inset: "auto 0 92px 0",
          display: "flex",
          justifyContent: "center",
          padding: "0 160px",
        }}
      >
        <span
          style={{
            background: "rgba(0,0,0,0.72)",
            color: "#fff",
            fontSize: 44,
            lineHeight: 1.3,
            padding: "14px 28px",
            borderRadius: 6,
            textAlign: "center",
            maxWidth: "100%",
          }}
        >
          {clip.text?.text ?? clip.label}
        </span>
      </div>
    );
  }

  if (track.kind === "text" || clip.kind === "text") {
    const style = clip.text ?? {};
    return (
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        style={{
          ...base,
          display: "flex",
          alignItems: "center",
          justifyContent:
            style.align === "left"
              ? "flex-start"
              : style.align === "right"
                ? "flex-end"
                : "center",
          padding: "0 120px",
        }}
      >
        <span
          style={{
            fontSize: style.fontSize ?? 96,
            fontWeight: style.fontWeight ?? 600,
            color: style.color ?? "#ffffff",
            background: style.background ?? "transparent",
            padding: style.background ? "12px 24px" : 0,
            textAlign: style.align ?? "center",
            WebkitTextStroke: style.stroke ? `2px ${style.stroke}` : undefined,
          }}
        >
          {style.text ?? clip.label}
        </span>
      </div>
    );
  }

  const src = frames[clip.id];
  if (src) {
    return (
      <div
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        style={{
          ...base,
          backgroundImage: `url(${src})`,
          backgroundSize: t.fit === "contain" ? "contain" : "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
    );
  }

  // A clip whose frame has not been generated. Named rather than blank, so a
  // missing asset is diagnosable from the monitor instead of looking like a
  // black frame the edit intended.
  return (
    <div
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        ...base,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#15171b",
        color: "#5a5f68",
        fontSize: 32,
        letterSpacing: "0.08em",
      }}
    >
      {clip.label}
    </div>
  );
}
