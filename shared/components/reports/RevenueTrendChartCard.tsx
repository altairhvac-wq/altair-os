import type { ReportTrendPoint } from "@/shared/types/reports-page";
import { ReportChartCard } from "./ReportChartCard";

type RevenueTrendChartCardProps = {
  data: ReportTrendPoint[];
};

const CHART_HEIGHT = 240;

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
): { x: number; y: number }[] {
  return data.map((point, index) => ({
    x: (index / Math.max(data.length - 1, 1)) * 100,
    y: 100 - (point.value / maxValue) * 100,
  }));
}

export function RevenueTrendChartCard({ data }: RevenueTrendChartCardProps) {
  const hasData = hasTrendData(data);
  const maxValue = getTrendScaleMax(data);
  const coordinates = getPointCoordinates(data, maxValue);

  const linePoints = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `0,100 ${linePoints} 100,100`;

  return (
    <ReportChartCard
      title="Revenue Trend"
      subtitle="Revenue collected during the selected period."
      hasData={hasData}
      emptyMessage="Revenue will appear here once invoices are paid."
      compact
    >
      <div className="flex flex-col">
        <div className="relative" style={{ height: CHART_HEIGHT }}>
          <div className="absolute inset-0 flex flex-col justify-between">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="border-t border-slate-100/80"
              />
            ))}
          </div>

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-label="Revenue trend line chart"
          >
            <polygon
              points={areaPoints}
              className="fill-emerald-500/8"
            />
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="text-emerald-600/90"
              points={linePoints}
            />
            {coordinates.map((point, index) => (
              <circle
                key={data[index]?.label ?? index}
                cx={point.x}
                cy={point.y}
                r="0.9"
                className="fill-emerald-600/80"
              />
            ))}
          </svg>
        </div>

        {data.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {data.map((point, index) => {
              if (data.length > 8 && index % 2 !== 0 && index !== data.length - 1) {
                return null;
              }

              return (
                <span
                  key={point.label}
                  className="text-[10px] font-medium text-slate-400"
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
