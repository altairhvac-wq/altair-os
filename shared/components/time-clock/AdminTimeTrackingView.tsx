"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { TimeNorthStarView } from "@/shared/components/time-clock/north-star-m9";
import {
  formatDateTime,
  formatDurationMinutes,
  formatTechnicianTimeState,
  formatTimeEntryType,
  getTechnicianTimeStateStyles,
  type TimeEntry,
} from "@/shared/types/time-entry";
import { JobContextFilterBanner } from "@/shared/components/layout/JobContextFilterBanner";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSection,
  MasterPageSurface,
  MasterShellPage,
  masterPanelHeaderClass,
} from "@/shared/design-system/shell";

type AdminTimeTrackingViewProps = {
  entries: TimeEntry[];
  activeEntries: TimeEntry[];
  canViewAll: boolean;
  initialJobId?: string;
  initialJobLabel?: string;
};

function matchesJobFilter(entry: TimeEntry, jobId?: string): boolean {
  return !jobId || entry.jobId === jobId;
}

export function AdminTimeTrackingView(props: AdminTimeTrackingViewProps) {
  if (isNorthStarShellEnabled()) {
    return <TimeNorthStarView {...props} />;
  }

  return <AdminTimeTrackingLegacyView {...props} />;
}

function AdminTimeTrackingLegacyView({
  entries,
  activeEntries,
  canViewAll,
  initialJobId,
  initialJobLabel,
}: AdminTimeTrackingViewProps) {
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");

  const technicians = useMemo(() => {
    const scopedEntries = initialJobId
      ? entries.filter((entry) => matchesJobFilter(entry, initialJobId))
      : entries;
    const names = new Set(scopedEntries.map((entry) => entry.technicianName));
    return Array.from(names).sort();
  }, [entries, initialJobId]);

  const filteredActiveEntries = useMemo(() => {
    return activeEntries.filter(
      (entry) =>
        matchesJobFilter(entry, initialJobId) &&
        (technicianFilter === "all" ||
          entry.technicianName === technicianFilter),
    );
  }, [activeEntries, initialJobId, technicianFilter]);

  const filteredEntries = useMemo(() => {
    return entries.filter(
      (entry) =>
        matchesJobFilter(entry, initialJobId) &&
        (technicianFilter === "all" ||
          entry.technicianName === technicianFilter),
    );
  }, [entries, initialJobId, technicianFilter]);

  if (!canViewAll) {
    return (
      <MasterShellPage density="compact">
        <MasterPageCanvas width="standard">
          <MasterPageSurface
            variant="section"
            className="rounded-2xl p-6 text-sm text-slate-600"
          >
            You do not have permission to view company time entries.
          </MasterPageSurface>
        </MasterPageCanvas>
      </MasterShellPage>
    );
  }

  return (
    <MasterShellPage density="compact">
      <MasterPageCanvas width="standard">
        <MasterContentStack density="compact">
          <MasterPageHeader
            title="Time & labor review"
            subtitle="Canonical shift, break, and job-labor entries for payroll accuracy. Technicians track time through Start work and Complete work on jobs."
            density="compact"
          />

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href="/reports"
              className="font-semibold text-cyan-700 hover:text-cyan-800"
            >
              Payroll review
            </Link>
            <span className="text-slate-300" aria-hidden="true">
              ·
            </span>
            <Link
              href="/time-clock"
              className="font-semibold text-cyan-700 hover:text-cyan-800"
            >
              Shift exceptions
            </Link>
          </div>

          {initialJobId && initialJobLabel ? (
            <JobContextFilterBanner
              jobLabel={initialJobLabel}
              clearHref="/time"
            />
          ) : null}

          <MasterPageSection title="Active technicians" density="compact">
            {filteredActiveEntries.length === 0 ? (
              <p className="text-sm text-slate-500">
                {initialJobId
                  ? "No active labor entries for this job."
                  : "No technicians are currently on the clock."}
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredActiveEntries.map((entry) => (
                  <MasterPageSurface
                    key={entry.id}
                    variant="section"
                    className="rounded-2xl p-4"
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
                  </MasterPageSurface>
                ))}
              </div>
            )}
          </MasterPageSection>

          <MasterPageSurface variant="card">
            <div
              className={`${masterPanelHeaderClass} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
            >
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Time</h2>
                <p className="text-xs text-slate-500">
                  Shift, break, and job-labor entries
                  {initialJobLabel ? ` for Job ${initialJobLabel}` : ""} ·{" "}
                  {filteredEntries.length} entr
                  {filteredEntries.length === 1 ? "y" : "ies"}
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
              <p className="px-4 py-8 text-sm text-slate-500">
                {initialJobId
                  ? "No time entries for this job yet."
                  : "No time entries yet."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-white">
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
                      <tr
                        key={entry.id}
                        className={
                          initialJobId && entry.jobId === initialJobId
                            ? "bg-cyan-50/40"
                            : undefined
                        }
                      >
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
          </MasterPageSurface>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
