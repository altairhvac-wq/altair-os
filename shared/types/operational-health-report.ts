import type { OfficeReviewQueueReport } from "@/shared/types/office-review-queue";
import type { QueueResolutionTrendSummary } from "@/shared/types/queue-resolution-trends";
import { buildReportSectionMeta, type ReportSectionMeta } from "@/shared/types/reports";

/**
 * Read-only heuristic operational health score composed from existing report
 * outputs — no workflow, profitability math, or queue logic side effects.
 *
 * TODO: AI operational coaching layered on contributing factors.
 * TODO: Predictive operational risk from backlog inflow vs resolution velocity.
 * TODO: Staffing-aware health scoring normalized by office headcount.
 * TODO: Benchmarking operational health scores across companies.
 * TODO: Forecasting backlog and invoicing lag from historical trends.
 */

export type OperationalHealthLabel =
  | "Excellent"
  | "Healthy"
  | "Needs attention"
  | "Operational risk";

export type OperationalHealthTrend = "improving" | "declining" | "stable";

export type OperationalHealthAreaId =
  | "office_queue"
  | "pipeline_flow"
  | "invoicing_backlog"
  | "workflow_readiness"
  | "profitability_data"
  | "cleanup_velocity";

export type OperationalHealthAreaScore = {
  id: OperationalHealthAreaId;
  label: string;
  score: number;
};

export type OperationalHealthContributingFactor = {
  id: string;
  label: string;
  impact: "positive" | "negative" | "neutral";
  detail: string;
  /** Approximate point influence on the composite score (for explainability). */
  points: number;
};

export type OperationalHealthReport = {
  operationalHealthScore: number;
  operationalHealthLabel: OperationalHealthLabel;
  operationalHealthTrend: OperationalHealthTrend;
  strongestOperationalArea: OperationalHealthAreaScore;
  biggestOperationalRisk: OperationalHealthAreaScore;
  contributingFactors: OperationalHealthContributingFactor[];
  areaScores: OperationalHealthAreaScore[];
  meta: ReportSectionMeta;
};

export type OperationalHealthReportInput = {
  criticalCount: number;
  needsAttentionCount: number;
  overdueCount: number;
  stalledCount: number;
  awaitingInvoicingCount: number;
  completedWorkReviewCount: number;
  averageReadinessScore: number;
  resolutionTrend: QueueResolutionTrendSummary;
  profitabilityWarningCount: number;
  materialCostExceedsCollectedCount?: number;
  dataIntegrityIssueCount?: number;
  criticalDataIntegrityCount?: number;
};

const OPERATIONAL_HEALTH_AREA_LABELS: Record<OperationalHealthAreaId, string> = {
  office_queue: "Office review queue",
  pipeline_flow: "Job pipeline flow",
  invoicing_backlog: "Invoicing backlog",
  workflow_readiness: "Workflow readiness",
  profitability_data: "Profitability data quality",
  cleanup_velocity: "Cleanup velocity",
};

const OPERATIONAL_HEALTH_LIMITATIONS: readonly string[] = [
  "Heuristic operational score only — not financial auditing or margin certification.",
  "Not staffing optimization — no headcount normalization or per-user attribution.",
  "Not SLA enforcement — aging buckets and thresholds are fixed heuristics.",
  "Not predictive AI — score reflects current snapshot counts and simple trend direction.",
  "Area scores are independent sub-heuristics averaged into one composite number.",
];

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function resolveOperationalHealthLabel(score: number): OperationalHealthLabel {
  if (score >= 85) {
    return "Excellent";
  }

  if (score >= 70) {
    return "Healthy";
  }

  if (score >= 50) {
    return "Needs attention";
  }

  return "Operational risk";
}

function scoreOfficeQueue(
  criticalCount: number,
  needsAttentionCount: number,
  overdueCount: number,
  criticalDataIntegrityCount: number,
): number {
  const penalty =
    criticalCount * 12 +
    needsAttentionCount * 6 +
    overdueCount * 4 +
    criticalDataIntegrityCount * 8;
  return clampScore(100 - penalty);
}

function scorePipelineFlow(stalledCount: number): number {
  return clampScore(100 - stalledCount * 10);
}

function scoreInvoicingBacklog(
  awaitingInvoicingCount: number,
  completedWorkReviewCount: number,
): number {
  const penalty = awaitingInvoicingCount * 8 + completedWorkReviewCount * 6;
  return clampScore(100 - penalty);
}

function scoreWorkflowReadiness(averageReadinessScore: number): number {
  return clampScore(averageReadinessScore);
}

