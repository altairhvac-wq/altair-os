import { getDayBoundsInTimeZone } from "@/shared/lib/datetime";
import { roundJobMaterialAmount } from "@/shared/types/job-material";
import type { ReportTimeTrackingSummary } from "@/shared/types/reports-page";
import type { TimeEntry } from "@/shared/types/time-entry";

/** Open clock shifts at or beyond this age are treated as missed clock-outs. */
export const STALE_OPEN_SHIFT_HOURS = 12;

export function getOpenShiftElapsedHours(
  startedAt: string,
  now = Date.now(),
): number {
  return Math.max(
    0,
    Math.round(((now - Date.parse(startedAt)) / 3_600_000) * 10) / 10,
  );
}

export function isStaleOpenShift(
  startedAt: string,
  now = Date.now(),
  staleHours = STALE_OPEN_SHIFT_HOURS,
): boolean {
  return getOpenShiftElapsedHours(startedAt, now) >= staleHours;
}

/**
 * Shared shift metrics for Reports Shift Time and Time Clock header.
 * Hours use calendar-day overlap in the company timezone (open shifts count to now).
 */
export function buildShiftTimeTrackingSummary(input: {
  openClockEntries: TimeEntry[];
  todayTimeEntries: TimeEntry[];
  timeZone?: string;
  now?: number;
}): ReportTimeTrackingSummary {
  const now = input.now ?? Date.now();
  const { start: todayStart, end: todayEnd } = getDayBoundsInTimeZone(
    input.timeZone,
  );
  const todayStartMs = Date.parse(todayStart);
  const todayEndMs = Date.parse(todayEnd);

  const clockEntriesForToday = new Map(
    input.todayTimeEntries
      .filter((entry) => entry.entryType === "clock")
      .map((entry) => [entry.id, entry]),
  );
  for (const entry of input.openClockEntries) {
    clockEntriesForToday.set(entry.id, entry);
  }

  const shiftMinutesToday = [...clockEntriesForToday.values()].reduce(
    (total, entry) => {
      const overlapStart = Math.max(Date.parse(entry.startedAt), todayStartMs);
      const overlapEnd = Math.min(
        entry.endedAt ? Date.parse(entry.endedAt) : now,
        todayEndMs,
      );
      return total + Math.max(0, Math.round((overlapEnd - overlapStart) / 60_000));
    },
    0,
  );

  const staleOpenShifts = input.openClockEntries
    .map((entry) => ({
      id: entry.id,
      technicianName: entry.technicianName,
      startedAt: entry.startedAt,
      elapsedHours: getOpenShiftElapsedHours(entry.startedAt, now),
    }))
    .filter((entry) => entry.elapsedHours >= STALE_OPEN_SHIFT_HOURS);

  return {
    shiftHoursToday: roundJobMaterialAmount(shiftMinutesToday / 60),
    openShiftCount: input.openClockEntries.length,
    staleOpenShifts,
  };
}
