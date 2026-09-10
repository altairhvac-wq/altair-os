/**
 * Turns edit sessions into statistics, and statistics into candidate
 * preferences the Director/Editor agents may read.
 *
 * ==================== ONE EDIT IS DATA, NOT TRUTH ====================
 * The failure this module is built against is overfitting to a single
 * opinionated afternoon. So nothing here is derived from one session: every
 * preference carries `evidenceCount` (SESSIONS, not events — one person
 * shortening forty clips in one sitting is one opinion, not forty) and a
 * confidence that combines how CONSISTENT the signal is with how MUCH of it
 * there is. Both must clear a configurable threshold before an agent is
 * allowed to act on it.
 *
 * ==================== SCOPE KEEPS FORMATS APART ====================
 * A 30-second short and a five-minute explainer have no business sharing a
 * pacing rule. Preferences are computed per scope and the caller says which
 * scope it wants; a global preference is the fallback, not the default.
 *
 * ==================== AGENTS READ PREFERENCES, NOT EVENTS ====================
 * `derivePreferences` is the whole public contract for agent consumption. Raw
 * events and raw diffs stay behind it, because an agent reading raw events
 * would be re-deriving these statistics itself — differently, probably wrongly,
 * and with no threshold.
 */

import {
  isVisualTrackKind,
  projectDurationMs,
  type EditorProject,
} from "@/shared/types/video-editor";
import {
  DEFAULT_LEARNING_THRESHOLDS,
  type EditSession,
  type EditingPreference,
  type LearningThresholds,
  type PreferenceScope,
  type ProjectDiff,
} from "@/shared/types/edit-learning";
import { diffEditorProjects } from "./diff";

/* ══════════════════════════════════════════════════════════════════════════
 * Statistics
 * ══════════════════════════════════════════════════════════════════════════ */

/** Median, not mean: one 40-second title card should not move the centre. */
export function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/** Durations of every still/visual clip in a project. */
export function visualDurations(project: EditorProject): number[] {
  const out: number[] = [];
  for (const track of project.tracks) {
    if (!isVisualTrackKind(track.kind)) continue;
    for (const clip of track.clips) out.push(clip.durationMs);
  }
  return out;
}

/** Visual cuts per minute — the pacing number an editor actually feels. */
export function visualChangesPerMinute(project: EditorProject): number {
  const durationMs = projectDurationMs(project);
  if (durationMs <= 0) return 0;
  let count = 0;
  for (const track of project.tracks) {
    if (!isVisualTrackKind(track.kind)) continue;
    count += track.clips.length;
  }
  return Number(((count / durationMs) * 60_000).toFixed(2));
}

export type SessionStats = {
  readonly sessionId: string;
  readonly projectId: string;
  readonly diff: ProjectDiff;
  readonly botMedianVisualMs: number;
  readonly humanMedianVisualMs: number;
  readonly botChangesPerMinute: number;
  readonly humanChangesPerMinute: number;
  /** 0..1 — of the clips the bot produced, how many survived untouched. */
  readonly unchangedRatio: number;
  readonly openingVisualReplaced: boolean;
  readonly durationDeltaMs: number;
  readonly scope: EditSession["scope"];
};

/** One session's numbers. Returns null for a session that was never approved. */
export function summariseSession(session: EditSession): SessionStats | null {
  if (!session.approvedProjectSnapshot) return null;

  const diff = diffEditorProjects(
    session.generatedProjectSnapshot,
    session.approvedProjectSnapshot,
  );

  const botDurations = visualDurations(session.generatedProjectSnapshot);
  const humanDurations = visualDurations(session.approvedProjectSnapshot);

  return {
    sessionId: session.id,
    projectId: session.projectId,
    diff,
    botMedianVisualMs: median(botDurations),
    humanMedianVisualMs: median(humanDurations),
    botChangesPerMinute: visualChangesPerMinute(session.generatedProjectSnapshot),
    humanChangesPerMinute: visualChangesPerMinute(
      session.approvedProjectSnapshot,
    ),
    unchangedRatio:
      diff.summary.clipsInDraft === 0
        ? 1
        : Number(
            (diff.summary.clipsUnchanged / diff.summary.clipsInDraft).toFixed(3),
          ),
    openingVisualReplaced: diff.summary.openingVisualReplaced,
    durationDeltaMs: diff.summary.durationDeltaMs,
    scope: session.scope,
  };
}

