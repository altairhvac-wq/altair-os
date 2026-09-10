/**
 * Undo/redo for the editor, as a stack of whole-project snapshots.
 *
 * ==================== WHY SNAPSHOTS AND NOT INVERSE COMMANDS ====================
 * The usual objection to snapshots is memory. It does not apply here: an
 * `EditorProject` is a shallow tree of plain objects, every operation in
 * `shared/types/video-editor.ts` returns a new project that structurally shares
 * every untouched track, and a two-minute episode is a few hundred clips. A
 * hundred snapshots of that is smaller than one preview frame.
 *
 * What inverse commands would buy is memory; what they cost is a second
 * implementation of every edit, written backwards, which is where undo bugs
 * live. Snapshots cannot desynchronise from the forward operation because
 * there is no backward operation.
 *
 * ==================== COALESCING IS THE WHOLE PROBLEM ====================
 * A drag emits a commit per pointermove. Without coalescing, undo after moving
 * one clip would step back through ~200 intermediate positions, which reads as
 * broken. Consecutive commits sharing a `coalesceKey` REPLACE the top entry
 * instead of pushing, so one gesture is one undo — and the key includes the
 * clip id, so dragging A then B remains two.
 *
 * The `past` array holds states BEFORE each committed change, `present` is
 * current, and `future` is what redo replays. A fresh commit clears `future`,
 * which is the standard rule and the one users actually expect: branching off
 * an undone edit discards the branch you left.
 */

export type HistoryEntry<T> = {
  readonly label: string;
  readonly state: T;
  readonly coalesceKey?: string;
};

export type History<T> = {
  readonly past: readonly HistoryEntry<T>[];
  readonly present: T;
  readonly future: readonly HistoryEntry<T>[];
  /** Label of the change that produced `present`, for the undo tooltip. */
  readonly lastLabel: string | null;
  /** Set while a gesture is coalescing; cleared by `sealHistory`. */
  readonly openCoalesceKey: string | null;
};

/**
 * Deep enough that an operator can walk back out of a bad ten minutes, small
 * enough that the array never becomes the reason the tab is slow.
 */
export const HISTORY_LIMIT = 100;

export function createHistory<T>(present: T): History<T> {
  return {
    past: [],
    present,
    future: [],
    lastLabel: null,
    openCoalesceKey: null,
  };
}

/**
 * Record a new state.
 *
 * `coalesceKey` folds this commit into the previous one when they match AND
 * the previous one is still open — see `sealHistory`. A commit with no key
 * always pushes.
 */
export function commit<T>(
  history: History<T>,
  next: T,
  label: string,
  coalesceKey?: string,
): History<T> {
  if (Object.is(next, history.present)) return history;

  const coalescing =
    coalesceKey !== undefined && history.openCoalesceKey === coalesceKey;

  if (coalescing) {
    // Keep the ORIGINAL pre-gesture state in `past`; only advance `present`.
    // Pushing here is what would make one drag into two hundred undo steps.
    return {
      ...history,
      present: next,
      future: [],
      lastLabel: label,
    };
  }

  const past = [
    ...history.past,
    { label, state: history.present, coalesceKey },
  ].slice(-HISTORY_LIMIT);

  return {
    past,
    present: next,
    future: [],
    lastLabel: label,
    openCoalesceKey: coalesceKey ?? null,
  };
}

/**
 * End the current gesture. Call on pointerup — after this, the next commit
 * pushes a new entry even if it carries the same key, so a second drag of the
 * same clip is its own undo step.
 */
export function sealHistory<T>(history: History<T>): History<T> {
  if (history.openCoalesceKey === null) return history;
  return { ...history, openCoalesceKey: null };
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0;
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past[history.past.length - 1];
  if (!previous) return history;
  return {
    past: history.past.slice(0, -1),
    present: previous.state,
    future: [
      { label: previous.label, state: history.present },
      ...history.future,
    ].slice(0, HISTORY_LIMIT),
    lastLabel: previous.label,
    openCoalesceKey: null,
  };
}

export function redo<T>(history: History<T>): History<T> {
  const next = history.future[0];
  if (!next) return history;
  return {
    past: [
      ...history.past,
      { label: next.label, state: history.present },
    ].slice(-HISTORY_LIMIT),
    present: next.state,
    future: history.future.slice(1),
    lastLabel: next.label,
    openCoalesceKey: null,
  };
}

/** What the undo control should say it will undo, or null when it is inert. */
export function undoLabel<T>(history: History<T>): string | null {
  const previous = history.past[history.past.length - 1];
  return previous ? previous.label : null;
}

export function redoLabel<T>(history: History<T>): string | null {
  return history.future[0]?.label ?? null;
}
