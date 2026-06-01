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
          iconClassName: "admin-metric-icon-amber",
        },
        {
          label: "Approved",
          value: formatCurrency(approvedTotal),
          description: "Approved this period",
          icon: CheckCircle2,
          iconClassName: "admin-metric-icon-emerald",
        },
        {
          label: "Reimbursable",
          value: formatCurrency(reimbursableTotal),
          description: "Pending reimbursement",
          icon: Wallet,
          iconClassName: "admin-metric-icon-teal",
        },
        {
          label: "Total Spent",
          value: formatCurrency(totalSpent),
          description: "Approved + reimbursed",
          icon: DollarSign,
          iconClassName: "admin-metric-icon-slate",
        },
      ]}
    />
  );
}
