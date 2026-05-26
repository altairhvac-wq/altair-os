"use client";

import { useMemo, useState } from "react";
import {
  formatDateTime,
  formatDurationMinutes,
  formatTechnicianTimeState,
  formatTimeEntryType,
  getTechnicianTimeStateStyles,
  type TimeEntry,
} from "@/shared/types/time-entry";

type AdminTimeTrackingViewProps = {
  entries: TimeEntry[];
  activeEntries: TimeEntry[];
  canViewAll: boolean;
};

export function AdminTimeTrackingView({
  entries,
  activeEntries,
  canViewAll,
}: AdminTimeTrackingViewProps) {
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");

  const technicians = useMemo(() => {
    const names = new Set(entries.map((entry) => entry.technicianName));
    return Array.from(names).sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (technicianFilter === "all") {
      return entries;
    }

    return entries.filter(
      (entry) => entry.technicianName === technicianFilter,
    );
  }, [entries, technicianFilter]);

  if (!canViewAll) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        You do not have permission to view company time entries.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-slate-900">Active technicians</h2>
        {activeEntries.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No technicians are currently on the clock.</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {activeEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {entry.technicianName}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatTimeEntryType(entry.entryType)}
                      {entry.jobNumber ? ` · ${entry.jobNumber}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${getTechnicianTimeStateStyles(
                      entry.entryType === "break"
                        ? "on_break"
                        : entry.entryType === "job_labor"
                          ? "working_job"
                          : "clocked_in",
                    )}`}
                  >
                    {formatTechnicianTimeState(
                      entry.entryType === "break"
                        ? "on_break"
                        : entry.entryType === "job_labor"
                          ? "working_job"
                          : "clocked_in",
                    )}
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Started {formatDateTime(entry.startedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Recent time entries</h2>
            <p className="text-xs text-slate-500">
              {filteredEntries.length} entr{filteredEntries.length === 1 ? "y" : "ies"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Technician
            <select
              value={technicianFilter}
              onChange={(event) => setTechnicianFilter(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">All technicians</option>
              {technicians.map((technician) => (
                <option key={technician} value={technician}>
                  {technician}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="px-4 py-8 text-sm text-slate-500">No time entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Technician
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Started
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
                {filteredEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {entry.technicianName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatTimeEntryType(entry.entryType)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {entry.jobNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {formatDateTime(entry.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-slate-700">
                      {entry.durationMinutes != null
                        ? formatDurationMinutes(entry.durationMinutes)
                        : "Active"}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {entry.endedAt ? "Closed" : "Active"}
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
