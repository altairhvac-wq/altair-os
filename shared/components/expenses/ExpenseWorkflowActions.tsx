"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateExpenseStatusAction } from "@/app/actions/expenses";
import {
  buttonClassName,
  type ButtonVariant,
} from "@/shared/design-system/components/button-styles";
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
  { variant: ButtonVariant }
> = {
  submit: {
    variant: "primary",
  },
  approve: {
    variant: "primary",
  },
  reject: {
    variant: "destructive",
  },
  reimburse: {
    variant: "primary",
  },
  return_to_draft: {
    variant: "secondary",
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
                  northStar ? "text-[#64748B]" : "text-slate-400"
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
                  ? "w-full rounded-lg border border-[rgba(138,99,36,0.18)] bg-[#FFF9EA] px-3 py-2.5 text-sm text-[#17130E] outline-none transition-colors placeholder:text-[#64748B] focus:border-[#B88A2E] focus:bg-[#FBF7EF] focus:ring-2 focus:ring-[rgba(201,164,77,0.22)]"
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
              className={buttonClassName("secondary", "md", "flex-1")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={buttonClassName("destructive", "md", "flex-1")}
            >
              {isPending ? "Rejecting…" : "Confirm reject"}
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
                className={buttonClassName(
                  style.variant,
                  "md",
                  compact ? "min-w-[7rem] flex-1" : "min-w-[8rem]",
                )}
              >
                {isPending
                  ? "Working…"
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
