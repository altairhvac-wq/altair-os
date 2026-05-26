import { listEstimates } from "@/lib/database/queries/estimates";
import { listExpenses } from "@/lib/database/queries/expenses";
import { getPaymentsTodaySummary } from "@/lib/database/queries/invoice-payments";
import { listInvoices } from "@/lib/database/queries/invoices";
import { listJobMaterialsForCompany } from "@/lib/database/queries/job-materials";
import { listJobs } from "@/lib/database/queries/jobs";
import { listTimeEntries } from "@/lib/database/queries/time-entries";
import { getCompanyCompletedWorkReport } from "@/lib/database/services/reports/completed-work-report";
import { getCompanyCompletedWorkReviewReport } from "@/lib/database/services/reports/completed-work-review-report";
import { getJobReviewBlockerResolutionsThisWeekCount } from "@/lib/database/services/job-review-resolution";
import { getCompanyExpenseReport } from "@/lib/database/services/reports/expense-report";
import { getCompanyJobActivityReport } from "@/lib/database/services/reports/job-activity-report";
import { getCompanyProfitabilityReport } from "@/lib/database/services/reports/profitability-report";
import { getCompanyRevenueReport } from "@/lib/database/services/reports/revenue-report";
import { getCompanyStalledJobsReport } from "@/lib/database/services/reports/stalled-jobs-report";
import { getCompanyTechnicianLaborReport } from "@/lib/database/services/reports/technician-labor-report";
import {
  computeJobProfitability,
  type JobProfitabilityInputs,
} from "@/shared/types/job-profitability";
import type {
  DailyOperationsSummary,
  DailyOperationsSummaryHighlight,
  DailyOperationsSummarySeverity,
} from "@/shared/types/daily-operations-summary";
import type { ProfitabilityReportDateRange } from "@/shared/types/reports";
import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import type { Invoice } from "@/shared/types/invoice";
import type { JobMaterial } from "@/shared/types/job-material";
import type { TimeEntry } from "@/shared/types/time-entry";

const REPORT_OPTIONS = { dateRange: "all" as const satisfies ProfitabilityReportDateRange };

type JobLevelOperationalCounts = {
  materialCostExceedsCollectedCount: number;
};

function groupByJobId<T extends { jobId?: string }>(
  items: T[],
  jobIds: Set<string>,
): Map<string, T[]> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    if (!item.jobId || !jobIds.has(item.jobId)) {
      continue;
    }

    const existing = map.get(item.jobId);
    if (existing) {
      existing.push(item);
    } else {
      map.set(item.jobId, [item]);
    }
  }

  return map;
}

function jobMaterialCostExceedsCollectedRevenue(
  snapshot: ReturnType<typeof computeJobProfitability>,
): boolean {
  const { materialCogs } = snapshot.costs;
  if (materialCogs <= 0) {
    return false;
  }

  return materialCogs > snapshot.revenue.collected;
}

async function deriveJobLevelOperationalCounts(
  companyId: string,
): Promise<JobLevelOperationalCounts> {
  const [jobs, invoices, estimates, expenses, laborEntries, materials] =
    await Promise.all([
      listJobs(companyId),
      listInvoices(companyId),
      listEstimates(companyId),
      listExpenses(companyId),
      listTimeEntries(companyId, { entryType: "job_labor" }),
      listJobMaterialsForCompany(companyId),
    ]);

  const jobIds = new Set(jobs.map((job) => job.id));
  const invoicesByJob = groupByJobId(invoices, jobIds);
  const estimatesByJob = groupByJobId(estimates, jobIds);
  const expensesByJob = groupByJobId(expenses, jobIds);
  const laborByJob = groupByJobId(laborEntries, jobIds);
  const materialsByJob = groupByJobId(materials, jobIds);

  let materialCostExceedsCollectedCount = 0;

  for (const job of jobs) {
    const inputs: JobProfitabilityInputs = {
      invoices: (invoicesByJob.get(job.id) ?? []) as Invoice[],
      estimates: (estimatesByJob.get(job.id) ?? []) as Estimate[],
      expenses: (expensesByJob.get(job.id) ?? []) as Expense[],
      materials: (materialsByJob.get(job.id) ?? []) as JobMaterial[],
      laborEntries: (laborByJob.get(job.id) ?? []) as TimeEntry[],
    };

    const snapshot = computeJobProfitability(inputs);

    if (jobMaterialCostExceedsCollectedRevenue(snapshot)) {
      materialCostExceedsCollectedCount += 1;
    }
  }

  return {
    materialCostExceedsCollectedCount,
  };
}

function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural;
}

function addHighlight(
  highlights: DailyOperationsSummaryHighlight[],
  highlight: DailyOperationsSummaryHighlight,
): void {
  highlights.push(highlight);
}

