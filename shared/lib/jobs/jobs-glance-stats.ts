import {
  formatJobStatus,
  type Job,
  type JobStatus,
} from "@/shared/types/job";

export const JOB_GLANCE_STATUS_ORDER: JobStatus[] = [
  "scheduled",
  "dispatched",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
];

export type JobsGlanceStat = {
  id: string;
  label: string;
  value: string;
  detail: string;
  /** When set, clicking the stat filters the current view by this status. */
  filterStatus?: JobStatus;
};

/**
 * Builds compact status glance stats for the Jobs list header.
 * Counts are scoped to the current view's job set (Today or All) after
 * lifecycle filtering — not the whole company across both views.
 */
export function buildJobsGlanceStats(input: {
  jobs: ReadonlyArray<Job>;
}): JobsGlanceStat[] {
  const counts = Object.fromEntries(
    JOB_GLANCE_STATUS_ORDER.map((status) => [status, 0]),
  ) as Record<JobStatus, number>;

  for (const job of input.jobs) {
    counts[job.status] += 1;
  }

  return JOB_GLANCE_STATUS_ORDER.map((status) => {
    const count = counts[status];
    const label = formatJobStatus(status);

    return {
      id: status,
      label,
      value: String(count),
      detail:
        count === 0
          ? `No ${label.toLowerCase()} jobs in this view`
          : `${label} jobs in the current view`,
      filterStatus: status,
    };
  });
}
