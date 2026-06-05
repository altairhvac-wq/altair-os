import { formatCurrency } from "@/shared/types/customer";
import type { ReportCashHealth } from "@/shared/types/reports-page";
import { ReportChartCard } from "./ReportChartCard";

type CashHealthChartCardProps = {
  data: ReportCashHealth;
};

function hasCashData(data: ReportCashHealth): boolean {
  return data.paid > 0 || data.outstanding > 0 || data.overdue > 0;
}

export function CashHealthChartCard({ data }: CashHealthChartCardProps) {
  const items = [
    { key: "paid", label: "Paid", value: data.paid, barClass: "bg-emerald-500" },
    {
      key: "outstanding",
      label: "Outstanding",
      value: data.outstanding,
      barClass: "bg-amber-400",
    },
    { key: "overdue", label: "Overdue", value: data.overdue, barClass: "bg-rose-500" },
  ];

  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const hasData = hasCashData(data);

  return (
    <ReportChartCard
      title="Cash Health"
      subtitle="Paid vs outstanding invoice value."
      hasData={hasData}
      emptyMessage="Invoice health will appear once invoices are created."
      chartHeightClassName="min-h-[280px] sm:min-h-[320px]"
    >
      <div className="flex h-full flex-col justify-between gap-5">
        <div className="flex flex-1 items-end justify-center gap-4 sm:gap-5">
          {items.map((item) => {
            const heightPercent = Math.max((item.value / maxValue) * 100, 4);

            return (
              <div
                key={item.key}
                className="flex min-w-0 flex-1 flex-col items-center gap-2"
              >
                <span className="text-xs font-bold text-slate-700">
                  {formatCurrency(item.value)}
                </span>
                <div className="flex h-40 w-full items-end justify-center sm:h-48">
                  <div
                    className={`w-full max-w-[4.5rem] rounded-t-lg ${item.barClass}`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="grid gap-2 border-t border-slate-100 pt-4 text-sm">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3">
              <span className="font-medium text-slate-600">{item.label}</span>
              <span className="font-bold text-slate-900">
                {formatCurrency(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ReportChartCard>
  );
}
