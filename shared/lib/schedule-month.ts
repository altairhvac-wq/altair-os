import {
  addDaysToDateOnly,
  getDateOnlyInTimeZone,
  getDayBoundsInTimeZone,
  getMonthBoundsInTimeZone,
  parseDateInput,
} from "@/shared/lib/datetime";
import {
  getOperationalDayJobCounts,
  getOperationalWeekBounds,
} from "@/shared/lib/scheduled-today";
import {
  isJobOnScheduleDay,
  type ScheduleWeekDaySummary,
  type ScheduleWeekJob,
} from "@/shared/lib/schedule-week";
import { getTechnicianTodayDateOnly } from "@/shared/lib/technician-week-schedule";

const WEEKDAY_STRIP_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type ScheduleMonthCalendarDay = ScheduleWeekDaySummary["day"] & {
  /** False for leading/trailing days from adjacent months (still real dates). */
  isCurrentMonth: boolean;
};

/** Same per-day shape as week view, plus current-month flag for muted chrome. */
export type ScheduleMonthDaySummary = Omit<ScheduleWeekDaySummary, "day"> & {
  day: ScheduleMonthCalendarDay;
};

export type ScheduleMonthNavigation = {
  monthStartDateOnly: string;
  monthEndDateOnly: string;
  prevMonthDateOnly: string;
  nextMonthDateOnly: string;
  referenceDateOnly: string;
};

export type ScheduleMonthGridBounds = {
  start: string;
  end: string;
  gridStartDateOnly: string;
  gridEndDateOnly: string;
  monthStartDateOnly: string;
  monthEndDateOnly: string;
};

export function resolveScheduleMonthReference(
  dateOnly: string | null,
  timeZone: string,
  now = new Date(),
): { reference: Date; referenceDateOnly: string } {
  const anchorDateOnly = dateOnly ?? getDateOnlyInTimeZone(now, timeZone);
  const { start } = getMonthBoundsInTimeZone(
    timeZone,
    parseDateInput(anchorDateOnly),
  );
  const monthStartDateOnly = getDateOnlyInTimeZone(new Date(start), timeZone);

  return {
    reference: parseDateInput(monthStartDateOnly),
    referenceDateOnly: monthStartDateOnly,
  };
}

/**
 * Visible month calendar range: Mon–Sun grid covering the month, including
 * leading/trailing adjacent-month days.
 */
export function getScheduleMonthGridBounds(
  timeZone: string,
  reference: Date,
): ScheduleMonthGridBounds {
  const { start: monthStartIso, end: monthEndIso } = getMonthBoundsInTimeZone(
    timeZone,
    reference,
  );
  const monthStartDateOnly = getDateOnlyInTimeZone(
    new Date(monthStartIso),
    timeZone,
  );
  const monthEndDateOnly = getDateOnlyInTimeZone(
    new Date(monthEndIso),
    timeZone,
  );

  const { weekStartDateOnly: gridStartDateOnly } = getOperationalWeekBounds({
    timeZone,
    reference: parseDateInput(monthStartDateOnly),
  });
  const { weekEndDateOnly: gridEndDateOnly } = getOperationalWeekBounds({
    timeZone,
    reference: parseDateInput(monthEndDateOnly),
  });

  const { start } = getDayBoundsInTimeZone(
    timeZone,
    parseDateInput(gridStartDateOnly),
  );
  const { end } = getDayBoundsInTimeZone(
    timeZone,
    parseDateInput(gridEndDateOnly),
  );

  return {
    start,
    end,
    gridStartDateOnly,
    gridEndDateOnly,
    monthStartDateOnly,
    monthEndDateOnly,
  };
}

export function getScheduleMonthNavigation(
  referenceDateOnly: string,
  timeZone: string,
): ScheduleMonthNavigation {
  const { monthStartDateOnly, monthEndDateOnly } = getScheduleMonthGridBounds(
    timeZone,
    parseDateInput(referenceDateOnly),
  );

  // Last day of previous month → that month's 1st (handles 28/29/30/31).
  const prevMonthLastDateOnly = addDaysToDateOnly(
    monthStartDateOnly,
    -1,
    timeZone,
  );
  const { monthStartDateOnly: prevMonthDateOnly } = getScheduleMonthGridBounds(
    timeZone,
    parseDateInput(prevMonthLastDateOnly),
  );

  // Day after month end is always the 1st of the next month.
  const nextMonthDateOnly = addDaysToDateOnly(monthEndDateOnly, 1, timeZone);

  return {
    monthStartDateOnly,
    monthEndDateOnly,
    prevMonthDateOnly,
    nextMonthDateOnly,
    referenceDateOnly: monthStartDateOnly,
  };
}

export function getScheduleMonthGridDays(
  timeZone: string,
  monthReference: Date,
  now = new Date(),
): ScheduleMonthCalendarDay[] {
  const {
    gridStartDateOnly,
    gridEndDateOnly,
    monthStartDateOnly,
    monthEndDateOnly,
  } = getScheduleMonthGridBounds(timeZone, monthReference);
  const todayDateOnly = getTechnicianTodayDateOnly(timeZone, now);
  const days: ScheduleMonthCalendarDay[] = [];

  let cursor = gridStartDateOnly;
  let index = 0;

  while (cursor <= gridEndDateOnly) {
    const dayOfMonth = Number(cursor.slice(8, 10));

    days.push({
      dateOnly: cursor,
      stripLabel: WEEKDAY_STRIP_LABELS[index % 7]!,
      dayOfMonth: Number.isNaN(dayOfMonth) ? 0 : dayOfMonth,
      isToday: cursor === todayDateOnly,
      isCurrentMonth:
        cursor >= monthStartDateOnly && cursor <= monthEndDateOnly,
    });

    cursor = addDaysToDateOnly(cursor, 1, timeZone);
    index += 1;
  }

  return days;
}

/**
 * Per-day counts across the month grid — same shape/helpers as week view.
 * `monthReference` selects the month; `now` drives today/carryover membership.
 */
export function buildScheduleMonthDaySummaries(
  jobs: ScheduleWeekJob[],
  timeZone: string,
  monthReference: Date,
  now = new Date(),
): ScheduleMonthDaySummary[] {
  const todayDateOnly = getTechnicianTodayDateOnly(timeZone, now);
  const gridDays = getScheduleMonthGridDays(timeZone, monthReference, now);
  const context = { timeZone, todayDateOnly, reference: now };

  return gridDays.map((day) => {
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

/** Use wall-clock `now` when the selected month contains today so carryover stays correct. */
export function resolveScheduleMonthFetchReference(
  monthReference: Date,
  timeZone: string,
  now = new Date(),
): Date {
  const todayDateOnly = getDateOnlyInTimeZone(now, timeZone);
  const { monthStartDateOnly, monthEndDateOnly } = getScheduleMonthGridBounds(
    timeZone,
    monthReference,
  );

  if (
    todayDateOnly >= monthStartDateOnly &&
    todayDateOnly <= monthEndDateOnly
  ) {
    return now;
  }

  return monthReference;
}
