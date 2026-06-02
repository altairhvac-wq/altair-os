import { Filter, Search, X } from "lucide-react";
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
  onNeedsReview: () => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  resultCount: number;
  lifecycleFilter?: ExpenseLifecycleState;
  onLifecycleFilterChange?: (value: ExpenseLifecycleState) => void;
  showLifecycleFilter?: boolean;
  bulkSelectAllControl?: {
    selectableCount: number;
    allSelected: boolean;
    onSelectAll: () => void;
    onClearSelection: () => void;
  };
};

const selectClass =
  "w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm font-medium text-slate-700 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 sm:w-auto sm:min-w-[10rem]";

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
  onNeedsReview,
  onClearFilters,
  hasActiveFilters,
  resultCount,
  lifecycleFilter = "active",
  onLifecycleFilterChange,
  showLifecycleFilter = false,
  bulkSelectAllControl,
}: ExpenseSearchFilterBarProps) {
  const needsReviewActive = statusFilter === "submitted";

  return (
    <div className="shrink-0 border-b border-slate-100/90 bg-white px-4 py-3">
      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search vendor, notes, category, technician, job..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onNeedsReview}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              needsReviewActive
                ? "bg-blue-600 text-white"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            Needs review
          </button>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {showLifecycleFilter && onLifecycleFilterChange ? (
            <FilterSelect
              value={lifecycleFilter}
              options={EXPENSE_LIFECYCLE_FILTER_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onChange={(value) =>
                onLifecycleFilterChange(value as ExpenseLifecycleState)
              }
            />
          ) : null}
          <FilterSelect
            value={statusFilter}
            options={EXPENSE_STATUS_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(value) =>
              onStatusFilterChange(value as ExpenseStatus | "all")
            }
          />
          <FilterSelect
            value={categoryFilter}
            options={EXPENSE_CATEGORY_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(value) =>
              onCategoryFilterChange(value as ExpenseCategory | "all")
            }
          />
          {showTechnicianFilter ? (
            <FilterSelect
              value={technicianFilter}
              options={[
                { value: "all", label: "All technicians" },
                ...technicianOptions,
              ]}
              onChange={onTechnicianFilterChange}
            />
          ) : null}
          {showJobFilter ? (
            <FilterSelect
              value={jobFilter}
              options={[{ value: "all", label: "All jobs" }, ...jobOptions]}
              onChange={onJobFilterChange}
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
          />
          <FilterSelect
            value={dateFilter}
            options={EXPENSE_DATE_FILTER_OPTIONS.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            onChange={(value) => onDateFilterChange(value as ExpenseDateFilter)}
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
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {bulkSelectAllControl ? (
          <BulkSelectAllControl {...bulkSelectAllControl} />
        ) : null}
        <p className="admin-text-helper">
          {resultCount} {resultCount === 1 ? "expense" : "expenses"}
          {needsReviewActive ? " · showing submitted for review" : ""}
        </p>
      </div>
    </div>
  );
}

type FilterSelectProps = {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
};

function FilterSelect({ value, options, onChange }: FilterSelectProps) {
  return (
    <div className="relative shrink-0">
      <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
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
