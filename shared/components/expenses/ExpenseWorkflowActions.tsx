"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExpenseStatusAction } from "@/app/actions/expenses";
import type { Expense } from "@/shared/types/expense";
import {
  EXPENSE_WORKFLOW_ACTION_LABELS,
  getExpenseWorkflowActions,
  type ExpenseWorkflowAction,
} from "@/shared/types/expense-workflow";

type ExpenseWorkflowActionsProps = {
  expense: Expense;
  currentUserId: string;
  canManageBilling: boolean;
  canDispatchJobs: boolean;
  compact?: boolean;
  onExpenseUpdated?: (expense: Expense) => void;
};

const ACTION_STYLES: Record<
  ExpenseWorkflowAction,
  { primary?: boolean; className: string }
> = {
  submit: {
    primary: true,
    className:
      "border-cyan-200 bg-cyan-600 text-white hover:bg-cyan-700",
  },
  approve: {
    primary: true,
    className:
      "border-emerald-200 bg-emerald-600 text-white hover:bg-emerald-700",
  },
  reject: {
    className:
      "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
  },
  reimburse: {
    primary: true,
    className:
      "border-violet-200 bg-violet-600 text-white hover:bg-violet-700",
  },
  return_to_draft: {
    className:
      "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  },
};

export function ExpenseWorkflowActions({
  expense,
  currentUserId,
  canManageBilling,
  canDispatchJobs,
  compact = false,
  onExpenseUpdated,
}: ExpenseWorkflowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const actions = getExpenseWorkflowActions({
    status: expense.status,
    isReimbursable: expense.isReimbursable,
    technicianId: expense.technicianId,
    currentUserId,
    canManageBilling,
    canDispatchJobs,
  });

  if (actions.length === 0) {
    return null;
  }

  function runAction(action: ExpenseWorkflowAction) {
    if (action === "reject") {
      setShowRejectForm(true);
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await updateExpenseStatusAction({
        expenseId: expense.id,
        fromStatus: expense.status,
        action,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.expense) {
        onExpenseUpdated?.(result.expense);
      }

      router.refresh();
    });
  }

  function handleRejectSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await updateExpenseStatusAction({
        expenseId: expense.id,
        fromStatus: expense.status,
        action: "reject",
        rejectionReason,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.expense) {
        onExpenseUpdated?.(result.expense);
      }

      setShowRejectForm(false);
      setRejectionReason("");
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 border-t border-slate-100 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Review actions
      </h3>

      {showRejectForm ? (
        <form onSubmit={handleRejectSubmit} className="space-y-3">
          <div>
            <label
              htmlFor={`reject-reason-${expense.id}`}
              className="mb-1.5 block text-xs font-semibold text-slate-600"
            >
              Rejection reason{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id={`reject-reason-${expense.id}`}
              rows={compact ? 2 : 3}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="What needs to change?"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setShowRejectForm(false);
                setRejectionReason("");
              }}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg border border-rose-200 bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {isPending ? "Rejecting..." : "Confirm reject"}
            </button>
          </div>
        </form>
      ) : (
        <div className={`flex flex-wrap gap-2 ${compact ? "" : ""}`}>
          {actions.map((action) => {
            const style = ACTION_STYLES[action];

            return (
              <button
                key={action}
                type="button"
                disabled={isPending}
                onClick={() => runAction(action)}
                className={`inline-flex items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  compact ? "flex-1 min-w-[7rem]" : "min-w-[8rem]"
                } ${style.className}`}
              >
                {isPending
                  ? "Working..."
                  : EXPENSE_WORKFLOW_ACTION_LABELS[action]}
              </button>
            );
          })}
        </div>
      )}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </section>
  );
}
