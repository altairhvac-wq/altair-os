import {
  Calendar,
  CreditCard,
  Store,
} from "lucide-react";
import { ExpenseCategoryBadge } from "@/shared/components/expenses/ExpenseCategoryBadge";
import { ExpenseStatusBadge } from "@/shared/components/expenses/ExpenseStatusBadge";
import { northStarDetailTokens as dt } from "@/shared/design-system/north-star/tokens";
import {
  formatExpensePaymentMethod,
  type Expense,
} from "@/shared/types/expense";
import {
  getExpenseAmountLabel,
  getExpenseDateLabel,
  getExpenseMerchantLabel,
  northStarDarkMissingValueClass,
} from "./expense-detail-labels";

type ExpenseDetailNorthStarHeaderProps = {
  expense: Expense;
};

export function ExpenseDetailNorthStarHeader({
  expense,
}: ExpenseDetailNorthStarHeaderProps) {
  const amount = getExpenseAmountLabel(expense.amount);
  const merchant = getExpenseMerchantLabel(expense.merchant);
  const purchaseDate = getExpenseDateLabel(expense.purchaseDate);

  return (
    <div className={dt.heroShell}>
      <div aria-hidden="true" className={dt.heroAccentRail} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={dt.heroEyebrow}>Receipt review</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className={dt.heroTitle}>{expense.expenseNumber}</h1>
            <ExpenseStatusBadge status={expense.status} northStar onDarkSurface />
          </div>
          <p
            className={`mt-1 truncate text-sm ${
              merchant.missing ? "italic text-[#B8AD9E]" : "text-[#D7CDBD]"
            }`}
          >
            {merchant.text}
          </p>
          <div className="mt-2">
            <ExpenseCategoryBadge category={expense.category} northStar />
          </div>
        </div>

        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#D7CDBD]">
            Amount
          </p>
          <p
            className={`${dt.heroStatValue} ${
              amount.missing ? `text-lg italic ${northStarDarkMissingValueClass}` : ""
            }`}
          >
            {amount.text}
          </p>
        </div>
      </div>

      <div className={dt.metaStrip}>
        <div className={`${dt.metaRow} text-[#D7CDBD]`}>
          <Calendar className="h-3.5 w-3.5 shrink-0 text-[#D6BE78]" />
          <span
            className={
              purchaseDate.missing ? `text-xs ${northStarDarkMissingValueClass}` : undefined
            }
          >
            {purchaseDate.text}
          </span>
        </div>
        <div className={`mt-1 ${dt.metaRow} text-[#D7CDBD]`}>
          <CreditCard className="h-3.5 w-3.5 shrink-0 text-[#D6BE78]" />
          <span>{formatExpensePaymentMethod(expense.paymentMethod)}</span>
          <span className="text-[#D6BE78]">·</span>
          <span
            className={
              expense.isReimbursable
                ? dt.tagChip
                : "text-[#D7CDBD]"
            }
          >
            {expense.isReimbursable ? "Reimbursable" : "Company-paid"}
          </span>
        </div>
        <div className={`mt-1 ${dt.metaRow} text-[#D7CDBD]`}>
          <Store className="h-3.5 w-3.5 shrink-0 text-[#D6BE78]" />
          <span
            className={
              merchant.missing ? `text-xs ${northStarDarkMissingValueClass}` : undefined
            }
          >
            {merchant.text}
          </span>
        </div>
      </div>
    </div>
  );
}
