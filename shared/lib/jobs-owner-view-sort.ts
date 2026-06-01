import type { Job, JobPriority, JobStatus } from "@/shared/types/job";

const TERMINAL_JOB_STATUSES = new Set<JobStatus>(["completed", "cancelled"]);

/** Operational workflow order for owner/admin jobs lists. */
const JOB_STATUS_SORT_RANK: Record<JobStatus, number> = {
  scheduled: 20,
  dispatched: 30,
  arrived: 40,
  in_progress: 50,
  completed: 60,
  cancelled: 70,
};

/** Unassigned scheduled jobs surface before assigned scheduled work. */
const UNASSIGNED_SCHEDULED_SORT_RANK = 10;

const JOB_PRIORITY_SORT_RANK: Record<JobPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function getJobStatusSortRank(status: JobStatus): number {
  return JOB_STATUS_SORT_RANK[status];
}

function isJobUnassigned(job: Job): boolean {
  return !job.assignedTechnicianId && !job.assignedTechnician;
}

function getOwnerViewPrimarySortRank(job: Job): number {
  if (job.status === "scheduled" && isJobUnassigned(job)) {
    return UNASSIGNED_SCHEDULED_SORT_RANK;
  }

  return getJobStatusSortRank(job.status);
}

export function compareJobsForOwnerView(a: Job, b: Job): number {
  const rankDiff = getOwnerViewPrimarySortRank(a) - getOwnerViewPrimarySortRank(b);

  if (rankDiff !== 0) {
    return rankDiff;
  }

  if (TERMINAL_JOB_STATUSES.has(a.status)) {
    return (
      new Date(b.completedAt ?? b.scheduledDate).getTime() -
      new Date(a.completedAt ?? a.scheduledDate).getTime()
    );
  }

  const scheduleDiff =
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();

  if (scheduleDiff !== 0) {
    return scheduleDiff;
  }

  const priorityDiff =
    JOB_PRIORITY_SORT_RANK[a.priority] - JOB_PRIORITY_SORT_RANK[b.priority];

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return a.jobNumber.localeCompare(b.jobNumber);
}

export function sortJobsForOwnerView(jobs: Job[]): Job[] {
  return [...jobs].sort(compareJobsForOwnerView);
}
