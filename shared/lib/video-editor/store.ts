/**
 * The editor's single source of truth.
 *
 * ==================== ONE STATE, NOT THREE ====================
 * The failure mode this is built against is the obvious one: the timeline keeps
 * its own clip positions, the preview keeps its own idea of "now", and the
 * exporter reads a third structure — and they drift, silently, until a render
 * comes out wrong. So the project lives here, once. The timeline is a view of
 * it, the preview is a view of it, and the compiler reads it. Nothing else owns
 * timed state.
 *
 * `pxPerSec` and `selection` live here too but are NOT in the project, because
 * they are not the edit. Undo must not restore a scroll position — an undo that
 * also scrolls you somewhere else makes it impossible to see what it just undid.
 *
 * ==================== PLAYBACK IS NOT HERE ====================
 * The playhead used to live in this state and was advanced by dispatching a
 * `seek` sixty times a second. That made every frame a React commit of the
 * whole editor and made the clock's correctness depend on React committing
 * between animation frames — it did not, and time ran backwards. Playback now
 * belongs to `PlaybackClock`. Edits that need "now" (split, paste, insert at
 * playhead) are handed the time explicitly in the action, so the reducer stays
 * pure and a test states the instant rather than simulating a seek.
 */

import {
  addClip,
  clipEndMs,
  findClip,
  moveClipToTrack,
  normalizeClip,
  replaceClip,
  splitClipAt,
  trimClip,
  clampPxPerSec,
  EDITOR_DEFAULT_PX_PER_SEC,
  type EditorClip,
  type EditorProject,
  type EditorTrack,
} from "@/shared/types/video-editor";
import {
  canRedo,
  canUndo,
  commit,
  createHistory,
  redo,
  sealHistory,
  undo,
  type History,
} from "./history";

export type EditorSelection = {
  /** Clip ids. Multi-select is a set so shift-click has somewhere to go. */
  readonly clipIds: readonly string[];
};

export type EditorState = {
  readonly history: History<EditorProject>;
  readonly selection: EditorSelection;
  readonly pxPerSec: number;
  /** Bumped on every project change so autosave can debounce off it. */
  readonly revision: number;
  /** Clipboard for copy/paste. Not persisted. */
  readonly clipboard: readonly EditorClip[];
};

export const EDITOR_ACTIONS = [
  "select",
  "toggleSelect",
  "clearSelection",
  "setPxPerSec",
  "addClip",
  "moveClip",
  "moveClipToTrack",
  "trimClip",
  "splitSelected",
  "deleteSelected",
  "duplicateSelected",
  "updateClip",
  "updateTrack",
  "copySelected",
  "paste",
  "endGesture",
  "undo",
  "redo",
  "replaceProject",
  "loadProject",
] as const;

export type EditorAction =
  | { type: "select"; clipId: string | null }
  | { type: "toggleSelect"; clipId: string }
  | { type: "clearSelection" }
  | { type: "setPxPerSec"; pxPerSec: number }
  | { type: "addClip"; trackId: string; clip: EditorClip }
  | { type: "moveClip"; clipId: string; startMs: number }
  | { type: "moveClipToTrack"; clipId: string; trackId: string }
  | { type: "trimClip"; clipId: string; edge: "start" | "end"; ms: number }
  | { type: "splitSelected"; atMs: number }
  | { type: "deleteSelected" }
  | { type: "duplicateSelected" }
  | {
      type: "updateClip";
      clipId: string;
      patch: Partial<EditorClip>;
      label?: string;
      coalesceKey?: string;
    }
  | { type: "updateTrack"; trackId: string; patch: Partial<EditorTrack> }
  | { type: "copySelected" }
  | { type: "paste"; atMs: number }
  | { type: "endGesture" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "replaceProject"; project: EditorProject; label: string }
  /**
   * Open a stored project as the starting point: history is reset and nothing
   * is marked unsaved. Restoring an autosave is not an edit — recording it as
   * one put "Restore autosave" on the undo stack, one Ctrl+Z away from quietly
   * throwing the operator's work back to the original snapshot.
   */
  | { type: "loadProject"; project: EditorProject };

/**
 * Ids are generated here rather than with crypto.randomUUID at call sites so a
 * test can substitute a deterministic counter. Randomness inside a reducer is
 * otherwise the thing that makes state impossible to assert on.
 */
