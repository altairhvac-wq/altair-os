import { Filter, Search } from "lucide-react";
import {
  MOCK_TIME_ENTRY_STATUS_OPTIONS,
  type MockTimeEntryStatus,
} from "@/shared/types/time-entry-mock";

type TimeSearchFilterBarProps = {
  search: string;
  statusFilter: MockTimeEntryStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: MockTimeEntryStatus | "all") => void;
  resultCount: number;
};

export function TimeSearchFilterBar({
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  resultCount,
}: TimeSearchFilterBarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search time entries..."
          className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(event.target.value as MockTimeEntryStatus | "all")
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          >
            {MOCK_TIME_ENTRY_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-500">{resultCount} results</span>
      </div>
    </div>
  );
}
