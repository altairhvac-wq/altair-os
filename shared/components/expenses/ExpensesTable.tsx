import { useMemo } from "react";
import { ImageIcon, Receipt } from "lucide-react";
import { BulkSelectCheckbox } from "@/shared/components/bulk/BulkSelectCheckbox";
import { resolveBulkSelectionState } from "@/shared/lib/bulk-selection";
import {
  adminTableRowClass,
  adminTableRowSelectedClass,
} from "@/shared/lib/admin-density";
import { northStarListTokens as lt } from "@/shared/design-system/north-star/tokens";
import { formatExpenseAmount, formatExpenseDate } from "@/shared/types/expense";
import type { Expense } from "@/shared/types/expense";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";
import { ExpensesMobileCardList } from "./ExpensesMobileCardList";

/**
 * Expenses have no dedicated detail route (the record opens in an in-page
 * panel via `onSelect`, not a navigation) — so the primary cell cannot use a
 * real `<Link>` the way Customers/Jobs/Invoices/Estimates do. This button
 * reuses the same "text link masquerading as a button" quiet-action pattern
 * (see the Buttons section of the Altair Design Foundation) so the row's
 * primary action stays keyboard-focusable without inventing a new control.
 * Same focus ring as the other ledgers' primary-cell links, reused rather
 * than a new token.
 */
const expenseNumberButtonFocusClass =
  "text-left hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-altair-ink-on-paper focus-visible:ring-offset-2 focus-visible:ring-offset-altair-paper-elevated";

type ExpensesTableProps = {
  expenses: Expense[];
  selectedId: string | null;
  onSelect: (expense: Expense) => void;
  selectionEnabled?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelection?: (expenseId: string) => void;
  onToggleAllVisible?: (selectAll: boolean) => void;
  northStar?: boolean;
};

const legacyRowStatusAccent: Partial<Record<Expense["status"], string>> = {
  submitted: "border-l-4 border-l-blue-400",
  approved: "border-l-4 border-l-emerald-400",
  rejected: "border-l-4 border-l-rose-400",
  reimbursed: "border-l-4 border-l-violet-400",
};

const northStarRowStatusAccent: Partial<Record<Expense["status"], string>> = {
  submitted: "border-l-4 border-l-[#C9A44D]",
  approved: "border-l-4 border-l-emerald-500",
  rejected: "border-l-4 border-l-rose-500",
  reimbursed: "border-l-4 border-l-violet-500",
};

const northStarMissingValueClass =
  "text-xs font-medium italic text-[#64748B]";

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

function getExpenseTechnicianLabel(technician: string, northStar: boolean) {
  const trimmed = technician.trim();
  if (trimmed) {
    return { text: trimmed, missing: false };
  }

  return {
    text: northStar ? "No technician" : technician,
    missing: true,
  };
}

function getExpenseJobLabel(jobNumber: string | undefined, northStar: boolean) {
  const trimmed = jobNumber?.trim();
  if (trimmed) {
    return { text: trimmed, missing: false };
  }

  return {
    text: northStar ? "No job linked" : "—",
    missing: true,
  };
}

