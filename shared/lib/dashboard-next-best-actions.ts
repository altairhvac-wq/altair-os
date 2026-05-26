import type { DashboardData } from "@/shared/types/dashboard";
import { INVOICE_PAGE_OVERDUE_HREF } from "@/shared/lib/invoice-page-focus";
import type { DailyOperationsSummarySeverity } from "@/shared/types/daily-operations-summary";

export type DashboardNextBestActionSeverity = Exclude<
  DailyOperationsSummarySeverity,
  "info"
> | "info";

export type DashboardNextBestAction = {
  id: string;
  severity: DashboardNextBestActionSeverity;
  /** Higher scores surface first after severity sorting — deterministic business impact. */
  priorityScore: number;
  title: string;
  explanation: string;
  recommendedAction: string;
  count: number | null;
  metricLabel?: string;
  href: string;
};

export type DashboardNextBestActionsInput = Pick<
  DashboardData,
  | "officeReviewQueue"
  | "stalledJobs"
  | "completedWorkAwaitingInvoicing"
  | "completedWorkReview"
  | "operationalInsights"
  | "operationalHealth"
  | "money"
>;

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function resolveCriticalQueueAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
  const { criticalCount } = input.officeReviewQueue.summary;

  if (criticalCount === 0) {
    return null;
  }

  return {
    id: "review-critical-queue",
    severity: "critical",
    priorityScore: 1000 + criticalCount * 12,
    title: "Review critical office queue items",
    explanation: `${criticalCount} critical ${pluralize(criticalCount, "item")} need office review before jobs stall in the pipeline.`,
    recommendedAction:
      "Open the critical queue and resolve the highest-severity blockers first.",
    count: criticalCount,
    metricLabel: "critical items",
    href: "/reports?queue=critical",
  };
}

function resolveOverdueInvoicesAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
  const overdueInvoices = input.money.overdueCount;

  if (overdueInvoices === 0) {
    return null;
  }

  return {
    id: "collect-overdue-invoices",
    severity: "critical",
    priorityScore: 980 + overdueInvoices * 10,
    title: "Follow up on overdue invoices",
    explanation: `${overdueInvoices} ${pluralize(overdueInvoices, "invoice")} past due — follow up to protect cash flow.`,
    recommendedAction:
      "Review overdue invoices and contact customers to protect cash flow.",
    count: overdueInvoices,
    metricLabel: "overdue invoices",
    href: INVOICE_PAGE_OVERDUE_HREF,
  };
}

function resolveOverdueQueueAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
  const overdueCount = input.officeReviewQueue.summary.agingBucketCounts.overdue;

  if (overdueCount === 0) {
    return null;
  }

  return {
    id: "review-overdue-queue",
    severity: overdueCount >= 3 ? "critical" : "warning",
    priorityScore: 900 + overdueCount * 4,
    title: "Review overdue operational items",
    explanation: `${overdueCount} office queue ${pluralize(overdueCount, "item")} in the 7+ day overdue bucket.`,
    recommendedAction:
      "Clear aging queue items before they compound into stalled jobs or billing gaps.",
    count: overdueCount,
    metricLabel: "overdue in queue",
    href: "/reports?queue=aging",
  };
}

function resolveAwaitingInvoicingAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
  const awaitingCount = input.completedWorkAwaitingInvoicing.count;

  if (awaitingCount === 0) {
    return null;
  }

  return {
    id: "invoice-completed-work",
    severity: awaitingCount >= 5 ? "critical" : "warning",
    priorityScore: 860 + awaitingCount * 8,
    title: "Invoice completed jobs awaiting billing",
    explanation: `${awaitingCount} completed ${pluralize(awaitingCount, "job")} still need invoices created.`,
    recommendedAction:
      "Create invoices for finished work so revenue is not left on the table.",
    count: awaitingCount,
    metricLabel: "awaiting invoice",
    href: "/reports?queue=invoicing",
  };
}

function resolveStalledJobsAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
  const { stalledCount, inactivityThresholdDays } = input.stalledJobs;

  if (stalledCount === 0) {
    return null;
  }

  const severity: DashboardNextBestActionSeverity =
    stalledCount >= 5 ? "critical" : "warning";

  return {
    id: "resolve-stalled-jobs",
    severity,
    priorityScore: 820 + stalledCount * 10,
    title: "Resolve stalled jobs",
    explanation: `${stalledCount} ${pluralize(stalledCount, "job")} with no activity in ${inactivityThresholdDays}+ days.`,
    recommendedAction:
      "Check dispatch status and follow up with customers or technicians to restart progress.",
    count: stalledCount,
    metricLabel: "stalled jobs",
    href: "/reports?queue=stalled",
  };
}

function resolveProfitabilityRiskAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
  const { jobsWithWarnings, materialCostExceedsCollectedCount } =
    input.operationalInsights.sections.profitabilityWarnings;

  if (jobsWithWarnings === 0 && materialCostExceedsCollectedCount === 0) {
    return null;
  }

  const severity: DashboardNextBestActionSeverity =
    materialCostExceedsCollectedCount > 0 ? "critical" : "warning";
  const count = jobsWithWarnings + materialCostExceedsCollectedCount;

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
    id: "review-profitability-risk",
    severity,
    priorityScore:
      780 +
      materialCostExceedsCollectedCount * 12 +
      jobsWithWarnings * 8,
    title: "Review jobs with profitability risk",
    explanation: `${parts.join("; ")}.`,
    recommendedAction:
      "Verify job costs, labor, and billing before closing jobs or issuing final invoices.",
    count,
    metricLabel: "jobs flagged",
    href: "/reports",
  };
}

function resolveCompletedWorkReviewAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
  const reviewCount = input.completedWorkReview.count;

  if (reviewCount === 0) {
    return null;
  }

  const criticalReviewJobs = input.completedWorkReview.jobs.filter(
    (job) => job.severity === "critical",
  ).length;
  const severity: DashboardNextBestActionSeverity =
    criticalReviewJobs > 0 ? "critical" : "warning";

  return {
    id: "resolve-completed-work-review",
    severity,
    priorityScore: 760 + reviewCount * 6 + criticalReviewJobs * 4,
    title: "Resolve completed work review blockers",
    explanation: `${reviewCount} completed ${pluralize(reviewCount, "job")} blocked on office review before invoicing or close-out.`,
    recommendedAction:
      "Open each blocked job, clear review reasons, and move work toward billing.",
    count: reviewCount,
    metricLabel: "review blockers",
    href:
      criticalReviewJobs > 0
        ? "/reports?queue=critical"
        : "/reports?queue=attention",
  };
}

function resolveReadinessBlockersAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
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
  const blockerCount = criticalReadinessItems + lowReadinessItems;

  if (blockerCount === 0 && readinessScore >= 70) {
    return null;
  }

  const severity: DashboardNextBestActionSeverity =
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
    id: "resolve-readiness-blockers",
    severity,
    priorityScore: 720 + blockerCount * 5 + (readinessScore < 50 ? 20 : 0),
    title: "Resolve workflow readiness blockers",
    explanation: `${parts.join("; ")} — scheduling and close-out may be delayed.`,
    recommendedAction:
      "Clear expenses, labor, or documentation gaps flagged on queue items.",
    count: blockerCount > 0 ? blockerCount : null,
    metricLabel: blockerCount > 0 ? "blocked items" : undefined,
    href: "/reports?queue=attention",
  };
}

function resolveNeedsAttentionQueueAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
  const { needsAttentionCount, criticalCount } = input.officeReviewQueue.summary;

  if (needsAttentionCount === 0 || criticalCount > 0) {
    return null;
  }

  return {
    id: "review-attention-queue",
    severity: "warning",
    priorityScore: 680 + needsAttentionCount * 6,
    title: "Review office queue items needing attention",
    explanation: `${needsAttentionCount} ${pluralize(needsAttentionCount, "item")} flagged for follow-up in the office review queue.`,
    recommendedAction:
      "Work through the attention queue to keep jobs moving toward invoice or completion.",
    count: needsAttentionCount,
    metricLabel: "need attention",
    href: "/reports?queue=attention",
  };
}

function resolvePendingExpensesAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
  const pendingCount = input.operationalInsights.sections.pendingExpenses.count;

  if (pendingCount === 0) {
    return null;
  }

  return {
    id: "approve-pending-expenses",
    severity: pendingCount >= 10 ? "warning" : "info",
    priorityScore: 640 + pendingCount * 3,
    title: "Approve pending expense submissions",
    explanation: `${pendingCount} expense ${pluralize(pendingCount, "submission")} awaiting office approval.`,
    recommendedAction:
      "Review and approve or reject receipts so job costs stay accurate.",
    count: pendingCount,
    metricLabel: "pending expenses",
    href: "/expenses",
  };
}

function resolveOperationalHealthAction(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction | null {
  const { operationalHealthTrend, operationalHealthScore, biggestOperationalRisk } =
    input.operationalHealth;

  if (
    operationalHealthTrend !== "declining" &&
    operationalHealthScore >= 50
  ) {
    return null;
  }

  if (operationalHealthScore < 50) {
    return {
      id: "address-operational-health",
      severity: "critical",
      priorityScore: 600 + (50 - operationalHealthScore) * 2,
      title: "Address operational health risks",
      explanation: `Operational health score is ${operationalHealthScore}/100 — weakest area: ${biggestOperationalRisk.label.toLowerCase()}.`,
      recommendedAction:
        "Focus on the weakest operational area shown in reports before backlog grows.",
      count: operationalHealthScore,
      metricLabel: "health score",
      href: "/reports",
    };
  }

  return {
    id: "reverse-declining-trend",
    severity: "warning",
    priorityScore: 580,
    title: "Reverse declining operational trend",
    explanation:
      "Queue resolution pace is slowing — backlog pressure may increase if left unchecked.",
    recommendedAction:
      "Prioritize clearing office queue and invoicing backlog this week.",
    count: null,
    href: "/reports",
  };
}

const ACTION_BUILDERS: ((
  input: DashboardNextBestActionsInput,
) => DashboardNextBestAction | null)[] = [
  resolveCriticalQueueAction,
  resolveOverdueInvoicesAction,
  resolveOverdueQueueAction,
  resolveAwaitingInvoicingAction,
  resolveStalledJobsAction,
  resolveProfitabilityRiskAction,
  resolveCompletedWorkReviewAction,
  resolveReadinessBlockersAction,
  resolveNeedsAttentionQueueAction,
  resolvePendingExpensesAction,
  resolveOperationalHealthAction,
];

const SEVERITY_RANK: Record<DashboardNextBestActionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const MAX_VISIBLE_ACTIONS = 6;

/**
 * Converts dashboard rollups already loaded by getDashboardData into a
 * prioritized, explainable action list — no extra fetches or recomputation.
 */
export function buildDashboardNextBestActions(
  input: DashboardNextBestActionsInput,
): DashboardNextBestAction[] {
  return ACTION_BUILDERS.map((build) => build(input))
    .filter((action): action is DashboardNextBestAction => action !== null)
    .sort((left, right) => {
      const severityDelta =
        SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity];
      if (severityDelta !== 0) {
        return severityDelta;
      }

      return right.priorityScore - left.priorityScore;
    })
    .slice(0, MAX_VISIBLE_ACTIONS);
}

export function hasDashboardNextBestActions(
  input: DashboardNextBestActionsInput,
): boolean {
  return ACTION_BUILDERS.some((build) => build(input) !== null);
}
