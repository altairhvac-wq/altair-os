import { formatExpenseAmount, formatExpenseDate } from "@/shared/types/expense";
import type { Expense } from "@/shared/types/expense";
import { ExpenseCategoryBadge } from "./ExpenseCategoryBadge";
import { ExpenseStatusBadge } from "./ExpenseStatusBadge";

type ExpensesTableProps = {
  expenses: Expense[];
  selectedId: string | null;
  onSelect: (expense: Expense) => void;
};

export function ExpensesTable({
  expenses,
  selectedId,
  onSelect,
}: ExpensesTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Expense</th>
            <th className="px-4 py-3">Merchant</th>
            <th className="hidden px-4 py-3 md:table-cell">Category</th>
            <th className="hidden px-4 py-3 lg:table-cell">Technician</th>
            <th className="hidden px-4 py-3 lg:table-cell">Job</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {expenses.map((expense) => {
            const isSelected = expense.id === selectedId;

            return (
              <tr
                key={expense.id}
                onClick={() => onSelect(expense)}
                className={`cursor-pointer transition-colors ${
                  isSelected ? "bg-cyan-50/70" : "hover:bg-slate-50"
                }`}
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
                    {expense.merchant}
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
