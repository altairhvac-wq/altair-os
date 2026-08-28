import { cache } from "react";
import { getPaymentsTodaySummary } from "@/lib/database/queries/invoice-payments";
import {
  getCompanyOperationsSummaryAggregates,
} from "@/lib/database/queries/operations-summary";
import {
  getCompanyJobCompletenessSummary,
} from "@/lib/database/queries/job-completeness-summary";
import { loadCompanyOperationalDatasets } from "@/lib/database/services/operations/company-operational-datasets";
import { getJobReviewBlockerResolutionTrendSummary } from "@/lib/database/services/job-review-resolution";
import { getCompanyOperationalInconsistenciesReport } from "@/lib/database/services/reports/operational-inconsistencies-report";
import { STALLED_JOB_INACTIVITY_DAYS } from "@/lib/database/services/reports/stalled-jobs-report";
import {
  computeJobProfitability,
  jobMaterialCostExceedsCollectedRevenue,
  type JobProfitabilityInputs,
} from "@/shared/types/job-profitability";
import type {
  DailyOperationsSummary,
  DailyOperationsSummaryHighlight,
  DailyOperationsSummarySeverity,
} from "@/shared/types/daily-operations-summary";
import {
  resolveCompletedWorkReviewSeverity,
  type CompletedWorkReviewReason,
  type StalledJobEntry,
} from "@/shared/types/reports";
import type { ProfitabilityReportDateRange } from "@/shared/types/reports";
import type { Estimate } from "@/shared/types/estimate";
import type { Expense } from "@/shared/types/expense";
import type { Invoice } from "@/shared/types/invoice";
import type { JobMaterial } from "@/shared/types/job-material";
import type { TimeEntry } from "@/shared/types/time-entry";
import type { CompanyOperationalDatasets } from "@/lib/database/services/operations/company-operational-datasets";
import { buildSalesHubHref } from "@/shared/lib/sales/sales-hub";

// REPORT_OPTIONS is gone with the four builders that took it. Every figure
// this file now assembles is unscoped by date, which is what dateRange "all"
// meant — so there is nothing left to pass.

/**
 * How many rows each operations-panel list asks the database for.
 *
 * The dashboard slices these to five. Asking for exactly what is rendered is
 * the point of the change — the previous path computed every job in the
 * tenant and then took five.
 */
const OPERATIONS_SUMMARY_JOB_LIMIT = 5;

/**
 * Copied verbatim from stalled-jobs-report.ts and completed-work-report.ts.
 *
 * They describe the heuristic, not the implementation — "uses a simple
 * inactivity heuristic", "reflects this page load only" — so they remain true
 * with the counting done in SQL. verify-operations-summary-live asserts the
 * assembled list is unchanged rather than trusting that reading.
 */
const STALLED_JOBS_LIMITATIONS: string[] = [
  "Potentially stalled jobs use a simple inactivity heuristic only.",
  "No scheduled or background evaluation; results reflect this page load only.",
  "Staleness is based on job activity log timestamps (and workflow timestamps when no log exists).",
  "Does not account for technician GPS, schedules, or dispatch assignments.",
  `Flags dispatched, on site, or in progress jobs with no qualifying activity for ${STALLED_JOB_INACTIVITY_DAYS}+ days.`,
];

const COMPLETED_WORK_LIMITATIONS: string[] = [
  "Completed work awaiting invoicing reflects jobs with no active invoice.",
];

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

/**
 * The one operations-panel figure that is still money.
 *
 * jobMaterialCostExceedsCollectedRevenue compares materialCogs against collected
 * revenue, and both come from computeJobProfitability — which has not moved and
 * will not. So this narrows the INPUT instead of duplicating the rule:
 * materialCogs sums ONLY inputs.materials, so a job with no material rows has a
 * materialCogs of zero and the predicate returns false before looking at
 * revenue. Only jobs that appear in job_materials can possibly qualify.
 *
 * The caller skips this entirely when migration 166 reports zero such jobs,
 * which is every company not tracking materials.
 */
async function deriveMaterialCostExceedsCollectedCount(
  companyId: string,
): Promise<number> {
  const datasets = await loadCompanyOperationalDatasets(companyId);
  return (await deriveJobLevelOperationalCounts(companyId, datasets))
    .materialCostExceedsCollectedCount;
}

