import type { DashboardData } from "@/shared/types/dashboard";
import type {
  OperationalHealthAreaScore,
  OperationalHealthTrend,
} from "@/shared/types/operational-health-report";
import type { QueueResolutionTrendSummary } from "@/shared/types/queue-resolution-trends";

export type OperationalMomentumDataQuality = "full" | "limited";

export type OperationalMomentumAreaMetric = {
  label: string;
  score: number;
  detail?: string;
};

export type OperationalMomentumQueueTrendMetric = {
  direction: QueueResolutionTrendSummary["direction"];
  headline: string;
  detail: string;
  weekOverWeekDelta: number;
};

export type OperationalMomentumSnapshot = {
  dataQuality: OperationalMomentumDataQuality;
  headline: string;
  statusLabel: string;
  explanation: string;
  recommendedAction: string;
  primaryHref: string;
  metrics: {
    operationalHealthScore: number;
    operationalHealthLabel: string;
    trendDirection: OperationalHealthTrend;
    strongestArea: OperationalMomentumAreaMetric | null;
    weakestArea: OperationalMomentumAreaMetric | null;
    improvingArea: OperationalMomentumAreaMetric | null;
    decliningArea: OperationalMomentumAreaMetric | null;
    queueResolutionTrend: OperationalMomentumQueueTrendMetric | null;
    invoicingBacklogCount: number | null;
    stalledJobsCount: number | null;
  };
  limitations: string[];
};

export type OperationalMomentumInput = Pick<
  DashboardData,
  | "operationalHealth"
  | "officeReviewQueue"
  | "operationalInsights"
  | "completedWorkAwaitingInvoicing"
  | "stalledJobs"
>;

function findAreaScore(
  areaScores: OperationalHealthAreaScore[],
  id: OperationalHealthAreaScore["id"],
): OperationalHealthAreaScore | undefined {
  return areaScores.find((area) => area.id === id);
}

function hasCleanupResolutionHistory(trend: QueueResolutionTrendSummary): boolean {
  return (
    trend.resolvedThisWeek > 0 ||
    trend.resolvedLastWeek > 0 ||
    trend.rollingSevenDayAverage > 0
  );
}

function resolveDataQuality(input: OperationalMomentumInput): OperationalMomentumDataQuality {
  const queueTrend = input.officeReviewQueue.summary.resolutionTrend;
  const insightsTrend =
    input.operationalInsights.sections.completedWorkReview.resolutionTrend;

  if (
    hasCleanupResolutionHistory(queueTrend) ||
    hasCleanupResolutionHistory(insightsTrend)
  ) {
    return "full";
  }

  return "limited";
}

function resolveHeadline(
  trend: OperationalHealthTrend,
  dataQuality: OperationalMomentumDataQuality,
): string {
  if (dataQuality === "limited" && trend === "stable") {
    return "Not enough trend data yet";
  }

  switch (trend) {
    case "improving":
      return "Operations are improving";
    case "declining":
      return "Operations are under pressure";
    case "stable":
      return "Operations are stable";
  }
}

function resolveStatusLabel(trend: OperationalHealthTrend): string {
  switch (trend) {
    case "improving":
      return "Improving";
    case "declining":
      return "Under pressure";
    case "stable":
      return "Stable";
  }
}

function resolveImprovingArea(
  input: OperationalMomentumInput,
  trend: OperationalHealthTrend,
): OperationalMomentumAreaMetric | null {
  const queueTrend = input.officeReviewQueue.summary.resolutionTrend;
  const cleanupArea = findAreaScore(
    input.operationalHealth.areaScores,
    "cleanup_velocity",
  );

  if (queueTrend.direction === "improving" && cleanupArea) {
    return {
      label: cleanupArea.label,
      score: cleanupArea.score,
      detail: queueTrend.detail,
    };
  }

  if (trend !== "improving") {
    return null;
  }

  const strongest = input.operationalHealth.strongestOperationalArea;
  return {
    label: strongest.label,
    score: strongest.score,
    detail: `Strongest area at ${strongest.score}/100`,
  };
}

function resolveDecliningArea(
  input: OperationalMomentumInput,
  trend: OperationalHealthTrend,
): OperationalMomentumAreaMetric | null {
  const queueTrend = input.officeReviewQueue.summary.resolutionTrend;
  const cleanupArea = findAreaScore(
    input.operationalHealth.areaScores,
    "cleanup_velocity",
  );

  if (queueTrend.direction === "declining" && cleanupArea) {
    return {
      label: cleanupArea.label,
      score: cleanupArea.score,
      detail: queueTrend.detail,
    };
  }

  if (trend === "declining" || input.operationalHealth.biggestOperationalRisk.score < 70) {
    const weakest = input.operationalHealth.biggestOperationalRisk;
    return {
      label: weakest.label,
      score: weakest.score,
      detail: `Weakest area at ${weakest.score}/100`,
    };
  }

  return null;
}

