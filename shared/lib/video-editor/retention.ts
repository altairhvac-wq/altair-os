/**
 * Retention across sessions — the one number that says whether any of this
 * works.
 *
 * ==================== WHY A SECOND MODULE AND NOT THE SCORECARD ====================
 * `scorecard.ts` answers "how much did I change THIS cut?" and is shown once,
 * at approval. That is a fact about one afternoon. It cannot answer the
 * question the whole system exists for — *is the bot getting better?* — because
 * that question is about a sequence, and a sequence needs every session.
 *
 * ==================== TWO RETENTION RATES, NOT ONE ====================
 * Phase 4 made a second one measurable, and conflating them would hide the
 * thing worth knowing:
 *
 *   - CUT retention: how many generated clips survived untouched. It moves when
 *     the operator retimes, reorders or deletes — it is about PACING.
 *   - VISUAL retention: of the beats where the bot actually chose a library
 *     asset, how many kept that choice. It is about TASTE, and it is only
 *     meaningful on curated drafts.
 *
 * A bot that times well and picks badly and a bot that picks well and times
 * badly produce the same single number and need opposite corrections.
 *
 * ==================== IT REFUSES TO CLAIM A TREND ====================
 * Two sessions make a line, and a line through two points is not a trend — it
 * is an anecdote with a slope. `trendOf` returns `null` below
 * `MIN_SESSIONS_FOR_TREND`, and the UI is required to say "not enough evidence"
 * rather than draw an arrow. The whole learning system is built on counting
 * evidence in sessions rather than events precisely so one operator's afternoon
 * cannot become policy; the same discipline applies to reporting.
 */

import type { EditSession } from "@/shared/types/edit-learning";
import { diffEditorProjects } from "./diff";
import { isVisualTrackKind, type EditorProject } from "@/shared/types/video-editor";

/**
 * Below this, no trend is reported at all.
 *
 * Four, not the preference system's five: a trend is a weaker claim than a
 * behavioural rule, and it is SHOWN to a human rather than acted on by an
 * agent. It still has to be more than a pair.
 */
export const MIN_SESSIONS_FOR_TREND = 4;

/** How much a rate has to move before it is called a direction and not noise. */
export const TREND_NOISE_FLOOR = 0.05;

export type RetentionPoint = {
  readonly sessionId: string;
  readonly projectId: string;
  readonly approvedAt: string;
  readonly scope: EditSession["scope"];
  readonly generatedBy: string | null;
  /** 0..1 — generated clips that survived untouched. */
  readonly cutRetention: number;
  /**
   * 0..1 of the beats the bot actually chose an asset for, or `null` when it
   * chose none. Null is not zero: a plan with no curated visuals has nothing to
   * retain, and averaging it in as 0 would make an uncurated draft look like a
   * rejected one.
   */
  readonly visualRetention: number | null;
  readonly clipsInDraft: number;
  readonly assetsChosen: number;
  readonly assetsReplaced: number;
  readonly totalChanges: number;
};

function countChosenAssets(project: EditorProject): number {
  let n = 0;
  for (const track of project.tracks) {
    if (!isVisualTrackKind(track.kind)) continue;
    for (const clip of track.clips) {
      if (clip.assetId !== undefined && clip.assetId !== "") n += 1;
    }
  }
  return n;
}

/**
 * One point per approved session, oldest first.
 *
 * Sessions with no approval are skipped rather than counted as zero retention:
 * an edit in progress is not a rejection, and treating it as one would make the
 * number fall every time somebody opened a draft and went to lunch.
 */
export function retentionPoints(
  sessions: readonly EditSession[],
): RetentionPoint[] {
  const points: RetentionPoint[] = [];

  for (const session of sessions) {
    const approved = session.approvedProjectSnapshot;
    if (approved === undefined || session.approvedAt === undefined) continue;

    const generated = session.generatedProjectSnapshot;
    const diff = diffEditorProjects(generated, approved);
    const summary = diff.summary;

    const assetsChosen = countChosenAssets(generated);
    points.push({
      sessionId: session.id,
      projectId: session.projectId,
      approvedAt: session.approvedAt,
      scope: session.scope,
      generatedBy: session.generatedBy ?? null,
      cutRetention:
        summary.clipsInDraft === 0
          ? 1
          : summary.clipsUnchanged / summary.clipsInDraft,
      visualRetention:
        assetsChosen === 0
          ? null
          : Math.max(0, assetsChosen - summary.assetsReplaced) / assetsChosen,
      clipsInDraft: summary.clipsInDraft,
      assetsChosen,
      assetsReplaced: summary.assetsReplaced,
      totalChanges: summary.totalChanges,
    });
  }

  // Chronological, because the whole point is the direction of travel.
  return points.sort((a, b) => a.approvedAt.localeCompare(b.approvedAt));
}