function buildHighlights(input: {
  stalledCount: number;
  pendingExpenseCount: number;
  completedAwaitingInvoicingCount: number;
  completedWorkReviewCount: number;
  criticalCompletedWorkReviewCount: number;
  jobsWithWarnings: number;
  materialCostExceedsCollectedCount: number;
  todayPaymentCount: number;
  activeLaborEntries: number;
}): DailyOperationsSummaryHighlight[] {
  const highlights: DailyOperationsSummaryHighlight[] = [];

  if (input.stalledCount > 0) {
    const severity: DailyOperationsSummarySeverity =
      input.stalledCount >= 5 ? "critical" : "warning";
    addHighlight(highlights, {
      id: "stalled-jobs",
      severity,
      category: "stalled_jobs",
      count: input.stalledCount,
      message: `${input.stalledCount} ${pluralize(input.stalledCount, "job")} may be stalled.`,
      href: "/reports",
    });
  }

  if (input.completedAwaitingInvoicingCount > 0) {
    addHighlight(highlights, {
      id: "completed-awaiting-invoicing",
      severity: "warning",
      category: "invoicing",
      count: input.completedAwaitingInvoicingCount,
      message: `${input.completedAwaitingInvoicingCount} completed ${pluralize(input.completedAwaitingInvoicingCount, "job")} ${input.completedAwaitingInvoicingCount === 1 ? "is" : "are"} awaiting invoicing.`,
      href: "/reports",
    });
  }

  if (input.completedWorkReviewCount > 0) {
    const severity: DailyOperationsSummarySeverity =
      input.criticalCompletedWorkReviewCount > 0 ? "critical" : "warning";
    addHighlight(highlights, {
      id: "completed-work-review",
      severity,
      category: "completed_work_review",
      count: input.completedWorkReviewCount,
      message: `${input.completedWorkReviewCount} completed ${pluralize(input.completedWorkReviewCount, "job")} ${input.completedWorkReviewCount === 1 ? "needs" : "need"} office review before admin closure.`,
      href: "/reports",
    });
  }

  if (input.pendingExpenseCount > 0) {
    addHighlight(highlights, {
      id: "pending-expenses",
      severity: input.pendingExpenseCount >= 10 ? "warning" : "info",
      category: "expenses",
      count: input.pendingExpenseCount,
      message: `${input.pendingExpenseCount} ${pluralize(input.pendingExpenseCount, "expense")} ${input.pendingExpenseCount === 1 ? "is" : "are"} still pending review.`,
      href: "/expenses",
    });
  }

  if (input.materialCostExceedsCollectedCount > 0) {
    addHighlight(highlights, {
      id: "material-cost-exceeds-collected",
      severity: "critical",
      category: "profitability",
      count: input.materialCostExceedsCollectedCount,
      message: `Material costs exceeded collected revenue on ${input.materialCostExceedsCollectedCount} ${pluralize(input.materialCostExceedsCollectedCount, "job")}.`,
      href: "/reports",
    });
  }

  if (input.jobsWithWarnings > 0) {
    addHighlight(highlights, {
      id: "profitability-data-warnings",
      severity: "warning",
      category: "profitability",
      count: input.jobsWithWarnings,
      message: `${input.jobsWithWarnings} ${pluralize(input.jobsWithWarnings, "job")} ${input.jobsWithWarnings === 1 ? "has" : "have"} profitability data completeness warnings.`,
      href: "/reports",
    });
  }

  if (input.todayPaymentCount > 0) {
    addHighlight(highlights, {
      id: "payments-today",
      severity: "info",
      category: "revenue",
      count: input.todayPaymentCount,
      message: `${input.todayPaymentCount} ${pluralize(input.todayPaymentCount, "payment")} collected today.`,
      href: "/invoices",
    });
  }

  if (input.activeLaborEntries > 0) {
    addHighlight(highlights, {
      id: "active-labor",
      severity: "info",
      category: "labor",
      count: input.activeLaborEntries,
      message: `${input.activeLaborEntries} open job-labor ${pluralize(input.activeLaborEntries, "clock")} right now.`,
      href: "/time",
    });
  }

  const severityOrder: Record<DailyOperationsSummarySeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return highlights.sort(
    (left, right) => severityOrder[left.severity] - severityOrder[right.severity],
  );
}

function collectLimitations(input: {
  reportLimitations: string[][];
  profitabilityWarnings: string[];
}): string[] {
  const seen = new Set<string>();
  const limitations: string[] = [];

  for (const group of [...input.reportLimitations, input.profitabilityWarnings]) {
    for (const limitation of group) {
      if (!seen.has(limitation)) {
        seen.add(limitation);
        limitations.push(limitation);
      }
    }
  }

  limitations.push(
    "Summary highlights are rules-based counts from existing reports; no AI inference or predictions.",
  );

  return limitations;
}

