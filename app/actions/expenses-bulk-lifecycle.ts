"use server";

import { revalidatePath } from "next/cache";
import {
  archiveExpenseAction,
  moveExpenseToTrashAction,
  permanentlyDeleteExpenseAction,
  restoreExpenseAction,
  restoreExpenseFromTrashAction,
} from "@/app/actions/expense-lifecycle";
import { getActiveCompanyContext } from "@/lib/database/company-context";
import { NO_ACTIVE_COMPANY_MESSAGE } from "@/lib/database/errors";
import { getExpenseById } from "@/lib/database/queries/expenses";
import { runBulkLifecycleAction, type BulkLifecycleActionResult } from "@/shared/lib/bulk-lifecycle-runner";
import {
  getArchiveExpenseBlockReason,
  getMoveExpenseToTrashBlockReason,
  getPermanentDeleteExpenseBlockReason,
  getRestoreExpenseBlockReason,
  getRestoreExpenseFromTrashBlockReason,
} from "@/shared/lib/expense-lifecycle";

async function runExpensesBulk(
  expenseIds: string[],
  action: (expenseId: string) => Promise<{ error?: string }>,
  getBlockReason?: (
    expense: NonNullable<Awaited<ReturnType<typeof getExpenseById>>>,
  ) => string | null,
): Promise<BulkLifecycleActionResult> {
  const context = await getActiveCompanyContext();

  return runBulkLifecycleAction({
    ids: expenseIds,
    permissionError: !context
      ? NO_ACTIVE_COMPANY_MESSAGE
      : !context.permissions.manageBilling
        ? "You do not have permission to manage expenses."
        : undefined,
    emptySelectionError: "Select at least one expense.",
    loadEntity: async (id) => getExpenseById(context!.company.id, id),
    getLabel: (expense) => expense.expenseNumber,
    getBlockReason: (expense) => getBlockReason?.(expense) ?? null,
    runAction: action,
  });
}

export async function bulkArchiveExpensesAction(
  expenseIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runExpensesBulk(
    expenseIds,
    archiveExpenseAction,
    (expense) => getArchiveExpenseBlockReason(expense),
  );
  if (result.successCount > 0) revalidatePath("/expenses");
  return result;
}

export async function bulkRestoreExpensesAction(
  expenseIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runExpensesBulk(
    expenseIds,
    restoreExpenseAction,
    (expense) => getRestoreExpenseBlockReason(expense),
  );
  if (result.successCount > 0) revalidatePath("/expenses");
  return result;
}

export async function bulkMoveExpensesToTrashAction(
  expenseIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runExpensesBulk(
    expenseIds,
    moveExpenseToTrashAction,
    (expense) => getMoveExpenseToTrashBlockReason(expense),
  );
  if (result.successCount > 0) revalidatePath("/expenses");
  return result;
}

export async function bulkRestoreExpensesFromTrashAction(
  expenseIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runExpensesBulk(
    expenseIds,
    restoreExpenseFromTrashAction,
    (expense) => getRestoreExpenseFromTrashBlockReason(expense),
  );
  if (result.successCount > 0) revalidatePath("/expenses");
  return result;
}

export async function bulkPermanentlyDeleteExpensesAction(
  expenseIds: string[],
): Promise<BulkLifecycleActionResult> {
  const result = await runExpensesBulk(
    expenseIds,
    permanentlyDeleteExpenseAction,
    (expense) => getPermanentDeleteExpenseBlockReason(expense),
  );
  if (result.successCount > 0) revalidatePath("/expenses");
  return result;
}
