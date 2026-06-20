import { Filter, Search } from "lucide-react";
import {
  CUSTOMER_LIFECYCLE_FILTER_OPTIONS,
  type CustomerLifecycleState,
} from "@/shared/types/customer";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";

type CustomerSearchFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  northStar?: boolean;
  showPastLifecycleFilter?: boolean;
  pastLifecycleFilter?: "archived" | "deleted";
  onPastLifecycleFilterChange?: (value: "archived" | "deleted") => void;
};

const filterSelectClass =
  "h-9 w-full min-h-9 appearance-none rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-8 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:w-auto sm:pr-10";

const PAST_LIFECYCLE_OPTIONS = CUSTOMER_LIFECYCLE_FILTER_OPTIONS.filter(
  (option) => option.value !== "active",
);

export function CustomerSearchFilterBar({
  search,
  onSearchChange,
  resultCount,
  northStar = false,
  showPastLifecycleFilter = false,
  pastLifecycleFilter = "archived",
  onPastLifecycleFilterChange,
}: CustomerSearchFilterBarProps) {
  const searchInputClass = northStar
    ? lt.searchInput
    : "h-9 w-full min-h-9 rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20";
  const selectClass = northStar ? lt.filterSelect : filterSelectClass;

  return (
    <div
      className={
        northStar
          ? `customer-north-star-filter-bar ${lt.filterBar}`
          : "shrink-0 border-b border-slate-100/90 bg-white px-3 py-2 sm:px-4"
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
              northStar ? lt.filterIcon : "text-slate-400"
            }`}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, phone, or company..."
            className={searchInputClass}
          />
        </div>

        {showPastLifecycleFilter ? (
          <div className="relative shrink-0">
            <Filter
              className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
                northStar ? lt.filterIcon : "text-slate-400"
              }`}
            />
            <select
              value={pastLifecycleFilter}
              onChange={(e) =>
                onPastLifecycleFilterChange?.(
                  e.target.value as Exclude<CustomerLifecycleState, "active">,
                )
              }
              className={selectClass}
              aria-label="Filter past customers"
            >
              {PAST_LIFECYCLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      <p className={northStar ? lt.filterMeta : "mt-1 text-[11px] text-slate-500 sm:text-xs"}>
        {resultCount} {resultCount === 1 ? "customer" : "customers"}
      </p>
    </div>
  );
}
