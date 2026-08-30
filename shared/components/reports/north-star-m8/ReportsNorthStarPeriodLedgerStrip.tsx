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
  /** Trend-line tone. See LEDGER_SPARK_TONE. */
  sparkTone: keyof typeof LEDGER_SPARK_TONE;
};

/**
 * The period ledger is a SEVERITY strip, not a categorical one.
 *
 * Every sparkline on this page previously inherited the same brass, so four
 * cards drew four identical gold lines — and "Overdue" wore the brand accent,
 * which is the one thing a money-at-risk figure should never do. Reserving
 * brass for a single card also puts it back at accent weight instead of being
 * the page's default line colour.
 *
 * Categorical tints stay where they belong: the icon chips, and the Key
 * metrics strip below, where the values genuinely are different categories
 * rather than points on a risk scale.
 */
const LEDGER_SPARK_TONE = {
  /** Money in — genuinely positive. */
  positive: "text-altair-success",
  /** Owed but not yet late — informational, not a problem. */
  neutral: "text-altair-ink-on-graphite-muted",
  /** Money at risk. */
  danger: "text-altair-danger",
  /** The period's summary figure — the one brand moment in this strip. */
  brand: "text-[var(--chart-1)]",
} as const;

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
      sparkTone: "positive",
      label: "Collected",
      value: formatCurrency(summary.totalPaymentsCollected),
      tint: "revenue",
      icon: CircleDollarSign,
    },
    {
      id: "outstanding",
      sparkTone: "neutral",
      label: "Outstanding",
      value: formatCurrency(summary.outstandingBalance),
      tint: "outstanding",
      icon: Receipt,
    },
    {
      id: "overdue",
      sparkTone: "danger",
      label: "Overdue",
      value: formatCurrency(summary.overdueBalance),
      tint: "outstanding",
      icon: AlertCircle,
    },
    {
      id: "net-income",
      sparkTone: "brand",
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
                  toneClassName={LEDGER_SPARK_TONE[metric.sparkTone]}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
