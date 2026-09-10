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
import {
  audioRefsFrom,
  type LoadedEpisode,
} from "@/shared/lib/video-editor/demo-project";
import {
  appendEvent,
  approveSession,
  createSession,
  deriveEditEvent,
  loadSessions,
  saveSessions,
  upsertSession,
} from "@/shared/lib/video-editor/session";
import { diffEditorProjects } from "@/shared/lib/video-editor/diff";
import { buildScorecard, type Scorecard } from "@/shared/lib/video-editor/scorecard";
import type { DraftGenerationMetadata } from "@/shared/lib/video-editor/draft-from-plan";
import { AGENT_FORMATS } from "@/shared/types/editing-preferences";
import type { EditSession } from "@/shared/types/edit-learning";
import {
  compileProjectToTimeline,
  describeCompileResult,
} from "@/shared/lib/video-editor/compile";
import { describeBakePlan } from "@/shared/lib/video-editor/bake";
import { canQueue } from "@/shared/lib/video-editor/render-job";
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
import { useAudioEngine } from "./useAudioEngine";
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

/**
 * Projects the laptop worker will render, mirrored from its ALLOWLIST.
 *
 * Checked here so the control is disabled rather than offered and refused, and
 * checked THERE so the browser's opinion is not the security boundary. Both,
 * because a client-side check is a courtesy and a worker-side check is the
 * rule.
 */
const RENDERABLE_PROJECT_IDS = ["hvac-01", "hvac-04"];

