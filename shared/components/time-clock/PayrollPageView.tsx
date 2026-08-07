"use client";

/**
 * Payroll page (`/payroll`) — panel 17 of the build roadmap.
 *
 * Single code path replacing AdminTimeTrackingView's legacy/north-star fork:
 * one view, MC v2 chrome, with the retired TimeQueueTabs pattern replaced by
 * clickable queue stat tiles (PayrollStatStrip) — the same consolidation
 * panels 7–9 performed on Estimates/Invoices. Entry rendering is the
 * promoted m9 list (PayrollEntriesList); data semantics are unchanged from
 * the previous view (visual pass and data pass stay separate, per the
 * design-system build workflow).
 */

import { useMemo, useState } from "react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import type { TimeEntry } from "@/shared/types/time-entry";
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
import { PayrollEntriesList } from "./PayrollEntriesList";
import { PayrollStatStrip } from "./PayrollStatStrip";
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

export type PayrollPageViewProps = {
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

export function PayrollPageView({
  entries,
  activeEntries,
  canViewAll,
  initialJobId,
  initialJobLabel,
}: PayrollPageViewProps) {
  const northStar = isNorthStarShellEnabled();

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

  const header = (
    <MasterPageHeader
      title="Payroll"
      subtitle="Review time entries, approve labor, and prepare payroll."
      density="compact"
      {...(northStar
        ? {
            surfaceVariant: "northStar" as const,
            className: `north-star-time-page-header ${lt.pageHeader}`,
            titleClassName: lt.pageHeaderTitle,
            subtitleClassName: lt.pageHeaderSubtitle,
          }
        : {})}
    />
  );

  if (!canViewAll) {
    return (
      <MasterShellPage
        density="compact"
        className={northStar ? lt.pageCanvas : undefined}
      >
        {header}
        <MasterContentStack
          density="compact"
          className="min-w-0 px-3 sm:px-3.5 lg:px-5"
        >
          <p className="rounded-[var(--radius-section)] border border-[var(--north-star-plate-border)] bg-[var(--surface-section)] px-4 py-3.5 text-sm text-altair-ink-on-paper-muted">
            You do not have permission to view company time entries.
          </p>
        </MasterContentStack>
      </MasterShellPage>
    );
  }

  return (
    <MasterShellPage
      density="compact"
      className={northStar ? lt.pageCanvas : undefined}
    >
      {header}

      <MasterContentStack
        density="compact"
        className="min-w-0 space-y-3 px-3 sm:space-y-3.5 sm:px-3.5 lg:px-5"
      >
        {initialJobId && initialJobLabel ? (
          <JobContextFilterBanner
            jobLabel={initialJobLabel}
            clearHref="/payroll"
          />
        ) : null}

        <PayrollStatStrip
          counts={queueCounts}
          activeQueue={workQueue}
          onQueueChange={setWorkQueue}
        />

        <MasterPageSurface
          variant={northStar ? "northStarList" : "workspace"}
          className={`${masterListPageSurfaceClass} ${
            northStar ? lt.listSurface : ""
          } overflow-hidden rounded-[1.25rem]`}
        >
          {northStar ? (
            <div aria-hidden="true" className={lt.listSurfaceTopAccent} />
          ) : null}

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {!hasNoEntries ? (
              <TimeTrackingSearchFilterBar
                search={search}
                onSearchChange={setSearch}
                technicianFilter={technicianFilter}
                onTechnicianFilterChange={setTechnicianFilter}
                technicians={technicians}
                resultCount={filteredEntries.length}
                northStar={northStar}
              />
            ) : null}

            <div className={masterListPageScrollRegionClass}>
              {hasNoEntries ? (
                <p className="px-4 py-8 text-center text-sm text-altair-ink-on-paper-muted sm:px-5">
                  {initialJobId
                    ? "No time entries for this job yet."
                    : "No time entries yet."}
                </p>
              ) : hasNoQueueEntries || hasNoResults ? (
                <p className="px-4 py-8 text-center text-sm text-altair-ink-on-paper-muted sm:px-5">
                  {hasNoResults && !hasNoQueueEntries
                    ? "No time entries match your search."
                    : getQueueEmptyMessage(workQueue, initialJobLabel)}
                </p>
              ) : (
                <div className="px-3 pb-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
                  <PayrollEntriesList
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
