"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  archiveExpenseAction,
  moveExpenseToTrashAction,
  permanentlyDeleteExpenseAction,
  restoreExpenseAction,
  restoreExpenseFromTrashAction,
} from "@/app/actions/expense-lifecycle";
import {
  canArchiveExpense,
  canMoveExpenseToTrash,
  canPermanentlyDeleteExpense,
  canRestoreExpense,
  canRestoreExpenseFromTrash,
  getExpenseLifecycleState,
  getMoveExpenseToTrashBlockReason,
  getPermanentDeleteExpenseBlockReason,
} from "@/shared/lib/expense-lifecycle";
import { formatActionError } from "@/shared/lib/operational-errors";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import { formatDate } from "@/shared/types/customer";
import type { Expense } from "@/shared/types/expense";
import { AltairConfirmDialog } from "@/shared/design-system/dialog";

type ExpenseLifecycleControlProps = {
  expense: Pick<
    Expense,
    | "id"
    | "expenseNumber"
    | "status"
    | "archivedAt"
    | "deletedAt"
    | "deleteAfter"
  >;
  canManage: boolean;
  northStar?: boolean;
};

type PendingConfirmation = {
  title: string;
  description?: string;
  confirmLabel: string;
  destructive: boolean;
  run: () => Promise<{ error?: string }>;
};

export function ExpenseLifecycleControl({
  expense,
  canManage,
  northStar = false,
}: ExpenseLifecycleControlProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(
    null,
  );

  if (!canManage) return null;

  const lifecycleState = getExpenseLifecycleState(expense);
  const trashBlockReason = getMoveExpenseToTrashBlockReason(expense);
  const permanentDeleteBlockReason = getPermanentDeleteExpenseBlockReason(expense);

  function runAction(action: () => Promise<{ error?: string }>) {
    if (isPending) return;
    setError(null);

    startTransition(async () => {
      const result = await action();

      if (result.error) {
        setError(formatActionError(result.error, "This expense could not be updated."));
        return;
      }

      setConfirmation(null);
      router.refresh();
    });
  }

  function requestConfirmation(next: PendingConfirmation) {
    if (isPending) return;
    setError(null);
    setConfirmation(next);
  }

  function handleConfirm() {
    if (!confirmation) return;
    runAction(confirmation.run);
  }

  const shellClass = northStar
    ? dt.compactSectionSurface
    : "rounded-xl border border-slate-200 bg-slate-50/80 p-4";
  const titleClass = northStar
    ? "text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4F4638]"
    : "text-xs font-semibold uppercase tracking-wide text-slate-500";
  const secondaryButtonClass = northStar
    ? `${dt.secondaryAction} !text-xs`
    : "rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800";
  const restoreButtonClass = northStar
    ? dt.primaryAction
    : "rounded-lg border border-cyan-600 bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white";
  const trashButtonClass = northStar
    ? "rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900 transition-colors hover:bg-orange-100"
    : "rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-900";
  const deleteButtonClass = northStar
    ? "rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100"
    : "rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800";

  return (
    <div className={shellClass}>
      <p className={titleClass}>Cleanup</p>
      {lifecycleState === "deleted" && expense.deletedAt ? (
        <p
          className={`mt-2 text-xs ${
            northStar ? "text-[#78350F]" : "text-orange-900"
          }`}
        >
          Deleted {formatDate(expense.deletedAt)}
          {expense.deleteAfter
            ? ` · eligible for permanent deletion after ${formatDate(expense.deleteAfter)}`
            : null}
        </p>
      ) : null}
      {error ? (
        <p className={`mt-2 text-sm ${northStar ? "text-rose-700" : "text-rose-700"}`}>
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {lifecycleState === "active" ? (
          <>
            {canArchiveExpense(expense) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  requestConfirmation({
                    title: `Archive expense ${expense.expenseNumber}?`,
                    confirmLabel: "Archive",
                    destructive: false,
                    run: () => archiveExpenseAction(expense.id),
                  })
                }
                className={secondaryButtonClass}
              >
                Archive
              </button>
            ) : null}
            {canMoveExpenseToTrash(expense) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  requestConfirmation({
                    title: `Move expense ${expense.expenseNumber} to Recently Deleted?`,
                    confirmLabel: "Move to Trash",
                    destructive: true,
                    run: () => moveExpenseToTrashAction(expense.id),
                  })
                }
                className={trashButtonClass}
              >
                Move to Trash
              </button>
            ) : trashBlockReason ? (
              <p className={`text-xs ${northStar ? "text-[#64748B]" : "text-slate-600"}`}>{trashBlockReason}</p>
            ) : null}
          </>
        ) : null}

        {lifecycleState === "archived" ? (
          <>
            {canRestoreExpense(expense) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction(() => restoreExpenseAction(expense.id))}
                className={restoreButtonClass}
              >
                Restore
              </button>
            ) : null}
            {canMoveExpenseToTrash(expense) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  requestConfirmation({
                    title: `Move expense ${expense.expenseNumber} to Recently Deleted?`,
                    confirmLabel: "Move to Trash",
                    destructive: true,
                    run: () => moveExpenseToTrashAction(expense.id),
                  })
                }
                className={trashButtonClass}
              >
                Move to Trash
              </button>
            ) : trashBlockReason ? (
              <p className={`text-xs ${northStar ? "text-[#64748B]" : "text-slate-600"}`}>{trashBlockReason}</p>
            ) : null}
          </>
        ) : null}

        {lifecycleState === "deleted" ? (
          <>
            {canRestoreExpenseFromTrash(expense) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(() => restoreExpenseFromTrashAction(expense.id))
                }
                className={restoreButtonClass}
              >
                Restore
              </button>
            ) : null}
            {canPermanentlyDeleteExpense(expense) ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  requestConfirmation({
                    title: `Permanently delete expense ${expense.expenseNumber}?`,
                    description: "This cannot be undone.",
                    confirmLabel: "Permanently Delete",
                    destructive: true,
                    run: () => permanentlyDeleteExpenseAction(expense.id),
                  })
                }
                className={deleteButtonClass}
              >
                Permanently Delete
              </button>
            ) : permanentDeleteBlockReason ? (
              <p className={`text-xs ${northStar ? "text-[#64748B]" : "text-slate-600"}`}>{permanentDeleteBlockReason}</p>
            ) : null}
          </>
        ) : null}
      </div>

      <AltairConfirmDialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmation(null);
        }}
        title={confirmation?.title ?? ""}
        description={confirmation?.description}
        confirmLabel={confirmation?.confirmLabel ?? "Confirm"}
        destructive={confirmation?.destructive ?? false}
        pending={isPending}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
