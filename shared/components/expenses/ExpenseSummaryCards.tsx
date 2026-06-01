import { CheckCircle2, Clock, DollarSign, Wallet } from "lucide-react";
import { PageSummaryStrip } from "@/shared/components/layout/PageSummaryStrip";
import { formatCurrency } from "@/shared/types/customer";
import { getExpenseSummary, type Expense } from "@/shared/types/expense";

type ExpenseSummaryCardsProps = {
  expenses: Expense[];
};

export function ExpenseSummaryCards({ expenses }: ExpenseSummaryCardsProps) {
  const { submittedTotal, approvedTotal, reimbursableTotal, totalSpent } =
    getExpenseSummary(expenses);

  return (
    <PageSummaryStrip
      cards={[
        {
          label: "Submitted",
          value: formatCurrency(submittedTotal),
          description: "Awaiting approval",
          icon: Clock,
          iconClassName: "text-blue-600 bg-blue-50",
        },
        {
          label: "Approved",
          value: formatCurrency(approvedTotal),
          description: "Approved this period",
          icon: CheckCircle2,
          iconClassName: "text-emerald-600 bg-emerald-50",
        },
        {
          label: "Reimbursable",
          value: formatCurrency(reimbursableTotal),
          description: "Pending reimbursement",
          icon: Wallet,
          iconClassName: "text-amber-600 bg-amber-50",
        },
        {
          label: "Total Spent",
          value: formatCurrency(totalSpent),
          description: "Approved + reimbursed",
          icon: DollarSign,
          iconClassName: "text-violet-600 bg-violet-50",
        },
      ]}
    />
  );
}
