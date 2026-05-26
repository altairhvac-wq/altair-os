"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type {
  Expense,
  ExpenseCategory,
  ExpenseDateFilter,
  ExpensePaymentFilter,
  ExpenseReceiptFilter,
  ExpenseStatus,
} from "@/shared/types/expense";
import { listDetailListSectionClassName } from "@/shared/components/layout/list-detail-layout";
import { JobContextFilterBanner } from "@/shared/components/layout/JobContextFilterBanner";
import {
  filterExpenses,
  getExpenseJobOptions,
  getExpenseTechnicianOptions,
  hasActiveExpenseFilters,
} from "@/shared/utils/expense-filters";
import { ExpenseDetailsPanel } from "./ExpenseDetailsPanel";
import { ExpenseSearchFilterBar } from "./ExpenseSearchFilterBar";
import { ExpenseSummaryCards } from "./ExpenseSummaryCards";
import { ExpensesEmptyState } from "./ExpensesEmptyState";
import { ExpensesTable } from "./ExpensesTable";

type PanelMode = "detail" | "create" | "empty";

type ExpensesPageViewProps = {
  expenses: Expense[];
  currentUserId: string;
  canManageBilling: boolean;
  canDispatchJobs: boolean;
  initialJobId?: string;
  initialJobLabel?: string;
  initialCustomerId?: string;
  initialSelectedId?: string;
  initialCreate?: boolean;
};

const DEFAULT_FILTERS = {
  search: "",
  statusFilter: "all" as ExpenseStatus | "all",
  categoryFilter: "all" as ExpenseCategory | "all",
  technicianFilter: "all",
  jobFilter: "all",
  paymentFilter: "all" as ExpensePaymentFilter,
  dateFilter: "all" as ExpenseDateFilter,
  receiptFilter: "all" as ExpenseReceiptFilter,
};