export type Trend = {
  /** Mean of the first half. */
  readonly earlier: number;
  /** Mean of the most recent half. */
  readonly recent: number;
  readonly direction: "improving" | "declining" | "flat";
  readonly sessions: number;
};

/**
 * Halves, not a regression line.
 *
 * A least-squares slope over five noisy points reads as precision the data does
 * not have, and nobody can check it by looking. "The first three averaged 61%,
 * the last three averaged 78%" is a claim an operator can verify by opening
 * three drafts — which is the only kind of claim worth putting on a panel.
 */
export function trendOf(values: readonly number[]): Trend | null {
  if (values.length < MIN_SESSIONS_FOR_TREND) return null;
  const mid = Math.floor(values.length / 2);
  const mean = (list: readonly number[]) =>
    list.reduce((sum, value) => sum + value, 0) / list.length;
  const earlier = mean(values.slice(0, mid));
  const recent = mean(values.slice(values.length - mid));
  const delta = recent - earlier;
  return {
    earlier,
    recent,
    direction:
      Math.abs(delta) < TREND_NOISE_FLOOR
        ? "flat"
        : delta > 0
          ? "improving"
          : "declining",
    sessions: values.length,
  };
}

export type RetentionReport = {
  readonly points: readonly RetentionPoint[];
  /** Mean cut retention across every approved session. */
  readonly cutRetention: number | null;
  /** Mean visual retention across sessions that had a curated visual. */
  readonly visualRetention: number | null;
  /** How many approved sessions carried curated visuals at all. */
  readonly curatedSessions: number;
  readonly cutTrend: Trend | null;
  readonly visualTrend: Trend | null;
  /** Assets the bot chose, and how many an operator replaced, in total. */
  readonly assets: { readonly chosen: number; readonly replaced: number };
};

export function buildRetentionReport(
  sessions: readonly EditSession[],
): RetentionReport {
  const points = retentionPoints(sessions);
  const mean = (list: readonly number[]) =>
    list.length === 0
      ? null
      : list.reduce((sum, value) => sum + value, 0) / list.length;

  const cuts = points.map((point) => point.cutRetention);
  const visuals = points
    .map((point) => point.visualRetention)
    .filter((value): value is number => value !== null);

  return {
    points,
    cutRetention: mean(cuts),
    visualRetention: mean(visuals),
    curatedSessions: visuals.length,
    cutTrend: trendOf(cuts),
    visualTrend: trendOf(visuals),
    assets: {
      chosen: points.reduce((sum, point) => sum + point.assetsChosen, 0),
      replaced: points.reduce((sum, point) => sum + point.assetsReplaced, 0),
    },
  };
}

/** Restrict a report to one scope key, so formats do not average together. */
export function filterByScope(
  sessions: readonly EditSession[],
  scope: { readonly series?: string; readonly format?: string; readonly topic?: string },
): EditSession[] {
  return sessions.filter((session) => {
    if (scope.series !== undefined && session.scope.series !== scope.series) return false;
    if (scope.format !== undefined && session.scope.format !== scope.format) return false;
    if (scope.topic !== undefined && session.scope.topic !== scope.topic) return false;
    return true;
  });
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * The report in words, including the refusal.
 *
 * Deliberately returns the honest-absence sentence rather than an empty string,
 * so a caller cannot render a blank panel and leave an operator wondering
 * whether the number is zero or unknown.
 */
export function describeRetention(report: RetentionReport): string {
  if (report.points.length === 0) {
    return "No approved sessions yet — nothing to measure.";
  }

  const parts: string[] = [];
  if (report.cutRetention !== null) {
    parts.push(
      `${percent(report.cutRetention)} of the generated cut kept, across ${String(report.points.length)} approved session${report.points.length === 1 ? "" : "s"}`,
    );
  }
  if (report.visualRetention !== null) {
    parts.push(
      `${percent(report.visualRetention)} of chosen shots kept (${String(report.assets.replaced)} of ${String(report.assets.chosen)} swapped)`,
    );
  } else if (report.points.length > 0) {
    parts.push("no session has carried curated visuals yet");
  }
  return parts.join("; ") + ".";
}

/** A trend in words, or the reason there is none. */
export function describeTrend(
  trend: Trend | null,
  sessions: number,
  what: string,
): string {
  if (trend === null) {
    const need = MIN_SESSIONS_FOR_TREND - sessions;
    return need > 0
      ? `${what}: ${String(need)} more approved session${need === 1 ? "" : "s"} before a trend means anything.`
      : `${what}: not enough evidence for a trend.`;
  }
  const verb =
    trend.direction === "improving"
      ? "climbing"
      : trend.direction === "declining"
        ? "falling"
        : "flat";
  return `${what}: ${verb} — ${percent(trend.earlier)} → ${percent(trend.recent)} across ${String(trend.sessions)} sessions.`;
}
