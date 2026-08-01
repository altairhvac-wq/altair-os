"use client";

import { useState } from "react";
import { ChevronDown, Filter, Search, SlidersHorizontal } from "lucide-react";
import { BulkSelectAllControl } from "@/shared/components/bulk/BulkSelectAllControl";
import {
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
  JOB_LIFECYCLE_FILTER_OPTIONS,
  type JobLifecycleState,
  type JobPriority,
  type JobStatus,
} from "@/shared/types/job";
import { JobsViewTabs, type TodayAllViewTab } from "./JobsViewTabs";
import { jobMissionClasses as jm } from "./job-list-presentation";

type JobSearchFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  resultLabel?: string;
  statusFilter?: JobStatus | "all";
  priorityFilter?: JobPriority | "all";
  onStatusFilterChange?: (value: JobStatus | "all") => void;
  onPriorityFilterChange?: (value: JobPriority | "all") => void;
  lifecycleFilter?: JobLifecycleState;
  onLifecycleFilterChange?: (value: JobLifecycleState) => void;
  showLifecycleFilter?: boolean;
  showJobFilters?: boolean;
  /** Desktop status filtering lives in the header pills; keep a mobile select. */
  showMobileStatusFilter?: boolean;
  unassignedOnly?: boolean;
  onUnassignedOnlyChange?: (value: boolean) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  /** Compact Today/All + status fallback for viewports below lg. */
  mobileViewControls?: {
    viewTab: TodayAllViewTab;
    onViewTabChange: (tab: TodayAllViewTab) => void;
    todayCount: number;
    allCount: number;
  };
  bulkSelectAllControl?: {
    selectableCount: number;
    allSelected: boolean;
    onSelectAll: () => void;
    onClearSelection: () => void;
    className?: string;
  };
  /** @deprecated Mission Control unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
};

export function JobSearchFilterBar({
  search,
  onSearchChange,
  resultCount,
  resultLabel = "results",
  statusFilter = "all",
  priorityFilter = "all",
  onStatusFilterChange,
  onPriorityFilterChange,
  lifecycleFilter = "active",
  onLifecycleFilterChange,
  showLifecycleFilter = false,
  showJobFilters = false,
  showMobileStatusFilter = false,
  unassignedOnly = false,
  onUnassignedOnlyChange,
  hasActiveFilters = false,
  onClearFilters,
  mobileViewControls,
  bulkSelectAllControl,
}: JobSearchFilterBarProps) {
  const hasSecondaryFilters =
    showJobFilters &&
    Boolean(
      onPriorityFilterChange ||
        onUnassignedOnlyChange ||
        (showLifecycleFilter && onLifecycleFilterChange),
    );

  const secondaryFilterActive =
    priorityFilter !== "all" ||
    unassignedOnly ||
    (showLifecycleFilter && lifecycleFilter !== "active");

  const [moreFiltersOpen, setMoreFiltersOpen] = useState(secondaryFilterActive);

  const showMoreFilters = moreFiltersOpen || secondaryFilterActive;

  return (
    <div className="job-mission-search">
      {mobileViewControls ? (
        <div className="mb-2 space-y-2 lg:hidden">
          <JobsViewTabs
            activeTab={mobileViewControls.viewTab}
            onTabChange={mobileViewControls.onViewTabChange}
            todayCount={mobileViewControls.todayCount}
            allCount={mobileViewControls.allCount}
          />
          {showMobileStatusFilter && onStatusFilterChange ? (
            <div className="relative min-w-0">
              <Filter
                className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${jm.filterIcon}`}
              />
              <select
                value={statusFilter}
                onChange={(e) =>
                  onStatusFilterChange(e.target.value as JobStatus | "all")
                }
                className={jm.filterSelect}
                aria-label="Filter by status"
              >
                {JOB_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative min-w-0 w-full flex-1">
          <Search
            className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${jm.filterIcon}`}
          />
          <input
            id="jobs-search"
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onSearchChange("");
              }
            }}
            placeholder="Search jobs, customers, estimates, invoices…"
            aria-label="Search jobs"
            autoComplete="off"
            className={jm.searchInput}
          />
        </div>

        {hasSecondaryFilters ? (
          <button
            type="button"
            onClick={() => setMoreFiltersOpen((open) => !open)}
            aria-expanded={showMoreFilters}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-altair-border bg-altair-paper-elevated px-3 text-sm font-medium text-altair-ink-on-paper transition-colors hover:border-altair-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated md:min-h-10 lg:shrink-0"
          >
            <SlidersHorizontal className={`h-3.5 w-3.5 ${jm.filterIcon}`} />
            More filters
            {secondaryFilterActive ? (
              <span className="rounded-md bg-altair-ink-on-paper/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-altair-ink-on-paper-secondary">
                On
              </span>
            ) : null}
            <ChevronDown
              className={`h-3.5 w-3.5 text-altair-ink-on-paper-muted transition-transform ${
                showMoreFilters ? "rotate-180" : ""
              }`}
            />
          </button>
        ) : null}

        {bulkSelectAllControl ? (
          <BulkSelectAllControl {...bulkSelectAllControl} />
        ) : null}
      </div>

      {hasSecondaryFilters && showMoreFilters ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {showLifecycleFilter && onLifecycleFilterChange ? (
            <div className="relative min-w-0 sm:max-w-[11rem]">
              <Filter
                className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${jm.filterIcon}`}
              />
              <select
                value={lifecycleFilter}
                onChange={(e) =>
                  onLifecycleFilterChange(e.target.value as JobLifecycleState)
                }
                className={jm.filterSelect}
                aria-label="Filter by lifecycle"
              >
                {JOB_LIFECYCLE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {onPriorityFilterChange ? (
            <div className="relative min-w-0 sm:max-w-[11rem]">
              <Filter
                className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${jm.filterIcon}`}
              />
              <select
                value={priorityFilter}
                onChange={(e) =>
                  onPriorityFilterChange(e.target.value as JobPriority | "all")
                }
                className={jm.filterSelect}
                aria-label="Filter by priority"
              >
                {JOB_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {onUnassignedOnlyChange ? (
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-altair-border bg-altair-paper-elevated px-3 text-sm font-medium text-altair-ink-on-paper md:min-h-10">
              <input
                type="checkbox"
                checked={unassignedOnly}
                onChange={(e) => onUnassignedOnlyChange(e.target.checked)}
                className="h-4 w-4 rounded border-altair-border text-altair-brass focus:ring-altair-brass/40"
                aria-label="Show unassigned jobs only"
              />
              Unassigned
            </label>
          ) : null}
        </div>
      ) : null}

      {search.trim() || showJobFilters || unassignedOnly || statusFilter !== "all" ? (
        <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${jm.filterMeta}`}>
          <span>
            {resultCount}{" "}
            {resultCount === 1 ? resultLabel.replace(/s$/, "") : resultLabel}
            {unassignedOnly ? " · Unassigned only" : ""}
          </span>
          {hasActiveFilters && onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className={jm.clearFilters}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
