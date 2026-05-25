import {
  Calendar,
  FileText,
  Receipt,
  Store,
  User,
  Wrench,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/shared/types/customer";
import {
  formatReceiptStatus,
  type Expense,
  type ExpenseFormData,
} from "@/shared/types/expense";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { ReceiptUploadBox } from "./ReceiptUploadBox";

type PanelMode = "detail" | "create" | "empty";

type ExpenseDetailsPanelProps = {
  mode: PanelMode;
  expense: Expense | null;
  onClose: () => void;
  onCreateSubmit: (data: ExpenseFormData) => void;
  onCreateCancel: () => void;
};

const receiptStatusStyles = {
  missing: "text-red-600 bg-red-50",
  pending: "text-amber-600 bg-amber-50",
  attached: "text-emerald-600 bg-emerald-50",
};

export function ExpenseDetailsPanel({
  mode,
  expense,
  onClose,
  onCreateSubmit,
  onCreateCancel,
}: ExpenseDetailsPanelProps) {
  const title =
    mode === "create"
      ? "New expense"
      : mode === "detail" && expense
        ? expense.expenseNumber
        : "Expense details";

  return (
    <aside className="flex min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0">
      <div className="flex shrink-0 items-start justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {mode === "create"
              ? "Log a purchase and attach a receipt"
              : mode === "detail"
                ? "Expense details and approval status"
                : "Select an expense from the list"}
          </p>
        </div>
        {mode !== "empty" ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {mode === "empty" ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Receipt className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-700">
              No expense selected
            </p>
            <p className="mt-1 max-w-[220px] text-xs text-slate-500">
              Click a row in the table to view full expense details here.
            </p>
          </div>
        ) : null}

        {mode === "create" ? (
          <ExpenseForm onSubmit={onCreateSubmit} onCancel={onCreateCancel} />
        ) : null}

        {mode === "detail" && expense ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {formatCurrency(expense.amount)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {expense.merchant}
                  </p>
                  <div className="mt-2">
                    <ExpenseCategoryBadge category={expense.category} />
                  </div>
                </div>
                <ExpenseStatusBadge status={expense.status} />
              </div>
            </div>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Purchase
              </h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatDate(expense.purchaseDate)}
                </div>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-slate-400" />
                  {expense.merchant}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Technician
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <User className="h-4 w-4 text-slate-400" />
                {expense.technician}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Linked job
              </h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <Wrench className="h-4 w-4 text-slate-400" />
                {expense.jobNumber ?? "Not linked"}
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Receipt
              </h3>
              <div className="mt-2 space-y-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${receiptStatusStyles[expense.receiptStatus]}`}
                >
                  {formatReceiptStatus(expense.receiptStatus)}
                </span>
                {expense.receiptFileName ? (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {expense.receiptFileName}
                  </div>
                ) : (
                  <ReceiptUploadBox compact />
                )}
              </div>
            </section>

            {expense.notes ? (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Notes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {expense.notes}
                </p>
              </section>
            ) : null}

            <div className="flex gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Submit for approval
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Edit expense
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
