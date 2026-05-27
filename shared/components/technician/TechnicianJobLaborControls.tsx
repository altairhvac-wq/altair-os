"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Briefcase, Square } from "lucide-react";
import {
  startJobLaborAction,
  stopJobLaborAction,
} from "@/app/actions/time-entries";
import type { TechnicianTimeStateSnapshot } from "@/shared/types/time-entry";

type TechnicianJobLaborControlsProps = {
  jobId: string;
  jobNumber: string;
  timeState: TechnicianTimeStateSnapshot;
  onTimeStateChange?: (state: TechnicianTimeStateSnapshot) => void;
};

export function TechnicianJobLaborControls({
  jobId,
  jobNumber,
  timeState,
  onTimeStateChange,
}: TechnicianJobLaborControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isWorkingThisJob =
    timeState.state === "working_job" && timeState.activeJobId === jobId;
  const isWorkingAnotherJob =
    timeState.state === "working_job" && timeState.activeJobId !== jobId;
  const canStartJobWork = timeState.state === "clocked_in";
  const isOnBreak = timeState.state === "on_break";
  const isOffClock = timeState.state === "off_clock";

  function handleStart() {
    setError(null);
    startTransition(async () => {
      const result = await startJobLaborAction(jobId);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.state) {
        onTimeStateChange?.(result.state);
      }
    });
  }

  function handleStop() {
    setError(null);
    startTransition(async () => {
      const result = await stopJobLaborAction(jobId);
      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.state) {
        onTimeStateChange?.(result.state);
      }
    });
  }

  if (isOffClock) {
    return (
      <Link
        href="/tech/time"
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
      >
        <Briefcase className="h-4 w-4" />
        Clock in to track job labor
      </Link>
    );
  }

  return (
    <div className="space-y-2">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}
      {isWorkingThisJob ? (
        <button
          type="button"
          disabled={isPending}
          onClick={handleStop}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-100 disabled:opacity-50"
        >
          <Square className="h-4 w-4" />
          Stop job work
        </button>
      ) : (
        <button
          type="button"
          disabled={isPending || !canStartJobWork || isOnBreak}
          onClick={handleStart}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 bg-white px-4 py-3 text-sm font-semibold text-cyan-800 transition-colors hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Briefcase className="h-4 w-4" />
          Start job work
        </button>
      )}
      {isOnBreak ? (
        <p className="text-center text-xs text-amber-700">
          End your break before starting {jobNumber}.
        </p>
      ) : null}
      {isWorkingAnotherJob ? (
        <p className="text-center text-xs text-slate-500">
          Stop your current job work before starting {jobNumber}.
        </p>
      ) : null}
    </div>
  );
}
