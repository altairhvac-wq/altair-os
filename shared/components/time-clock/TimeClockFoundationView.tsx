"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { LogIn, LogOut, Timer } from "lucide-react";
import {
  clockInAction,
  clockOutAction,
} from "@/app/actions/time-clock";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { TimeClockEntry } from "@/shared/types/time-clock";
import {
  formatDateTime,
  formatDuration,
  formatTimeClockStatus,
  getElapsedMinutes,
  getTimeClockStatusStyles,
} from "@/shared/types/time-clock";

type TimeClockFoundationViewProps = {
  initialOpenEntry: TimeClockEntry | null;
  initialEntries: TimeClockEntry[];
  currentUserId: string;
  currentUserName: string;
  canViewCompanyEntries: boolean;
};

export function TimeClockFoundationView({
  initialOpenEntry,
  initialEntries,
  currentUserId,
  currentUserName,
  canViewCompanyEntries,
}: TimeClockFoundationViewProps) {
  const [openEntry, setOpenEntry] = useState(initialOpenEntry);
  const [entries, setEntries] = useState(initialEntries);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setOpenEntry(initialOpenEntry);
    setEntries(initialEntries);
  }, [initialEntries, initialOpenEntry]);

  useEffect(() => {
    if (!openEntry) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, [openEntry]);

  const elapsedLabel = useMemo(() => {
    if (!openEntry) {
      return null;
    }

    const minutes = getElapsedMinutes(openEntry.clockInAt, now);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes}m elapsed`;
    }

    return `${hours}h ${remainingMinutes}m elapsed`;
  }, [now, openEntry]);

  function upsertEntry(entry: TimeClockEntry) {
    setEntries((previous) => {
      const withoutCurrent = previous.filter((item) => item.id !== entry.id);
      return [entry, ...withoutCurrent];
    });
  }

  function runClockIn() {
    setError(null);
    startTransition(async () => {
      const result = await clockInAction();
      if (result.error) {
        setError(formatActionError(result.error, "Could not clock in. Try again."));
        return;
      }

      if (result.entry) {
        setOpenEntry(result.entry);
        upsertEntry(result.entry);
      }
    });
  }

  function runClockOut() {
    setError(null);
    startTransition(async () => {
      const result = await clockOutAction();
      if (result.error) {
        setError(formatActionError(result.error, "Could not clock out. Try again."));
        return;
      }

      if (result.entry) {
        setOpenEntry(null);
        upsertEntry(result.entry);
      }
    });
  }

  const visibleEntries = canViewCompanyEntries
    ? entries
    : entries.filter((entry) => entry.userId === currentUserId);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-bold text-slate-900">Labor & payroll review</h1>
        <p className="text-sm text-slate-600">
          Admin tools for shift exceptions and payroll review. Field labor is
          tracked automatically when technicians start and complete work on jobs.
        </p>
        <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
          <Link
            href="/time"
            className="font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Time entries
          </Link>
          <span className="text-slate-300" aria-hidden="true">
            ·
          </span>
          <Link
            href="/reports"
            className="font-semibold text-cyan-700 hover:text-cyan-800"
          >
            Payroll review
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50">
            <Timer className="h-4 w-4 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Shift exceptions</h2>
            <p className="text-xs text-slate-500">
              Manual clock in/out for office staff or payroll corrections.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Current status
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {currentUserName}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getTimeClockStatusStyles(
                  openEntry ? "open" : "closed",
                )}`}
              >
                {formatTimeClockStatus(openEntry ? "open" : "closed")}
              </span>
              {openEntry ? (
                <span className="text-sm text-slate-600">
                  Since {formatDateTime(openEntry.clockInAt)}
                  {elapsedLabel ? ` · ${elapsedLabel}` : ""}
                </span>
              ) : (
                <span className="text-sm text-slate-500">
                  You are not clocked in.
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={runClockIn}
              disabled={isPending || openEntry != null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <LogIn className="h-4 w-4" />
              Clock In
            </button>
            <button
              type="button"
              onClick={runClockOut}
              disabled={isPending || openEntry == null}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              Clock Out
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="admin-card">
        <div className="border-b border-slate-100 px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Time</h2>
          <p className="text-xs text-slate-500">
            {canViewCompanyEntries ? "Company shift clock entries" : "Your shift clock entries"} ·{" "}
            {visibleEntries.length} entr{visibleEntries.length === 1 ? "y" : "ies"}
          </p>
        </div>

        {visibleEntries.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-500">
            No time entries yet. Clock in to start your first shift.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-white">
                <tr>
                  {canViewCompanyEntries ? (
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Employee
                    </th>
                  ) : null}
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Clock in
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Clock out
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleEntries.map((entry) => (
                  <tr key={entry.id}>
                    {canViewCompanyEntries ? (
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {entry.userName}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatDateTime(entry.clockInAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {entry.clockOutAt
                        ? formatDateTime(entry.clockOutAt)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
                      {formatDuration(entry.clockInAt, entry.clockOutAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {entry.status === "open" ? "Open" : "Closed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
