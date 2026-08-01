import {
  Minus,
  Percent,
  Receipt,
  Ticket,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { KpiSparkline } from "@/shared/components/charts/KpiSparkline";
import {
  altairReportCardClass,
  altairReportCardPadTier1Class,
  altairReportMetricLabelClass,
  altairReportMetricMetaClass,
  altairReportMetricValueClass,
  altairReportSparklineWellClass,
  reportIconChipClassName,
  type ReportIconTintCategory,
} from "@/shared/design-system/components";
import type { ReportKpiMetric } from "@/shared/types/reports-page";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type ReportKpiCardProps = {
  metric: ReportKpiMetric;
  variant?: ReportSurfaceVariant;
};

const KPI_VISUAL: Record<
  ReportKpiMetric["id"],
  { tint: ReportIconTintCategory; icon: LucideIcon }
> = {
  revenue: { tint: "revenue", icon: Wallet },
  "average-ticket": { tint: "avgTicket", icon: Ticket },
  "close-rate": { tint: "conversion", icon: Percent },
  outstanding: { tint: "outstanding", icon: Receipt },
};

function TrendIcon({ trend }: { trend?: ReportKpiMetric["trend"] }) {
  if (trend === "up") {
    return (
      <TrendingUp
        className="h-3.5 w-3.5 text-altair-success"
        aria-hidden="true"
      />
    );
  }

  if (trend === "down") {
    return (
      <TrendingDown
        className="h-3.5 w-3.5 text-altair-danger"
        aria-hidden="true"
      />
    );
  }

  if (trend === "flat") {
    return (
      <Minus className="h-3.5 w-3.5 text-altair-ink-muted" aria-hidden="true" />
    );
  }

  return null;
}

export function ReportKpiCard({
  metric,
  variant = "legacy",
}: ReportKpiCardProps) {
  const northStar = isNorthStarReportSurface(variant);

  if (northStar) {
    const visual = KPI_VISUAL[metric.id];
    const Icon = visual.icon;

    return (
      <div
        className={`min-w-0 ${altairReportCardClass} ${altairReportCardPadTier1Class}`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className={reportIconChipClassName(visual.tint)}
            aria-hidden="true"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <p className={altairReportMetricLabelClass}>{metric.label}</p>
        </div>
        <p className={`mt-2.5 ${altairReportMetricValueClass}`}>{metric.value}</p>
        <p
          className={`mt-1.5 inline-flex items-center gap-1.5 ${altairReportMetricMetaClass}`}
        >
          <TrendIcon trend={metric.trend} />
          <span>{metric.comparison}</span>
        </p>
        {metric.sparkline ? (
          <KpiSparkline
            values={metric.sparkline}
            className={altairReportSparklineWellClass}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="altair-surface-tile min-w-0 px-3 py-3 sm:px-4 sm:py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
        {metric.label}
      </p>
      <p className="mt-1.5 truncate text-2xl font-extrabold tracking-tight text-slate-900 sm:mt-2 sm:text-[1.75rem] sm:leading-none">
        {metric.value}
      </p>
      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-500">
        <TrendIcon trend={metric.trend} />
        <span>{metric.comparison}</span>
      </p>
      {metric.sparkline ? <KpiSparkline values={metric.sparkline} /> : null}
    </div>
  );
}
