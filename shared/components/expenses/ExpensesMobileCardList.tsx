import { ImageIcon, ChevronRight, Receipt } from "lucide-react";
import { adminListRowClass, adminListRowWrapSelectedClass } from "@/shared/lib/admin-density";
import { formatExpenseAmount, formatExpenseDate } from "@/shared/types/expense";
import type { Expense } from "@/shared/types/expense";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";

type ExpensesMobileCardListProps = {
  expenses: Expense[];
  selectedId: string | null;
  onSelect: (expense: Expense) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (expenseId: string) => void;
  northStar?: boolean;
};

const northStarMissingValueClass = "text-xs font-medium italic text-[#64748B]";

function getExpenseMerchantLabel(merchant: string, northStar: boolean) {
  const trimmed = merchant.trim();
  if (trimmed) {
    return { text: trimmed, missing: false };
  }

  return {
    text: northStar ? "Missing merchant" : "—",
    missing: true,
  };
}

function getExpenseDateLabel(date: string | undefined, northStar: boolean) {
  if (!date) {
    return {
      text: northStar ? "Date not set" : "—",
      missing: true,
    };
  }

  return {
    text: formatExpenseDate(date),
    missing: false,
  };
}

function getExpenseAmountLabel(amount: number | undefined, northStar: boolean) {
  if (amount == null) {
    return {
      text: northStar ? "Missing amount" : "—",
      missing: true,
    };
  }

  return {
    text: formatExpenseAmount(amount),
    missing: false,
  };
}

export function ExpensesMobileCardList({
  expenses,
  selectedId,
  onSelect,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  northStar = false,
}: ExpensesMobileCardListProps) {
  return (
    <ul
      className={`md:hidden ${
        northStar
          ? "expense-north-star-mobile-list divide-y divide-[rgba(138,99,36,0.12)]"
          : "divide-y divide-slate-100"
      }`}
    >
      {expenses.map((expense) => {
        const isRowSelected = expense.id === selectedId;
        const isBulkSelected = selectedIds?.has(expense.id) ?? false;
        const isHighlighted = isRowSelected || isBulkSelected;
        const hasReceipt = expense.receiptStatus === "attached";
        const merchant = getExpenseMerchantLabel(expense.merchant, northStar);
        const purchaseDate = getExpenseDateLabel(expense.purchaseDate, northStar);
        const amount = getExpenseAmountLabel(expense.amount, northStar);

        return (
          <li key={expense.id}>
            <div
              className={`flex items-stretch ${
                isHighlighted
                  ? northStar
                    ? "expense-north-star-row-selected"
                    : adminListRowWrapSelectedClass
                  : ""
              }`}
            >
              {selectionEnabled ? (
                <div className="flex shrink-0 items-center pl-3">
                  <label
                    className="flex min-h-11 min-w-11 items-center justify-center"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <BulkSelectCheckbox
                      checked={isBulkSelected}
                      ariaLabel={`Select expense ${expense.expenseNumber}`}
                      onChange={() => onToggleSelection?.(expense.id)}
                      variant={northStar ? "northStar" : "default"}
                    />
                  </label>
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => onSelect(expense)}
                className={`${
                  northStar
                    ? "flex w-full min-w-0 items-start gap-2.5"
                    : adminListRowClass
                } min-w-0 flex-1 px-3 py-3 text-left transition-colors`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className={
                        northStar
                          ? `truncate ${lt.tablePrimaryText}`
                          : "truncate text-sm font-bold text-slate-900"
                      }
                    >
                      {expense.expenseNumber}
                    </p>
                    <ExpenseStatusBadge status={expense.status} northStar={northStar} />
                  </div>
                  <p
                    className={
                      northStar
                        ? merchant.missing
                          ? `mt-0.5 truncate ${northStarMissingValueClass}`
                          : `mt-0.5 truncate ${lt.tableSecondaryText}`
                        : "mt-0.5 truncate text-sm font-medium text-slate-900"
                    }
                  >
                    {merchant.text}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p
                      className={
                        northStar
                          ? purchaseDate.missing
                            ? northStarMissingValueClass
                            : lt.tableMutedText
                          : "text-xs text-slate-500"
                      }
                    >
                      {purchaseDate.text}
                    </p>
                    <ExpenseCategoryBadge category={expense.category} northStar={northStar} />
                    {hasReceipt ? (
                      <span
                        className={
                          northStar
                            ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-600/20"
                            : "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/15"
                        }
                      >
                        <ImageIcon className="h-3 w-3" />
                        Receipt
                      </span>
                    ) : (
                      <span
                        className={
                          northStar
                            ? "inline-flex items-center gap-1 rounded-full bg-[#EFE4CB] px-2 py-0.5 text-[10px] font-semibold text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.14)]"
                            : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500"
                        }
                      >
                        <Receipt className="h-3 w-3" />
                        Missing
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  <p
                    className={
                      northStar
                        ? amount.missing
                          ? northStarMissingValueClass
                          : lt.tableMetricText
                        : "text-sm font-semibold text-slate-900"
                    }
                  >
                    {amount.text}
                  </p>
                  <ChevronRight
                    className={
                      northStar ? "h-4 w-4 text-[#8A6324]/50" : "h-4 w-4 text-slate-300"
                    }
                  />
                </div>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
