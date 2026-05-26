/**
 * Read-only queue resolution trend analytics derived from job_activities
 * resolution events only — no workflow or scoring side effects.
 *
 * TODO: AI operational coaching layered on resolution velocity patterns.
 * TODO: Staffing-aware trend analysis normalized by office headcount.
 * TODO: SLA-based trend scoring with business-hours-aware windows.
 * TODO: Predictive backlog growth alerts from resolution vs inflow rates.
 */

export type QueueResolutionTrendDirection = "improving" | "declining" | "stable";

export type QueueResolutionTrendCounts = {
  /** Blocker resolutions since the start of the current local week (Mon 00:00). */
  resolvedThisWeek: number;
  /** Blocker resolutions in the prior local calendar week. */
  resolvedLastWeek: number;
  /** Blocker resolutions in the trailing seven calendar days (inclusive). */
  resolvedLastSevenDays: number;
};

export type QueueResolutionTrendSummary = {
  resolvedThisWeek: number;
  resolvedLastWeek: number;
  weekOverWeekDelta: number;
  /** Mean daily resolutions over the trailing seven calendar days. */
  rollingSevenDayAverage: number;
  direction: QueueResolutionTrendDirection;
  headline: string;
  detail: string;
  limitations: readonly string[];
};

const QUEUE_RESOLUTION_TREND_LIMITATIONS: readonly string[] = [
  "Heuristic operational trend only — counts resolution activity events, not queue depth or SLA compliance.",
  "Not productivity scoring — no per-user attribution or staffing normalization.",
  "Week boundaries use local Monday 00:00; no business-hours or timezone policy yet.",
  "Rolling average is a simple 7-day mean — not weighted or seasonally adjusted.",
];

export function formatQueueResolutionTrendHeadline(
  direction: QueueResolutionTrendDirection,
): string {
  switch (direction) {
    case "improving":
      return "Office cleanup improving";
    case "declining":
      return "Backlog cleanup slowing";
    case "stable":
      return "Cleanup pace holding steady";
  }
}

export function formatQueueResolutionTrendDetail(input: {
  direction: QueueResolutionTrendDirection;
  weekOverWeekDelta: number;
  resolvedThisWeek: number;
  resolvedLastWeek: number;
  rollingSevenDayAverage: number;
}): string {
  const deltaLabel =
    input.weekOverWeekDelta > 0
      ? `+${input.weekOverWeekDelta}`
      : String(input.weekOverWeekDelta);

  const pace =
    input.direction === "improving"
      ? "faster than last week"
      : input.direction === "declining"
        ? "slower than last week"
        : "even with last week";

  const rolling =
    input.rollingSevenDayAverage > 0
      ? `${input.rollingSevenDayAverage.toFixed(1)}/day over the last 7 days`
      : "no resolutions in the last 7 days";

  return `${input.resolvedThisWeek} resolved this week vs ${input.resolvedLastWeek} last week (${deltaLabel}, ${pace}) · ${rolling}`;
}

export function resolveQueueResolutionTrendDirection(
  weekOverWeekDelta: number,
): QueueResolutionTrendDirection {
  if (weekOverWeekDelta > 0) {
    return "improving";
  }

  if (weekOverWeekDelta < 0) {
    return "declining";
  }

  return "stable";
}

/**
 * Pure builder — deterministic given resolution event counts from queries.
 */
export function buildQueueResolutionTrendSummary(
  counts: QueueResolutionTrendCounts,
): QueueResolutionTrendSummary {
  const weekOverWeekDelta = counts.resolvedThisWeek - counts.resolvedLastWeek;
  const direction = resolveQueueResolutionTrendDirection(weekOverWeekDelta);
  const rollingSevenDayAverage = counts.resolvedLastSevenDays / 7;

  return {
    resolvedThisWeek: counts.resolvedThisWeek,
    resolvedLastWeek: counts.resolvedLastWeek,
    weekOverWeekDelta,
    rollingSevenDayAverage,
    direction,
    headline: formatQueueResolutionTrendHeadline(direction),
    detail: formatQueueResolutionTrendDetail({
      direction,
      weekOverWeekDelta,
      resolvedThisWeek: counts.resolvedThisWeek,
      resolvedLastWeek: counts.resolvedLastWeek,
      rollingSevenDayAverage,
    }),
    limitations: QUEUE_RESOLUTION_TREND_LIMITATIONS,
  };
}
