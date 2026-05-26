import type { DashboardData } from "@/shared/types/dashboard";
import type { DailyOperationsSummarySeverity } from "@/shared/types/daily-operations-summary";
import type { OperationalHealthAreaId } from "@/shared/types/operational-health-report";

export type OperationalRiskDrilldownSeverity = Exclude<
  DailyOperationsSummarySeverity,
  "info"
>;

export type OperationalRiskExplanation = {
  id: string;
  title: string;
  severity: OperationalRiskDrilldownSeverity;
  affectedArea: string;
  reason: string;
  supportingMetric: string;
  recommendedFollowUp: string;
  href: string;
  /** Higher scores surface first after severity sorting. */
  priorityScore: number;
  areaId?: OperationalHealthAreaId;
};

export type OperationalRiskDrilldownInput = Pick<
  DashboardData,
  | "officeReviewQueue"
  | "stalledJobs"
  | "completedWorkAwaitingInvoicing"
  | "completedWorkReview"
  | "operationalInsights"
  | "operationalHealth"
  | "money"
>;

const MAX_VISIBLE_RISKS = 5;

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function resolveOfficeQueuePressureRisk(
  input: OperationalRiskDrilldownInput,
): OperationalRiskExplanation | null {
  const {
    criticalCount,
    needsAttentionCount,
    totalCount,
    agingBucketCounts,
  } = input.officeReviewQueue.summary;
  const overdueCount = agingBucketCounts.overdue;
  const pressureCount = criticalCount + needsAttentionCount;

  if (totalCount === 0) {
    return null;
  }

  const areaScore =
    input.operationalHealth.areaScores.find((area) => area.id === "office_queue")
      ?.score ?? 100;
  const severity: OperationalRiskDrilldownSeverity =
    criticalCount > 0 || overdueCount >= 3 ? "critical" : "warning";

  const parts: string[] = [];
  if (criticalCount > 0) {
    parts.push(
      `${criticalCount} critical ${pluralize(criticalCount, "item")}`,
    );
  }
  if (needsAttentionCount > 0) {
    parts.push(
      `${needsAttentionCount} ${pluralize(needsAttentionCount, "item")} need attention`,
    );
  }
  if (overdueCount > 0) {
    parts.push(`${overdueCount} overdue in the queue`);
  }
  if (parts.length === 0) {
    parts.push(`${totalCount} ${pluralize(totalCount, "item")} aging in the office queue`);
  }

  return {
    id: "office-queue-pressure",
    title: "Office queue pressure",
    severity,
    affectedArea: "Office review queue",
    reason: `${parts.join(", ")} — unresolved office review slows scheduling, invoicing, and job close-out.`,
    supportingMetric: `${pressureCount > 0 ? pressureCount : totalCount} flagged · queue health ${areaScore}/100`,
    recommendedFollowUp:
      "Open the office review queue and clear the highest-severity items before they stall the pipeline.",
    href:
      criticalCount > 0 ? "/reports?queue=critical" : "/reports?queue=attention",
    priorityScore: 1000 + criticalCount * 15 + needsAttentionCount * 8 + overdueCount * 5,
    areaId: "office_queue",
  };
}

function resolveCashFlowBlockedRisk(
  input: OperationalRiskDrilldownInput,
): OperationalRiskExplanation | null {
  const overdueInvoices = input.money.overdueCount;
  const awaitingInvoicing = input.completedWorkAwaitingInvoicing.count;
  const total = overdueInvoices + awaitingInvoicing;

  if (total === 0) {
    return null;
  }

  const areaScore =
    input.operationalHealth.areaScores.find(
      (area) => area.id === "invoicing_backlog",
    )?.score ?? 100;
  const severity: OperationalRiskDrilldownSeverity =
    overdueInvoices > 0 ? "critical" : "warning";

  const parts: string[] = [];
  if (overdueInvoices > 0) {
    parts.push(
      `${overdueInvoices} overdue ${pluralize(overdueInvoices, "invoice")}`,
    );
  }
  if (awaitingInvoicing > 0) {
    parts.push(
      `${awaitingInvoicing} completed ${pluralize(awaitingInvoicing, "job")} not yet invoiced`,
    );
  }

  return {
    id: "cash-flow-blocked",
    title: "Cash flow blocked by billing gaps",
    severity,
    affectedArea: "Invoicing backlog",
    reason: `${parts.join(" and ")} — revenue is tied up until invoices are sent and overdue balances are collected.`,
    supportingMetric: `${total} billing ${pluralize(total, "gap")} · invoicing health ${areaScore}/100`,
    recommendedFollowUp:
      overdueInvoices > 0
        ? "Follow up on overdue invoices first, then invoice any completed work still waiting."
        : "Create invoices for completed jobs so finished work converts to billable revenue.",
    href: overdueInvoices > 0 ? "/invoices" : "/reports?queue=invoicing",
    priorityScore: 980 + overdueInvoices * 12 + awaitingInvoicing * 8,
    areaId: "invoicing_backlog",
  };
}