export function VideoEditorShell({
  episode,
  draftBanner,
  draftMetadata,
}: {
  readonly episode: LoadedEpisode;
  /** One line naming the agent and preference set behind a generated draft. */
  readonly draftBanner?: string;
  readonly draftMetadata?: DraftGenerationMetadata;
}) {
  const [state, rawDispatch] = useReducer(
    (s: Parameters<typeof editorReducer>[0], a: EditorAction) =>
      editorReducer(s, a),
    episode.project,
    createEditorState,
  );

  /**
   * Dispatch, with the action remembered so the capture effect below can
   * derive an event from (previous state, action, next state). The action is
   * stashed rather than the event computed here, because computing it here
   * would mean running the reducer a second time and guessing at the ids the
   * real run will mint.
   */
  const dispatch = useCallback(
    (action: EditorAction) => {
      lastActionRef.current = action;
      (rawDispatch as React.Dispatch<EditorAction>)(action);
    },
    [rawDispatch],
  );
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
  const [masterMuted, setMasterMuted] = useState(false);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [approvalNotice, setApprovalNotice] = useState<string | null>(null);
  const [capturedEvents, setCapturedEvents] = useState(0);

  /* ── Edit session ─────────────────────────────────────────────────────── */
  /**
   * The session opens against the ORIGINAL episode — the bot's draft — not
   * against a restored autosave. That distinction is the whole experiment: the
   * control condition has to be what the agent produced, or the diff measures
   * an operator against their own earlier self.
   */
  const sessionRef = useRef<EditSession | null>(null);
  const sessionStartRef = useRef<number>(0);
  const eventSeqRef = useRef(0);
  const lastActionRef = useRef<EditorAction | null>(null);
  const prevStateRef = useRef<ReturnType<typeof createEditorState> | null>(null);

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

  /* ── Session capture ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (sessionRef.current) return;
    sessionStartRef.current = Date.now();
    sessionRef.current = createSession({
      id: `session-${episode.project.id}-${sessionStartRef.current}`,
      projectId: episode.project.id,
      generatedProjectSnapshot: episode.project,
      generatedBy: draftMetadata?.agentVersion ?? episode.meta.generatedBy,
      startedAt: new Date(sessionStartRef.current).toISOString(),
      scope: { series: episode.meta.series, format: AGENT_FORMATS.longFormYoutube },
    });
    prevStateRef.current = createEditorState(episode.project);
  }, [episode]);

  /**
   * One event per committed change.
   *
   * Consecutive events of the same action on the same clip REPLACE each other,
   * mirroring the history's gesture coalescing: a drag commits ~200 revisions
   * and is one editorial decision, so recording two hundred of them would drown
   * the signal it is supposed to carry.
   */
  useEffect(() => {
    const action = lastActionRef.current;
    const previous = prevStateRef.current;
    prevStateRef.current = state;
    if (!action || !previous || !sessionRef.current) return;

    const event = deriveEditEvent(previous, action, state, {
      projectId: episode.project.id,
      timestampMs: Date.now() - sessionStartRef.current,
      makeId: () => `evt-${(eventSeqRef.current += 1)}`,
    });
    if (!event) return;

    const existing = sessionRef.current.events;
    const last = existing[existing.length - 1];
    if (last && last.action === event.action && last.clipId === event.clipId) {
      sessionRef.current = {
        ...sessionRef.current,
        events: [...existing.slice(0, -1), { ...event, id: last.id }],
      };
    } else {
      sessionRef.current = appendEvent(sessionRef.current, event);
    }
    setCapturedEvents(sessionRef.current.events.length);
  }, [state, episode.project.id]);

  /* ── Audio ────────────────────────────────────────────────────────────── */
  const audioEngine = useAudioEngine({
    project,
    sources: episode.audio,
    playheadMs: state.playheadMs,
    isPlaying: state.isPlaying,
    masterMuted,
  });

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
        case "m":
        case "M":
          setMasterMuted((v) => !v);
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
  /**
   * Queue a render.
   *
   * The browser writes a JOB, never a command: a project id, a compiled
   * timeline and a bake plan. Every binary, flag and path is chosen by the
   * worker on the production laptop, which will only run the one pipeline it
   * has. The project id is checked against the same allowlist the worker holds,
   * here as well as there, so an unrenderable request is refused before it
   * becomes a file rather than after it becomes a failed job.
   *
   * The two-command laptop render remains exactly what it was; this is a
   * narrower second door onto the same compositor.
   */
  const handleQueueRender = useCallback(() => {
    const result = compileProjectToTimeline(project, {
      audio: audioRefsFrom(episode.audio),
    });
    const gate = canQueue({
      projectId: project.id,
      allowlist: RENDERABLE_PROJECT_IDS,
      compileErrors: result.errors,
    });

    if (!gate.ok) {
      setExportSummary(`Cannot queue — ${gate.reason}`);
      return;
    }

    const jobId = `job-${Date.now().toString(36)}`;
    const request = {
      jobId,
      projectId: project.id,
      projectTitle: project.title,
      requestedAt: new Date().toISOString(),
      timeline: result.timeline,
      bakePlan: result.bakePlan,
      drops: result.drops,
      expectedOutputMs: result.expectedOutputMs,
      assetStem: project.id,
    };

    const blob = new Blob([JSON.stringify(request, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${jobId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);

    setExportSummary(
      `Queued ${jobId} — run it on the laptop: node production/slide-system/run-editor-render-job.mjs ${jobId}.json`,
    );
  }, [project]);

  const handleExport = useCallback(() => {
    const result = compileProjectToTimeline(project, {
      audio: audioRefsFrom(episode.audio),
    });
    const payload = {
      exportedAt: new Date().toISOString(),
      summary: describeCompileResult(result),
      timeline: result.timeline,
      expectedOutputMs: result.expectedOutputMs,
      blockingErrors: result.errors,
      droppedProperties: result.drops,
      // What the laptop must composite before rendering, and what survives
      // because of it. Together with `droppedProperties` this accounts for
      // every non-default property in the project.
      bakePlan: result.bakePlan,
      bakedProperties: result.bakedProperties,
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
        ? `Blocked — ${result.errors.length} issue${result.errors.length === 1 ? "" : "s"} must be fixed before rendering. ${describeCompileResult(result)}`
        : `Package ready — ${describeCompileResult(result)}, ${describeBakePlan(result.bakePlan)}. Run it on the production laptop.`,
    );
  }, [project]);

  /**
   * Approve: write the approved snapshot ALONGSIDE the draft, never over it,
   * and compute the diff that becomes evidence.
   *
   * Approval is not publishing. Nothing leaves this machine here — the session
   * is stored, the operator is told what was captured, and the decision to
   * render or publish stays a separate, later action.
   */
  const handleApprove = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    const approved = approveSession(session, project, new Date().toISOString());
    sessionRef.current = approved;

    const stored = upsertSession(loadSessions(), approved);
    const ok = saveSessions(stored);

    const diff = diffEditorProjects(
      approved.generatedProjectSnapshot,
      project,
    );
    setScorecard(
      buildScorecard(approved.generatedProjectSnapshot, project, diff),
    );
    const parts = [
      `${diff.summary.totalChanges} change${diff.summary.totalChanges === 1 ? "" : "s"} captured for learning`,
    ];
    if (diff.summary.clipsShortened) {
      parts.push(`${diff.summary.clipsShortened} shortened`);
    }
    if (diff.summary.clipsRemoved) {
      parts.push(`${diff.summary.clipsRemoved} removed`);
    }
    if (diff.summary.captionEdits) {
      parts.push(`${diff.summary.captionEdits} caption${diff.summary.captionEdits === 1 ? "" : "s"} edited`);
    }
    if (!ok) parts.push("(not stored — browser blocked local storage)");

    setApprovalNotice(`Approved — ${parts.join(", ")}`);
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
          onApprove={handleApprove}
          onQueueRender={handleQueueRender}
          canQueueRender={RENDERABLE_PROJECT_IDS.includes(project.id)}
          capturedEvents={capturedEvents}
        />

        {draftBanner && !approvalNotice ? (
          <div
            className="flex shrink-0 items-center gap-2 px-3 py-1 text-[11px]"
            style={{
              background: "var(--ve-raised)",
              color: "var(--ve-text-dim)",
              borderBottom: "1px solid var(--ve-line)",
            }}
          >
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                background: "var(--ve-accent-wash)",
                color: "var(--ve-accent)",
              }}
            >
              GENERATED DRAFT
            </span>
            {draftBanner}
          </div>
        ) : null}

        {approvalNotice || restoredNotice || exportSummary ? (
          <div
            className="flex shrink-0 items-center gap-2 px-3 py-1 text-[11px]"
            style={{
              background: "var(--ve-accent-wash)",
              color: "var(--ve-accent)",
              borderBottom: "1px solid var(--ve-line)",
            }}
          >
            {approvalNotice ?? exportSummary ?? restoredNotice}
            <button
              type="button"
              onClick={() => {
                setApprovalNotice(null);
                setExportSummary(null);
                setRestoredNotice(null);
              }}
              className="ml-auto underline"
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {scorecard ? (
          <ScorecardStrip
            scorecard={scorecard}
            onDismiss={() => setScorecard(null)}
          />
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
              onTransform={(clipId, transform, coalesceKey) =>
                dispatch({
                  type: "updateClip",
                  clipId,
                  patch: { transform },
                  label: "Transform on canvas",
                  coalesceKey,
                })
              }
              onGestureEnd={() => dispatch({ type: "endGesture" })}
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
              muted={masterMuted}
              onToggleMute={() => setMasterMuted((v) => !v)}
              audioBlocked={audioEngine.blocked}
              onUnlockAudio={audioEngine.unlock}
              audioClipCount={audioEngine.loadedCount}
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

/**
 * Bot draft → human approved, as numbers.
 *
 * Shown once, after approval, and dismissible. It is the answer to the only
 * question that matters about the loop over time — how much did I have to
 * change what the agent made — and every figure comes from the deterministic
 * diff rather than from anything that could be described as an opinion.
 */
function ScorecardStrip({
  scorecard,
  onDismiss,
}: {
  readonly scorecard: Scorecard;
  readonly onDismiss: () => void;
}) {
  return (
    <div
      data-testid="ve-scorecard"
      className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 px-3 py-1.5"
      style={{
        background: "var(--ve-panel)",
        borderBottom: "1px solid var(--ve-line-strong)",
      }}
    >
      <span
        className="text-[11px] font-medium"
        style={{ color: "var(--ve-text)" }}
      >
        {scorecard.headline}
      </span>
      {scorecard.lines.map((line) => (
        <span
          key={line.label}
          className="text-[11px] tabular-nums"
          style={{
            color: line.isChange ? "var(--ve-accent)" : "var(--ve-text-dim)",
          }}
        >
          {line.label}: {line.value}
        </span>
      ))}
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto text-[11px] underline"
        style={{ color: "var(--ve-text-faint)" }}
      >
        Dismiss
      </button>
    </div>
  );
}
