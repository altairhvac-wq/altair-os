"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  canRedo as historyCanRedo,
  canUndo as historyCanUndo,
  redoLabel as historyRedoLabel,
  undoLabel as historyUndoLabel,
} from "@/shared/lib/video-editor/history";
import {
  createEditorState,
  currentProject,
  editorReducer,
  selectedClips,
  type EditorAction,
} from "@/shared/lib/video-editor/store";
import {
  loadProject,
  saveProject,
} from "@/shared/lib/video-editor/persistence";
import type { LoadedEpisode } from "@/shared/lib/video-editor/demo-project";
import {
  compileProjectToTimeline,
  describeCompileResult,
} from "@/shared/lib/video-editor/compile";
import {
  projectDurationMs,
  type EditorClip,
  type EditorTrack,
} from "@/shared/types/video-editor";
import { AssetBrowser } from "./AssetBrowser";
import { EditorHeader, type SaveState } from "./EditorHeader";
import { Inspector } from "./Inspector";
import { PlaybackControls } from "./PlaybackControls";
import { PreviewMonitor } from "./PreviewMonitor";
import { Timeline } from "./Timeline";
import { ToolRail, type ToolTabId } from "./ToolRail";
import { editorThemeVars } from "./editor-theme";

/**
 * The editor shell: owns the reducer, the clock, the keyboard, and the layout.
 *
 * ==================== THE CLOCK IS A rAF LOOP, NOT AN INTERVAL ====================
 * Playback advances the playhead from `performance.now()` deltas inside
 * requestAnimationFrame. A setInterval would drift against the display and
 * stutter whenever the main thread is busy — which, in an editor, is whenever
 * anything interesting is happening.
 *
 * The loop reads its elapsed time from a ref rather than from state, so the
 * effect does not re-subscribe on every frame. The only thing state receives
 * is the resulting seek.
 */

const AUTOSAVE_DEBOUNCE_MS = 700;
/** Where the timeline sits by default, as a fraction of the editor height. */
const DEFAULT_TIMELINE_FRACTION = 0.44;
const MIN_TIMELINE_PX = 160;

