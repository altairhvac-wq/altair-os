import {
  fetchOperationalRangeJobRows,
  fetchOperationalWeekJobRows,
} from "@/lib/database/queries/scheduled-today-jobs";
import { DEFAULT_COMPANY_TIMEZONE } from "@/shared/lib/datetime";
import { getScheduleMonthGridBounds } from "@/shared/lib/schedule-month";
import {
  scheduleWeekJobFromRow,
  type ScheduleWeekJob,
} from "@/shared/lib/schedule-week";
import type { JobStatus } from "@/shared/types/job";

type ScheduleWeekJobRow = {
  id: string;
  status: JobStatus;
  scheduled_at: string;
  completed_at: string | null;
  assigned_technician_id: string | null;
};

const SCHEDULE_JOB_SELECT =
  "id, status, scheduled_at, completed_at, assigned_technician_id";

export async function listScheduleWeekJobs(
  companyId: string,
  options?: {
    reference?: Date;
    timeZone?: string;
    assignedTechnicianId?: string;
  },
): Promise<ScheduleWeekJob[]> {
  const { rows, error } = await fetchOperationalWeekJobRows<ScheduleWeekJobRow>(
    SCHEDULE_JOB_SELECT,
    {
      companyId,
      reference: options?.reference,
      timeZone: options?.timeZone,
      assignedTechnicianId: options?.assignedTechnicianId,
    },
  );

  if (error) {
    console.error("[listScheduleWeekJobs] query failed:", {
      companyId,
      message: error.message,
    });
    return [];
  }

  return rows.map(scheduleWeekJobFromRow);
}

/**
 * Month calendar jobs for the Mon–Sun grid covering the selected month
 * (including leading/trailing adjacent-month days).
 *
 * `reference` should be the fetch anchor (wall-clock `now` when the month
 * contains today) so carryover/completions stay correct — same as week.
 * Pass the month-start date as `monthReference` for the grid window.
 */
export async function listScheduleMonthJobs(
  companyId: string,
  options: {
    monthReference: Date;
    reference?: Date;
    timeZone?: string;
    assignedTechnicianId?: string;
  },
): Promise<ScheduleWeekJob[]> {
  const timeZone = options.timeZone ?? DEFAULT_COMPANY_TIMEZONE;
  const bounds = getScheduleMonthGridBounds(timeZone, options.monthReference);

  const { rows, error } = await fetchOperationalRangeJobRows<ScheduleWeekJobRow>(
    SCHEDULE_JOB_SELECT,
    {
      companyId,
      reference: options.reference ?? options.monthReference,
      timeZone,
      assignedTechnicianId: options.assignedTechnicianId,
      rangeStart: bounds.start,
      rangeEnd: bounds.end,
    },
  );

  if (error) {
    console.error("[listScheduleMonthJobs] query failed:", {
      companyId,
      message: error.message,
    });
    return [];
  }

  return rows.map(scheduleWeekJobFromRow);
}
