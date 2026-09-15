"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  isVisualTrackKind,
  type EditorClip,
  type EditorProject,
  type EditorTransform,
  type EditorTrack,
} from "@/shared/types/video-editor";
import {
  compositionAt,
  compositionKey,
  type CompositedLayer,
} from "@/shared/lib/video-editor/composition";
import { motionTransformCss } from "@/shared/lib/video-editor/motion";
import { CanvasSelection } from "./CanvasSelection";
import { usePlaybackClock, usePlaybackFrame } from "./playback";

/**
 * The project canvas at one instant.
 *
 * ==================== DOM LAYERS, NOT A <canvas> ====================
 * Every layer is a positioned element inside a 1920x1080 box that the monitor
 * scales with a single transform. That choice buys three things a 2D context
 * would have to reimplement: text is real text (selectable, styleable, and
 * correct at any scale), an element can be hit-tested to select its clip, and
 * a drag handle is just another absolutely positioned child.
 *
 * ==================== IT RE-RENDERS AT CUTS, NOT AT FRAMES ====================
 * The canvas subscribes to the playback clock itself. React re-renders only
 * when the SET of visible layers changes — a cut, a caption, a transition
 * starting. Camera motion inside a shot is written straight to the elements'
 * transforms on each frame, so a nine-second push-in costs no renders at all.
 *
 * ==================== A BROKEN PICTURE IS A PICTURE, NOT A CRASH ====================
 * Layers are real `<img>` elements, so a file that fails to load says so and
 * offers Retry / Replace / Remove. As a CSS background there was no error event
 * at all: a missing photograph simply drew nothing, which looks exactly like a
 * black shot the edit intended.
 */

