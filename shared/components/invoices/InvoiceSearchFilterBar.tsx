import { Filter, Search } from "lucide-react";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import {
  INVOICE_LIFECYCLE_FILTER_OPTIONS,
  INVOICE_STATUS_OPTIONS,
  type InvoiceLifecycleState,
} from "@/shared/types/invoice";
import type { InvoiceListStatusFilter } from "@/shared/lib/invoice-page-focus";
import { InvoiceBatchSelectAllControl } from "./InvoiceBatchSelectAllControl";

const INVOICE_LIST_STATUS_OPTIONS: {
  value: InvoiceListStatusFilter;
  label: string;
}[] = [
  ...INVOICE_STATUS_OPTIONS,
  { value: "unpaid", label: "Unpaid (outstanding)" },
];

const legacyFilterSelectClass =
  "h-11 min-h-11 w-full appearance-none rounded-lg border border-slate-200/90 bg-white py-2 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:w-auto md:h-10 md:min-h-10";

type InvoiceSearchFilterBarProps = {
  search: string;
  statusFilter: InvoiceListStatusFilter;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: InvoiceListStatusFilter) => void;
  resultCount: number;
  showStatusFilter?: boolean;
  lifecycleFilter?: InvoiceLifecycleState;
  onLifecycleFilterChange?: (value: InvoiceLifecycleState) => void;
  showLifecycleFilter?: boolean;
  batchSelectAllControl?: {
    selectableCount: number;
    allEligibleSelected: boolean;
    onCheckAll: () => void;
    onClearSelection: () => void;
  };
  northStar?: boolean;
};

export function InvoiceSearchFilterBar({
  search,
  statusFilter,
  onSearchChange,
  onStatusFilterChange,
  resultCount,
  showStatusFilter = true,
  lifecycleFilter = "active",
  onLifecycleFilterChange,
  showLifecycleFilter = false,
  batchSelectAllControl,
  northStar = false,
}: InvoiceSearchFilterBarProps) {
  const searchInputClass = northStar
    ? lt.searchInput
    : "h-11 min-h-11 w-full rounded-lg border border-slate-200/90 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 md:h-10 md:min-h-10";
  const selectClass = northStar ? lt.filterSelect : legacyFilterSelectClass;

  return (
    <div
      className={
        northStar
          ? `invoice-north-star-filter-bar ${lt.filterBar}`
          : "shrink-0 border-b border-slate-100/90 bg-slate-50/40 px-4 py-2.5"
      }
    >
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
              northStar ? lt.filterIcon : "text-slate-400"
            }`}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by invoice #, customer, status, job, or total..."
            className={searchInputClass}
          />
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          {showLifecycleFilter && onLifecycleFilterChange ? (
            <div className="relative min-w-[10rem]">
              <Filter
                className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  northStar ? lt.filterIcon : "text-slate-400"
                }`}
              />
              <select
                value={lifecycleFilter}
                onChange={(e) =>
                  onLifecycleFilterChange(e.target.value as InvoiceLifecycleState)
                }
                aria-label="Filter by lifecycle"
                className={selectClass}
              >
                {INVOICE_LIFECYCLE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {showStatusFilter ? (
            <div className="relative min-w-[10rem]">
              <Filter
                className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
                  northStar ? lt.filterIcon : "text-slate-400"
                }`}
              />
              <select
                value={statusFilter}
                onChange={(e) =>
                  onStatusFilterChange(e.target.value as InvoiceListStatusFilter)
                }
                className={selectClass}
              >
                {INVOICE_LIST_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {batchSelectAllControl ? (
            <InvoiceBatchSelectAllControl
              {...batchSelectAllControl}
              northStar={northStar}
            />
          ) : null}
          <p
            className={
              northStar
                ? `${lt.filterMeta} hidden whitespace-nowrap sm:block`
                : "admin-text-helper hidden whitespace-nowrap sm:block"
            }
          >
            {resultCount} {resultCount === 1 ? "invoice" : "invoices"}
          </p>
        </div>
      </div>
    </div>
  );
}
