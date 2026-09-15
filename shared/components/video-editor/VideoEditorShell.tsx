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
  clampPxPerSec,
  formatTimecode,
  projectDurationMs,
  type EditorClip,
  type EditorTrack,
  isVisualTrackKind,
} from "@/shared/types/video-editor";
import { AssetBrowser } from "./AssetBrowser";
import { useAssetCatalog } from "./LibraryPanel";
import { PanelBoundary } from "./PanelBoundary";
import {
  assetPatchFor,
  placeNewImageClip,
  resolveAsset,
} from "@/shared/lib/video-editor/media-insert";
import { EditorHeader, type SaveState } from "./EditorHeader";
import { Inspector } from "./Inspector";
import type { StudioBeatVisual } from "@/shared/types/visual-selection";
import { PlaybackControls } from "./PlaybackControls";
import { PreviewMonitor } from "./PreviewMonitor";
import { Timeline } from "./Timeline";
import { ToolRail, type ToolTabId } from "./ToolRail";
import { useAudioEngine } from "./useAudioEngine";
import { editorThemeVars } from "./editor-theme";
import { PlaybackClockProvider } from "./playback";
import {
  PLAYBACK_RATES,
  PlaybackClock,
} from "@/shared/lib/video-editor/playback-clock";

/**
 * The editor shell: owns the reducer, the playback clock, the keyboard, and
 * the layout.
 *
 * ==================== PROJECT STATE AND PLAYBACK STATE ARE SEPARATE ====================
 * The reducer holds the EDIT — tracks, clips, selection, zoom, history — and
 * changes when the operator edits. The `PlaybackClock` holds TIME and changes
 * continuously. They used to be one: the playhead was reducer state advanced by
 * a `seek` dispatch every animation frame, so every frame re-rendered the whole
 * editor (the 108-clip timeline, the inspector, the 160-tile photo library) and
 * the clock's correctness depended on React committing between frames. It did
 * not, and time ran backwards. See `playback-clock.ts` for the measurements.
 *
 * Now nothing in this component re-renders while the film plays.
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
const RENDERABLE_PROJECT_IDS = ["hvac-01", "hvac-04", "compressor-01"];

export function VideoEditorShell({
  episode,
  draftBanner,
  draftMetadata,
  visuals,
}: {
  readonly episode: LoadedEpisode;
  /** One line naming the agent and preference set behind a generated draft. */
  readonly draftBanner?: string;
  readonly draftMetadata?: DraftGenerationMetadata;
  /**
   * The curation record by clip id, when the draft was curated.
   *
   * Read-only context for the inspector: why this shot, what else was
   * considered, and how much the system believes its own choice. Swapping one
   * goes through the ordinary `onPatch` path, so a swap is an ordinary edit
   * and the diff already knows how to describe it (`asset_replaced`).
   */
  readonly visuals?: Readonly<Record<string, StudioBeatVisual>>;
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
  const { catalog } = useAssetCatalog(true);
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
  /** Why an insert did not happen, in the operator's words rather than a throw. */
  const [actionNotice, setActionNotice] = useState<string | null>(null);
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
    // Loaded as the starting point, not recorded as an edit: an undo step
    // called "Restore autosave" was one Ctrl+Z from discarding the work.
    dispatch({ type: "loadProject", project: stored.project });
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
   * One clock for the life of the editor. Created lazily so the server render
   * and the first client render agree (both see time 0, paused).
   */
  const [clock] = useState(
    () => new PlaybackClock({ durationMs: projectDurationMs(episode.project) }),
  );
  // An edit that lengthens or shortens the film tells the clock; it moves time
  // only if the parked playhead is now past the end.
  useEffect(() => {
    clock.setDuration(durationMs);
  }, [clock, durationMs]);
  useEffect(() => () => clock.pause(), [clock]);

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
    clock,
    project,
    sources: episode.audio,
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
        dispatch({ type: "splitSelected", atMs: clock.getTime() });
        return;
      }
      if (mod && event.key.toLowerCase() === "c") {
        dispatch({ type: "copySelected" });
        return;
      }
      if (mod && event.key.toLowerCase() === "v") {
        dispatch({ type: "paste", atMs: clock.getTime() });
        return;
      }
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        dispatch({ type: "duplicateSelected" });
        return;
      }
      // Any other modified key belongs to the browser (Ctrl+S, Ctrl+L…), and
      // must not fall through to the single-letter editor shortcuts below.
      if (mod || event.altKey) return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          clock.toggle();
          break;
        case "ArrowLeft":
          event.preventDefault();
          clock.step(-(event.shiftKey ? 1000 : frameMs));
          break;
        case "ArrowRight":
          event.preventDefault();
          clock.step(event.shiftKey ? 1000 : frameMs);
          break;
        case "Home":
          event.preventDefault();
          clock.seek(0);
          break;
        case "End":
          event.preventDefault();
          clock.seek(clock.getDuration());
          break;
        case "s":
        case "S":
          event.preventDefault();
          dispatch({ type: "splitSelected", atMs: clock.getTime() });
          break;
        // J / K / L, as in every editing application: K stops, L plays and
        // each further press goes faster. J here jumps back five seconds
        // rather than playing in reverse — narration cannot play backwards,
        // and a silent reverse scrub would be a second, worse, scrubber.
        case "k":
        case "K":
          clock.pause();
          break;
        case "l":
        case "L": {
          if (!clock.isPlaying()) {
            clock.setRate(1);
            clock.play();
          } else {
            const faster = PLAYBACK_RATES.find((r) => r > clock.getRate());
            if (faster !== undefined) clock.setRate(faster);
          }
          break;
        }
        case "j":
        case "J":
          clock.seek(clock.getTime() - 5000);
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
  }, [clock, dispatch, project.fps]);

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

  /**
   * The clip a library asset would land on.
   *
   * A visual clip, and exactly one of them. Applying a photograph to a caption
   * or a narration clip is not a thing anyone means to do, and applying one to
   * a multi-selection would silently change several shots at once — so the
   * browser's grid disables itself rather than guessing.
   */
  const assetTarget = useMemo(() => {
    if (selected.length !== 1) return null;
    const clip = selected[0];
    if (clip === undefined) return null;
    const track = project.tracks.find((t) => t.clips.some((c) => c.id === clip.id));
    if (!track || !isVisualTrackKind(track.kind) || track.kind === "caption") return null;
    return { clip, track };
  }, [selected, project]);

  /**
   * The pictures on screen, following the edit.
   *
   * `episode.frames` is the COMMITTED map — the frame each clip had when the
   * episode was built — and it cannot answer for a clip whose asset has since
   * been replaced. Left alone it shows the old photograph after a swap, which
   * is the one moment an operator most needs the monitor to be honest.
   *
   * The override is the library's own thumbnail, because that is the file that
   * exists right now; the full-size frame is staged at render time from the
   * library master. So the preview is the right PICTURE immediately, and the
   * render is the right picture at full resolution.
   */
  const frames = useMemo(() => {
    const committed = new Map<string, string | undefined>();
    for (const t of episode.project.tracks) {
      for (const c of t.clips) committed.set(c.id, c.assetId);
    }
    const byAsset = new Map(catalog?.assets.map((a) => [a.assetId, a.thumbnailUrl]) ?? []);
    let changed = false;
    const out: Record<string, string> = { ...episode.frames };
    for (const t of project.tracks) {
      for (const c of t.clips) {
        if (c.assetId === undefined || c.assetId === committed.get(c.id)) continue;
        const url = byAsset.get(c.assetId);
        if (url === undefined) continue;
        out[c.id] = url;
        changed = true;
      }
    }
    return changed ? out : episode.frames;
  }, [catalog, episode.frames, episode.project, project]);

  /**
   * Put a library asset on the selected clip.
   *
   * This goes through the ordinary patch path, which is what makes it an
   * ordinary edit: it joins the undo history, it autosaves, and the diff
   * against the generated snapshot reports it as `asset_replaced` — the signal
   * that says a human overrode the system's choice. A dedicated mutation here
   * would put the single most valuable learning event outside the one channel
   * that records them.
   */
  const portrait = project.height > project.width;

  const handleApplyAsset = useCallback(
    (assetId: string) => {
      if (assetTarget === null) {
        setActionNotice(
          "Select a visual clip first — a photograph has to land on a shot.",
        );
        return;
      }
      // Decided before anything is dispatched: the asset must exist and
      // resolve to a picture, and the clip must be able to take it. A refusal
      // is a sentence on screen, never a half-applied edit.
      const resolved = resolveAsset(catalog?.assets ?? null, assetId, { portrait });
      if (!resolved.ok) {
        setActionNotice(resolved.reason);
        return;
      }
      const applied = assetPatchFor(assetTarget.clip, assetTarget.track, assetId);
      if (!applied.ok) {
        setActionNotice(applied.reason);
        return;
      }
      setActionNotice(null);
      handlePatch(assetTarget.clip.id, applied.patch, "Apply library asset");
    },
    [assetTarget, catalog, handlePatch, portrait],
  );

  /**
   * Add a photograph as a NEW clip, at the playhead, on the overlay track.
   *
   * Deliberately not on the video track: that would either overlap the shot
   * already there or push every later cut away from the narration measured
   * against it. On the overlay it covers the film for its own length and
   * nothing else in the project moves.
   */
  const handleAddAssetAsClip = useCallback(
    (assetId: string) => {
      const resolved = resolveAsset(catalog?.assets ?? null, assetId, { portrait });
      if (!resolved.ok) {
        setActionNotice(resolved.reason);
        return;
      }
      const asset = catalog?.assets.find((a) => a.assetId === assetId);
      const at = Math.round(clock.getTime());
      const placement = placeNewImageClip(project, {
        assetId,
        label: asset?.subject ?? assetId,
        atMs: at,
        id: `img-${assetId}-${String(at)}`,
      });
      if (!placement.ok) {
        setActionNotice(placement.reason);
        return;
      }
      dispatch({ type: "addClip", trackId: placement.trackId, clip: placement.clip });
      setActionNotice(
        `Added ${asset?.subject ?? assetId} on OVERLAY at ${formatTimecode(at)}.`,
      );
    },
    [catalog, clock, dispatch, portrait, project],
  );

  /** Send the operator to the library with this clip selected. */
  const handleRequestReplace = useCallback(
    (clipId: string) => {
      dispatch({ type: "select", clipId });
      setTool("library");
    },
    [dispatch],
  );


  const handleInsertText = useCallback(() => {
    const textTrack = project.tracks.find((t) => t.kind === "text");
    if (!textTrack) return;
    const at = Math.round(clock.getTime());
    dispatch({
      type: "addClip",
      trackId: textTrack.id,
      clip: {
        id: `text-${state.revision}-${at}`,
        kind: "text",
        label: "New text",
        startMs: at,
        durationMs: 3000,
        text: { text: "New text", fontSize: 96, align: "center", color: "#fff" },
      },
    });
    setTool("text");
  }, [clock, dispatch, project.tracks, state.revision]);

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
    <PlaybackClockProvider value={clock}>
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

        {approvalNotice || restoredNotice || exportSummary || actionNotice ? (
          <div
            className="flex shrink-0 items-center gap-2 px-3 py-1 text-[11px]"
            style={{
              background: "var(--ve-accent-wash)",
              color: "var(--ve-accent)",
              borderBottom: "1px solid var(--ve-line)",
            }}
          >
            <span data-testid="ve-notice">
              {approvalNotice ?? exportSummary ?? actionNotice ?? restoredNotice}
            </span>
            <button
              type="button"
              onClick={() => {
                setApprovalNotice(null);
                setExportSummary(null);
                setRestoredNotice(null);
                setActionNotice(null);
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
          <PanelBoundary name="media browser">
            <AssetBrowser
              tab={tool}
              project={project}
              frames={frames}
              onInsertText={handleInsertText}
              onSelectClip={(clipId) => handleSelect(clipId, false)}
              onApplyAsset={handleApplyAsset}
              onAddAsset={handleAddAssetAsClip}
              selectedAssetId={assetTarget?.clip.assetId ?? null}
              canApplyAsset={assetTarget !== null}
            />
          </PanelBoundary>

          <main className="flex min-w-0 flex-1 flex-col">
            <PanelBoundary name="preview">
              <PreviewMonitor
                project={project}
                frames={frames}
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
                onReplaceAsset={handleRequestReplace}
                onRemoveClip={(clipId) => {
                  dispatch({ type: "select", clipId });
                  dispatch({ type: "deleteSelected" });
                }}
              />
            </PanelBoundary>
            <PlaybackControls
              durationMs={durationMs}
              fps={project.fps}
              muted={masterMuted}
              onToggleMute={() => setMasterMuted((v) => !v)}
              audioBlocked={audioEngine.blocked}
              onUnlockAudio={audioEngine.unlock}
              audioClipCount={audioEngine.loadedCount}
            />
          </main>

          <PanelBoundary name="inspector">
            <Inspector
              project={project}
              selected={selected}
              onPatch={handlePatch}
              visuals={visuals ?? {}}
              frames={frames}
              onReplaceAsset={handleRequestReplace}
              onDelete={() => dispatch({ type: "deleteSelected" })}
              onDuplicate={() => dispatch({ type: "duplicateSelected" })}
              onSplit={() =>
                dispatch({ type: "splitSelected", atMs: clock.getTime() })
              }
            />
          </PanelBoundary>
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
            <PanelBoundary name="timeline">
            <Timeline
              project={project}
              pxPerSec={state.pxPerSec}
              selectedIds={state.selection.clipIds}
              peaks={episode.peaks}
              frames={frames}
              snapEnabled={snapEnabled}
              onSeek={(ms) => clock.seek(ms)}
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
              onSplit={() => dispatch({ type: "splitSelected", atMs: clock.getTime() })}
              onDelete={() => dispatch({ type: "deleteSelected" })}
              onDuplicate={() => dispatch({ type: "duplicateSelected" })}
              onFit={(visibleWidthPx) =>
                dispatch({
                  type: "setPxPerSec",
                  pxPerSec: clampPxPerSec(
                    durationMs > 0
                      ? (visibleWidthPx - 24) / (durationMs / 1000)
                      : state.pxPerSec,
                  ),
                })
              }
              onToggleSnap={() => setSnapEnabled((v) => !v)}
            />
            </PanelBoundary>
          </div>
        </div>
      </div>
    </div>
    </PlaybackClockProvider>
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
