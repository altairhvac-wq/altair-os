import { isSameCalendarDayInTimeZone } from "@/shared/lib/datetime";
import type { DispatchJobStatus } from "@/shared/types/dispatch";
import { isScheduledToday } from "@/shared/types/dispatch";
import type { TechnicianJob } from "@/shared/types/technician";

type ActiveJobStatus = Extract<
  DispatchJobStatus,
  "in_progress" | "arrived" | "dispatched" | "scheduled"
>;

const ACTIVE_STATUS_ORDER: Record<ActiveJobStatus, number> = {
  in_progress: 0,
  arrived: 1,
  dispatched: 2,
  scheduled: 3,
};

export function isTechnicianJobScheduledToday(
  job: TechnicianJob,
  reference = new Date(),
  timeZone?: string,
): boolean {
  return isScheduledToday(job.scheduledDate, reference, timeZone);
}

export function isActiveTechnicianJob(job: TechnicianJob): boolean {
  return job.status !== "completed" && job.status !== "cancelled";
}

export function isTechnicianJobCompletedToday(
  job: TechnicianJob,
  reference = new Date(),
  timeZone?: string,
): boolean {
  if (job.status !== "completed") {
    return false;
  }

  // Today-scoped technician queues are scheduled for the reference day. A
  // completed appointment belongs in "Completed today" even when completed_at is
  // missing or normalizes to a different calendar day.
  if (isTechnicianJobScheduledToday(job, reference, timeZone)) {
    return true;
  }

  const completedAt = job.completedAt ?? job.scheduledDate;
  return isSameCalendarDayInTimeZone(completedAt, reference, timeZone);
}

function getActiveStatusOrder(status: TechnicianJob["status"]): number {
  if (status in ACTIVE_STATUS_ORDER) {
    return ACTIVE_STATUS_ORDER[status as ActiveJobStatus];
  }

  return 99;
}

function compareActiveJobs(a: TechnicianJob, b: TechnicianJob): number {
  const statusDiff = getActiveStatusOrder(a.status) - getActiveStatusOrder(b.status);

  if (statusDiff !== 0) {
    return statusDiff;
  }

  return (
    new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );
}

export function sortActiveTechnicianJobs(jobs: TechnicianJob[]): TechnicianJob[] {
  return jobs.filter(isActiveTechnicianJob).sort(compareActiveJobs);
}

export function groupTechnicianWorkQueue(jobs: TechnicianJob[]) {
  const sorted = sortActiveTechnicianJobs(jobs);

  return {
    currentJobs: sorted.filter((job) => job.status === "in_progress"),
    upNextJobs: sorted.filter((job) => job.status !== "in_progress"),
  };
}

export function sortCompletedTodayTechnicianJobs(
  jobs: TechnicianJob[],
  reference = new Date(),
  timeZone?: string,
): TechnicianJob[] {
  return jobs
    .filter((job) => isTechnicianJobCompletedToday(job, reference, timeZone))
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? b.scheduledDate).getTime() -
        new Date(a.completedAt ?? a.scheduledDate).getTime(),
    );
}
