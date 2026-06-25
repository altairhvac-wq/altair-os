import { formatCurrency } from "@/shared/types/customer";
import type { ReportTrendPoint } from "@/shared/types/reports-page";
import { nsReportChart as ns } from "./north-star-chart-styles";
import { ReportChartCard } from "./ReportChartCard";
import {
  isNorthStarReportSurface,
  type ReportSurfaceVariant,
} from "./report-surface-variant";

type RevenueTrendChartCardProps = {
  data: ReportTrendPoint[];
  variant?: ReportSurfaceVariant;
};

const CHART_HEIGHT = 215;
const CHART_HEIGHT_LEGACY = 215;

function hasTrendData(data: ReportTrendPoint[]): boolean {
  return data.some((point) => point.value > 0);
}

function getTrendScaleMax(data: ReportTrendPoint[]): number {
  const values = data.map((point) => point.value);
  const max = Math.max(...values, 0);

  if (max === 0) {
    return 1;
  }

  const nonZero = values.filter((value) => value > 0);

  if (nonZero.length <= 2) {
    const sorted = [...nonZero].sort((a, b) => b - a);
    const top = sorted[0] ?? 0;
    const runnerUp = sorted[1] ?? 0;

    if (runnerUp === 0 || runnerUp < top * 0.3) {
      return top * 1.4;
    }
  }

  return max;
}

function getPointCoordinates(
  data: ReportTrendPoint[],
  maxValue: number,
  options?: { padX?: number; padY?: number },
): { x: number; y: number }[] {
  const padX = options?.padX ?? 0;
  const padY = options?.padY ?? 0;
  const plotWidth = 100 - padX * 2;
  const plotHeight = 100 - padY * 2;

  return data.map((point, index) => ({
    x: padX + (index / Math.max(data.length - 1, 1)) * plotWidth,
    y: padY + plotHeight - (point.value / maxValue) * plotHeight,
  }));
}

function findPeakIndex(data: ReportTrendPoint[]): number {
  let peakIndex = 0;
  let peakValue = -Infinity;

  data.forEach((point, index) => {
    if (point.value > peakValue) {
      peakValue = point.value;
      peakIndex = index;
    }
  });

  return peakIndex;
}

export function RevenueTrendChartCard({
  data,
  variant = "legacy",
}: RevenueTrendChartCardProps) {
  const hasData = hasTrendData(data);
  const maxValue = getTrendScaleMax(data);
  const northStar = isNorthStarReportSurface(variant);
  const coordinates = getPointCoordinates(
    data,
    maxValue,
    northStar ? { padX: 1.5, padY: 4 } : undefined,
  );
  const peakIndex = findPeakIndex(data);
  const lastIndex = data.length - 1;

  const linePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = northStar
    ? `${coordinates[0]?.x ?? 0},100 ${linePoints} ${coordinates[coordinates.length - 1]?.x ?? 100},100`
    : `0,100 ${linePoints} 100,100`;

  const chartHeight = northStar ? CHART_HEIGHT : CHART_HEIGHT_LEGACY;

  return (
    <ReportChartCard
      title="Revenue Trend"
      subtitle="Revenue collected during the selected period."
      hasData={hasData}
      emptyMessage="Revenue will appear here once invoices are paid."
      compact
      variant={variant}
    >
      <div className="flex flex-col">
        <div
          className={northStar ? ns.chartFrame : "relative"}
          style={{ height: chartHeight }}
        >
          {northStar ? (
            <div className="absolute left-0 top-2 z-10 flex h-[calc(100%-1.5rem)] flex-col justify-between py-1 pl-2 pr-1">
              <span className={ns.axisLabel}>{formatCurrency(maxValue)}</span>
              <span className={ns.axisLabel}>{formatCurrency(0)}</span>
            </div>
          ) : null}

          <div className={northStar ? `${ns.chartPlot} pl-7` : "absolute inset-0"}>
            <div className="absolute inset-0 flex flex-col justify-between">
              {Array.from({ length: northStar ? 5 : 4 }).map((_, index) => (
                <div
                  key={index}
                  className={
                    northStar
                      ? ns.gridLine
                      : "border-t border-slate-100/80"
                  }
                />
              ))}
            </div>

            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              aria-label="Revenue trend line chart"
            >
              {northStar ? (
                <defs>
                  <linearGradient id="ns-revenue-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ns.revenue.areaTop} />
                    <stop offset="100%" stopColor={ns.revenue.areaBottom} />
                  </linearGradient>
                </defs>
              ) : null}

              <polygon
                points={areaPoints}
                fill={northStar ? "url(#ns-revenue-area)" : undefined}
                className={northStar ? undefined : "fill-emerald-500/8"}
              />
              <polyline
                fill="none"
                stroke={northStar ? ns.revenue.line : "currentColor"}
                strokeWidth={northStar ? ns.revenue.lineWidth : 0.6}
                strokeLinejoin="round"
                strokeLinecap="round"
                className={northStar ? undefined : "text-emerald-600/90"}
                points={linePoints}
              />
              {coordinates.map((point, index) => {
                const isPeak = index === peakIndex;
                const isLast = index === lastIndex;
                const showPoint = northStar ? isPeak || isLast : true;

                if (!showPoint) {
                  return null;
                }

                return (
                  <circle
                    key={data[index]?.label ?? index}
                    cx={point.x}
                    cy={point.y}
                    r={
                      northStar
                        ? isPeak
                          ? ns.revenue.pointPeakRadius
                          : ns.revenue.pointRadius
                        : 0.9
                    }
                    fill={
                      northStar
                        ? isPeak
                          ? ns.revenue.pointPeak
                          : ns.revenue.point
                        : undefined
                    }
                    className={northStar ? undefined : "fill-emerald-600/80"}
                  />
                );
              })}
            </svg>
          </div>
        </div>

        {data.length > 0 ? (
          <div
            className={
              northStar
                ? "mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-[rgba(138,99,36,0.08)] pt-2.5"
                : "mt-2 flex flex-wrap gap-x-3 gap-y-1"
            }
          >
            {data.map((point, index) => {
              if (data.length > 8 && index % 2 !== 0 && index !== data.length - 1) {
                return null;
              }

              return (
                <span
                  key={point.label}
                  className={
                    northStar
                      ? "text-[10px] font-medium tracking-wide text-[#64748B]"
                      : "text-[10px] font-medium text-slate-400"
                  }
                >
                  {point.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    </ReportChartCard>
  );
}
