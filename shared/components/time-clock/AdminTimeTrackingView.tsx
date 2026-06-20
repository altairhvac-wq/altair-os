"use client";

import { useMemo, useState } from "react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { TimeNorthStarView } from "@/shared/components/time-clock/north-star-m9";
import {
  formatDateTime,
  formatDurationMinutes,
  formatTimeEntryType,
  type TimeEntry,
} from "@/shared/types/time-entry";
import { JobContextFilterBanner } from "@/shared/components/layout/JobContextFilterBanner";
import {
  MasterContentStack,
  MasterPageCanvas,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
  masterListPageScrollRegionClass,
} from "@/shared/design-system/shell";
import { TimeQueueTabs } from "./TimeQueueTabs";
import { TimeTrackingSearchFilterBar } from "./TimeTrackingSearchFilterBar";
import {
  countTimeEntriesForWorkQueue,
  filterTimeEntriesBySearch,
  filterTimeEntriesForWorkQueue,
  mergeTimeEntries,
  resolveDefaultTimeWorkQueue,
  sortTimeEntriesForWorkQueue,
  type TimeWorkQueue,
} from "./time-work-queues";

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

function getQueueEmptyMessage(queue: TimeWorkQueue, jobLabel?: string): string {
  const scope = jobLabel ? ` for Job ${jobLabel}` : "";

  switch (queue) {
    case "needs-review":
      return `No time entries need review${scope}.`;
    case "approved":
      return `No approved time entries${scope} for the current period.`;
    case "active":
      return jobLabel
        ? "No active labor entries for this job."
        : "No technicians are currently on the clock.";
    case "past":
      return `No past time entries${scope} match your filters.`;
  }
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
  const mergedEntries = useMemo(
    () => mergeTimeEntries(entries, activeEntries),
    [entries, activeEntries],
  );

  const [workQueue, setWorkQueue] = useState<TimeWorkQueue>(() =>
    resolveDefaultTimeWorkQueue(entries, activeEntries),
  );
  const [search, setSearch] = useState("");
  const [technicianFilter, setTechnicianFilter] = useState<string>("all");

  const technicians = useMemo(() => {
    const scopedEntries = initialJobId
      ? mergedEntries.filter((entry) => matchesJobFilter(entry, initialJobId))
      : mergedEntries;
    const names = new Set(scopedEntries.map((entry) => entry.technicianName));
    return Array.from(names).sort();
  }, [mergedEntries, initialJobId]);

  const scopedEntries = useMemo(() => {
    return mergedEntries.filter(
      (entry) =>
        matchesJobFilter(entry, initialJobId) &&
        (technicianFilter === "all" ||
          entry.technicianName === technicianFilter),
    );
  }, [mergedEntries, initialJobId, technicianFilter]);

  const queueCounts = useMemo(
    () =>
      ({
        "needs-review": countTimeEntriesForWorkQueue(
          scopedEntries,
          "needs-review",
        ),
        approved: countTimeEntriesForWorkQueue(scopedEntries, "approved"),
        active: countTimeEntriesForWorkQueue(scopedEntries, "active"),
        past: countTimeEntriesForWorkQueue(scopedEntries, "past"),
      }) satisfies Record<TimeWorkQueue, number>,
    [scopedEntries],
  );

  const queueScopedEntries = useMemo(
    () => filterTimeEntriesForWorkQueue(scopedEntries, workQueue),
    [scopedEntries, workQueue],
  );

  const filteredEntries = useMemo(
    () =>
      sortTimeEntriesForWorkQueue(
        filterTimeEntriesBySearch(queueScopedEntries, search),
        workQueue,
      ),
    [queueScopedEntries, search, workQueue],
  );

  const hasNoEntries = scopedEntries.length === 0;
  const hasNoQueueEntries = !hasNoEntries && queueScopedEntries.length === 0;
  const hasNoResults = !hasNoEntries && filteredEntries.length === 0;

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
            title="Labor & Payroll"
            subtitle="Review time entries, approve labor, and prepare payroll."
            density="compact"
          />

          {initialJobId && initialJobLabel ? (
            <JobContextFilterBanner
              jobLabel={initialJobLabel}
              clearHref="/time"
            />
          ) : null}

          <MasterPageSurface variant="card">
            {!hasNoEntries ? (
              <div className="shrink-0 border-b border-slate-100/90 px-3 py-1.5 sm:px-4">
                <TimeQueueTabs
                  activeQueue={workQueue}
                  onQueueChange={setWorkQueue}
                  counts={queueCounts}
                />
              </div>
            ) : null}

            {!hasNoEntries ? (
              <TimeTrackingSearchFilterBar
                search={search}
                onSearchChange={setSearch}
                technicianFilter={technicianFilter}
                onTechnicianFilterChange={setTechnicianFilter}
                technicians={technicians}
                resultCount={filteredEntries.length}
              />
            ) : null}

            <div className={masterListPageScrollRegionClass}>
              {hasNoEntries ? (
                <p className="px-4 py-8 text-sm text-slate-500">
                  {initialJobId
                    ? "No time entries for this job yet."
                    : "No time entries yet."}
                </p>
              ) : hasNoQueueEntries || hasNoResults ? (
                <p className="px-4 py-8 text-sm text-slate-500">
                  {hasNoResults && !hasNoQueueEntries
                    ? "No time entries match your search."
                    : getQueueEmptyMessage(workQueue, initialJobLabel)}
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
            </div>
          </MasterPageSurface>
        </MasterContentStack>
      </MasterPageCanvas>
    </MasterShellPage>
  );
}
