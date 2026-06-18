"use client";

import { ExpenseLifecycleControl } from "@/shared/components/expenses/ExpenseLifecycleControl";
import { ExpenseReceiptPreview } from "@/shared/components/expenses/ExpenseReceiptPreview";
import { ExpenseWorkflowActions } from "@/shared/components/expenses/ExpenseWorkflowActions";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import { formatReceiptStatus, type Expense } from "@/shared/types/expense";
import { getExpenseWorkflowActions } from "@/shared/types/expense-workflow";
import { ExpenseDetailNorthStarHeader } from "./ExpenseDetailNorthStarHeader";
import { ExpenseDetailNorthStarSideRail } from "./ExpenseDetailNorthStarSideRail";

const receiptStatusStyles = {
  missing: "bg-rose-50 text-rose-800 ring-rose-600/20",
  pending: "bg-amber-50 text-amber-800 ring-amber-600/20",
  attached: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
};

type ExpenseDetailNorthStarBodyProps = {
  expense: Expense;
  currentUserId: string;
  canManageBilling: boolean;
  canDispatchJobs: boolean;
  onExpenseUpdated?: (expense: Expense) => void;
};

export function ExpenseDetailNorthStarBody({
  expense,
  currentUserId,
  canManageBilling,
  canDispatchJobs,
  onExpenseUpdated,
}: ExpenseDetailNorthStarBodyProps) {
  const workflowActions = getExpenseWorkflowActions({
    status: expense.status,
    isReimbursable: expense.isReimbursable,
    technicianId: expense.technicianId,
    currentUserId,
    canManageBilling,
    canDispatchJobs,
  });

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <ExpenseDetailNorthStarHeader expense={expense} />

      {workflowActions.length > 0 ? (
        <div className={`${dt.commandPlate} flex-col items-stretch sm:flex-col`}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4F4638]">
            Review actions
          </p>
          <ExpenseWorkflowActions
            expense={expense}
            currentUserId={currentUserId}
            canManageBilling={canManageBilling}
            canDispatchJobs={canDispatchJobs}
            onExpenseUpdated={onExpenseUpdated}
            compact
            northStar
          />
        </div>
      ) : null}

      <div className="expense-north-star-detail-workspace grid min-w-0 gap-2.5 lg:grid-cols-[minmax(0,1.62fr)_minmax(11rem,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-2.5">
          <section className={dt.sectionSurface}>
            <div className="flex items-center justify-between gap-2">
              <h2 className={`${dt.sectionTitle} text-[#17130E]`}>Receipt</h2>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                  receiptStatusStyles[expense.receiptStatus]
                }`}
              >
                {formatReceiptStatus(expense.receiptStatus)}
              </span>
            </div>
            <p className={`mt-1 text-xs ${dt.ivoryCardMuted}`}>
              Preview or download the attached receipt before approving reimbursement.
            </p>
            <div className="mt-2.5">
              <ExpenseReceiptPreview
                expense={expense}
                onExpenseUpdated={onExpenseUpdated}
                northStar
              />
            </div>
          </section>

          <section className={dt.compactSectionSurface}>
            <h2 className={`${dt.sectionTitle} text-[#17130E]`}>Notes</h2>
            {expense.notes?.trim() ? (
              <p className={`mt-2 text-sm leading-relaxed ${dt.ivoryCardSecondary}`}>
                {expense.notes}
              </p>
            ) : (
              <p className={`mt-2 text-sm italic ${dt.ivoryCardMuted}`}>
                No notes added for this expense.
              </p>
            )}
          </section>
        </div>

        <ExpenseDetailNorthStarSideRail expense={expense} />
      </div>

      {canManageBilling ? (
        <ExpenseLifecycleControl
          expense={expense}
          canManage={canManageBilling}
          northStar
        />
      ) : null}
    </div>
  );
}
