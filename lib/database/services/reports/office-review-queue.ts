import { getDailyOperationsSummary } from "@/lib/database/services/operations/daily-operations-summary";
import { getJobSchedulingSnapshotsByIds } from "@/lib/database/queries/jobs";
import { getCompanyOperationalInconsistenciesReport } from "@/lib/database/services/reports/operational-inconsistencies-report";
import {
  buildOfficeReviewQueueReport,
  type OfficeReviewQueueReport,
  type OfficeReviewQueueSortMode,
} from "@/shared/types/office-review-queue";

/**
 * ============================== THIS RAN THE SAME WORK TWICE ==============================
 * It called getCompanyCompletedWorkReviewReport and getCompanyCompletedWorkReport
 * with no datasets argument, so each fell through to
 * loadCompanyOperationalDatasets — while getDailyOperationsSummary was building
 * exactly the same four sections on the same render. React cache() collapsed the
 * QUERIES, but not the twelve thousand JobProfitabilitySnapshots each one built.
 *
 * Both now read one summary. It is cache()d, so the dashboard's two consumers
 * share a single call rather than repeating the reduction.
 *
 * listJobs is gone too. It was here to map job ids to customer ids for the
 * queue's links — every job in the company, to label at most a few dozen rows.
 */
export async function getCompanyOfficeReviewQueueReport(
  companyId: string,
  options?: { sortMode?: OfficeReviewQueueSortMode },
): Promise<OfficeReviewQueueReport> {
  const [summary, operationalInconsistencies] = await Promise.all([
    getDailyOperationsSummary(companyId),
    getCompanyOperationalInconsistenciesReport(companyId),
  ]);

  // The queue builder reads only `summary`. `meta` carries the date-range
  // description the reports attached, and on this path the range was always
  // "all" with no bounds — so it is reproduced rather than fabricated.
  const emptyMeta = { dateRange: "all" as const, dateBounds: null, limitations: [] };

  const completedWorkReview = {
    summary: {
      count: summary.sections.completedWorkReview.count,
      jobs: summary.sections.completedWorkReview.jobs,
    },
    meta: emptyMeta,
  };
  const awaitingInvoicing = {
    summary: {
      count: summary.sections.completedAwaitingInvoicing.count,
      jobs: summary.sections.completedAwaitingInvoicing.jobs,
    },
    meta: emptyMeta,
  };
  const stalledJobs = {
    summary: {
      stalledCount: summary.sections.stalledJobs.count,
      stalledJobs: summary.sections.stalledJobs.stalledJobs,
      inactivityThresholdDays:
        summary.sections.stalledJobs.inactivityThresholdDays,
    },
    meta: emptyMeta,
  };
  const resolutionTrend = summary.sections.completedWorkReview.resolutionTrend;

  // Only the jobs actually on the queue need a customer id.
  const queueJobIds = [
    ...new Set([
      ...completedWorkReview.summary.jobs.map((job) => job.jobId),
      ...awaitingInvoicing.summary.jobs.map((job) => job.jobId),
      ...stalledJobs.summary.stalledJobs.map((job) => job.jobId),
      ...operationalInconsistencies.summary.entries.map((entry) => entry.jobId),
    ]),
  ];
  const jobsById = await getJobSchedulingSnapshotsByIds(companyId, queueJobIds);
  const customerIdByJobId = new Map<string, string>();
  for (const [jobId, job] of jobsById) {
    if (job.customerId) customerIdByJobId.set(jobId, job.customerId);
  }

  return buildOfficeReviewQueueReport({
    completedWorkReview,
    awaitingInvoicing,
    stalledJobs,
    operationalInconsistencies: operationalInconsistencies.summary.entries,
    // ============================== THE COUNTS COME FROM SQL, NOT THE PREVIEWS ==============================
    // Every list above is bounded: five jobs each from the completeness
    // summary, and a bounded page of jobs from the integrity scan. The queue
    // used to report `items.length` as its total, which meant the dashboard's
    // office-queue card described the size of a preview.
    sourceTotals: {
      completedWorkReview: summary.sections.completedWorkReview.count,
      criticalCompletedWorkReview:
        summary.sections.completedWorkReview.criticalCount,
      awaitingInvoicing: summary.sections.completedAwaitingInvoicing.count,
      stalledJobs: summary.sections.stalledJobs.count,
      integrityJobs: operationalInconsistencies.summary.jobCount,
      integrityCriticalJobs: operationalInconsistencies.summary.criticalJobCount,
      integrityMultiKindJobs:
        operationalInconsistencies.summary.multiKindJobCount,
    },
    resolutionTrend,
    customerIdByJobId,
    sortMode: options?.sortMode,
  });
}
