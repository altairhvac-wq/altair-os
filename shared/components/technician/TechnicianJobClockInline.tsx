"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { LogIn, LogOut } from "lucide-react";
import {
  startClockAction,
  stopClockAction,
  type TimeEntryActionResult,
} from "@/app/actions/time-entries";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  formatTechnicianTimeState,
  getElapsedMinutes,
  formatDurationMinutes,
  type TechnicianTimeStateSnapshot,
} from "@/shared/types/time-entry";

type TechnicianJobClockInlineProps = {
  timeState: TechnicianTimeStateSnapshot;
  onTimeStateChange?: (state: TechnicianTimeStateSnapshot) => void;
};

function buildStatusText(
  timeState: TechnicianTimeStateSnapshot,
  elapsedMinutes: number | null,
): string | null {
  const { state } = timeState;

  if (state === "off_clock") {
    return null;
  }

  const label = formatTechnicianTimeState(state);
  if (elapsedMinutes != null) {
    return `${label} · ${formatDurationMinutes(elapsedMinutes)}`;
  }

  return label;
}

export function TechnicianJobClockInline({
  timeState,
  onTimeStateChange,
}: TechnicianJobClockInlineProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (timeState.state === "off_clock" || !timeState.activeEntry) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, [timeState.state, timeState.activeEntry?.id]);

  const elapsedMinutes = useMemo(() => {
    if (!timeState.activeEntry) {
      return null;
    }

    return getElapsedMinutes(timeState.activeEntry.startedAt, now);
  }, [timeState.activeEntry, now]);

  const statusText = useMemo(
    () => buildStatusText(timeState, elapsedMinutes),
    [timeState, elapsedMinutes],
  );

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
        onTimeStateChange?.(result.state);
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

  const isClockOut = toggleAction === "clock_out";

  return (
    <div className="min-w-0 space-y-1">
      <div className="flex min-w-0 items-center justify-between gap-2">
        {statusText ? (
          <p
            className="min-w-0 truncate text-[11px] tabular-nums text-slate-500"
            aria-live="polite"
          >
            {statusText}
          </p>
        ) : (
          <span className="sr-only">Shift time clock</span>
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          {toggleAction ? (
            <button
              type="button"
              onClick={handleToggle}
              disabled={isPending}
              className={`inline-flex min-h-8 touch-manipulation items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                isClockOut
                  ? "bg-slate-800 hover:bg-slate-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {isClockOut ? (
                <LogOut className="h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <LogIn className="h-3 w-3 shrink-0" aria-hidden />
              )}
              {isPending
                ? "…"
                : isClockOut
                  ? "Clock out"
                  : "Clock in"}
            </button>
          ) : (
            <Link
              href="/tech/time"
              className="inline-flex min-h-8 touch-manipulation items-center rounded-full px-2 py-1 text-[11px] font-semibold text-cyan-700 transition-colors hover:bg-cyan-50"
            >
              Manage time
            </Link>
          )}
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[11px] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
