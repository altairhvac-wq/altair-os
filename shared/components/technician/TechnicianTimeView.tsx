"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
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
import {
  formatActionError,
  formatConnectionCatchError,
} from "@/shared/lib/operational-errors";
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
  const [now, setNow] = useState(() => Date.now());
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEndedAt, setRecoveryEndedAt] = useState("");
  const [recoveryReason, setRecoveryReason] = useState("");
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  useEffect(() => {
    // Server actions can refresh route props without remounting this client view.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      try {
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
          setState(result.state);
        }

        if (result.entries) {
          setEntries(result.entries);
        }

        if (result.summary) {
          setSummary(result.summary);
        }
      } catch {
        setError(
          formatConnectionCatchError(
            "Could not update your time. Check your connection and try again.",
          ),
        );
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
    setRecoveryError(null);
    setShowRecovery(true);
    setError(null);
  }

  function cancelRecovery() {
    if (isPending) return;

    setShowRecovery(false);
    setRecoveryEndedAt("");
    setRecoveryReason("");
    setRecoveryError(null);
  }

  function recoverMissedClockOut() {
    if (!staleShift || isPending) return;

    const correctedEnd = new Date(recoveryEndedAt);
    if (Number.isNaN(correctedEnd.getTime())) {
      setRecoveryError("Enter a valid finish date and time.");
      return;
    }

    setRecoveryError(null);
    startTransition(async () => {
      try {
        const result = await correctOpenShiftAction({
          entryId: staleShift.id,
          endedAt: correctedEnd.toISOString(),
          reason: recoveryReason,
        });
        if (result.error) {
          setRecoveryError(
            formatActionError(result.error, "Could not correct your shift."),
          );
          return;
        }

        window.location.reload();
      } catch {
        setRecoveryError(
          "Could not save the correction. Check your connection and try again.",
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <Link
        href="/technician"
        className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Today
      </Link>

      <div className="space-y-1">
        <h1 className="text-lg font-bold text-slate-900">Time review</h1>
        <p className="text-sm text-slate-600">
          Starting and completing assigned jobs normally manages your shift
          automatically. Use this page to clock in or out manually, take a
          break, or correct time. Job labor remains tied to{" "}
          <span className="font-semibold text-slate-800">Start work</span> and{" "}
          <span className="font-semibold text-slate-800">Complete work</span> on
          assigned jobs.
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
          <p className="text-sm font-bold text-rose-900">
            Still clocked in from an earlier shift?
          </p>
          <p className="mt-1 text-xs text-rose-700">
            This shift has been open for 12 hours or longer. Enter when you
            actually finished; the correction and reason will be recorded for
            review.
          </p>
          {showRecovery ? (
            <form
              className="mt-3 space-y-3"
              aria-busy={isPending}
              onSubmit={(event) => {
                event.preventDefault();
                recoverMissedClockOut();
              }}
            >
              <label className="block text-xs font-semibold text-rose-900">
                Actual finish time
                <input
                  type="datetime-local"
                  required
                  value={recoveryEndedAt}
                  onChange={(event) => {
                    setRecoveryEndedAt(event.target.value);
                    setRecoveryError(null);
                  }}
                  className="mt-1 min-h-11 w-full rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none [color-scheme:light] placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                />
              </label>
              <label className="block text-xs font-semibold text-rose-900">
                What happened?
                <textarea
                  required
                  minLength={5}
                  value={recoveryReason}
                  onChange={(event) => {
                    setRecoveryReason(event.target.value);
                    setRecoveryError(null);
                  }}
                  placeholder="For example: Forgot to clock out after the final appointment"
                  rows={2}
                  className="mt-1 min-h-20 w-full resize-y rounded-lg border border-rose-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                />
              </label>
              <p className="text-xs text-rose-700">
                Add at least 5 characters so the adjustment has a clear audit
                trail.
              </p>
              {recoveryError ? (
                <p
                  role="alert"
                  aria-live="assertive"
                  className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-800"
                >
                  {recoveryError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={
                    isPending ||
                    !recoveryEndedAt ||
                    recoveryReason.trim().length < 5
                  }
                  className="min-h-11 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {isPending ? "Saving…" : "Submit correction"}
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={cancelRecovery}
                  className="min-h-11 px-3 text-sm font-semibold text-rose-800 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={beginRecovery}
              className="mt-3 min-h-11 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white"
            >
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
    </div>
  );
}
