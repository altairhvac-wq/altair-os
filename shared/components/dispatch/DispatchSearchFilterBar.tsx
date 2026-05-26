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
}: DispatchSearchFilterBarProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search customer, job type, technician, address, or status..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) =>
                onStatusFilterChange(e.target.value as DispatchJobStatus | "all")
              }
              className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:w-auto"
            >
              {DISPATCH_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative shrink-0">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={technicianFilter}
              onChange={(e) => onTechnicianFilterChange(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:w-auto"
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
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:border-amber-300 hover:bg-amber-100 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          >
            <Inbox className="h-4 w-4" />
            <span>Unassigned Jobs</span>
            <span className="rounded-full bg-amber-200/80 px-2 py-0.5 text-xs font-bold text-amber-900">
              {unassignedCount}
            </span>
          </button>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        {resultCount} {resultCount === 1 ? "job" : "jobs"} on board
      </p>
    </div>
  );
}
