/**
 * Edit sessions: capture, storage, and approval.
 *
 * ==================== EVENTS ARE DERIVED FROM ACTIONS, NOT FROM THE UI ====================
 * `deriveEditEvent` is a pure function of (previous state, action, next state).
 * It runs where dispatch runs, so every edit that reaches the project produces
 * an event and nothing that fails to reach the project produces one — a move
 * onto a locked track is rejected by the reducer, so it is silently not an
 * event, which is correct.
 *
 * The alternative, listeners on components, was rejected for the obvious
 * reason: it captures what the UI did rather than what the project did, so the
 * log fills up with gestures that changed nothing and misses every edit made
 * from a keyboard shortcut or a second entry point.
 *
 * ==================== THE REDUCER IS NOT MODIFIED ====================
 * The reducer is already tested and is the one piece of this editor that must
 * not wobble. Derivation sits beside it rather than inside it, which also keeps
 * the reducer pure — no clock, no id source, nothing that makes a test
 * non-deterministic.
 *
 * ==================== EVENTS ARE THE TRAIL, THE DIFF IS THE TRUTH ====================
 * A session keeps both. Events say what order things happened in, including
 * work that was later undone — useful for spotting hesitation. The diff between
 * the two snapshots says what actually changed, and that is what the learning
 * layer aggregates. Neither replaces the other.
 */

import type { EditorAction, EditorState } from "./store";
import { currentProject } from "./store";
import { findClip, type EditorProject } from "@/shared/types/video-editor";
import type {
  EditSession,
  HumanEditAction,
  HumanEditEvent,
} from "@/shared/types/edit-learning";

/* ══════════════════════════════════════════════════════════════════════════
 * Derivation
 * ══════════════════════════════════════════════════════════════════════════ */

/** Actions that never change the project, and so never produce an event. */
const NON_EDIT_ACTIONS = new Set<EditorAction["type"]>([
  "select",
  "toggleSelect",
  "clearSelection",
  "seek",
  "setPlaying",
  "setPxPerSec",
  "copySelected",
  "endGesture",
  "replaceProject",
]);

const ACTION_TO_EDIT: Partial<Record<EditorAction["type"], HumanEditAction>> = {
  addClip: "add",
  deleteSelected: "remove",
  moveClip: "move",
  moveClipToTrack: "reorder",
  trimClip: "trim",
  splitSelected: "split",
  duplicateSelected: "add",
  paste: "add",
  updateTrack: "property_change",
};

/**
 * Which kind of edit an `updateClip` was. The action itself is generic, so the
 * patch is inspected — a caption edit and a scale change arrive through the
 * same door and must not be recorded as the same thing.
 */
function classifyClipPatch(
  patch: Partial<import("@/shared/types/video-editor").EditorClip>,
  trackKind: string | undefined,
): HumanEditAction {
  if (patch.text !== undefined) {
    return trackKind === "caption" ? "caption_edit" : "text_edit";
  }
  if (patch.transform !== undefined) return "transform";
  if (patch.audio !== undefined) return "volume";
  if (patch.transitionInMs !== undefined) return "transition";
  if (patch.assetId !== undefined) return "replace_asset";
  if (patch.startMs !== undefined) return "move";
  if (patch.durationMs !== undefined) return "trim";
  return "property_change";
}

export type EventContext = {
  readonly projectId: string;
  /** Milliseconds since the session opened. */
  readonly timestampMs: number;
  readonly makeId: () => string;
};

/**
 * The event for one dispatch, or null when nothing changed.
 *
 * Comparing revisions rather than deep-comparing projects is what makes this
 * cheap enough to run on every dispatch: the reducer already increments
 * `revision` if and only if the project changed.
 */
