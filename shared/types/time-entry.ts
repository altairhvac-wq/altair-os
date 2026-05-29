export type TimeEntryType = "clock" | "break" | "job_labor";

export type TechnicianTimeState =
  | "off_clock"
  | "clocked_in"
  | "on_break"
  | "working_job";

export type TimeEntry = {
  id: string;
  companyId: string;
  technicianId: string;
  technicianName: string;
  jobId?: string;
  jobNumber?: string;
  entryType: TimeEntryType;
  startedAt: string;
  endedAt?: string;
  durationMinutes?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type TechnicianTimeStateSnapshot = {
  state: TechnicianTimeState;
  activeEntry?: TimeEntry;
  activeJobId?: string;
  activeJobNumber?: string;
};

export type TodayTimeSummary = {
  clockMinutes: number;
  breakMinutes: number;
  jobLaborMinutes: number;
  entryCount: number;
};

export const TIME_ENTRY_TYPE_LABELS: Record<TimeEntryType, string> = {
  clock: "Clock",
  break: "Break",
  job_labor: "Job labor",
};

export const TECHNICIAN_TIME_STATE_LABELS: Record<TechnicianTimeState, string> =
  {
    off_clock: "Off clock",
    clocked_in: "Clocked in",
    on_break: "On break",
    working_job: "Working job",
  };

export function formatTimeEntryType(entryType: TimeEntryType): string {
  return TIME_ENTRY_TYPE_LABELS[entryType] ?? entryType;
}

export function formatTechnicianTimeState(state: TechnicianTimeState): string {
  return TECHNICIAN_TIME_STATE_LABELS[state] ?? state;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function calculateDurationMinutes(
  startedAt: string,
  endedAt: string,
): number {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  return Math.max(0, Math.round((end - start) / (1000 * 60)));
}

/** Closed job-labor minutes only; open entries return null. */
export function resolveClosedJobLaborMinutes(entry: TimeEntry): number | null {
  if (entry.entryType !== "job_labor") {
    return null;
  }

  if (entry.durationMinutes != null) {
    return Math.max(0, Math.round(entry.durationMinutes));
  }

  if (entry.endedAt) {
    return calculateDurationMinutes(entry.startedAt, entry.endedAt);
  }

  return null;
}

export function getElapsedMinutes(startedAt: string, now = Date.now()): number {
  const start = new Date(startedAt).getTime();
  return Math.max(0, Math.round((now - start) / (1000 * 60)));
}

export function formatDurationMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function formatTodayHoursDecimal(totalMinutes: number): string {
  const hours = Math.round((totalMinutes / 60) * 10) / 10;
  return `${hours.toFixed(1)} hrs`;
}

export function summarizeTodayEntries(
  entries: TimeEntry[],
  now = Date.now(),
): TodayTimeSummary {
  let clockMinutes = 0;
  let breakMinutes = 0;
  let jobLaborMinutes = 0;

  for (const entry of entries) {
    const minutes =
      entry.durationMinutes ??
      (entry.endedAt
        ? calculateDurationMinutes(entry.startedAt, entry.endedAt)
        : getElapsedMinutes(entry.startedAt, now));

    if (entry.entryType === "clock") {
      clockMinutes += minutes;
    } else if (entry.entryType === "break") {
      breakMinutes += minutes;
    } else if (entry.entryType === "job_labor") {
      jobLaborMinutes += minutes;
    }
  }

  return {
    clockMinutes,
    breakMinutes,
    jobLaborMinutes,
    entryCount: entries.length,
  };
}

export function getTechnicianTimeStateStyles(state: TechnicianTimeState): string {
  switch (state) {
    case "clocked_in":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";
    case "on_break":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";
    case "working_job":
      return "bg-cyan-50 text-cyan-700 ring-cyan-600/20";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
  }
}
