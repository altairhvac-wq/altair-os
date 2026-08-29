import {
  buildDonutArcs,
  DONUT_RADIUS,
  DONUT_SIZE,
  DONUT_STROKE,
} from "@/shared/lib/reports/donut-arc-geometry";
import { formatCurrency } from "@/shared/types/customer";
import type { ReportCashHealth } from "@/shared/types/reports-page";
import { nsReportChart as ns } from "./north-star-chart-styles";
import { ReportChartCard } from "./ReportChartCard";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type CashHealthChartCardProps = {
  data: ReportCashHealth;
  variant?: ReportSurfaceVariant;
};

function hasCashData(data: ReportCashHealth): boolean {
  return data.paid > 0 || data.outstanding > 0 || data.overdue > 0;
}

const LEGACY_ITEMS = [
  {
    key: "paid" as const,
    label: "Paid",
    barClass: "bg-emerald-500",
    textClass: "text-emerald-700",
  },
  {
    key: "outstanding" as const,
    label: "Outstanding",
    barClass: "bg-amber-400",
    textClass: "text-amber-700",
  },
  {
    key: "overdue" as const,
    label: "Overdue",
    barClass: "bg-rose-500",
    textClass: "text-rose-700",
  },
];


type CashHealthSegmentKey = "paid" | "outstanding" | "overdue";

type DonutSegment = {
  key: CashHealthSegmentKey;
  label: string;
  value: number;
  stroke: string;
};

function CashHealthDonut({
  items,
  total,
}: {
  items: DonutSegment[];
  total: number;
}) {
  const arcs = buildDonutArcs(
    items.map((item) => item.value),
    total,
  );

  return (
    <div className="relative mx-auto h-[148px] w-[148px] shrink-0">
      <svg
        width={DONUT_SIZE}
        height={DONUT_SIZE}
        viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={DONUT_SIZE / 2}
          cy={DONUT_SIZE / 2}
          r={DONUT_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={DONUT_STROKE}
        />
        {items.map((item, index) => {
          const arc = arcs[index];
          if (!arc) {
            return null;
          }

          return (
            <circle
              key={item.key}
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={DONUT_RADIUS}
              fill="none"
              stroke={item.stroke}
              strokeWidth={DONUT_STROKE}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={arc.offset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-lg font-extrabold tabular-nums tracking-tight text-altair-paper">
          {formatCurrency(total)}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-altair-ink-on-graphite-muted">
          Total
        </span>
      </div>
    </div>
  );
}

export function CashHealthChartCard({
  data,
  variant = "legacy",
}: CashHealthChartCardProps) {
  const northStar = isNorthStarReportSurface(variant);
  const hasData = hasCashData(data);

  if (northStar) {
    const items = [
      {
        key: "paid" as const,
        label: "Paid",
        value: data.paid,
        stroke: ns.cashHealth.paid.stroke,
        swatchClass: ns.cashHealth.paid.swatch,
        textClass: ns.cashHealth.paid.text,
      },
      {
        key: "outstanding" as const,
        label: "Outstanding",
        value: data.outstanding,
        stroke: ns.cashHealth.outstanding.stroke,
        swatchClass: ns.cashHealth.outstanding.swatch,
        textClass: ns.cashHealth.outstanding.text,
      },
      {
        key: "overdue" as const,
        label: "Overdue",
        value: data.overdue,
        stroke: ns.cashHealth.overdue.stroke,
        swatchClass: ns.cashHealth.overdue.swatch,
        textClass: ns.cashHealth.overdue.text,
      },
    ];
    const total = items.reduce((sum, item) => sum + item.value, 0);

    return (
      <ReportChartCard
        title="Cash Health"
        subtitle="Invoice collection status for the period."
        hasData={hasData}
        emptyMessage="Invoice health will appear once invoices are created."
        compact
        variant={variant}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
            {total > 0 ? <CashHealthDonut items={items} total={total} /> : null}

            <div className="w-full min-w-0 flex-1 space-y-2.5">
              {items.map((item) => {
                const percent =
                  total > 0 ? Math.round((item.value / total) * 100) : 0;

                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-altair-paper">
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-sm ${item.swatchClass}`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-altair-ink-on-graphite-muted">
                      <span className={`font-semibold ${item.textClass}`}>
                        {formatCurrency(item.value)}
                      </span>
                      <span className="ml-1">({percent}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-altair-border pt-3">
            <span className="text-xs font-semibold text-altair-ink-on-graphite-muted">
              Collection Rate
            </span>
            <span className="text-base font-extrabold tabular-nums tracking-tight text-altair-paper">
              {data.collectionRateLabel}
            </span>
          </div>
        </div>
      </ReportChartCard>
    );
  }

  const legacyItems = LEGACY_ITEMS.map((item) => ({
    ...item,
    value: data[item.key],
  }));
  const total = legacyItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <ReportChartCard
      title="Cash Health"
      subtitle="Invoice collection status for the period."
      hasData={hasData}
      emptyMessage="Invoice health will appear once invoices are created."
      compact
      variant={variant}
    >
      <div className="flex flex-col gap-3">
        {total > 0 ? (
          <div
            className="flex h-1.5 overflow-hidden rounded-full bg-slate-100"
            aria-hidden="true"
          >
            {legacyItems.map((item) => {
              const widthPercent = (item.value / total) * 100;
              if (widthPercent <= 0) {
                return null;
              }

              return (
                <div
                  key={item.key}
                  className={`${item.barClass} transition-all`}
                  style={{ width: `${widthPercent}%` }}
                />
              );
            })}
          </div>
        ) : null}

        <div className="divide-y divide-slate-100">
          {legacyItems.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="text-xs font-medium text-slate-600">
                {item.label}
              </span>
              <span className={`text-sm font-bold tabular-nums ${item.textClass}`}>
                {formatCurrency(item.value)}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-xs font-medium text-slate-600">
              Collection Rate
            </span>
            <span className="text-sm font-bold tabular-nums text-slate-900">
              {data.collectionRateLabel}
            </span>
          </div>
        </div>
      </div>
    </ReportChartCard>
  );
}
