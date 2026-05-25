import Link from "next/link";
import { Receipt } from "lucide-react";
import {
  formatExpenseAmount,
  formatExpenseCategory,
  formatReceiptStatus,
  type Expense,
} from "@/shared/types/expense";
import { ExpenseCategoryBadge } from "@/shared/components/expenses/ExpenseCategoryBadge";

type JobExpenseReceiptsSectionProps = {
  jobId: string;
  expenses: Expense[];
};

export function JobExpenseReceiptsSection({
  jobId,
  expenses,
}: JobExpenseReceiptsSectionProps) {
  const receiptExpenses = expenses.filter(
    (expense) => expense.receiptStatus === "attached",
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 ring-1 ring-amber-600/10">
            <Receipt className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Expense receipts
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Material receipts and reimbursable expenses linked to this job
            </p>
          </div>
        </div>

        <Link
          href={`/expenses?jobId=${jobId}`}
          className="text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
        >
          View all
        </Link>
      </div>

      {receiptExpenses.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">No receipts linked yet</p>
          <p className="mt-1 text-xs text-slate-500">
            Upload receipts from the expenses page or when completing field work.
          </p>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {receiptExpenses.map((expense) => (
            <li
              key={expense.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white"
            >
              <div className="relative aspect-[4/3] bg-slate-100">
                {isExpenseReceiptImage(expense.receiptFileName) &&
                expense.receiptSignedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={expense.receiptSignedUrl}
                    alt={expense.receiptFileName ?? expense.expenseNumber}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-4 text-center text-xs font-medium text-slate-600">
                    {expense.receiptFileName ?? "Receipt attached"}
                  </div>
                )}
                <span className="absolute left-2 top-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm ring-1 ring-slate-200">
                  {formatReceiptStatus(expense.receiptStatus)}
                </span>
              </div>
              <div className="space-y-2 px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {expense.merchant.trim() || expense.expenseNumber}
                    </p>
                    <p className="text-xs text-slate-500">{expense.expenseNumber}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatExpenseAmount(expense.amount)}
                  </p>
                </div>
                <ExpenseCategoryBadge category={expense.category} />
                <p className="text-xs text-slate-500">
                  {formatExpenseCategory(expense.category)} · {expense.technician}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function isExpenseReceiptImage(fileName?: string): boolean {
  if (!fileName) {
    return false;
  }

  return /\.(jpe?g|png|webp|heic|heif)$/i.test(fileName);
}
