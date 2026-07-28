import { Filter, Search } from "lucide-react";
import { BulkSelectAllControl } from "@/shared/components/bulk/BulkSelectAllControl";
import {
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
  JOB_LIFECYCLE_FILTER_OPTIONS,
  type JobLifecycleState,
  type JobPriority,
  type JobStatus,
} from "@/shared/types/job";
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
  unassignedOnly?: boolean;
  onUnassignedOnlyChange?: (value: boolean) => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
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
  unassignedOnly = false,
  onUnassignedOnlyChange,
  hasActiveFilters = false,
  onClearFilters,
  bulkSelectAllControl,
}: JobSearchFilterBarProps) {
  const showSecondaryFilters =
    showJobFilters && onStatusFilterChange && onPriorityFilterChange;

  return (
    <div className="job-mission-search">
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

        {showLifecycleFilter && onLifecycleFilterChange ? (
          <div className="relative min-w-0 lg:shrink-0">
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

        {showSecondaryFilters ? (
          <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0 lg:flex-row lg:items-center lg:gap-2">
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

            <div className="relative min-w-0">
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
          </div>
        ) : null}

        {showJobFilters && onUnassignedOnlyChange ? (
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-altair-border bg-altair-paper-elevated px-3 text-sm font-medium text-altair-ink-on-paper md:min-h-10 lg:shrink-0">
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

        {bulkSelectAllControl ? (
          <BulkSelectAllControl {...bulkSelectAllControl} />
        ) : null}
      </div>

      {search.trim() || showJobFilters || unassignedOnly ? (
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
