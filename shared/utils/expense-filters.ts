import {
  formatExpenseCategory,
  formatExpenseStatus,
  type Expense,
  type ExpenseCategory,
  type ExpenseDateFilter,
  type ExpensePaymentFilter,
  type ExpenseReceiptFilter,
  type ExpenseStatus,
} from "@/shared/types/expense";

export type ExpenseListFilters = {
  search: string;
  statusFilter: ExpenseStatus | "all";
  categoryFilter: ExpenseCategory | "all";
  technicianFilter: string;
  jobFilter: string;
  paymentFilter: ExpensePaymentFilter;
  dateFilter: ExpenseDateFilter;
  receiptFilter: ExpenseReceiptFilter;
  jobIdFilter?: string;
  customerIdFilter?: string;
};

function parseExpenseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function matchesDateFilter(expense: Expense, dateFilter: ExpenseDateFilter): boolean {
  if (dateFilter === "all") {
    return true;
  }

  const purchaseDate = parseExpenseDate(expense.purchaseDate ?? expense.createdAt);

  if (!purchaseDate) {
    return dateFilter === "older";
  }

  const now = new Date();
  const daysAgo = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);

  if (dateFilter === "last_7") {
    return daysAgo <= 7;
  }

  if (dateFilter === "last_30") {
    return daysAgo <= 30;
  }

  return daysAgo > 30;
}

export function filterExpenses(
  expenses: Expense[],
  filters: ExpenseListFilters,
): Expense[] {
  const query = filters.search.trim().toLowerCase();

  return expenses.filter((expense) => {
    const matchesStatus =
      filters.statusFilter === "all" || expense.status === filters.statusFilter;
    const matchesCategory =
      filters.categoryFilter === "all" || expense.category === filters.categoryFilter;
    const matchesJobContext =
      !filters.jobIdFilter || expense.jobId === filters.jobIdFilter;
    const matchesCustomerContext =
      !filters.customerIdFilter || expense.customerId === filters.customerIdFilter;
    const matchesTechnician =
      filters.technicianFilter === "all" ||
      expense.technicianId === filters.technicianFilter;
    const matchesJob =
      filters.jobFilter === "all" || expense.jobId === filters.jobFilter;
    const matchesPayment =
      filters.paymentFilter === "all" ||
      (filters.paymentFilter === "reimbursable" && expense.isReimbursable) ||
      (filters.paymentFilter === "company_paid" && !expense.isReimbursable);
    const matchesReceipt =
      filters.receiptFilter === "all" ||
      (filters.receiptFilter === "attached" && expense.receiptStatus === "attached") ||
      (filters.receiptFilter === "missing" && expense.receiptStatus !== "attached");
    const matchesDate = matchesDateFilter(expense, filters.dateFilter);

    if (
      !matchesStatus ||
      !matchesCategory ||
      !matchesJobContext ||
      !matchesCustomerContext ||
      !matchesTechnician ||
      !matchesJob ||
      !matchesPayment ||
      !matchesReceipt ||
      !matchesDate
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    const haystack = [
      expense.expenseNumber,
      expense.merchant,
      formatExpenseCategory(expense.category),
      expense.category,
      expense.technician,
      expense.jobNumber ?? "",
      formatExpenseStatus(expense.status),
      expense.status,
      expense.amount != null ? String(expense.amount) : "",
      expense.notes ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function getExpenseTechnicianOptions(expenses: Expense[]) {
  const byId = new Map<string, string>();

  for (const expense of expenses) {
    byId.set(expense.technicianId, expense.technician);
  }

  return Array.from(byId.entries())
    .map(([id, label]) => ({ value: id, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function getExpenseJobOptions(expenses: Expense[]) {
  const byId = new Map<string, string>();

  for (const expense of expenses) {
    if (expense.jobId && expense.jobNumber) {
      byId.set(expense.jobId, expense.jobNumber);
    }
  }

  return Array.from(byId.entries())
    .map(([id, label]) => ({ value: id, label }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function hasActiveExpenseFilters(filters: ExpenseListFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.statusFilter !== "all" ||
    filters.categoryFilter !== "all" ||
    filters.technicianFilter !== "all" ||
    filters.jobFilter !== "all" ||
    filters.paymentFilter !== "all" ||
    filters.dateFilter !== "all" ||
    filters.receiptFilter !== "all"
  );
}
