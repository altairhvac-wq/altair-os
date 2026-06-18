import {
  Calendar,
  CreditCard,
  Store,
  User,
  Wrench,
} from "lucide-react";
import { isNorthStarShellEnabled } from "@/lib/beta/north-star-shell";
import { DesktopConditionalDetailPanel } from "@/shared/components/layout/DesktopConditionalDetailPanel";
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
import { ExpenseLifecycleControl } from "./ExpenseLifecycleControl";
import {
  ExpenseDetailNorthStarBody,
  ExpenseDetailNorthStarPanel,
} from "./north-star-m6b";

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

function LegacyExpenseDetailsPanel({
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
  const isOpen = mode !== "empty";

  const title =
    mode === "create"
      ? "New expense"
      : mode === "detail" && expense
        ? expense.expenseNumber
        : "Expense details";

  const subtitle =
    mode === "create"
      ? "Log a purchase and attach a receipt"
      : mode === "detail"
        ? "Review receipt before approving"
        : undefined;

  return (
    <DesktopConditionalDetailPanel
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      ariaLabel={mode === "create" ? "Create expense" : "Expense details"}
    >
      {mode === "create" ? (
        <ExpenseForm
          jobId={createJobId}
          onSuccess={onCreateSuccess}
          onCancel={onCreateCancel}
        />
      ) : null}

      {mode === "detail" && expense ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
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

          {canManageBilling ? (
            <ExpenseLifecycleControl expense={expense} canManage={canManageBilling} />
          ) : null}
        </div>
      ) : null}
    </DesktopConditionalDetailPanel>
  );
}

function NorthStarExpenseDetailsPanel({
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
  const isOpen = mode !== "empty";

  if (mode === "create") {
    return (
      <DesktopConditionalDetailPanel
        isOpen={isOpen}
        onClose={onClose}
        title="New expense"
        subtitle="Log a purchase and attach a receipt"
        ariaLabel="Create expense"
      >
        <ExpenseForm
          jobId={createJobId}
          onSuccess={onCreateSuccess}
          onCancel={onCreateCancel}
        />
      </DesktopConditionalDetailPanel>
    );
  }

  return (
    <ExpenseDetailNorthStarPanel
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Expense details"
    >
      {mode === "detail" && expense ? (
        <ExpenseDetailNorthStarBody
          expense={expense}
          currentUserId={currentUserId}
          canManageBilling={canManageBilling}
          canDispatchJobs={canDispatchJobs}
          onExpenseUpdated={onExpenseUpdated}
        />
      ) : null}
    </ExpenseDetailNorthStarPanel>
  );
}

export function ExpenseDetailsPanel(props: ExpenseDetailsPanelProps) {
  if (isNorthStarShellEnabled()) {
    return <NorthStarExpenseDetailsPanel {...props} />;
  }

  return <LegacyExpenseDetailsPanel {...props} />;
}
