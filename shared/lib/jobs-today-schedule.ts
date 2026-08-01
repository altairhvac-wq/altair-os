import type { Job } from "@/shared/types/job";
import { formatScheduledTime } from "@/shared/types/job";
import { getTeamMemberInitials } from "@/shared/types/team-member";
import type { JobScheduleRowModel } from "@/shared/components/jobs/JobScheduleRow";

/** Multi-hour holes between consecutive jobs get a lightweight visual break. */
export const JOBS_TODAY_SCHEDULE_GAP_MS = 2 * 60 * 60 * 1000;

export type JobsTodayScheduleJobItem = {
  kind: "job";
  job: Job;
};

export type JobsTodayScheduleNowItem = {
  kind: "now";
  timeLabel: string;
};

export type JobsTodayScheduleGapItem = {
  kind: "gap";
  label: string;
};

export type JobsTodayScheduleItem =
  | JobsTodayScheduleJobItem
  | JobsTodayScheduleNowItem
  | JobsTodayScheduleGapItem;

export function isJobUnassigned(job: Job): boolean {
  return !job.assignedTechnicianId;
}

export function compareJobsByScheduledTime(a: Job, b: Job): number {
  const aMs = Date.parse(a.scheduledDate);
  const bMs = Date.parse(b.scheduledDate);
  const aValid = !Number.isNaN(aMs);
  const bValid = !Number.isNaN(bMs);

  if (aValid && bValid && aMs !== bMs) {
    return aMs - bMs;
  }
  if (aValid !== bValid) {
    return aValid ? -1 : 1;
  }

  return a.jobNumber.localeCompare(b.jobNumber);
}

/** Chronological day-board order (earliest scheduled first). */
export function sortJobsByScheduledTime(jobs: Job[]): Job[] {
  return [...jobs].sort(compareJobsByScheduledTime);
}

function formatGapLabel(gapMs: number): string {
  const totalMinutes = Math.round(gapMs / (60 * 1000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min open`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} hr open`;
  }
  return `${hours} hr ${minutes} min open`;
}

/**
 * Builds a day-at-a-glance list: jobs in schedule order, a “now” marker
 * where the clock falls, and optional multi-hour gap breaks.
 * Pass `preserveOrder` when the caller already ranked jobs (e.g. search).
 */
export function buildJobsTodayScheduleItems(
  jobs: Job[],
  options: {
    now?: Date;
    timeZone?: string;
    /** Skip chrono sort + now/gap markers (search ranking). */
    preserveOrder?: boolean;
  } = {},
): JobsTodayScheduleItem[] {
  if (options.preserveOrder) {
    return jobs.map((job) => ({ kind: "job" as const, job }));
  }

  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const sorted = sortJobsByScheduledTime(jobs);
  const items: JobsTodayScheduleItem[] = [];
  let nowInserted = false;

  for (let index = 0; index < sorted.length; index += 1) {
    const job = sorted[index]!;
    const jobMs = Date.parse(job.scheduledDate);
    const jobIsAfterNow = !Number.isNaN(jobMs) && jobMs > nowMs;

    if (!nowInserted && jobIsAfterNow) {
      items.push({
        kind: "now",
        timeLabel: formatScheduledTime(now.toISOString(), options.timeZone),
      });
      nowInserted = true;
    } else if (index > 0) {
      const previous = sorted[index - 1]!;
      const previousMs = Date.parse(previous.scheduledDate);
      if (
        !Number.isNaN(previousMs) &&
        !Number.isNaN(jobMs) &&
        jobMs - previousMs >= JOBS_TODAY_SCHEDULE_GAP_MS
      ) {
        items.push({
          kind: "gap",
          label: formatGapLabel(jobMs - previousMs),
        });
      }
    }

    items.push({ kind: "job", job });
  }

  if (!nowInserted) {
    items.push({
      kind: "now",
      timeLabel: formatScheduledTime(now.toISOString(), options.timeZone),
    });
  }

  return items;
}

export function jobToScheduleRowModel(
  job: Job,
  options?: { timeZone?: string },
): JobScheduleRowModel {
  const unassigned = isJobUnassigned(job);
  const assigneeName = unassigned
    ? "Unassigned"
    : (job.assignedTechnician?.trim() || "Assigned");

  return {
    id: job.id,
    time: formatScheduledTime(job.scheduledDate, options?.timeZone),
    title: job.jobType?.trim() || job.jobNumber,
    address: job.serviceAddress?.trim() || "—",
    assigneeName,
    assigneeInitials: unassigned
      ? "?"
      : getTeamMemberInitials(assigneeName),
    status: job.status,
    isUnassigned: unassigned,
  };
}
