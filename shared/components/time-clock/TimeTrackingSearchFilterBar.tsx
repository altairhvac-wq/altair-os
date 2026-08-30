import { Search } from "lucide-react";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

type TimeTrackingSearchFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  technicianFilter: string;
  onTechnicianFilterChange: (value: string) => void;
  technicians: string[];
  resultCount: number;
  northStar?: boolean;
};

const legacySearchClass =
  "h-11 min-h-11 w-full rounded-xl border border-altair-border bg-altair-paper-elevated py-2.5 pl-10 pr-3 text-sm text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated md:h-10 md:min-h-10";

const legacySelectClass =
  "h-11 min-h-11 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 md:h-10 md:min-h-10";

export function TimeTrackingSearchFilterBar({
  search,
  onSearchChange,
  technicianFilter,
  onTechnicianFilterChange,
  technicians,
  resultCount,
  northStar = false,
}: TimeTrackingSearchFilterBarProps) {
  const showTechnicianFilter = technicians.length > 1;

  if (northStar) {
    return (
      <div className={`time-north-star-filter-bar ${lt.filterBar} shrink-0`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6255]"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search time entries"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search time entries…"
              className={`${lt.filterSelect} w-full pl-9`}
            />
          </div>

          {showTechnicianFilter ? (
            <label className="flex flex-col gap-1.5 text-sm text-[#4F4638] sm:flex-row sm:items-center sm:gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#6B6255]">
                Technician
              </span>
              <select
                value={technicianFilter}
                onChange={(event) =>
                  onTechnicianFilterChange(event.target.value)
                }
                className={`${lt.filterSelect} sm:min-w-[12rem]`}
              >
                <option value="all">All technicians</option>
                {technicians.map((technician) => (
                  <option key={technician} value={technician}>
                    {technician}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <p className="mt-2 text-xs font-medium text-[#4F4638]">
          {resultCount} result{resultCount === 1 ? "" : "s"}
        </p>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-b border-slate-100/90 bg-white px-4 py-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            aria-label="Search time entries"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search time entries…"
            className={legacySearchClass}
          />
        </div>

        {showTechnicianFilter ? (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            Technician
            <select
              value={technicianFilter}
              onChange={(event) => onTechnicianFilterChange(event.target.value)}
              className={legacySelectClass}
            >
              <option value="all">All technicians</option>
              {technicians.map((technician) => (
                <option key={technician} value={technician}>
                  {technician}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <p className="admin-text-helper mt-2">{resultCount} results</p>
    </div>
  );
}