export function deriveEditEvent(
  previous: EditorState,
  action: EditorAction,
  next: EditorState,
  ctx: EventContext,
): HumanEditEvent | null {
  if (next.revision === previous.revision) return null;
  if (NON_EDIT_ACTIONS.has(action.type)) return null;

  // Undo and redo change the project but are not new editorial decisions.
  // Recording them as edits would double-count the work they reverse.
  if (action.type === "undo" || action.type === "redo") return null;

  const base = {
    id: ctx.makeId(),
    projectId: ctx.projectId,
    timestampMs: ctx.timestampMs,
    source: "human" as const,
  };

  if (action.type === "updateClip") {
    const located = findClip(currentProject(previous), action.clipId);
    return {
      ...base,
      clipId: action.clipId,
      trackId: located?.track.id,
      action: classifyClipPatch(action.patch, located?.track.kind),
      before: located ? snapshotClip(located.clip) : undefined,
      after: snapshotClip(
        findClip(currentProject(next), action.clipId)?.clip ?? null,
      ),
    };
  }

  if (action.type === "moveClip" || action.type === "trimClip") {
    const beforeClip = findClip(currentProject(previous), action.clipId)?.clip;
    const afterLocated = findClip(currentProject(next), action.clipId);
    return {
      ...base,
      clipId: action.clipId,
      trackId: afterLocated?.track.id,
      action: action.type === "moveClip" ? "move" : "trim",
      before: snapshotClip(beforeClip ?? null),
      after: snapshotClip(afterLocated?.clip ?? null),
    };
  }

  if (action.type === "moveClipToTrack") {
    return {
      ...base,
      clipId: action.clipId,
      trackId: action.trackId,
      action: "reorder",
      before: findClip(currentProject(previous), action.clipId)?.track.id,
      after: action.trackId,
    };
  }

  if (action.type === "deleteSelected") {
    const removed = previous.selection.clipIds
      .map((id) => findClip(currentProject(previous), id)?.clip)
      .filter(Boolean)
      .map((clip) => snapshotClip(clip ?? null));
    return {
      ...base,
      action: "remove",
      before: removed,
      after: null,
      clipId: previous.selection.clipIds[0],
    };
  }

  if (action.type === "addClip") {
    return {
      ...base,
      clipId: action.clip.id,
      trackId: action.trackId,
      action: "add",
      after: snapshotClip(action.clip),
    };
  }

  if (action.type === "updateTrack") {
    return {
      ...base,
      trackId: action.trackId,
      action: "property_change",
      before: previous.history.present.tracks.find(
        (t) => t.id === action.trackId,
      ),
      after: action.patch,
    };
  }

  const mapped = ACTION_TO_EDIT[action.type];
  if (!mapped) return null;

  return {
    ...base,
    action: mapped,
    clipId: next.selection.clipIds[0],
  };
}

/** The fields worth keeping. A whole clip in every event bloats the log. */
function snapshotClip(
  clip: import("@/shared/types/video-editor").EditorClip | null,
) {
  if (!clip) return null;
  return {
    id: clip.id,
    kind: clip.kind,
    assetId: clip.assetId ?? null,
    startMs: clip.startMs,
    durationMs: clip.durationMs,
    text: clip.text?.text ?? null,
    transform: clip.transform ?? null,
    audio: clip.audio ?? null,
    transitionInMs: clip.transitionInMs ?? null,
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * Session lifecycle
 * ══════════════════════════════════════════════════════════════════════════ */

export function createSession(opts: {
  readonly id: string;
  readonly projectId: string;
  readonly generatedProjectSnapshot: EditorProject;
  readonly generatedBy?: string;
  readonly startedAt: string;
  readonly scope?: EditSession["scope"];
}): EditSession {
  return {
    id: opts.id,
    projectId: opts.projectId,
    generatedBy: opts.generatedBy,
    generatedProjectSnapshot: opts.generatedProjectSnapshot,
    events: [],
    startedAt: opts.startedAt,
    scope: opts.scope ?? {},
  };
}

export function appendEvent(
  session: EditSession,
  event: HumanEditEvent,
): EditSession {
  return { ...session, events: [...session.events, event] };
}

/**
 * Approve.
 *
 * The generated snapshot is carried through untouched — this returns a NEW
 * session object and never mutates, so there is no code path on which the
 * control condition can be lost.
 */
export function approveSession(
  session: EditSession,
  approvedProjectSnapshot: EditorProject,
  approvedAt: string,
): EditSession {
  return { ...session, approvedProjectSnapshot, approvedAt };
}

/* ══════════════════════════════════════════════════════════════════════════
 * Storage
 * ══════════════════════════════════════════════════════════════════════════ */

const SESSION_KEY = "altair.editor.sessions";
const SESSION_VERSION = 1;

type StoredSessions = {
  readonly v: number;
  readonly sessions: readonly EditSession[];
};

/**
 * Sessions accumulate; the project draft does not. This is a different store
 * from `persistence.ts` on purpose — losing an autosave costs one edit, losing
 * the session log costs every piece of evidence collected so far, so they must
 * not share a key that one of them might clear.
 */
export function loadSessions(): EditSession[] {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredSessions;
    if (parsed?.v !== SESSION_VERSION || !Array.isArray(parsed.sessions)) {
      return [];
    }
    return parsed.sessions;
  } catch {
    return [];
  }
}

export function saveSessions(sessions: readonly EditSession[]): boolean {
  try {
    const payload: StoredSessions = { v: SESSION_VERSION, sessions };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/** Adds or replaces one session by id, newest last. */
export function upsertSession(
  sessions: readonly EditSession[],
  session: EditSession,
): EditSession[] {
  const without = sessions.filter((s) => s.id !== session.id);
  return [...without, session];
}
