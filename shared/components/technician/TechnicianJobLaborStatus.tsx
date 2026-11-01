"use client";

import { Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  formatDurationMinutes,
  formatTime,
  getElapsedMinutes,
  type TechnicianTimeStateSnapshot,
} from "@/shared/types/time-entry";
import { technicianFieldTimeOnJobClass } from "./technician-field-styles";

type TechnicianJobLaborStatusProps = {
  jobId: string;
  timeState: TechnicianTimeStateSnapshot;
  compact?: boolean;
};

export function TechnicianJobLaborStatus({
  jobId,
  timeState,
  compact = false,
}: TechnicianJobLaborStatusProps) {
  // Elapsed time depends on the clock, so it is rendered only after mount:
  // the server (and the hydration pass) render the placeholder, and the
  // client fills the minutes in. Rendering Date.now() during server render
  // produced a hydration mismatch whenever a minute boundary passed between
  // the server and client renders.
  const [now, setNow] = useState<number | null>(null);
  const laborEntry =
    timeState.openJobLaborEntry?.jobId === jobId
      ? timeState.openJobLaborEntry
      : null;

  useEffect(() => {
    if (!laborEntry) {
      return;
    }

    // Deliberate: this first tick is what makes the label hydration-safe.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [laborEntry?.id]);

  const elapsedLabel = useMemo(() => {
    if (!laborEntry || now === null) {
      return null;
    }

    return formatDurationMinutes(
      getElapsedMinutes(laborEntry.startedAt, now),
    );
  }, [laborEntry, now]);

  const shiftElapsedLabel = useMemo(() => {
    if (!timeState.openClockEntry || now === null) {
      return null;
    }

    return formatDurationMinutes(
      getElapsedMinutes(timeState.openClockEntry.startedAt, now),
    );
  }, [timeState.openClockEntry, now]);

  if (!laborEntry) {
    return null;
  }

  if (compact) {
    return (
      <div className={technicianFieldTimeOnJobClass} aria-live="polite">
        <Timer className="h-3 w-3 shrink-0 text-cyan-600" aria-hidden />
        <p className="min-w-0 truncate text-[11px] font-medium tabular-nums text-slate-800">
          {elapsedLabel ? `${elapsedLabel} on job` : "Working on this job"}
          {shiftElapsedLabel ? ` · Shift ${shiftElapsedLabel}` : ""}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`mt-2 ${technicianFieldTimeOnJobClass} px-2.5 py-2`}
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600" aria-hidden />
        <div className="min-w-0 flex-1 tabular-nums text-slate-800">
          <p className="text-xs text-slate-600">
            Started{" "}
            <span className="font-medium text-slate-900">
              {formatTime(laborEntry.startedAt)}
            </span>
          </p>
          {elapsedLabel ? (
            <p className="mt-0.5 text-sm font-semibold text-slate-900">
              {elapsedLabel} elapsed
            </p>
          ) : null}
          <p className="mt-0.5 text-xs font-medium text-slate-600">
            Working on this job
          </p>
          {shiftElapsedLabel ? (
            <p className="mt-1 text-[11px] text-slate-500">
              Shift {shiftElapsedLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
