import type { Expense, ExpenseStatus } from "@/shared/types/expense";

export type ExpenseLifecycleActionId =
  | "archive"
  | "restore"
  | "moveToTrash"
  | "restoreFromTrash"
  | "permanentDelete";

export type ExpenseLifecycleState = "active" | "archived" | "deleted";

const TRASHABLE_STATUSES = new Set<ExpenseStatus>([
  "draft",
  "submitted",
  "rejected",
]);
const LOCKED_STATUSES = new Set<ExpenseStatus>(["approved", "reimbursed"]);

export const EXPENSE_TRASH_BLOCKED_MESSAGE =
  "Only draft, submitted, or rejected expenses can move to Recently Deleted.";

export const EXPENSE_PERMANENT_DELETE_BLOCKED_MESSAGE =
  "Approved or reimbursed expenses cannot be permanently deleted. Archive them to preserve history.";

export function isExpenseDeleted(expense: Pick<Expense, "deletedAt">): boolean {
  return Boolean(expense.deletedAt);
}

export function isExpenseArchived(
  expense: Pick<Expense, "archivedAt">,
): boolean {
  return Boolean(expense.archivedAt);
}

export function getExpenseLifecycleState(
  expense: Pick<Expense, "archivedAt" | "deletedAt">,
): ExpenseLifecycleState {
  if (isExpenseDeleted(expense)) return "deleted";
  if (isExpenseArchived(expense)) return "archived";
  return "active";
}

export function getArchiveExpenseBlockReason(
  expense: Pick<Expense, "archivedAt" | "deletedAt">,
): string | null {
  if (isExpenseDeleted(expense)) {
    return "This expense is in Recently Deleted. Restore it first.";
  }
  if (isExpenseArchived(expense)) {
    return "This expense is already archived.";
  }
  return null;
}

export function canArchiveExpense(
  expense: Pick<Expense, "archivedAt" | "deletedAt">,
): boolean {
  return getArchiveExpenseBlockReason(expense) === null;
}

export function getRestoreExpenseBlockReason(
  expense: Pick<Expense, "archivedAt" | "deletedAt">,
): string | null {
  if (isExpenseDeleted(expense)) {
    return "This expense is in Recently Deleted. Use restore from Recently Deleted.";
  }
  if (!isExpenseArchived(expense)) {
    return "This expense is not archived.";
  }
  return null;
}

export function canRestoreExpense(
  expense: Pick<Expense, "archivedAt" | "deletedAt">,
): boolean {
  return getRestoreExpenseBlockReason(expense) === null;
}

export function getMoveExpenseToTrashBlockReason(
  expense: Pick<Expense, "status" | "deletedAt">,
): string | null {
  if (isExpenseDeleted(expense)) {
    return "This expense is already in Recently Deleted.";
  }
  if (!TRASHABLE_STATUSES.has(expense.status)) {
    return EXPENSE_TRASH_BLOCKED_MESSAGE;
  }
  return null;
}

export function canMoveExpenseToTrash(
  expense: Pick<Expense, "status" | "deletedAt">,
): boolean {
  return getMoveExpenseToTrashBlockReason(expense) === null;
}

export function getRestoreExpenseFromTrashBlockReason(
  expense: Pick<Expense, "deletedAt">,
): string | null {
  if (!isExpenseDeleted(expense)) {
    return "This expense is not in Recently Deleted.";
  }
  return null;
}

export function canRestoreExpenseFromTrash(
  expense: Pick<Expense, "deletedAt">,
): boolean {
  return getRestoreExpenseFromTrashBlockReason(expense) === null;
}

export function getPermanentDeleteExpenseBlockReason(
  expense: Pick<Expense, "deletedAt" | "status">,
): string | null {
  if (!isExpenseDeleted(expense)) {
    return "Move this expense to Recently Deleted before permanently deleting.";
  }
  if (LOCKED_STATUSES.has(expense.status)) {
    return EXPENSE_PERMANENT_DELETE_BLOCKED_MESSAGE;
  }
  return null;
}

export function canPermanentlyDeleteExpense(
  expense: Pick<Expense, "deletedAt" | "status">,
): boolean {
  return getPermanentDeleteExpenseBlockReason(expense) === null;
}

export function formatBulkExpensesResultMessage(input: {
  successCount: number;
  failureCount: number;
  actionLabel: string;
}): string {
  const { successCount, failureCount, actionLabel } = input;

  if (successCount === 0 && failureCount === 0) {
    return "No expenses were updated.";
  }

  if (failureCount === 0) {
    return `${actionLabel} applied to ${successCount} expense${
      successCount === 1 ? "" : "s"
    }.`;
  }

  if (successCount === 0) {
    return `${failureCount} expense${failureCount === 1 ? "" : "s"} could not be updated.`;
  }

  return `${actionLabel} applied to ${successCount} expense${
    successCount === 1 ? "" : "s"
  }. ${failureCount} could not be updated.`;
}

export function isBulkExpenseActionDestructive(
  actionId: ExpenseLifecycleActionId,
): boolean {
  return actionId === "permanentDelete";
}

export function resolveBulkExpenseLifecycleActions(
  lifecycleFilter: ExpenseLifecycleState,
): ExpenseLifecycleActionId[] {
  if (lifecycleFilter === "archived") {
    return ["restore", "moveToTrash"];
  }
  if (lifecycleFilter === "deleted") {
    return ["restoreFromTrash", "permanentDelete"];
  }
  return ["archive", "moveToTrash"];
}
