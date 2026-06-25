import { CheckCircle2, Clock, DollarSign, Wallet } from "lucide-react";
import { PageSummaryStrip } from "@/shared/components/layout/PageSummaryStrip";
import { formatCurrency } from "@/shared/types/customer";
import { getExpenseSummary, type Expense } from "@/shared/types/expense";

type ExpenseSummaryCardsProps = {
  expenses: Expense[];
  northStar?: boolean;
};

type SummaryCard = {
  label: string;
  value: string;
  description: string;
  icon: typeof Clock;
  iconClassName: string;
  northStarIconClassName?: string;
};

function NorthStarExpenseMetricCards({ cards }: { cards: SummaryCard[] }) {
  return (
    <div
      className="grid shrink-0 grid-cols-2 gap-2.5 px-3 sm:gap-3 sm:px-3.5 lg:grid-cols-4 lg:px-5"
      aria-label="Summary metrics"
    >
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-[1rem] border border-[rgba(138,99,36,0.12)] bg-[#FBF7EF] px-3 py-2.5 shadow-[0_2px_8px_rgba(3,7,12,0.08)] sm:px-3.5 sm:py-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4F4638]">
                {card.label}
              </p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-[#17130E] sm:text-lg">
                {card.value}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[#4F4638]">
                {card.description}
              </p>
            </div>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EFE4CB] ring-1 ring-[rgba(138,99,36,0.12)] sm:h-9 sm:w-9 ${card.northStarIconClassName ?? ""}`}
            >
              <card.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ExpenseSummaryCards({
  expenses,
  northStar = false,
}: ExpenseSummaryCardsProps) {
  const { submittedTotal, approvedTotal, reimbursableTotal, totalSpent } =
    getExpenseSummary(expenses);

  const cards: SummaryCard[] = [
    {
      label: "Submitted",
      value: formatCurrency(submittedTotal),
      description: "Awaiting approval",
      icon: Clock,
      iconClassName: "admin-metric-icon-amber",
      northStarIconClassName: "text-[#9A7028]",
    },
    {
      label: "Approved",
      value: formatCurrency(approvedTotal),
      description: "Approved this period",
      icon: CheckCircle2,
      iconClassName: "admin-metric-icon-emerald",
      northStarIconClassName: "text-[#047857]",
    },
    {
      label: "Reimbursable",
      value: formatCurrency(reimbursableTotal),
      description: "Pending reimbursement",
      icon: Wallet,
      iconClassName: "admin-metric-icon-teal",
      northStarIconClassName: "text-[#0F766E]",
    },
    {
      label: "Total Spent",
      value: formatCurrency(totalSpent),
      description: "Approved + reimbursed",
      icon: DollarSign,
      iconClassName: "admin-metric-icon-slate",
      northStarIconClassName: "text-[#8A6324]",
    },
  ];

  if (northStar) {
    return <NorthStarExpenseMetricCards cards={cards} />;
  }

  return <PageSummaryStrip cards={cards} />;
}
