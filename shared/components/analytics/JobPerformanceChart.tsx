import { BarChart3 } from "lucide-react";
import { formatCompactCurrency, type JobPerformance } from "@/shared/types/analytics";

type JobPerformanceChartProps = {
  performance: JobPerformance;
};

function HorizontalBars({
  title,
  items,
  valueKey,
}: {
  title: string;
  items: { label: string; count: number; revenue: number }[];
  valueKey: "count" | "revenue";
}) {
  const max = Math.max(...items.map((item) => item[valueKey]), 1);

  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {title}
      </h4>
      <ul className="mt-3 space-y-3">
        {items.map((item) => {
          const value = item[valueKey];
          const width = `${(value / max) * 100}%`;

          return (
            <li key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate font-semibold text-slate-700">
                  {item.label}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {valueKey === "revenue"
                    ? formatCompactCurrency(value)
                    : `${value} jobs`}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all"
                  style={{ width }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function JobPerformanceChart({ performance }: JobPerformanceChartProps) {
  const statusItems = performance.byStatus.map((item) => ({
    label: item.status,
    count: item.count,
    revenue: item.revenue,
  }));

  const typeItems = performance.byType.map((item) => ({
    label: item.type,
    count: item.count,
    revenue: item.revenue,
  }));

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-blue-600" />
          <h3 className="text-base font-bold text-slate-900">
            Job performance
          </h3>
        </div>
        <p className="text-xs text-slate-500">
          Volume and revenue by status and job type
        </p>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-2">
        <HorizontalBars
          title="By status"
          items={statusItems}
          valueKey="count"
        />
        <HorizontalBars title="By type" items={typeItems} valueKey="revenue" />
      </div>
    </section>
  );
}
