import { Filter, Search } from "lucide-react";
import {
  JOB_PRIORITY_OPTIONS,
  JOB_STATUS_OPTIONS,
  type JobPriority,
  type JobStatus,
} from "@/shared/types/job";

type JobSearchFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  resultLabel?: string;
  statusFilter?: JobStatus | "all";
  priorityFilter?: JobPriority | "all";
  onStatusFilterChange?: (value: JobStatus | "all") => void;
  onPriorityFilterChange?: (value: JobPriority | "all") => void;
  showJobFilters?: boolean;
};

const filterSelectClass =
  "h-9 w-full min-h-9 appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 lg:w-auto lg:pr-10";

export function JobSearchFilterBar({
  search,
  onSearchChange,
  resultCount,
  resultLabel = "results",
  statusFilter = "all",
  priorityFilter = "all",
  onStatusFilterChange,
  onPriorityFilterChange,
  showJobFilters = false,
}: JobSearchFilterBarProps) {
  return (
    <div className="shrink-0 border-b border-slate-100/90 bg-white px-3 py-2 sm:px-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative mx-auto min-w-0 w-full max-w-xl flex-1 lg:mx-0">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search customer…"
            className="h-9 w-full min-h-9 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        {showJobFilters && onStatusFilterChange && onPriorityFilterChange ? (
          <div className="grid grid-cols-2 gap-2 lg:flex lg:shrink-0 lg:flex-row lg:items-center lg:gap-2">
            <div className="relative min-w-0">
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  onStatusFilterChange(e.target.value as JobStatus | "all")
                }
                className={filterSelectClass}
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
              <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <select
                value={priorityFilter}
                onChange={(e) =>
                  onPriorityFilterChange(e.target.value as JobPriority | "all")
                }
                className={filterSelectClass}
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
      </div>

      {search.trim() || showJobFilters ? (
        <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
          {resultCount} {resultCount === 1 ? resultLabel.replace(/s$/, "") : resultLabel}
        </p>
      ) : null}
    </div>
  );
}
