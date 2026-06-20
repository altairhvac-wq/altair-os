import { getExpenseLifecycleState } from "@/shared/lib/expense-lifecycle";
import type { Expense } from "@/shared/types/expense";

export type ExpenseWorkQueue =
  | "needs-review"
  | "uncategorized"
  | "approved"
  | "past";

export const EXPENSE_WORK_QUEUE_ORDER: readonly ExpenseWorkQueue[] = [
  "needs-review",
  "uncategorized",
  "approved",
  "past",
];

export const EXPENSE_WORK_QUEUE_LABELS: Record<ExpenseWorkQueue, string> = {
  "needs-review": "Needs review",
  uncategorized: "Uncategorized",
  approved: "Approved",
  past: "Past",
};

/** Archived, deleted, rejected, reimbursed, and other closed spending records. */
export function isExpensePastQueue(expense: Expense): boolean {
  const lifecycle = getExpenseLifecycleState(expense);

  if (lifecycle !== "active") {
    return true;
  }

  return expense.status === "rejected" || expense.status === "reimbursed";
}

/** Active submitted expenses and receipts pending review. */
export function isExpenseNeedsReviewQueue(expense: Expense): boolean {
  if (isExpensePastQueue(expense)) {
    return false;
  }

  return (
    expense.status === "submitted" || expense.receiptStatus === "pending"
  );
}

/** Active expenses missing details or still using a catch-all category. */
export function isExpenseUncategorizedQueue(expense: Expense): boolean {
  if (isExpensePastQueue(expense) || isExpenseNeedsReviewQueue(expense)) {
    return false;
  }

  return (
    expense.status === "draft" ||
    expense.category === "other" ||
    !expense.merchant.trim() ||
    expense.amount == null
  );
}

/** Active approved expenses ready for bookkeeping. */
export function isExpenseApprovedQueue(expense: Expense): boolean {
  if (isExpensePastQueue(expense)) {
    return false;
  }

  return expense.status === "approved";
}

export function filterExpensesForWorkQueue(
  expenses: Expense[],
  queue: ExpenseWorkQueue,
): Expense[] {
  const predicate = {
    "needs-review": isExpenseNeedsReviewQueue,
    uncategorized: isExpenseUncategorizedQueue,
    approved: isExpenseApprovedQueue,
    past: isExpensePastQueue,
  }[queue];

  return expenses.filter(predicate);
}

export function countExpensesForWorkQueue(
  expenses: Expense[],
  queue: ExpenseWorkQueue,
): number {
  return filterExpensesForWorkQueue(expenses, queue).length;
}

export function resolveDefaultExpenseWorkQueue(
  expenses: Expense[],
): ExpenseWorkQueue {
  if (countExpensesForWorkQueue(expenses, "needs-review") > 0) {
    return "needs-review";
  }

  if (countExpensesForWorkQueue(expenses, "uncategorized") > 0) {
    return "uncategorized";
  }

  if (countExpensesForWorkQueue(expenses, "approved") > 0) {
    return "approved";
  }

  return "past";
}

function compareExpenseRecency(left: Expense, right: Expense): number {
  const leftTime = Date.parse(left.purchaseDate ?? left.createdAt);
  const rightTime = Date.parse(right.purchaseDate ?? right.createdAt);

  if (
    Number.isFinite(leftTime) &&
    Number.isFinite(rightTime) &&
    leftTime !== rightTime
  ) {
    return rightTime - leftTime;
  }

  return right.createdAt.localeCompare(left.createdAt);
}

export function sortExpensesForWorkQueue(
  expenses: Expense[],
  queue: ExpenseWorkQueue,
): Expense[] {
  const sorted = [...expenses];

  if (queue === "uncategorized" || queue === "past") {
    return sorted.sort(compareExpenseRecency);
  }

  return sorted;
}
