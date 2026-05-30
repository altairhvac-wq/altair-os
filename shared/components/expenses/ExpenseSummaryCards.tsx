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
    <div className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="admin-card p-2 sm:p-3"
        >
          <div className="flex items-start justify-between gap-2 sm:gap-2.5">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-slate-500 sm:text-sm">
                {card.label}
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-slate-900 sm:mt-1 sm:text-2xl">
                {card.value}
              </p>
              <p className="admin-text-helper mt-0.5">{card.description}</p>
            </div>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.iconClass}`}
            >
              <card.icon className="h-4 w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
