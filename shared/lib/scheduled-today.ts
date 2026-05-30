import {
  addDaysToDateOnly,
  DEFAULT_COMPANY_TIMEZONE,
  getDateOnlyInTimeZone,
  getDayBoundsInTimeZone,
} from "@/shared/lib/datetime";
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

export type OperationalWeekBounds = {
  start: string;
  end: string;
  weekStartDateOnly: string;
  weekEndDateOnly: string;
};

function getDayOfWeekInTimeZone(
  reference: Date,
  timeZone: string,
): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(reference);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? 0;
}

/** Monday–Sunday window in company timezone (Monday week start). */
export function getOperationalWeekBounds(
  options?: ScheduledTodayOptions,
): OperationalWeekBounds {
  const reference = options?.reference ?? new Date();
  const timeZone = options?.timeZone ?? DEFAULT_COMPANY_TIMEZONE;
  const todayDateOnly = getDateOnlyInTimeZone(reference, timeZone);
  const daysFromMonday = (getDayOfWeekInTimeZone(reference, timeZone) + 6) % 7;
  const weekStartDateOnly = addDaysToDateOnly(
    todayDateOnly,
    -daysFromMonday,
    timeZone,
  );
  const weekEndDateOnly = addDaysToDateOnly(weekStartDateOnly, 6, timeZone);
  const { start: weekStart } = getDayBoundsInTimeZone(
    timeZone,
    parseDateOnlyAtNoonUtc(weekStartDateOnly),
  );
  const { end: weekEnd } = getDayBoundsInTimeZone(
    timeZone,
    parseDateOnlyAtNoonUtc(weekEndDateOnly),
  );

  return {
    start: weekStart,
    end: weekEnd,
    weekStartDateOnly,
    weekEndDateOnly,
  };
}

function parseDateOnlyAtNoonUtc(dateOnly: string): Date {
  return new Date(`${dateOnly}T12:00:00.000Z`);
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

export type OperationalDayJobCounts = {
  scheduled: number;
  dispatched: number;
  /** On site or actively working (`arrived` + `in_progress`). */
  onSiteOrWorking: number;
  unassigned: number;
  completed: number;
  /** Non-cancelled jobs on today's board. */
  activeTotal: number;
};

/** Status breakdown for jobs already scoped to the operational day. */
export function getOperationalDayJobCounts<
  T extends OperationalDayJobFields & {
    technicianId?: string | null;
    assignedTechnicianId?: string | null;
  },
>(jobs: T[]): OperationalDayJobCounts {
  let scheduled = 0;
  let dispatched = 0;
  let onSiteOrWorking = 0;
  let unassigned = 0;
  let completed = 0;
  let activeTotal = 0;

  for (const job of jobs) {
    if (job.status === "cancelled") {
      continue;
    }

    activeTotal += 1;

    switch (job.status) {
      case "scheduled":
        scheduled += 1;
        break;
      case "dispatched":
        dispatched += 1;
        break;
      case "arrived":
      case "in_progress":
        onSiteOrWorking += 1;
        break;
      case "completed":
        completed += 1;
        break;
      default:
        break;
    }

    if (!job.technicianId && !job.assignedTechnicianId) {
      unassigned += 1;
    }
  }

  return {
    scheduled,
    dispatched,
    onSiteOrWorking,
    unassigned,
    completed,
    activeTotal,
  };
}
