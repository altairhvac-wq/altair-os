import { Filter, Search } from "lucide-react";
import {
  DISPATCH_STATUS_OPTIONS,
  type DispatchJobStatus,
  type Technician,
} from "@/shared/types/dispatch";
import { dispatchMissionClasses as dm } from "./dispatch-board-presentation";

type DispatchSearchFilterBarProps = {
  search: string;
  statusFilter: DispatchJobStatus | "all";
  technicianFilter: string;
  technicians: Technician[];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: DispatchJobStatus | "all") => void;
  onTechnicianFilterChange: (value: string) => void;
  resultCount: number;
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
  compact = false,
}: DispatchSearchFilterBarProps) {
  return (
    <div className="min-w-0 max-w-full">
      <div className="flex flex-col gap-2 sm:gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 sm:left-3 ${dm.filterIcon}`}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search jobs..."
            className={dm.searchInput}
            aria-label="Search customer, job type, technician, address, or status"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3">
          <div className="relative min-w-0 shrink-0">
            <Filter
              className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 sm:left-3 ${dm.filterIcon}`}
            />
            <select
              value={statusFilter}
              onChange={(e) =>
                onStatusFilterChange(e.target.value as DispatchJobStatus | "all")
              }
              className={dm.filterSelect}
            >
              {DISPATCH_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-0 shrink-0">
            <Filter
              className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 sm:left-3 ${dm.filterIcon}`}
            />
            <select
              value={technicianFilter}
              onChange={(e) => onTechnicianFilterChange(e.target.value)}
              className={dm.filterSelect}
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
        </div>
      </div>

      {!compact ? (
        <p className={dm.filterMeta}>
          {resultCount} {resultCount === 1 ? "job" : "jobs"} on board
        </p>
      ) : null}
    </div>
  );
}
