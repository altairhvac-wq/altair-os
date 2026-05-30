import { ImageIcon, Receipt } from "lucide-react";
import { formatExpenseAmount, formatExpenseDate } from "@/shared/types/expense";
import type { Expense } from "@/shared/types/expense";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";

type ExpensesTableProps = {
  expenses: Expense[];
  selectedId: string | null;
  onSelect: (expense: Expense) => void;
};

const rowStatusAccent: Partial<Record<Expense["status"], string>> = {
  submitted: "border-l-4 border-l-blue-400",
  approved: "border-l-4 border-l-emerald-400",
  rejected: "border-l-4 border-l-rose-400",
  reimbursed: "border-l-4 border-l-violet-400",
};

export function ExpensesTable({
  expenses,
  selectedId,
  onSelect,
}: ExpensesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100/90 bg-white text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Expense</th>
            <th className="px-4 py-3">Merchant</th>
            <th className="hidden px-4 py-3 md:table-cell">Category</th>
            <th className="hidden px-4 py-3 lg:table-cell">Technician</th>
            <th className="hidden px-4 py-3 lg:table-cell">Job</th>
            <th className="px-4 py-3">Receipt</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {expenses.map((expense) => {
            const isSelected = expense.id === selectedId;
            const hasReceipt = expense.receiptStatus === "attached";

            return (
              <tr
                key={expense.id}
                onClick={() => onSelect(expense)}
                className={`cursor-pointer transition-colors ${
                  rowStatusAccent[expense.status] ?? ""
                } ${isSelected ? "bg-cyan-50/70" : "hover:bg-slate-50"}`}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">
                    {expense.expenseNumber}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatExpenseDate(expense.purchaseDate)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="truncate font-medium text-slate-900">
                    {expense.merchant.trim() || "—"}
                  </p>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <ExpenseCategoryBadge category={expense.category} />
                </td>
                <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                  {expense.technician}
                </td>
                <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                  {expense.jobNumber ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {hasReceipt ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/15">
                      <ImageIcon className="h-3 w-3" />
                      Attached
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                      <Receipt className="h-3 w-3" />
                      Missing
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">
                  {formatExpenseAmount(expense.amount)}
                </td>
                <td className="px-4 py-3">
                  <ExpenseStatusBadge status={expense.status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
