import { getDayBoundsInTimeZone } from "@/shared/lib/datetime";
import type { JobStatus } from "@/shared/types/job";

/** Field-active jobs that stay on today's board until completed or rescheduled. */
export const ACTIVE_CARRYOVER_JOB_STATUSES = [
  "dispatched",
  "arrived",
  "in_progress",
] as const satisfies readonly JobStatus[];

const CARRYOVER_STATUS_SET = new Set<string>(ACTIVE_CARRYOVER_JOB_STATUSES);

export type OperationalDayJobFields = {
  status: JobStatus;
  scheduledDate: string;
  completedAt?: string | null;
};

export type ScheduledTodayOptions = {
  reference?: Date;
  timeZone?: string;
};

/**
 * Canonical operational-day window (company timezone).
 *
 * A non-cancelled job belongs on today's dispatch/technician board when ANY of:
 * 1. `scheduled_at` is within today's bounds (calendar-scheduled work)
 * 2. status is active carryover (`dispatched` | `arrived` | `in_progress`)
 * 3. status is `completed` and `completed_at` is within today's bounds
 */
export function getScheduledTodayBounds(
  options?: ScheduledTodayOptions,
): { start: string; end: string } {
  return getDayBoundsInTimeZone(
    options?.timeZone,
    options?.reference ?? new Date(),
  );
}

function isTimestampWithinOperationalDayBounds(
  timestamp: string,
  options?: ScheduledTodayOptions,
): boolean {
  const { start, end } = getScheduledTodayBounds(options);
  const value = new Date(timestamp).getTime();

  if (Number.isNaN(value)) {
    return false;
  }

  return (
    value >= new Date(start).getTime() && value <= new Date(end).getTime()
  );
}

/** Client-side mirror of `fetchOperationalDayJobRows` membership rules. */
export function isJobOnOperationalDay(
  job: OperationalDayJobFields,
  options?: ScheduledTodayOptions,
): boolean {
  if (job.status === "cancelled") {
    return false;
  }

  if (isTimestampWithinOperationalDayBounds(job.scheduledDate, options)) {
    return true;
  }

  if (CARRYOVER_STATUS_SET.has(job.status)) {
    return true;
  }

  if (
    job.status === "completed" &&
    job.completedAt &&
    isTimestampWithinOperationalDayBounds(job.completedAt, options)
  ) {
    return true;
  }

  return false;
}

export function sortRowsByScheduledAtAsc<
  T extends { scheduled_at: string },
>(rows: T[]): T[] {
  return [...rows].sort(
    (left, right) =>
      new Date(left.scheduled_at).getTime() -
      new Date(right.scheduled_at).getTime(),
  );
}

export function dedupeJobRowsById<T extends { id: string; scheduled_at: string }>(
  rows: T[],
): T[] {
  const byId = new Map<string, T>();

  for (const row of rows) {
    byId.set(row.id, row);
  }

  return sortRowsByScheduledAtAsc([...byId.values()]);
}
