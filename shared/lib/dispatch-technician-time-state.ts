import type { Technician } from "@/shared/types/dispatch";
import type {
  TechnicianTimeState,
  TimeEntry,
  TimeEntryType,
} from "@/shared/types/time-entry";

const TIME_STATE_PRIORITY: Record<
  Exclude<TechnicianTimeState, "off_clock">,
  number
> = {
  on_break: 3,
  working_job: 2,
  clocked_in: 1,
};

function mapEntryTypeToTimeState(
  entryType: TimeEntryType,
): Exclude<TechnicianTimeState, "off_clock"> {
  switch (entryType) {
    case "break":
      return "on_break";
    case "job_labor":
      return "working_job";
    default:
      return "clocked_in";
  }
}

function pickPrimaryActiveEntry(entries: TimeEntry[]): TimeEntry | undefined {
  return entries.reduce<TimeEntry | undefined>((best, entry) => {
    if (!best) {
      return entry;
    }

    const entryPriority =
      TIME_STATE_PRIORITY[mapEntryTypeToTimeState(entry.entryType)];
    const bestPriority =
      TIME_STATE_PRIORITY[mapEntryTypeToTimeState(best.entryType)];

    return entryPriority > bestPriority ? entry : best;
  }, undefined);
}

/** Resolve live time-clock state from open time entries (break > job > clock). */
export function resolveTechnicianTimeState(
  entries: TimeEntry[],
): TechnicianTimeState {
  const activeEntry = pickPrimaryActiveEntry(entries);
  if (!activeEntry) {
    return "off_clock";
  }
  return mapEntryTypeToTimeState(activeEntry.entryType);
}

export function attachTechnicianTimeStates(
  technicians: Technician[],
  activeEntries: TimeEntry[],
): Technician[] {
  const entriesByTechnician = new Map<string, TimeEntry[]>();

  for (const entry of activeEntries) {
    const existing = entriesByTechnician.get(entry.technicianId) ?? [];
    existing.push(entry);
    entriesByTechnician.set(entry.technicianId, existing);
  }

  return technicians.map((technician) => ({
    ...technician,
    timeState: resolveTechnicianTimeState(
      entriesByTechnician.get(technician.id) ?? [],
    ),
  }));
}

export const TECHNICIAN_TIME_STATE_DOT_CLASS: Record<
  TechnicianTimeState,
  string
> = {
  off_clock: "bg-altair-border-strong",
  clocked_in: "bg-altair-success",
  on_break: "bg-altair-warning",
  working_job: "bg-altair-information",
};
