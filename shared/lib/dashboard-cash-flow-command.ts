import type { DashboardData } from "@/shared/types/dashboard";

export type CashFlowCommandSeverity = "healthy" | "warning" | "critical";

export type CashFlowCommandDrillDownLink = {
  label: string;
  href: string;
};

export type CashFlowCommandSnapshot = {
  severity: CashFlowCommandSeverity;
  statusLabel: string;
  headline: string;
  explanation: string;
  recommendedAction: string;
  primaryHref: string;
  metrics: {
    overdueInvoices: number;
    overdueTotal: number;
    awaitingInvoicing: number;
    completedWorkReviewBlockers: number;
    invoicingBacklogScore: number | null;
  };
  drillDownLinks: CashFlowCommandDrillDownLink[];
};

export type CashFlowCommandInput = Pick<
  DashboardData,
  | "money"
  | "completedWorkAwaitingInvoicing"
  | "completedWorkReview"
  | "operationalHealth"
>;

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function resolveSeverity(input: CashFlowCommandInput): CashFlowCommandSeverity {
  const overdueInvoices = input.money.overdueCount;
  const awaitingInvoicing = input.completedWorkAwaitingInvoicing.count;
  const reviewBlockers = input.completedWorkReview.count;
  const criticalReviewJobs = input.completedWorkReview.jobs.filter(
    (job) => job.severity === "critical",
  ).length;

  if (
    overdueInvoices > 0 ||
    criticalReviewJobs > 0 ||
    awaitingInvoicing >= 5
  ) {
    return "critical";
  }

  if (awaitingInvoicing > 0 || reviewBlockers > 0) {
    return "warning";
  }

  return "healthy";
}

function resolveStatusLabel(severity: CashFlowCommandSeverity): string {
  switch (severity) {
    case "critical":
      return "At risk";
    case "warning":
      return "Pressure";
    default:
      return "Clear";
  }
}

function resolveHeadline(input: CashFlowCommandInput): string {
  const overdueInvoices = input.money.overdueCount;
  const awaitingInvoicing = input.completedWorkAwaitingInvoicing.count;
  const reviewBlockers = input.completedWorkReview.count;

  if (
    overdueInvoices === 0 &&
    awaitingInvoicing === 0 &&
    reviewBlockers === 0
  ) {
    return "Cash flow is clear today";
  }

  if (overdueInvoices > 0 && awaitingInvoicing > 0) {
    return "Overdue invoices and unbilled work need attention";
  }

  if (overdueInvoices > 0) {
    return `${overdueInvoices} overdue ${pluralize(overdueInvoices, "invoice")} need follow-up`;
  }

  if (reviewBlockers > 0) {
    return "Completed work review is blocking billing";
  }

  return `${awaitingInvoicing} completed ${pluralize(awaitingInvoicing, "job")} ${awaitingInvoicing === 1 ? "is" : "are"} ready to invoice`;
}

function resolveExplanation(input: CashFlowCommandInput): string {
  const overdueInvoices = input.money.overdueCount;
  const awaitingInvoicing = input.completedWorkAwaitingInvoicing.count;
  const reviewBlockers = input.completedWorkReview.count;
  const invoicingBacklogScore =
    input.operationalHealth.areaScores.find(
      (area) => area.id === "invoicing_backlog",
    )?.score ?? null;

  if (
    overdueInvoices === 0 &&
    awaitingInvoicing === 0 &&
    reviewBlockers === 0
  ) {
    return "No overdue invoices, completed work waiting to bill, or review blockers are slowing collections.";
  }

  const parts: string[] = [];

  if (overdueInvoices > 0) {
    parts.push(
      `${overdueInvoices} overdue ${pluralize(overdueInvoices, "invoice")} are past due`,
    );
  }

  if (awaitingInvoicing > 0) {
    parts.push(
      `${awaitingInvoicing} completed ${pluralize(awaitingInvoicing, "job")} still need invoices`,
    );
  }

  if (reviewBlockers > 0) {
    parts.push(
      `${reviewBlockers} completed ${pluralize(reviewBlockers, "job")} blocked on office review before billing`,
    );
  }

  if (invoicingBacklogScore !== null && invoicingBacklogScore < 70) {
    parts.push(`invoicing backlog health is ${invoicingBacklogScore}/100`);
  }

  return `${parts.join("; ")} — address these to protect cash flow.`;
}

function resolveRecommendedAction(input: CashFlowCommandInput): string {
  const overdueInvoices = input.money.overdueCount;
  const awaitingInvoicing = input.completedWorkAwaitingInvoicing.count;
  const reviewBlockers = input.completedWorkReview.count;

  if (
    overdueInvoices === 0 &&
    awaitingInvoicing === 0 &&
    reviewBlockers === 0
  ) {
    return "Monitor invoices as jobs complete — no billing pressure right now.";
  }

  if (overdueInvoices > 0) {
    return "Follow up on overdue invoices first, then invoice any completed work still waiting.";
  }

  if (reviewBlockers > 0) {
    return "Resolve completed work review blockers so finished jobs can move to billing.";
  }

  return "Create invoices for completed jobs so finished work converts to billable revenue.";
}

function resolvePrimaryHref(input: CashFlowCommandInput): string {
  const overdueInvoices = input.money.overdueCount;
  const awaitingInvoicing = input.completedWorkAwaitingInvoicing.count;
  const reviewBlockers = input.completedWorkReview.count;

  if (overdueInvoices > 0) {
    return "/invoices";
  }

  if (reviewBlockers > 0) {
    return "/reports?queue=attention";
  }

  if (awaitingInvoicing > 0) {
    return "/reports?queue=invoicing";
  }

  return "/invoices";
}

function resolveDrillDownLinks(
  input: CashFlowCommandInput,
): CashFlowCommandDrillDownLink[] {
  const links: CashFlowCommandDrillDownLink[] = [];

  if (input.money.overdueCount > 0) {
    links.push({ label: "Overdue invoices", href: "/invoices" });
  }

  if (input.completedWorkAwaitingInvoicing.count > 0) {
    links.push({
      label: "Awaiting invoicing",
      href: "/reports?queue=invoicing",
    });
  }

  if (input.completedWorkReview.count > 0) {
    links.push({
      label: "Review blockers",
      href: "/reports?queue=attention",
    });
  }

  links.push({ label: "Billing reports", href: "/reports" });

  return links;
}

/**
 * Derives a read-only cash flow command snapshot from dashboard rollups already
 * loaded by getDashboardData — no extra fetches or invoice lifecycle logic.
 */
export function buildCashFlowCommandSnapshot(
  input: CashFlowCommandInput,
): CashFlowCommandSnapshot {
  const severity = resolveSeverity(input);
  const invoicingBacklogScore =
    input.operationalHealth.areaScores.find(
      (area) => area.id === "invoicing_backlog",
    )?.score ?? null;

  return {
    severity,
    statusLabel: resolveStatusLabel(severity),
    headline: resolveHeadline(input),
    explanation: resolveExplanation(input),
    recommendedAction: resolveRecommendedAction(input),
    primaryHref: resolvePrimaryHref(input),
    metrics: {
      overdueInvoices: input.money.overdueCount,
      overdueTotal: input.money.overdueTotal,
      awaitingInvoicing: input.completedWorkAwaitingInvoicing.count,
      completedWorkReviewBlockers: input.completedWorkReview.count,
      invoicingBacklogScore,
    },
    drillDownLinks: resolveDrillDownLinks(input),
  };
}

export function hasCashFlowPressure(input: CashFlowCommandInput): boolean {
  return buildCashFlowCommandSnapshot(input).severity !== "healthy";
}