export type AggregateStats = {
  readonly sessionCount: number;
  readonly botMedianVisualMs: number;
  readonly humanMedianVisualMs: number;
  readonly botChangesPerMinute: number;
  readonly humanChangesPerMinute: number;
  readonly unchangedRatio: number;
  readonly openingReplacementRate: number;
  readonly shortenRate: number;
  readonly captionEditRate: number;
  readonly textEditRate: number;
  readonly overlayAddRate: number;
  readonly medianDurationDeltaMs: number;
};

export function aggregate(stats: readonly SessionStats[]): AggregateStats {
  if (stats.length === 0) {
    return {
      sessionCount: 0,
      botMedianVisualMs: 0,
      humanMedianVisualMs: 0,
      botChangesPerMinute: 0,
      humanChangesPerMinute: 0,
      unchangedRatio: 0,
      openingReplacementRate: 0,
      shortenRate: 0,
      captionEditRate: 0,
      textEditRate: 0,
      overlayAddRate: 0,
      medianDurationDeltaMs: 0,
    };
  }

  const rate = (predicate: (s: SessionStats) => boolean) =>
    Number(
      (stats.filter(predicate).length / stats.length).toFixed(3),
    );

  return {
    sessionCount: stats.length,
    botMedianVisualMs: median(stats.map((s) => s.botMedianVisualMs)),
    humanMedianVisualMs: median(stats.map((s) => s.humanMedianVisualMs)),
    botChangesPerMinute: Number(
      (
        stats.reduce((n, s) => n + s.botChangesPerMinute, 0) / stats.length
      ).toFixed(2),
    ),
    humanChangesPerMinute: Number(
      (
        stats.reduce((n, s) => n + s.humanChangesPerMinute, 0) / stats.length
      ).toFixed(2),
    ),
    unchangedRatio: Number(
      (
        stats.reduce((n, s) => n + s.unchangedRatio, 0) / stats.length
      ).toFixed(3),
    ),
    openingReplacementRate: rate((s) => s.openingVisualReplaced),
    shortenRate: rate((s) => s.diff.summary.clipsShortened > 0),
    captionEditRate: rate((s) => s.diff.summary.captionEdits > 0),
    textEditRate: rate((s) => s.diff.summary.textEdits > 0),
    overlayAddRate: rate((s) => s.diff.summary.clipsAdded > 0),
    medianDurationDeltaMs: median(stats.map((s) => s.durationDeltaMs)),
  };
}

/* ══════════════════════════════════════════════════════════════════════════
 * Preferences
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * Confidence = how consistent × how much.
 *
 * `consistency` is the share of sessions pointing the same way (0.5 is a coin
 * flip, 1.0 is unanimous), rescaled so that a coin flip scores zero rather than
 * a half. `volume` saturates at twice the minimum session count, so the
 * fifteenth session adds less than the fifth — which is the correct shape:
 * more evidence should raise confidence with diminishing returns, not linearly
 * forever.
 */
export function confidenceFrom(
  agreeingSessions: number,
  totalSessions: number,
  minSessions: number,
): number {
  if (totalSessions === 0) return 0;
  const consistency = Math.max(
    0,
    (agreeingSessions / totalSessions - 0.5) * 2,
  );
  const volume = Math.min(1, totalSessions / (minSessions * 2));
  return Number((consistency * volume).toFixed(3));
}

