import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ReportKpiMetric } from "@/shared/types/reports-page";

type ReportKpiCardProps = {
  metric: ReportKpiMetric;
};

function TrendIcon({ trend }: { trend?: ReportKpiMetric["trend"] }) {
  if (trend === "up") {
    return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />;
  }

  if (trend === "down") {
    return <TrendingDown className="h-3.5 w-3.5 text-rose-600" aria-hidden="true" />;
  }

  if (trend === "flat") {
    return <Minus className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />;
  }

  return null;
}

export function ReportKpiCard({ metric }: ReportKpiCardProps) {
  return (
    <div className="admin-card admin-metric-card min-w-0">
      <p className="admin-metric-label">{metric.label}</p>
      <p className="admin-metric-value mt-1 truncate text-2xl sm:text-3xl">
        {metric.value}
      </p>
      <p className="admin-text-helper mt-1 inline-flex items-center gap-1.5">
        <TrendIcon trend={metric.trend} />
        <span>{metric.comparison}</span>
      </p>
    </div>
  );
}
