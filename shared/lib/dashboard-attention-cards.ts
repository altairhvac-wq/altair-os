import type { DashboardData } from "@/shared/types/dashboard";
import {
  INVOICE_PAGE_CASH_FLOW_HREF,
  INVOICE_PAGE_OVERDUE_HREF,
} from "@/shared/lib/invoice-page-focus";
import type { DailyOperationsSummarySeverity } from "@/shared/types/daily-operations-summary";

export type DashboardAttentionCardSeverity =
  | "healthy"
  | DailyOperationsSummarySeverity;

export type DashboardAttentionCard = {
  id: string;
  label: string;
  /** Primary metric — omitted when healthy and statusLabel is shown instead. */
  count: number | null;
  statusLabel: string;
  explanation: string;
  severity: DashboardAttentionCardSeverity;
  href?: string;
};

export type DashboardAttentionCardsInput = Pick<
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

function resolveOfficeQueueCard(
  input: DashboardAttentionCardsInput,
): DashboardAttentionCard {
  const { criticalCount, needsAttentionCount, totalCount, agingBucketCounts } =
    input.officeReviewQueue.summary;
  const issueCount = criticalCount + needsAttentionCount;
  const overdueCount = agingBucketCounts.overdue;

  if (totalCount === 0) {
    return {
      id: "office-queue",
      label: "Office queue",
      count: null,
      statusLabel: "Clear",
      explanation: "No jobs waiting for office review right now.",
      severity: "healthy",
      href: "/reports",
    };
  }

  const severity: DashboardAttentionCardSeverity =
    criticalCount > 0 ? "critical" : "warning";

  const parts: string[] = [];
  if (criticalCount > 0) {
    parts.push(
      `${criticalCount} critical ${pluralize(criticalCount, "item")}`,
    );
  }
  if (needsAttentionCount > 0) {
    parts.push(
      `${needsAttentionCount} need${needsAttentionCount === 1 ? "s" : ""} attention`,
    );
  }
  if (overdueCount > 0) {
    parts.push(`${overdueCount} overdue in the queue`);
  }

  return {
    id: "office-queue",
    label: "Office queue",
    count: issueCount,
    statusLabel: `${issueCount}`,
    explanation: `${parts.join(", ")} — review before jobs stall in the pipeline.`,
    severity,
    href:
      criticalCount > 0 ? "/reports?queue=critical" : "/reports?queue=attention",
  };
}

function resolveInvoicingCard(
  input: DashboardAttentionCardsInput,
): DashboardAttentionCard {
  const overdueInvoices = input.money.overdueCount;
  const awaitingInvoicing = input.completedWorkAwaitingInvoicing.count;
  const total = overdueInvoices + awaitingInvoicing;

  if (total === 0) {
    return {
      id: "invoicing",
      label: "Invoicing",
      count: null,
      statusLabel: "Current",
      explanation: "No overdue invoices or completed work waiting to be billed.",
      severity: "healthy",
      href: INVOICE_PAGE_CASH_FLOW_HREF,
    };
  }

  const severity: DashboardAttentionCardSeverity =
    overdueInvoices > 0 ? "critical" : "warning";

  const parts: string[] = [];
  if (overdueInvoices > 0) {
    parts.push(
      `${overdueInvoices} overdue ${pluralize(overdueInvoices, "invoice")}`,
    );
  }
  if (awaitingInvoicing > 0) {
    parts.push(
      `${awaitingInvoicing} completed ${pluralize(awaitingInvoicing, "job")} awaiting invoices`,
    );
  }

  return {
    id: "invoicing",
    label: "Invoicing",
    count: total,
    statusLabel: `${total}`,
    explanation: `${parts.join(" and ")} — follow up to protect cash flow.`,
    severity,
    href:
      overdueInvoices > 0
        ? INVOICE_PAGE_OVERDUE_HREF
        : "/reports?queue=invoicing",
  };
}

function resolveStalledJobsCard(
  input: DashboardAttentionCardsInput,
): DashboardAttentionCard {
  const { stalledCount, inactivityThresholdDays } = input.stalledJobs;

  if (stalledCount === 0) {
    return {
      id: "stalled-jobs",
      label: "Stalled jobs",
      count: null,
      statusLabel: "On track",
      explanation: `No jobs have gone quiet for ${inactivityThresholdDays}+ days.`,
      severity: "healthy",
      href: "/reports?queue=stalled",
    };
  }

  const severity: DashboardAttentionCardSeverity =
    stalledCount >= 5 ? "critical" : "warning";

  return {
    id: "stalled-jobs",
    label: "Stalled jobs",
    count: stalledCount,
    statusLabel: `${stalledCount}`,
    explanation: `${stalledCount} ${pluralize(stalledCount, "job")} with no activity in ${inactivityThresholdDays}+ days — check dispatch and customer follow-up.`,
    severity,
    href: "/reports?queue=stalled",
  };
}

