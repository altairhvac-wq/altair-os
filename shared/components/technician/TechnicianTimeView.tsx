"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Coffee,
  PlayCircle,
} from "lucide-react";
import {
  endBreakAction,
  startBreakAction,
  startClockAction,
  stopClockAction,
  type TimeEntryActionResult,
} from "@/app/actions/time-entries";
import { correctOpenShiftAction } from "@/app/actions/time-clock";
import { CompactTimeClockBar } from "@/shared/components/time-clock/CompactTimeClockBar";
import { formatActionError } from "@/shared/lib/operational-errors";
import {
  formatDurationMinutes,
  formatTechnicianTimeState,
  formatTime,
  formatTimeEntryType,
  getElapsedMinutes,
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
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEndedAt, setRecoveryEndedAt] = useState("");
  const [recoveryReason, setRecoveryReason] = useState("");

  useEffect(() => {
    setState(initialState);
    setEntries(initialEntries);
    setSummary(initialSummary);
  }, [initialEntries, initialState, initialSummary]);

  useEffect(() => {
    if (state.state === "off_clock") {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [state.state]);

  const statusLabel = useMemo(() => {
    if (state.state === "off_clock") {
      return "Not clocked in";
    }

    if (state.openClockEntry) {
      return `${formatDurationMinutes(
        getElapsedMinutes(state.openClockEntry.startedAt, now),
      )} active`;
    }

    if (state.openJobLaborEntry) {
      return `${formatDurationMinutes(
        getElapsedMinutes(state.openJobLaborEntry.startedAt, now),
      )} active`;
    }

    if (state.openBreakEntry) {
      return `${formatDurationMinutes(
        getElapsedMinutes(state.openBreakEntry.startedAt, now),
      )} on break`;
    }

    return formatTechnicianTimeState(state.state);
  }, [now, state]);

  const statusDetail = useMemo(() => {
    if (state.state === "off_clock") {
      return "Start work on a job to begin your shift automatically.";
    }

    const segments: string[] = [];

    if (state.openClockEntry) {
      segments.push(
        `Shift ${formatDurationMinutes(
          getElapsedMinutes(state.openClockEntry.startedAt, now),
        )}`,
      );
    }

    if (state.openJobLaborEntry) {
      segments.push(
        `Job ${formatDurationMinutes(
          getElapsedMinutes(state.openJobLaborEntry.startedAt, now),
        )}${
          state.activeJobNumber ? ` · ${state.activeJobNumber}` : ""
        }`,
      );
    }

    if (state.openBreakEntry) {
      segments.push(
        `Break ${formatDurationMinutes(
          getElapsedMinutes(state.openBreakEntry.startedAt, now),
        )}`,
      );
    }

    return segments.join(" · ") || formatTechnicianTimeState(state.state);
  }, [now, state]);

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

  const clockToggleAction =
    isOffClock ? "clock_in" : isClockedIn ? "clock_out" : null;

  function handleClockToggle() {
    if (isOffClock) {
      runAction(startClockAction);
      return;
    }

    if (isClockedIn) {
      runAction(stopClockAction);
    }
  }

  const staleShift =
    state.openClockEntry &&
    now - Date.parse(state.openClockEntry.startedAt) >= 12 * 60 * 60 * 1000
      ? state.openClockEntry
      : null;

  function beginRecovery() {
    const localNow = new Date(now - new Date(now).getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    setRecoveryEndedAt(localNow);
    setRecoveryReason("");
    setShowRecovery(true);
    setError(null);
  }

  function recoverMissedClockOut() {
    if (!staleShift || isPending) return;

    setError(null);
    startTransition(async () => {
      const result = await correctOpenShiftAction({
        entryId: staleShift.id,
        endedAt: new Date(recoveryEndedAt).toISOString(),
        reason: recoveryReason,
      });
      if (result.error) {
        setError(formatActionError(result.error, "Could not correct your shift."));
        return;
      }

      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-slate-900">Time review</h1>
        <p className="text-sm text-slate-600">
          Your shift and job labor are tracked through{" "}
          <span className="font-semibold text-slate-800">Start work</span> and{" "}
          <span className="font-semibold text-slate-800">Complete work</span> on
          assigned jobs. Use this page for breaks or time corrections only.
        </p>
      </div>

      <CompactTimeClockBar
        statusLabel={statusLabel}
        subtext={`${technicianName} · ${statusDetail}`}
        toggleAction={clockToggleAction}
        isPending={isPending}
        error={error}
        onToggle={clockToggleAction ? handleClockToggle : undefined}
      />

      {staleShift ? (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-3.5">
          <p className="text-sm font-bold text-rose-900">Still clocked in from an earlier shift?</p>
          <p className="mt-1 text-xs text-rose-700">
            This shift has been open for 12 hours or longer. Enter when you actually finished; the correction and reason will be recorded for review.
          </p>
          {showRecovery ? (
            <div className="mt-3 space-y-2">
              <label className="block text-xs font-semibold text-rose-900">
                Actual finish time
                <input
                  type="datetime-local"
                  value={recoveryEndedAt}
                  onChange={(event) => setRecoveryEndedAt(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </label>
              <label className="block text-xs font-semibold text-rose-900">
                What happened?
                <textarea
                  value={recoveryReason}
                  onChange={(event) => setRecoveryReason(event.target.value)}
                  placeholder="For example: Forgot to clock out after the final appointment"
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-sm text-slate-900"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isPending || !recoveryEndedAt || recoveryReason.trim().length < 5}
                  onClick={recoverMissedClockOut}
                  className="min-h-11 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Submit correction"}
                </button>
                <button type="button" onClick={() => setShowRecovery(false)} className="min-h-11 px-3 text-sm font-semibold text-rose-800">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={beginRecovery} className="mt-3 min-h-11 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white">
              Fix missed clock-out
            </button>
          )}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Breaks
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Pause your shift between jobs without completing work.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isPending || !(isClockedIn || isWorkingJob)}
            onClick={() => runAction(startBreakAction)}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Coffee className="h-4 w-4" />
            Start break
          </button>
          <button
            type="button"
            disabled={isPending || !isOnBreak}
            onClick={() => runAction(endBreakAction)}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlayCircle className="h-4 w-4" />
            End break
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Today
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-white px-2.5 py-2">
            <p className="text-[11px] text-slate-500">Clock</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
              {formatDurationMinutes(summary.clockMinutes)}
            </p>
          </div>
          <div className="rounded-lg bg-white px-2.5 py-2">
            <p className="text-[11px] text-slate-500">Break</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
              {formatDurationMinutes(summary.breakMinutes)}
            </p>
          </div>
          <div className="rounded-lg bg-white px-2.5 py-2">
            <p className="text-[11px] text-slate-500">Labor</p>
            <p className="mt-0.5 text-sm font-bold tabular-nums text-slate-900">
              {formatDurationMinutes(summary.jobLaborMinutes)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
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
                className="flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2"
              >
                <div className="min-w-0">
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
                <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-sm text-slate-500">
        <Link href="/technician" className="font-semibold text-cyan-700 hover:text-cyan-800">
          Back to Today
        </Link>
      </p>
    </div>
  );
}
