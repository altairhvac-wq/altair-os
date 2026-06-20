import { useMemo, useState } from "react";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import {
  EXPENSE_CATEGORY_OPTIONS,
  EXPENSE_DATE_FILTER_OPTIONS,
  EXPENSE_LIFECYCLE_FILTER_OPTIONS,
  EXPENSE_PAYMENT_FILTER_OPTIONS,
  EXPENSE_RECEIPT_FILTER_OPTIONS,
  EXPENSE_STATUS_OPTIONS,
  type ExpenseCategory,
  type ExpenseDateFilter,
  type ExpenseLifecycleState,
  type ExpensePaymentFilter,
  type ExpenseReceiptFilter,
  type ExpenseStatus,
} from "@/shared/types/expense";
import { BulkSelectAllControl } from "@/shared/components/bulk/BulkSelectAllControl";

type SelectOption = {
  value: string;
  label: string;
};

type ExpenseSearchFilterBarProps = {
  search: string;
  statusFilter: ExpenseStatus | "all";
  categoryFilter: ExpenseCategory | "all";
  technicianFilter: string;
  jobFilter: string;
  paymentFilter: ExpensePaymentFilter;
  dateFilter: ExpenseDateFilter;
  receiptFilter: ExpenseReceiptFilter;
  technicianOptions: SelectOption[];
  jobOptions: SelectOption[];
  showJobFilter: boolean;
  showTechnicianFilter: boolean;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: ExpenseStatus | "all") => void;
  onCategoryFilterChange: (value: ExpenseCategory | "all") => void;
  onTechnicianFilterChange: (value: string) => void;
  onJobFilterChange: (value: string) => void;
  onPaymentFilterChange: (value: ExpensePaymentFilter) => void;
  onDateFilterChange: (value: ExpenseDateFilter) => void;
  onReceiptFilterChange: (value: ExpenseReceiptFilter) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount: number;
  showStatusFilter?: boolean;
  lifecycleFilter?: ExpenseLifecycleState;
  onLifecycleFilterChange?: (value: ExpenseLifecycleState) => void;
  showLifecycleFilter?: boolean;
  bulkSelectAllControl?: {
    selectableCount: number;
    allSelected: boolean;
    onSelectAll: () => void;
    onClearSelection: () => void;
  };
  northStar?: boolean;
};

const legacyFilterSelectClass =
  "w-full appearance-none rounded-lg border border-slate-200/90 bg-white py-2 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:w-auto sm:min-w-[10rem]";

const legacySearchClass =
  "w-full rounded-lg border border-slate-200/90 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

