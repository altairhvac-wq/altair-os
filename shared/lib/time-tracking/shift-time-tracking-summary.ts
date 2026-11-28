import { getDayBoundsInTimeZone } from "@/shared/lib/datetime";
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
 *
 * A shift left open 12 hours or longer is a missed clock-out, not work. It is
 * reported in `staleOpenShifts` and is NOT counted in `shiftHoursToday` (UI
 * audit 2026-11-12, B5). Counting it made the figure grow by one hour per
 * forgotten shift per hour: three forgotten shifts read as "45.7 h today".
 * Every screen that shows the hours also shows the stale count beside them.
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
      if (!entry.endedAt && isStaleOpenShift(entry.startedAt, now)) {
        return total;
      }
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
    // One decimal: a tenth of an hour is six minutes, as fine as this needs.
    shiftHoursToday: Math.round((shiftMinutesToday / 60) * 10) / 10,
    openShiftCount: input.openClockEntries.length,
    staleOpenShifts,
  };
}
