import { Filter, Search } from "lucide-react";
import {
  ALPHA_TRACKER_SEVERITY_FILTER_OPTIONS,
  ALPHA_TRACKER_STATUS_FILTER_OPTIONS,
  ALPHA_TRACKER_TYPE_FILTER_OPTIONS,
  type AlphaTrackerSeverity,
  type AlphaTrackerStatus,
  type AlphaTrackerType,
} from "@/shared/types/alpha-tracker";

type AlphaTrackerFilterBarProps = {
  search: string;
  typeFilter: AlphaTrackerType | "all";
  severityFilter: AlphaTrackerSeverity | "all";
  statusFilter: AlphaTrackerStatus | "all";
  onSearchChange: (value: string) => void;
  onTypeFilterChange: (value: AlphaTrackerType | "all") => void;
  onSeverityFilterChange: (value: AlphaTrackerSeverity | "all") => void;
  onStatusFilterChange: (value: AlphaTrackerStatus | "all") => void;
  resultCount: number;
};

export function AlphaTrackerFilterBar({
  search,
  typeFilter,
  severityFilter,
  statusFilter,
  onSearchChange,
  onTypeFilterChange,
  onSeverityFilterChange,
  onStatusFilterChange,
  resultCount,
}: AlphaTrackerFilterBarProps) {
  return (
    <div className="border-b border-slate-100 px-4 py-3">
      <div className="flex flex-col gap-3">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search title, area, or description..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <FilterSelect
            value={typeFilter}
            options={ALPHA_TRACKER_TYPE_FILTER_OPTIONS}
            onChange={(value) =>
              onTypeFilterChange(value as AlphaTrackerType | "all")
            }
          />
          <FilterSelect
            value={severityFilter}
            options={ALPHA_TRACKER_SEVERITY_FILTER_OPTIONS}
            onChange={(value) =>
              onSeverityFilterChange(value as AlphaTrackerSeverity | "all")
            }
          />
          <FilterSelect
            value={statusFilter}
            options={ALPHA_TRACKER_STATUS_FILTER_OPTIONS}
            onChange={(value) =>
              onStatusFilterChange(value as AlphaTrackerStatus | "all")
            }
          />
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {resultCount} {resultCount === 1 ? "item" : "items"}
      </p>
    </div>
  );
}

type FilterSelectProps = {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

function FilterSelect({ value, options, onChange }: FilterSelectProps) {
  return (
    <div className="relative min-w-0">
      <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none truncate rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