function resolveProfitabilityCard(
  input: DashboardAttentionCardsInput,
): DashboardAttentionCard {
  const { jobsWithWarnings, materialCostExceedsCollectedCount } =
    input.operationalInsights.sections.profitabilityWarnings;

  if (jobsWithWarnings === 0 && materialCostExceedsCollectedCount === 0) {
    return {
      id: "profitability",
      label: "Profitability",
      count: null,
      statusLabel: "Clean",
      explanation: "No margin data gaps or material-cost red flags on open jobs.",
      severity: "healthy",
      href: "/reports",
    };
  }

  const severity: DashboardAttentionCardSeverity =
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
    id: "profitability",
    label: "Profitability",
    count,
    statusLabel: `${count}`,
    explanation: `${parts.join("; ")} — verify costs and billing before closing jobs.`,
    severity,
    href: "/reports",
  };
}

function resolveReadinessCard(
  input: DashboardAttentionCardsInput,
): DashboardAttentionCard {
  const workflowReadiness = input.operationalHealth.areaScores.find(
    (area) => area.id === "workflow_readiness",
  );
  const readinessScore = workflowReadiness?.score ?? 100;
  const lowReadinessItems = input.officeReviewQueue.summary.items.filter(
    (item) => item.readinessScore <= 50,
  ).length;
  const criticalReadinessItems = input.officeReviewQueue.summary.items.filter(
    (item) => item.readinessScore === 0,
  ).length;
  const reviewBlockers = input.completedWorkReview.count;

  if (
    lowReadinessItems === 0 &&
    reviewBlockers === 0 &&
    readinessScore >= 70
  ) {
    return {
      id: "readiness",
      label: "Readiness",
      count: null,
      statusLabel: `${readinessScore}%`,
      explanation: "Queue items look ready to schedule, invoice, or close.",
      severity: "healthy",
      href: "/reports?queue=attention",
    };
  }

  const severity: DashboardAttentionCardSeverity =
    criticalReadinessItems > 0 || readinessScore < 50
      ? "critical"
      : "warning";

  const count = Math.max(lowReadinessItems, reviewBlockers);

  const parts: string[] = [];
  if (lowReadinessItems > 0) {
    parts.push(
      `${lowReadinessItems} queue ${pluralize(lowReadinessItems, "item")} with moderate or major blockers`,
    );
  }
  if (reviewBlockers > 0 && reviewBlockers !== lowReadinessItems) {
    parts.push(
      `${reviewBlockers} completed ${pluralize(reviewBlockers, "job")} blocked on office review`,
    );
  }
  if (parts.length === 0) {
    parts.push(`Average workflow readiness is ${readinessScore}%`);
  }

  return {
    id: "readiness",
    label: "Readiness",
    count: count > 0 ? count : null,
    statusLabel: count > 0 ? `${count}` : `${readinessScore}%`,
    explanation: `${parts.join("; ")} — resolve blockers before scheduling or closing.`,
    severity,
    href: "/reports?queue=attention",
  };
}

const ATTENTION_CARD_BUILDERS: ((
  input: DashboardAttentionCardsInput,
) => DashboardAttentionCard)[] = [
  resolveOfficeQueueCard,
  resolveInvoicingCard,
  resolveStalledJobsCard,
  resolveProfitabilityCard,
  resolveReadinessCard,
];

const SEVERITY_RANK: Record<DashboardAttentionCardSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  healthy: 3,
};

/**
 * Maps dashboard rollups already loaded by getDashboardData into read-only
 * attention cards — no extra fetches or business-rule recomputation.
 */
export function buildDashboardAttentionCards(
  input: DashboardAttentionCardsInput,
): DashboardAttentionCard[] {
  return ATTENTION_CARD_BUILDERS.map((build) => build(input)).sort(
    (left, right) => SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity],
  );
}

export function countDashboardAttentionIssues(
  cards: DashboardAttentionCard[],
): number {
  return cards.filter((card) => card.severity !== "healthy").length;
}