export type IdFactory = () => string;

let fallbackCounter = 0;
export const defaultIdFactory: IdFactory = () => {
  fallbackCounter += 1;
  return `clip-${fallbackCounter}-${Math.random().toString(36).slice(2, 8)}`;
};

export function createEditorState(project: EditorProject): EditorState {
  return {
    history: createHistory(project),
    selection: { clipIds: [] },
    pxPerSec: EDITOR_DEFAULT_PX_PER_SEC,
    revision: 0,
    clipboard: [],
  };
}

export function currentProject(state: EditorState): EditorProject {
  return state.history.present;
}

export function selectedClips(state: EditorState): EditorClip[] {
  const project = currentProject(state);
  const out: EditorClip[] = [];
  for (const id of state.selection.clipIds) {
    const found = findClip(project, id);
    if (found) out.push(found.clip);
  }
  return out;
}

/** Applies a project change and records it, keeping selection/playhead intact. */
function withProject(
  state: EditorState,
  next: EditorProject,
  label: string,
  coalesceKey?: string,
): EditorState {
  if (Object.is(next, currentProject(state))) return state;
  return {
    ...state,
    history: commit(state.history, next, label, coalesceKey),
    revision: state.revision + 1,
  };
}

export function editorReducer(
  state: EditorState,
  action: EditorAction,
  makeId: IdFactory = defaultIdFactory,
): EditorState {
  const project = currentProject(state);

  switch (action.type) {
    case "select":
      return {
        ...state,
        selection: { clipIds: action.clipId ? [action.clipId] : [] },
      };

    case "toggleSelect": {
      const has = state.selection.clipIds.includes(action.clipId);
      return {
        ...state,
        selection: {
          clipIds: has
            ? state.selection.clipIds.filter((id) => id !== action.clipId)
            : [...state.selection.clipIds, action.clipId],
        },
      };
    }

    case "clearSelection":
      return { ...state, selection: { clipIds: [] } };

    case "setPxPerSec": {
      const pxPerSec = clampPxPerSec(action.pxPerSec);
      return pxPerSec === state.pxPerSec ? state : { ...state, pxPerSec };
    }

    case "addClip": {
      const clip = normalizeClip({ ...action.clip });
      return {
        ...withProject(
          state,
          addClip(project, action.trackId, clip),
          `Add ${clip.label}`,
        ),
        selection: { clipIds: [clip.id] },
      };
    }

    case "moveClip": {
      const found = findClip(project, action.clipId);
      if (!found || found.track.locked) return state;
      const next = normalizeClip({ ...found.clip, startMs: action.startMs });
      return withProject(
        state,
        replaceClip(project, action.clipId, next),
        `Move ${found.clip.label}`,
        `move:${action.clipId}`,
      );
    }

    case "moveClipToTrack": {
      const found = findClip(project, action.clipId);
      if (!found) return state;
      return withProject(
        state,
        moveClipToTrack(project, action.clipId, action.trackId),
        `Move ${found.clip.label} to another track`,
        `track:${action.clipId}`,
      );
    }

    case "trimClip": {
      const found = findClip(project, action.clipId);
      if (!found || found.track.locked) return state;
      const next = trimClip(found.clip, action.edge, action.ms);
      return withProject(
        state,
        replaceClip(project, action.clipId, next),
        `Trim ${found.clip.label}`,
        `trim:${action.edge}:${action.clipId}`,
      );
    }

    case "splitSelected": {
      if (!Number.isFinite(action.atMs)) return state;
      const at = Math.round(action.atMs);
      let next = project;
      const newIds: string[] = [];
      let count = 0;

      for (const id of state.selection.clipIds) {
        const found = findClip(next, id);
        if (!found || found.track.locked) continue;
        const halves = splitClipAt(found.clip, at, makeId);
        if (!halves) continue;
        const [left, right] = halves;
        next = {
          ...next,
          tracks: next.tracks.map((track) =>
            track.id === found.track.id
              ? {
                  ...track,
                  clips: track.clips.flatMap((c) =>
                    c.id === id ? [left, right] : [c],
                  ),
                }
              : track,
          ),
        };
        newIds.push(left.id, right.id);
        count += 1;
      }

      if (count === 0) return state;
      return {
        ...withProject(state, next, count === 1 ? "Split clip" : "Split clips"),
        selection: { clipIds: newIds },
      };
    }

    case "deleteSelected": {
      if (state.selection.clipIds.length === 0) return state;
      let next = project;
      let removed = 0;
      for (const id of state.selection.clipIds) {
        const found = findClip(next, id);
        if (!found || found.track.locked) continue;
        next = replaceClip(next, id, null);
        removed += 1;
      }
      if (removed === 0) return state;
      return {
        ...withProject(
          state,
          next,
          removed === 1 ? "Delete clip" : `Delete ${removed} clips`,
        ),
        selection: { clipIds: [] },
      };
    }

    case "duplicateSelected": {
      if (state.selection.clipIds.length === 0) return state;
      let next = project;
      const newIds: string[] = [];
      for (const id of state.selection.clipIds) {
        const found = findClip(next, id);
        if (!found || found.track.locked) continue;
        // Placed immediately after the original, which is where a duplicate is
        // wanted often enough to be worth not making the user drag it there.
        const copy: EditorClip = {
          ...found.clip,
          id: makeId(),
          startMs: clipEndMs(found.clip),
        };
        next = addClip(next, found.track.id, copy);
        newIds.push(copy.id);
      }
      if (newIds.length === 0) return state;
      return {
        ...withProject(state, next, "Duplicate"),
        selection: { clipIds: newIds },
      };
    }

    case "updateClip": {
      const found = findClip(project, action.clipId);
      if (!found || found.track.locked) return state;
      const merged = normalizeClip({
        ...found.clip,
        ...action.patch,
      } as EditorClip);
      return withProject(
        state,
        replaceClip(project, action.clipId, merged),
        action.label ?? `Edit ${found.clip.label}`,
        action.coalesceKey,
      );
    }

    case "updateTrack": {
      const track = project.tracks.find((t) => t.id === action.trackId);
      if (!track) return state;
      const next: EditorProject = {
        ...project,
        tracks: project.tracks.map((t) =>
          t.id === action.trackId ? { ...t, ...action.patch } : t,
        ),
      };
      return withProject(state, next, `Update ${track.name}`);
    }

    case "copySelected": {
      const clips = selectedClips(state);
      return clips.length === 0 ? state : { ...state, clipboard: clips };
    }

    case "paste": {
      if (state.clipboard.length === 0 || !Number.isFinite(action.atMs)) return state;
      const at = Math.max(0, Math.round(action.atMs));
      // Pasted at the playhead, preserving relative offsets within the copied
      // set, so copying two clips two seconds apart pastes them two apart.
      const base = Math.min(...state.clipboard.map((c) => c.startMs));
      let next = project;
      const newIds: string[] = [];
      for (const clip of state.clipboard) {
        const host =
          project.tracks.find((t) =>
            t.clips.some((c) => c.id === clip.id),
          ) ?? project.tracks.find((t) => !t.locked);
        if (!host) continue;
        const copy: EditorClip = {
          ...clip,
          id: makeId(),
          startMs: at + (clip.startMs - base),
        };
        next = addClip(next, host.id, copy);
        newIds.push(copy.id);
      }
      if (newIds.length === 0) return state;
      return {
        ...withProject(state, next, "Paste"),
        selection: { clipIds: newIds },
      };
    }

    case "endGesture":
      return { ...state, history: sealHistory(state.history) };

    case "undo": {
      if (!canUndo(state.history)) return state;
      return {
        ...state,
        history: undo(state.history),
        revision: state.revision + 1,
        // Selection is dropped rather than restored: an undone clip may no
        // longer exist, and a selection pointing at nothing renders an
        // inspector full of stale values.
        selection: { clipIds: [] },
      };
    }

    case "redo": {
      if (!canRedo(state.history)) return state;
      return {
        ...state,
        history: redo(state.history),
        revision: state.revision + 1,
        selection: { clipIds: [] },
      };
    }

    case "replaceProject":
      return {
        ...withProject(state, action.project, action.label),
        selection: { clipIds: [] },
      };

    case "loadProject":
      return {
        ...state,
        history: createHistory(action.project),
        selection: { clipIds: [] },
      };

    default:
      return state;
  }
}
