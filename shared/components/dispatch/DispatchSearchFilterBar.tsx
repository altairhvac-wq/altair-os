import { Filter, Inbox, Search } from "lucide-react";
import {
  DISPATCH_STATUS_OPTIONS,
  type DispatchJobStatus,
  type Technician,
} from "@/shared/types/dispatch";

type DispatchSearchFilterBarProps = {
  search: string;
  statusFilter: DispatchJobStatus | "all";
  technicianFilter: string;
  technicians: Technician[];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: DispatchJobStatus | "all") => void;
  onTechnicianFilterChange: (value: string) => void;
  resultCount: number;
  unassignedCount: number;
  onOpenUnassigned: () => void;
  /** Slim inline bar for desktop board header */
  compact?: boolean;
};

export function DispatchSearchFilterBar({
  search,
  statusFilter,
  technicianFilter,
  technicians,
  onSearchChange,
  onStatusFilterChange,
  onTechnicianFilterChange,
  resultCount,
  unassignedCount,
  onOpenUnassigned,
  compact = false,
}: DispatchSearchFilterBarProps) {
  const wrapperClass = compact
    ? "px-0 py-0"
    : "rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:rounded-2xl sm:px-4 sm:py-3";

  return (
    <div className={wrapperClass}>
      <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-3" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search jobs..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:py-2.5 sm:pl-10 sm:pr-4 sm:placeholder:text-slate-400"
            aria-label="Search customer, job type, technician, address, or status"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3">
          <div className="relative min-w-0 shrink-0">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-3" />
            <select
              value={statusFilter}
              onChange={(e) =>
                onStatusFilterChange(e.target.value as DispatchJobStatus | "all")
              }
              className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:py-2.5 sm:pl-10 sm:pr-10 sm:w-auto"
            >
              {DISPATCH_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-0 shrink-0">
            <Filter className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 sm:left-3" />
            <select
              value={technicianFilter}
              onChange={(e) => onTechnicianFilterChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:py-2.5 sm:pl-10 sm:pr-10 sm:w-auto"
            >
              <option value="all">All technicians</option>
              <option value="unassigned">Unassigned only</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenUnassigned}
            className="col-span-2 inline-flex min-h-[2.75rem] shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 sm:col-span-1 sm:min-h-0 sm:py-2.5"
          >
            <Inbox className="h-4 w-4 shrink-0" />
            <span className="sm:hidden">Unassigned</span>
            <span className="hidden sm:inline">Unassigned Jobs</span>
            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-bold text-amber-900">
              {unassignedCount}
            </span>
          </button>
        </div>
      </div>

      {!compact ? (
        <p className="mt-1 text-[11px] text-slate-500 sm:mt-2 sm:text-xs">
          {resultCount} {resultCount === 1 ? "job" : "jobs"} on board
        </p>
      ) : null}
    </div>
  );
}
