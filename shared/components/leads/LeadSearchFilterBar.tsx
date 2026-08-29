import { Search } from "lucide-react";
import {
  LEAD_STATUS_OPTIONS,
  type LeadSortField,
  type LeadStatus,
} from "@/shared/types/lead";
import {
  LEAD_LIST_FILTER_LABELS,
  LEAD_LIST_FILTER_ORDER,
  type LeadListFilter,
} from "./lead-work-queues";
import { leadMissionClasses as lm } from "./lead-list-presentation";

type LeadSearchFilterBarProps = {
  search: string;
  statusFilter: LeadStatus | "all";
  sortField: LeadSortField;
  listFilter: LeadListFilter;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: LeadStatus | "all") => void;
  onSortFieldChange: (value: LeadSortField) => void;
  onListFilterChange: (value: LeadListFilter) => void;
  resultCount: number;
  showStatusFilter?: boolean;
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
  listFilter,
  onSearchChange,
  onStatusFilterChange,
  onSortFieldChange,
  onListFilterChange,
  resultCount,
  showStatusFilter = false,
}: LeadSearchFilterBarProps) {
  return (
    <div className={lm.filterRegion}>
      <div className={lm.filterSearchBand}>
        {/* Header pills are lg+ only; keep queue switching on smaller viewports. */}
        <label className="mb-2 block lg:hidden">
          <span className="sr-only">Lead filter</span>
          <select
            value={listFilter}
            onChange={(event) =>
              onListFilterChange(event.target.value as LeadListFilter)
            }
            className={lm.filterSelect}
            aria-label="Filter leads"
          >
            {LEAD_LIST_FILTER_ORDER.map((filter) => (
              <option key={filter} value={filter}>
                {LEAD_LIST_FILTER_LABELS[filter]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <Search
              className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${lm.filterIcon}`}
            />
            <input
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search leads…"
              className={lm.searchInput}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            {showStatusFilter ? (
              <select
                value={statusFilter}
                onChange={(event) =>
                  onStatusFilterChange(event.target.value as LeadStatus | "all")
                }
                className={lm.filterSelect}
                aria-label="Filter by status"
              >
                {LEAD_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : null}

            <select
              value={sortField}
              onChange={(event) =>
                onSortFieldChange(event.target.value as LeadSortField)
              }
              className={lm.filterSelect}
              aria-label="Sort leads"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className={lm.filterMeta}>
          {resultCount} lead{resultCount === 1 ? "" : "s"}
        </p>
      </div>
    </div>
  );
}
