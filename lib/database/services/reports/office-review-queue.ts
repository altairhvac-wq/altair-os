import { listJobs } from "@/lib/database/queries/jobs";
import { getCompanyCompletedWorkReport } from "@/lib/database/services/reports/completed-work-report";
import { getCompanyCompletedWorkReviewReport } from "@/lib/database/services/reports/completed-work-review-report";
import { getCompanyStalledJobsReport } from "@/lib/database/services/reports/stalled-jobs-report";
import { getJobReviewBlockerResolutionTrendSummary } from "@/lib/database/services/job-review-resolution";
import {
  buildOfficeReviewQueueReport,
  type OfficeReviewQueueReport,
  type OfficeReviewQueueSortMode,
} from "@/shared/types/office-review-queue";

export async function getCompanyOfficeReviewQueueReport(
  companyId: string,
  options?: { sortMode?: OfficeReviewQueueSortMode },
): Promise<OfficeReviewQueueReport> {
  const [
    completedWorkReview,
    awaitingInvoicing,
    stalledJobs,
    resolutionTrend,
    jobs,
  ] = await Promise.all([
    getCompanyCompletedWorkReviewReport(companyId),
    getCompanyCompletedWorkReport(companyId),
    getCompanyStalledJobsReport(companyId),
    getJobReviewBlockerResolutionTrendSummary(companyId),
    listJobs(companyId),
  ]);

  const customerIdByJobId = new Map(
    jobs.map((job) => [job.id, job.customerId]),
  );

  return buildOfficeReviewQueueReport({
    completedWorkReview,
    awaitingInvoicing,
    stalledJobs,
    resolutionTrend,
    customerIdByJobId,
    sortMode: options?.sortMode,
  });
}