function scoreProfitabilityData(
  profitabilityWarningCount: number,
  materialCostExceedsCollectedCount: number,
): number {
  const penalty =
    profitabilityWarningCount * 8 + materialCostExceedsCollectedCount * 12;
  return clampScore(100 - penalty);
}

function scoreCleanupVelocity(trend: QueueResolutionTrendSummary): number {
  const activityBase = trend.resolvedThisWeek > 0 ? 55 : 45;

  switch (trend.direction) {
    case "improving":
      return clampScore(
        activityBase + 25 + Math.max(0, trend.weekOverWeekDelta) * 2,
      );
    case "declining":
      return clampScore(
        activityBase -
          15 -
          Math.abs(Math.min(0, trend.weekOverWeekDelta)) * 3,
      );
    case "stable":
      return clampScore(
        activityBase + Math.min(15, trend.resolvedThisWeek * 2),
      );
  }
}

function resolveOperationalHealthTrend(input: {
  compositeScore: number;
  criticalCount: number;
  overdueCount: number;
  resolutionTrend: QueueResolutionTrendSummary;
}): OperationalHealthTrend {
  const backlogPressure = input.criticalCount + input.overdueCount;

  if (
    input.resolutionTrend.direction === "declining" ||
    (backlogPressure >= 5 && input.compositeScore < 60)
  ) {
    return "declining";
  }

  if (
    input.resolutionTrend.direction === "improving" &&
    input.compositeScore >= 65 &&
    backlogPressure <= 3
  ) {
    return "improving";
  }

  return "stable";
}

function buildAreaScores(input: OperationalHealthReportInput): OperationalHealthAreaScore[] {
  return [
    {
      id: "office_queue",
      label: OPERATIONAL_HEALTH_AREA_LABELS.office_queue,
      score: scoreOfficeQueue(
        input.criticalCount,
        input.needsAttentionCount,
        input.overdueCount,
        input.criticalDataIntegrityCount ?? 0,
      ),
    },
    {
      id: "pipeline_flow",
      label: OPERATIONAL_HEALTH_AREA_LABELS.pipeline_flow,
      score: scorePipelineFlow(input.stalledCount),
    },
    {
      id: "invoicing_backlog",
      label: OPERATIONAL_HEALTH_AREA_LABELS.invoicing_backlog,
      score: scoreInvoicingBacklog(
        input.awaitingInvoicingCount,
        input.completedWorkReviewCount,
      ),
    },
    {
      id: "workflow_readiness",
      label: OPERATIONAL_HEALTH_AREA_LABELS.workflow_readiness,
      score: scoreWorkflowReadiness(input.averageReadinessScore),
    },
    {
      id: "profitability_data",
      label: OPERATIONAL_HEALTH_AREA_LABELS.profitability_data,
      score: scoreProfitabilityData(
        input.profitabilityWarningCount,
        input.materialCostExceedsCollectedCount ?? 0,
      ),
    },
    {
      id: "cleanup_velocity",
      label: OPERATIONAL_HEALTH_AREA_LABELS.cleanup_velocity,
      score: scoreCleanupVelocity(input.resolutionTrend),
    },
  ];
}

