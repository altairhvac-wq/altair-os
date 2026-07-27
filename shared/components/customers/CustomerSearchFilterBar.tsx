import { Filter, Search } from "lucide-react";
import {
  CUSTOMER_LIFECYCLE_FILTER_OPTIONS,
  type CustomerLifecycleState,
} from "@/shared/types/customer";
import { customerMissionClasses as cm } from "./customer-list-presentation";

type CustomerSearchFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  /** @deprecated Mission Briefing unifies presentation; retained for call-site compatibility. */
  northStar?: boolean;
  showPastLifecycleFilter?: boolean;
  pastLifecycleFilter?: "archived" | "deleted";
  onPastLifecycleFilterChange?: (value: "archived" | "deleted") => void;
};

const PAST_LIFECYCLE_OPTIONS = CUSTOMER_LIFECYCLE_FILTER_OPTIONS.filter(
  (option) => option.value !== "active",
);

export function CustomerSearchFilterBar({
  search,
  onSearchChange,
  resultCount,
  showPastLifecycleFilter = false,
  pastLifecycleFilter = "archived",
  onPastLifecycleFilterChange,
}: CustomerSearchFilterBarProps) {
  return (
    <div className="customer-mission-search">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${cm.filterIcon}`}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, phone, or company…"
            className={cm.searchInput}
            autoComplete="off"
            aria-label="Search customers"
          />
        </div>

        {showPastLifecycleFilter ? (
          <div className="relative shrink-0">
            <Filter
              className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${cm.filterIcon}`}
            />
            <select
              value={pastLifecycleFilter}
              onChange={(e) =>
                onPastLifecycleFilterChange?.(
                  e.target.value as Exclude<CustomerLifecycleState, "active">,
                )
              }
              className={cm.filterSelect}
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

      <p className={cm.filterMeta}>
        {resultCount} {resultCount === 1 ? "customer" : "customers"}
      </p>
    </div>
  );
}
