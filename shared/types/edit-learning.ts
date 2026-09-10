/**
 * How a human changed a bot's edit — captured as data the agents can learn from.
 *
 * ==================== WHY THIS IS A SEPARATE MODEL ====================
 * `EditorProject` says what the video IS. This module says what CHANGED, and
 * they are different questions with different lifetimes. A project is replaced
 * every time someone drags a clip; an edit session is written once and kept, so
 * that six months of corrections can be read back as evidence.
 *
 * ==================== THE DRAFT IS NEVER OVERWRITTEN ====================
 * A session holds BOTH snapshots. The generated draft is the control condition:
 * without it there is nothing to diff against, and the entire learning
 * proposition collapses into "here is a video someone made". Approval writes
 * the approved snapshot alongside it and never on top of it.
 *
 * ==================== DIFFS ARE COMPUTED, NOT INFERRED ====================
 * Every difference below is arithmetic a computer can do exactly — a duration
 * went from 6200ms to 3400ms, an asset id changed, a caption's text differs.
 * None of it is a judgement call, so none of it goes to a model. What a model
 * might eventually be good for is naming a PATTERN across hundreds of these;
 * it has no business calculating a subtraction.
 */

import type { EditorProject } from "./video-editor";

/* ══════════════════════════════════════════════════════════════════════════
 * Events — the live record, captured as the operator works
 * ══════════════════════════════════════════════════════════════════════════ */

export const HUMAN_EDIT_ACTIONS = [
  "add",
  "remove",
  "move",
  "trim",
  "split",
  "replace_asset",
  "reorder",
  "transform",
  "text_edit",
  "caption_edit",
  "volume",
  "transition",
  "animation",
  "property_change",
] as const;

export type HumanEditAction = (typeof HUMAN_EDIT_ACTIONS)[number];

export type HumanEditEvent = {
  readonly id: string;
  readonly projectId: string;
  readonly clipId?: string;
  readonly trackId?: string;
  readonly action: HumanEditAction;
  readonly before?: unknown;
  readonly after?: unknown;
  /** Milliseconds since the session started, not a wall clock. */
  readonly timestampMs: number;
  readonly source: "human";
};

/* ══════════════════════════════════════════════════════════════════════════
 * Sessions — one per opened draft
 * ══════════════════════════════════════════════════════════════════════════ */

export type EditSession = {
  readonly id: string;
  readonly projectId: string;
  /** Which agent produced the draft, when one did. */
  readonly generatedBy?: string;
  /** The control condition. Written once, never replaced. */
  readonly generatedProjectSnapshot: EditorProject;
  /** Written on approval, alongside — never over — the draft. */
  readonly approvedProjectSnapshot?: EditorProject;
  readonly events: readonly HumanEditEvent[];
  readonly startedAt: string;
  readonly approvedAt?: string;
  /** Free-form grouping so pacing rules do not leak between formats. */
  readonly scope: {
    readonly series?: string;
    readonly format?: string;
    readonly topic?: string;
  };
};

/* ══════════════════════════════════════════════════════════════════════════
 * Diff — the deterministic comparison
 * ══════════════════════════════════════════════════════════════════════════ */

export type DiffEntry =
  | {
      readonly type: "clip_duration_changed";
      readonly clipId: string;
      readonly trackId: string;
      readonly beforeMs: number;
      readonly afterMs: number;
      readonly deltaMs: number;
    }
  | {
      readonly type: "clip_moved";
      readonly clipId: string;
      readonly trackId: string;
      readonly beforeMs: number;
      readonly afterMs: number;
      readonly deltaMs: number;
    }
  | {
      readonly type: "clip_added";
      readonly clipId: string;
      readonly trackId: string;
      readonly kind: string;
      readonly startMs: number;
      readonly durationMs: number;
    }
  | {
      readonly type: "clip_removed";
      readonly clipId: string;
      readonly trackId: string;
      readonly kind: string;
      readonly startMs: number;
      readonly durationMs: number;
    }
  | {
      readonly type: "clip_moved_track";
      readonly clipId: string;
      readonly beforeTrackId: string;
      readonly afterTrackId: string;
    }
  | {
      readonly type: "asset_replaced";
      readonly clipId: string;
      readonly trackId: string;
      readonly before: string | null;
      readonly after: string | null;
    }
  | {
      readonly type: "text_changed";
      readonly clipId: string;
      readonly trackId: string;
      readonly before: string;
      readonly after: string;
    }
  | {
      readonly type: "caption_changed";
      readonly clipId: string;
      readonly trackId: string;
      readonly before: string;
      readonly after: string;
    }
  | {
      readonly type: "transform_changed";
      readonly clipId: string;
      readonly trackId: string;
      readonly property: string;
      readonly before: number | string | null;
      readonly after: number | string | null;
    }
  | {
      readonly type: "audio_changed";
      readonly clipId: string;
      readonly trackId: string;
      readonly property: string;
      readonly before: number | boolean | null;
      readonly after: number | boolean | null;
    }
  | {
      readonly type: "transition_changed";
      readonly clipId: string;
      readonly trackId: string;
      readonly beforeMs: number;
      readonly afterMs: number;
    }
  | {
      readonly type: "track_toggled";
      readonly trackId: string;
      readonly property: "hidden" | "muted" | "locked";
      readonly before: boolean;
      readonly after: boolean;
    }
  | {
      readonly type: "project_duration_changed";
      readonly beforeMs: number;
      readonly afterMs: number;
      readonly deltaMs: number;
    };

export type DiffSummary = {
  readonly totalChanges: number;
  readonly clipsAdded: number;
  readonly clipsRemoved: number;
  readonly clipsShortened: number;
  readonly clipsLengthened: number;
  readonly clipsMoved: number;
  readonly assetsReplaced: number;
  readonly textEdits: number;
  readonly captionEdits: number;
  readonly transformEdits: number;
  readonly audioEdits: number;
  /** Visual clips present in the draft and untouched in the approval. */
  readonly clipsUnchanged: number;
  readonly clipsInDraft: number;
  /** Net change to total runtime. */
  readonly durationDeltaMs: number;
  /** Whether the FIRST visual clip was replaced, removed or re-assetted. */
  readonly openingVisualReplaced: boolean;
};

export type ProjectDiff = {
  readonly entries: readonly DiffEntry[];
  readonly summary: DiffSummary;
};

/* ══════════════════════════════════════════════════════════════════════════
 * Preferences — what agents are allowed to read
 * ══════════════════════════════════════════════════════════════════════════ */

export type PreferenceScope = "global" | "series" | "format" | "topic";

export type EditingPreference = {
  readonly key: string;
  /** How many independent sessions support this. Not how many events. */
  readonly evidenceCount: number;
  /** 0..1. See `shared/lib/video-editor/learning.ts` for how it is derived. */
  readonly confidence: number;
  readonly scope: PreferenceScope;
  readonly scopeValue?: string;
  readonly recommendation: string;
  /** The numbers behind the recommendation, so it can be audited. */
  readonly evidence: Readonly<Record<string, number>>;
};

/**
 * Thresholds, deliberately configurable and deliberately not one number.
 *
 * A single manual edit is data, not truth. `minSessions` is what stops one
 * opinionated afternoon from becoming policy; `minConfidence` is what stops a
 * weakly-supported pattern from being applied even once it clears that bar.
 */
export type LearningThresholds = {
  readonly minSessions: number;
  readonly minConfidence: number;
};

export const DEFAULT_LEARNING_THRESHOLDS: LearningThresholds = {
  minSessions: 5,
  minConfidence: 0.7,
};