function buildContributingFactors(
  input: OperationalHealthReportInput,
  areaScores: OperationalHealthAreaScore[],
): OperationalHealthContributingFactor[] {
  const factors: OperationalHealthContributingFactor[] = [];

  const dataIntegrityCount = input.dataIntegrityIssueCount ?? 0;
  const criticalDataIntegrity = input.criticalDataIntegrityCount ?? 0;

  if (input.criticalCount > 0) {
    factors.push({
      id: "critical-queue-items",
      label: "Critical queue items",
      impact: "negative",
      detail: `${input.criticalCount} critical office review item${input.criticalCount === 1 ? "" : "s"}`,
      points: -Math.min(36, input.criticalCount * 12),
    });
  }

  if (dataIntegrityCount > 0) {
    factors.push({
      id: "data-integrity-issues",
      label: "Data integrity drift",
      impact: "negative",
      detail: `${dataIntegrityCount} job${dataIntegrityCount === 1 ? "" : "s"} with dispatch, labor, billing, or workflow field mismatches${criticalDataIntegrity > 0 ? ` (${criticalDataIntegrity} critical)` : ""}`,
      points: -Math.min(24, dataIntegrityCount * 6 + criticalDataIntegrity * 4),
    });
  }

  if (input.overdueCount > 0) {
    factors.push({
      id: "overdue-queue-items",
      label: "Overdue queue aging",
      impact: "negative",
      detail: `${input.overdueCount} item${input.overdueCount === 1 ? "" : "s"} in the 7+ day overdue bucket`,
      points: -Math.min(20, input.overdueCount * 4),
    });
  }

  if (input.stalledCount > 0) {
    factors.push({
      id: "stalled-jobs",
      label: "Stalled jobs",
      impact: "negative",
      detail: `${input.stalledCount} job${input.stalledCount === 1 ? "" : "s"} with extended inactivity`,
      points: -Math.min(30, input.stalledCount * 10),
    });
  }

  if (input.awaitingInvoicingCount > 0) {
    factors.push({
      id: "awaiting-invoicing",
      label: "Completed work awaiting invoice",
      impact: "negative",
      detail: `${input.awaitingInvoicingCount} completed job${input.awaitingInvoicingCount === 1 ? "" : "s"} without invoicing`,
      points: -Math.min(24, input.awaitingInvoicingCount * 8),
    });
  }

  if (input.completedWorkReviewCount > 0) {
    factors.push({
      id: "completed-work-review",
      label: "Completed work review blockers",
      impact: "negative",
      detail: `${input.completedWorkReviewCount} completed job${input.completedWorkReviewCount === 1 ? "" : "s"} with review blockers`,
      points: -Math.min(18, input.completedWorkReviewCount * 6),
    });
  }

  if (input.profitabilityWarningCount > 0) {
    factors.push({
      id: "profitability-warnings",
      label: "Profitability data gaps",
      impact: "negative",
      detail: `${input.profitabilityWarningCount} job${input.profitabilityWarningCount === 1 ? "" : "s"} with completeness warnings`,
      points: -Math.min(16, input.profitabilityWarningCount * 8),
    });
  }

  const materialCostExceeds = input.materialCostExceedsCollectedCount ?? 0;
  if (materialCostExceeds > 0) {
    factors.push({
      id: "material-cost-exceeds-collected",
      label: "Material cost exceeds collected revenue",
      impact: "negative",
      detail: `${materialCostExceeds} job${materialCostExceeds === 1 ? "" : "s"} where material COGS exceeds collected revenue`,
      points: -Math.min(12, materialCostExceeds * 12),
    });
  }

  if (input.averageReadinessScore >= 75 && input.criticalCount === 0) {
    factors.push({
      id: "strong-readiness",
      label: "Strong workflow readiness",
      impact: "positive",
      detail: `Average queue readiness ${Math.round(input.averageReadinessScore)}% with no critical items`,
      points: 6,
    });
  } else if (input.averageReadinessScore < 50) {
    factors.push({
      id: "low-readiness",
      label: "Low workflow readiness",
      impact: "negative",
      detail: `Average queue readiness ${Math.round(input.averageReadinessScore)}%`,
      points: -8,
    });
  }

  if (input.resolutionTrend.direction === "improving") {
    factors.push({
      id: "cleanup-improving",
      label: "Cleanup pace improving",
      impact: "positive",
      detail: input.resolutionTrend.detail,
      points: 5,
    });
  } else if (input.resolutionTrend.direction === "declining") {
    factors.push({
      id: "cleanup-declining",
      label: "Cleanup pace slowing",
      impact: "negative",
      detail: input.resolutionTrend.detail,
      points: -5,
    });
  }

  const weakestArea = [...areaScores].sort((left, right) => left.score - right.score)[0];
  if (weakestArea && weakestArea.score < 70) {
    factors.push({
      id: `weakest-area-${weakestArea.id}`,
      label: `Weakest area: ${weakestArea.label}`,
      impact: "negative",
      detail: `Area score ${weakestArea.score}/100`,
      points: weakestArea.score - 70,
    });
  }

  const impactOrder = { negative: 0, neutral: 1, positive: 2 } as const;
  return factors.sort((left, right) => {
    const impactDelta = impactOrder[left.impact] - impactOrder[right.impact];
    if (impactDelta !== 0) {
      return impactDelta;
    }

    return Math.abs(right.points) - Math.abs(left.points);
  });
}

function resolveExtremeArea(
  areaScores: OperationalHealthAreaScore[],
  mode: "strongest" | "weakest",
): OperationalHealthAreaScore {
  const sorted = [...areaScores].sort((left, right) =>
    mode === "strongest" ? right.score - left.score : left.score - right.score,
  );

  return sorted[0] ?? areaScores[0];
}

/**
 * Pure builder — deterministic given operational counts from existing reports.
 */