function resolveExplanation(input: OperationalMomentumInput): string {
  const { operationalHealth } = input;
  const queueTrend = input.officeReviewQueue.summary.resolutionTrend;
  const dataQuality = resolveDataQuality(input);
  const parts: string[] = [
    `Operational health is ${operationalHealth.operationalHealthScore}/100 (${operationalHealth.operationalHealthLabel.toLowerCase()}).`,
  ];

  if (hasCleanupResolutionHistory(queueTrend)) {
    parts.push(queueTrend.detail);
  } else {
    parts.push(
      "Office cleanup velocity has no recent resolution history — trend direction reflects current health and backlog pressure only.",
    );
  }

  const invoicingBacklog = input.completedWorkAwaitingInvoicing.count;
  if (invoicingBacklog > 0) {
    parts.push(
      `${invoicingBacklog} completed job${invoicingBacklog === 1 ? "" : "s"} still awaiting invoicing.`,
    );
  }

  const stalledCount = input.stalledJobs.stalledCount;
  if (stalledCount > 0) {
    parts.push(
      `${stalledCount} stalled job${stalledCount === 1 ? "" : "s"} with ${input.stalledJobs.inactivityThresholdDays}+ days of inactivity.`,
    );
  }

  if (dataQuality === "limited") {
    parts.push(
      "Historical cleanup resolution data is limited — treat momentum as directional guidance, not a forecast.",
    );
  }

  return parts.join(" ");
}

function resolveRecommendedAction(input: OperationalMomentumInput): string {
  const trend = input.operationalHealth.operationalHealthTrend;
  const weakest = input.operationalHealth.biggestOperationalRisk;
  const improving = resolveImprovingArea(input, trend);

  if (trend === "declining" || weakest.score < 60) {
    return `Focus on the weakest operational area first — ${weakest.label} (${weakest.score}/100).`;
  }

  if (trend === "improving" && improving) {
    return `Keep momentum on ${improving.label} while clearing pressure in ${weakest.label}.`;
  }

  if (weakest.score < 70) {
    return `Focus on the weakest operational area first — ${weakest.label} (${weakest.score}/100).`;
  }

  return "Maintain current pace — no major operational drift detected.";
}

function resolvePrimaryHref(input: OperationalMomentumInput): string {
  const weakest = input.operationalHealth.biggestOperationalRisk;

  switch (weakest.id) {
    case "invoicing_backlog":
      return "/reports?queue=invoicing";
    case "pipeline_flow":
      return "/jobs";
    case "office_queue":
    case "workflow_readiness":
    case "cleanup_velocity":
      return "/reports?queue=attention";
    case "profitability_data":
      return "/reports";
    default:
      return "/reports";
  }
}

function resolveQueueResolutionTrendMetric(
  input: OperationalMomentumInput,
): OperationalMomentumQueueTrendMetric | null {
  const trend = input.officeReviewQueue.summary.resolutionTrend;

  if (!hasCleanupResolutionHistory(trend)) {
    return null;
  }

  return {
    direction: trend.direction,
    headline: trend.headline,
    detail: trend.detail,
    weekOverWeekDelta: trend.weekOverWeekDelta,
  };
}

function resolveLimitations(input: OperationalMomentumInput): string[] {
  const limitations = new Set<string>([
    "Read-only momentum summary from dashboard data already loaded — no new queries or forecasts.",
  ]);

  if (resolveDataQuality(input) === "limited") {
    limitations.add(
      "Limited cleanup resolution history — week-over-week office queue trend is not yet available.",
    );
  }

  limitations.add(
    "Area scores reflect current snapshot health, not per-area historical trend lines.",
  );

  if (input.stalledJobs.stalledCount > 0) {
    limitations.add(
      "Stalled job count is a current snapshot only — no stalled-job trend series on the dashboard.",
    );
  }

  return [...limitations];
}

/**
 * Derives a deterministic operational momentum snapshot from dashboard rollups
 * already loaded by getDashboardData — no extra fetches or workflow side effects.
 */
export function buildOperationalMomentumSnapshot(
  input: OperationalMomentumInput,
): OperationalMomentumSnapshot {
  const { operationalHealth } = input;
  const dataQuality = resolveDataQuality(input);
  const trend = operationalHealth.operationalHealthTrend;
  const strongest = operationalHealth.strongestOperationalArea;
  const weakest = operationalHealth.biggestOperationalRisk;

  return {
    dataQuality,
    headline: resolveHeadline(trend, dataQuality),
    statusLabel: resolveStatusLabel(trend),
    explanation: resolveExplanation(input),
    recommendedAction: resolveRecommendedAction(input),
    primaryHref: resolvePrimaryHref(input),
    metrics: {
      operationalHealthScore: operationalHealth.operationalHealthScore,
      operationalHealthLabel: operationalHealth.operationalHealthLabel,
      trendDirection: trend,
      strongestArea: {
        label: strongest.label,
        score: strongest.score,
      },
      weakestArea: {
        label: weakest.label,
        score: weakest.score,
      },
      improvingArea: resolveImprovingArea(input, trend),
      decliningArea: resolveDecliningArea(input, trend),
      queueResolutionTrend: resolveQueueResolutionTrendMetric(input),
      invoicingBacklogCount:
        input.completedWorkAwaitingInvoicing.count > 0
          ? input.completedWorkAwaitingInvoicing.count
          : null,
      stalledJobsCount:
        input.stalledJobs.stalledCount > 0 ? input.stalledJobs.stalledCount : null,
    },
    limitations: resolveLimitations(input),
  };
}
