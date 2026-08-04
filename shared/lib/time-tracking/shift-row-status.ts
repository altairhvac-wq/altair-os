import { resolveTechnicianTimeState } from "@/shared/lib/dispatch-technician-time-state";
import { isStaleOpenShift } from "@/shared/lib/time-tracking/shift-time-tracking-summary";
import type { TimeClockEntry } from "@/shared/types/time-clock";
import type { TimeEntry } from "@/shared/types/time-entry";
import type { StatusPillTone } from "@/shared/design-system/components";

export type ShiftRowStatus =
  | "closed"
  | "open"
  | "on_break"
  | "on_job"
  | "stale";

export type ShiftRowStatusPresentation = {
  status: ShiftRowStatus;
  label: string;
  tone: StatusPillTone;
};

/**
 * Closed from ended_at; open rows reflect nested break/job_labor when present.
 * Stale open clocks (≥12h) win over plain "open".
 */
export function resolveShiftRowStatus(
  entry: TimeClockEntry,
  activeEntries: TimeEntry[],
  now = Date.now(),
): ShiftRowStatusPresentation {
  if (entry.status === "closed" || entry.clockOutAt) {
    return { status: "closed", label: "Closed", tone: "neutral" };
  }

  const nested = activeEntries.filter(
    (active) => active.technicianId === entry.userId && !active.endedAt,
  );
  const liveState = resolveTechnicianTimeState(nested);

  if (liveState === "on_break") {
    return { status: "on_break", label: "On break", tone: "warning" };
  }

  if (liveState === "working_job") {
    return { status: "on_job", label: "On job", tone: "info" };
  }

  if (isStaleOpenShift(entry.clockInAt, now)) {
    return { status: "stale", label: "Stale open", tone: "danger" };
  }

  return { status: "open", label: "Open", tone: "success" };
}
