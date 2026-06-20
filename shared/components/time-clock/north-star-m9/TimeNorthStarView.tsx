"use client";

import { useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { JobContextFilterBanner } from "@/shared/components/layout/JobContextFilterBanner";
import {
  MasterContentStack,
  MasterPageHeader,
  MasterPageSurface,
  MasterShellPage,
  masterListPageScrollRegionClass,
  masterListPageSurfaceClass,
} from "@/shared/design-system/shell";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import type { TimeEntry } from "@/shared/types/time-entry";
import { TimeQueueTabs } from "../TimeQueueTabs";
import { TimeTrackingSearchFilterBar } from "../TimeTrackingSearchFilterBar";
import {
  countTimeEntriesForWorkQueue,
  filterTimeEntriesBySearch,
  filterTimeEntriesForWorkQueue,
  mergeTimeEntries,
  resolveDefaultTimeWorkQueue,
  sortTimeEntriesForWorkQueue,
  type TimeWorkQueue,
} from "../time-work-queues";
import { TimeNorthStarEntriesList } from "./TimeNorthStarEntriesList";

export type TimeNorthStarViewProps = {
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

export function TimeNorthStarView({
  entries,
  activeEntries,
  canViewAll,
  initialJobId,
  initialJobLabel,
}: TimeNorthStarViewProps) {
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
      <MasterShellPage density="compact" className={lt.pageCanvas}>
        <MasterPageHeader
          title="Labor & Payroll"
          subtitle="Review time entries, approve labor, and prepare payroll."
          density="compact"
          surfaceVariant="northStar"
          className={`north-star-time-page-header ${lt.pageHeader}`}
          titleClassName={lt.pageHeaderTitle}
          subtitleClassName={lt.pageHeaderSubtitle}
        />
        <MasterContentStack
          density="compact"
          className="time-north-star-brief min-w-0 px-3 sm:px-3.5 lg:px-5"
        >
          <div className="flex items-start gap-3 rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-4 py-3.5 text-sm text-[#4F4638]">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-[#8A6324]"
              aria-hidden="true"
            />
            You do not have permission to view company time entries.
          </div>
        </MasterContentStack>
      </MasterShellPage>
    );
  }

  return (
    <MasterShellPage density="compact" className={lt.pageCanvas}>
      <MasterPageHeader
        title="Labor & Payroll"
        subtitle="Review time entries, approve labor, and prepare payroll."
        density="compact"
        surfaceVariant="northStar"
        className={`north-star-time-page-header ${lt.pageHeader}`}
        titleClassName={lt.pageHeaderTitle}
        subtitleClassName={lt.pageHeaderSubtitle}
      />

      <MasterContentStack
        density="compact"
        className="time-north-star-brief min-w-0 space-y-3 px-3 sm:space-y-3.5 sm:px-3.5 lg:px-5"
      >
        {initialJobId && initialJobLabel ? (
          <JobContextFilterBanner
            jobLabel={initialJobLabel}
            clearHref="/time"
          />
        ) : null}

        <MasterPageSurface
          variant="northStarList"
          className={`${masterListPageSurfaceClass} ${lt.listSurface} overflow-hidden rounded-[1.25rem]`}
        >
          <div aria-hidden="true" className={lt.listSurfaceTopAccent} />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {!hasNoEntries ? (
              <div className={`${lt.viewTabsBand} shrink-0`}>
                <TimeQueueTabs
                  activeQueue={workQueue}
                  onQueueChange={setWorkQueue}
                  counts={queueCounts}
                  northStar
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
                northStar
              />
            ) : null}

            <div className={masterListPageScrollRegionClass}>
              {hasNoEntries ? (
                <p className="px-4 py-8 text-center text-sm text-[#6B6255] sm:px-5">
                  {initialJobId
                    ? "No time entries for this job yet."
                    : "No time entries yet."}
                </p>
              ) : hasNoQueueEntries || hasNoResults ? (
                <p className="px-4 py-8 text-center text-sm text-[#6B6255] sm:px-5">
                  {hasNoResults && !hasNoQueueEntries
                    ? "No time entries match your search."
                    : getQueueEmptyMessage(workQueue, initialJobLabel)}
                </p>
              ) : (
                <div className="px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
                  <TimeNorthStarEntriesList
                    entries={filteredEntries}
                    highlightJobId={initialJobId}
                  />
                </div>
              )}
            </div>
          </div>
        </MasterPageSurface>
      </MasterContentStack>
    </MasterShellPage>
  );
}