/**
 * Read-only daily operations summary composed from existing report services.
 *
 * TODO: AI-generated narrative summaries layered on top of this object.
 * TODO: AI recommendations (dispatch, billing, cost recovery) with human review.
 * TODO: Predictive operational alerts (stall risk, margin erosion) — separate pipeline.
 * TODO: Owner morning digest emails using this summary as the structured payload.
 */
export async function getDailyOperationsSummary(
  companyId: string,
): Promise<DailyOperationsSummary> {
  const [
    revenueReport,
    expenseReport,
    jobActivityReport,
    stalledJobsReport,
    technicianLaborReport,
    profitabilityReport,
    paymentsToday,
    completedWorkReport,
    completedWorkReviewReport,
    jobLevelCounts,
    reviewIssuesResolvedThisWeek,
  ] = await Promise.all([
    getCompanyRevenueReport(companyId, REPORT_OPTIONS),
    getCompanyExpenseReport(companyId, REPORT_OPTIONS),
    getCompanyJobActivityReport(companyId, REPORT_OPTIONS),
    getCompanyStalledJobsReport(companyId),
    getCompanyTechnicianLaborReport(companyId, REPORT_OPTIONS),
    getCompanyProfitabilityReport(companyId, REPORT_OPTIONS),
    getPaymentsTodaySummary(companyId),
    getCompanyCompletedWorkReport(companyId),
    getCompanyCompletedWorkReviewReport(companyId),
    deriveJobLevelOperationalCounts(companyId),
    getJobReviewBlockerResolutionsThisWeekCount(companyId),
  ]);

  const sections = {
    revenue: {
      collectedRevenue: revenueReport.summary.collectedRevenue,
      outstandingRevenue: revenueReport.summary.outstandingRevenue,
      todayCollectedRevenue: paymentsToday.total,
      todayPaymentCount: paymentsToday.count,
    },
    openJobs: {
      count: jobActivityReport.summary.openJobs,
    },
    stalledJobs: {
      count: stalledJobsReport.summary.stalledCount,
      inactivityThresholdDays:
        stalledJobsReport.summary.inactivityThresholdDays,
      stalledJobs: stalledJobsReport.summary.stalledJobs,
    },
    pendingExpenses: {
      count: expenseReport.summary.submitted.count,
      totalAmount: expenseReport.summary.submitted.totalAmount,
    },
    activeTechnicians: {
      activeLaborEntries: technicianLaborReport.summary.activeLaborEntries,
      technicianCount: technicianLaborReport.summary.technicianCount,
    },
    completedAwaitingInvoicing: {
      count: completedWorkReport.summary.count,
      jobs: completedWorkReport.summary.jobs,
    },
    completedWorkReview: {
      count: completedWorkReviewReport.summary.count,
      jobs: completedWorkReviewReport.summary.jobs,
      resolvedThisWeek: reviewIssuesResolvedThisWeek,
    },
    profitabilityWarnings: {
      jobsWithWarnings: profitabilityReport.summary.jobsWithWarnings,
      materialCostExceedsCollectedCount:
        jobLevelCounts.materialCostExceedsCollectedCount,
    },
  };

  const highlights = buildHighlights({
    stalledCount: sections.stalledJobs.count,
    pendingExpenseCount: sections.pendingExpenses.count,
    completedAwaitingInvoicingCount:
      sections.completedAwaitingInvoicing.count,
    completedWorkReviewCount: sections.completedWorkReview.count,
    criticalCompletedWorkReviewCount: sections.completedWorkReview.jobs.filter(
      (job) => job.severity === "critical",
    ).length,
    jobsWithWarnings: sections.profitabilityWarnings.jobsWithWarnings,
    materialCostExceedsCollectedCount:
      sections.profitabilityWarnings.materialCostExceedsCollectedCount,
    todayPaymentCount: sections.revenue.todayPaymentCount,
    activeLaborEntries: sections.activeTechnicians.activeLaborEntries,
  });

  return {
    generatedAt: new Date().toISOString(),
    sections,
    highlights,
    limitations: collectLimitations({
      reportLimitations: [
        revenueReport.meta.limitations,
        expenseReport.meta.limitations,
        jobActivityReport.meta.limitations,
        stalledJobsReport.meta.limitations,
        technicianLaborReport.meta.limitations,
        completedWorkReport.meta.limitations,
        completedWorkReviewReport.meta.limitations,
      ],
      profitabilityWarnings: profitabilityReport.meta.completenessWarnings,
    }),
  };
}

/** Exported for tests and future AI enrichment hooks. */
export { deriveJobLevelOperationalCounts, jobMaterialCostExceedsCollectedRevenue };
