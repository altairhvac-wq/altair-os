"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  startClockAction,
  stopClockAction,
  type TimeEntryActionResult,
} from "@/app/actions/time-entries";
import { MobileTimeClockBanner } from "@/shared/components/time-clock/MobileTimeClockBanner";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  formatTechnicianTimeState,
  formatTime,
  formatTodayHoursDecimal,
  type TechnicianTimeStateSnapshot,
  type TodayTimeSummary,
} from "@/shared/types/time-entry";

type TechnicianJobsTimeClockProps = {
  initialTimeState: TechnicianTimeStateSnapshot;
  initialSummary: TodayTimeSummary;
  onTimeStateChange?: (state: TechnicianTimeStateSnapshot) => void;
  onSummaryChange?: (summary: TodayTimeSummary) => void;
};

function buildStatusLine(timeState: TechnicianTimeStateSnapshot): string {
  const { state, activeEntry, activeJobNumber } = timeState;

  if (state === "off_clock") {
    return "Not clocked in";
  }

  if (state === "clocked_in" && activeEntry) {
    return `Clocked in since ${formatTime(activeEntry.startedAt)}`;
  }

  if (state === "on_break" && activeEntry) {
    return `On break since ${formatTime(activeEntry.startedAt)}`;
  }

  if (state === "working_job" && activeEntry) {
    const jobLabel = activeJobNumber ? `Job ${activeJobNumber}` : "a job";
    return `Working ${jobLabel} since ${formatTime(activeEntry.startedAt)}`;
  }

  return formatTechnicianTimeState(state);
}

export function TechnicianJobsTimeClock({
  initialTimeState,
  initialSummary,
  onTimeStateChange,
  onSummaryChange,
}: TechnicianJobsTimeClockProps) {
  const [timeState, setTimeState] = useState(initialTimeState);
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setTimeState(initialTimeState);
  }, [initialTimeState]);

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  const todayHoursLabel = useMemo(
    () => formatTodayHoursDecimal(summary.clockMinutes),
    [summary.clockMinutes],
  );

  const statusLine = useMemo(() => buildStatusLine(timeState), [timeState]);

  const toggleAction =
    timeState.state === "off_clock"
      ? ("clock_in" as const)
      : timeState.state === "clocked_in"
        ? ("clock_out" as const)
        : null;

  function runAction(action: () => Promise<TimeEntryActionResult>) {
    if (isPending) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(
          formatActionError(
            result.error,
            "Could not update your time. Try again.",
          ),
        );
        return;
      }

      if (result.state) {
        setTimeState(result.state);
        onTimeStateChange?.(result.state);
      }

      if (result.summary) {
        setSummary(result.summary);
        onSummaryChange?.(result.summary);
      }
    });
  }

  function handleToggle() {
    if (toggleAction === "clock_in") {
      runAction(startClockAction);
      return;
    }

    if (toggleAction === "clock_out") {
      runAction(stopClockAction);
    }
  }

  return (
    <div className="space-y-2">
      <MobileTimeClockBanner
        statusLine={statusLine}
        todayHoursLabel={todayHoursLabel}
        toggleAction={toggleAction}
        isPending={isPending}
        error={error}
        onToggle={toggleAction ? handleToggle : undefined}
      />
      {toggleAction == null ? (
        <Link
          href="/tech/time"
          className="inline-flex min-h-10 w-full touch-manipulation items-center justify-center rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-200/80"
        >
          Manage time
        </Link>
      ) : null}
    </div>
  );
}
