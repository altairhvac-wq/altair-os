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
  "text-xs font-medium italic text-[#6B6255]";

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
                className={`w-10 ${northStar ? lt.tableHeaderCell : "px-4 py-3"}`}
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
            <th className={northStar ? lt.tableHeaderCell : "px-4 py-3"}>
              Expense
            </th>
            <th className={northStar ? lt.tableHeaderCell : "px-4 py-3"}>
              Merchant
            </th>
            <th
              className={`hidden ${northStar ? lt.tableHeaderCell : "px-4 py-3"} md:table-cell`}
            >
              Category
            </th>
            <th
              className={`hidden ${northStar ? lt.tableHeaderCell : "px-4 py-3"} lg:table-cell`}
            >
              Technician
            </th>
            <th
              className={`hidden ${northStar ? lt.tableHeaderCell : "px-4 py-3"} lg:table-cell`}
            >
              Job
            </th>
            <th className={northStar ? lt.tableHeaderCell : "px-4 py-3"}>
              Receipt
            </th>
            <th className={northStar ? lt.tableHeaderCell : "px-4 py-3"}>
              Amount
            </th>
            <th className={northStar ? lt.tableHeaderCell : "px-4 py-3"}>
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
                  <td className={northStar ? "admin-table-cell" : "px-4 py-3"}>
                    <BulkSelectCheckbox
                      checked={isBulkSelected}
                      ariaLabel={`Select expense ${expense.expenseNumber}`}
                      onChange={() => onToggleSelection?.(expense.id)}
                      variant={northStar ? "northStar" : "default"}
                    />
                  </td>
                ) : null}
                <td className={northStar ? "admin-table-cell" : "px-4 py-3"}>
                  <p
                    className={
                      northStar ? lt.tablePrimaryText : "font-semibold text-slate-900"
                    }
                  >
                    {expense.expenseNumber}
                  </p>
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
                <td className={northStar ? "admin-table-cell" : "px-4 py-3"}>
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
                <td
                  className={`hidden ${northStar ? "admin-table-cell" : "px-4 py-3"} md:table-cell`}
                >
                  <ExpenseCategoryBadge category={expense.category} northStar={northStar} />
                </td>
                <td
                  className={`hidden ${northStar ? `admin-table-cell expense-north-star-meta-cell` : "px-4 py-3 text-slate-600"} lg:table-cell`}
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
                  className={`hidden ${northStar ? `admin-table-cell expense-north-star-meta-cell` : "px-4 py-3 text-slate-600"} lg:table-cell`}
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
                <td className={northStar ? "admin-table-cell" : "px-4 py-3"}>
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
                <td className={northStar ? "admin-table-cell" : "px-4 py-3"}>
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
                <td className={northStar ? "admin-table-cell" : "px-4 py-3"}>
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
