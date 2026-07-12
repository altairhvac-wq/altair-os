"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  clockInAction,
  clockOutAction,
  correctOpenShiftAction,
} from "@/app/actions/time-clock";
import { CompactTimeClockBar } from "@/shared/components/time-clock/CompactTimeClockBar";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
  masterPanelHeaderClass,
} from "@/shared/design-system/shell";
import { formatActionError } from "@/shared/lib/operational-errors";
import type { TimeClockEntry } from "@/shared/types/time-clock";
import {
  formatDateTime,
  formatDuration,
  getElapsedMinutes,
} from "@/shared/types/time-clock";

type TimeClockFoundationViewProps = {
  initialOpenEntry: TimeClockEntry | null;
  initialEntries: TimeClockEntry[];
  currentUserId: string;
  currentUserName: string;
  canViewCompanyEntries: boolean;
  canCorrectEntries: boolean;
};

export function TimeClockFoundationView({
  initialOpenEntry,
  initialEntries,
  currentUserId,
  currentUserName,
  canViewCompanyEntries,
  canCorrectEntries,
}: TimeClockFoundationViewProps) {
  const [openEntry, setOpenEntry] = useState(initialOpenEntry);
  const [entries, setEntries] = useState(initialEntries);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(Date.now());
  const [correctingEntryId, setCorrectingEntryId] = useState<string | null>(null);
  const [correctionEndedAt, setCorrectionEndedAt] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

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

  const activeDurationLabel = useMemo(() => {
    if (!openEntry) {
      return null;
    }

    const minutes = getElapsedMinutes(openEntry.clockInAt, now);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes}m active`;
    }

    return `${hours}h ${remainingMinutes}m active`;
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

  function beginCorrection(entry: TimeClockEntry) {
    const localNow = new Date(now - new Date(now).getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    setCorrectingEntryId(entry.id);
    setCorrectionEndedAt(localNow);
    setCorrectionReason("");
    setError(null);
  }

  function runCorrection(entry: TimeClockEntry) {
    setError(null);
    startTransition(async () => {
      const result = await correctOpenShiftAction({
        entryId: entry.id,
        endedAt: new Date(correctionEndedAt).toISOString(),
        reason: correctionReason,
      });
      if (result.error) {
        setError(formatActionError(result.error, "Could not correct this shift."));
        return;
      }
      if (result.entry) {
        upsertEntry(result.entry);
        if (openEntry?.id === result.entry.id) setOpenEntry(null);
      }
      setCorrectingEntryId(null);
    });
  }

  const visibleEntries = canViewCompanyEntries
    ? entries
    : entries.filter((entry) => entry.userId === currentUserId);

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <MasterPageHeader
            title="Labor & payroll review"
            subtitle="Admin tools for shift exceptions and payroll review. Field labor is tracked automatically when technicians start and complete work on jobs."
            density="compact"
          />

          <div className="flex flex-wrap items-center gap-3 text-sm">
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

          <CompactTimeClockBar
            statusLabel={openEntry ? activeDurationLabel ?? "Clocked in" : "Not clocked in"}
            subtext={
              openEntry
                ? `${currentUserName} · Since ${formatDateTime(openEntry.clockInAt)}`
                : `${currentUserName} · Manual clock in/out for shift exceptions`
            }
            toggleAction={openEntry ? "clock_out" : "clock_in"}
            isPending={isPending}
            error={error}
            onToggle={openEntry ? runClockOut : runClockIn}
          />

          <MasterPageSurface variant="card">
            <div className={masterPanelHeaderClass}>
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
                      {canCorrectEntries ? (
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Review
                        </th>
                      ) : null}
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
                        {canCorrectEntries ? (
                          <td className="px-4 py-3 text-sm">
                            {entry.status === "open" ? (
                              correctingEntryId === entry.id ? (
                                <div className="min-w-64 space-y-2">
                                  <input
                                    type="datetime-local"
                                    value={correctionEndedAt}
                                    onChange={(event) => setCorrectionEndedAt(event.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                                  />
                                  <input
                                    value={correctionReason}
                                    onChange={(event) => setCorrectionReason(event.target.value)}
                                    placeholder="Reason for correction"
                                    className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={isPending || !correctionEndedAt || correctionReason.trim().length < 5}
                                      onClick={() => runCorrection(entry)}
                                      className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      Close corrected shift
                                    </button>
                                    <button type="button" onClick={() => setCorrectingEntryId(null)} className="px-2 text-xs font-semibold text-slate-600">
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button type="button" onClick={() => beginCorrection(entry)} className="font-semibold text-rose-700 hover:text-rose-800">
                                  Correct missed clock-out
                                </button>
                              )
                            ) : "—"}
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </MasterPageSurface>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
