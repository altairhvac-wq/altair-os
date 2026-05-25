"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { mockExpenses } from "@/shared/data/mock-expenses";
import { formatCurrency } from "@/shared/types/customer";
import {
  formatExpenseCategory,
  formatExpenseStatus,
  type Expense,
  type ExpenseCategory,
  type ExpenseFormData,
  type ExpenseStatus,
} from "@/shared/types/expense";
import { ExpenseDetailsPanel } from "./ExpenseDetailsPanel";
import { ExpenseSearchFilterBar } from "./ExpenseSearchFilterBar";
import { ExpenseSummaryCards } from "./ExpenseSummaryCards";
import { ExpensesEmptyState } from "./ExpensesEmptyState";
import { ExpensesLoadingState } from "./ExpensesLoadingState";
import { ExpensesTable } from "./ExpensesTable";

type PanelMode = "detail" | "create" | "empty";

function filterExpenses(
  expenses: Expense[],
  search: string,
  statusFilter: ExpenseStatus | "all",
  categoryFilter: ExpenseCategory | "all",
): Expense[] {
  const query = search.trim().toLowerCase();

  return expenses.filter((expense) => {
    const matchesStatus =
      statusFilter === "all" || expense.status === statusFilter;
    const matchesCategory =
      categoryFilter === "all" || expense.category === categoryFilter;

    if (!matchesStatus || !matchesCategory) return false;
    if (!query) return true;

    const haystack = [
      expense.expenseNumber,
      expense.merchant,
      formatExpenseCategory(expense.category),
      expense.category,
      expense.technician,
      expense.jobNumber ?? "",
      formatExpenseStatus(expense.status),
      expense.status,
      formatCurrency(expense.amount),
      String(expense.amount),
      expense.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

function formDataToExpense(data: ExpenseFormData, existingCount: number): Expense {
  const expenseNumber = `EXP-${1013 + existingCount}`;
  const today = new Date().toISOString().split("T")[0];

  return {
    id: `exp-${Date.now()}`,
    expenseNumber,
    amount: data.amount,
    purchaseDate: data.purchaseDate,
    merchant: data.merchant,
    category: data.category,
    technician: data.technician,
    jobNumber: data.jobNumber || undefined,
    receiptStatus: "missing",
    status: data.status,
    notes: data.notes || undefined,
    createdAt: today,
  };
}

export function ExpensesPageView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">(
    "all",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>("empty");

  useEffect(() => {
    const timer = setTimeout(() => {
      setExpenses(mockExpenses);
      setIsLoading(false);
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const filteredExpenses = useMemo(
    () => filterExpenses(expenses, search, statusFilter, categoryFilter),
    [expenses, search, statusFilter, categoryFilter],
  );

  const selectedExpense = expenses.find((exp) => exp.id === selectedId) ?? null;

  function handleSelectExpense(expense: Expense) {
    setSelectedId(expense.id);
    setPanelMode("detail");
  }

  function handleNewExpense() {
    setSelectedId(null);
    setPanelMode("create");
  }

  function handleClosePanel() {
    setSelectedId(null);
    setPanelMode("empty");
  }

  function handleCreateSubmit(data: ExpenseFormData) {
    const newExpense = formDataToExpense(data, expenses.length);
    setExpenses((prev) => [newExpense, ...prev]);
    setSelectedId(newExpense.id);
    setPanelMode("detail");
  }

  if (isLoading) {
    return <ExpensesLoadingState />;
  }

  const hasNoExpenses = expenses.length === 0;
  const hasNoResults = !hasNoExpenses && filteredExpenses.length === 0;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4 overflow-hidden">
      <ExpenseSummaryCards expenses={expenses} />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
        <section className="flex min-h-[16rem] min-w-0 flex-[1_1_55%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:min-h-0 lg:flex-1">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">All expenses</h2>
              <p className="text-xs text-slate-500">
                Track receipts, approvals, and reimbursements
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
                onSearchChange={setSearch}
                onStatusFilterChange={setStatusFilter}
                onCategoryFilterChange={setCategoryFilter}
                resultCount={filteredExpenses.length}
              />
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto">
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
          onClose={handleClosePanel}
          onCreateSubmit={handleCreateSubmit}
          onCreateCancel={handleClosePanel}
        />
      </div>
    </div>
  );
}
