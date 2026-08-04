import {
  addDaysToDateOnly,
  getDateOnlyInTimeZone,
  parseDateInput,
} from "@/shared/lib/datetime";
import {
  getOperationalDayJobCounts,
  getOperationalWeekBounds,
  isJobOnOperationalDay,
  type OperationalDayJobCounts,
  type OperationalDayJobFields,
} from "@/shared/lib/scheduled-today";
import {
  getTechnicianTodayDateOnly,
  getTechnicianWeekDays,
  type TechnicianWeekDay,
} from "@/shared/lib/technician-week-schedule";
import type { JobStatus } from "@/shared/types/job";

export type ScheduleWeekJob = OperationalDayJobFields & {
  id: string;
  assignedTechnicianId?: string | null;
};

export type ScheduleWeekDaySummary = {
  day: TechnicianWeekDay;
  counts: OperationalDayJobCounts;
  /** True when any job that day has no assigned technician (same signal as isJobUnassigned). */
  hasUnassigned: boolean;
};

export type ScheduleWeekNavigation = {
  weekStartDateOnly: string;
  weekEndDateOnly: string;
  prevWeekDateOnly: string;
  nextWeekDateOnly: string;
  referenceDateOnly: string;
};

/** Dot fills aligned with DispatchTimeBlock BLOCK_STATUS_BADGE hues on dark Graphite. */
export const SCHEDULE_STATUS_DOT_CLASS = {
  scheduled: "bg-altair-information",
  dispatched: "bg-altair-information",
  onSiteOrWorking: "bg-altair-warning",
  completed: "bg-altair-success",
} as const;

export type ScheduleStatusMixKey = keyof typeof SCHEDULE_STATUS_DOT_CLASS;

export const SCHEDULE_STATUS_MIX_ORDER: ScheduleStatusMixKey[] = [
  "scheduled",
  "dispatched",
  "onSiteOrWorking",
  "completed",
];

export const SCHEDULE_STATUS_MIX_LABEL: Record<ScheduleStatusMixKey, string> = {
  scheduled: "Scheduled",
  dispatched: "En route",
  onSiteOrWorking: "On site / working",
  completed: "Completed",
};

export function resolveScheduleWeekReference(
  dateOnly: string | null,
  timeZone: string,
  now = new Date(),
): { reference: Date; referenceDateOnly: string } {
  const referenceDateOnly =
    dateOnly ?? getDateOnlyInTimeZone(now, timeZone);
  return {
    reference: parseDateInput(referenceDateOnly),
    referenceDateOnly,
  };
}

export function getScheduleWeekNavigation(
  referenceDateOnly: string,
  timeZone: string,
): ScheduleWeekNavigation {
  const { weekStartDateOnly, weekEndDateOnly } = getOperationalWeekBounds({
    timeZone,
    reference: parseDateInput(referenceDateOnly),
  });

  return {
    weekStartDateOnly,
    weekEndDateOnly,
    prevWeekDateOnly: addDaysToDateOnly(weekStartDateOnly, -7, timeZone),
    nextWeekDateOnly: addDaysToDateOnly(weekStartDateOnly, 7, timeZone),
    referenceDateOnly,
  };
}

/** Day membership shared by week strip and month grid bucketing. */
export function isJobOnScheduleDay(
  job: ScheduleWeekJob,
  dateOnly: string,
  context: { timeZone: string; todayDateOnly: string; reference: Date },
): boolean {
  if (job.status === "cancelled") {
    return false;
  }

  if (dateOnly === context.todayDateOnly) {
    return isJobOnOperationalDay(
      {
        status: job.status,
        scheduledDate: job.scheduledDate,
        completedAt: job.completedAt,
      },
      {
        timeZone: context.timeZone,
        reference: context.reference,
      },
    );
  }

  return (
    getDateOnlyInTimeZone(parseDateInput(job.scheduledDate), context.timeZone) ===
    dateOnly
  );
}

/**
 * Per-day counts across the Mon–Sun strip — getOperationalDayJobCounts applied per day.
 * `weekReference` selects which week; `now` drives today/carryover membership.
 */
export function buildScheduleWeekDaySummaries(
  jobs: ScheduleWeekJob[],
  timeZone: string,
  weekReference: Date,
  now = new Date(),
): ScheduleWeekDaySummary[] {
  const todayDateOnly = getTechnicianTodayDateOnly(timeZone, now);
  const weekDays = getTechnicianWeekDays(timeZone, weekReference).map((day) => ({
    ...day,
    isToday: day.dateOnly === todayDateOnly,
  }));
  const context = { timeZone, todayDateOnly, reference: now };

  return weekDays.map((day) => {
    const dayJobs = jobs.filter((job) =>
      isJobOnScheduleDay(job, day.dateOnly, context),
    );
    const counts = getOperationalDayJobCounts(dayJobs);

    return {
      day,
      counts,
      hasUnassigned: counts.unassigned > 0,
    };
  });
}

/** Use wall-clock `now` when the selected week contains today so carryover/completions stay correct. */
export function resolveScheduleWeekFetchReference(
  weekReference: Date,
  timeZone: string,
  now = new Date(),
): Date {
  const todayDateOnly = getDateOnlyInTimeZone(now, timeZone);
  const { weekStartDateOnly, weekEndDateOnly } = getOperationalWeekBounds({
    timeZone,
    reference: weekReference,
  });

  if (
    todayDateOnly >= weekStartDateOnly &&
    todayDateOnly <= weekEndDateOnly
  ) {
    return now;
  }

  return weekReference;
}

export function scheduleWeekJobFromRow(row: {
  id: string;
  status: JobStatus;
  scheduled_at: string;
  completed_at?: string | null;
  assigned_technician_id?: string | null;
}): ScheduleWeekJob {
  return {
    id: row.id,
    status: row.status,
    scheduledDate: row.scheduled_at,
    completedAt: row.completed_at ?? null,
    assignedTechnicianId: row.assigned_technician_id ?? null,
  };
}
