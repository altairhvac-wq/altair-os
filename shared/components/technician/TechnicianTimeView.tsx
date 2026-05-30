"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Coffee,
  LogIn,
  LogOut,
  PauseCircle,
  PlayCircle,
  Timer,
} from "lucide-react";
import {
  endBreakAction,
  startBreakAction,
  startClockAction,
  stopClockAction,
  type TimeEntryActionResult,
} from "@/app/actions/time-entries";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  formatDurationMinutes,
  formatTechnicianTimeState,
  formatTime,
  formatTimeEntryType,
  getElapsedMinutes,
  getTechnicianTimeStateStyles,
  type TechnicianTimeStateSnapshot,
  type TimeEntry,
  type TodayTimeSummary,
} from "@/shared/types/time-entry";

type TechnicianTimeViewProps = {
  initialState: TechnicianTimeStateSnapshot;
  initialEntries: TimeEntry[];
  initialSummary: TodayTimeSummary;
  technicianName: string;
};

export function TechnicianTimeView({
  initialState,
  initialEntries,
  initialSummary,
  technicianName,
}: TechnicianTimeViewProps) {
  const [state, setState] = useState(initialState);
  const [entries, setEntries] = useState(initialEntries);
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setState(initialState);
    setEntries(initialEntries);
    setSummary(initialSummary);
  }, [initialEntries, initialState, initialSummary]);

  useEffect(() => {
    if (!state.activeEntry?.startedAt || state.activeEntry.endedAt) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [state.activeEntry?.endedAt, state.activeEntry?.startedAt]);

  const activeMinutes = useMemo(() => {
    if (!state.activeEntry?.startedAt || state.activeEntry.endedAt) {
      return 0;
    }

    return getElapsedMinutes(state.activeEntry.startedAt, now);
  }, [now, state.activeEntry]);

  function runAction(action: () => Promise<TimeEntryActionResult>) {
    if (isPending) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(formatActionError(result.error, "Could not update your time. Try again."));
        return;
      }

      if (result.state) {
        setState(result.state);
      }

      if (result.entries) {
        setEntries(result.entries);
      }

      if (result.summary) {
        setSummary(result.summary);
      }
    });
  }

  const isOffClock = state.state === "off_clock";
  const isClockedIn = state.state === "clocked_in";
  const isOnBreak = state.state === "on_break";
  const isWorkingJob = state.state === "working_job";

  return (
    <div className="space-y-4">
      <div
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        role="note"
      >
        Time is tracked through{" "}
        <span className="font-semibold text-slate-800">Start work</span> and{" "}
        <span className="font-semibold text-slate-800">Complete work</span> on
        your assigned jobs. Use this page only for breaks or time corrections.
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current status
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">{technicianName}</p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getTechnicianTimeStateStyles(state.state)}`}
          >
            {formatTechnicianTimeState(state.state)}
          </span>
        </div>

        {state.activeEntry ? (
          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Active timer
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                  {formatDurationMinutes(activeMinutes)}
                </p>
              </div>
              <Timer className="h-8 w-8 text-cyan-600" />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {formatTimeEntryType(state.activeEntry.entryType)} since{" "}
              {formatTime(state.activeEntry.startedAt)}
            </p>
            {state.activeJobNumber ? (
              <p className="mt-1 text-sm font-medium text-cyan-700">
                Job {state.activeJobNumber}
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            Start work on a job to begin your shift automatically.
          </p>
        )}
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isPending || !isOffClock}
          onClick={() => runAction(startClockAction)}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogIn className="h-5 w-5" />
          Clock In
        </button>
        <button
          type="button"
          disabled={isPending || !isClockedIn}
          onClick={() => runAction(stopClockAction)}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut className="h-5 w-5" />
          Clock Out
        </button>
        <button
          type="button"
          disabled={isPending || !(isClockedIn || isWorkingJob)}
          onClick={() => runAction(startBreakAction)}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Coffee className="h-5 w-5" />
          Start Break
        </button>
        <button
          type="button"
          disabled={isPending || !isOnBreak}
          onClick={() => runAction(endBreakAction)}
          className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <PlayCircle className="h-5 w-5" />
          End Break
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Today
        </p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Clock</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatDurationMinutes(summary.clockMinutes)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Break</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatDurationMinutes(summary.breakMinutes)}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Job labor</p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {formatDurationMinutes(summary.jobLaborMinutes)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">Today&apos;s entries</p>
          <span className="text-xs text-slate-500">{entries.length} total</span>
        </div>

        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No time entries yet today.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatTimeEntryType(entry.entryType)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatTime(entry.startedAt)}
                    {entry.endedAt ? ` – ${formatTime(entry.endedAt)}` : " – active"}
                  </p>
                  {entry.jobNumber ? (
                    <p className="text-xs font-medium text-cyan-700">
                      Job {entry.jobNumber}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatDurationMinutes(
                      entry.durationMinutes ??
                        (entry.endedAt
                          ? Math.max(
                              0,
                              Math.round(
                                (new Date(entry.endedAt).getTime() -
                                  new Date(entry.startedAt).getTime()) /
                                  60000,
                              ),
                            )
                          : getElapsedMinutes(entry.startedAt, now)),
                    )}
                  </p>
                  {!entry.endedAt ? (
                    <PauseCircle className="ml-auto h-4 w-4 text-cyan-600" />
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