export function ExpenseSearchFilterBar({
  search,
  statusFilter,
  categoryFilter,
  technicianFilter,
  jobFilter,
  paymentFilter,
  dateFilter,
  receiptFilter,
  technicianOptions,
  jobOptions,
  showJobFilter,
  showTechnicianFilter,
  onSearchChange,
  onStatusFilterChange,
  onCategoryFilterChange,
  onTechnicianFilterChange,
  onJobFilterChange,
  onPaymentFilterChange,
  onDateFilterChange,
  onReceiptFilterChange,
  onClearFilters,
  hasActiveFilters,
  resultCount,
  showStatusFilter = true,
  lifecycleFilter = "active",
  onLifecycleFilterChange,
  showLifecycleFilter = false,
  bulkSelectAllControl,
  northStar = false,
}: ExpenseSearchFilterBarProps) {
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const searchInputClass = northStar ? lt.searchInput : legacySearchClass;
  const selectClass = northStar ? lt.filterSelect : legacyFilterSelectClass;

  const hasActivePanelFilters = useMemo(
    () =>
      categoryFilter !== "all" ||
      technicianFilter !== "all" ||
      jobFilter !== "all" ||
      paymentFilter !== "all" ||
      dateFilter !== "all" ||
      receiptFilter !== "all",
    [
      categoryFilter,
      technicianFilter,
      jobFilter,
      paymentFilter,
      dateFilter,
      receiptFilter,
    ],
  );

  const hasActivePrimaryFilters =
    (showLifecycleFilter && lifecycleFilter !== "active") ||
    (showStatusFilter && statusFilter !== "all");

  const hasActiveSecondaryFilters =
    hasActivePrimaryFilters || hasActivePanelFilters;

  const clearFiltersClass = northStar
    ? "inline-flex items-center gap-1 rounded-full border border-[rgba(138,99,36,0.22)] bg-[#FFF9EA] px-3 py-1.5 text-xs font-semibold text-[#4F4638] transition-colors hover:border-[#C9A44D] hover:bg-[#F3EBDD]"
    : "inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50";

  const filtersToggleClass = northStar
    ? `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        filtersExpanded || hasActiveSecondaryFilters
          ? "border-[#C9A44D] bg-[#FFF9EA] text-[#4F4638]"
          : "border-[rgba(138,99,36,0.22)] bg-white text-[#4F4638] hover:border-[#C9A44D] hover:bg-[#FFF9EA]"
      }`
    : `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        filtersExpanded || hasActiveSecondaryFilters
          ? "border-cyan-300 bg-cyan-50 text-cyan-800"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`;

  const resultMetaClass = northStar
    ? `${lt.filterMeta} hidden whitespace-nowrap sm:block`
    : "admin-text-helper hidden whitespace-nowrap sm:block";

  return (
    <div
      className={
        northStar
          ? `expense-north-star-filter-bar ${lt.filterBar}`
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
            placeholder="Search vendor, notes, category, technician, job..."
            className={searchInputClass}
          />
        </div>

        <div className="flex min-w-0 max-w-full shrink-0 flex-wrap items-center gap-2">
          {showLifecycleFilter && onLifecycleFilterChange ? (
            <div className="hidden lg:contents">
              <FilterSelect
                value={lifecycleFilter}
                options={EXPENSE_LIFECYCLE_FILTER_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(value) =>
                  onLifecycleFilterChange(value as ExpenseLifecycleState)
                }
                selectClass={selectClass}
                northStar={northStar}
                ariaLabel="Filter by lifecycle"
              />
            </div>
          ) : null}
          {showStatusFilter ? (
            <div className="hidden lg:contents">
              <FilterSelect
                value={statusFilter}
                options={EXPENSE_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(value) =>
                  onStatusFilterChange(value as ExpenseStatus | "all")
                }
                selectClass={selectClass}
                northStar={northStar}
                ariaLabel="Filter by status"
              />
            </div>
          ) : null}
          <button
            type="button"
            aria-expanded={filtersExpanded}
            onClick={() => setFiltersExpanded((current) => !current)}
            className={filtersToggleClass}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                filtersExpanded ? "rotate-180" : ""
              }`}
            />
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className={`${clearFiltersClass} hidden lg:inline-flex`}
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          ) : null}
          {bulkSelectAllControl ? (
            <BulkSelectAllControl {...bulkSelectAllControl} northStar={northStar} />
          ) : null}
          <p className={resultMetaClass}>
            {resultCount} {resultCount === 1 ? "expense" : "expenses"}
          </p>
        </div>
      </div>

      {filtersExpanded ? (
        <div className="mt-2.5 flex flex-wrap gap-2 border-t border-slate-100/90 pt-2.5">
          {showLifecycleFilter && onLifecycleFilterChange ? (
            <div className="w-full min-w-0 lg:hidden">
              <FilterSelect
                value={lifecycleFilter}
                options={EXPENSE_LIFECYCLE_FILTER_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(value) =>
                  onLifecycleFilterChange(value as ExpenseLifecycleState)
                }
                selectClass={selectClass}
                northStar={northStar}
                ariaLabel="Filter by lifecycle"
              />
            </div>
          ) : null}
          {showStatusFilter ? (
            <div className="w-full min-w-0 lg:hidden">
              <FilterSelect
                value={statusFilter}
                options={EXPENSE_STATUS_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(value) =>
                  onStatusFilterChange(value as ExpenseStatus | "all")
                }
                selectClass={selectClass}
                northStar={northStar}
                ariaLabel="Filter by status"
              />
            </div>
          ) : null}
          <FilterSelect
            value={categoryFilter}
            options={EXPENSE_CATEGORY_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(value) =>
              onCategoryFilterChange(value as ExpenseCategory | "all")
            }
            selectClass={selectClass}
            northStar={northStar}
            ariaLabel="Filter by category"
          />
          {showTechnicianFilter ? (
            <FilterSelect
              value={technicianFilter}
              options={[
                { value: "all", label: "All technicians" },
                ...technicianOptions,
              ]}
              onChange={onTechnicianFilterChange}
              selectClass={selectClass}
              northStar={northStar}
              ariaLabel="Filter by technician"
            />
          ) : null}
          {showJobFilter ? (
            <FilterSelect
              value={jobFilter}
              options={[{ value: "all", label: "All jobs" }, ...jobOptions]}
              onChange={onJobFilterChange}
              selectClass={selectClass}
              northStar={northStar}
              ariaLabel="Filter by job"
            />
          ) : null}
          <FilterSelect
            value={paymentFilter}
            options={EXPENSE_PAYMENT_FILTER_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(value) =>
              onPaymentFilterChange(value as ExpensePaymentFilter)
            }
            selectClass={selectClass}
            northStar={northStar}
            ariaLabel="Filter by payment method"
          />
          <FilterSelect
            value={dateFilter}
            options={EXPENSE_DATE_FILTER_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(value) => onDateFilterChange(value as ExpenseDateFilter)}
            selectClass={selectClass}
            northStar={northStar}
            ariaLabel="Filter by date"
          />
          <FilterSelect
            value={receiptFilter}
            options={EXPENSE_RECEIPT_FILTER_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(value) =>
              onReceiptFilterChange(value as ExpenseReceiptFilter)
            }
            selectClass={selectClass}
            northStar={northStar}
            ariaLabel="Filter by receipt"
          />
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className={`${clearFiltersClass} lg:hidden`}
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type FilterSelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  selectClass: string;
  northStar: boolean;
  ariaLabel?: string;
};

function FilterSelect({
  value,
  options,
  onChange,
  selectClass,
  northStar,
  ariaLabel,
}: FilterSelectProps) {
  return (
    <div className="relative min-w-0 max-w-full shrink sm:min-w-[10rem] sm:shrink-0">
      <Filter
        className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
          northStar ? lt.filterIcon : "text-slate-400"
        }`}
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        aria-label={ariaLabel}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
