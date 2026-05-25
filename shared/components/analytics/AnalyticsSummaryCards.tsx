import {
  Briefcase,
  CheckCircle2,
  DollarSign,
  FileText,
  Gauge,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/shared/types/customer";
import { formatPercent, type AnalyticsSummary } from "@/shared/types/analytics";

type AnalyticsSummaryCardsProps = {
  summary: AnalyticsSummary;
};

export function AnalyticsSummaryCards({ summary }: AnalyticsSummaryCardsProps) {
  const cards = [
    {
      label: "Total Revenue",
      value: formatCurrency(summary.totalRevenue),
      description: `${formatPercent(summary.revenueChangePercent, 1)} vs prior period`,
      icon: DollarSign,
      iconClass: "text-emerald-600 bg-emerald-50",
      accent: "border-emerald-100",
    },
    {
      label: "Revenue This Month",
      value: formatCurrency(summary.revenueThisMonth),
      description: "Current billing period",
      icon: TrendingUp,
      iconClass: "text-cyan-600 bg-cyan-50",
      accent: "border-cyan-100",
    },
    {
      label: "Outstanding Invoices",
      value: formatCurrency(summary.outstandingInvoices),
      description: "Awaiting payment",
      icon: Receipt,
      iconClass: "text-amber-600 bg-amber-50",
      accent: "border-amber-100",
    },
    {
      label: "Net Profit Estimate",
      value: formatCurrency(summary.netProfitEstimate),
      description: `${formatPercent(summary.profitMarginPercent, 1)} margin`,
      icon: Wallet,
      iconClass: "text-violet-600 bg-violet-50",
      accent: "border-violet-100",
    },
    {
      label: "Jobs Completed",
      value: String(summary.jobsCompleted),
      description: "Closed in selected range",
      icon: CheckCircle2,
      iconClass: "text-blue-600 bg-blue-50",
      accent: "border-blue-100",
    },
    {
      label: "Average Job Value",
      value: formatCurrency(summary.averageJobValue),
      description: "Per completed job",
      icon: Briefcase,
      iconClass: "text-indigo-600 bg-indigo-50",
      accent: "border-indigo-100",
    },
    {
      label: "Estimate Approval",
      value: formatPercent(summary.estimateApprovalRate),
      description: "Accepted vs sent",
      icon: FileText,
      iconClass: "text-teal-600 bg-teal-50",
      accent: "border-teal-100",
    },
    {
      label: "Technician Utilization",
      value: formatPercent(summary.technicianUtilization),
      description: "Billable field capacity",
      icon: Gauge,
      iconClass: "text-orange-600 bg-orange-50",
      accent: "border-orange-100",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border bg-white p-4 shadow-sm ${card.accent}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-500">{card.label}</p>
              <p className="mt-2 truncate text-2xl font-black tabular-nums text-slate-900 sm:text-3xl">
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
