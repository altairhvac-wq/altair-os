import { Filter, Search } from "lucide-react";
import {
  SERVICE_ITEM_LIFECYCLE_FILTER_OPTIONS,
  SERVICE_ITEM_STATUS_OPTIONS,
  type ServiceItemLifecycleState,
} from "@/shared/types/service-item";
import { BulkSelectAllControl } from "@/shared/components/bulk/BulkSelectAllControl";

type ServiceItemsSearchFilterBarProps = {
  search: string;
  statusFilter: "all" | "active" | "inactive";
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: "all" | "active" | "inactive") => void;
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
  "appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20";

const legacySearchClass =
  "w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20";

const northStarCatalogToolbarClass =
  "shrink-0 border-b-2 border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-3 py-3 sm:px-4 lg:px-5";

const northStarCatalogSearchClass =
  "h-9 w-full min-h-9 rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FBF7EF] py-1.5 pl-9 pr-3 text-sm font-medium text-[#17130E] placeholder:text-[#6B6255] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FFF9EA] focus:ring-2 focus:ring-[rgba(201,164,77,0.18)]";

const northStarCatalogSelectClass =
  "h-9 w-full min-h-9 appearance-none rounded-lg border border-[rgba(138,99,36,0.22)] bg-[#FBF7EF] py-1.5 pl-9 pr-8 text-sm font-semibold text-[#17130E] outline-none transition-colors focus:border-[#B88A2E] focus:bg-[#FFF9EA] focus:ring-2 focus:ring-[rgba(201,164,77,0.18)] sm:w-auto sm:pr-10";

const northStarCatalogFilterIconClass = "text-[#6B6255]";

const northStarCatalogMetaClass = "mt-2 text-xs font-medium text-[#4F4638]";

export function ServiceItemsSearchFilterBar({
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
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
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, description, or category..."
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
                {SERVICE_ITEM_LIFECYCLE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <div className="relative shrink-0">
            <Filter
              className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${filterIconClass}`}
            />
            <select
              value={statusFilter}
              onChange={(e) =>
                onStatusFilterChange(
                  e.target.value as "all" | "active" | "inactive",
                )
              }
              className={selectClass}
            >
              {SERVICE_ITEM_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
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
