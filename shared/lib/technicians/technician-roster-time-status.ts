import { resolveTechnicianTimeState } from "@/shared/lib/dispatch-technician-time-state";
import type { TeamMember } from "@/shared/types/team-member";
import type {
  TechnicianTimeState,
  TimeEntry,
} from "@/shared/types/time-entry";

export type TechnicianRosterRow = TeamMember & {
  timeState: TechnicianTimeState;
};

export type TechnicianTimeStatusCounts = Record<TechnicianTimeState, number>;

/** Attach live time-clock state using the same open-entry priority as Dispatch/Dashboard. */
export function attachTeamMemberTimeStates(
  members: TeamMember[],
  activeEntries: TimeEntry[],
): TechnicianRosterRow[] {
  const entriesByTechnician = new Map<string, TimeEntry[]>();

  for (const entry of activeEntries) {
    const existing = entriesByTechnician.get(entry.technicianId) ?? [];
    existing.push(entry);
    entriesByTechnician.set(entry.technicianId, existing);
  }

  return members.map((member) => {
    const userId = member.userId;
    const entries = userId ? (entriesByTechnician.get(userId) ?? []) : [];

    return {
      ...member,
      timeState: resolveTechnicianTimeState(entries),
    };
  });
}

export function countTechnicianTimeStates(
  rows: TechnicianRosterRow[],
): TechnicianTimeStatusCounts {
  const counts: TechnicianTimeStatusCounts = {
    clocked_in: 0,
    working_job: 0,
    on_break: 0,
    off_clock: 0,
  };

  for (const row of rows) {
    counts[row.timeState] += 1;
  }

  return counts;
}
