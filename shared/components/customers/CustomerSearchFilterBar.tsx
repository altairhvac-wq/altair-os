import { Filter, Search } from "lucide-react";
import {
  CUSTOMER_STATUS_OPTIONS,
  type CustomerStatus,
} from "@/shared/types/customer";

type CustomerSearchFilterBarProps = {
  search: string;
  statusFilter: CustomerStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: CustomerStatus | "all") => void;
  resultCount: number;
};

const filterSelectClass =
  "h-9 w-full min-h-9 appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:w-auto sm:pr-10";

export function CustomerSearchFilterBar({
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  resultCount,
}: CustomerSearchFilterBarProps) {
  return (
    <div className="shrink-0 border-b border-slate-100/90 bg-white px-3 py-2 sm:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, phone, or company..."
            className="h-9 w-full min-h-9 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <div className="relative shrink-0">
          <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) =>
              onStatusFilterChange(e.target.value as CustomerStatus | "all")
            }
            className={filterSelectClass}
            aria-label="Filter by status"
          >
            {CUSTOMER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {search.trim() || statusFilter !== "all" ? (
        <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
          {resultCount} {resultCount === 1 ? "customer" : "customers"}
        </p>
      ) : null}
    </div>
  );
}