export function ExpensesTable({
  expenses,
  selectedId,
  onSelect,
  selectionEnabled = false,
  selectedIds,
  onToggleSelection,
  onToggleAllVisible,
  northStar = false,
}: ExpensesTableProps) {
  const headerSelection = useMemo(
    () =>
      selectionEnabled && selectedIds
        ? resolveBulkSelectionState(selectedIds, expenses)
        : null,
    [expenses, selectedIds, selectionEnabled],
  );

  const rowStatusAccent = northStar
    ? northStarRowStatusAccent
    : legacyRowStatusAccent;

  return (
    <>
      <ExpensesMobileCardList
        expenses={expenses}
        selectedId={selectedId}
        onSelect={onSelect}
        selectionEnabled={selectionEnabled}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
        northStar={northStar}
      />

      <div
        className={`hidden overflow-x-auto md:block${
          northStar ? " expense-north-star-ledger" : ""
        }`}
      >
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr
            className={
              northStar
                ? lt.tableHeaderRow
                : "border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500"
            }
          >
            {selectionEnabled ? (
              <th
                className={`w-10 ${northStar ? lt.tableHeaderCell : "admin-table-cell"}`}
              >
                {headerSelection && headerSelection.selectableCount > 0 ? (
                  <BulkSelectCheckbox
                    checked={headerSelection.allSelected}
                    indeterminate={headerSelection.someSelected}
                    ariaLabel="Select all visible expenses"
                    onChange={(checked) => onToggleAllVisible?.(checked)}
                    variant={northStar ? "northStar" : "default"}
                  />
                ) : null}
              </th>
            ) : null}
            <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
              Expense
            </th>
            <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
              Merchant
            </th>
            <th
              className={`hidden ${northStar ? lt.tableHeaderCell : "admin-table-cell"} md:table-cell`}
            >
              Category
            </th>
            <th
              className={`hidden ${northStar ? lt.tableHeaderCell : "admin-table-cell"} lg:table-cell`}
            >
              Technician
            </th>
            <th
              className={`hidden ${northStar ? lt.tableHeaderCell : "admin-table-cell"} lg:table-cell`}
            >
              Job
            </th>
            <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
              Receipt
            </th>
            <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
              Amount
            </th>
            <th className={northStar ? lt.tableHeaderCell : "admin-table-cell"}>
              Status
            </th>
          </tr>
        </thead>
        <tbody
          className={
            northStar
              ? "divide-y divide-[rgba(138,99,36,0.12)]"
              : "divide-y divide-slate-50"
          }
        >
          {expenses.map((expense) => {
            const isSelected = expense.id === selectedId;
            const isBulkSelected = selectedIds?.has(expense.id) ?? false;
            const hasReceipt = expense.receiptStatus === "attached";
            const isRowHighlighted = isSelected || isBulkSelected;
            const merchant = getExpenseMerchantLabel(
              expense.merchant,
              northStar,
            );
            const purchaseDate = getExpenseDateLabel(
              expense.purchaseDate,
              northStar,
            );
            const amount = getExpenseAmountLabel(expense.amount, northStar);
            const technician = getExpenseTechnicianLabel(
              expense.technician,
              northStar,
            );
            const job = getExpenseJobLabel(expense.jobNumber, northStar);

            return (
              <tr
                key={expense.id}
                onClick={() => onSelect(expense)}
                className={
                  northStar
                    ? `${lt.tableRow} ${rowStatusAccent[expense.status] ?? ""} ${
                        isRowHighlighted ? lt.tableRowSelected : ""
                      }`
                    : `${adminTableRowClass} ${
                        rowStatusAccent[expense.status] ?? ""
                      } ${isRowHighlighted ? adminTableRowSelectedClass : ""}`
                }
              >
                {selectionEnabled ? (
                  <td className="admin-table-cell">
                    <BulkSelectCheckbox
                      checked={isBulkSelected}
                      ariaLabel={`Select expense ${expense.expenseNumber}`}
                      onChange={() => onToggleSelection?.(expense.id)}
                      variant={northStar ? "northStar" : "default"}
                    />
                  </td>
                ) : null}
                <td className="admin-table-cell">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(expense);
                    }}
                    className={
                      northStar
                        ? `${lt.tablePrimaryText} ${expenseNumberButtonFocusClass}`
                        : `font-semibold text-slate-900 ${expenseNumberButtonFocusClass}`
                    }
                  >
                    {expense.expenseNumber}
                  </button>
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
                </td>
                <td className="admin-table-cell">
                  <p
                    className={
                      northStar
                        ? merchant.missing
                          ? northStarMissingValueClass
                          : `truncate ${lt.tableSecondaryText}`
                        : "truncate font-medium text-slate-900"
                    }
                  >
                    {merchant.text}
                  </p>
                </td>
                <td className="hidden admin-table-cell md:table-cell">
                  <ExpenseCategoryBadge category={expense.category} northStar={northStar} />
                </td>
                <td
                  className={`hidden ${northStar ? `admin-table-cell expense-north-star-meta-cell` : "admin-table-cell text-slate-600"} lg:table-cell`}
                >
                  <span
                    className={
                      northStar && technician.missing
                        ? northStarMissingValueClass
                        : undefined
                    }
                  >
                    {technician.text}
                  </span>
                </td>
                <td
                  className={`hidden ${northStar ? `admin-table-cell expense-north-star-meta-cell` : "admin-table-cell text-slate-600"} lg:table-cell`}
                >
                  <span
                    className={
                      northStar && job.missing
                        ? northStarMissingValueClass
                        : undefined
                    }
                  >
                    {job.text}
                  </span>
                </td>
                <td className="admin-table-cell">
                  {hasReceipt ? (
                    <span
                      className={
                        northStar
                          ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-600/20"
                          : "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/15"
                      }
                    >
                      <ImageIcon className="h-3 w-3" />
                      Attached
                    </span>
                  ) : (
                    <span
                      className={
                        northStar
                          ? "inline-flex items-center gap-1 rounded-full bg-[#EFE4CB] px-2 py-0.5 text-xs font-semibold text-[#4F4638] ring-1 ring-[rgba(138,99,36,0.14)]"
                          : "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500"
                      }
                    >
                      <Receipt className="h-3 w-3" />
                      Missing
                    </span>
                  )}
                </td>
                <td className="admin-table-cell">
                  <span
                    className={
                      northStar
                        ? amount.missing
                          ? northStarMissingValueClass
                          : "text-base font-bold tabular-nums text-[#17130E]"
                        : "font-semibold text-slate-900"
                    }
                  >
                    {amount.text}
                  </span>
                </td>
                <td className="admin-table-cell">
                  <ExpenseStatusBadge status={expense.status} northStar={northStar} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