export function ExpensesPageView({
  expenses,
  currentUserId,
  canManageBilling,
  canDispatchJobs,
  initialJobId,
  initialJobLabel,
  initialCustomerId,
  initialSelectedId,
  initialCreate = false,
}: ExpensesPageViewProps) {
  const [search, setSearch] = useState(DEFAULT_FILTERS.search);
  const [statusFilter, setStatusFilter] = useState(DEFAULT_FILTERS.statusFilter);
  const [categoryFilter, setCategoryFilter] = useState(DEFAULT_FILTERS.categoryFilter);
  const [technicianFilter, setTechnicianFilter] = useState(
    DEFAULT_FILTERS.technicianFilter,
  );
  const [jobFilter, setJobFilter] = useState(DEFAULT_FILTERS.jobFilter);
  const [paymentFilter, setPaymentFilter] = useState(DEFAULT_FILTERS.paymentFilter);
  const [dateFilter, setDateFilter] = useState(DEFAULT_FILTERS.dateFilter);
  const [receiptFilter, setReceiptFilter] = useState(DEFAULT_FILTERS.receiptFilter);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? null,
  );
  const [panelMode, setPanelMode] = useState<PanelMode>(() => {
    if (initialCreate) return "create";
    if (initialSelectedId) return "detail";
    return "empty";
  });
  const [createJobId] = useState(initialJobId);
  const [localExpenses, setLocalExpenses] = useState(expenses);

  useEffect(() => {
    setLocalExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    if (initialSelectedId && expenses.some((expense) => expense.id === initialSelectedId)) {
      setSelectedId(initialSelectedId);
      setPanelMode("detail");
    }
  }, [expenses, initialSelectedId]);

  const technicianOptions = useMemo(
    () => getExpenseTechnicianOptions(localExpenses),
    [localExpenses],
  );
  const jobOptions = useMemo(
    () => getExpenseJobOptions(localExpenses),
    [localExpenses],
  );

  const listFilters = useMemo(
    () => ({
      search,
      statusFilter,
      categoryFilter,
      technicianFilter,
      jobFilter,
      paymentFilter,
      dateFilter,
      receiptFilter,
      jobIdFilter: initialJobId,
      customerIdFilter: initialCustomerId,
    }),
    [
      search,
      statusFilter,
      categoryFilter,
      technicianFilter,
      jobFilter,
      paymentFilter,
      dateFilter,
      receiptFilter,
      initialJobId,
      initialCustomerId,
    ],
  );

  const filteredExpenses = useMemo(
    () => filterExpenses(localExpenses, listFilters),
    [localExpenses, listFilters],
  );

  const activeFilters = hasActiveExpenseFilters(listFilters);

  const selectedExpense = localExpenses.find((exp) => exp.id === selectedId) ?? null;

  function handleExpenseUpdated(updated: Expense) {
    setLocalExpenses((current) =>
      current.map((expense) =>
        expense.id === updated.id ? updated : expense,
      ),
    );
  }

  function handleSelectExpense(expense: Expense) {
    setSelectedId(expense.id);
    setPanelMode("detail");
  }

  function handleNewExpense() {
    setSelectedId(null);
    setPanelMode("create");
  }

  function handleClearFilters() {
    setSearch(DEFAULT_FILTERS.search);
    setStatusFilter(DEFAULT_FILTERS.statusFilter);
    setCategoryFilter(DEFAULT_FILTERS.categoryFilter);
    setTechnicianFilter(DEFAULT_FILTERS.technicianFilter);
    setJobFilter(DEFAULT_FILTERS.jobFilter);
    setPaymentFilter(DEFAULT_FILTERS.paymentFilter);
    setDateFilter(DEFAULT_FILTERS.dateFilter);
    setReceiptFilter(DEFAULT_FILTERS.receiptFilter);
  }

  function handleNeedsReview() {
    setStatusFilter((current) => (current === "submitted" ? "all" : "submitted"));
  }

  const contextLabel =
    initialJobId && initialJobLabel
      ? `${filteredExpenses.length} expense${filteredExpenses.length === 1 ? "" : "s"} for Job ${initialJobLabel}`
      : initialCustomerId && !initialJobId
        ? filteredExpenses.length === localExpenses.length
          ? null
          : `${filteredExpenses.length} linked expense${filteredExpenses.length === 1 ? "" : "s"}`
        : null;

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode("empty");
  }

  function handleCreateSuccess() {
    setPanelMode("empty");
    setSelectedId(null);
  }

  const hasNoExpenses = localExpenses.length === 0;
  const hasNoResults = !hasNoExpenses && filteredExpenses.length === 0;

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-7rem)] lg:overflow-hidden">
      {initialJobId && initialJobLabel ? (
        <JobContextFilterBanner
          jobLabel={initialJobLabel}
          clearHref="/expenses"
        />
      ) : null}

      <ExpenseSummaryCards expenses={localExpenses} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:overflow-hidden">
        <section className={`${listDetailListSectionClassName} flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col lg:overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:flex-1`}>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">All expenses</h2>
              <p className="text-xs text-slate-500">
                {contextLabel ??
                  "Capture receipts and draft expenses for later review"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleNewExpense}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cyan-700"
            >
              <Plus className="h-4 w-4" />
              New Expense
            </button>
          </div>

          {!hasNoExpenses ? (
            <div className="shrink-0">
              <ExpenseSearchFilterBar
                search={search}
                statusFilter={statusFilter}
                categoryFilter={categoryFilter}
                technicianFilter={technicianFilter}
                jobFilter={jobFilter}
                paymentFilter={paymentFilter}
                dateFilter={dateFilter}
                receiptFilter={receiptFilter}
                technicianOptions={technicianOptions}
                jobOptions={jobOptions}
                showTechnicianFilter={technicianOptions.length > 1}
                showJobFilter={!initialJobId && jobOptions.length > 0}
                onSearchChange={setSearch}
                onStatusFilterChange={setStatusFilter}
                onCategoryFilterChange={setCategoryFilter}
                onTechnicianFilterChange={setTechnicianFilter}
                onJobFilterChange={setJobFilter}
                onPaymentFilterChange={setPaymentFilter}
                onDateFilterChange={setDateFilter}
                onReceiptFilterChange={setReceiptFilter}
                onNeedsReview={handleNeedsReview}
                onClearFilters={handleClearFilters}
                hasActiveFilters={activeFilters}
                resultCount={filteredExpenses.length}
              />
            </div>
          ) : null}

          <div className="min-h-0 flex-1 lg:overflow-y-auto">
            {hasNoExpenses ? (
              <ExpensesEmptyState
                variant="no-expenses"
                onCreateExpense={handleNewExpense}
              />
            ) : hasNoResults ? (
              <ExpensesEmptyState variant="no-results" />
            ) : (
              <ExpensesTable
                expenses={filteredExpenses}
                selectedId={selectedId}
                onSelect={handleSelectExpense}
              />
            )}
          </div>
        </section>

        <ExpenseDetailsPanel
          mode={panelMode}
          expense={selectedExpense}
          createJobId={createJobId}
          currentUserId={currentUserId}
          canManageBilling={canManageBilling}
          canDispatchJobs={canDispatchJobs}
          onClose={handleClosePanel}
          onCreateSuccess={handleCreateSuccess}
          onCreateCancel={handleClosePanel}
          onExpenseUpdated={handleExpenseUpdated}
        />
      </div>
    </div>
  );
}
