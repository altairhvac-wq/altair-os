"use client";

import { Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatDurationMinutes,
  formatTime,
  getElapsedMinutes,
  type TechnicianTimeStateSnapshot,
} from "@/shared/types/time-entry";

type TechnicianJobLaborStatusProps = {
  jobId: string;
  timeState: TechnicianTimeStateSnapshot;
};

export function TechnicianJobLaborStatus({
  jobId,
  timeState,
}: TechnicianJobLaborStatusProps) {
  const [now, setNow] = useState(() => Date.now());
  const laborEntry =
    timeState.openJobLaborEntry?.jobId === jobId
      ? timeState.openJobLaborEntry
      : null;

  useEffect(() => {
    if (!laborEntry) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [laborEntry?.id]);

  const elapsedLabel = useMemo(() => {
    if (!laborEntry) {
      return null;
    }

    return formatDurationMinutes(
      getElapsedMinutes(laborEntry.startedAt, now),
    );
  }, [laborEntry, now]);

  const shiftElapsedLabel = useMemo(() => {
    if (!timeState.openClockEntry) {
      return null;
    }

    return formatDurationMinutes(
      getElapsedMinutes(timeState.openClockEntry.startedAt, now),
    );
  }, [timeState.openClockEntry, now]);

  if (!laborEntry) {
    return null;
  }

  return (
    <div
      className="mt-2 rounded-lg bg-cyan-50 px-2.5 py-2 ring-1 ring-cyan-200/80"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600" aria-hidden />
        <div className="min-w-0 flex-1 tabular-nums text-cyan-900">
          <p className="text-xs text-cyan-800">
            Started{" "}
            <span className="font-semibold text-cyan-950">
              {formatTime(laborEntry.startedAt)}
            </span>
          </p>
          {elapsedLabel ? (
            <p className="mt-0.5 text-sm font-bold text-cyan-950">
              {elapsedLabel} elapsed
            </p>
          ) : null}
          <p className="mt-0.5 text-xs font-semibold text-cyan-800">
            Working on this job
          </p>
          {shiftElapsedLabel ? (
            <p className="mt-1 text-[11px] text-cyan-700">
              Shift {shiftElapsedLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
