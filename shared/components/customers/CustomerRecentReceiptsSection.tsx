import Link from "next/link";
import { Receipt } from "lucide-react";
import {
  formatExpenseAmount,
  type Expense,
} from "@/shared/types/expense";

type CustomerRecentReceiptsSectionProps = {
  customerId: string;
  expenses: Expense[];
};

function isReceiptImage(fileName?: string): boolean {
  if (!fileName) {
    return false;
  }

  return /\.(jpe?g|png|webp|heic|heif)$/i.test(fileName);
}

export function CustomerRecentReceiptsSection({
  customerId,
  expenses,
}: CustomerRecentReceiptsSectionProps) {
  if (expenses.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent receipts
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Latest expense receipts for this customer
          </p>
        </div>
        <Link
          href={`/expenses?customerId=${customerId}`}
          className="text-sm font-semibold text-cyan-600 transition-colors hover:text-cyan-700"
        >
          View all
        </Link>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
        {expenses.map((expense) => (
          <article
            key={expense.id}
            className="w-36 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="aspect-square bg-slate-100">
              {isReceiptImage(expense.receiptFileName) &&
              expense.receiptSignedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={expense.receiptSignedUrl}
                  alt={expense.receiptFileName ?? expense.expenseNumber}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-medium text-slate-600">
                  {expense.receiptFileName ?? "Receipt"}
                </div>
              )}
            </div>
            <div className="px-2 py-2">
              <p className="truncate text-xs font-semibold text-slate-900">
                {expense.merchant.trim() || expense.expenseNumber}
              </p>
              <p className="text-[11px] text-slate-500">
                {formatExpenseAmount(expense.amount)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
