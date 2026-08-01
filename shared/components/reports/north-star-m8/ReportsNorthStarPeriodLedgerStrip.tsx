import {
  AlertCircle,
  CircleDollarSign,
  Landmark,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { KpiSparkline } from "@/shared/components/charts/KpiSparkline";
import {
  altairReportCardClass,
  altairReportCardPadTier1Class,
  altairReportMetricLabelClass,
  altairReportMetricValueClass,
  altairReportSparklineWellClass,
  reportIconChipClassName,
  type ReportIconTintCategory,
  SectionHeader,
} from "@/shared/design-system/components";
import { altairCanvasInkMutedClass } from "@/shared/design-system/foundation";
import { formatCurrency } from "@/shared/types/customer";
import type {
  AccountantSummaryData,
  ReportLedgerSparklineId,
} from "@/shared/types/reports-page";
import { REPORTS_PAGE_DATE_RANGE_OPTIONS } from "@/shared/types/reports-page";

type ReportsNorthStarPeriodLedgerStripProps = {
  summary: AccountantSummaryData;
};

type LedgerMetric = {
  id: ReportLedgerSparklineId;
  label: string;
  value: string;
  tint: ReportIconTintCategory;
  icon: LucideIcon;
};

function formatPeriodLabel(dateRange: AccountantSummaryData["dateRange"]): string {
  return (
    REPORTS_PAGE_DATE_RANGE_OPTIONS.find((option) => option.value === dateRange)
      ?.label ?? "Selected period"
  );
}

export function ReportsNorthStarPeriodLedgerStrip({
  summary,
}: ReportsNorthStarPeriodLedgerStripProps) {
  const periodLabel = formatPeriodLabel(summary.dateRange);
  const taxSummaryHref = `/reports/tax-summary?range=${summary.dateRange}`;

  const metrics: LedgerMetric[] = [
    {
      id: "collected",
      label: "Collected",
      value: formatCurrency(summary.totalPaymentsCollected),
      tint: "revenue",
      icon: CircleDollarSign,
    },
    {
      id: "outstanding",
      label: "Outstanding",
      value: formatCurrency(summary.outstandingBalance),
      tint: "outstanding",
      icon: Receipt,
    },
    {
      id: "overdue",
      label: "Overdue",
      value: formatCurrency(summary.overdueBalance),
      tint: "outstanding",
      icon: AlertCircle,
    },
    {
      id: "net-income",
      label: "Net income est.",
      value: formatCurrency(summary.netIncomeEstimate),
      tint: "profit",
      icon: Landmark,
    },
  ];

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="min-w-0">
        <SectionHeader
          title="Period ledger"
          action={{ label: "Open tax summary", href: taxSummaryHref }}
        />
        <p className={`mt-1 pl-[14px] text-xs ${altairCanvasInkMutedClass}`}>
          {periodLabel} operating snapshot — bookkeeping totals from records
          entered in Altair OS.
        </p>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const sparkline = summary.sparklines?.[metric.id];

          return (
            <div
              key={metric.id}
              className={`min-w-0 ${altairReportCardClass} ${altairReportCardPadTier1Class}`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={reportIconChipClassName(metric.tint)}
                  aria-hidden="true"
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className={altairReportMetricLabelClass}>{metric.label}</p>
              </div>
              <p className={`mt-2.5 ${altairReportMetricValueClass}`}>
                {metric.value}
              </p>
              {sparkline ? (
                <KpiSparkline
                  values={sparkline}
                  className={altairReportSparklineWellClass}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
