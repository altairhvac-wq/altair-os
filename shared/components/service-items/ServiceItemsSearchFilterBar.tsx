import { Filter, Search } from "lucide-react";
import {
  SERVICE_ITEM_LIFECYCLE_FILTER_OPTIONS,
  type ServiceItemLifecycleState,
} from "@/shared/types/service-item";
import { BulkSelectAllControl } from "@/shared/components/bulk/BulkSelectAllControl";

type ServiceItemsSearchFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  lifecycleFilter?: ServiceItemLifecycleState;
  onLifecycleFilterChange?: (value: ServiceItemLifecycleState) => void;
  showLifecycleFilter?: boolean;
  bulkSelectAllControl?: {
    selectableCount: number;
    allSelected: boolean;
    onSelectAll: () => void;
    onClearSelection: () => void;
  };
  northStar?: boolean;
};

const legacySelectClass =
  "h-11 min-h-11 appearance-none rounded-xl border border-altair-border bg-altair-paper-elevated py-2.5 pl-10 pr-10 text-sm font-medium text-altair-ink-on-paper outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated md:h-10 md:min-h-10";

const legacySearchClass =
  "h-11 min-h-11 w-full rounded-xl border border-altair-border bg-altair-paper-elevated py-2.5 pl-10 pr-3 text-sm text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated md:h-10 md:min-h-10";

const northStarCatalogToolbarClass =
  "shrink-0 border-b-2 border-[rgba(119,89,27,0.22)] bg-[#FFF9EA] px-3 py-3 sm:px-4 lg:px-5";

const northStarCatalogSearchClass =
  "h-11 w-full min-h-11 rounded-xl border border-altair-border bg-altair-paper-elevated py-1.5 pl-9 pr-3 text-sm font-medium text-altair-ink-on-paper placeholder:text-altair-ink-on-paper-muted outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated md:h-9 md:min-h-9";

const northStarCatalogSelectClass =
  "h-11 w-full min-h-11 appearance-none rounded-xl border border-altair-border bg-altair-paper-elevated py-1.5 pl-9 pr-8 text-sm font-semibold text-altair-ink-on-paper outline-none transition-colors hover:border-altair-border-strong focus-visible:border-altair-border-strong focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated sm:w-auto sm:pr-10 md:h-9 md:min-h-9";

const northStarCatalogFilterIconClass = "text-[#7C7259]";

const northStarCatalogMetaClass = "mt-2 text-xs font-medium text-[#4F4638]";

export function ServiceItemsSearchFilterBar({
  search,
  onSearchChange,
  resultCount,
  lifecycleFilter = "active",
  onLifecycleFilterChange,
  showLifecycleFilter = false,
  bulkSelectAllControl,
  northStar = false,
}: ServiceItemsSearchFilterBarProps) {
  const searchInputClass = northStar ? northStarCatalogSearchClass : legacySearchClass;
  const selectClass = northStar ? northStarCatalogSelectClass : legacySelectClass;
  const resultMetaClass = northStar ? northStarCatalogMetaClass : "admin-text-helper";
  const filterIconClass = northStar ? northStarCatalogFilterIconClass : "text-slate-400";

  return (
    <div
      className={
        northStar
          ? northStarCatalogToolbarClass
          : "shrink-0 border-b border-slate-100/90 bg-white px-4 py-3"
      }
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${filterIconClass}`}
          />
          <input
            type="search"
            aria-label="Search price book items"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, description, or category…"
            className={searchInputClass}
          />
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {showLifecycleFilter && onLifecycleFilterChange ? (
            <div className="relative shrink-0">
              <Filter
                className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${filterIconClass}`}
              />
              <select
                value={lifecycleFilter}
                onChange={(e) =>
                  onLifecycleFilterChange(
                    e.target.value as ServiceItemLifecycleState,
                  )
                }
                aria-label="Filter by lifecycle"
                className={selectClass}
              >
                {SERVICE_ITEM_LIFECYCLE_FILTER_OPTIONS.filter(
                  (option) =>
                    option.value === "archived" || option.value === "deleted",
                ).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {bulkSelectAllControl ? (
            <BulkSelectAllControl {...bulkSelectAllControl} northStar={northStar} />
          ) : null}
        </div>
      </div>

      <p className={resultMetaClass}>
        {resultCount} {resultCount === 1 ? "item" : "items"}
      </p>
    </div>
  );
}
