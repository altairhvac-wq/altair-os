"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExpenseStatusAction } from "@/app/actions/expenses";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import { formatActionError } from "@/shared/lib/operational-errors";
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
  northStar?: boolean;
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

const NORTH_STAR_ACTION_STYLES: Record<
  ExpenseWorkflowAction,
  { primary?: boolean; className: string }
> = {
  submit: {
    primary: true,
    className:
      "inline-flex min-h-10 items-center justify-center rounded-lg border border-[#E6D092] bg-gradient-to-b from-[#E6D092] from-0% via-[#C9A44D] via-[45%] to-[#B88A2E] to-100% px-3 py-2 text-xs font-semibold text-[#17130E] shadow-[0_2px_10px_rgba(138,99,36,0.28)] transition-all hover:from-[#F0E4B8] hover:via-[#D4B05A] hover:to-[#9A7028] disabled:cursor-not-allowed disabled:opacity-60",
  },
  approve: {
    primary: true,
    className:
      "inline-flex min-h-10 items-center justify-center rounded-lg border border-emerald-600/30 bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60",
  },
  reject: {
    className: `${dt.secondaryAction} !min-h-10 !border-rose-300 !bg-rose-50 !text-rose-800 hover:!bg-rose-100`,
  },
  reimburse: {
    primary: true,
    className:
      "inline-flex min-h-10 items-center justify-center rounded-lg border border-violet-600/30 bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60",
  },
  return_to_draft: {
    className: `${dt.secondaryAction} !min-h-10`,
  },
};

export function ExpenseWorkflowActions({
  expense,
  currentUserId,
  canManageBilling,
  canDispatchJobs,
  compact = false,
  northStar = false,
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
        setError(formatActionError(result.error, "Could not update this expense. Try again."));
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
        setError(formatActionError(result.error, "Could not update this expense. Try again."));
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

  const actionStyles = northStar ? NORTH_STAR_ACTION_STYLES : ACTION_STYLES;

  const content = (
    <>
      {showRejectForm ? (
        <form onSubmit={handleRejectSubmit} className="space-y-3">
          <div>
            <label
              htmlFor={`reject-reason-${expense.id}`}
              className={`mb-1.5 block text-xs font-semibold ${
                northStar ? "text-[#4F4638]" : "text-slate-600"
              }`}
            >
              Rejection reason{" "}
              <span
                className={`font-normal ${
                  northStar ? "text-[#6B6255]" : "text-slate-400"
                }`}
              >
                (optional)
              </span>
            </label>
            <textarea
              id={`reject-reason-${expense.id}`}
              rows={compact ? 2 : 3}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="What needs to change?"
              className={
                northStar
                  ? "w-full rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2.5 text-sm text-[#17130E] outline-none transition-colors placeholder:text-[#6B6255] focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)]"
                  : "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
              }
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
              className={
                northStar
                  ? `${dt.secondaryAction} flex-1 !min-h-10 !justify-center`
                  : "flex-1 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              }
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={
                northStar
                  ? "flex-1 rounded-lg border border-rose-300 bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  : "flex-1 rounded-lg border border-rose-200 bg-rose-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              }
            >
              {isPending ? "Rejecting..." : "Confirm reject"}
            </button>
          </div>
        </form>
      ) : (
        <div className={`flex flex-wrap gap-2 ${compact ? "" : ""}`}>
          {actions.map((action) => {
            const style = actionStyles[action];

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

      {error ? (
        <p className={`text-sm ${northStar ? "text-rose-700" : "text-red-600"}`}>
          {error}
        </p>
      ) : null}
    </>
  );

  if (northStar) {
    return content;
  }

  return (
    <section className="space-y-3 border-t border-slate-100 pt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Review actions
      </h3>
      {content}
    </section>
  );
}