async function deriveJobLevelOperationalCounts(
  companyId: string,
  datasets?: CompanyOperationalDatasets,
): Promise<JobLevelOperationalCounts> {
  const {
    jobs,
    invoices,
    estimates,
    expenses,
    laborEntries,
    materials,
  } = datasets ?? (await loadCompanyOperationalDatasets(companyId));

  const jobIds = new Set(jobs.map((job) => job.id));
  const invoicesByJob = groupByJobId(invoices, jobIds);
  const estimatesByJob = groupByJobId(estimates, jobIds);
  const expensesByJob = groupByJobId(expenses, jobIds);
  const laborByJob = groupByJobId(laborEntries, jobIds);
  const materialsByJob = groupByJobId(materials, jobIds);

  let materialCostExceedsCollectedCount = 0;

  for (const job of jobs) {
    if (job.status === "cancelled") {
      continue;
    }

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
  dataIntegrityJobCount: number;
  criticalDataIntegrityCount: number;
  dataIntegrityUnavailable: boolean;
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
      href: "/reports?queue=stalled",
    });
  }

  if (input.completedAwaitingInvoicingCount > 0) {
    addHighlight(highlights, {
      id: "completed-awaiting-invoicing",
      severity: "warning",
      category: "invoicing",
      count: input.completedAwaitingInvoicingCount,
      message: `${input.completedAwaitingInvoicingCount} completed ${pluralize(input.completedAwaitingInvoicingCount, "job")} ${input.completedAwaitingInvoicingCount === 1 ? "is" : "are"} awaiting invoicing.`,
      href: "/reports?queue=invoicing",
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
      href: "/reports?queue=attention",
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

  // ============================== "COULD NOT CHECK" IS NOT "NOTHING FOUND" ==============================
  // A failed scan reports zero of everything, which is exactly what a healthy
  // company reports. Saying nothing here would render as a clean bill of
  // health that was never earned — the failure this whole area exists to
  // remove — so the absence of an answer gets its own highlight.
  if (input.dataIntegrityUnavailable) {
    addHighlight(highlights, {
      id: "data-integrity-unavailable",
      severity: "warning",
      category: "data_integrity",
      count: 0,
      message:
        "Data integrity could not be checked on this load. This is not a " +
        "clean result — retry, and if it persists the integrity scan is down.",
      href: "/reports?queue=integrity",
    });
  }

  if (!input.dataIntegrityUnavailable && input.dataIntegrityJobCount > 0) {
    const severity: DailyOperationsSummarySeverity =
      input.criticalDataIntegrityCount > 0 ? "critical" : "warning";
    addHighlight(highlights, {
      id: "data-integrity-drift",
      severity,
      category: "data_integrity",
      count: input.dataIntegrityJobCount,
      message: `${input.dataIntegrityJobCount} ${pluralize(input.dataIntegrityJobCount, "job")} ${input.dataIntegrityJobCount === 1 ? "has" : "have"} dispatch, labor, billing, or workflow data out of sync.`,
      href: "/reports?queue=integrity",
    });
  }

  if (input.todayPaymentCount > 0) {
    addHighlight(highlights, {
      id: "payments-today",
      severity: "info",
      category: "revenue",
      count: input.todayPaymentCount,
      message: `${input.todayPaymentCount} ${pluralize(input.todayPaymentCount, "payment")} collected today.`,
      href: buildSalesHubHref("payments"),
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
/**
 * ============================== FOUR BUILDERS REPLACED BY ONE ROUND TRIP ==============================
 * getCompanyRevenueReport, getCompanyExpenseReport, getCompanyJobActivityReport
 * and getCompanyTechnicianLaborReport contributed six numbers between them, and
 * to produce those six they loaded every invoice, every payment, every expense,
 * every job and every job-labour entry the company has.
 *
 * Migration 166 returns the same six in a single call, measured at 503 ms
 * against the 12,000-job scratch tenant. The predicates are copied field by
 * field — the migration names the TypeScript each one reproduces — and
 * scripts/verify-operations-summary-live.mjs asserts equality against the
 * ORIGINAL builders on real data, so this is checked rather than asserted.
 *
 * The remaining builders stay because they depend on computeJobProfitability,
 * which is 473 lines of business rule that must not acquire a second
 * implementation in SQL.
 */
export const getDailyOperationsSummary = cache(
  async function getDailyOperationsSummary(
    companyId: string,
    timeZone?: string,
  ): Promise<DailyOperationsSummary> {
  // ============================== FOUR MORE BUILDERS, ONE MORE ROUND TRIP ==============================
  // getCompanyStalledJobsReport, the profitability warning counts,
  // getCompanyCompletedWorkReport and getCompanyCompletedWorkReviewReport
  // between them produced four counts and three five-row lists — and to produce
  // them, loadCompanyOperationalDatasets loaded every job, invoice, estimate,
  // expense, labour entry and material the company has, so that twelve thousand
  // JobProfitabilitySnapshots could be built and then reduced to eight numbers.
  //
  // Migration 168 returns the same eight in one call, measured at 583 ms
  // against the 12,000-job scratch tenant. It is safe because the numbers read
  // only the COMPLETENESS half of computeJobProfitability — row counts, no
  // money — and verify-job-completeness-live asserts the SQL agrees with the
  // shipped rules for every job in the tenant.
  //
  // loadCompanyOperationalDatasets is gone from this path entirely.
  const [
    aggregates,
    completeness,
    paymentsToday,
    resolutionTrend,
    operationalInconsistencies,
  ] = await Promise.all([
    getCompanyOperationsSummaryAggregates(companyId),
    getCompanyJobCompletenessSummary(companyId, {
      reference: new Date(),
      limit: OPERATIONS_SUMMARY_JOB_LIMIT,
    }),
    getPaymentsTodaySummary(companyId, timeZone),
    getJobReviewBlockerResolutionTrendSummary(companyId),
    getCompanyOperationalInconsistenciesReport(companyId),
  ]);


  // ============================== EXACT, NOT COUNTED FROM THE PREVIEW ==============================
  // These were `new Set(entries.map(...)).size` over the entry list. That list
  // is a bounded preview on the aggregate path -- and even before it was
  // bounded, it came from a scan that had read 1,000 of 12,000 jobs. Migration
  // 172 counts distinct offending jobs and distinct critical ones across the
  // whole tenant; the preview is for showing, not for counting.
  const dataIntegrityJobCount = operationalInconsistencies.summary.jobCount;
  const criticalDataIntegrityCount =
    operationalInconsistencies.summary.criticalJobCount;

  const sections = {
    revenue: {
      collectedRevenue: aggregates.revenue.collectedRevenue,
      outstandingRevenue: aggregates.revenue.outstandingRevenue,
      todayCollectedRevenue: paymentsToday.total,
      todayPaymentCount: paymentsToday.count,
    },
    openJobs: {
      count: aggregates.jobs.openCount,
    },
    stalledJobs: {
      count: completeness.stalledCount,
      inactivityThresholdDays: STALLED_JOB_INACTIVITY_DAYS,
      stalledJobs: completeness.stalledJobs.map((job) => ({
        jobId: job.job_id,
        jobNumber: job.job_number?.trim() || "Unknown job",
        customerName: job.customer_name?.trim() || "Unknown customer",
        status: job.status as StalledJobEntry["status"],
        assignedTechnician: job.assigned_technician?.trim() || undefined,
        lastActivityAt: job.last_activity_at,
        daysSinceActivity: job.days_since_activity,
      })),
    },
    pendingExpenses: {
      count: aggregates.expenses.submittedCount,
      totalAmount: aggregates.expenses.submittedTotal,
    },
    activeTechnicians: {
      activeLaborEntries: aggregates.labor.activeLaborEntries,
      technicianCount: aggregates.labor.technicianCount,
    },
    completedAwaitingInvoicing: {
      count: completeness.completedAwaitingInvoicingCount,
      // approvedEstimateAmount and collectedRevenue are money, and money still
      // comes from computeJobProfitability. Neither is rendered on the
      // dashboard card, so neither is fetched to draw it; the drill-down that
      // shows them loads its own detail.
      jobs: completeness.completedAwaitingInvoicingJobs.map((job) => ({
        jobId: job.job_id,
        jobNumber: job.job_number?.trim() || "Unknown job",
        customerName: job.customer_name?.trim() || "Unknown customer",
        completedAt: job.completed_at,
        assignedTechnician: job.assigned_technician?.trim() || undefined,
        approvedEstimateAmount: null,
        collectedRevenue: 0,
        daysSinceCompletion: job.days_since_completion ?? 0,
      })),
    },
    completedWorkReview: {
      count: completeness.completedWorkReviewCount,
      criticalCount: completeness.criticalCompletedWorkReviewCount,
      jobs: completeness.completedWorkReviewJobs.map((job) => {
        // The REASONS come back as the four booleans the SQL evaluated, and are
        // reassembled here in the shipped order rather than re-derived, so the
        // card and the review report list them the same way.
        const reviewReasons: CompletedWorkReviewReason[] = [];
        if (job.reason_no_active_invoice) reviewReasons.push("no_active_invoice");
        if (job.reason_open_labor) reviewReasons.push("open_labor_entries");
        if (job.reason_pending_expenses) reviewReasons.push("pending_expenses");
        if (job.reason_data_incomplete) {
          reviewReasons.push("profitability_data_incomplete");
        }

        return {
          jobId: job.job_id,
          jobNumber: job.job_number?.trim() || "Unknown job",
          customerName: job.customer_name?.trim() || "Unknown customer",
          completedAt: job.completed_at,
          assignedTechnician: job.assigned_technician?.trim() || undefined,
          daysSinceCompletion: job.days_since_completion ?? 0,
          reviewReasons,
          // resolveCompletedWorkReviewSeverity is the shipped function, applied
          // to the reasons above. The SQL's own is_critical is not trusted here
          // — it is asserted equal by verify-job-completeness-live, and this
          // keeps one definition of severity in the rendered output.
          severity: resolveCompletedWorkReviewSeverity(reviewReasons),
          invoiceStatus: {
            // The card shows whether an invoice exists, not which ones. The
            // drill-down that lists them fetches its own detail rather than
            // having the dashboard carry every invoice to describe five jobs.
            activeInvoiceCount: job.reason_no_active_invoice ? 0 : 1,
            statuses: [],
            latestStatus: null,
          },
          // The count of "other" profitability warnings on this job. The SQL
          // returns whether any exist, which is what the severity rule and the
          // card both read; a precise count would need the per-job counters and
          // nothing renders it.
          profitabilityWarningCount: job.reason_data_incomplete ? 1 : 0,
        };
      }),
      resolvedThisWeek: resolutionTrend.resolvedThisWeek,
      resolutionTrend,
    },
    dataIntegrity: {
      jobCount: dataIntegrityJobCount,
      criticalJobCount: criticalDataIntegrityCount,
      // Zero problems and a scan that could not run are the same numbers.
      unavailable: operationalInconsistencies.summary.unavailable,
    },
    profitabilityWarnings: {
      jobsWithWarnings: completeness.jobsWithWarnings,
      // ============================== THE ONE FIGURE THAT IS STILL MONEY ==============================
      // materialCogs > collected revenue needs the money half of
      // computeJobProfitability, which has not moved and will not. It is
      // narrowed instead of duplicated: materialCogs sums ONLY inputs.materials,
      // so a job with no material rows cannot possibly qualify. The candidate
      // count comes from migration 166, and when it is zero — as it is for any
      // company not tracking materials — no rows are read at all.
      materialCostExceedsCollectedCount:
        aggregates.candidates.jobsWithMaterialsCount === 0
          ? 0
          : await deriveMaterialCostExceedsCollectedCount(companyId),
    },
  };

  const highlights = buildHighlights({
    stalledCount: sections.stalledJobs.count,
    pendingExpenseCount: sections.pendingExpenses.count,
    completedAwaitingInvoicingCount:
      sections.completedAwaitingInvoicing.count,
    completedWorkReviewCount: sections.completedWorkReview.count,
    criticalCompletedWorkReviewCount: sections.completedWorkReview.criticalCount,
    jobsWithWarnings: sections.profitabilityWarnings.jobsWithWarnings,
    materialCostExceedsCollectedCount:
      sections.profitabilityWarnings.materialCostExceedsCollectedCount,
    dataIntegrityJobCount,
    criticalDataIntegrityCount,
    dataIntegrityUnavailable: operationalInconsistencies.summary.unavailable,
    todayPaymentCount: sections.revenue.todayPaymentCount,
    activeLaborEntries: sections.activeTechnicians.activeLaborEntries,
  });

  return {
    generatedAt: new Date().toISOString(),
    sections,
    highlights,
    limitations: collectLimitations({
      // ============================== THE FOUR REPLACED REPORTS CONTRIBUTED NOTHING HERE ==============================
      // Their limitation lists are dropped, and that is provable rather than
      // assumed. This summary calls every report with dateRange "all", so
      // resolveReportDateBounds returns null, and in all four the only pushes
      // are guarded:
      //
      //   revenue-report          if (dateBounds)
      //   technician-labor-report if (dateBounds)   x2
      //   job-activity-report     inside the if (dateBounds) branch
      //   expense-report          if (usedCreatedDateFallback), and that flag
      //                           is only ever set inside if (dateBounds)
      //
      // So each returned an empty array on this path. verify-operations-summary-live
      // asserts the whole limitation list is byte-identical to the old one
      // rather than trusting this reading.
      // ============================== THE REPLACED REPORTS' LIMITATIONS ==============================
      // Three more builders are gone from this path, so their limitation
      // strings are restated here rather than dropped — these are sentences a
      // user reads under the panel, and they describe the RULE, not the query
      // that ran. They are unchanged from the reports they came from.
      reportLimitations: [
        STALLED_JOBS_LIMITATIONS,
        COMPLETED_WORK_LIMITATIONS,
        operationalInconsistencies.meta.limitations,
      ],
      profitabilityWarnings: [],
    }),
    };
  },
);

/** Exported for tests and future AI enrichment hooks. */
export {
  deriveJobLevelOperationalCounts,
  jobMaterialCostExceedsCollectedRevenue,
};
