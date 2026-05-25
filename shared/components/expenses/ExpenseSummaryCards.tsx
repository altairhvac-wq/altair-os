import { CheckCircle2, Clock, DollarSign, Wallet } from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import { getExpenseSummary, type Expense } from "@/shared/types/expense";

type ExpenseSummaryCardsProps = {
  expenses: Expense[];
};

export function ExpenseSummaryCards({ expenses }: ExpenseSummaryCardsProps) {
  const { submittedTotal, approvedTotal, reimbursableTotal, totalSpent } =
    getExpenseSummary(expenses);

  const cards = [
    {
      label: "Submitted",
      value: formatCurrency(submittedTotal),
      description: "Awaiting approval",
      icon: Clock,
      iconClass: "text-blue-600 bg-blue-50",
    },
    {
      label: "Approved",
      value: formatCurrency(approvedTotal),
      description: "Approved this period",
      icon: CheckCircle2,
      iconClass: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Reimbursable",
      value: formatCurrency(reimbursableTotal),
      description: "Pending reimbursement",
      icon: Wallet,
      iconClass: "text-amber-600 bg-amber-50",
    },
    {
      label: "Total Spent",
      value: formatCurrency(totalSpent),
      description: "Approved + reimbursed",
      icon: DollarSign,
      iconClass: "text-violet-600 bg-violet-50",
    },
  ];

  return (
    <div className="grid shrink-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-500">{card.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-slate-500">{card.description}</p>
            </div>
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconClass}`}
            >
              <card.icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