export function CanvasRenderer({
  project,
  frames,
  selectedIds,
  onSelectClip,
  stageScale,
  onTransform,
  onGestureEnd,
  onReplaceAsset,
  onRemoveClip,
}: {
  readonly project: EditorProject;
  readonly frames: Readonly<Record<string, string>>;
  readonly selectedIds: readonly string[];
  readonly onSelectClip: (clipId: string) => void;
  readonly stageScale: number;
  readonly onTransform: (
    clipId: string,
    next: EditorTransform,
    coalesceKey: string,
  ) => void;
  readonly onGestureEnd: () => void;
  /** Open the library on this clip. Absent in contexts with no browser. */
  readonly onReplaceAsset?: (clipId: string) => void;
  readonly onRemoveClip?: (clipId: string) => void;
}) {
  const clock = usePlaybackClock();
  const [timeMs, setTimeMs] = useState(() => clock.getTime());
  const [failed, setFailed] = useState<Readonly<Record<string, number>>>({});

  const layers = compositionAt(project, timeMs);
  const key = compositionKey(layers);

  const projectRef = useRef(project);
  const keyRef = useRef(key);
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const veilRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    projectRef.current = project;
    keyRef.current = key;
  });

  /** Write one layer's live transform. The same numbers React renders. */
  const paint = useCallback(
    (composited: readonly CompositedLayer[]) => {
      let veil = 0;
      for (const layer of composited) {
        const node = nodesRef.current.get(layerKey(layer));
        if (node) {
          node.style.transform = layerTransform(layer, project.width, project.height);
          node.style.opacity = String(layerOpacity(layer));
        }
        if (layer.veil > veil) veil = layer.veil;
      }
      if (veilRef.current) veilRef.current.style.opacity = String(veil);
    },
    [project.width, project.height],
  );

  usePlaybackFrame((ms) => {
    if (!clock.isPlaying()) {
      setTimeMs(ms);
      return;
    }
    const next = compositionAt(projectRef.current, ms);
    if (compositionKey(next) !== keyRef.current) {
      // The cast changed: React must draw the new set, at this instant.
      setTimeMs(ms);
      return;
    }
    paint(next);
  });

  // After any render, put the elements where this instant says they are.
  useLayoutEffect(() => {
    paint(layers);
  });

  /**
   * Decode the next few pictures before the film reaches them.
   *
   * A 1920x1080 JPEG takes tens of milliseconds to decode, and doing it at the
   * cut means the frame that shows the new shot is also the frame that stalls.
   * Fetching ahead moves that work into the middle of the previous shot, where
   * there is nothing else happening.
   */
  const preloadedRef = useRef(new Set<string>());
  useEffect(() => {
    const horizonMs = timeMs + 15_000;
    const upcoming: string[] = [];
    for (const track of project.tracks) {
      if (track.hidden || !isVisualTrackKind(track.kind)) continue;
      for (const clip of track.clips) {
        if (clip.startMs >= timeMs && clip.startMs < horizonMs) upcoming.push(clip.id);
      }
    }
    for (const id of upcoming.slice(0, 8)) {
      const url = frames[id];
      if (!url || preloadedRef.current.has(url)) continue;
      preloadedRef.current.add(url);
      const image = new Image();
      image.decoding = "async";
      image.src = url;
    }
  }, [timeMs, project, frames]);

  /**
   * Handles are drawn for a selected clip only when it is VISIBLE at the
   * current time. Manipulating a clip you cannot see would move something
   * off-screen with no feedback, which is how an edit gets made by accident.
   */
  const manipulable = layers.find(
    (layer) =>
      !layer.outgoing &&
      selectedIds.includes(layer.clip.id) &&
      isVisualTrackKind(layer.track.kind) &&
      layer.track.kind !== "caption",
  );

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
      {layers.map((layer) => (
        <Layer
          key={layerKey(layer)}
          layer={layer}
          frames={frames}
          frameWidth={project.width}
          frameHeight={project.height}
          retryNonce={failed[layer.clip.id] ?? 0}
          register={(node) => {
            const map = nodesRef.current;
            if (node) map.set(layerKey(layer), node);
            else map.delete(layerKey(layer));
          }}
          onFailed={() =>
            setFailed((current) =>
              current[layer.clip.id] === undefined
                ? { ...current, [layer.clip.id]: 0 }
                : current,
            )
          }
          hasFailed={failed[layer.clip.id] !== undefined}
          onRetry={() =>
            setFailed((current) => ({
              ...current,
              [layer.clip.id]: (current[layer.clip.id] ?? 0) + 1,
            }))
          }
          onClearFailure={() =>
            setFailed((current) => {
              if (current[layer.clip.id] === undefined) return current;
              const next = { ...current };
              delete next[layer.clip.id];
              return next;
            })
          }
          {...(onReplaceAsset ? { onReplace: () => onReplaceAsset(layer.clip.id) } : {})}
          {...(onRemoveClip ? { onRemove: () => onRemoveClip(layer.clip.id) } : {})}
          // The selection outline moves to the handle frame when this clip is
          // directly manipulable, so the frame is not drawn twice.
          selected={
            !layer.outgoing &&
            selectedIds.includes(layer.clip.id) &&
            manipulable?.clip.id !== layer.clip.id
          }
          onSelect={() => onSelectClip(layer.clip.id)}
        />
      ))}

      {/* Fade through black: one veil over everything, as the renderer does. */}
      <div
        ref={veilRef}
        data-testid="ve-canvas-veil"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "#000", opacity: 0 }}
      />

      {manipulable ? (
        <CanvasSelection
          clip={manipulable.clip}
          frameWidth={project.width}
          frameHeight={project.height}
          stageScale={stageScale}
          onTransform={(next, key2) => onTransform(manipulable.clip.id, next, key2)}
          onGestureEnd={onGestureEnd}
        />
      ) : null}
    </div>
  );
}

/** A layer's identity, distinguishing a clip from its own outgoing copy. */
function layerKey(layer: CompositedLayer): string {
  return layer.outgoing ? `${layer.clip.id}^out` : layer.clip.id;
}

function layerOpacity(layer: CompositedLayer): number {
  return layer.opacity * (layer.clip.transform?.opacity ?? 1);
}

/** Camera move and slide, as one CSS transform. */
function layerTransform(
  layer: CompositedLayer,
  frameWidth: number,
  frameHeight: number,
): string {
  const base = motionTransformCss(
    layer.sample,
    frameWidth,
    frameHeight,
    layer.clip.transform,
  );
  if (layer.slideX === 0 && layer.slideY === 0) return base;
  return `translate(${layer.slideX * frameWidth}px, ${layer.slideY * frameHeight}px) ${base}`;
}

