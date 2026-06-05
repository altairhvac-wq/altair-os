import { formatCompactCurrency } from "@/shared/types/analytics";
import { formatCurrency } from "@/shared/types/customer";
import type { ReportTrendPoint } from "@/shared/types/reports-page";
import { ReportChartCard } from "./ReportChartCard";

type RevenueTrendChartCardProps = {
  data: ReportTrendPoint[];
};

function hasTrendData(data: ReportTrendPoint[]): boolean {
  return data.some((point) => point.value > 0);
}

export function RevenueTrendChartCard({ data }: RevenueTrendChartCardProps) {
  const hasData = hasTrendData(data);
  const maxValue = Math.max(...data.map((point) => point.value), 1);
  const chartHeight = 280;

  const linePoints = data
    .map((point, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (point.value / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <ReportChartCard
      title="Revenue Trend"
      subtitle="Revenue collected over the selected period."
      hasData={hasData}
      emptyMessage="Revenue will appear here once invoices are paid."
      chartHeightClassName="min-h-[320px] sm:min-h-[360px]"
    >
      <div className="flex h-full flex-col">
        <div className="relative flex-1" style={{ minHeight: chartHeight }}>
          <div className="absolute inset-0 flex flex-col justify-between">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="border-t border-dashed border-slate-100"
              />
            ))}
          </div>

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            aria-label="Revenue trend line chart"
          >
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              className="text-emerald-600"
              points={linePoints}
            />
            {data.map((point, index) => {
              const x = (index / Math.max(data.length - 1, 1)) * 100;
              const y = 100 - (point.value / maxValue) * 100;

              return (
                <circle
                  key={point.label}
                  cx={x}
                  cy={y}
                  r="1.4"
                  className="fill-emerald-600"
                />
              );
            })}
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Collected revenue
          </span>
          <div className="flex flex-wrap gap-2">
            {data.map((point, index) => {
              if (data.length > 10 && index % 2 !== 0 && index !== data.length - 1) {
                return null;
              }

              return (
                <span
                  key={point.label}
                  className="text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  {point.label}
                </span>
              );
            })}
          </div>
        </div>

        {data.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {data.slice(-3).map((point) => (
              <div
                key={point.label}
                className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {point.label}
                </p>
                <p className="text-sm font-bold text-emerald-700">
                  {point.value >= 1000
                    ? formatCompactCurrency(point.value)
                    : formatCurrency(point.value)}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </ReportChartCard>
  );
}
