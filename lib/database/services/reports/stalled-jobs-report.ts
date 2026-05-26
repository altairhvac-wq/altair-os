import { listJobs } from "@/lib/database/queries/jobs";
import { listJobActivitiesForJobIds } from "@/lib/database/queries/operational-activities";
import type { Job, JobStatus } from "@/shared/types/job";
import {
  buildReportSectionMeta,
  type StalledJobEntry,
  type StalledJobsReport,
} from "@/shared/types/reports";

/** In-code threshold for V1; not user-configurable yet. */
export const STALLED_JOB_INACTIVITY_DAYS = 3;

const STALLED_CANDIDATE_STATUSES: ReadonlySet<JobStatus> = new Set([
  "dispatched",
  "arrived",
  "in_progress",
]);

function daysSinceActivity(
  timestamp: string,
  reference = new Date(),
): number {
  const elapsedMs = reference.getTime() - new Date(timestamp).getTime();
  if (!Number.isFinite(elapsedMs)) {
    return 0;
  }

  return Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));
}

function resolveLastActivityAt(
  job: Job,
  latestActivityByJobId: Map<string, string>,
): string {
  const fromActivityLog = latestActivityByJobId.get(job.id);
  if (fromActivityLog) {
    return fromActivityLog;
  }

  return job.workStartedAt ?? job.arrivedAt ?? job.createdAt;
}

function buildLatestActivityByJobId(
  activities: Awaited<ReturnType<typeof listJobActivitiesForJobIds>>,
): Map<string, string> {
  const latestByJobId = new Map<string, string>();

  for (const activity of activities) {
    if (!latestByJobId.has(activity.jobId)) {
      latestByJobId.set(activity.jobId, activity.createdAt);
    }
  }

  return latestByJobId;
}

function toStalledJobEntry(
  job: Job,
  lastActivityAt: string,
  reference: Date,
): StalledJobEntry | null {
  if (!job.id?.trim()) {
    return null;
  }

  return {
    jobId: job.id,
    jobNumber: job.jobNumber?.trim() || "Unknown job",
    customerName: job.customerName?.trim() || "Unknown customer",
    status: job.status,
    assignedTechnician: job.assignedTechnician?.trim() || undefined,
    lastActivityAt,
    daysSinceActivity: daysSinceActivity(lastActivityAt, reference),
  };
}

export async function getCompanyStalledJobsReport(
  companyId: string,
): Promise<StalledJobsReport> {
  const reference = new Date();
  const jobs = await listJobs(companyId);

  const candidateJobs = jobs.filter((job) =>
    STALLED_CANDIDATE_STATUSES.has(job.status),
  );

  const jobIds = candidateJobs.map((job) => job.id);
  const jobActivities = await listJobActivitiesForJobIds(companyId, jobIds);
  const latestActivityByJobId = buildLatestActivityByJobId(jobActivities);

  const stalledJobs = candidateJobs
    .map((job) => {
      const lastActivityAt = resolveLastActivityAt(job, latestActivityByJobId);
      return toStalledJobEntry(job, lastActivityAt, reference);
    })
    .filter((entry): entry is StalledJobEntry => entry != null)
    .filter(
      (entry) => entry.daysSinceActivity >= STALLED_JOB_INACTIVITY_DAYS,
    )
    .sort((a, b) => b.daysSinceActivity - a.daysSinceActivity);

  const limitations = [
    "Potentially stalled jobs use a simple inactivity heuristic only.",
    "No scheduled or background evaluation; results reflect this page load only.",
    "Staleness is based on job activity log timestamps (and workflow timestamps when no log exists).",
    "Does not account for technician GPS, schedules, or dispatch assignments.",
    `Flags dispatched, on site, or in progress jobs with no qualifying activity for ${STALLED_JOB_INACTIVITY_DAYS}+ days.`,
  ];

  // TODO(operational-intelligence-v2): Send automated reminders when jobs cross the stalled threshold.
  // TODO(operational-intelligence-v2): Generate AI operational summaries from stalled-job patterns.
  // TODO(operational-intelligence-v2): Surface smart dispatch recommendations for stalled assignments.

  return {
    summary: {
      stalledCount: stalledJobs.length,
      stalledJobs,
      inactivityThresholdDays: STALLED_JOB_INACTIVITY_DAYS,
    },
    meta: buildReportSectionMeta({
      dateRange: "all",
      dateBounds: null,
      limitations,
    }),
  };
}
