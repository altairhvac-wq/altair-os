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
    <div className="admin-card admin-metric-card min-w-0 px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        {metric.label}
      </p>
      <p className="mt-2 truncate text-3xl font-extrabold tracking-tight text-slate-900 sm:mt-2.5 sm:text-[2rem] sm:leading-none">
        {metric.value}
      </p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
        <TrendIcon trend={metric.trend} />
        <span>{metric.comparison}</span>
      </p>
    </div>
  );
}
