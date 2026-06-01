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
      iconClass: "admin-metric-icon-emerald",
    },
    {
      label: "Revenue This Month",
      value: formatCurrency(summary.revenueThisMonth),
      description: "Current billing period",
      icon: TrendingUp,
      iconClass: "admin-metric-icon-teal",
    },
    {
      label: "Outstanding Invoices",
      value: formatCurrency(summary.outstandingInvoices),
      description: "Awaiting payment",
      icon: Receipt,
      iconClass: "admin-metric-icon-amber",
    },
    {
      label: "Net Profit Estimate",
      value: formatCurrency(summary.netProfitEstimate),
      description: `${formatPercent(summary.profitMarginPercent, 1)} margin`,
      icon: Wallet,
      iconClass: "admin-metric-icon-slate",
    },
    {
      label: "Jobs Completed",
      value: String(summary.jobsCompleted),
      description: "Closed in selected range",
      icon: CheckCircle2,
      iconClass: "admin-metric-icon-emerald",
    },
    {
      label: "Average Job Value",
      value: formatCurrency(summary.averageJobValue),
      description: "Per completed job",
      icon: Briefcase,
      iconClass: "admin-metric-icon-neutral",
    },
    {
      label: "Estimate Approval",
      value: formatPercent(summary.estimateApprovalRate),
      description: "Accepted vs sent",
      icon: FileText,
      iconClass: "admin-metric-icon-teal",
    },
    {
      label: "Technician Utilization",
      value: formatPercent(summary.technicianUtilization),
      description: "Billable field capacity",
      icon: Gauge,
      iconClass: "admin-metric-icon-slate",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="admin-card admin-card-interactive admin-metric-card"
        >
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <p className="admin-metric-label">{card.label}</p>
              <p className="admin-metric-value mt-1 truncate sm:text-2xl">
                {card.value}
              </p>
              <p className="admin-text-helper mt-0.5">{card.description}</p>
            </div>
            <div className={`admin-metric-icon ${card.iconClass}`}>
              <card.icon className="h-4 w-4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
