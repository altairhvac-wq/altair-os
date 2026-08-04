import type { MissionControlV2ScheduleRow } from "@/shared/components/dashboard/mission-control-v2/sample-data";
import { DISPATCH_PAGE_TODAY_HREF } from "@/shared/lib/dispatch-page-focus";
import { getTeamMemberInitials } from "@/shared/types/team-member";
import type { DashboardData } from "@/shared/types/dashboard";
import {
  formatDispatchTime,
  type DispatchJob,
  type Technician,
} from "@/shared/types/dispatch";

/** Matches the mockup density (4–5 rows); full board lives on Dispatch. */
export const MISSION_CONTROL_V2_SCHEDULE_PREVIEW_LIMIT = 5;

export const MISSION_CONTROL_V2_SCHEDULE_FULL_HREF = DISPATCH_PAGE_TODAY_HREF;
export const MISSION_CONTROL_V2_SCHEDULE_JOBS_HREF = "/work";

type AssigneeLookup = {
  name: string;
  initials: string;
};

function resolveAssignee(
  job: DispatchJob,
  assignableTechnicians: Technician[],
  technicians: DashboardData["technicians"],
): AssigneeLookup {
  if (!job.technicianId) {
    return { name: "Unassigned", initials: "?" };
  }

  const fromAssignable = assignableTechnicians.find(
    (technician) => technician.id === job.technicianId,
  );
  if (fromAssignable) {
    return {
      name: fromAssignable.name,
      initials: fromAssignable.initials,
    };
  }

  const fromRoster = technicians.find(
    (technician) => technician.id === job.technicianId,
  );
  if (fromRoster) {
    return {
      name: fromRoster.name,
      initials: fromRoster.initials || getTeamMemberInitials(fromRoster.name),
    };
  }

  return { name: "Assigned", initials: "?" };
}

function mapJobToScheduleRow(
  job: DispatchJob,
  assignableTechnicians: Technician[],
  technicians: DashboardData["technicians"],
  timeZone?: string,
): MissionControlV2ScheduleRow {
  const assignee = resolveAssignee(job, assignableTechnicians, technicians);

  return {
    id: job.id,
    time: formatDispatchTime(job.scheduledDate, timeZone),
    title: job.jobType,
    address: job.serviceAddress,
    assigneeName: assignee.name,
    assigneeInitials: assignee.initials,
    status: job.status,
    href: `/work/${job.id}`,
  };
}

/**
 * Maps getDashboardData operational-day jobs into Mission Control v2
 * "Today's schedule" rows. Reuses operations.todayJobs (already company-TZ
 * scoped + chronologically sorted via listDispatchJobsForToday).
 */
export function buildMissionControlV2ScheduleRows(
  data: DashboardData,
  options?: { timeZone?: string; limit?: number },
): MissionControlV2ScheduleRow[] {
  const limit = options?.limit ?? MISSION_CONTROL_V2_SCHEDULE_PREVIEW_LIMIT;
  const { todayJobs } = data.operations;

  return todayJobs
    .slice(0, limit)
    .map((job) =>
      mapJobToScheduleRow(
        job,
        data.assignableTechnicians,
        data.technicians,
        options?.timeZone,
      ),
    );
}
