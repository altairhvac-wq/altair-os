import {
  altairReportCardClass,
  altairReportCardPadTier2Class,
} from "@/shared/design-system/components";
import { formatCurrency } from "@/shared/types/customer";
import type { ReportInvoiceAgingBucket } from "@/shared/types/reports-page";
import { nsReportChart as ns } from "./north-star-chart-styles";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type ReceivablesAgingChartCardProps = {
  buckets: ReportInvoiceAgingBucket[];
  variant?: ReportSurfaceVariant;
};

const DONUT_SIZE = 148;
const DONUT_STROKE = 18;
const DONUT_RADIUS = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;

type AgingSegment = {
  id: string;
  label: string;
  value: number;
  stroke: string;
  swatchClass: string;
  textClass: string;
};

function buildSegments(buckets: ReportInvoiceAgingBucket[]): AgingSegment[] {
  return buckets.map((bucket, index) => {
    const palette = ns.agingPalette[index % ns.agingPalette.length]!;

    return {
      id: bucket.label,
      label: bucket.label,
      value: bucket.amount,
      stroke: palette.stroke,
      swatchClass: palette.swatch,
      textClass: palette.text,
    };
  });
}

function AgingDonut({
  items,
  total,
}: {
  items: AgingSegment[];
  total: number;
}) {
  let cumulative = 0;

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
        {items.map((item) => {
          if (item.value <= 0 || total <= 0) {
            return null;
          }

          const fraction = item.value / total;
          const dash = fraction * DONUT_CIRCUMFERENCE;
          const gap = DONUT_CIRCUMFERENCE - dash;
          const offset = -cumulative * DONUT_CIRCUMFERENCE;
          cumulative += fraction;

          return (
            <circle
              key={item.id}
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              r={DONUT_RADIUS}
              fill="none"
              stroke={item.stroke}
              strokeWidth={DONUT_STROKE}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
            />
          );
        })}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-lg font-extrabold tabular-nums tracking-tight text-altair-paper">
          {formatCurrency(total)}
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-altair-ink-muted">
          Total AR
        </span>
      </div>
    </div>
  );
}

function LegendList({
  segments,
  total,
  northStar,
}: {
  segments: AgingSegment[];
  total: number;
  northStar: boolean;
}) {
  return (
    <ul
      className={
        northStar
          ? "w-full min-w-0 flex-1 space-y-2.5"
          : "divide-y divide-slate-100"
      }
    >
      {segments.map((item) => {
        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;

        if (northStar) {
          return (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3"
            >
              <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-altair-paper">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-sm ${item.swatchClass}`}
                  aria-hidden="true"
                />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-altair-ink-muted">
                <span className={`font-semibold ${item.textClass}`}>
                  {formatCurrency(item.value)}
                </span>
                <span className="ml-1">({percent}%)</span>
              </span>
            </li>
          );
        }

        return (
          <li
            key={item.id}
            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <span className="inline-flex min-w-0 items-center gap-2 text-xs font-medium text-slate-600">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-sm ${item.swatchClass}`}
                aria-hidden="true"
              />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">
              {formatCurrency(item.value)}
              <span className="ml-1 text-xs font-medium text-slate-500">
                ({percent}%)
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export function ReceivablesAgingChartCard({
  buckets,
  variant = "legacy",
}: ReceivablesAgingChartCardProps) {
  const northStar = isNorthStarReportSurface(variant);
  const segments = buildSegments(buckets);
  const total = segments.reduce((sum, item) => sum + item.value, 0);
  const hasData = segments.some((item) => item.value > 0);

  if (northStar) {
    return (
      <div className={`${altairReportCardClass} ${altairReportCardPadTier2Class}`}>
        {!hasData ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-altair-border bg-white/[0.03] px-4 py-6 text-center">
            <p className="max-w-sm text-xs text-altair-ink-muted sm:text-sm">
              Receivables aging appears once open invoices have a balance due.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-5">
            {total > 0 ? <AgingDonut items={segments} total={total} /> : null}
            <LegendList segments={segments} total={total} northStar />
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="altair-surface-card overflow-hidden">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <h3 className="admin-heading-section text-[13px] sm:text-sm">
          Receivables Aging
        </h3>
        <p className="admin-text-helper mt-0.5 text-[11px] sm:text-xs">
          Open invoice balances by days past due.
        </p>
      </div>
      <div className="p-3 sm:p-4">
        {!hasData ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
            <p className="max-w-sm text-xs text-slate-500 sm:text-sm">
              Receivables aging appears once open invoices have a balance due.
            </p>
          </div>
        ) : (
          <LegendList segments={segments} total={total} northStar={false} />
        )}
      </div>
    </section>
  );
}
