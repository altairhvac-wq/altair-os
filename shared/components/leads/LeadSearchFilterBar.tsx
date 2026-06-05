import { Search } from "lucide-react";
import {
  LEAD_STATUS_OPTIONS,
  type LeadSortField,
  type LeadStatus,
} from "@/shared/types/lead";

type LeadSearchFilterBarProps = {
  search: string;
  statusFilter: LeadStatus | "all";
  sortField: LeadSortField;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: LeadStatus | "all") => void;
  onSortFieldChange: (value: LeadSortField) => void;
  resultCount: number;
};

const SORT_OPTIONS: { value: LeadSortField; label: string }[] = [
  { value: "createdAt", label: "Created date" },
  { value: "status", label: "Status" },
  { value: "nextFollowUpAt", label: "Follow-up date" },
];

export function LeadSearchFilterBar({
  search,
  statusFilter,
  sortField,
  onSearchChange,
  onStatusFilterChange,
  onSortFieldChange,
  resultCount,
}: LeadSearchFilterBarProps) {
  return (
    <div className="shrink-0 space-y-3 border-b border-slate-100/90 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search leads..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none ring-cyan-500/20 transition focus:border-cyan-500 focus:ring-2"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(event.target.value as LeadStatus | "all")
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-cyan-500/20 transition focus:border-cyan-500 focus:ring-2"
          >
            {LEAD_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            value={sortField}
            onChange={(event) =>
              onSortFieldChange(event.target.value as LeadSortField)
            }
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none ring-cyan-500/20 transition focus:border-cyan-500 focus:ring-2"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {resultCount} lead{resultCount === 1 ? "" : "s"}
      </p>
    </div>
  );
}
