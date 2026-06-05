import {
  addDaysToDateOnly,
  formatDateInTimeZone,
  getDateOnlyInTimeZone,
  parseDateInput,
} from "@/shared/lib/datetime";
import {
  getOperationalWeekBounds,
  isJobOnOperationalDay,
  type ScheduledTodayOptions,
} from "@/shared/lib/scheduled-today";
import type { TechnicianJob } from "@/shared/types/technician";

const WEEKDAY_STRIP_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type TechnicianWeekDay = {
  dateOnly: string;
  stripLabel: (typeof WEEKDAY_STRIP_LABELS)[number];
  dayOfMonth: number;
  isToday: boolean;
};

export type TechnicianScheduleDayContext = ScheduledTodayOptions & {
  timeZone: string;
  todayDateOnly: string;
};

export function getTechnicianTodayDateOnly(
  timeZone: string,
  reference = new Date(),
): string {
  return getDateOnlyInTimeZone(reference, timeZone);
}

export function getTechnicianWeekDays(
  timeZone: string,
  reference = new Date(),
): TechnicianWeekDay[] {
  const { weekStartDateOnly } = getOperationalWeekBounds({
    timeZone,
    reference,
  });
  const todayDateOnly = getTechnicianTodayDateOnly(timeZone, reference);

  return WEEKDAY_STRIP_LABELS.map((stripLabel, index) => {
    const dateOnly = addDaysToDateOnly(weekStartDateOnly, index, timeZone);
    const dayOfMonth = Number(dateOnly.slice(8, 10));

    return {
      dateOnly,
      stripLabel,
      dayOfMonth: Number.isNaN(dayOfMonth) ? 0 : dayOfMonth,
      isToday: dateOnly === todayDateOnly,
    };
  });
}

export function isJobOnTechnicianScheduleDay(
  job: TechnicianJob,
  dateOnly: string,
  context: TechnicianScheduleDayContext,
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
    getDateOnlyInTimeZone(
      parseDateInput(job.scheduledDate),
      context.timeZone,
    ) === dateOnly
  );
}

export function filterJobsForTechnicianScheduleDay(
  jobs: TechnicianJob[],
  dateOnly: string,
  context: TechnicianScheduleDayContext,
): TechnicianJob[] {
  return jobs.filter((job) =>
    isJobOnTechnicianScheduleDay(job, dateOnly, context),
  );
}

export function countJobsForTechnicianScheduleDay(
  jobs: TechnicianJob[],
  dateOnly: string,
  context: TechnicianScheduleDayContext,
): number {
  return filterJobsForTechnicianScheduleDay(jobs, dateOnly, context).length;
}

export function formatTechnicianScheduleDayHeading(
  dateOnly: string,
  context: TechnicianScheduleDayContext,
): string {
  if (dateOnly === context.todayDateOnly) {
    return "Today";
  }

  const reference = new Date(`${dateOnly}T12:00:00.000Z`);

  return formatDateInTimeZone(reference, context.timeZone, {
    weekday: "long",
  });
}

export function formatTechnicianScheduleEmptyTitle(
  dateOnly: string,
  context: TechnicianScheduleDayContext,
): string {
  if (dateOnly === context.todayDateOnly) {
    return "No jobs scheduled today";
  }

  const dayName = formatTechnicianScheduleDayHeading(dateOnly, context);

  return `No jobs scheduled ${dayName}`;
}

export function formatTechnicianScheduleEmptyDescription(
  dateOnly: string,
  context: TechnicianScheduleDayContext,
): string {
  if (dateOnly === context.todayDateOnly) {
    return "When dispatch assigns you work, it will appear here automatically.";
  }

  const dayName = formatTechnicianScheduleDayHeading(dateOnly, context);

  return `You're clear for ${dayName}. Select another day to review your week.`;
}

export function formatTechnicianScheduleCaughtUpDescription(
  dateOnly: string,
  context: TechnicianScheduleDayContext,
): string {
  if (isSelectedTechnicianScheduleDayToday(dateOnly, context)) {
    return "No jobs need action right now. Finished work is listed below.";
  }

  const dayName = formatTechnicianScheduleDayHeading(dateOnly, context);

  return `No open jobs for ${dayName}.`;
}

export function isSelectedTechnicianScheduleDayToday(
  dateOnly: string,
  context: TechnicianScheduleDayContext,
): boolean {
  return dateOnly === context.todayDateOnly;
}

export function getTechnicianHeroSectionCopy(
  dateOnly: string,
  context: TechnicianScheduleDayContext,
): { label: string; ariaLabel: string } {
  if (isSelectedTechnicianScheduleDayToday(dateOnly, context)) {
    return { label: "Today's Work", ariaLabel: "Today's work" };
  }

  const day = formatTechnicianScheduleDayHeading(dateOnly, context);

  return { label: day, ariaLabel: `${day} jobs` };
}

export function formatTechnicianScheduleQueueLabel(input: {
  dateOnly: string;
  activeCount: number;
  context: TechnicianScheduleDayContext;
}): string {
  const { dateOnly, activeCount, context } = input;
  const suffix = activeCount === 1 ? "" : "s";

  if (isSelectedTechnicianScheduleDayToday(dateOnly, context)) {
    return `${activeCount} open job${suffix}`;
  }

  return `${activeCount} job${suffix}`;
}