function resolveStalledJobBacklogRisk(
  input: OperationalRiskDrilldownInput,
): OperationalRiskExplanation | null {
  const { stalledCount, inactivityThresholdDays } = input.stalledJobs;

  if (stalledCount === 0) {
    return null;
  }

  const areaScore =
    input.operationalHealth.areaScores.find((area) => area.id === "pipeline_flow")
      ?.score ?? 100;
  const severity: OperationalRiskDrilldownSeverity =
    stalledCount >= 5 ? "critical" : "warning";

  return {
    id: "stalled-job-backlog",
    title: "Stalled job backlog",
    severity,
    affectedArea: "Job pipeline flow",
    reason: `${stalledCount} ${pluralize(stalledCount, "job")} ${stalledCount === 1 ? "has" : "have"} had no activity in ${inactivityThresholdDays}+ days — work may be waiting on dispatch, customer response, or office follow-up.`,
    supportingMetric: `${stalledCount} stalled · pipeline health ${areaScore}/100`,
    recommendedFollowUp:
      "Review stalled jobs in dispatch, contact customers or technicians, and restart progress on the oldest items.",
    href: "/reports?queue=stalled",
    priorityScore: 920 + stalledCount * 10,
    areaId: "pipeline_flow",
  };
}

function resolveProfitabilityWarningRisk(
  input: OperationalRiskDrilldownInput,
): OperationalRiskExplanation | null {
  const { jobsWithWarnings, materialCostExceedsCollectedCount } =
    input.operationalInsights.sections.profitabilityWarnings;

  if (jobsWithWarnings === 0 && materialCostExceedsCollectedCount === 0) {
    return null;
  }

  const areaScore =
    input.operationalHealth.areaScores.find(
      (area) => area.id === "profitability_data",
    )?.score ?? 100;
  const severity: OperationalRiskDrilldownSeverity =
    materialCostExceedsCollectedCount > 0 ? "critical" : "warning";
  const total = jobsWithWarnings + materialCostExceedsCollectedCount;

  const parts: string[] = [];
  if (materialCostExceedsCollectedCount > 0) {
    parts.push(
      `${materialCostExceedsCollectedCount} ${pluralize(materialCostExceedsCollectedCount, "job")} where material costs exceed collected revenue`,
    );
  }
  if (jobsWithWarnings > 0) {
    parts.push(
      `${jobsWithWarnings} ${pluralize(jobsWithWarnings, "job")} with incomplete profitability data`,
    );
  }

  return {
    id: "profitability-warning-concentration",
    title: "Profitability warning concentration",
    severity,
    affectedArea: "Profitability data quality",
    reason: `${parts.join("; ")} — margin visibility is limited until costs, labor, and billing are verified.`,
    supportingMetric: `${total} ${pluralize(total, "job")} flagged · data quality ${areaScore}/100`,
    recommendedFollowUp:
      "Open profitability reports, verify job costs and billing, and resolve warnings before closing jobs.",
    href: "/reports",
    priorityScore:
      880 + materialCostExceedsCollectedCount * 14 + jobsWithWarnings * 9,
    areaId: "profitability_data",
  };
}

function resolveWorkflowReadinessWeaknessRisk(
  input: OperationalRiskDrilldownInput,
): OperationalRiskExplanation | null {
  const workflowReadiness = input.operationalHealth.areaScores.find(
    (area) => area.id === "workflow_readiness",
  );
  const readinessScore = workflowReadiness?.score ?? 100;
  const criticalReadinessItems = input.officeReviewQueue.summary.items.filter(
    (item) => item.readinessScore === 0,
  ).length;
  const lowReadinessItems = input.officeReviewQueue.summary.items.filter(
    (item) => item.readinessScore > 0 && item.readinessScore <= 50,
  ).length;
  const blockedItems = criticalReadinessItems + lowReadinessItems;

  if (blockedItems === 0 && readinessScore >= 70) {
    return null;
  }

  const severity: OperationalRiskDrilldownSeverity =
    criticalReadinessItems > 0 || readinessScore < 50 ? "critical" : "warning";

  const parts: string[] = [];
  if (criticalReadinessItems > 0) {
    parts.push(
      `${criticalReadinessItems} queue ${pluralize(criticalReadinessItems, "item")} with major blockers`,
    );
  }
  if (lowReadinessItems > 0) {
    parts.push(
      `${lowReadinessItems} ${pluralize(lowReadinessItems, "item")} with moderate blockers`,
    );
  }
  if (parts.length === 0) {
    parts.push(`Average workflow readiness is ${readinessScore}%`);
  }

  return {
    id: "workflow-readiness-weakness",
    title: "Workflow readiness weakness",
    severity,
    affectedArea: "Workflow readiness",
    reason: `${parts.join("; ")} — missing expenses, labor, or documentation can delay scheduling, invoicing, and close-out.`,
    supportingMetric:
      blockedItems > 0
        ? `${blockedItems} blocked ${pluralize(blockedItems, "item")} · readiness ${readinessScore}/100`
        : `Readiness score ${readinessScore}/100`,
    recommendedFollowUp:
      "Clear readiness blockers on queue items before scheduling new work or closing jobs.",
    href: "/reports?queue=attention",
    priorityScore: 840 + blockedItems * 7 + (readinessScore < 50 ? 25 : 0),
    areaId: "workflow_readiness",
  };
}

