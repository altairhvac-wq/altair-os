import Link from "next/link";
import { Receipt } from "lucide-react";
import {
  formatExpenseAmount,
  formatExpenseCategory,
  formatReceiptStatus,
  isExpenseReceiptImageFile,
  type Expense,
} from "@/shared/types/expense";
import { ExpenseCategoryBadge } from "@/shared/components/expenses/ExpenseCategoryBadge";
import {
  jobDetailEmptyHintClass,
  jobDetailEmptyStateClass,
  jobDetailEmptyTitleClass,
  jobDetailLinkClass,
  jobDetailSectionIconWrapClass,
  jobDetailSectionSubtitleClass,
  jobDetailSectionTitleClass,
  resolveJobDetailSectionClass,
} from "@/shared/components/jobs/job-detail-section-styles";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";

type JobExpenseReceiptsSectionProps = {
  jobId: string;
  expenses: Expense[];
  northStar?: boolean;
};

export function JobExpenseReceiptsSection({
  jobId,
  expenses,
  northStar = false,
}: JobExpenseReceiptsSectionProps) {
  const receiptExpenses = expenses.filter(
    (expense) => expense.receiptStatus === "attached",
  );

  return (
    <section
      aria-labelledby={`job-expense-receipts-heading-${jobId}`}
      className={resolveJobDetailSectionClass(northStar)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={jobDetailSectionIconWrapClass(northStar)}>
            <Receipt className={northStar ? "h-4 w-4" : "h-5 w-5 text-amber-600"} />
          </div>
          <div>
            <h2
              id={`job-expense-receipts-heading-${jobId}`}
              className={jobDetailSectionTitleClass(northStar)}
            >
              Expense receipts
            </h2>
            <p className={jobDetailSectionSubtitleClass(northStar)}>
              Material receipts and reimbursable expenses linked to this job
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/expenses?jobId=${jobId}&create=1`}
            className={
              northStar
                ? dt.primaryAction
                : "inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700"
            }
          >
            Add receipt
          </Link>
          <Link
            href={`/expenses?jobId=${jobId}`}
            className={jobDetailLinkClass(northStar)}
          >
            View all
          </Link>
        </div>
      </div>

      {receiptExpenses.length === 0 ? (
        <div className={`mt-4 ${jobDetailEmptyStateClass(northStar)}`}>
          <p className={jobDetailEmptyTitleClass(northStar)}>No receipts linked yet</p>
          <p className={jobDetailEmptyHintClass(northStar)}>
            Snap a receipt from the job card or add one from the expenses page.
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
                {isExpenseReceiptImageFile(expense.receiptFileName) &&
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