export function derivePreferences(
  sessions: readonly EditSession[],
  opts: {
    readonly scope?: PreferenceScope;
    readonly scopeValue?: string;
    readonly thresholds?: LearningThresholds;
  } = {},
): EditingPreference[] {
  const scope = opts.scope ?? "global";
  const thresholds = opts.thresholds ?? DEFAULT_LEARNING_THRESHOLDS;

  const inScope = sessions.filter((session) => {
    if (scope === "global") return true;
    if (scope === "series") return session.scope.series === opts.scopeValue;
    if (scope === "format") return session.scope.format === opts.scopeValue;
    return session.scope.topic === opts.scopeValue;
  });

  const stats = inScope
    .map(summariseSession)
    .filter((s): s is SessionStats => s !== null);

  if (stats.length === 0) return [];

  const totals = aggregate(stats);
  const candidates: EditingPreference[] = [];

  /* ── Static visual duration ───────────────────────────────────────────── */
  const shortenedSessions = stats.filter(
    (s) => s.humanMedianVisualMs < s.botMedianVisualMs,
  ).length;
  const lengthenedSessions = stats.filter(
    (s) => s.humanMedianVisualMs > s.botMedianVisualMs,
  ).length;

  if (shortenedSessions !== lengthenedSessions) {
    const agreeing = Math.max(shortenedSessions, lengthenedSessions);
    const shorter = shortenedSessions > lengthenedSessions;
    const target = totals.humanMedianVisualMs;
    // A range, not a point. A single number invites the agent to produce
    // identical durations, which is the one thing no editor ever does.
    const low = Math.round((target * 0.85) / 100) / 10;
    const high = Math.round((target * 1.15) / 100) / 10;
    candidates.push({
      key: "static_visual_duration",
      evidenceCount: stats.length,
      confidence: confidenceFrom(agreeing, stats.length, thresholds.minSessions),
      scope,
      scopeValue: opts.scopeValue,
      recommendation: `Humans consistently ${shorter ? "shorten" : "lengthen"} static visuals. Prefer ${low}–${high} second stills.`,
      evidence: {
        botMedianMs: totals.botMedianVisualMs,
        humanMedianMs: totals.humanMedianVisualMs,
        sessionsShorter: shortenedSessions,
        sessionsLonger: lengthenedSessions,
      },
    });
  }

  /* ── Opening visual ───────────────────────────────────────────────────── */
  const openingReplaced = stats.filter((s) => s.openingVisualReplaced).length;
  if (openingReplaced > 0) {
    candidates.push({
      key: "opening_visual_replacement",
      evidenceCount: stats.length,
      confidence: confidenceFrom(
        openingReplaced,
        stats.length,
        thresholds.minSessions,
      ),
      scope,
      scopeValue: opts.scopeValue,
      recommendation: `The opening visual is replaced in ${Math.round(totals.openingReplacementRate * 100)}% of approvals. Treat the first shot as the weakest first-pass decision and generate alternatives.`,
      evidence: {
        replacedSessions: openingReplaced,
        totalSessions: stats.length,
        rate: totals.openingReplacementRate,
      },
    });
  }

  /* ── Caption accuracy ─────────────────────────────────────────────────── */
  const captionSessions = stats.filter(
    (s) => s.diff.summary.captionEdits > 0,
  ).length;
  if (captionSessions > 0) {
    candidates.push({
      key: "caption_correction",
      evidenceCount: stats.length,
      confidence: confidenceFrom(
        captionSessions,
        stats.length,
        thresholds.minSessions,
      ),
      scope,
      scopeValue: opts.scopeValue,
      recommendation: `Captions are corrected in ${Math.round(totals.captionEditRate * 100)}% of approvals. Route caption text through a verification pass before it reaches a draft.`,
      evidence: {
        sessionsWithCaptionEdits: captionSessions,
        totalSessions: stats.length,
        rate: totals.captionEditRate,
      },
    });
  }

  /* ── Runtime ──────────────────────────────────────────────────────────── */
  const trimmedSessions = stats.filter((s) => s.durationDeltaMs < 0).length;
  const grownSessions = stats.filter((s) => s.durationDeltaMs > 0).length;
  if (trimmedSessions !== grownSessions) {
    const agreeing = Math.max(trimmedSessions, grownSessions);
    const shorter = trimmedSessions > grownSessions;
    candidates.push({
      key: "total_runtime",
      evidenceCount: stats.length,
      confidence: confidenceFrom(agreeing, stats.length, thresholds.minSessions),
      scope,
      scopeValue: opts.scopeValue,
      recommendation: `Approved cuts run ${shorter ? "shorter" : "longer"} than drafts by a median of ${Math.abs(Math.round(totals.medianDurationDeltaMs / 100) / 10)}s. Aim first drafts ${shorter ? "tighter" : "longer"}.`,
      evidence: {
        medianDeltaMs: totals.medianDurationDeltaMs,
        sessionsShorter: trimmedSessions,
        sessionsLonger: grownSessions,
      },
    });
  }

  /* ── Unchanged rate — the one that says the bot is doing well ─────────── */
  candidates.push({
    key: "draft_acceptance",
    evidenceCount: stats.length,
    confidence: confidenceFrom(stats.length, stats.length, thresholds.minSessions),
    scope,
    scopeValue: opts.scopeValue,
    recommendation: `${Math.round(totals.unchangedRatio * 100)}% of generated clips are approved untouched.`,
    evidence: {
      unchangedRatio: totals.unchangedRatio,
      totalSessions: stats.length,
    },
  });

  return candidates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * What an agent is allowed to act on: cleared BOTH thresholds.
 *
 * Kept separate from `derivePreferences` on purpose — an operator panel wants
 * to see the near-misses (that is how you know the system is learning), and an
 * agent must not.
 */
export function actionablePreferences(
  preferences: readonly EditingPreference[],
  thresholds: LearningThresholds = DEFAULT_LEARNING_THRESHOLDS,
): EditingPreference[] {
  return preferences.filter(
    (p) =>
      p.evidenceCount >= thresholds.minSessions &&
      p.confidence >= thresholds.minConfidence,
  );
}