function resolveCompletedWorkReviewRisk(
  input: OperationalRiskDrilldownInput,
): OperationalRiskExplanation | null {
  const reviewCount = input.completedWorkReview.count;

  if (reviewCount === 0) {
    return null;
  }

  const criticalReviewJobs = input.completedWorkReview.jobs.filter(
    (job) => job.severity === "critical",
  ).length;
  const severity: OperationalRiskDrilldownSeverity =
    criticalReviewJobs > 0 ? "critical" : "warning";
  const invoicingAreaScore =
    input.operationalHealth.areaScores.find(
      (area) => area.id === "invoicing_backlog",
    )?.score ?? 100;

  return {
    id: "completed-work-review",
    title: "Completed work waiting for review",
    severity,
    affectedArea: "Completed work review",
    reason: `${reviewCount} completed ${pluralize(reviewCount, "job")} ${reviewCount === 1 ? "is" : "are"} blocked on office review before invoicing or close-out${criticalReviewJobs > 0 ? ` — ${criticalReviewJobs} marked critical` : ""}.`,
    supportingMetric: `${reviewCount} review ${pluralize(reviewCount, "blocker")} · invoicing health ${invoicingAreaScore}/100`,
    recommendedFollowUp:
      "Open each blocked job, resolve review reasons, and move work toward billing or completion.",
    href: "/reports?queue=attention",
    priorityScore: 800 + reviewCount * 8 + criticalReviewJobs * 6,
    areaId: "invoicing_backlog",
  };
}

const RISK_BUILDERS: ((
  input: OperationalRiskDrilldownInput,
) => OperationalRiskExplanation | null)[] = [
  resolveOfficeQueuePressureRisk,
  resolveCashFlowBlockedRisk,
  resolveStalledJobBacklogRisk,
  resolveProfitabilityWarningRisk,
  resolveWorkflowReadinessWeaknessRisk,
  resolveCompletedWorkReviewRisk,
];

const SEVERITY_RANK: Record<OperationalRiskDrilldownSeverity, number> = {
  critical: 0,
  warning: 1,
};

function boostBiggestOperationalRisk(
  risks: OperationalRiskExplanation[],
  biggestRiskAreaId: OperationalHealthAreaId,
): OperationalRiskExplanation[] {
  return risks.map((risk) =>
    risk.areaId === biggestRiskAreaId
      ? { ...risk, priorityScore: risk.priorityScore + 50 }
      : risk,
  );
}

/**
 * Maps dashboard rollups already loaded by getDashboardData into 3–5 explainable
 * operational risks — no extra fetches or business-rule recomputation.
 */
export function buildOperationalRiskDrilldown(
  input: OperationalRiskDrilldownInput,
): OperationalRiskExplanation[] {
  const risks = boostBiggestOperationalRisk(
    RISK_BUILDERS.map((build) => build(input)).filter(
      (risk): risk is OperationalRiskExplanation => risk !== null,
    ),
    input.operationalHealth.biggestOperationalRisk.id,
  ).sort((left, right) => {
    const severityDelta =
      SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
    if (severityDelta !== 0) {
      return severityDelta;
    }

    return right.priorityScore - left.priorityScore;
  });

  if (risks.length === 0) {
    return [];
  }

  if (risks.length <= MAX_VISIBLE_RISKS) {
    return risks;
  }

  return risks.slice(0, MAX_VISIBLE_RISKS);
}

export function hasOperationalRiskDrilldown(
  input: OperationalRiskDrilldownInput,
): boolean {
  return RISK_BUILDERS.some((build) => build(input) !== null);
}

export function getOperationalRiskDrilldownSummary(
  input: OperationalRiskDrilldownInput,
): {
  riskCount: number;
  biggestRiskLabel: string;
  healthScore: number;
} {
  const risks = buildOperationalRiskDrilldown(input);

  return {
    riskCount: risks.length,
    biggestRiskLabel: input.operationalHealth.biggestOperationalRisk.label,
    healthScore: input.operationalHealth.operationalHealthScore,
  };
}

export { MAX_VISIBLE_RISKS };
