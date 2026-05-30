"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatDurationMinutes,
  formatTechnicianTimeState,
  getElapsedMinutes,
  getTechnicianTimeStateStyles,
  type TechnicianTimeStateSnapshot,
} from "@/shared/types/time-entry";

type TechnicianJobShiftStatusProps = {
  jobId: string;
  timeState: TechnicianTimeStateSnapshot;
};

export function TechnicianJobShiftStatus({
  jobId,
  timeState,
}: TechnicianJobShiftStatusProps) {
  const [now, setNow] = useState(() => Date.now());
  const isWorkingThisJob =
    timeState.openJobLaborEntry?.jobId === jobId ||
    (timeState.state === "working_job" && timeState.activeJobId === jobId);

  useEffect(() => {
    if (timeState.state === "off_clock" || isWorkingThisJob) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [isWorkingThisJob, timeState.state]);

  const statusLabel = useMemo(() => {
    if (timeState.state === "off_clock") {
      return null;
    }

    if (isWorkingThisJob) {
      return null;
    }

    const stateLabel = formatTechnicianTimeState(timeState.state);

    if (timeState.openClockEntry) {
      const shiftMinutes = getElapsedMinutes(
        timeState.openClockEntry.startedAt,
        now,
      );
      return `${stateLabel} · Shift ${formatDurationMinutes(shiftMinutes)}`;
    }

    if (timeState.openBreakEntry) {
      const breakMinutes = getElapsedMinutes(
        timeState.openBreakEntry.startedAt,
        now,
      );
      return `${stateLabel} · ${formatDurationMinutes(breakMinutes)}`;
    }

    return stateLabel;
  }, [isWorkingThisJob, now, timeState]);

  if (!statusLabel) {
    return null;
  }

  return (
    <div
      className={`mt-2 flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[11px] ring-1 ring-inset ${getTechnicianTimeStateStyles(timeState.state)}`}
      aria-live="polite"
    >
      <p className="min-w-0 truncate font-semibold tabular-nums">{statusLabel}</p>
    </div>
  );
}
