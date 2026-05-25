import { TrendingUp } from "lucide-react";
import { formatCompactCurrency, type RevenueTrendPoint } from "@/shared/types/analytics";

type RevenueTrendChartProps = {
  data: RevenueTrendPoint[];
};

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  const maxValue = Math.max(
    ...data.flatMap((point) => [point.revenue, point.expenses]),
    1,
  );
  const chartHeight = 180;

  const revenuePoints = data
    .map((point, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (point.revenue / maxValue) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h3 className="text-base font-bold text-slate-900">
            Revenue trend
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Revenue vs expenses over the selected period
        </p>
      </div>

      <div className="p-5">
        <div className="relative" style={{ height: chartHeight }}>
          <div className="absolute inset-0 flex flex-col justify-between">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="border-t border-dashed border-slate-100" />
            ))}
          </div>

          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
          >
            {data.map((point, index) => {
              const barWidth = 100 / data.length / 2.5;
              const x = (index / data.length) * 100 + barWidth * 0.4;
              const expenseHeight = (point.expenses / maxValue) * 100;
              const revenueHeight = (point.revenue / maxValue) * 100;

              return (
                <g key={point.label}>
                  <rect
                    x={x}
                    y={100 - expenseHeight}
                    width={barWidth}
                    height={expenseHeight}
                    className="fill-rose-200/70"
                    rx="1"
                  />
                  <rect
                    x={x + barWidth + 0.8}
                    y={100 - revenueHeight}
                    width={barWidth}
                    height={revenueHeight}
                    className="fill-emerald-400/80"
                    rx="1"
                  />
                </g>
              );
            })}

            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="0.8"
              className="text-emerald-600"
              points={revenuePoints}
            />
          </svg>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4 text-xs">
            <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
              Revenue
            </span>
            <span className="inline-flex items-center gap-2 font-semibold text-slate-600">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-200" />
              Expenses
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.map((point) => (
              <span
                key={point.label}
                className="text-[10px] font-semibold uppercase tracking-wide text-slate-400"
              >
                {point.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {data.slice(-3).map((point) => (
            <div
              key={point.label}
              className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2"
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {point.label}
              </p>
              <p className="text-sm font-bold text-emerald-700">
                {formatCompactCurrency(point.revenue)}
              </p>
              <p className="text-xs text-slate-500">
                Exp {formatCompactCurrency(point.expenses)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