function Layer({
  layer,
  frames,
  frameWidth,
  frameHeight,
  selected,
  onSelect,
  register,
  retryNonce,
  hasFailed,
  onFailed,
  onRetry,
  onClearFailure,
  onReplace,
  onRemove,
}: {
  readonly layer: CompositedLayer;
  readonly frames: Readonly<Record<string, string>>;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly selected: boolean;
  readonly onSelect: () => void;
  readonly register: (node: HTMLElement | null) => void;
  readonly retryNonce: number;
  readonly hasFailed: boolean;
  readonly onFailed: () => void;
  readonly onRetry: () => void;
  readonly onClearFailure: () => void;
  readonly onReplace?: () => void;
  readonly onRemove?: () => void;
}) {
  const { clip, track } = layer;
  const t = clip.transform ?? {};
  const base: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    opacity: layerOpacity(layer),
    transform: layerTransform(layer, frameWidth, frameHeight),
    transformOrigin: "center",
    outline: selected ? "2px solid var(--ve-accent)" : undefined,
    outlineOffset: -2,
    cursor: "pointer",
  };
  const select = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
  };

  // Captions are pinned to the lower third, matching where the renderer's
  // caption band lands, so what you position here is what burns in.
  if (track.kind === "caption") {
    return (
      <div
        ref={register}
        data-clip-id={clip.id}
        onPointerDown={select}
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
        ref={register}
        data-clip-id={clip.id}
        onPointerDown={select}
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

  if (src && !hasFailed) {
    return (
      <div ref={register} data-clip-id={clip.id} onPointerDown={select} style={base}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a locally
            served frame at a known size; next/image would add a loader round
            trip and cannot report a decode failure to this component. */}
        <img
          src={retryNonce > 0 ? `${src}${src.includes("?") ? "&" : "?"}retry=${retryNonce}` : src}
          alt=""
          draggable={false}
          decoding="async"
          onError={onFailed}
          onLoad={onClearFailure}
          style={{
            width: "100%",
            height: "100%",
            objectFit: t.fit === "contain" ? "contain" : "cover",
            objectPosition: "center",
            display: "block",
          }}
        />
      </div>
    );
  }

  if (src && hasFailed) {
    return (
      <div
        ref={register}
        data-clip-id={clip.id}
        data-testid="ve-asset-failed"
        onPointerDown={select}
        style={{
          ...base,
          display: "flex",
          flexDirection: "column",
          gap: 18,
          alignItems: "center",
          justifyContent: "center",
          background: "#1b1214",
          color: "#e2a0a0",
          textAlign: "center",
          padding: "0 6%",
        }}
      >
        <span style={{ fontSize: 34, letterSpacing: "0.08em" }}>
          ASSET FAILED TO LOAD
        </span>
        <span style={{ fontSize: 16, color: "#a98a8a", wordBreak: "break-all" }}>
          {clip.label}
          {clip.assetId ? ` — ${clip.assetId}` : ""}
        </span>
        <span style={{ display: "flex", gap: 12 }}>
          <FailureAction label="Retry" testId="ve-asset-retry" onClick={onRetry} />
          {onReplace ? (
            <FailureAction label="Replace" testId="ve-asset-replace" onClick={onReplace} />
          ) : null}
          {onRemove ? (
            <FailureAction label="Remove" testId="ve-asset-remove" onClick={onRemove} />
          ) : null}
        </span>
      </div>
    );
  }

  // A clip whose picture is not on screen. Named rather than blank, so a
  // missing asset is diagnosable from the monitor instead of looking like a
  // black frame the edit intended.
  //
  // ==================== TWO DIFFERENT ABSENCES ====================
  // A clip with an `assetId` has had a real library asset CHOSEN for it and
  // simply has no thumbnail exported on this machine; a clip without one has
  // nothing chosen at all. Those need different answers from an operator — one
  // is "run the thumbnail export", the other is "this beat still needs a shot"
  // — and a single grey card saying the label would hide the difference.
  return (
    <div
      ref={register}
      data-clip-id={clip.id}
      onPointerDown={select}
      style={{
        ...base,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
        padding: "0 6%",
        textAlign: "center",
        background: "#15171b",
        color: "#5a5f68",
        fontSize: 32,
        letterSpacing: "0.08em",
      }}
    >
      <span>{clip.label}</span>
      {clip.assetId ? (
        <span
          data-testid="ve-canvas-asset-id"
          style={{
            fontSize: 15,
            letterSpacing: "0.02em",
            color: "#7c828d",
            wordBreak: "break-all",
          }}
        >
          {clip.assetId} — no thumbnail exported here
        </span>
      ) : (
        <span style={{ fontSize: 15, letterSpacing: "0.02em", color: "#6a7079" }}>
          no asset chosen for this beat
        </span>
      )}
    </div>
  );
}

function FailureAction({
  label,
  testId,
  onClick,
}: {
  readonly label: string;
  readonly testId: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        fontSize: 18,
        padding: "8px 20px",
        borderRadius: 4,
        border: "1px solid #6b4b4b",
        background: "#2a1c1e",
        color: "#e8c7c7",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

/** Kept for the Inspector's "what track is this on" copy. */
export type { EditorClip, EditorTrack };
