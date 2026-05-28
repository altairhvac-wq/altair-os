"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ImageIcon, Plus, Receipt } from "lucide-react";
import {
  formatExpenseAmount,
  formatExpenseDate,
  formatReceiptStatus,
  isExpenseReceiptImageFile,
  type Expense,
} from "@/shared/types/expense";
import { ExpenseReceiptPreview } from "@/shared/components/expenses/ExpenseReceiptPreview";
import { ExpenseStatusBadge } from "@/shared/components/expenses/ExpenseStatusBadge";
import { ExpenseWorkflowActions } from "@/shared/components/expenses/ExpenseWorkflowActions";
import { TechnicianExpenseSheet } from "./TechnicianExpenseSheet";

type TechnicianReceiptsViewProps = {
  expenses: Expense[];
  currentUserId: string;
  canManageBilling: boolean;
  canDispatchJobs: boolean;
  initialSelectedId?: string | null;
};

export function TechnicianReceiptsView({
  expenses,
  currentUserId,
  canManageBilling,
  canDispatchJobs,
  initialSelectedId = null,
}: TechnicianReceiptsViewProps) {
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(
    initialSelectedId,
  );
  const [localExpenses, setLocalExpenses] = useState(expenses);

  useEffect(() => {
    setLocalExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    if (!initialSelectedId) {
      return;
    }

    if (expenses.some((expense) => expense.id === initialSelectedId)) {
      setExpandedId(initialSelectedId);
    }
  }, [expenses, initialSelectedId]);

  const pendingCount = useMemo(
    () =>
      localExpenses.filter(
        (expense) => expense.status === "draft" || expense.status === "submitted",
      ).length,
    [localExpenses],
  );

  function handleExpenseUpdated(updated: Expense) {
    setLocalExpenses((current) =>
      current.map((expense) =>
        expense.id === updated.id ? updated : expense,
      ),
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-200 sm:px-4 sm:py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              My receipts
            </p>
            <p className="text-sm font-bold text-slate-900">
              {localExpenses.length} expense{localExpenses.length === 1 ? "" : "s"}
            </p>
            {pendingCount > 0 ? (
              <p className="text-xs text-blue-600">
                {pendingCount} awaiting review or submission
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setShowCreateSheet(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {localExpenses.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
              <Receipt className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="mt-5 text-lg font-bold text-slate-900">No receipts yet</h3>
            <p className="mx-auto mt-2 max-w-xs text-sm text-slate-500">
              Snap a receipt from a job or tap Add to log a purchase.
            </p>
            <button
              type="button"
              onClick={() => setShowCreateSheet(true)}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
            >
              <Plus className="h-4 w-4" />
              Add receipt
            </button>
          </section>
        ) : (
          <ul className="space-y-3">
            {localExpenses.map((expense) => {
              const isExpanded = expandedId === expense.id;
              const hasReceipt = expense.receiptStatus === "attached";
              const showImageThumb =
                hasReceipt &&
                isExpenseReceiptImageFile(expense.receiptFileName) &&
                expense.receiptSignedUrl;

              return (
                <li
                  key={expense.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId((current) =>
                        current === expense.id ? null : expense.id,
                      )
                    }
                    className="w-full text-left"
                  >
                    <div className="flex gap-3 p-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                        {showImageThumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={expense.receiptSignedUrl}
                            alt={expense.receiptFileName ?? expense.expenseNumber}
                            className="h-full w-full object-cover"
                          />
                        ) : hasReceipt ? (
                          <div className="flex h-full flex-col items-center justify-center gap-0.5 text-emerald-700">
                            <Check className="h-4 w-4" />
                            <span className="text-[9px] font-bold uppercase">File</span>
                          </div>
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Receipt className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                        {hasReceipt ? (
                          <span className="absolute bottom-0 left-0 right-0 bg-emerald-600/90 py-0.5 text-center text-[8px] font-bold uppercase tracking-wide text-white">
                            Attached
                          </span>
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-base font-bold text-slate-900">
                              {formatExpenseAmount(expense.amount)}
                            </p>
                            <p className="truncate text-sm text-slate-700">
                              {expense.merchant.trim() || "Vendor not set"}
                            </p>
                          </div>
                          <ExpenseStatusBadge
                            status={expense.status}
                            className="shrink-0"
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatExpenseDate(expense.purchaseDate)}
                          {expense.jobNumber ? ` · ${expense.jobNumber}` : ""}
                        </p>
                        {!hasReceipt ? (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            {formatReceiptStatus(expense.receiptStatus)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </button>

                  {isExpanded ? (
                    <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-3">
                      <ExpenseReceiptPreview
                        expense={expense}
                        compact
                        onExpenseUpdated={handleExpenseUpdated}
                      />
                      <ExpenseWorkflowActions
                        expense={expense}
                        currentUserId={currentUserId}
                        canManageBilling={canManageBilling}
                        canDispatchJobs={canDispatchJobs}
                        compact
                        onExpenseUpdated={handleExpenseUpdated}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        {hasReceipt ? (
                          <>
                            <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                            Receipt attached
                          </>
                        ) : (
                          "Tap to add receipt or submit"
                        )}
                      </span>
                      <span className="text-xs font-semibold text-cyan-600">
                        {isExpanded ? "Hide" : "Details"}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showCreateSheet ? (
        <TechnicianExpenseSheet onClose={() => setShowCreateSheet(false)} />
      ) : null}
    </>
  );
}
