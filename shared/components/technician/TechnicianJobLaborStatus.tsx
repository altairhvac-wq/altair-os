"use client";

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

    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
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

  if (!laborEntry) {
    return null;
  }

  return (
    <div
      className="mt-2 rounded-lg bg-cyan-50/80 px-2.5 py-2 text-[11px] tabular-nums text-cyan-900 ring-1 ring-cyan-200/80"
      aria-live="polite"
    >
      <p>
        Started{" "}
        <span className="font-semibold">
          {formatTime(laborEntry.startedAt)}
        </span>
      </p>
      {elapsedLabel ? (
        <p className="mt-0.5 font-semibold">{elapsedLabel} on this job</p>
      ) : null}
    </div>
  );
}