export function VideoEditorShell({ episode }: { readonly episode: LoadedEpisode }) {
  const [state, rawDispatch] = useReducer(
    (s: Parameters<typeof editorReducer>[0], a: EditorAction) =>
      editorReducer(s, a),
    episode.project,
    createEditorState,
  );

  const dispatch = rawDispatch as React.Dispatch<EditorAction>;
  const project = currentProject(state);
  const durationMs = useMemo(() => projectDurationMs(project), [project]);
  const selected = useMemo(() => selectedClips(state), [state]);

  const [tool, setTool] = useState<ToolTabId>("media");
  const [snapEnabled, setSnapEnabled] = useState(true);
  /**
   * Save status is DERIVED from "which revision did we last persist", not
   * stored as its own flag. A separate flag is a second source of truth that
   * goes stale exactly when it matters — the moment a save fails.
   */
  const [savedRevision, setSavedRevision] = useState(0);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [timelineHeight, setTimelineHeight] = useState<number | null>(null);
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);
  const [exportSummary, setExportSummary] = useState<string | null>(null);

  /* ── Restore a stored draft, once, on mount ───────────────────────────── */
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const stored = loadProject(episode.project.id);
    if (!stored) return;
    dispatch({
      type: "replaceProject",
      project: stored.project,
      label: "Restore autosave",
    });
    setSavedAt(stored.savedAt);
    setRestoredNotice(
      `Restored your unsaved edit from ${new Date(stored.savedAt).toLocaleString()}`,
    );
  }, [dispatch, episode.project.id]);

  /* ── Autosave, debounced on the revision counter ──────────────────────── */
  useEffect(() => {
    if (state.revision === 0 || state.revision === savedRevision) return;
    const revisionBeingSaved = state.revision;
    const handle = window.setTimeout(() => {
      const ok = saveProject(episode.project.id, project);
      setStorageBlocked(!ok);
      if (ok) {
        setSavedRevision(revisionBeingSaved);
        setSavedAt(new Date().toISOString());
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [state.revision, savedRevision, project, episode.project.id]);

  const saveState: SaveState = storageBlocked
    ? "unavailable"
    : state.revision === savedRevision
      ? "saved"
      : "saving";

  /* ── Playback clock ───────────────────────────────────────────────────── */
  /**
   * The loop reads the playhead from a ref so it does not re-subscribe on
   * every frame. The ref is synced in its own effect rather than during
   * render — writing a ref while rendering is a correctness bug React's lint
   * rules flag as an error, and this repo keeps that rule at error on purpose.
   */
  const playheadRef = useRef(state.playheadMs);
  useEffect(() => {
    playheadRef.current = state.playheadMs;
  }, [state.playheadMs]);

  useEffect(() => {
    if (!state.isPlaying) return;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const next = playheadRef.current + delta;
      if (next >= durationMs) {
        dispatch({ type: "seek", ms: durationMs });
        dispatch({ type: "setPlaying", playing: false });
        return;
      }
      dispatch({ type: "seek", ms: next });
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state.isPlaying, durationMs, dispatch]);

  /* ── Keyboard ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const frameMs = 1000 / project.fps;

    const onKeyDown = (event: KeyboardEvent) => {
      // Never steal a key from a field the operator is typing in.
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        dispatch({ type: event.shiftKey ? "redo" : "undo" });
        return;
      }
      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        dispatch({ type: "redo" });
        return;
      }
      if (mod && event.key.toLowerCase() === "b") {
        event.preventDefault();
        dispatch({ type: "splitSelected" });
        return;
      }
      if (mod && event.key.toLowerCase() === "c") {
        dispatch({ type: "copySelected" });
        return;
      }
      if (mod && event.key.toLowerCase() === "v") {
        dispatch({ type: "paste" });
        return;
      }
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        dispatch({ type: "duplicateSelected" });
        return;
      }

      switch (event.key) {
        case " ":
          event.preventDefault();
          dispatch({ type: "setPlaying", playing: !state.isPlaying });
          break;
        case "ArrowLeft":
          event.preventDefault();
          dispatch({
            type: "seek",
            ms: playheadRef.current - (event.shiftKey ? 1000 : frameMs),
          });
          break;
        case "ArrowRight":
          event.preventDefault();
          dispatch({
            type: "seek",
            ms: playheadRef.current + (event.shiftKey ? 1000 : frameMs),
          });
          break;
        case "Home":
          event.preventDefault();
          dispatch({ type: "seek", ms: 0 });
          break;
        case "End":
          event.preventDefault();
          dispatch({ type: "seek", ms: durationMs });
          break;
        case "Delete":
        case "Backspace":
          event.preventDefault();
          dispatch({ type: "deleteSelected" });
          break;
        case "Escape":
          dispatch({ type: "clearSelection" });
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, durationMs, project.fps, state.isPlaying]);

  /* ── Timeline resize ──────────────────────────────────────────────────── */
  const shellRef = useRef<HTMLDivElement>(null);
  const startResize = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const shell = shellRef.current;
    if (!shell) return;

    const move = (moveEvent: PointerEvent) => {
      const rect = shell.getBoundingClientRect();
      const next = rect.bottom - moveEvent.clientY;
      setTimelineHeight(
        Math.max(MIN_TIMELINE_PX, Math.min(next, rect.height - 220)),
      );
    };
    const finish = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
  }, []);

  /* ── Callbacks ────────────────────────────────────────────────────────── */
  const handleSelect = useCallback(
    (clipId: string, additive: boolean) =>
      dispatch(
        additive
          ? { type: "toggleSelect", clipId }
          : { type: "select", clipId },
      ),
    [dispatch],
  );

  const handlePatch = useCallback(
    (
      clipId: string,
      patch: Partial<EditorClip>,
      label: string,
      coalesceKey?: string,
    ) => dispatch({ type: "updateClip", clipId, patch, label, coalesceKey }),
    [dispatch],
  );

  const handleInsertText = useCallback(() => {
    const textTrack = project.tracks.find((t) => t.kind === "text");
    if (!textTrack) return;
    dispatch({
      type: "addClip",
      trackId: textTrack.id,
      clip: {
        id: `text-${state.revision}-${Math.round(state.playheadMs)}`,
        kind: "text",
        label: "New text",
        startMs: state.playheadMs,
        durationMs: 3000,
        text: { text: "New text", fontSize: 96, align: "center", color: "#fff" },
      },
    });
    setTool("text");
  }, [dispatch, project.tracks, state.playheadMs, state.revision]);

  /**
   * Export COMPILES to the renderer's Timeline and downloads it alongside the
   * project and the drop report.
   *
   * It deliberately does not fire a render. The renderer runs on the
   * production laptop against a local ffmpeg and asset library; a button here
   * that claimed to start one would be a promise this application cannot keep.
   * What it can do honestly is produce the exact plan that pipeline consumes,
   * plus a list of everything the edit contains that the renderer will not
   * carry — so the difference is known before the master exists, not after.
   */
  const handleExport = useCallback(() => {
    const result = compileProjectToTimeline(project);
    const payload = {
      exportedAt: new Date().toISOString(),
      summary: describeCompileResult(result),
      timeline: result.timeline,
      expectedOutputMs: result.expectedOutputMs,
      blockingErrors: result.errors,
      droppedProperties: result.drops,
      project,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.id}-timeline.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportSummary(
      result.errors.length
        ? `Exported with ${result.errors.length} blocking issue${result.errors.length === 1 ? "" : "s"} — ${describeCompileResult(result)}`
        : `Exported — ${describeCompileResult(result)}`,
    );
  }, [project]);

  const toggleTrack = useCallback(
    (trackId: string, patch: Partial<EditorTrack>) =>
      dispatch({ type: "updateTrack", trackId, patch }),
    [dispatch],
  );

  return (
    <div
      ref={shellRef}
      style={editorThemeVars}
      className="flex h-dvh w-full flex-col overflow-hidden"
    >
      <div
        className="flex h-full flex-col"
        style={{ background: "var(--ve-bg)", color: "var(--ve-text)" }}
      >
        <EditorHeader
          title={project.title}
          durationMs={durationMs}
          saveState={saveState}
          savedAt={savedAt}
          canUndo={historyCanUndo(state.history)}
          canRedo={historyCanRedo(state.history)}
          undoLabel={historyUndoLabel(state.history)}
          redoLabel={historyRedoLabel(state.history)}
          onUndo={() => dispatch({ type: "undo" })}
          onRedo={() => dispatch({ type: "redo" })}
          onExport={handleExport}
        />

        {restoredNotice || exportSummary ? (
          <div
            className="flex shrink-0 items-center gap-2 px-3 py-1 text-[11px]"
            style={{
              background: "var(--ve-accent-wash)",
              color: "var(--ve-accent)",
              borderBottom: "1px solid var(--ve-line)",
            }}
          >
            {exportSummary ?? restoredNotice}
            <button
              type="button"
              onClick={() => {
                setExportSummary(null);
                setRestoredNotice(null);
              }}
              className="ml-auto underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1">
          <ToolRail active={tool} onSelect={setTool} />
          <AssetBrowser
            tab={tool}
            project={project}
            frames={episode.frames}
            onInsertText={handleInsertText}
            onSelectClip={(clipId) => handleSelect(clipId, false)}
          />

          <main className="flex min-w-0 flex-1 flex-col">
            <PreviewMonitor
              project={project}
              timeMs={state.playheadMs}
              frames={episode.frames}
              selectedIds={state.selection.clipIds}
              onSelectClip={(clipId) => handleSelect(clipId, false)}
            />
            <PlaybackControls
              playheadMs={state.playheadMs}
              durationMs={durationMs}
              isPlaying={state.isPlaying}
              fps={project.fps}
              onPlayPause={() =>
                dispatch({ type: "setPlaying", playing: !state.isPlaying })
              }
              onSeek={(ms) => dispatch({ type: "seek", ms })}
              onStepFrame={(direction) =>
                dispatch({
                  type: "seek",
                  ms: state.playheadMs + (direction * 1000) / project.fps,
                })
              }
            />
          </main>

          <Inspector
            project={project}
            selected={selected}
            onPatch={handlePatch}
          />
        </div>

        {/* Resize grip */}
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize timeline"
          onPointerDown={startResize}
          className="h-1 shrink-0 cursor-ns-resize"
          style={{ background: "var(--ve-line-strong)" }}
        />

        <div
          className="shrink-0 overflow-hidden"
          style={{
            height:
              timelineHeight ??
              `max(${MIN_TIMELINE_PX}px, ${DEFAULT_TIMELINE_FRACTION * 100}%)`,
          }}
        >
          <div className="flex h-full flex-col">
            <Timeline
              project={project}
              pxPerSec={state.pxPerSec}
              playheadMs={state.playheadMs}
              selectedIds={state.selection.clipIds}
              peaks={episode.peaks}
              frames={episode.frames}
              snapEnabled={snapEnabled}
              onSeek={(ms) => dispatch({ type: "seek", ms })}
              onSelect={handleSelect}
              onClearSelection={() => dispatch({ type: "clearSelection" })}
              onMoveClip={(clipId, startMs) =>
                dispatch({ type: "moveClip", clipId, startMs })
              }
              onTrimClip={(clipId, edge, ms) =>
                dispatch({ type: "trimClip", clipId, edge, ms })
              }
              onGestureEnd={() => dispatch({ type: "endGesture" })}
              onToggleTrack={toggleTrack}
              onZoom={(pxPerSec) => dispatch({ type: "setPxPerSec", pxPerSec })}
              onSplit={() => dispatch({ type: "splitSelected" })}
              onDelete={() => dispatch({ type: "deleteSelected" })}
              onToggleSnap={() => setSnapEnabled((v) => !v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
