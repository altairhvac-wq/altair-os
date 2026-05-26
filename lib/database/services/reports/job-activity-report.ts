import { listJobs } from "@/lib/database/queries/jobs";
import type { Job, JobStatus } from "@/shared/types/job";
import {
  buildReportSectionMeta,
  isDateWithinReportBounds,
  jobScheduledInReportRange,
  type JobActivityReport,
  type ProfitabilityReportDateRange,
  resolveReportDateBounds,
} from "@/shared/types/reports";

const CLOSED_JOB_STATUSES: ReadonlySet<JobStatus> = new Set([
  "completed",
  "cancelled",
]);

type JobActivityReportOptions = {
  dateRange?: ProfitabilityReportDateRange;
};

function roundCompletionRate(value: number): number {
  return Math.round(value * 100) / 100;
}

function jobCompletedInReportRange(
  job: Job,
  dateBounds: NonNullable<ReturnType<typeof resolveReportDateBounds>>,
): boolean {
  if (job.status !== "completed") {
    return false;
  }

  if (job.completedAt) {
    return isDateWithinReportBounds(job.completedAt, dateBounds);
  }

  return jobScheduledInReportRange(job, dateBounds);
}

export async function getCompanyJobActivityReport(
  companyId: string,
  options: JobActivityReportOptions = {},
): Promise<JobActivityReport> {
  const dateRange = options.dateRange ?? "30d";
  const dateBounds = resolveReportDateBounds(dateRange);
  const limitations: string[] = [];

  const jobs = await listJobs(companyId);

  const openJobs = jobs.filter((job) => !CLOSED_JOB_STATUSES.has(job.status))
    .length;

  if (dateBounds) {
    const jobsScheduled = jobs.filter((job) =>
      jobScheduledInReportRange(job, dateBounds),
    ).length;

    const jobsCompleted = jobs.filter((job) =>
      jobCompletedInReportRange(job, dateBounds),
    ).length;

    limitations.push(
      "Open jobs reflects your current backlog, not limited to the selected period.",
    );

    if (jobs.some((job) => job.status === "completed" && !job.completedAt)) {
      limitations.push(
        "Some completed jobs are counted by scheduled date when completion timestamp is missing.",
      );
    }

    if (jobsScheduled > 0) {
      limitations.push(
        "Completion rate compares jobs completed in period to jobs scheduled in period; these cohorts may differ.",
      );
    }

    return {
      summary: {
        jobsScheduled,
        jobsCompleted,
        openJobs,
        completionRatePercent:
          jobsScheduled > 0
            ? roundCompletionRate((jobsCompleted / jobsScheduled) * 100)
            : null,
      },
      meta: buildReportSectionMeta({
        dateRange,
        dateBounds,
        limitations,
      }),
    };
  }

  const jobsScheduled = jobs.length;
  const jobsCompleted = jobs.filter((job) => job.status === "completed").length;

  return {
    summary: {
      jobsScheduled,
      jobsCompleted,
      openJobs,
      completionRatePercent:
        jobsScheduled > 0
          ? roundCompletionRate((jobsCompleted / jobsScheduled) * 100)
          : null,
    },
    meta: buildReportSectionMeta({
      dateRange,
      dateBounds,
      limitations,
    }),
  };
}