export function buildOperationalHealthReport(
  input: OperationalHealthReportInput,
): OperationalHealthReport {
  const areaScores = buildAreaScores(input);
  const operationalHealthScore = clampScore(
    areaScores.reduce((total, area) => total + area.score, 0) / areaScores.length,
  );
  const operationalHealthLabel = resolveOperationalHealthLabel(operationalHealthScore);
  const operationalHealthTrend = resolveOperationalHealthTrend({
    compositeScore: operationalHealthScore,
    criticalCount: input.criticalCount,
    overdueCount: input.overdueCount,
    resolutionTrend: input.resolutionTrend,
  });

  return {
    operationalHealthScore,
    operationalHealthLabel,
    operationalHealthTrend,
    strongestOperationalArea: resolveExtremeArea(areaScores, "strongest"),
    biggestOperationalRisk: resolveExtremeArea(areaScores, "weakest"),
    contributingFactors: buildContributingFactors(input, areaScores),
    areaScores,
    meta: buildReportSectionMeta({
      dateRange: "all",
      dateBounds: null,
      limitations: [...OPERATIONAL_HEALTH_LIMITATIONS],
    }),
  };
}

function averageReadinessScore(items: OfficeReviewQueueReport["summary"]["items"]): number {
  if (items.length === 0) {
    return 100;
  }

  const total = items.reduce((sum, item) => sum + item.readinessScore, 0);
  return total / items.length;
}

function countProfitabilityWarnings(
  items: OfficeReviewQueueReport["summary"]["items"],
): number {
  return items.filter((item) =>
    item.reviewReasons.includes("profitability_data_incomplete"),
  ).length;
}

/** Build from an office review queue report plus optional profitability rollups. */
export function buildOperationalHealthReportFromOfficeQueue(
  queue: OfficeReviewQueueReport,
  options?: {
    jobsWithWarnings?: number;
    materialCostExceedsCollectedCount?: number;
    dataIntegrityIssueCount?: number;
    criticalDataIntegrityCount?: number;
  },
): OperationalHealthReport {
  const { summary } = queue;
  const stalledCount = summary.items.filter(
    (item) => item.kind === "stalled_job",
  ).length;
  const awaitingInvoicingCount = summary.items.filter(
    (item) => item.kind === "awaiting_invoicing",
  ).length;
  const completedWorkReviewCount = summary.items.filter(
    (item) => item.kind === "completed_work_review",
  ).length;

  const integrityItems = summary.items.filter(
    (item) => item.kind === "operational_inconsistency",
  );

  return buildOperationalHealthReport({
    criticalCount: summary.criticalCount,
    needsAttentionCount: summary.needsAttentionCount,
    overdueCount: summary.agingBucketCounts.overdue,
    stalledCount,
    awaitingInvoicingCount,
    completedWorkReviewCount,
    averageReadinessScore: averageReadinessScore(summary.items),
    resolutionTrend: summary.resolutionTrend,
    profitabilityWarningCount:
      options?.jobsWithWarnings ?? countProfitabilityWarnings(summary.items),
    materialCostExceedsCollectedCount:
      options?.materialCostExceedsCollectedCount ?? 0,
    dataIntegrityIssueCount:
      options?.dataIntegrityIssueCount ?? integrityItems.length,
    criticalDataIntegrityCount:
      options?.criticalDataIntegrityCount ??
      integrityItems.filter((item) => item.severity === "critical").length,
  });
}

export function getOperationalHealthLabelStyles(label: OperationalHealthLabel): {
  scoreClass: string;
  badgeClass: string;
} {
  switch (label) {
    case "Excellent":
      return {
        scoreClass: "text-emerald-700",
        badgeClass: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    case "Healthy":
      return {
        scoreClass: "text-cyan-700",
        badgeClass: "border-cyan-200 bg-cyan-50 text-cyan-800",
      };
    case "Needs attention":
      return {
        scoreClass: "text-amber-700",
        badgeClass: "border-amber-200 bg-amber-50 text-amber-800",
      };
    case "Operational risk":
      return {
        scoreClass: "text-rose-700",
        badgeClass: "border-rose-200 bg-rose-50 text-rose-800",
      };
  }
}

export function getOperationalHealthTrendStyles(trend: OperationalHealthTrend): {
  label: string;
  className: string;
} {
  switch (trend) {
    case "improving":
      return {
        label: "Improving",
        className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    case "declining":
      return {
        label: "Declining",
        className: "border-rose-200 bg-rose-50 text-rose-800",
      };
    case "stable":
      return {
        label: "Stable",
        className: "border-slate-200 bg-white text-slate-700",
      };
  }
}
