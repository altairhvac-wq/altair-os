"use server";

import { getActiveCompanyContext } from "@/lib/database/company-context";
import { revalidateExpenseOperationalPages } from "@/lib/database/revalidation/operational-pages";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import {
  archiveExpense,
  getExpenseById,
  moveExpenseToTrash,
  permanentlyDeleteExpense,
  restoreExpense,
  restoreExpenseFromTrash,
} from "@/lib/database/queries/expenses";
import {
  canArchiveExpense,
  canMoveExpenseToTrash,
  canPermanentlyDeleteExpense,
  canRestoreExpense,
  canRestoreExpenseFromTrash,
  getArchiveExpenseBlockReason,
  getMoveExpenseToTrashBlockReason,
  getPermanentDeleteExpenseBlockReason,
  getRestoreExpenseBlockReason,
  getRestoreExpenseFromTrashBlockReason,
} from "@/shared/lib/expense-lifecycle";
import type { Expense } from "@/shared/types/expense";

export type ExpenseLifecycleActionResult = {
  error?: string;
  expense?: Expense;
  deleted?: boolean;
};

function revalidateExpensePaths() {
  revalidateExpenseOperationalPages();
}

export async function archiveExpenseAction(
  expenseId: string,
): Promise<ExpenseLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage expenses." };
  }

  const existing = await getExpenseById(context.company.id, expenseId);
  if (!existing) return { error: "Expense not found." };

  const blockReason = getArchiveExpenseBlockReason(existing);
  if (blockReason || !canArchiveExpense(existing)) {
    return { error: blockReason ?? "This expense cannot be archived." };
  }

  const { expense, error } = await archiveExpense(context.company.id, expenseId);
  if (error || !expense) {
    return { error: error ?? "We couldn't archive this expense." };
  }

  revalidateExpensePaths();
  return { expense };
}

export async function restoreExpenseAction(
  expenseId: string,
): Promise<ExpenseLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage expenses." };
  }

  const existing = await getExpenseById(context.company.id, expenseId);
  if (!existing) return { error: "Expense not found." };

  const blockReason = getRestoreExpenseBlockReason(existing);
  if (blockReason || !canRestoreExpense(existing)) {
    return { error: blockReason ?? "This expense cannot be restored." };
  }

  const { expense, error } = await restoreExpense(context.company.id, expenseId);
  if (error || !expense) {
    return { error: error ?? "We couldn't restore this expense." };
  }

  revalidateExpensePaths();
  return { expense };
}

export async function moveExpenseToTrashAction(
  expenseId: string,
): Promise<ExpenseLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage expenses." };
  }

  const existing = await getExpenseById(context.company.id, expenseId);
  if (!existing) return { error: "Expense not found." };

  const blockReason = getMoveExpenseToTrashBlockReason(existing);
  if (blockReason || !canMoveExpenseToTrash(existing)) {
    return { error: blockReason ?? "This expense cannot be moved to Recently Deleted." };
  }

  const { expense, error } = await moveExpenseToTrash(context.company.id, expenseId);
  if (error || !expense) {
    return { error: error ?? "We couldn't move this expense to Recently Deleted." };
  }

  revalidateExpensePaths();
  return { expense };
}

export async function restoreExpenseFromTrashAction(
  expenseId: string,
): Promise<ExpenseLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage expenses." };
  }

  const existing = await getExpenseById(context.company.id, expenseId);
  if (!existing) return { error: "Expense not found." };

  const blockReason = getRestoreExpenseFromTrashBlockReason(existing);
  if (blockReason || !canRestoreExpenseFromTrash(existing)) {
    return { error: blockReason ?? "This expense cannot be restored." };
  }

  const { expense, error } = await restoreExpenseFromTrash(
    context.company.id,
    expenseId,
  );
  if (error || !expense) {
    return { error: error ?? "We couldn't restore this expense." };
  }

  revalidateExpensePaths();
  return { expense };
}

export async function permanentlyDeleteExpenseAction(
  expenseId: string,
): Promise<ExpenseLifecycleActionResult> {
  const context = await getActiveCompanyContext();
  if (!context) return { error: NO_ACTIVE_COMPANY_MESSAGE };
  if (!context.permissions.manageBilling) {
    return { error: "You do not have permission to manage expenses." };
  }

  const existing = await getExpenseById(context.company.id, expenseId);
  if (!existing) return { error: "Expense not found." };

  const blockReason = getPermanentDeleteExpenseBlockReason(existing);
  if (blockReason || !canPermanentlyDeleteExpense(existing)) {
    return { error: blockReason ?? "This expense cannot be permanently deleted." };
  }

  const { success, error } = await permanentlyDeleteExpense(
    context.company.id,
    expenseId,
  );
  if (!success || error) {
    return { error: error ?? "We couldn't permanently delete this expense." };
  }

  revalidateExpensePaths();
  return { deleted: true };
}
