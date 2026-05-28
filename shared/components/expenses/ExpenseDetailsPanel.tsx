import {
  Calendar,
  CreditCard,
  Receipt,
  Store,
  User,
  Wrench,
  X,
} from "lucide-react";
import { listDetailPanelClass } from "@/shared/components/layout/list-detail-layout";
import {
  formatExpenseAmount,
  formatExpenseDate,
  formatExpensePaymentMethod,
  formatReceiptStatus,
  type Expense,
} from "@/shared/types/expense";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseReceiptPreview } from "./ExpenseReceiptPreview";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { ExpenseWorkflowActions } from "./ExpenseWorkflowActions";

type PanelMode = "detail" | "create" | "empty";

type ExpenseDetailsPanelProps = {
  mode: PanelMode;
  expense: Expense | null;
  createJobId?: string;
  currentUserId: string;
  canManageBilling: boolean;
  canDispatchJobs: boolean;
  onClose: () => void;
  onCreateSuccess: () => void;
  onCreateCancel: () => void;
  onExpenseUpdated?: (expense: Expense) => void;
};

const receiptStatusStyles = {
  missing: "text-red-600 bg-red-50",
  pending: "text-amber-600 bg-amber-50",
  attached: "text-emerald-600 bg-emerald-50",
};

export function ExpenseDetailsPanel({
  mode,
  expense,
  createJobId,
  currentUserId,
  canManageBilling,
  canDispatchJobs,
  onClose,
  onCreateSuccess,
  onCreateCancel,
  onExpenseUpdated,
}: ExpenseDetailsPanelProps) {
  const title =
    mode === "create"
      ? "New expense"
      : mode === "detail" && expense
        ? expense.expenseNumber
        : "Expense details";

  return (
    <aside
      className={`${listDetailPanelClass(mode !== "empty")} min-h-[12rem] min-w-0 flex-[1_1_45%] flex-col overflow-hidden admin-card lg:h-full lg:min-h-0 lg:w-[400px] lg:flex-none lg:shrink-0`}
    >
      <div className="admin-panel-header flex shrink-0 items-start justify-between px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0 pr-2">
          <h2 className="admin-heading-section sm:text-base">{title}</h2>
          <p className="admin-text-helper mt-0.5">
            {mode === "create"
              ? "Log a purchase and attach a receipt"
              : mode === "detail"
                ? "Review receipt before approving"
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
          <div className="flex h-full flex-col items-center justify-center px-4 py-8 text-center">
            <div className="admin-empty-state w-full max-w-xs">
              <div className="admin-empty-icon mx-auto">
                <Receipt className="h-6 w-6 text-slate-400" />
              </div>
              <p className="admin-heading-section mt-4 text-sm">No expense selected</p>
              <p className="admin-text-helper mx-auto mt-1 max-w-[220px]">
                Click a row in the table to view full expense details here.
              </p>
            </div>
          </div>
        ) : null}

        {mode === "create" ? (
          <ExpenseForm
            jobId={createJobId}
            onSuccess={onCreateSuccess}
            onCancel={onCreateCancel}
          />
        ) : null}

        {mode === "detail" && expense ? (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {formatExpenseAmount(expense.amount)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {expense.merchant.trim() || "Vendor not set"}
                  </p>
                  <div className="mt-2">
                    <ExpenseCategoryBadge category={expense.category} />
                  </div>
                </div>
                <ExpenseStatusBadge status={expense.status} />
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Receipt
                </h3>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${receiptStatusStyles[expense.receiptStatus]}`}
                >
                  {formatReceiptStatus(expense.receiptStatus)}
                </span>
              </div>
              <div className="mt-2">
                <ExpenseReceiptPreview
                  expense={expense}
                  onExpenseUpdated={onExpenseUpdated}
                />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Purchase
              </h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatExpenseDate(expense.purchaseDate)}
                </div>
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-slate-400" />
                  {expense.merchant.trim() || "—"}
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment
              </h3>
              <div className="mt-2 space-y-2 text-sm text-slate-700">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  {formatExpensePaymentMethod(expense.paymentMethod)}
                </div>
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    expense.isReimbursable
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {expense.isReimbursable ? "Reimbursable" : "Company-paid"}
                </span>
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

            <ExpenseWorkflowActions
              expense={expense}
              currentUserId={currentUserId}
              canManageBilling={canManageBilling}
              canDispatchJobs={canDispatchJobs}
              onExpenseUpdated={onExpenseUpdated}
            />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
