import { Filter, Search } from "lucide-react";
import {
  ESTIMATE_STATUS_OPTIONS,
  type EstimateStatus,
} from "@/shared/types/estimate";

type EstimateSearchFilterBarProps = {
  search: string;
  statusFilter: EstimateStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: EstimateStatus | "all") => void;
  resultCount: number;
};

export function EstimateSearchFilterBar({
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  resultCount,
}: EstimateSearchFilterBarProps) {
  return (
    <div className="shrink-0 border-b border-slate-100/90 bg-slate-50/40 px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by estimate #, customer, status, or total..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <div className="relative shrink-0">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange(e.target.value as EstimateStatus | "all")
            }
            className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:w-auto"
          >
            {ESTIMATE_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="admin-text-helper mt-2">
        {resultCount} {resultCount === 1 ? "estimate" : "estimates"}
      </p>
    </div>
  );
}
